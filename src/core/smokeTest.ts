/**
 * App Core & TaskService Smoke Test (Phase 3 核心验证)
 * 验证：
 * 1. 任务状态机合法跃迁与非法拦截
 * 2. TaskRepository 契约及内存存储过滤
 * 3. TaskService 核心业务规则 (Source of Truth)、确认约束与时间戳维护
 * 4. DomainEventBus 领域事件广播与监听
 * 5. MockIpcClient 与 App Core 链路端到端一致性
 */

import { TaskStateMachine } from './state/taskStateMachine';
import { DomainEventBus } from './events/eventBus';
import { InMemoryTaskRepository } from './repository/inMemoryTaskRepository';
import { TaskService } from './services/taskService';
import { MockIpcClient } from '../api/mockIpcClient';
import {
  TaskPriority,
  TaskSource,
  TaskStatus,
  DomainEvent,
  TaskCreatedEventPayload,
  TaskCompletedEventPayload,
} from '../domain';
import { IpcErrorCode } from '../electron/ipc/errorContract';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function assert(suite: string, name: string, condition: boolean, message?: string) {
  results.push({
    suite,
    name,
    passed: !!condition,
    message: condition ? undefined : message || 'Assertion failed',
  });
}

export async function runCoreSmokeTests(): Promise<{ passed: boolean; results: TestResult[] }> {
  // =========================================================================
  // 1. Task State Machine Tests
  // =========================================================================
  assert(
    'StateMachine',
    'PENDING -> IN_PROGRESS is allowed',
    TaskStateMachine.canTransition(TaskStatus.PENDING, TaskStatus.IN_PROGRESS) === true
  );

  assert(
    'StateMachine',
    'IN_PROGRESS -> COMPLETED is allowed',
    TaskStateMachine.canTransition(TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED) === true
  );

  assert(
    'StateMachine',
    'CANCELLED -> COMPLETED is NOT allowed',
    TaskStateMachine.canTransition(TaskStatus.CANCELLED, TaskStatus.COMPLETED) === false
  );

  const invalidRes = TaskStateMachine.validateTransition(TaskStatus.CANCELLED, TaskStatus.COMPLETED);
  assert('StateMachine', 'Validation error message is provided on illegal transition', !invalidRes.valid && !!invalidRes.error);

  // =========================================================================
  // 2. EventBus Pub/Sub Tests
  // =========================================================================
  const eventBus = new DomainEventBus();
  const receivedEvents: DomainEvent[] = [];

  const unsub = eventBus.subscribe('task:created', (evt) => {
    receivedEvents.push(evt);
  });

  const dummyEvent: DomainEvent = {
    id: 'test-evt-1',
    type: 'task:created',
    payload: { task: { id: 't1', title: 'test' } },
    timestamp: new Date().toISOString(),
  };

  eventBus.publish(dummyEvent);
  assert('EventBus', 'Subscriber receives published task:created event', receivedEvents.length === 1);
  assert('EventBus', 'Received event ID matches', receivedEvents[0]?.id === 'test-evt-1');

  unsub();
  eventBus.publish(dummyEvent);
  assert('EventBus', 'Unsubscribe prevents subsequent invocations', receivedEvents.length === 1);

  // =========================================================================
  // 3. TaskService & InMemoryRepository Tests
  // =========================================================================
  const repository = new InMemoryTaskRepository();
  const serviceEventBus = new DomainEventBus();
  const serviceEvents: DomainEvent[] = [];

  serviceEventBus.subscribe('*', (evt) => {
    serviceEvents.push(evt);
  });

  const taskService = new TaskService(repository, serviceEventBus);

  // 3.1 创建任务验证（空标题拦截）
  const emptyTitleRes = await taskService.createTask({
    title: '   ',
    source: TaskSource.MANUAL,
  });
  assert(
    'TaskService',
    'Rejects task creation with empty title',
    emptyTitleRes.success === false && emptyTitleRes.error.code === IpcErrorCode.VALIDATION_ERROR
  );

  // 3.2 正常创建任务
  const createRes = await taskService.createTask({
    title: '设计 SQLite 表结构与迁移脚本',
    description: '为后端工程师切入准备 Drizzle schema 与持久化层',
    priority: TaskPriority.HIGH,
    source: TaskSource.MANUAL,
    category: '架构',
    tags: ['sqlite', 'core'],
  });

  assert('TaskService', 'Task created successfully', createRes.success === true);
  const createdTask = createRes.success ? createRes.data : null;
  assert('TaskService', 'Created task has ID and PENDING status', !!createdTask?.id && createdTask?.status === TaskStatus.PENDING);
  assert('TaskService', 'EventBus fired task:created domain event', serviceEvents.some((e) => e.type === 'task:created'));

  // 3.3 列表与过滤
  const listAll = await taskService.listTasks();
  assert('TaskService', 'listTasks returns created task', listAll.success && listAll.data.length === 1);

  const listHigh = await taskService.listTasks({ priority: [TaskPriority.HIGH] });
  assert('TaskService', 'listTasks filters by priority', listHigh.success && listHigh.data.length === 1);

  const listLow = await taskService.listTasks({ priority: [TaskPriority.LOW] });
  assert('TaskService', 'listTasks returns empty when filter does not match', listLow.success && listLow.data.length === 0);

  // 3.4 非法状态跃迁拦截
  const taskId = createdTask!.id;
  // 先设为 CANCELLED
  await taskService.updateTask({ id: taskId, status: TaskStatus.CANCELLED });
  // 从 CANCELLED 尝试直接跃迁至 COMPLETED（违反状态机规则）
  const illegalTransitionRes = await taskService.updateTask({ id: taskId, status: TaskStatus.COMPLETED });
  assert(
    'TaskService',
    'Blocks illegal state transition via state machine',
    illegalTransitionRes.success === false && illegalTransitionRes.error.code === IpcErrorCode.VALIDATION_ERROR
  );

  // 重新打开为 PENDING，并测试完成
  await taskService.updateTask({ id: taskId, status: TaskStatus.PENDING });
  const completeRes = await taskService.completeTask(taskId);
  assert('TaskService', 'completeTask succeeds', completeRes.success === true);
  assert(
    'TaskService',
    'completeTask sets completedAt timestamp',
    completeRes.success && !!completeRes.data.completedAt && completeRes.data.status === TaskStatus.COMPLETED
  );
  assert('TaskService', 'EventBus fired task:completed domain event', serviceEvents.some((e) => e.type === 'task:completed'));

  // 3.5 删除任务高危确认机制
  const deleteWithoutConfirm = await taskService.deleteTask(taskId, false);
  assert(
    'TaskService',
    'Rejects delete without explicit confirmation',
    deleteWithoutConfirm.success === false && deleteWithoutConfirm.error.code === IpcErrorCode.CONFIRMATION_REQUIRED
  );

  const deleteWithConfirm = await taskService.deleteTask(taskId, true);
  assert('TaskService', 'deleteTask with confirmed=true succeeds', deleteWithConfirm.success === true);
  assert('TaskService', 'EventBus fired task:deleted domain event', serviceEvents.some((e) => e.type === 'task:deleted'));

  const verifyDeleted = await taskService.getTask(taskId);
  assert('TaskService', 'Task is no longer found after deletion', verifyDeleted.success === false && verifyDeleted.error.code === IpcErrorCode.NOT_FOUND);

  // =========================================================================
  // 4. MockIpcClient & App Core Integration
  // =========================================================================
  const client = new MockIpcClient();
  const clientList = await client.task.list();
  assert('MockIpcClient', 'MockIpcClient loads seed tasks through Core TaskService', clientList.success && clientList.data.length >= 2);

  const newClientTask = await client.task.create({
    title: 'Web 模式同构 Task 测试',
    source: TaskSource.AI,
  });
  assert('MockIpcClient', 'MockIpcClient creates task via Core TaskService', newClientTask.success);

  const allPassed = results.every((r) => r.passed);
  return { passed: allPassed, results };
}

// 供 tsx 命令行执行
if (process.env.RUN_SMOKE_DIRECTLY === '1' || process.argv[1]?.endsWith('smokeTest.ts')) {
  runCoreSmokeTests().then(({ passed, results }) => {
    console.log('\n=== App Core & TaskService Smoke Test Results ===');
    results.forEach((r) => {
      const symbol = r.passed ? '✓' : '✗';
      console.log(`[${r.suite}] ${symbol} ${r.name}`);
      if (!r.passed && r.message) {
        console.error(`    Error: ${r.message}`);
      }
    });
    console.log(`\nOverall: ${passed ? 'ALL PASSED' : 'SOME FAILED'}\n`);
    if (!passed) process.exit(1);
  });
}

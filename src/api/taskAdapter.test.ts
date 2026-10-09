/**
 * Task Adapter Unit Tests
 * 验证 UI TaskItem ⇄ Domain Task 双向模型适配器的映射与健壮性
 */

import {
  mapUiPriorityToDomain,
  mapDomainPriorityToUi,
  isImportantFromDomain,
  formatDueAtToUi,
  parseDueTimeToIso,
  domainTaskToUiTask,
  createTaskInputFromUi,
} from './taskAdapter';
import { Task, TaskPriority, TaskSource, TaskStatus } from '../domain';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

console.log('=== Task Adapter Test Suite ===');

// 1. 优先级双向映射
console.log('Test 1: Priority Bidirectional Mapping');
assert(mapUiPriorityToDomain('high') === TaskPriority.HIGH, 'UI high -> Domain HIGH');
assert(mapUiPriorityToDomain('medium') === TaskPriority.MEDIUM, 'UI medium -> Domain MEDIUM');
assert(mapUiPriorityToDomain('normal') === TaskPriority.MEDIUM, 'UI normal -> Domain MEDIUM');
assert(mapUiPriorityToDomain('low') === TaskPriority.LOW, 'UI low -> Domain LOW');
assert(mapUiPriorityToDomain(undefined) === TaskPriority.MEDIUM, 'UI undefined -> Domain MEDIUM');

assert(mapDomainPriorityToUi(TaskPriority.URGENT) === 'high', 'Domain URGENT -> UI high');
assert(mapDomainPriorityToUi(TaskPriority.HIGH) === 'high', 'Domain HIGH -> UI high');
assert(mapDomainPriorityToUi(TaskPriority.MEDIUM) === 'medium', 'Domain MEDIUM -> UI medium');
assert(mapDomainPriorityToUi(TaskPriority.LOW) === 'low', 'Domain LOW -> UI low');
console.log('✓ Priority mapping passed');

// 2. 重要性推导
console.log('Test 2: Importance Derivation');
assert(isImportantFromDomain(TaskPriority.URGENT) === true, 'URGENT is important');
assert(isImportantFromDomain(TaskPriority.HIGH) === true, 'HIGH is important');
assert(isImportantFromDomain(TaskPriority.MEDIUM) === false, 'MEDIUM is not important');
assert(isImportantFromDomain(TaskPriority.LOW) === false, 'LOW is not important');
console.log('✓ Importance derivation passed');

// 3. 截止时间展示格式化
console.log('Test 3: formatDueAtToUi');
assert(formatDueAtToUi(null) === '无截止时间', 'null returns 无截止时间');
assert(formatDueAtToUi(undefined) === '无截止时间', 'undefined returns 无截止时间');
assert(formatDueAtToUi('invalid-date') === '无截止时间', 'invalid returns 无截止时间');

const now = new Date();
const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 30).toISOString();
assert(formatDueAtToUi(todayIso).startsWith('今天 14:30'), 'today formats to 今天 HH:mm');

const tomorrowIso = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 15).toISOString();
assert(formatDueAtToUi(tomorrowIso).startsWith('明天 09:15'), 'tomorrow formats to 明天 HH:mm');
console.log('✓ formatDueAtToUi passed');

// 4. 自然语言截止时间解析
console.log('Test 4: parseDueTimeToIso');
assert(parseDueTimeToIso(null) === null, 'null input gives null');
assert(parseDueTimeToIso('无截止时间') === null, '无截止时间 gives null');
assert(parseDueTimeToIso('gibberish random text') === null, 'gibberish gives null without throwing');
assert(parseDueTimeToIso('12') === null, 'pure digits give null');
assert(parseDueTimeToIso('2024') === null, 'pure year number gives null');

const parsedToday = parseDueTimeToIso('今天 18:00');
assert(parsedToday !== null, 'parsedToday is not null');
const parsedTodayDate = new Date(parsedToday!);
assert(parsedTodayDate.getHours() === 18 && parsedTodayDate.getMinutes() === 0, 'parsed today has 18:00');

const parsedTomorrow = parseDueTimeToIso('明天 09:30');
assert(parsedTomorrow !== null, 'parsedTomorrow is not null');
const parsedTomorrowDate = new Date(parsedTomorrow!);
assert(parsedTomorrowDate.getHours() === 9 && parsedTomorrowDate.getMinutes() === 30, 'parsed tomorrow has 09:30');
console.log('✓ parseDueTimeToIso passed');

// 5. domainTaskToUiTask 完整实体转换
console.log('Test 5: domainTaskToUiTask');
const domainTask: Task = {
  id: 'task-101',
  title: '测试任务',
  description: '详细描述',
  status: TaskStatus.COMPLETED,
  priority: TaskPriority.HIGH,
  dueAt: todayIso,
  completedAt: new Date().toISOString(),
  source: TaskSource.MANUAL,
  category: '产品研发',
  tags: ['核心'],
  contextId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const uiTask = domainTaskToUiTask(domainTask);
assert(uiTask.id === 'task-101', 'id matches');
assert(uiTask.title === '测试任务', 'title matches');
assert(uiTask.completed === true, 'completed matches COMPLETED status');
assert(uiTask.priority === 'high', 'priority matches HIGH');
assert(uiTask.isImportant === true, 'isImportant matches HIGH');
assert(uiTask.category === '产品研发', 'category matches');
assert(uiTask.dueTime.startsWith('今天 14:30'), 'dueTime formatted');
console.log('✓ domainTaskToUiTask passed');

// 6. createTaskInputFromUi
console.log('Test 6: createTaskInputFromUi');
const createInput = createTaskInputFromUi({
  title: '  新建待办任务  ',
  priority: 'normal',
  dueTime: '今天 20:00',
  category: '技术预研',
  description: '关于适配器测试',
});

assert(createInput.title === '新建待办任务', 'trimmed title');
assert(createInput.priority === TaskPriority.MEDIUM, 'normal mapped to MEDIUM');
assert(createInput.source === TaskSource.MANUAL, 'source fixed to MANUAL');
assert(createInput.category === '技术预研', 'category passed through');
assert(createInput.description === '关于适配器测试', 'description passed through');
assert(createInput.dueAt !== null, 'dueAt parsed');
console.log('✓ createTaskInputFromUi passed');

console.log('\nALL TASK ADAPTER TESTS PASSED SUCCESSFULLY!');

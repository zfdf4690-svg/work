/**
 * Task Service Implementation
 * 任务领域核心服务：
 * 1. 唯一负责任务生命周期与状态机跃迁 (Source of Truth)
 * 2. 派发领域事件 (DomainEvent) 到 EventBus
 * 3. 严格校验业务完整性与确认操作约束
 */

import { ITaskService } from './taskService.interface';
import { ITaskRepository } from '../repository/taskRepository.interface';
import { IEventBus, DomainEventBus } from '../events/eventBus';
import { TaskStateMachine } from '../state/taskStateMachine';
import {
  TaskPriority,
  TaskStatus,
} from '../../domain/task/task.enums';
import {
  Task as TaskEntity,
  CreateTaskInput as CreateTaskInputDto,
  UpdateTaskInput as UpdateTaskInputDto,
  TaskFilter,
} from '../../domain/task/task.types';
import {
  TaskCreatedEventPayload,
  TaskUpdatedEventPayload,
  TaskCompletedEventPayload,
  TaskDeletedEventPayload,
  DomainEvent,
} from '../../domain/events/event.types';
import {
  createIpcError,
  createIpcSuccess,
  IpcErrorCode,
  IpcResult,
} from '../../electron/ipc/errorContract';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'task-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
}

export class TaskService implements ITaskService {
  constructor(
    private readonly repository: ITaskRepository,
    private readonly eventBus: IEventBus = DomainEventBus.getInstance()
  ) {}

  public async getTask(id: string): Promise<IpcResult<TaskEntity>> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return createIpcError(IpcErrorCode.VALIDATION_ERROR, '任务 ID 不能为空');
    }

    const task = await this.repository.findById(id);
    if (!task) {
      return createIpcError(IpcErrorCode.NOT_FOUND, `未找到 ID 为 [${id}] 的任务`);
    }

    return createIpcSuccess(task);
  }

  public async listTasks(filter?: TaskFilter): Promise<IpcResult<TaskEntity[]>> {
    try {
      const tasks = await this.repository.findMany(filter);
      return createIpcSuccess(tasks);
    } catch (err: any) {
      return createIpcError(
        IpcErrorCode.INTERNAL_ERROR,
        `查询任务列表失败: ${err?.message || '未知错误'}`
      );
    }
  }

  public async createTask(input: CreateTaskInputDto): Promise<IpcResult<TaskEntity>> {
    const title = input.title?.trim();
    if (!title) {
      return createIpcError(IpcErrorCode.VALIDATION_ERROR, '任务标题不能为空');
    }

    const now = new Date().toISOString();
    const newTask: TaskEntity = {
      id: generateId(),
      title,
      description: input.description?.trim() || undefined,
      status: TaskStatus.PENDING,
      priority: input.priority || TaskPriority.MEDIUM,
      dueAt: input.dueAt || null,
      completedAt: null,
      source: input.source,
      category: input.category?.trim() || undefined,
      tags: input.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    try {
      const created = await this.repository.create(newTask);

      // 派发领域事件
      const event: DomainEvent<TaskCreatedEventPayload> = {
        id: generateId(),
        type: 'task:created',
        payload: { task: created },
        timestamp: now,
      };
      this.eventBus.publish(event);

      return createIpcSuccess(created);
    } catch (err: any) {
      return createIpcError(
        IpcErrorCode.INTERNAL_ERROR,
        `创建任务持久化失败: ${err?.message || '未知错误'}`
      );
    }
  }

  public async updateTask(input: UpdateTaskInputDto): Promise<IpcResult<TaskEntity>> {
    const { id, ...updates } = input;
    if (!id || typeof id !== 'string') {
      return createIpcError(IpcErrorCode.VALIDATION_ERROR, '更新任务缺少合法的任务 ID');
    }

    const existing = await this.repository.findById(id);
    if (!existing) {
      return createIpcError(IpcErrorCode.NOT_FOUND, `待更新的任务 [${id}] 不存在`);
    }

    // 状态流转合法性校验
    if (updates.status && updates.status !== existing.status) {
      const transition = TaskStateMachine.validateTransition(existing.status, updates.status);
      if (!transition.valid) {
        return createIpcError(IpcErrorCode.VALIDATION_ERROR, transition.error!);
      }
    }

    // 如果状态变更为 COMPLETED，自动打上 completedAt
    const updatePayload: Partial<TaskEntity> = {
      ...updates,
      title: updates.title !== undefined ? updates.title.trim() : existing.title,
    };

    if (updates.status === TaskStatus.COMPLETED && !existing.completedAt) {
      updatePayload.completedAt = new Date().toISOString();
    } else if (updates.status && updates.status !== TaskStatus.COMPLETED) {
      updatePayload.completedAt = null;
    }

    try {
      const updated = await this.repository.update(id, updatePayload);
      if (!updated) {
        return createIpcError(IpcErrorCode.NOT_FOUND, `更新失败: 任务 [${id}] 已丢失`);
      }

      // 派发更新领域事件
      const now = new Date().toISOString();
      const event: DomainEvent<TaskUpdatedEventPayload> = {
        id: generateId(),
        type: 'task:updated',
        payload: {
          task: updated,
          changes: updates,
        },
        timestamp: now,
      };
      this.eventBus.publish(event);

      return createIpcSuccess(updated);
    } catch (err: any) {
      return createIpcError(
        IpcErrorCode.INTERNAL_ERROR,
        `更新任务异常: ${err?.message || '未知错误'}`
      );
    }
  }

  public async completeTask(id: string): Promise<IpcResult<TaskEntity>> {
    if (!id || typeof id !== 'string') {
      return createIpcError(IpcErrorCode.VALIDATION_ERROR, '完成任务缺少有效 ID');
    }

    const existing = await this.repository.findById(id);
    if (!existing) {
      return createIpcError(IpcErrorCode.NOT_FOUND, `未找到待完成的任务 [${id}]`);
    }

    // 状态机流转检查
    const transition = TaskStateMachine.validateTransition(existing.status, TaskStatus.COMPLETED);
    if (!transition.valid) {
      return createIpcError(IpcErrorCode.VALIDATION_ERROR, transition.error!);
    }

    const now = new Date().toISOString();
    const updated = await this.repository.update(id, {
      status: TaskStatus.COMPLETED,
      completedAt: now,
    });

    if (!updated) {
      return createIpcError(IpcErrorCode.INTERNAL_ERROR, '完成任务写入失败');
    }

    // 派发完成领域事件
    const event: DomainEvent<TaskCompletedEventPayload> = {
      id: generateId(),
      type: 'task:completed',
      payload: {
        taskId: id,
        completedAt: now,
        task: updated,
      },
      timestamp: now,
    };
    this.eventBus.publish(event);

    return createIpcSuccess(updated);
  }

  public async deleteTask(
    id: string,
    confirmed: boolean
  ): Promise<IpcResult<{ id: string; deleted: boolean; taskId: string }>> {
    if (!id || typeof id !== 'string') {
      return createIpcError(IpcErrorCode.VALIDATION_ERROR, '删除任务缺少有效 ID');
    }

    if (!confirmed) {
      return createIpcError(
        IpcErrorCode.CONFIRMATION_REQUIRED,
        '物理删除任务属于高危操作，必须经用户显式确认 (confirmed=true)'
      );
    }

    const existing = await this.repository.findById(id);
    if (!existing) {
      return createIpcError(IpcErrorCode.NOT_FOUND, `待删除的任务 [${id}] 不存在`);
    }

    const ok = await this.repository.delete(id);
    if (!ok) {
      return createIpcError(IpcErrorCode.INTERNAL_ERROR, '删除任务执行失败');
    }

    const now = new Date().toISOString();
    const event: DomainEvent<TaskDeletedEventPayload> = {
      id: generateId(),
      type: 'task:deleted',
      payload: { taskId: id },
      timestamp: now,
    };
    this.eventBus.publish(event);

    return createIpcSuccess({ id, deleted: true, taskId: id });
  }
}

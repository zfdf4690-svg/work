/**
 * MockIpcClient
 * Web/Vite 开发预览模式下的同构回退客户端：
 * 保证无 Electron 容器时纯 Web 预览无缝运行，模拟 Typed IPC 协议封包与解包
 */

import { IIpcClient } from './ipcClient.interface';
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskSource,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
  ResumeConfirmationInput,
  DomainEvent,
  EventType,
} from '../domain';
import {
  createIpcError,
  createIpcSuccess,
  IpcErrorCode,
  IpcResult,
} from '../electron/ipc/errorContract';

export class MockIpcClient implements IIpcClient {
  readonly isElectron = false;

  private memoryTasks: Map<string, Task> = new Map();
  private eventListeners: Map<EventType, Set<(event: DomainEvent) => void>> = new Map();

  constructor() {
    this.seedDefaultTasks();
  }

  private seedDefaultTasks() {
    const now = new Date().toISOString();
    const seeds: Task[] = [
      {
        id: 'mock-task-1',
        title: '完成 AI Work Assistant V1.3 架构评审',
        description: '核验 Electron 安全边界与 Typed IPC Contract',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueAt: new Date(Date.now() + 86400000).toISOString(),
        source: TaskSource.MANUAL,
        category: '架构设计',
        tags: ['架构', 'V1.3'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'mock-task-2',
        title: '梳理 Task 三端联动数据流',
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        source: TaskSource.AI,
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const task of seeds) {
      this.memoryTasks.set(task.id, task);
    }
  }

  private emitEvent(type: EventType, payload: unknown) {
    const event: DomainEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (e) {
          console.error(`[MockIpcClient] Error in listener for ${type}:`, e);
        }
      });
    }
  }

  task = {
    create: async (input: CreateTaskInput): Promise<IpcResult<Task>> => {
      if (!input.title || !input.title.trim()) {
        return createIpcError(IpcErrorCode.VALIDATION_ERROR, '任务标题不能为空');
      }

      const now = new Date().toISOString();
      const newTask: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: input.title.trim(),
        description: input.description,
        status: TaskStatus.PENDING,
        priority: input.priority || TaskPriority.MEDIUM,
        dueAt: input.dueAt,
        source: input.source || TaskSource.MANUAL,
        category: input.category,
        tags: input.tags,
        createdAt: now,
        updatedAt: now,
      };

      this.memoryTasks.set(newTask.id, newTask);
      this.emitEvent('task:created', { task: newTask });
      return createIpcSuccess(newTask);
    },

    update: async (input: UpdateTaskInput): Promise<IpcResult<Task>> => {
      const existing = this.memoryTasks.get(input.id);
      if (!existing) {
        return createIpcError(IpcErrorCode.NOT_FOUND, `未找到 ID 为 ${input.id} 的任务`);
      }

      const updated: Task = {
        ...existing,
        title: input.title !== undefined ? input.title.trim() : existing.title,
        description: input.description !== undefined ? input.description : existing.description,
        status: input.status !== undefined ? input.status : existing.status,
        priority: input.priority !== undefined ? input.priority : existing.priority,
        dueAt: input.dueAt !== undefined ? input.dueAt : existing.dueAt,
        category: input.category !== undefined ? input.category : existing.category,
        tags: input.tags !== undefined ? input.tags : existing.tags,
        updatedAt: new Date().toISOString(),
      };

      this.memoryTasks.set(updated.id, updated);
      this.emitEvent('task:updated', { task: updated, changes: input });
      return createIpcSuccess(updated);
    },

    complete: async (id: string): Promise<IpcResult<Task>> => {
      const existing = this.memoryTasks.get(id);
      if (!existing) {
        return createIpcError(IpcErrorCode.NOT_FOUND, `未找到 ID 为 ${id} 的任务`);
      }

      const now = new Date().toISOString();
      const completed: Task = {
        ...existing,
        status: TaskStatus.COMPLETED,
        completedAt: now,
        updatedAt: now,
      };

      this.memoryTasks.set(completed.id, completed);
      this.emitEvent('task:completed', { taskId: id, completedAt: now, task: completed });
      return createIpcSuccess(completed);
    },

    delete: async (id: string, confirmed: boolean): Promise<IpcResult<{ id: string; deleted: boolean }>> => {
      if (!confirmed) {
        return createIpcError(
          IpcErrorCode.CONFIRMATION_REQUIRED,
          '物理删除任务属于高危操作，必须确认执行'
        );
      }

      const existed = this.memoryTasks.delete(id);
      if (!existed) {
        return createIpcError(IpcErrorCode.NOT_FOUND, `未找到 ID 为 ${id} 的任务`);
      }

      this.emitEvent('task:deleted', { taskId: id });
      return createIpcSuccess({ id, deleted: true });
    },

    get: async (id: string): Promise<IpcResult<Task>> => {
      const task = this.memoryTasks.get(id);
      if (!task) {
        return createIpcError(IpcErrorCode.NOT_FOUND, `未找到 ID 为 ${id} 的任务`);
      }
      return createIpcSuccess(task);
    },

    list: async (filter?: TaskFilter): Promise<IpcResult<Task[]>> => {
      let tasks = Array.from(this.memoryTasks.values());

      if (filter) {
        if (filter.status && filter.status.length > 0) {
          tasks = tasks.filter((t) => filter.status!.includes(t.status));
        }
        if (filter.priority && filter.priority.length > 0) {
          tasks = tasks.filter((t) => filter.priority!.includes(t.priority));
        }
        if (filter.source && filter.source.length > 0) {
          tasks = tasks.filter((t) => filter.source!.includes(t.source));
        }
        if (filter.search) {
          const q = filter.search.toLowerCase();
          tasks = tasks.filter(
            (t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
          );
        }
      }

      return createIpcSuccess(tasks);
    },
  };

  agent = {
    resumeConfirmation: async (
      input: ResumeConfirmationInput
    ): Promise<IpcResult<{ resumed: boolean; runId: string }>> => {
      return createIpcSuccess({
        resumed: input.approved,
        runId: input.runId,
      });
    },

    interrupt: async (
      runId: string,
      _reason?: string
    ): Promise<IpcResult<{ interrupted: boolean; runId: string }>> => {
      return createIpcSuccess({
        interrupted: true,
        runId,
      });
    },
  };

  events = {
    on: (eventType: EventType, callback: (event: DomainEvent) => void): (() => void) => {
      if (!this.eventListeners.has(eventType)) {
        this.eventListeners.set(eventType, new Set());
      }
      const set = this.eventListeners.get(eventType)!;
      set.add(callback);

      return () => {
        set.delete(callback);
      };
    },
  };
}

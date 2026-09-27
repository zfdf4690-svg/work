/**
 * MockIpcClient
 * Web/Vite 开发预览模式下的同构回退客户端：
 * 保证无 Electron 容器时纯 Web 预览无缝运行，直接桥接 App Core (TaskService + EventBus)
 * 绝不编写重复的第二套业务逻辑！
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
  createIpcSuccess,
  IpcResult,
} from '../electron/ipc/errorContract';
import {
  ITaskService,
  TaskService,
  InMemoryTaskRepository,
  DomainEventBus,
  IEventBus,
} from '../core';

export class MockIpcClient implements IIpcClient {
  readonly isElectron = false;

  private taskService: ITaskService;
  private eventBus: IEventBus;

  constructor(customService?: ITaskService, customEventBus?: IEventBus) {
    this.eventBus = customEventBus || DomainEventBus.getInstance();
    if (customService) {
      this.taskService = customService;
    } else {
      const defaultRepo = new InMemoryTaskRepository(this.createDefaultSeeds());
      this.taskService = new TaskService(defaultRepo, this.eventBus);
    }
  }

  private createDefaultSeeds(): Task[] {
    const now = new Date().toISOString();
    return [
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
        category: '开发',
        tags: ['Task', 'IPC'],
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  task = {
    create: async (input: CreateTaskInput): Promise<IpcResult<Task>> => {
      return this.taskService.createTask(input);
    },

    update: async (input: UpdateTaskInput): Promise<IpcResult<Task>> => {
      return this.taskService.updateTask(input);
    },

    complete: async (id: string): Promise<IpcResult<Task>> => {
      return this.taskService.completeTask(id);
    },

    delete: async (id: string, confirmed: boolean): Promise<IpcResult<{ id: string; deleted: boolean }>> => {
      const res = await this.taskService.deleteTask(id, confirmed);
      if (res.success) {
        return createIpcSuccess({ id: res.data.id, deleted: res.data.deleted });
      }
      return res;
    },

    get: async (id: string): Promise<IpcResult<Task>> => {
      return this.taskService.getTask(id);
    },

    list: async (filter?: TaskFilter): Promise<IpcResult<Task[]>> => {
      return this.taskService.listTasks(filter);
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
      return this.eventBus.subscribe(eventType, callback as any);
    },
  };
}

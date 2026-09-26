/**
 * ElectronIpcClient
 * 真实 Electron 客户端实现：直接调用经过 preload 安全白名单注入的 window.electronAPI
 */

import { IIpcClient } from './ipcClient.interface';
import {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
  ResumeConfirmationInput,
  DomainEvent,
  EventType,
} from '../domain';
import { createIpcError, IpcErrorCode, IpcResult } from '../electron/ipc/errorContract';

export class ElectronIpcClient implements IIpcClient {
  readonly isElectron = true;

  private get api() {
    if (typeof window === 'undefined' || !window.electronAPI) {
      throw new Error('[ElectronIpcClient] window.electronAPI 不存在，非 Electron 环境运行');
    }
    return window.electronAPI;
  }

  task = {
    create: async (input: CreateTaskInput): Promise<IpcResult<Task>> => {
      try {
        return await this.api.task.create(input);
      } catch (err: unknown) {
        return createIpcError(IpcErrorCode.INTERNAL_ERROR, String(err));
      }
    },

    update: async (input: UpdateTaskInput): Promise<IpcResult<Task>> => {
      try {
        return await this.api.task.update(input);
      } catch (err: unknown) {
        return createIpcError(IpcErrorCode.INTERNAL_ERROR, String(err));
      }
    },

    complete: async (id: string): Promise<IpcResult<Task>> => {
      try {
        return await this.api.task.complete({ id });
      } catch (err: unknown) {
        return createIpcError(IpcErrorCode.INTERNAL_ERROR, String(err));
      }
    },

    delete: async (id: string, confirmed: boolean): Promise<IpcResult<{ id: string; deleted: boolean }>> => {
      try {
        return await this.api.task.delete({ id, confirmed });
      } catch (err: unknown) {
        return createIpcError(IpcErrorCode.INTERNAL_ERROR, String(err));
      }
    },

    get: async (id: string): Promise<IpcResult<Task>> => {
      try {
        return await this.api.task.get({ id });
      } catch (err: unknown) {
        return createIpcError(IpcErrorCode.INTERNAL_ERROR, String(err));
      }
    },

    list: async (filter?: TaskFilter): Promise<IpcResult<Task[]>> => {
      try {
        return await this.api.task.list(filter);
      } catch (err: unknown) {
        return createIpcError(IpcErrorCode.INTERNAL_ERROR, String(err));
      }
    },
  };

  agent = {
    resumeConfirmation: async (
      input: ResumeConfirmationInput
    ): Promise<IpcResult<{ resumed: boolean; runId: string }>> => {
      try {
        return await this.api.agent.resumeConfirmation(input);
      } catch (err: unknown) {
        return createIpcError(IpcErrorCode.INTERNAL_ERROR, String(err));
      }
    },

    interrupt: async (
      runId: string,
      reason?: string
    ): Promise<IpcResult<{ interrupted: boolean; runId: string }>> => {
      try {
        return await this.api.agent.interrupt({ runId, reason });
      } catch (err: unknown) {
        return createIpcError(IpcErrorCode.INTERNAL_ERROR, String(err));
      }
    },
  };

  events = {
    on: (eventType: EventType, callback: (event: DomainEvent) => void): (() => void) => {
      if (typeof window === 'undefined' || !window.electronAPI) {
        return () => {};
      }
      return this.api.events.on(eventType, callback);
    },
  };
}

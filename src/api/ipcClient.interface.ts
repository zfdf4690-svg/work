/**
 * IIpcClient Interface
 * 统一客户端 IPC 接口抽象：业务层与 UI 层只依赖此接口，完全抹平 Electron 与 Web 运行环境差异
 */

import {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
  ResumeConfirmationInput,
  DomainEvent,
  EventType,
} from '../domain';
import { IpcResult } from '../electron/ipc/errorContract';

export interface IIpcClient {
  readonly isElectron: boolean;

  task: {
    create: (input: CreateTaskInput) => Promise<IpcResult<Task>>;
    update: (input: UpdateTaskInput) => Promise<IpcResult<Task>>;
    complete: (id: string) => Promise<IpcResult<Task>>;
    delete: (id: string, confirmed: boolean) => Promise<IpcResult<{ id: string; deleted: boolean }>>;
    get: (id: string) => Promise<IpcResult<Task>>;
    list: (filter?: TaskFilter) => Promise<IpcResult<Task[]>>;
  };

  agent: {
    resumeConfirmation: (
      input: ResumeConfirmationInput
    ) => Promise<IpcResult<{ resumed: boolean; runId: string }>>;
    interrupt: (
      runId: string,
      reason?: string
    ) => Promise<IpcResult<{ interrupted: boolean; runId: string }>>;
  };

  events: {
    on: (eventType: EventType, callback: (event: DomainEvent) => void) => () => void;
  };
}

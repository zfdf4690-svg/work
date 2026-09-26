/**
 * Electron Global Window API Type Declaration
 * 严禁暴露 raw ipcRenderer，仅暴露受控 Typed API
 */

import {
  TaskCreateRequest,
  TaskCreateResponse,
  TaskUpdateRequest,
  TaskUpdateResponse,
  TaskCompleteRequest,
  TaskCompleteResponse,
  TaskDeleteRequest,
  TaskDeleteResponse,
  TaskGetRequest,
  TaskGetResponse,
  TaskListRequest,
  TaskListResponse,
  AgentResumeConfirmationRequest,
  AgentResumeConfirmationResponse,
  AgentInterruptRequest,
  AgentInterruptResponse,
} from '../electron/ipc/contracts';
import { DomainEvent, EventType } from '../domain';

export interface ElectronAPI {
  readonly isElectron: true;
  task: {
    create: (req: TaskCreateRequest) => Promise<TaskCreateResponse>;
    update: (req: TaskUpdateRequest) => Promise<TaskUpdateResponse>;
    complete: (req: TaskCompleteRequest) => Promise<TaskCompleteResponse>;
    delete: (req: TaskDeleteRequest) => Promise<TaskDeleteResponse>;
    get: (req: TaskGetRequest) => Promise<TaskGetResponse>;
    list: (req?: TaskListRequest) => Promise<TaskListResponse>;
  };
  agent: {
    resumeConfirmation: (req: AgentResumeConfirmationRequest) => Promise<AgentResumeConfirmationResponse>;
    interrupt: (req: AgentInterruptRequest) => Promise<AgentInterruptResponse>;
  };
  events: {
    on: (eventType: EventType, callback: (event: DomainEvent) => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};

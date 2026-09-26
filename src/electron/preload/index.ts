/**
 * Electron Preload Entry Point
 * 严格按照安全边界规范，只向 Renderer 暴露受控的 window.electronAPI
 * 严禁暴露 raw ipcRenderer 或任何 Node 原生 API
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../ipc/channels';
import {
  TaskCreateRequest,
  TaskUpdateRequest,
  TaskCompleteRequest,
  TaskDeleteRequest,
  TaskGetRequest,
  TaskListRequest,
  AgentResumeConfirmationRequest,
  AgentInterruptRequest,
} from '../ipc/contracts';
import { DomainEvent, EventType } from '../../domain';
import { ElectronAPI } from '../../types/electron';

export const electronAPI: ElectronAPI = {
  isElectron: true,
  task: {
    create: (req: TaskCreateRequest) => ipcRenderer.invoke(IPC_CHANNELS.TASK_CREATE, req),
    update: (req: TaskUpdateRequest) => ipcRenderer.invoke(IPC_CHANNELS.TASK_UPDATE, req),
    complete: (req: TaskCompleteRequest) => ipcRenderer.invoke(IPC_CHANNELS.TASK_COMPLETE, req),
    delete: (req: TaskDeleteRequest) => ipcRenderer.invoke(IPC_CHANNELS.TASK_DELETE, req),
    get: (req: TaskGetRequest) => ipcRenderer.invoke(IPC_CHANNELS.TASK_GET, req),
    list: (req?: TaskListRequest) => ipcRenderer.invoke(IPC_CHANNELS.TASK_LIST, req),
  },
  agent: {
    resumeConfirmation: (req: AgentResumeConfirmationRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.AGENT_RESUME_CONFIRMATION, req),
    interrupt: (req: AgentInterruptRequest) =>
      ipcRenderer.invoke(IPC_CHANNELS.AGENT_INTERRUPT, req),
  },
  events: {
    on: (eventType: EventType, callback: (event: DomainEvent) => void) => {
      const listener = (_: unknown, payload: { event: DomainEvent }) => {
        if (payload?.event && (!eventType || payload.event.type === eventType)) {
          callback(payload.event);
        }
      };
      ipcRenderer.on(IPC_CHANNELS.EVENT_BROADCAST, listener);
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.EVENT_BROADCAST, listener);
      };
    },
  },
};

// 安全上下文注入
try {
  if (contextBridge && typeof contextBridge.exposeInMainWorld === 'function') {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  }
} catch {
  // 非标准 electron 环境容错
}

/**
 * Preload Script Implementation
 * 通过 contextBridge.exposeInMainWorld 注入受控的 electronAPI
 * 严禁向渲染进程泄露 raw ipcRenderer、Node fs、child_process 等敏感原生能力
 */

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

// 声明 Electron 运行时环境（防止未安装 electron 时的构建类型报错）
interface IpcRendererLike {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  on: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void;
  removeListener: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void;
}

interface ContextBridgeLike {
  exposeInMainWorld: (apiKey: string, api: unknown) => void;
}

declare const window: {
  require?: (module: string) => unknown;
} & Window;

// 获取当前环境的 contextBridge 与 ipcRenderer
let electronContextBridge: ContextBridgeLike | undefined;
let electronIpcRenderer: IpcRendererLike | undefined;

try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const electron = (globalThis as any).electron || (typeof window !== 'undefined' && window.require ? window.require('electron') : undefined);
  if (electron) {
    electronContextBridge = electron.contextBridge;
    electronIpcRenderer = electron.ipcRenderer;
  }
} catch {
  // 非 Electron 启动环境静默跳过
}

export function initializePreload(
  bridge: ContextBridgeLike = electronContextBridge!,
  ipc: IpcRendererLike = electronIpcRenderer!
): void {
  if (!bridge || !ipc) {
    return;
  }

  const api: ElectronAPI = {
    isElectron: true,
    task: {
      create: (req: TaskCreateRequest) => ipc.invoke(IPC_CHANNELS.TASK_CREATE, req) as Promise<any>,
      update: (req: TaskUpdateRequest) => ipc.invoke(IPC_CHANNELS.TASK_UPDATE, req) as Promise<any>,
      complete: (req: TaskCompleteRequest) => ipc.invoke(IPC_CHANNELS.TASK_COMPLETE, req) as Promise<any>,
      delete: (req: TaskDeleteRequest) => ipc.invoke(IPC_CHANNELS.TASK_DELETE, req) as Promise<any>,
      get: (req: TaskGetRequest) => ipc.invoke(IPC_CHANNELS.TASK_GET, req) as Promise<any>,
      list: (req?: TaskListRequest) => ipc.invoke(IPC_CHANNELS.TASK_LIST, req) as Promise<any>,
    },
    agent: {
      resumeConfirmation: (req: AgentResumeConfirmationRequest) =>
        ipc.invoke(IPC_CHANNELS.AGENT_RESUME_CONFIRMATION, req) as Promise<any>,
      interrupt: (req: AgentInterruptRequest) =>
        ipc.invoke(IPC_CHANNELS.AGENT_INTERRUPT, req) as Promise<any>,
    },
    events: {
      on: (eventType: EventType, callback: (event: DomainEvent) => void) => {
        const listener = (_: unknown, payload: { event: DomainEvent }) => {
          if (payload?.event && (!eventType || payload.event.type === eventType)) {
            callback(payload.event);
          }
        };
        ipc.on(IPC_CHANNELS.EVENT_BROADCAST, listener);
        return () => {
          ipc.removeListener(IPC_CHANNELS.EVENT_BROADCAST, listener);
        };
      },
    },
  };

  bridge.exposeInMainWorld('electronAPI', api);
}

// 自动尝试初始化
if (electronContextBridge && electronIpcRenderer) {
  initializePreload(electronContextBridge, electronIpcRenderer);
}

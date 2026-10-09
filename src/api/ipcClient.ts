/**
 * IPC Client Entry Point & Environment Auto-Selector
 * 自动识别运行环境：在 Electron 桌面端自动装配 ElectronIpcClient，在 Web 预览端装配 MockIpcClient
 */

import { IIpcClient } from './ipcClient.interface';
import { ElectronIpcClient } from './electronIpcClient';
import { MockIpcClient } from './mockIpcClient';

function createIpcClient(): IIpcClient {
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.isElectron) {
    return new ElectronIpcClient();
  }
  return new MockIpcClient();
}

/**
 * 全局单例 IPC Client，UI 与业务层直接引用此客户端
 */
export const ipcClient: IIpcClient = createIpcClient();

export * from './ipcClient.interface';
export * from './electronIpcClient';
export * from './mockIpcClient';
export * from './taskAdapter';

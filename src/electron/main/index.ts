/**
 * Electron Main Process Entry
 * 负责主进程生命周期、BrowserWindow 安全实例化以及 IPC 处理器注册
 */

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSecureWebPreferences, applyWindowSecurityPolicies } from './security';
import { registerIpcHandlers } from '../ipc/handlers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

export function createMainWindow(): BrowserWindow {
  const preloadPath = path.resolve(__dirname, '../preload/index.js');

  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'AI Work Assistant',
    webPreferences: getSecureWebPreferences(preloadPath),
  });

  // 应用生产级安全拦截策略 (拦截未受信外部跳转与非受控弹窗)
  applyWindowSecurityPolicies(win);

  // 加载页面
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    win.loadURL(devServerUrl);
  } else {
    win.loadFile(path.resolve(__dirname, '../../../dist/index.html'));
  }

  win.on('closed', () => {
    mainWindow = null;
  });

  return win;
}

// 应用程序启动生命周期
export function startApp(): void {
  // 注册所有受控 IPC Handlers
  registerIpcHandlers();

  app.whenReady().then(() => {
    mainWindow = createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

// 当直接通过 node/tsx 执行时自动启动
if (process.env.ELECTRON_RUN_AS_NODE === undefined && typeof app !== 'undefined') {
  startApp();
}

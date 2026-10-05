/**
 * Electron Main Process Entry
 * 负责主进程生命周期、BrowserWindow 安全实例化以及 IPC 处理器注册
 */

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSecureWebPreferences, applyWindowSecurityPolicies } from './security';
import { registerIpcHandlers } from '../ipc/handlers';
import { initializeDatabase, closeDatabase } from './database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testUserDataPath = process.env.ELECTRON_TEST_USER_DATA;
if (testUserDataPath) {
  if (!path.isAbsolute(testUserDataPath)) {
    throw new Error('[Test] ELECTRON_TEST_USER_DATA 必须是绝对路径');
  }
  app.setPath('userData', testUserDataPath);
  console.log(`[Test] userData=${app.getPath('userData')}`);
}

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
    // 打包布局：resources/app/dist-electron/main/index.js → 上两级即 resources/app/，再进 dist/
    win.loadFile(path.resolve(__dirname, '../../dist/index.html'));
  }

  win.on('closed', () => {
    mainWindow = null;
  });

  return win;
}

// 应用程序启动生命周期
// 顺序铁律：app ready → Database init → (PHASE 3-B Migration) → IPC Handlers → create window
export function startApp(): void {
  app
    .whenReady()
    .then(async () => {
      // 1. 初始化 SQLite 运行时（PHASE 3-A）：打开 <userData>/data.db 并应用运行时配置
      await initializeDatabase();

      // 2. PHASE 3-B：Migration Runner 接入点（当前阶段不实现，仅保留位置）

      // 3. 注册所有受控 IPC Handlers（当前仍由 InMemoryTaskRepository 支撑，PHASE 3-D 才切换为 SQLite）
      registerIpcHandlers();

      // 4. 创建主窗口
      mainWindow = createMainWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          mainWindow = createMainWindow();
        }
      });
    })
    .catch((error) => {
      // 数据库等基础设施初始化失败时快速失败，不进入无持久化的降级运行
      console.error('[Startup] 应用初始化失败：', error);
      app.quit();
    });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // 退出前确定性关闭数据库连接（better-sqlite3 close 为同步执行，will-quit 阶段安全）
  app.on('will-quit', () => {
    void closeDatabase();
  });
}

// 当直接通过 node/tsx 执行时自动启动
if (process.env.ELECTRON_RUN_AS_NODE === undefined && typeof app !== 'undefined') {
  startApp();
}

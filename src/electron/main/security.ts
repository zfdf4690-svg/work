/**
 * Electron Security Configuration
 * 核心安全边界规范：强制隔离、零信任渲染进程、关闭 Node 集成
 */

export interface SecureWebPreferences {
  preload: string;
  contextIsolation: boolean;
  nodeIntegration: boolean;
  nodeIntegrationInWorker: boolean;
  nodeIntegrationInSubFrames: boolean;
  sandbox: boolean;
  webSecurity: boolean;
  allowRunningInsecureContent: boolean;
  enableRemoteModule: boolean;
}

/**
 * 生产级安全 BrowserWindow WebPreferences 配置基线
 */
export function getSecureWebPreferences(preloadPath: string): SecureWebPreferences {
  return {
    preload: preloadPath,
    // 必须启用上下文隔离，阻止 Renderer 访问 Node 或 Preload 内部作用域
    contextIsolation: true,
    // 严格禁止在 Renderer 中直接使用 Node API
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    nodeIntegrationInSubFrames: false,
    // 启用操作系统级沙箱防护
    sandbox: true,
    // 强制执行同源安全策略
    webSecurity: true,
    allowRunningInsecureContent: false,
    // 绝对禁止弃用的 remote 模块
    enableRemoteModule: false,
  };
}

/**
 * 安全窗口拦截器：禁止非受控外链直接在主窗口内跳转或弹出不受控的新窗口
 */
export function applyWindowSecurityPolicies(browserWindow: {
  webContents: {
    setWindowOpenHandler: (handler: (details: { url: string }) => { action: 'deny' | 'allow' }) => void;
    on: (event: string, listener: (event: { preventDefault: () => void }, url: string) => void) => void;
  };
}): void {
  // 禁止渲染进程通过 window.open 打开非受信窗口
  browserWindow.webContents.setWindowOpenHandler(({ url }) => {
    // 仅允许外部默认浏览器安全打开 http/https
    console.warn(`[Security Blocked] Untrusted window open request: ${url}`);
    return { action: 'deny' };
  });

  // 禁止意外的导航重定向
  browserWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('app://')) {
      event.preventDefault();
      console.warn(`[Security Blocked] Untrusted navigation to: ${url}`);
    }
  });
}

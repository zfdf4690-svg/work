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
    setWindowOpenHandler: (handler: (details: { url: string }) => { action: 'deny' }) => void;
    on: (event: string, listener: (event: { preventDefault: () => void }, url: string) => void) => void;
  };
}, openExternal?: (url: string) => void): void {
  // 禁止渲染进程通过 window.open 打开非受信窗口
  browserWindow.webContents.setWindowOpenHandler(({ url }) => {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      console.warn(`[Security Blocked] Invalid window open URL: ${url}`, error);
      return { action: 'deny' };
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      console.warn(`[Security Blocked] Untrusted window open request: ${url}`);
      return { action: 'deny' };
    }

    if (openExternal) {
      try {
        openExternal(url);
      } catch (error) {
        console.warn(`[Security] Failed to open external URL: ${url}`, error);
      }
    }

    return { action: 'deny' };
  });

  let developmentServerPort = 3000;
  const developmentServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (developmentServerUrl) {
    try {
      const parsedDevelopmentServerUrl = new URL(developmentServerUrl);
      developmentServerPort = Number(
        parsedDevelopmentServerUrl.port ||
        (parsedDevelopmentServerUrl.protocol === 'https:' ? '443' : '80')
      );
    } catch (error) {
      developmentServerPort = -1;
      console.warn(`[Security Blocked] Invalid VITE_DEV_SERVER_URL: ${developmentServerUrl}`, error);
    }
  }

  // 禁止意外的导航重定向
  browserWindow.webContents.on('will-navigate', (event, url) => {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      event.preventDefault();
      console.warn(`[Security Blocked] Invalid navigation URL: ${url}`, error);
      return;
    }

    const navigationPort = Number(parsedUrl.port || '80');
    const isDevelopmentServer =
      parsedUrl.protocol === 'http:' &&
      parsedUrl.hostname === 'localhost' &&
      navigationPort === developmentServerPort;
    const isPackagedFile = parsedUrl.protocol === 'file:';

    if (!isDevelopmentServer && !isPackagedFile) {
      event.preventDefault();
      console.warn(`[Security Blocked] Untrusted navigation to: ${url}`);
    }
  });
}

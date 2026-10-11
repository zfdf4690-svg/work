import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const electronExe = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-work-assistant-external-links-'));
const appDir = path.join(tempRoot, 'app');
const reportPath = path.join(tempRoot, 'report.json');

const electronMain = (report) => `
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { applyWindowSecurityPolicies } = require('./security.cjs');
const reportPath = ${JSON.stringify(report)};
const calls = [];
const warnings = [];
const requests = [];
const navigations = [];
const originalWarn = console.warn;
let server;
let phase = 'startup';
console.warn = (...args) => {
  warnings.push(args.map(String).join(' '));
  originalWarn(...args);
};

app.commandLine.appendSwitch(
  'host-resolver-rules',
  'MAP localhost.evil.com 127.0.0.1, MAP example.com 127.0.0.1, EXCLUDE localhost'
);

app.whenReady().then(async () => {
  server = http.createServer((_request, response) => {
    response.end('<!doctype html><title>development server</title>');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const developmentServerUrl = 'http://localhost:' + port;
  process.env.VITE_DEV_SERVER_URL = developmentServerUrl;

  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    requests.push(details.url);
    let allowed = false;
    try {
      const requestUrl = new URL(details.url);
      allowed = requestUrl.protocol === 'file:' ||
        requestUrl.origin === developmentServerUrl;
    } catch (error) {
      console.warn('[verify-external-links] Invalid request URL: ' + details.url, error);
    }
    callback({ cancel: !allowed });
  });

  const win = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.webContents.on('did-navigate', (_event, url) => navigations.push(url));
  const windowCountBefore = BrowserWindow.getAllWindows().length;
  applyWindowSecurityPolicies(win, (url) => calls.push(url));
  phase = 'initial file page';
  await win.loadFile(path.join(__dirname, 'fixture.html'));
  const initialFilePageLoaded = win.webContents.getURL().startsWith('file:');

  phase = 'external link checks';
  for (const id of ['https-link', 'file-link', 'javascript-link', 'data-link']) {
    await win.webContents.executeJavaScript(
      'document.getElementById(' + JSON.stringify(id) + ').click()'
    );
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  const clickNavigation = async (url) => {
    const previousUrl = win.webContents.getURL();
    const navigationCountBefore = navigations.length;
    const requestCountBefore = requests.length;
    const normalizedUrl = new URL(url).href;
    const script =
      '(() => { const link = document.createElement("a"); link.href = ' +
      JSON.stringify(url) +
      '; document.body.appendChild(link); link.click(); })()';
    const loadFinished = new Promise((resolve) => {
      const timeout = setTimeout(() => {
        win.webContents.removeListener('did-finish-load', onFinished);
        resolve(false);
      }, 1500);
      const onFinished = () => {
        if (new URL(win.webContents.getURL()).href === normalizedUrl) {
          clearTimeout(timeout);
          win.webContents.removeListener('did-finish-load', onFinished);
          resolve(true);
        }
      };
      win.webContents.on('did-finish-load', onFinished);
    });
    try {
      await win.webContents.executeJavaScript(script);
    } catch (error) {
      console.warn('[verify-external-links] Navigation click interrupted: ' + url, error);
    }
    const loaded = await loadFinished;
    if (!loaded) await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      currentUrl: win.webContents.getURL(),
      stayedOnPreviousPage: win.webContents.getURL() === previousUrl,
      didNavigate: navigations.slice(navigationCountBefore).includes(normalizedUrl),
      didNotRequest: !requests.slice(requestCountBefore).includes(normalizedUrl),
    };
  };

  phase = 'allowed file navigation';
  const fileTargetUrl = require('node:url')
    .pathToFileURL(path.join(__dirname, 'file-target.html'))
    .href;
  const fileNavigation = await clickNavigation(fileTargetUrl);
  const filePageAllowed =
    fileNavigation.currentUrl.startsWith('file:') && fileNavigation.didNavigate;

  phase = 'allowed development navigation';
  const developmentNavigation = await clickNavigation(developmentServerUrl);
  const developmentServerAllowed =
    developmentNavigation.currentUrl === developmentServerUrl + '/' &&
    developmentNavigation.didNavigate;

  const checkBlockedNavigation = async (url) => {
    return clickNavigation(url);
  };

  const blockedNavigations = {
    // Each navigation is initiated by a renderer anchor click, not webContents.loadURL().
    localhostPrefixDomain: await checkBlockedNavigation(
      'http://localhost.evil.com:' + port + '/blocked'
    ),
    wrongLocalhostPort: await checkBlockedNavigation('http://localhost:9999/blocked'),
    httpsExternalSite: await checkBlockedNavigation('https://example.com/blocked'),
  };

  const windowCountAfter = BrowserWindow.getAllWindows().length;
  const result = {
    calls,
    warnings,
    windowCountBefore,
    windowCountAfter,
    checks: {
      filePageAllowed,
      initialFilePageLoaded,
      developmentServerAllowed,
      localhostPrefixDomainBlocked:
        blockedNavigations.localhostPrefixDomain.stayedOnPreviousPage &&
        !blockedNavigations.localhostPrefixDomain.didNavigate &&
        blockedNavigations.localhostPrefixDomain.didNotRequest,
      wrongLocalhostPortBlocked:
        blockedNavigations.wrongLocalhostPort.stayedOnPreviousPage &&
        !blockedNavigations.wrongLocalhostPort.didNavigate &&
        blockedNavigations.wrongLocalhostPort.didNotRequest,
      httpsExternalSiteBlocked:
        blockedNavigations.httpsExternalSite.stayedOnPreviousPage &&
        !blockedNavigations.httpsExternalSite.didNavigate &&
        blockedNavigations.httpsExternalSite.didNotRequest,
      httpsOpenedOnce: calls.length === 1 && calls[0] === 'https://example.test/meeting',
      unsupportedSchemesBlocked: calls.length === 1,
      windowCountUnchanged: windowCountAfter === windowCountBefore,
    },
    blockedNavigations,
  };
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
  win.destroy();
  server.close();
  app.quit();
}).catch((error) => {
  fs.writeFileSync(reportPath, JSON.stringify({ error: String(error), stack: error.stack, phase }, null, 2));
  if (server) server.close();
  app.exit(1);
});
`;

try {
  if (!fs.existsSync(electronExe)) throw new Error(`Electron binary not found: ${electronExe}`);
  fs.mkdirSync(appDir);
  await build({
    entryPoints: [path.join(root, 'src/electron/main/security.ts')],
    outfile: path.join(appDir, 'security.cjs'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
  });
  fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify({ main: 'main.cjs' }));
  fs.writeFileSync(path.join(appDir, 'main.cjs'), electronMain(reportPath));
  fs.writeFileSync(
    path.join(appDir, 'fixture.html'),
    [
      '<!doctype html><html><body>',
      '<a id="https-link" target="_blank" href="https://example.test/meeting">https</a>',
      '<a id="file-link" target="_blank" href="file:///external-file">file</a>',
      '<a id="javascript-link" target="_blank" href="javascript:void(0)">javascript</a>',
      '<a id="data-link" target="_blank" href="data:text/html,blocked">data</a>',
      '</body></html>',
    ].join(''),
  );
  fs.writeFileSync(
    path.join(appDir, 'file-target.html'),
    '<!doctype html><html><body>file navigation target</body></html>',
  );

  const run = spawnSync(electronExe, [appDir], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30000,
    windowsHide: true,
  });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);

  const result = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;
  if (result) console.log(JSON.stringify(result, null, 2));
  if (run.error) throw run.error;
  if (run.status !== 0) throw new Error(`Electron verification exited with status ${run.status}`);
  if (!result || result.error) throw new Error(result?.error || 'Electron verification produced no report');
  const failedChecks = Object.entries(result.checks).filter(([, passed]) => !passed).map(([name]) => name);
  if (failedChecks.length) throw new Error(`Failed checks: ${failedChecks.join(', ')}`);
  console.log('[verify-external-links] OK (external browser intercepted; local navigation allow/block cases verified)');
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

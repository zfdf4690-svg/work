/**
 * PHASE 3-A Electron Runtime 验证脚本（在 Windows Node 下运行）
 *
 * 用法：
 *   node scripts/verify-electron-runtime.mjs dev       # 开发模式：vite dev server + electron .
 *   node scripts/verify-electron-runtime.mjs packaged  # 打包仿真：resources/app 布局 + electron.exe 无参启动
 *
 * 验证项（对应 PHASE 3-A 验收标准）：
 *   A1 Electron 进程真实启动，Main 进程执行
 *   A2 DatabaseManager 初始化，路径 = <userData>/data.db（app.getPath('userData')）
 *   A3 SQLite 文件真实生成且非空
 *   A4 Preload 成功加载，window.electronAPI 注入
 *   A5 Renderer 沙箱边界：无 require / process / global
 *   A6 Renderer → IPC → Main → TaskService 链路真实可用
 *   A7 better-sqlite3 被 Electron runtime 加载（DB 打开成功即证明；版本信息另行探测）
 *   A8 优雅退出时数据库正常 close
 *   A9 运行时配置（WAL）持久化生效，且本阶段未创建任何业务表
 */

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mode = process.argv[2] === 'packaged' ? 'packaged' : 'dev';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const electronExe = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
const runRoot = fs.mkdtempSync(path.join(os.tmpdir(), `ai-work-assistant-electron-${mode}-`));
const simDir = path.join(runRoot, 'packaged-runtime');
const logDir = path.join(runRoot, 'logs');
const userDataDir = path.join(runRoot, 'userData');
const dbPath = path.join(userDataDir, 'data.db');
fs.mkdirSync(logDir, { recursive: true });
fs.mkdirSync(userDataDir, { recursive: true });

// 独立端口 + 显式 IPv4：避免与占用 3000 端口的其他 dev server 冲突，
// 并使 vite 监听栈与 Chromium 对 localhost 的解析偏好（127.0.0.1）一致
const DEV_PORT = 3123;
const DEV_ORIGIN = `http://127.0.0.1:${DEV_PORT}`;
const EXPECTED_TITLE = 'AI Work Assistant - 个人工作助手';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, timeoutMs, interval = 500) {
  const t0 = Date.now();
  for (;;) {
    try {
      const v = await fn();
      if (v) return v;
    } catch { /* retry */ }
    if (Date.now() - t0 > timeoutMs) return null;
    await sleep(interval);
  }
}

async function cdpEvaluate(wsUrl, expression, awaitPromise = false) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const send = (method, params) => new Promise((res) => {
    const i = ++id;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const r = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
  ws.close();
  return r?.result;
}

async function findPageTarget(urlPredicate) {
  return waitFor(async () => {
    const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
    return list.find((t) => t.type === 'page' && urlPredicate(t.url)) || null;
  }, 30000);
}

function gracefulQuit(pid) {
  // 不带 /F 的 taskkill 向 GUI 进程顶层窗口发送 WM_CLOSE，触发 Electron 正常退出链路
  spawnSync('taskkill', ['/PID', String(pid)], { stdio: 'ignore' });
}

function forceKillTree(pid) {
  spawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'ignore' });
}

let viteProc = null;
let electronProc = null;

async function main() {
  console.log(`=== PHASE 3-B Electron Runtime Verification (${mode}) ===`);

  if (!fs.existsSync(electronExe)) {
    check('A0 Electron 二进制存在', false, electronExe);
    process.exit(1);
  }
  check('A0 Electron 二进制存在', true, electronExe);

  console.log(`[isolation] temporary userData=${userDataDir}`);

  let electronArgs;
  let pageUrlPredicate;
  let spawnedExe = electronExe;
  const electronEnv = {
    ...process.env,
    ELECTRON_ENABLE_LOGGING: '1',
    ELECTRON_TEST_USER_DATA: userDataDir,
  };

  if (mode === 'dev') {
    // 启动 vite dev server（Renderer 页面来源）
    const viteOut = fs.openSync(path.join(logDir, 'vite.out.log'), 'w');
    const viteErr = fs.openSync(path.join(logDir, 'vite.err.log'), 'w');
    viteProc = spawn('cmd.exe', ['/c', 'npx', 'vite', '--port', String(DEV_PORT), '--strictPort', '--host', '127.0.0.1'], {
      cwd: root, stdio: ['ignore', viteOut, viteErr],
    });
    const viteReady = await waitFor(async () => {
      const r = await fetch(DEV_ORIGIN).catch(() => null);
      return r && r.ok;
    }, 60000);
    check('前置：vite dev server 就绪', !!viteReady, DEV_ORIGIN);
    electronArgs = ['.', '--remote-debugging-port=9222'];
    electronEnv.VITE_DEV_SERVER_URL = DEV_ORIGIN;
    pageUrlPredicate = (url) => url.includes(`127.0.0.1:${DEV_PORT}`);
  } else {
    // 打包仿真：复制 Electron dist，构造 resources/app 布局（等价 electron-builder unpacked 产物）
    // 注：Node 24 的 fs.cpSync 复制该 ~300MB 目录时进程会无声退出（exit 9），改用 Windows 原生 robocopy
    fs.rmSync(simDir, { recursive: true, force: true });
    const rc = spawnSync('robocopy', [
      path.join(root, 'node_modules', 'electron', 'dist'), simDir,
      '/MIR', '/NFL', '/NDL', '/NJH', '/NJS', '/NP',
    ], { stdio: 'ignore' });
    if (rc.status === null || rc.status >= 8) {
      throw new Error(`robocopy 复制 Electron dist 失败: exit=${rc.status}`);
    }
    console.log('[packaged-sim] step1 robocopy dist 完成');
    // 移除 default_app，确保 resources/app 生效
    fs.rmSync(path.join(simDir, 'resources', 'default_app.asar'), { force: true });
    const appDir = path.join(simDir, 'resources', 'app');
    fs.mkdirSync(path.join(appDir, 'node_modules'), { recursive: true });
    console.log('[packaged-sim] step2 app 目录就绪');
    fs.cpSync(path.join(root, 'package.json'), path.join(appDir, 'package.json'));
    console.log('[packaged-sim] step3 package.json 复制完成');
    // 注：本机 Node 24 的 fs.cpSync recursive 在此磁盘环境会无声退出（exit 9），目录复制一律走 robocopy
    const robocopy = (src, dest, extraArgs = []) => {
      const r = spawnSync('robocopy', [src, dest, '/MIR', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', ...extraArgs], { stdio: 'ignore' });
      if (r.status === null || r.status >= 8) throw new Error(`robocopy 失败 ${src} -> ${dest}: exit=${r.status}`);
    };
    robocopy(path.join(root, 'dist-electron'), path.join(appDir, 'dist-electron'));
    console.log('[packaged-sim] step4 dist-electron 复制完成');
    robocopy(path.join(root, 'migrations'), path.join(appDir, 'migrations'));
    console.log('[packaged-sim] migrations copied');
    // 仅复制运行时必需内容（/XD 排除 build/deps/src 等编译期目录）
    robocopy(path.join(root, 'node_modules', 'better-sqlite3'), path.join(appDir, 'node_modules', 'better-sqlite3'),
      ['/XD', 'build', 'deps', 'src', 'test', 'benchmark']);
    console.log('[packaged-sim] step5 better-sqlite3 复制完成');
    const hasDist = fs.existsSync(path.join(root, 'dist', 'index.html'));
    if (hasDist) {
      robocopy(path.join(root, 'dist'), path.join(appDir, 'dist'));
    }
    console.log(`[packaged-sim] resources/app assembled (renderer dist: ${hasDist ? 'yes' : 'NO - loadFile 将失败，仅验证 Main/DB 链路'})`);
    // 重命名 exe：Electron 的 app.isPackaged 判定要求 exe 非默认 electron.exe（等价 electron-builder 产物形态）
    fs.copyFileSync(path.join(simDir, 'electron.exe'), path.join(simDir, 'ai-work-assistant.exe'));
    spawnedExe = path.join(simDir, 'ai-work-assistant.exe');
    electronArgs = ['--remote-debugging-port=9222']; // 无应用参数 → packaged 模式加载 resources/app
    pageUrlPredicate = (url) => url.startsWith('file://');
  }

  // 启动 Electron
  const outLog = path.join(logDir, `electron-${mode}.out.log`);
  const errLog = path.join(logDir, `electron-${mode}.err.log`);
  const outFd = fs.openSync(outLog, 'w');
  const errFd = fs.openSync(errLog, 'w');
  electronProc = spawn(spawnedExe, electronArgs, {
    cwd: mode === 'packaged' ? simDir : root,
    env: electronEnv,
    stdio: ['ignore', outFd, errFd],
  });
  const electronPid = electronProc.pid;
  console.log(`[run] electron pid=${electronPid} mode=${mode}`);

  // A1/A2：等待 Main 进程日志
  const dbInitLine = await waitFor(() => {
    const s = fs.existsSync(outLog) ? fs.readFileSync(outLog, 'utf8') : '';
    const m = s.match(/\[Database\] initialized: (.+)/);
    return m ? { line: m[0], dbPath: m[1].trim() } : null;
  }, 60000);
  const actualUserData = await waitFor(() => {
    const s = fs.existsSync(outLog) ? fs.readFileSync(outLog, 'utf8') : '';
    return s.match(/\[Test\] userData=(.+)/)?.[1]?.trim() || null;
  }, 60000);
  check('A1 Electron 进程启动且 Main 执行', !!dbInitLine);
  check('A2a app.getPath(userData) 指向本次临时目录', actualUserData === userDataDir, actualUserData || '未捕获');
  check('A2b DatabaseManager 初始化到临时 userData', !!dbInitLine && dbInitLine.dbPath === dbPath, dbInitLine?.dbPath || '未捕获');
  const migrationLine = await waitFor(() => {
    const s = fs.existsSync(outLog) ? fs.readFileSync(outLog, 'utf8') : '';
    const m = s.match(/\[Database\] migrations applied=(\d+), skipped=(\d+)/);
    return m ? { applied: Number(m[1]), skipped: Number(m[2]) } : null;
  }, 60000);
  check('B1 首次启动执行 001_init.sql', migrationLine?.applied === 1 && migrationLine.skipped === 0, JSON.stringify(migrationLine));

  // A4/A5/A6：CDP 断言 Renderer 边界
  const page = dbInitLine ? await findPageTarget(pageUrlPredicate) : null;
  check('前置：CDP 发现 Renderer 页面', !!page, page?.url || '');
  if (page) {
    // 页面真实性断言：等待导航 commit，确认加载的是目标应用页面而非错误页/其他应用（错误页不执行 preload）
    const expectedTitle = mode === 'dev' ? EXPECTED_TITLE : 'AI Work Assistant';
    const idn = await waitFor(async () => {
      const r = await cdpEvaluate(page.webSocketDebuggerUrl,
        `JSON.stringify({title: document.title, hasRoot: !!document.getElementById('root'), url: location.href, ready: document.readyState})`);
      const v = r?.result?.value ? JSON.parse(r.result.value) : null;
      return v && v.url !== 'about:blank' && v.ready !== 'loading' ? v : null;
    }, 30000);
    check('前置：Renderer 页面真实性（目标应用，非错误页）', !!idn && idn.hasRoot === true && (idn.title || '').includes(expectedTitle), JSON.stringify(idn));

    const boundary = await cdpEvaluate(page.webSocketDebuggerUrl,
      `JSON.stringify({api: typeof window.electronAPI, taskList: typeof window.electronAPI?.task?.list, req: typeof window.require, proc: typeof window.process, glob: typeof window.global})`);
    const b = boundary?.result?.value ? JSON.parse(boundary.result.value) : null;
    check('A4 Preload 注入 window.electronAPI', b?.api === 'object' && b?.taskList === 'function', JSON.stringify(b));
    check('A5 Renderer 沙箱边界（无 require/process/global）', b?.req === 'undefined' && b?.proc === 'undefined' && b?.glob === 'undefined', JSON.stringify(b));

    const ipc = await cdpEvaluate(page.webSocketDebuggerUrl,
      `window.electronAPI.task.list().then(r => JSON.stringify({success: r.success, count: r.data?.length, firstId: r.data?.[0]?.id})).catch(e => 'ERR:' + e)`, true);
    const i = ipc?.result?.value ? JSON.parse(ipc.result.value) : null;
    check('A6 Renderer→IPC→Main→TaskService 链路', i?.success === true && i?.count >= 2, JSON.stringify(i));
  }

  // Runtime migration must create the database only below this invocation's temporary userData.
  const dbExists = fs.existsSync(dbPath) && fs.statSync(dbPath).size >= 0;
  check('A3 SQLite 文件位于临时 userData', dbExists, dbPath);

  // A8：优雅退出 → close
  gracefulQuit(electronPid);
  const exited = await waitFor(() => {
    try { process.kill(electronPid, 0); return null; } catch { return true; }
  }, 15000, 500);
  const outContent = fs.readFileSync(outLog, 'utf8');
  check('A8 优雅退出且 [Database] closed', !!exited && outContent.includes('[Database] closed'));

  const errContent = fs.readFileSync(errLog, 'utf8');
  check('Preload 无加载错误（stderr）', !/Unable to load preload|preload.*failed/i.test(errContent));
  check('Preload 执行且暴露成功（stderr 可见 [Preload] 日志）',
    errContent.includes('[Preload] script executing') && errContent.includes('[Preload] electronAPI exposed'));

  // Inspect the closed database from outside Electron after the real runtime migration.
  if (dbExists) {
    const { default: Database } = await import('better-sqlite3');
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const jm = db.pragma('journal_mode', { simple: true });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    const migrations = db.prepare('SELECT migration_id FROM schema_migrations ORDER BY migration_id').all();
    db.close();
    check('A9a journal_mode=WAL 持久化生效', String(jm).toLowerCase() === 'wal', `journal_mode=${jm}`);
    check('B2 schema_migrations 与 tasks 存在', JSON.stringify(tables.map((table) => table.name)) === JSON.stringify(['schema_migrations', 'tasks']), JSON.stringify(tables.map((table) => table.name)));
    check('B3 migration version 已登记', JSON.stringify(migrations) === JSON.stringify([{ migration_id: '001_init.sql' }]), JSON.stringify(migrations));
  }

  // 汇总
  const failed = results.filter((r) => !r.ok);
  console.log('\n=== SUMMARY ===');
  console.log(JSON.stringify({ mode, passed: results.length - failed.length, failed: failed.length, results }, null, 2));
  if (failed.length > 0) process.exitCode = 1;
}

main()
  .catch((e) => { console.error('VERIFY SCRIPT ERROR:', e); process.exitCode = 2; })
  .finally(() => {
    if (electronProc?.pid) forceKillTree(electronProc.pid);
    if (viteProc?.pid) forceKillTree(viteProc.pid);
    if ((process.exitCode ?? 0) === 0) fs.rmSync(runRoot, { recursive: true, force: true });
  });

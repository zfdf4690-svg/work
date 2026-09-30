/**
 * Electron Main / Preload 构建脚本（基于仓库已有 esbuild，不新增依赖）
 *
 * 为什么需要本脚本（修 A0 登记的 .ts/.js 入口不一致）：
 * 1. Electron 运行时加载的是 JS 文件，仓库内 main/preload 源码为 TS，必须构建。
 * 2. main/index.ts 中 preload 路径解析为 ../preload/index.js，因此构建产物
 *    必须保持 dist-electron/main/index.js 与 dist-electron/preload/index.js
 *    的相对布局，使源码中的路径解析在产物中依然成立。
 * 3. sandbox: true 下 preload 脚本必须是单文件 CommonJS，且只能 require
 *    'electron'，因此 preload 采用全量内联打包（仅 electron 外部化）。
 *
 * 产物：
 *   dist-electron/main/index.js    ESM（package.json "type": "module"）
 *   dist-electron/preload/index.js CJS（sandboxed preload 要求）
 */

import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const shared = {
  bundle: true,
  platform: 'node',
  sourcemap: false,
  logLevel: 'info',
};

// Main 进程：ESM 输出；electron 与原生模块 better-sqlite3 保持外部引用，
// 运行时由 Electron / Node 模块解析从 node_modules 加载。
await build({
  ...shared,
  entryPoints: [path.join(root, 'src/electron/main/index.ts')],
  outfile: path.join(root, 'dist-electron/main/index.js'),
  format: 'esm',
  external: ['electron', 'better-sqlite3'],
});

// Preload：sandbox 启用时必须是单文件 CJS；除 electron 外全部内联打包，
// 避免 sandboxed preload 的受限 require 触达任何 npm 包。
await build({
  ...shared,
  entryPoints: [path.join(root, 'src/electron/preload/index.ts')],
  outfile: path.join(root, 'dist-electron/preload/index.js'),
  format: 'cjs',
  external: ['electron'],
});

console.log('[build-electron] OK: dist-electron/main/index.js + dist-electron/preload/index.js');

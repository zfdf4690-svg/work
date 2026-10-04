# Task Progress — AI Work Assistant 后端（PHASE 3）

> 用途：pi 会话之间的任务交接文档。换会话 / 压缩前由 pi 更新本文件；新会话开头用 `@TASK_PROGRESS.md` 引用即可无缝接上。
> 约定：标注「由 pi 填写」的章节由 pi 在会话中据实更新，不要留空提交。
> 最后更新：2026-09-30（pi，PHASE GATE SYNC：A0/3-A 门禁状态同步）

---

## 0. 一句话交接（由 pi 填写）

> 用 2–3 句说清：现在做到哪、卡在哪、下一步是什么。

PHASE 3-A（SQLite Runtime Foundation）已完成、验收通过并提交（commit `4f3fb8e`）：DatabaseManager + userData 路径 + Main 生命周期重排 + esbuild 构建入口 + dev/packaged 双模式真实运行时验证全绿。当前无阻塞，STOP 等待人工批准进入 PHASE 3-B（Migration）。注意：本地 main 领先 origin/main 2 个 commit，尚未 push。

## 1. 项目角色与当前阶段

- 角色：**Pi = 后端 / Core 工程师**，不是架构决策者；前端 UI / Renderer 由 Google AI Studio 负责。

**阶段门禁状态（以 git history 为准，`4f3fb8e` 已 push 至 origin/main）：**

| 阶段 | 状态 |
|---|---|
| PHASE 3-A0（审计） | ✅ ACCEPTED |
| PHASE 3-A（SQLite Runtime） | ✅ ACCEPTED & COMMITTED（`4f3fb8e`） |
| PHASE 3-B（Migration） | ⛔ NOT STARTED / NOT AUTHORIZED |
| PHASE 3-C（Repository 加固） | ⛔ NOT STARTED |
| PHASE 3-D（TaskService SQLite DI 切换） | ⛔ NOT STARTED |
| PHASE 3-E（IPC 复核，含 C6） | ⛔ NOT STARTED |
| PHASE 3-F（重启持久化验收） | ⛔ NOT STARTED |
| PHASE 3-G（事件一致性） | ⛔ NOT STARTED |

- 阶段闸门：**未获人工明确批准「进入 PHASE 3-B」前，禁止创建 migrations/、001_init.sql、Migration Runner 或任何业务表。**
- **context_id 是冻结的 3-B Schema 输入**：最终 3-B migration 应含 `context_id TEXT`（可空、当前不建 FK）；**在 3-B 之前不得把 context_id 提前加入 Domain、Drizzle schema 或 Repository**。
- **前端状态（客观事实，本次不修）**：当前 Renderer 任务操作仍走本地 state 路径（`App.tsx`），尚未形成 Renderer → IPC → TaskService → Repository → SQLite 的完整任务持久化闭环；闭环在 3-D 之后、由前端负责方收敛（规则 14）。

## 2. 本轮任务目标

> PHASE 3-A0（12 项 Reconciliation 审计）与 PHASE 3-A（SQLite Runtime）均已完成，详见第 3 节。
> 下一轮（PHASE 3-B，**待批准后执行**）目标：

- 创建 `migrations/` 目录与 `001_init.sql`：tasks 表结构严格遵循 `references/task-schema.md` 已冻结基线（含 C5 裁定的 `context_id` nullable、无 FK）
- 实现 Migration Runner：在 Main 生命周期预留点执行（`initializeDatabase()` 之后、`registerIpcHandlers()` 之前，`src/electron/main/index.ts` 已有注释占位）
- 校验 Drizzle schema（`src/core/db/schema.ts`）与 SQL 迁移一致；记录当前 schema 版本
- 验收：`tsc` + smoke + `scripts/verify-electron-runtime.mjs`（dev + packaged）全绿，且外部复检可见 tasks 表与迁移版本记录
- **禁止**：切换 Repository（3-C/3-D 的事）、改 TaskService/Domain/IPC/UI、处理 C6/C7、使用 drizzle-kit、安装未批准依赖

## 3. 已完成（由 pi 填写）

- [x] PHASE 3-A0 只读审计：12 项 Reconciliation 报告，人工确认通过
- [x] PHASE 3-A `src/core/db/databaseManager.ts`：IDatabaseConnection 实现；WAL / foreign_keys / busy_timeout=5000 / synchronous=NORMAL；零业务表；`getConnection()` 预留为 3-B/3-C 入口；纯 Node 不 import electron、不进 core barrel（防泄入 Renderer bundle）
- [x] `src/electron/main/database.ts` 组合根：`userData/data.db` + 单例 init/get/close
- [x] `src/electron/main/index.ts` 生命周期重排（ready→DB init→〔3-B 占位〕→IPC→窗口）+ will-quit 关闭 + fail-fast
- [x] 修复 A0 入口不一致：新增 `scripts/build-electron.mjs`（esbuild，main ESM + preload CJS，零新依赖）；`package.json` 加 `main` 字段；`electron:dev` 走构建产物
- [x] 修复 loadFile 打包路径 bug（`../../../dist` → `../../dist`，真实打包后必炸，属 3-A 任务书点名范围）
- [x] preload 可观测性：暴露失败不再静默吞掉（console.error + 执行/暴露日志）
- [x] ABI 运行时实证：Electron 44.4.5（Node 24.21.0 / N-API 10 / Chrome 152）+ better-sqlite3@13（N-API 10）→ **无需 electron-rebuild**
- [x] 运行时验证 `scripts/verify-electron-runtime.mjs`：dev **16/16** + packaged 仿真 **15/15** 全绿；tsc / smoke:core / smoke:test 全绿
- [x] PHASE 3-A commit `4f3fb8e`（恰好 8 个 3-A 文件，未混入历史变更；scope audit 全 NONE）
- [x] Electron 二进制补齐：npm postinstall 未下载 dist/，手动下载 44.4.5 + SHA256 校验官方镜像（非新依赖）
- [x] 一键启动脚本 `start-app.cmd`（2026-09-30，双击即用）：端口检测→构建→起 vite@3123→起 Electron→关窗自动清理 vite；bat 已验证 CRLF 无 BOM、rem 行禁含 `>`

## 4. 进行中 / 阻塞（由 pi 填写）

- 无技术阻塞。当前 STOP，等待人工批准「进入 PHASE 3-B」
- electron-builder 未安装（需审批）；当前打包验证用 `resources/app` + exe 重命名仿真（等价 unpacked 产物）
- 本地 main 领先 origin/main 2 个 commit（`bcf1040` AGENTS.md + `4f3fb8e` 3-A），push 待确认

## 5. 待办（由 pi 填写）

- [ ] PHASE 3-B：migrations/ + 001_init.sql（含 `context_id`，C5）+ Migration Runner + schema 版本记录（详见第 2 节）
- [ ] PHASE 3-C：SQLite Repository 完整实现（含真实 count()，替换占位）
- [ ] PHASE 3-D：IPC 注入切换 InMemory→SQLite + 重启持久化验证
- [ ] PHASE 3-E/3-G：C6 事件广播契约统一（handlers.ts:89 裸事件 vs contracts.ts EventBroadcastPayload on `event:broadcast`，以 preload/contracts 为准）
- [ ] Tool Registry 阶段：C7 ToolDefinition 补 `outputSchema`/`permissions`（非 PHASE 3）
- [ ] 杂项（非阻塞，待人工决定）：`react-example` 改名；dev fallback `localhost:3000` 统一；`.pi/` 与历史换行符 churn 的 git 处理；`bun.lock` vs `package-lock.json` 策略；`schema.ts` 注释变更与 `AGENTS.md` C1 更新尚未提交（历史遗留，可随下次 docs commit 处理）

## 6. 关键发现（由 pi 填写）

**A0 审计发现**：
- IPC 注入的是 `InMemoryTaskRepository`（handlers.ts:77），重启丢数据；仓库无 migration 体系
- `electron:dev` 指向 `.ts` 入口与产物 `.js` 不一致——3-A 实测 Electron 44 虽能解析 TS 语法但无扩展名导入直接 `ERR_MODULE_NOT_FOUND`，esbuild 构建为必要修复
- C6 事件广播契约不一致（留 3-E/3-G）；C7 ToolDefinition 字段缺口（留 Tool Registry 阶段）

**3-A 实测环境事实（后续阶段务必复用）**：
- Electron `isPackaged` 判定依赖 **exe 文件名**（仿真/打包须重命名 exe，验证脚本已处理）
- vite 无 `--host` 时在 Windows 只监听 `::1`，而 Chromium 解析 localhost 偏好 `127.0.0.1` → 加载错误页、preload 不执行；**验证/开发一律显式 `--host 127.0.0.1` 或注入 `VITE_DEV_SERVER_URL`**
- 3000 端口常被本机另一项目（AI 语音行程助手）占用；开发/验证用独立端口 **3123**
- 本机 Node 24 `fs.cpSync` recursive 在此磁盘环境无声退出（exit 9）→ 复制目录一律用 robocopy（验证脚本已处理，勿回退）
- WSL 的 curl/fetch 访问 Windows 侧 127.0.0.1 不通（网络命名空间隔离）；连通性检查须在 Windows 侧执行
- WSL→cmd 互操作偶发 `Exec format error`（重试即可）；bash→cmd 多层引号易错乱（优先用脚本文件或 PowerShell 单引号）

## 7. 硬约束速查（违反即破坏架构，详见 AGENTS.md）

| # | 铁律 |
|---|------|
| 1 | TaskService 是唯一业务入口，禁止直连 Repository / SQLite |
| 2 | Repository 只负责持久化，不做业务判断 |
| 3 | Renderer 只能经 `window.electronAPI`（Preload + contextBridge）；不得出现 `better-sqlite3` / `ipcRenderer` / `node:*` / `fs` 等 |
| 4 | SQLite 只能由 Main / App Core 使用 |
| 5 | `Task.status`（PENDING/IN_PROGRESS/COMPLETED/CANCELLED）与 Agent Execution State 是两套独立状态机，不合并 |
| 6 | `delete_task` 用物理 DELETE，任意状态均可删，需 `confirmed=true` |
| 7 | Confirmation 属 Agent Runtime 职责；TaskService 只校验 `confirmed=true` |
| 8 | Internal Tool → App Core Service；MCP Tool → MCP Client → Server；两者不互相调用 |
| 9 | Domain / IPC Contract 默认 Frozen：冲突时停止扩大修改 → 报告 → 列受影响文件 → 最小变更方案 → 获人工确认后才改 |
| 10 | Schema 变更一律新增 `migrations/` 文件，不改历史迁移 |
| 11 | 先落库、再发事件 |
| 12 | AI 微调与手动编辑收敛到同一个 `TaskService.update()` |
| 13 | 不新增第二套业务逻辑，前端只调 `ipcClient.task.xxx()` |
| 14 | 不改变现有 UI / Renderer 代码，除非任务明确要求 |

## 8. 下一步

- 等待人工明确批准：**「进入 PHASE 3-B」**。
- 批准后按第 2 节执行 PHASE 3-B（Migration），验收以 `references/acceptance-checklist.md` 为准，完成后更新本文件并 STOP。
- 3-B 之前先读：`references/architecture-baseline.md`、`references/task-schema.md`、`references/ipc-contract.md`。

## 9. 交接引导词（可直接粘贴给 pi）

```
继续 AI Work Assistant 后端任务。先依次读取 @AGENTS.md @TASK_PROGRESS.md .pi/skills/backend-task-pipeline/SKILL.md，然后：
1. 先复述你承担的角色、当前阶段（PHASE 3-A 已完成并提交 4f3fb8e；3-B 待批准）和本轮要完成的事，确认理解无误再动手。
2. 未经人工明确批准不得进入 PHASE 3-B；批准后严格按 TASK_PROGRESS.md 第 2 节的 3-B 范围执行（migrations/ + 001_init.sql 含 context_id + Migration Runner 接入 main 生命周期预留点），先读 references/architecture-baseline.md、task-schema.md、ipc-contract.md。
3. 禁止：切换 Repository、改 TaskService/Domain/IPC/UI、处理 C6/C7、drizzle-kit、安装未批准依赖；冻结裁定 C1–C5 不得推翻。
4. 验证：tsc + smoke:core + smoke:test + node scripts/verify-electron-runtime.mjs（dev + packaged）全绿；完成后同步更新 TASK_PROGRESS.md，报告并 STOP。
```

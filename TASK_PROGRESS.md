# Task Progress — AI Work Assistant 后端（PHASE 3）

> 用途：pi 会话之间的任务交接文档。换会话 / 压缩前由 pi 更新本文件；新会话开头用 `@TASK_PROGRESS.md` 引用即可无缝接上。
> 约定：标注「由 pi 填写」的章节由 pi 在会话中据实更新，不要留空提交。
> 最后更新：2026-10-07（PHASE 3-G ✅ ACCEPTED：C6 广播修复及 Electron E2E 全通过）

---

## 0. 一句话交接（由 pi 填写）

> 用 2–3 句说清：现在做到哪、卡在哪、下一步是什么。

PHASE 3-D 至 PHASE 3-F 已验收并提交（`3dbbdfd`、`8766223`、`5ca8015`）。PHASE 3-G 已修复 C6 Main broadcast channel/payload mismatch，并通过真实 Electron E2E 验证 Renderer `events.on()` 收到 Task 生命周期事件；阶段完成后停止，不自动进入 3-H。

## 1. 项目角色与当前阶段

- 角色：**Pi = 后端 / Core 工程师**，不是架构决策者；前端 UI / Renderer 由 Google AI Studio 负责。

**阶段门禁状态（以 git history 为准）：**

| 阶段 | 状态 |
|---|---|
| PHASE 3-A0（审计） | ✅ ACCEPTED |
| PHASE 3-A（SQLite Runtime） | ✅ ACCEPTED & COMMITTED（`4f3fb8e`） |
| PHASE 3-B（Migration） | ✅ ACCEPTED & COMMITTED（`8b41171`） |
| PHASE 3-C（Repository 加固） | ✅ ACCEPTED & COMMITTED（`05057dc`） |
| PHASE 3-D（TaskService SQLite DI 切换） | ✅ ACCEPTED & COMMITTED（`3dbbdfd`） |
| PHASE 3-E（IPC 复核，含 C6） | ✅ ACCEPTED & COMMITTED（`8766223`） |
| PHASE 3-F（重启持久化验收） | ✅ ACCEPTED & COMMITTED（`5ca8015`） |
| PHASE 3-G（Task Event Broadcast） | ✅ ACCEPTED（C6 修复 + 真实 Electron E2E） |

- 阶段闸门：**3-D 至 3-F 已验收并提交；3-G C6 已修复且 E2E 全通过；本阶段完成后 STOP，不得自动进入 3-H。**
- **contextId 已按架构裁决同步**：Domain `contextId?: string | null` ↔ Drizzle `context_id` ↔ 3-B migration 的 nullable TEXT；无 FK，未改历史 migration。
- **前端状态（客观事实，本次不修）**：当前 Renderer 任务操作仍以本地 state 路径为主，尚未完全与 SQLite 持久化闭环收敛；该收敛由前端负责方按后续阶段处理。

## 2. 本轮任务目标

- PHASE 3-D 已完成：TaskService 生产装配已切换到 SQLite Repository，保留 InMemory 作为测试/fixture，保持唯一业务入口。
- PHASE 3-E 已完成：真实验证 `Renderer -> Preload -> IPC -> Zod -> TaskService -> SQLite` 链路，且保留 3-D 变更范围。
- PHASE 3-F 已完成双重 Restart HARD GATE 验证；PHASE 3-G 仅修改 Main Event Broadcast Adapter 与 E2E verifier，不扩张到 Renderer UI / Agent / Migration。
- PHASE 3-G 限于 Main Event Broadcast Adapter 与真实 Electron E2E；未实现 Renderer UI 消费或自动刷新。

## 3. 已完成（由 pi 填写）

- [x] PHASE 3-A0 只读审计：完成重构审计与门禁确认
- [x] PHASE 3-A `src/core/db/databaseManager.ts`：SQLite runtime 与连接管理完成
- [x] `src/electron/main/database.ts`：主进程数据库初始化与生命周期完成
- [x] PHASE 3-B `migrations/001_init.sql` + `MigrationRunner`：migration、tracking、幂等和安全边界通过
- [x] PHASE 3-C `contextId` 契约同步：Domain `contextId?: string | null` 与 Drizzle `context_id` 对齐，migration 保持未改
- [x] `DrizzleTaskRepository`：create/find/update/delete/count 等真实 SQL 逻辑实现并通过专项测试
- [x] Repository 测试：CRUD、filter/count、状态删除、tags/contextId/null/timestamps、SQL failure propagation 全通过
- [x] PHASE 3-D commit `3dbbdfd`：TaskService 工厂与生产装配切换到 SQLite Repository
- [x] PHASE 3-E commit `8766223`：新增真实 IPC/Zod 验证测试，并通过 lint / smoke / build 实证
- [x] 端到端验证：`npm run lint`、`npx tsx src/electron/ipc/taskServiceIpcValidationTest.ts`、`npx tsx src/core/services/taskServiceSqliteIntegrationTest.ts`、`npm run smoke:core`、`npm run smoke:test`、`npm run build` 全通过
- [x] PHASE 3-F HARD GATE A：独立 Node Process A 写入并退出；Process B 对同一 DB 全字段读回；四状态物理删除、confirmation 与 migration 非破坏性验证通过
- [x] PHASE 3-F HARD GATE B：真实 Electron A 经 Renderer/Preload/IPC create/update 并完整退出；Electron B 重启后经 IPC 读回一致 Task；同一临时 userData/DB，migration 跳过，SQLite 行存在
- [x] PHASE 3-F 验证命令：`node scripts/phase3f-process-restart.mjs`、`node scripts/verify-electron-runtime.mjs phase3f`、lint、Repository/Service tests、smoke、Vite/Electron build 全通过
- [x] PHASE 3-G C6：Main 改用 `event:broadcast` 并发送 `{ event }`，未改 IPC Contract / Preload API / EventBus / TaskService
- [x] PHASE 3-G 真实 Electron E2E：通过 `window.electronAPI.events.on()` 验证 TaskCreated / TaskUpdated / TaskCompleted / TaskDeleted、Task ID、SQLite 查询可见、失败 update 不广播；47/47 检查通过
- [x] PHASE 3-G 回归：lint、Repository/Service/IPC tests、smoke:core、smoke:test、Vite build、Electron build 全通过

## 4. 进行中 / 阻塞（由 pi 填写）

- PHASE 3-F 两个 HARD GATE 与项目验证均已通过并提交（`5ca8015`）。
- 当前 STOP：PHASE 3-G 已完成；不得自动进入 PHASE 3-H。
- 生产 Domain、Repository、TaskService、IPC Contract、Preload API、Renderer/UI、Agent、MCP 均未修改；未新增 migration。

## 5. 待办（由 pi 填写）

- [x] PHASE 3-D：TaskService SQLite DI 切换已完成并提交 `3dbbdfd`
- [x] PHASE 3-E：IPC/Zod/SQLite 真实链路已完成并提交 `8766223`
- [x] PHASE 3-F：Process A→B 与 Electron A→B 重启持久化验证通过
- [x] PHASE 3-G：C6 Event Broadcast 修复及真实 Electron E2E 已验收
- [ ] Tool Registry 阶段：C7 ToolDefinition 补全 `outputSchema` / `permissions`（非 PHASE 3）

## 6. 关键发现（由 pi 填写）

- 3-D 期间的核心发现：生产装配在 `TaskService` 这一层切到了 SQLite Repository，且保留唯一业务入口，未破坏架构边界。
- 3-E 期间确认：IPC 真实链路与 Zod 校验一致，delete confirmation 语义保持正确，`TaskService` 仍为唯一业务入口。
- 3-F 发现：现有 Electron runtime verifier 会直接运行可能过期的 `dist-electron`；3-F harness 先执行 `build-electron` 后才启动，保证测试的是当前生产源码。固定 Vite 端口可能冲突，Phase 3-F 模式改为独立端口并严格检查真实应用 Renderer。
- 3-F 中非空 `contextId` 的跨进程覆盖使用 TaskService persistence fixture；Electron IPC 冻结输入不暴露 `contextId`，Electron 路径验证其 `null` 往返，未更改 IPC Contract。
- 3-G 确认 Main 原发送 `event:subscribe` + 裸 DomainEvent，Preload 则监听 `event:broadcast` + `{ event }`；修正后真实 Renderer listener 收到事件。当前 Renderer 无业务 consumer，因此 UI 自动刷新仍留在后续范围。

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

- PHASE 3-G 已验收；立即停止，不得自行启动 PHASE 3-H。

## 9. 交接引导词（可直接粘贴给 pi）

```
继续 AI Work Assistant 后端任务。先读 @AGENTS.md、@TASK_PROGRESS.md 和 `.pi/skills/backend-task-pipeline/SKILL.md`。PHASE 3-D 至 3-F 已验收并提交；PHASE 3-G C6 Broadcast Adapter 已修复并通过真实 Electron E2E。根据阶段指令立即停止，不得自动进入 PHASE 3-H；Renderer UI 实时刷新、Agent、MCP 与 Migration 均不在本次范围。
```

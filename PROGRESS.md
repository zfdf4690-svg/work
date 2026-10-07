# 项目进度 · PHASE 3 交接文档

> 最后更新：2026-10-07（PHASE 3-F ✅ ACCEPTED & COMMITTED `5ca8015`；3-G 未授权）
> 新会话接手时：**先读本文件，再读 `AGENTS.md` 和 `.pi/skills/backend-task-pipeline/SKILL.md`**

---

## 1. 当前阶段

**已完成**：PHASE 3-A0 ✅ ACCEPTED；PHASE 3-A ✅ ACCEPTED & COMMITTED（`4f3fb8e`）；PHASE 3-B ✅ ACCEPTED & COMMITTED（`8b41171`）；PHASE 3-C ✅ ACCEPTED & COMMITTED（`05057dc`）；PHASE 3-D ✅ ACCEPTED & COMMITTED（`3dbbdfd`）：TaskService 已切到 SQLite Repository；PHASE 3-E ✅ ACCEPTED & COMMITTED（`8766223`）：IPC/Zod/SQLite 真实链路与验证通过。
**当前状态**：PHASE 3-F ✅ ACCEPTED & COMMITTED（`5ca8015`）；Process A→B 与 Electron A→B Restart HARD GATE 均通过。
**未开始 / 未授权**：PHASE 3-G 事件一致性。

## 2. 环境与仓库关键事实

- 工作区：`E:\系统默认\桌面\个人办公助手1`（WSL 中为 `/mnt/e/...`）；项目根 = `work/`
- Electron + React + TypeScript + SQLite + Drizzle ORM + Zod（冻结栈，禁 Python/FastAPI）
- 依赖已装：`better-sqlite3@13.0.3`、`drizzle-orm@0.45.3`；**未装**：drizzle-kit（禁止）、electron-rebuild（3-A 实证不需要）、electron-builder（需审批）
- 运行时现状：生产 IPC handler 经 TaskService 工厂装配 SQLite Repository；3-F 两种真实重启路径均已验证数据恢复
- Schema：Task `contextId?: string | null` ↔ Drizzle `context_id` ↔ 3-B migration 已有 nullable TEXT 列；未新增 migration 或 FK
- migration：轻量 `MigrationRunner` 已建，tracking 为 `schema_migrations`；dev/packaged 均使用隔离临时 userData 验证
- 验证全绿：lint/typecheck、smoke:core、smoke:test、Vite build、migration smoke、Repository CRUD/mapping/filter/count/delete/error tests。Vite build 有 >500 KB chunk 提示
- Electron 44.4.5 二进制已补齐（npm postinstall 曾未下载 dist/，手动下载 + SHA256 校验）
- git：3-C 实现 commit `05057dc`；历史换行符 churn 仍在；`.pi/` 未跟踪且未纳入阶段提交；`.env*` 已被 .gitignore 忽略
- 一键启动：`start-app.cmd`（双击：构建→vite@3123→Electron；关窗自动清理）

## 3. 已冻结裁决（C1~C5）—— 不得推翻，变更须走 AGENTS.md 规则 9

| 项 | 冻结结论 |
|---|---|
| C1 删除规则 | 任意 `Task.status`（PENDING/IN_PROGRESS/COMPLETED/CANCELLED）均可删除；必须确认；物理 DELETE；无 `deleted_at`、无 `DELETED` 状态 |
| C2 TaskSource | `MANUAL / AI / FLOATING_BALL / SYSTEM / IMPORTED`（5 值，Domain enum 不动） |
| C3 TaskPriority | `LOW / MEDIUM / HIGH / URGENT`（保留 URGENT） |
| C4 category/tags | 正式纳入 Schema（`category` TEXT 可空；`tags_json` TEXT 可空 JSON 数组） |
| C5 context_id | 正式加入，可空、暂无外键；**随 PHASE 3-B 的 `001_init.sql` 一次性落地**，Domain 侧 `contextId?: string \| null` |

字段级事实标准：`.pi/skills/backend-task-pipeline/references/task-schema.md`「已冻结基线」表

## 4. 遗留修复项登记（已写入 ipc-contract.md，当前不修）

- **C6 · 事件广播契约不一致** → PHASE 3-E/3-G 修复：`handlers.ts:89` 在 `event:subscribe` 频道发裸 event；契约权威 = `contracts.ts` 的 `EventBroadcastPayload`（`event:broadcast` 频道 + `{ event }` 包装，与 `preload/index.ts:45` 一致）。Renderer 真实模式下收不到事件
- **C7 · ToolDefinition 字段缺口** → Tool Registry 阶段（不进 PHASE 3）：缺 `outputSchema`/`permissions`，`inputSchema` 不应可选

## 5. PHASE 3 执行顺序（人工确认后按序推进）

1. **3-A SQLite Runtime**：✅ 已完成（`4f3fb8e`）。ABI 实证无需 electron-rebuild（Electron 44.4.5 = N-API 10 = better-sqlite3@13）；打包验证以 `resources/app` + exe 重命名仿真完成（electron-builder 仍未装、需审批）
2. **3-B Migration**：✅ 已完成并提交（`8b41171`）；临时 userData Dev/Packaged 实测 migration 创建、tracking、幂等和安全边界通过
3. **3-C Repository 加固**：✅ 已完成并提交（`05057dc`）；真实 Drizzle 类型、数据库 COUNT、物理删除结果、筛选语义对齐及 Repository 测试通过
4. **3-D DI 切换**：✅ 已完成并提交（`3dbbdfd`）；handlers.ts 已装配 SQLite Repository
5. **3-E IPC 复核**：✅ 已完成并提交（`8766223`）；真实 IPC → Zod → TaskService → SQLite 链路验证通过
6. **3-F 重启持久化**：Process A→B 与 Electron A→B HARD GATE 均通过；临时 userData/DB 路径一致，migration 重启后非破坏性跳过
7. **3-G 事件一致性**：未开始 / 未授权

各 PHASE 的详细步骤/验收标准：`.pi/skills/backend-task-pipeline/SKILL.md` + `references/acceptance-checklist.md`

## 6. 高风险提醒（A0 风险清单摘录）

- **ABI**：✅ 已实证——Electron 44.4.5（Node 24.21.0 / N-API 10）与 better-sqlite3@13（N-API 10）匹配，dev + packaged 双模式真实加载成功，无需 electron-rebuild
- **打包链路**：✅ 已修复——esbuild 构建（main ESM + preload CJS，`scripts/build-electron.mjs`），`package.json` `main` 字段 + `electron:dev` 走产物；loadFile 路径已修（`../../dist/index.html`）；electron-builder 安装包链路未验证（未安装，需审批）
- **死代码**：`src/electron/preload/preload.ts` 全仓库无引用（建议后续删除）
- **层级反向依赖**：`taskService.ts:28-32` 引用 `src/electron/ipc/errorContract`（Core→Electron），后续待决策是否移至共享层
- **Renderer 未接 IPC**：`App.tsx` 任务增删改全是本地 state（:53/:99/:105/:540），属前端负责方后续收敛，本侧不动
- **架构红线不变**：TaskService 唯一业务入口 / Repository 纯持久化 / Renderer 不碰 Node 与 SQLite / 两套状态机分离 / 先落库再发事件

## 7. 文档索引

- 根规则：`work/AGENTS.md`
- 技能入口：`.pi/skills/backend-task-pipeline/SKILL.md`
- 基线/契约：`references/` 下 architecture-baseline.md、task-schema.md、ipc-contract.md、acceptance-checklist.md（均已含 2026-09-27 裁决记录）

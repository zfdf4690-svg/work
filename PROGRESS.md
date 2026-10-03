# 项目进度 · PHASE 3 交接文档

> 最后更新：2026-09-27（PHASE 3-A0 + 架构裁决同步完成，会话存档前落盘）
> 新会话接手时：**先读本文件，再读 `AGENTS.md` 和 `.pi/skills/backend-task-pipeline/SKILL.md`**

---

## 1. 当前阶段

**已完成**：PHASE 3-A0（Architecture Reconciliation 只读审计）+ 架构裁决同步
**当前状态**：⏸ 等待人工确认后进入 **PHASE 3-A（SQLite Runtime）**
**下一阶段**：PHASE 3-A —— Database Manager（better-sqlite3 打开/关闭/路径解析）+ ABI/打包验证

## 2. 环境与仓库关键事实

- 工作区：`E:\系统默认\桌面\个人办公助手1`（WSL 中为 `/mnt/e/...`）；项目根 = `work/`
- Electron + React + TypeScript + SQLite + Drizzle ORM + Zod（冻结栈，禁 Python/FastAPI）
- 依赖已装：`better-sqlite3@13.0.3`、`drizzle-orm@0.45.3`；**未装**：drizzle-kit（禁止）、electron-rebuild、electron-builder
- 运行时现状：IPC handler 注入 `InMemoryTaskRepository`（`src/electron/ipc/handlers.ts:77`），SQLite 不在链路上，重启丢数据
- 无 migration 体系（无 migrations/ 目录、无 .sql）；Database Manager 只有接口无实现
- `tsc --noEmit` 通过；两个 smoke 脚本全绿（但均未覆盖真实 Electron 进程与真实 SQLite）
- git：HEAD=`bcf1040`，大量未提交变更（多为换行符 churn）；`.pi/` 未追踪（是否入库待决策）；`.env*` 已被 .gitignore 忽略

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

1. **3-A SQLite Runtime**：新增 `src/core/db/databaseManager.ts`（实现 `IDatabaseConnection`，路径取 `app.getPath('userData')`）；改 `src/electron/main/index.ts`（`registerIpcHandlers()` 前初始化 DB，退出时 close）；验证 better-sqlite3 在 Electron 44.4.5 下的 ABI（可能需 electron-rebuild——**装依赖前须人工审批**）；打包验证需 electron-builder（同需审批）
2. **3-B Migration**：新建 `migrations/001_init.sql` + 迁移执行器（轻量自定义，**禁止引入 drizzle-kit**）；001 须一次性含 C4/C5 全部字段与 status/due_at 索引
3. **3-C Repository 加固**：`drizzleTaskRepository.ts` 去 `any`（`IDrizzleDb` → 真实 Drizzle 类型）、真 `COUNT(*)`、修 `delete()` 恒返回 true、统一两实现 search 语义
4. **3-D DI 切换**：handlers.ts 注入 SQLite Repository（先删种子，切换后补持久化种子）
5. **3-E IPC 复核**：含 C6 事件广播修复
6. **3-F/3-G**：重启持久化验证 + 事件时序/广播端到端验证

各 PHASE 的详细步骤/验收标准：`.pi/skills/backend-task-pipeline/SKILL.md` + `references/acceptance-checklist.md`

## 6. 高风险提醒（A0 风险清单摘录）

- **ABI**：node_modules 内为 win32-x64 Node 预编译，Electron 加载未验证；无 `build/Release`
- **打包链路整体未验证**：`electron:dev` 直接以 `.ts` 为入口，无构建步骤；preload 指向的 `../preload/index.js` 不存在
- **死代码**：`src/electron/preload/preload.ts` 全仓库无引用（建议后续删除）
- **层级反向依赖**：`taskService.ts:28-32` 引用 `src/electron/ipc/errorContract`（Core→Electron），后续待决策是否移至共享层
- **Renderer 未接 IPC**：`App.tsx` 任务增删改全是本地 state（:53/:99/:105/:540），属前端负责方后续收敛，本侧不动
- **架构红线不变**：TaskService 唯一业务入口 / Repository 纯持久化 / Renderer 不碰 Node 与 SQLite / 两套状态机分离 / 先落库再发事件

## 7. 文档索引

- 根规则：`work/AGENTS.md`
- 技能入口：`.pi/skills/backend-task-pipeline/SKILL.md`
- 基线/契约：`references/` 下 architecture-baseline.md、task-schema.md、ipc-contract.md、acceptance-checklist.md（均已含 2026-09-27 裁决记录）

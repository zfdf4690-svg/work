---
name: backend-task-pipeline
description: 实现 AI Work Assistant 后端 Task 闭环（SQLite/Drizzle/Migration/Repository/TaskService/Event Bus/IPC），涉及数据库落地、迁移、Task CRUD、Agent Tool 接入、InMemory 到 SQLite 切换时使用。
---

# Backend Task Pipeline

本 Skill 覆盖 AI Work Assistant 后端从当前状态（App Core / TaskService /
EventBus 已就位，但仍运行在 `InMemoryTaskRepository` 之上，尚无 SQLite
持久化）推进到 SQLite 落地的完整实施路径。

进入本 Skill 前先读 `references/architecture-baseline.md` 和
`references/ipc-contract.md`；涉及表结构改动时读 `references/task-schema.md`；
每个 PHASE 结束前对照 `references/acceptance-checklist.md` 对应小节自查。

**一次只推进一个 PHASE，完成并自查通过后再进入下一个。**

## PHASE 3-A0 · Architecture Reconciliation（只读审计，禁止 edit/write）

目的：在动手写代码前，弄清楚"文档说的架构"和"仓库里实际存在的代码"
之间的差距。**本阶段只允许 read / grep / find / ls 类操作，不允许修改任何
文件。同时禁止任何形式的自动修复、格式化、依赖安装（如 `npm install`）、
`package.json` 修改、migration 生成或代码生成。A0 唯一目标是建立"当前
仓库实际状态"的事实基线，不做任何"顺手改一下"的动作，哪怕发现明显
缺失（例如某依赖未安装）也只记录进报告，不动手安装。**

产出一份 Reconciliation Report，至少回答：

1. 当前数据库相关文件有哪些（是否已存在 SQLite / Drizzle 依赖、schema
   定义）？
2. 当前 Domain `Task` 类型定义（字段、可选性）实际是什么，与
   `references/task-schema.md` 记录的 V1.2 基线是否一致？
3. 当前 SQLite / 内存 Schema（如有）实际字段命名（snake_case /
   camelCase 映射）是否与 Domain 对齐？
4. 当前 Repository 实现（如 `drizzleTaskRepository.ts`）是完整实现还是
   占位 / 骨架（留意 `any` 类型参数、假的 `count()` 实现等）？
5. 当前 IPC handler 实际注入的是哪个 Repository 实现（InMemory 还是
   SQLite）？
6. 当前 Electron 启动链路（main 进程入口、Repository 注入点）在哪些
   文件？
7. 哪些地方与 `references/architecture-baseline.md` 冲突？逐条列出。
8. 哪些地方与 AGENTS.md 的 Architecture Rules 冲突？逐条列出。
9. 当前代码中 `delete_task` 的实现是否已经符合已冻结的删除规则（任意
   状态均可删除、物理 DELETE、不使用 `deleted_at`）？如果代码里已经
   隐含了不同的实现（例如某些状态被挡住不让删），列出来。
10. 若要推进 PHASE 3-A，需要新增 / 修改哪些具体文件？给出清单，不动手改。
11. 风险与建议的下一步顺序。
12. 当前仓库是否已经存在任何形式的 migration 体系（drizzle-kit 生成的
    迁移目录、手写 SQL 迁移文件、或其他形式）？如果存在，具体是哪一种、
    位于哪个目录、已执行到什么版本？（见下方 Migration Authority）

**未获得人工确认前，不得进入 PHASE 3-A 动手实现。**

## PHASE 3-A · SQLite Runtime

- 引入 `better-sqlite3` + Drizzle，建立 Database Manager。
- 数据库文件位于 Electron `app.getPath('userData')`。
- SQLite 只能由 Main / App Core 使用；Renderer 不得直接加载
  `better-sqlite3`。
- **验证 `better-sqlite3` 与当前 Electron 版本的 native module ABI
  兼容性**——Node.js 环境下能 `require` 成功，不等于 Electron 打包后能
  正常加载，两者的 Node ABI 版本可能不一致，需要 rebuild（如
  `electron-rebuild`）或使用匹配预编译二进制。
- 验证开发环境（`electron .` / dev 模式）下 Electron 运行时可以正常
  加载数据库。
- **验证生产构建 / 打包后的 Electron App（`electron-builder` 产物）
  同样可以正常加载数据库**——这是最容易被跳过、也最容易在用户机器上
  才暴露的一步。
- 本阶段范围到此为止：**不实现 Task Repository 业务逻辑，不修改
  TaskService 业务规则**——这些留给 PHASE 3-C / 3-D。

## Migration Authority

《架构与技术选型 V1.2》已经选定的迁移机制是：**轻量自定义迁移**
（`migrations/001_xxx.sql` 顺序执行 + 版本号记录），不是 drizzle-kit
自动生成的迁移体系。这不是一个需要重新选型的开放问题，而是一个已冻结的
既定选择——这里要防的是 Pi 在实现时"顺手"额外引入 drizzle-kit generate，
导致两套独立的 migration history 同时存在。

- Migration 文件是数据库结构演进的**唯一事实来源**，Drizzle Schema
  只是 ORM 层的结构定义，不作为迁移权威。
- **不允许同时维护两套独立 migration history。**
- PHASE 3-A0 必须先检查仓库当前是否已经存在任何 migration 体系
  （见 A0 报告第 12 项）。
- 若 A0 发现已存在某种迁移体系（无论是否与 V1.2 描述的形式一致），
  PHASE 3-B **必须复用现有体系**，不得重新创建第二套；如认为现有体系
  不合适，按 AGENTS.md 规则 9（Frozen Contract 变更控制）流程提出，
  获批准后再改，不能直接另起一套了事。

## PHASE 3-B · Migration

- 先看 A0 报告第 12 项结论：若已存在迁移体系，复用它，不新建第二套
  （见上方 Migration Authority）；若确认不存在，才按下面的方式新建。
- 建立轻量迁移机制：`migrations/001_xxx.sql` 顺序执行 + 版本号记录。
- 启动流程：打开 SQLite → 检查迁移版本 → 执行待处理迁移 → 应用就绪。
- 现有历史迁移文件不得修改；新增字段 / 表通过新迁移文件完成。

## PHASE 3-C · SQLite Repository

- 实现 `SQLiteTaskRepository`，满足 `TaskRepository` 接口
  （create / get / list / update / complete / delete）。
- Repository 内部可使用 Drizzle，但不得向上（Service 层）暴露 Drizzle
  类型。
- 替换 PHASE 3-A0 发现的占位实现（如 `any` 类型参数、假 `count()`），
  计数类查询应执行真实 `COUNT(*)`，而不是 `findMany().length`。

## PHASE 3-D · TaskService + SQLite 接入（依赖注入）

- 将 IPC handler / 启动入口里的
  `defaultRepository = new InMemoryTaskRepository(...)` 替换为
  `SQLiteTaskRepository`。
- `TaskService` 的方法签名与业务规则（create / update / complete 无需
  确认，delete 需 `confirmed=true`）保持不变，只切换底层 Repository
  实现。

## PHASE 3-E · IPC Integration

- 确认 `task:create` / `task:update` / `task:complete` / `task:delete` /
  `task:get` / `task:list` 均正确路由到 TaskService，而非直连
  Repository。
- IPC 入参使用 Zod 校验，不信任 Renderer 传入的原始数据。

## PHASE 3-F · Persistence / Restart Test

- 验证：创建 Task → 重启应用 → 数据仍存在（证明确实落到 SQLite，而非
  内存）。
- 验证：`delete_task` 物理删除后，重启应用查询确认数据不存在。

## PHASE 3-G · Event Consistency

- 确认事件发布顺序：数据库写入成功 → 发布
  `TaskCreated` / `TaskUpdated` / `TaskCompleted` → IPC 广播 →
  Dashboard / Floating Ball / AI Assistant 同步更新。
- 不允许先发事件再写库。

## PHASE 3 Acceptance

对照 `references/acceptance-checklist.md` 全部条目逐一确认后，才视为
PHASE 3 完成，可以进入 PHASE 4（Renderer Bridge / Conversation 等后续
阶段）。

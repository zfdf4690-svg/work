# Acceptance Checklist

## 架构验收标准（《架构与技术选型 V1.2》第八章，10 条）

- [ ] Electron Renderer 无法直接访问 Node.js 原生能力，所有业务操作
      必须经过 Typed IPC。
- [ ] 新安装应用能够正确初始化 SQLite，并通过 Migration 机制创建当前
      版本的完整 Schema。
- [ ] 已有数据库升级到新版本时，Migration 能安全执行且不丢失已有
      Task 数据。
- [ ] 用户通过自然语言创建 Task 后，Task 立即落库，并以已创建完成的
      卡片形式展示。
- [ ] AI 微调和用户手动编辑，最终都调用同一个 `TaskService.update()`。
- [ ] 删除 Task 必须先经过用户确认，确认后执行物理删除（DELETE），
      不可恢复。
- [ ] Task 状态发生变化后，Dashboard 与 Floating Ball 均能通过
      Event Bus → IPC 收到同步更新，无需手动刷新。
- [ ] Agent Runtime 能完整跑通一次"用户输入 → Context 组装 → LLM →
      Tool 调用 → Tool 结果 → 最终回复"的闭环。
- [ ] Agent 在执行需要确认的 Tool（如 `delete_task`）时，能正确进入
      `WAITING_CONFIRMATION` 状态，并支持 `confirm` / `cancel`。
- [ ] Internal Tool 的调用路径不经过 MCP；MCP Tool 不直接访问内部
      App Service——两条路径在代码里可以清楚区分，不是靠约定口头保证。

## PHASE 3-A 专项验收（Native Module / Migration Authority）

- [ ] `better-sqlite3` 在开发环境（`electron .` / dev 模式）下能正常
      加载数据库。
- [ ] `better-sqlite3` 在**生产构建 / 打包后的 Electron App**（
      `electron-builder` 产物）中同样能正常加载数据库，而不仅是在
      裸 Node.js 环境下 `require` 成功。
- [ ] 数据库文件路径使用 Electron `app.getPath('userData')`，而不是
      写死的开发期路径。
- [ ] PHASE 3-A0 是否已确认仓库当前是否存在 migration 体系；PHASE 3-B
      是否复用了已存在的体系，而不是重新创建了第二套（drizzle-kit
      生成的迁移与手写 SQL 迁移不应同时存在）。

## 每次实现后自检（状态机与确认流程，易错点重点核查）

- [ ] Task 本身是否被误写入 `WAITING_CONFIRMATION`（`Task.status` 只
      允许 PENDING/IN_PROGRESS/COMPLETED/CANCELLED 四种，任何时候都
      不应出现 Agent Execution State 的值）？
- [ ] `delete_task` 若经由 Agent 触发，是否正确让 `AgentRun`（而非
      `Task`）进入 `WAITING_CONFIRMATION`，并通过
      `resumeConfirmation()` 恢复原 Tool Execution，而不是新建一次
      `run()`？
- [ ] 人工 UI 删除路径是否正确跳过 Agent Execution State，仅由
      `TaskService` 校验 `confirmed=true` 后直接执行 DELETE？
- [ ] Internal Tool 是否直接调用了 Service，而不是绕经 MCP 序列化？
- [ ] MCP Tool 是否通过 MCP Client → MCP Server 访问外部系统，而不是
      直接触达 App Core Service / Repository？
- [ ] `TaskCreated` / `TaskUpdated` / `TaskCompleted` 事件是否在数据
      变更成功之后才发布（而不是先发事件再写库）？
- [ ] 是否擅自修改了 Domain Contract / IPC Contract，而未走 AGENTS.md
      规则 9 的变更控制流程？
- [ ] Schema 改动是否通过新增 `migrations/` 文件完成，而不是直接改
      历史迁移或手工改库？

## 删除测试（尤其重要）

创建 Task A → 删除 Task A → 查询 SQLite。结果必须是**不存在**，而不是
`status = DELETED` 或存在 `deleted_at` 字段。

删除规则已冻结（见 AGENTS.md 规则 6）：任意 `Task.status`（含 COMPLETED /
CANCELLED）均允许在确认后物理删除，测试用例应覆盖全部四种状态，而不是
假设 COMPLETED / CANCELLED 不可删除。

# Architecture Baseline（浓缩自《AI Work Assistant 架构与技术选型 V1.2》）

## 架构原则

Local-first + Modular Monolith（模块化单体）+ Domain-oriented（领域驱动
分层）+ Pluggable AI Runtime（AI 运行时可插拔）。

## 分层与调用方向

```
Electron Desktop（Dashboard / AI Assistant / Floating Ball）— Renderer
        │  Preload / contextBridge（Typed IPC）
        ▼
App Core（Task / Conversation / Context / File / Note / Knowledge / Skill ...）
        │  Application Service
   ┌────┴────┐
   ▼         ▼
Repository  AI Runtime
   │         │
   ▼         ▼
SQLite   Tool Registry
             │
      ┌──────┴──────┐
      ▼             ▼
Internal Tool     MCP Tool
      │             │
      ▼             ▼
 App Service    MCP Client
                    │
                    ▼
                MCP Server
                    │
                    ▼
             External System
        （WeKnora / 飞书 / 企业微信 / 其他）
```

**Event 广播路径（与上面的调用路径相互独立）：**
`Service（数据变更成功后） → Event Bus → IPC Adapter → Renderer`
（Dashboard / Floating Ball / AI Assistant 同步更新）

> 重要修正：MCP Tool 的调用路径是
> `MCP Tool → MCP Client → MCP Server → External System`，
> **不是** `MCP Tool → App Service`。MCP Tool 不能直接触达内部业务层。

## 关键架构决策（已冻结）

- **决策 A：Repository 抽象**——`TaskService → TaskRepository（接口）
  → SQLiteTaskRepository（实现）`，隔离底层存储技术。Repository 抽象
  解决"基础设施迁移成本"，不解决"业务模型因多用户等场景产生的结构性
  变化"（如新增租户字段）。
- **决策 B：Internal Tool 与 MCP Tool 分离**——两者都只能向下调用各自的
  目标（Internal Tool → Service；MCP Tool → MCP Client → MCP Server），
  不允许同级互调。MCP 不作为内部业务调用的必经路径，内部高频操作
  （如创建任务）直接调用 Service，不经过协议序列化。
- **决策 C：Agent Runtime 可插拔**——`IAgentRuntime`：
  `run() / stream() / interrupt() / confirm() / cancel()`。V1 使用自研
  `LocalAgentRuntime`。更换实现时需重点验证
  interrupt / confirm / cancel / streaming / 工具执行生命周期这五处的
  实际行为，接口签名一致不代表行为一致。
  - `run()` 内部完整链路：User Input → Context Assembly（组装当前
    Task / File / Knowledge / 历史消息）→ LLM / Model Provider →
    Tool Selection → Tool Registry → Tool Execution（Internal Tool 或
    MCP Tool）→ Tool Result → Next Step 或 Final Response。
  - Agent Execution State：
    `IDLE → RUNNING → WAITING_CONFIRMATION → RUNNING → COMPLETED`，
    或 `→ INTERRUPTED / CANCELLED / FAILED`。**与 Task Status 是两套
    完全独立的状态机，不得合并存储或互相替代。**
- **决策 D：Knowledge Provider 模式**——`KnowledgeService` 下
  `LocalKnowledgeProvider`（V1，FTS + 简单 Embedding）/
  `WeKnoraProvider`（V2 可选）。业务层不直接依赖具体知识库引擎。
- **决策 E：本地事件总线（Event Bus）**——轻量应用级 EventEmitter（同
  进程，非 Kafka/RabbitMQ），V1 仅需 `TaskCreated` / `TaskUpdated` /
  `TaskCompleted`。业务数据变更成功后再发布事件；不引入 Outbox / 事件
  持久化 / 重试机制（留待跨进程场景再评估）。Event Bus 与 IPC 是两个
  独立职责：Event Bus 回答"App Core 内部发生了什么"，IPC 回答
  "Main Process 如何把变化传给 Renderer"。

## Electron 安全边界

```
Renderer（React UI）
   │ ❌ 不直接访问 Node API / fs / shell
   │ 仅限 Preload 暴露的最小化 API
   ▼
Preload（contextBridge / Typed IPC API）
   ▼
Main / App Core（TaskService / ... / Agent Runtime）
```

`contextIsolation: true` / Preload 只通过 contextBridge 暴露有限的、带
类型的 API，不整体暴露 `ipcRenderer` / IPC 入参使用 Zod（或等价方案）做
运行时校验，不信任 Renderer 传来的原始数据。

## Tool 权限契约现状

- `ToolInvocationSource` 表示调用来源（`assistant` / `floating_ball` /
  `dashboard` / `system`）；`ToolSource` 表示 Tool 元数据中的来源
  （`internal` / `mcp`），两者不是同一类型。
- 当前已有纯 TypeScript 的 Tool 权限元数据、注册校验与
  `evaluateToolCall` 判定函数。
- Task 工具元数据通过显式注册提供：`get_task`、`list_tasks`、
  `create_task`、`update_task`、`complete_task`、`delete_task`。
- `list_tasks` 的状态筛选键为 `all`、`pending`、`in_progress`、
  `completed`；`all` 排除 `CANCELLED`，默认 limit 为 50、最大为 100。
  `get_task` 的元数据约定允许获取 `CANCELLED` 任务。这些约定尚未实现
  查询操作。
- 当前没有可执行的 Agent Tool，仅有权限元数据与判定函数。

### Tool 权限 sidecar 契约

权限判定使用独立的 `ToolMetadata` sidecar，以工具名关联现有工具定义；它不替换、不扩展既有 `ToolDefinition`。契约类型取值为：

- `RiskClass`：`read` / `egress` / `external` / `write_local` / `exec`。
- `Mode`：`discuss` / `interactive`。
- `ConfirmPolicy`：`none` / `always`。
- `Decision`：`allowed`、`needsUser`、`humanOnly`、`reason`、可选 `rule`，以及 `provenance`（`auto` / `pending` / `denied-by-policy`）。

`evaluateToolCall` 按以下顺序判定，命中即返回（实现见 `src/domain/tool/evaluate.ts`）：

1. 工具未注册或元数据名称不匹配：discuss 拒绝；interactive 请求用户确认，并标记为 humanOnly，不能由自动审核器代答。
2. 声明禁用能力：按策略拒绝。
3. discuss 模式遇到有副作用的调用：以只读策略拒绝。
4. 持久授权工具：要求真人确认。
5. 无副作用的只读工具：低风险自动放行。
6. 风险为 egress 或 exec：本阶段未实现，转为请求用户确认。
7. 风险为 external：请求用户确认，不提供免确认路径。
8. 声明始终确认或 human-only：请求用户确认，并保留真人确认标记。
9. 配置批量阈值的工具遇到非法 affectedCount：请求用户确认。
10. affectedCount 超过批量阈值：请求用户确认。
11. write_local 且 confirm 为 none：事后审阅后放行。
12. 兜底：未命中以上规则的情况一律转人工确认。

MCP 来源工具的有效风险一律按 `external` 处理，不采信其自报的 `riskClass`。
禁用能力共六项：`settings.write`、`secrets.read`、`secrets.write`、
`authz.write`、`authz.read`、`db.raw`；其中 `authz.write` / `authz.read`
对应授权记录只能由界面确认通道读写。`affectedCount` 缺省按 1；批量工具的
Runtime 必须传入真实条数，不能依赖缺省值。

## 技术选型一览

| 模块 | 选型 |
|---|---|
| 桌面客户端 | Electron + React + TypeScript |
| App Core | Node.js（TypeScript，同 Electron 主进程内运行） |
| 数据库 | SQLite |
| ORM | Drizzle ORM + SQLite（Repository 内部用，不向 Service 暴露 ORM 类型） |
| Migration | 轻量迁移机制（`migrations/001_xxx.sql` 顺序执行 + 版本号） |
| 向量检索 | sqlite-vec（V1 非核心，优先 FTS） |
| Agent Runtime | 自研 `LocalAgentRuntime`（实现 `IAgentRuntime`） |
| 工具协议 | MCP（仅用于外部系统接入，内部工具不强制走 MCP） |
| 文件存储 | 本地文件系统 |
| 进程间通信 | Electron IPC |
| 参数校验 | Zod |
| 日志 | Pino 或 electron-log（二选一） |

## PHASE 3-A0 后架构裁决同步（2026-09-27，已冻结）

以 PHASE 3-A0 Reconciliation Report 为依据的人工裁决，与 V1.2 原文一并
构成当前架构基线：

- **删除规则（C1）**：任意 Task.status（PENDING / IN_PROGRESS / COMPLETED /
  CANCELLED）均允许删除；删除必须经用户确认；确认后执行物理 DELETE；
  无 `deleted_at` 字段，无 `DELETED` 状态。
- **TaskSource（C2）**：冻结为 `MANUAL / AI / FLOATING_BALL / SYSTEM /
  IMPORTED` 5 值（以 Domain 代码为事实标准，V1.2 原文的 `INTEGRATION`
  不再适用）。
- **TaskPriority（C3）**：冻结为 `LOW / MEDIUM / HIGH / URGENT` 4 值
  （保留 URGENT）。
- **category / tags（C4）**：正式纳入 Task Schema（`category` TEXT 可空；
  `tags_json` TEXT 可空，JSON 字符串数组）。
- **context_id（C5）**：正式加入，可空、暂无外键约束，随首个迁移
  `001_init.sql` 一次性落地（Domain `contextId` ↔ SQLite `context_id`）。

Task 字段级事实标准详见 `references/task-schema.md`「已冻结基线」表。

## 开发路线图（节选）

阶段 1 架构骨架 → 阶段 2 Task 完整闭环（架构验证样板）→ 阶段 3
Conversation → 阶段 4 Context（仅通过各领域 Service 公开方法访问，不
直接访问 Repository）→ 阶段 5 Agent Runtime 完整化 → 阶段 6 Knowledge
→ 阶段 7 File → 阶段 8 Skill → 阶段 9 MCP 外部集成 → 阶段 10 飞书 /
企业微信集成。云端化（多用户、鉴权、PostgreSQL 等）独立立项，不在当前
架构范围内。

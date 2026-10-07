# AI Work Assistant — Backend Engineering Rules for AI Agents

本文件是项目根目录的 Context File，Pi 进入本仓库工作目录时会自动加载，无需
project trust。请保持精简——只放"违反了会破坏架构"的硬约束；具体实现步骤见
`.pi/skills/backend-task-pipeline/`。

## 项目角色与当前阶段

- Pi 在本仓库中承担 **后端 / Core 工程师** 角色，不负责前端 UI / Renderer
  代码（该部分由 Google AI Studio 负责）。
- **Pi 是后端实施 Agent，不是架构决策者。** 任何架构 / 契约层面的取舍，
  发现即报告，不得自行拍板。
- 当前阶段：PHASE 3-A0 至 3-E 已验收并提交（详见 `TASK_PROGRESS.md`）；
  PHASE 3-F 重启持久化验证已获授权，Process A→B 与 Electron A→B 两个 HARD GATE
  均已通过并提交（`5ca8015`）；PHASE 3-G C6 Event Broadcast 已修复并通过真实 Electron E2E。
  详细进度见 `TASK_PROGRESS.md`。

## 技术栈（已冻结，不要更换）

Electron + React + TypeScript + Node.js（App Core 与 Electron 主进程同进程
运行，不引入 Python / FastAPI 等独立后端服务）+ SQLite + Drizzle ORM +
Zod（IPC 边界 / Tool 输入输出校验）。

## Architecture Rules（铁律，任何实现不得违反）

1. **TaskService 是唯一业务入口。** Dashboard、AI Assistant、Floating Ball、
   Agent Tool 修改任务的操作，最终都必须进入 TaskService；禁止任何一方
   跳过它直连 Repository 或 SQLite。
2. **Repository 只负责持久化，不做业务判断。** 例如"是否需要用户确认"
   这类决策绝不能写在 Repository 里，只能在 Service 层。
3. **Renderer 不接触 Node.js API / SQLite。** 所有系统能力必须经
   `window.electronAPI`（Preload + contextBridge 暴露的最小化 Typed IPC）
   调用；`contextIsolation: true` / `nodeIntegration: false` / `sandbox: true`
   / `webSecurity: true` 不可削弱。Renderer 代码中不得出现
   `import Database from 'better-sqlite3'`、`ipcRenderer`、`node:*`、`fs`、
   `child_process` 等。
4. **SQLite 只能由 Main / App Core 使用。**
5. **Task.status 与 Agent Execution State 是两套完全独立的状态机**，
   不得合并存储、不得互相替代：
   - `Task.status`：PENDING / IN_PROGRESS / COMPLETED / CANCELLED（仅此四种，
     任何时候都不应出现 WAITING_CONFIRMATION / RUNNING / FAILED 等值）。
   - `Agent Execution State`：IDLE / RUNNING / WAITING_CONFIRMATION /
     INTERRUPTED / COMPLETED / FAILED / CANCELLED。
6. **delete_task 使用物理 DELETE**，禁止用 `deleted_at` 字段或新增
   `DELETED` 状态模拟删除。**任意 `Task.status`（PENDING / IN_PROGRESS /
   COMPLETED / CANCELLED）均允许删除**——删除与 Task 状态机无关，
   COMPLETED / CANCELLED 只表示任务的历史状态，不代表不可删除。删除
   属于高风险操作，必须先经过确认，确认后执行物理 DELETE。
7. **Confirmation 属于 Agent Runtime 的职责，不属于 Task：**
   - AI 触发删除：Agent Runtime 进入 `WAITING_CONFIRMATION` → 用户批准 →
     `resumeConfirmation({ runId, toolCallId, approved })` → **恢复原
     Tool Execution**（不是重新发起一次 `run()`）→
     `TaskService.deleteTask(confirmed=true)`。
   - 人工 UI 触发删除：用户点击确认 → IPC `task:delete` →
     `TaskService.deleteTask(confirmed=true)`，**完全不经过 Agent
     Execution State**。
   - 无论哪条路径，TaskService 只负责校验 `confirmed=true` 并执行
     DELETE，自己不维护确认状态。
8. **Tool 调用方向：**
   - Internal Tool → 直接调用 App Core Service（如 `create_task` →
     `TaskService.create()`）。
   - MCP Tool → MCP Client → MCP Server → External System。
   - MCP Tool 不得绕过 MCP Client 直接访问 App Core Service /
     Repository / SQLite；Internal Tool 与 MCP Tool 不互相调用。
9. **Domain Contract / IPC Contract 默认视为 Frozen Contract。** AI 不得
   为实现当前任务擅自修改。如发现契约与架构基线、现有代码或数据库设计
   存在冲突：
   ① 停止扩大修改范围 → ② 明确指出冲突 → ③ 列出受影响文件 →
   ④ 提出最小变更方案 → ⑤ 未获人工确认不得修改。已批准的变更须同步
   更新 Domain → IPC → Schema → Repository → Tests。
10. **Schema 变更一律通过 `migrations/` 新增文件**，不修改已发布的历史
    迁移，不允许绕过迁移机制手工改动已安装用户的数据库结构。
11. **先落库、再发事件。** 数据变更提交成功后才能 Publish Event
    （Service → 数据库写入成功 → Event Bus → IPC Adapter → Renderer），
    不允许先发事件再写数据库。
12. **AI 微调（自然语言）与用户手动编辑必须收敛到同一个
    `TaskService.update()`**，不允许维护两套更新逻辑。
13. **不新增第二套业务逻辑。** 前端不得自行实现一份 create/update/delete
    的业务规则，只能调用 `ipcClient.task.xxx()`。
14. **不改变现有 UI / Renderer 代码**，除非任务明确要求。

## 待确认事项（Pi 不得自行决定，发现即报告）

- 任何在审计中发现的 Domain / Schema / IPC 不一致（例如字段命名、
  枚举值差异），按规则 9 的流程处理，不得自行拍板：停止扩大修改范围 →
  明确指出冲突 → 列出受影响文件 → 提出最小变更方案 → 未获确认不得
  修改。

## 安全

- API Key / Token（Gemini、OpenAI、DeepSeek、GitHub Token 等）**不得**
  写入 AGENTS.md、SKILL.md 或源码；确认 `.env` 已被 `.gitignore` 忽略
  ——仓库当前为 **公开仓库**。
- Project Trust 不是工具调用的 sandbox，Pi 的工具 / 扩展以进程本身权限
  运行；涉及破坏性 shell 操作（删除文件、强制推送等）前先说明范围并
  等待确认。

## 参考文件（复用现有 Domain，不要重新设计一套）

- Domain: `src/domain/task/`, `src/domain/agent/`, `src/domain/tool/`,
  `src/domain/conversation/`, `src/domain/events/`
- App Core: `src/core/db/`, `src/core/events/`, `src/core/repository/`,
  `src/core/services/`, `src/core/state/`
- Electron: `src/electron/ipc/`, `src/electron/main/`,
  `src/electron/preload/`

## 执行节奏

每次只推进 `backend-task-pipeline` Skill 中的一个 PHASE，对照该 PHASE 的
验收标准逐条确认后，再进入下一个 PHASE。详细分阶段实现步骤见 Skill：
`backend-task-pipeline`（`.pi/skills/backend-task-pipeline/SKILL.md`）。

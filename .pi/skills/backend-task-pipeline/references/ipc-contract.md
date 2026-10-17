# IPC & Tool Contract Reference

## 已定义的 Electron IPC Channels

- `task:create`
- `task:update`
- `task:complete`
- `task:delete`
- `task:get`
- `task:list`
- `agent:resume-confirmation`
- `agent:interrupt`
- `event:subscribe`
- `event:unsubscribe`
- `event:broadcast`

统一响应与错误类型：`IpcResult<T>` / `IpcError`
（参考：`src/electron/ipc/channels.ts`, `contracts.ts`, `errorContract.ts`）

这些 Channel 属于 Frozen Contract（见 AGENTS.md 规则 9），不得随意新增
/ 重命名 / 改变入参出参结构；确需变更须走契约变更控制流程。

## Task 数据流（正式架构）

```
Renderer
    ↓
window.electronAPI
    ↓
Preload
    ↓
IPC
    ↓
Main
    ↓
TaskService
    ↓
Repository
    ↓
SQLite
```

手动编辑走 IPC 直连 TaskService，不经过 Agent Runtime；AI 微调走
Agent Runtime → Tool → TaskService。两条路径最终都收敛到
`TaskService.update()` / `TaskService.deleteTask()` 等同一批方法。

## Tool 定义与确认规则

当前没有可执行的 Agent Tool，仅有权限元数据与判定函数。Task 元数据通过
显式注册提供，不会因导入模块而自动注册：

| 工具 | 风险类别 | 确认策略 | 其他元数据 |
|---|---|---|---|
| get_task | read | none | `task.read` |
| list_tasks | read | none | `task.read`；状态键为 `all` / `pending` / `in_progress` / `completed` |
| create_task | write_local | none | `task.write`；受影响条目数大于 1 时升级确认 |
| update_task | write_local | none | `task.write`；受影响条目数大于 1 时升级确认 |
| complete_task | write_local | none | `task.write`；受影响条目数大于 1 时升级确认 |
| delete_task | write_local | always | `task.delete`；仅真人确认 |

`get_task` 仅按 ID 查询，可读取任意状态的任务，包括 `CANCELLED`。
`list_tasks` 的状态筛选键为 `all` / `pending` / `in_progress` / `completed`；
`all` 排除 `CANCELLED`，与仪表盘「全部」口径一致；默认 limit 为 50，上限为
100。这是契约，尚未有可执行的 Agent Tool 实现。现有 `TaskService.listTasks`
的通用查询不等同于该口径，实现 Agent Tool 时必须单独保证 `all` 排除
`CANCELLED`。

类型命名上，`ToolInvocationSource` 表示调用来源
（`assistant` / `floating_ball` / `dashboard` / `system`）；`ToolSource`
表示 Tool 元数据的来源（`internal` / `mcp`）。

## Confirmation 恢复流程（Agent 触发）

```
User Approve
      ↓
resumeConfirmation({
    runId,
    toolCallId,
    approved: true
})
      ↓
恢复原 Tool Execution（不是重新启动 Agent）
      ↓
TaskService.deleteTask(confirmed=true)
```

人工 UI 触发删除时跳过上述整条链路，直接
`UI 确认 → IPC task:delete → TaskService.deleteTask(confirmed=true)`。

## Domain Contract 参考文件

- `Task` / `CreateTaskInput` / `UpdateTaskInput` / `TaskChanges` /
  `TaskFilter`（`src/domain/task/task.types.ts`,
  `task.enums.ts`）
- `AgentRun` / `AgentRunStatus` / `AgentRiskLevel` /
  `ResumeConfirmationInput` / `AgentExecutionState`
  （`src/domain/agent/agent.types.ts`, `agent.enums.ts`）
- `ToolCall` / `ToolCallStatus` / `ToolRiskLevel` /
  `ToolExecutionContext` / `ToolDefinition`
  （`src/domain/tool/tool.types.ts`）

## 已知偏差与后续修复项（2026-09-27 PHASE 3-A0 登记，当前不修）

- **C6 · Event Broadcast 契约不一致（PHASE 3-E/3-G 工程修复项）**：
  本契约以 `event:broadcast` 频道 + `EventBroadcastPayload { event }` 包装
  为准（见 `contracts.ts`、`preload/index.ts` 的监听实现）。但当前
  `src/electron/ipc/handlers.ts:89` 实际在 `event:subscribe` 频道上发送
  裸 `DomainEvent`（频道名与载荷结构双重不匹配），Renderer 在真实
  Electron 模式下收不到任何事件。另：`event:subscribe` /
  `event:unsubscribe` 两个 channel 已定义但无对应 `ipcMain.handle`
  注册，语义待定。修复归属 PHASE 3-E/3-G，修复时以本契约为权威。

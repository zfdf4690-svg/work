# Task Schema Reference

## 已冻结基线（V1.2 文档基线 + 2026-09-27 PHASE 3-A0 后人工裁决修订）

> 本表为 Task Schema 的**事实标准**。V1.2 原文与代码的偏差已逐项裁决
> （见文末「裁决记录」），以此表为准。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT (UUID) | 主键 |
| title | TEXT | 任务标题，必填 |
| description | TEXT | 任务详细描述，可为空 |
| status | TEXT (ENUM) | PENDING / IN_PROGRESS / COMPLETED / CANCELLED |
| priority | TEXT (ENUM) | LOW / MEDIUM / HIGH / URGENT（裁决 C3：保留 URGENT），V1 仅存储字段，不做排序功能 |
| due_at | DATETIME | 截止时间 |
| completed_at | DATETIME | 实际完成时间，与 due_at 分离存储 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 最后修改时间 |
| source | TEXT (ENUM) | MANUAL / AI / FLOATING_BALL / SYSTEM / IMPORTED（裁决 C2：以 Domain 代码 5 值为事实标准） |
| category | TEXT（可空） | 任务分类（裁决 C4：正式纳入 Schema） |
| tags_json | TEXT（可空，JSON 字符串数组） | 任务标签；Repository 层负责与 Domain `tags: string[]` 互转（裁决 C4：正式纳入 Schema） |
| context_id | TEXT（可空，暂无外键约束） | 预留字段，指向未来 Context/Conversation 关联（裁决 C5：正式确认，随首个迁移 `001_init.sql` 一次性落地，避免后续追加迁移） |

评审要点：
- `status` 与 `completed_at` 的一致性需在 Service 层强制保证
  （`complete_task` 执行时必须同时写入 `completed_at`）。
- `status`、`due_at` 建议建立索引（Dashboard / Floating Ball 高频查询
  依赖这两个字段过滤）。
- `context_id` 当前无外键约束，实现时需在应用层做好空值处理。

# 偏差核实与裁决记录（2026-09-27 PHASE 3-A0 审计已完成逐项核实 + 人工裁决）

PHASE 3-A0 已确认以下 5 项偏差**全部属实**，并已获人工裁决，结论如下：

1. **`context_id` 缺失**：属实（Domain 与 tasksTable 均无）。**裁决 C5**：正式加入
   `contextId` / `context_id`，允许为空，Domain、Drizzle schema、首个迁移
   `001_init.sql` 一次性落地，避免后续追加迁移。
2. **`TaskSource` 枚举漂移**：属实（代码 5 值 / schema 注释 / V1.2 原文三方不一致）。
   **裁决 C2**：以 Domain 代码 5 值 `MANUAL / AI / FLOATING_BALL / SYSTEM / IMPORTED`
   为事实标准，**不修改 Domain enum**；本文档与 architecture-baseline.md 已同步，
   `schema.ts` 过时注释已同步修正。
3. **`category` / `tags` 字段已进入 Domain**：属实。**裁决 C4**：正式纳入 Task
   Schema，保留当前 Domain（`category?: string` / `tags?: string[]`）与
   `tasksTable.category` / `tasksTable.tags_json` 实现。
4. **Repository 疑似为占位实现**：属实（`IDrizzleDb` 全 `any`；`count()` =
   `findMany().length`；`delete()` 恒返回 `true`）。处理：PHASE 3-C 加固，
   替换为真实 Drizzle 类型与真实 `COUNT(*)`。
5. **当前默认仍是 InMemory**：属实（`handlers.ts:77` 注入 `InMemoryTaskRepository`）。
   处理：PHASE 3-D 切换为 `SQLiteTaskRepository`。

**处理原则**：以上裁决均已冻结。后续实现以本文档「已冻结基线」表为准；如需再次
变更，仍须走 AGENTS.md 规则 9（Frozen Contract 变更控制）流程。

## 附：删除规则（裁决 C1，已冻结）

PENDING / IN_PROGRESS / COMPLETED / CANCELLED 四种状态**均允许删除**；删除前必须
确认；确认后执行物理 DELETE；不增加状态限制；不存在 `deleted_at` 字段，不存在
`DELETED` 状态。（V1.0 交接说明书 §33 与 V1.2 §5.1 的矛盾已按 V1.2 口径裁决。）

## 命名映射约定

Domain（camelCase）与 SQLite 列（snake_case）的映射关系（如
`dueAt` ↔ `due_at`，`completedAt` ↔ `completed_at`）由 Repository 层
负责转换，Service 层与 Domain 层不感知底层列名。

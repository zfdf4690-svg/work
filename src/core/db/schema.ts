/**
 * Drizzle SQLite Schema Definition
 * 任务领域 SQLite 物理存储表结构契约
 * 
 * 供后端工程师切入接入真实 SQLite (如 better-sqlite3 或 node:sqlite)
 */

import { desc, sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const tasksTable = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull(),       // PENDING | IN_PROGRESS | COMPLETED | CANCELLED
  priority: text('priority').notNull(),   // LOW | MEDIUM | HIGH | URGENT
  dueAt: text('due_at'),                  // ISO 8601 string
  completedAt: text('completed_at'),      // ISO 8601 string
  source: text('source').notNull(),       // MANUAL | AI | CHAT | SYSTEM
  category: text('category'),
  tagsJson: text('tags_json'),            // JSON array of strings
  contextId: text('context_id'),
  createdAt: text('created_at').notNull(),// ISO 8601 string
  updatedAt: text('updated_at').notNull(),// ISO 8601 string
});

export const conversationsTable = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  projectId: text('project_id'),
  isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  contextSnapshotJson: text('context_snapshot_json'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_conversations_list').on(desc(table.isPinned), desc(table.updatedAt), desc(table.id)),
]);

export const conversationMessagesTable = sqliteTable('conversation_messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversationsTable.id, { onDelete: 'cascade' }),
  sequence: integer('sequence').notNull(),
  role: text('role').notNull(),
  kind: text('kind').notNull(),
  content: text('content').notNull(),
  metadataJson: text('metadata_json'),
  contextSnapshotJson: text('context_snapshot_json'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('uq_messages_conversation_sequence').on(table.conversationId, table.sequence),
]);

export const toolCallsTable = sqliteTable('tool_calls', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversationsTable.id, { onDelete: 'cascade' }),
  toolName: text('tool_name').notNull(),
  argumentsJson: text('arguments_json').notNull(),
  resultJson: text('result_json'),
  runId: text('run_id').notNull(),
  requestId: text('request_id'),
  status: text('status').notNull(),
  confirmationState: text('confirmation_state').notNull(),
  decisionAllowed: integer('decision_allowed', { mode: 'boolean' }).notNull(),
  decisionNeedsUser: integer('decision_needs_user', { mode: 'boolean' }).notNull(),
  decisionHumanOnly: integer('decision_human_only', { mode: 'boolean' }).notNull(),
  decisionReason: text('decision_reason').notNull(),
  decisionRule: text('decision_rule'),
  decisionProvenance: text('decision_provenance').notNull(),
  errorText: text('error_text'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
}, (table) => [
  uniqueIndex('uq_tool_calls_request_id')
    .on(table.requestId)
    .where(sql`request_id IS NOT NULL`),
  index('idx_tool_calls_conversation_created').on(table.conversationId, table.createdAt),
  index('idx_tool_calls_confirmation_status')
    .on(table.confirmationState, table.status)
    .where(sql`confirmation_state IN ('pending', 'approved')`),
]);

export const auditRecordsTable = sqliteTable('audit_records', {
  id: text('id').primaryKey(),
  toolCallIdSnapshot: text('tool_call_id_snapshot'),
  requestIdSnapshot: text('request_id_snapshot'),
  conversationIdSnapshot: text('conversation_id_snapshot'),
  toolName: text('tool_name').notNull(),
  runId: text('run_id').notNull(),
  decisionAllowed: integer('decision_allowed', { mode: 'boolean' }).notNull(),
  decisionNeedsUser: integer('decision_needs_user', { mode: 'boolean' }).notNull(),
  decisionHumanOnly: integer('decision_human_only', { mode: 'boolean' }).notNull(),
  decisionReason: text('decision_reason').notNull(),
  decisionRule: text('decision_rule'),
  decisionProvenance: text('decision_provenance').notNull(),
  userChoice: text('user_choice').notNull(),
  approvalOrigin: text('approval_origin'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_audit_records_request_id_snapshot').on(table.requestIdSnapshot),
  uniqueIndex('uq_audit_tool_call_user_choice')
    .on(table.toolCallIdSnapshot, table.userChoice)
    .where(sql`tool_call_id_snapshot IS NOT NULL`),
]);

export type TaskRow = typeof tasksTable.$inferSelect;
export type NewTaskRow = typeof tasksTable.$inferInsert;

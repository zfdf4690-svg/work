/**
 * Drizzle SQLite Schema Definition
 * 任务领域 SQLite 物理存储表结构契约
 * 
 * 供后端工程师切入接入真实 SQLite (如 better-sqlite3 或 node:sqlite)
 */

import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

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

export type TaskRow = typeof tasksTable.$inferSelect;
export type NewTaskRow = typeof tasksTable.$inferInsert;

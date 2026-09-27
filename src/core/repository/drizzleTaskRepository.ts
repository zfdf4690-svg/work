/**
 * Drizzle Task Repository Implementation (Extension Point for Backend Engineer)
 * 基于 Drizzle ORM 的 SQLite 仓储预留实现
 * 
 * 后端工程师切入点：
 * 1. 传入 drizzle(sqliteDb) 实例
 * 2. 直接支持零摩擦物理落盘与并发事务
 */

import { eq, and, like, gte, lte, inArray, sql } from 'drizzle-orm';
import { ITaskRepository } from './taskRepository.interface';
import { Task, TaskFilter } from '../../domain/task/task.types';
import { TaskPriority, TaskSource, TaskStatus } from '../../domain/task/task.enums';
import { tasksTable, TaskRow } from '../db/schema';

export interface IDrizzleDb {
  select: () => any;
  insert: (table: any) => any;
  update: (table: any) => any;
  delete: (table: any) => any;
}

export class DrizzleTaskRepository implements ITaskRepository {
  constructor(private readonly db: IDrizzleDb) {}

  private rowToEntity(row: TaskRow): Task {
    let tags: string[] = [];
    if (row.tagsJson) {
      try {
        tags = JSON.parse(row.tagsJson);
      } catch {
        tags = [];
      }
    }

    return {
      id: row.id,
      title: row.title,
      description: row.description || undefined,
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      dueAt: row.dueAt || null,
      completedAt: row.completedAt || null,
      source: row.source as TaskSource,
      category: row.category || undefined,
      tags,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private entityToRow(task: Task): TaskRow {
    return {
      id: task.id,
      title: task.title,
      description: task.description || null,
      status: task.status,
      priority: task.priority,
      dueAt: task.dueAt || null,
      completedAt: task.completedAt || null,
      source: task.source,
      category: task.category || null,
      tagsJson: task.tags && task.tags.length > 0 ? JSON.stringify(task.tags) : null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  public async findById(id: string): Promise<Task | null> {
    const rows = await this.db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.id, id))
      .limit(1);

    if (!rows || rows.length === 0) return null;
    return this.rowToEntity(rows[0]);
  }

  public async findMany(filter?: TaskFilter): Promise<Task[]> {
    const conditions: any[] = [];

    if (filter?.status && filter.status.length > 0) {
      conditions.push(inArray(tasksTable.status, filter.status));
    }
    if (filter?.priority && filter.priority.length > 0) {
      conditions.push(inArray(tasksTable.priority, filter.priority));
    }
    if (filter?.source && filter.source.length > 0) {
      conditions.push(inArray(tasksTable.source, filter.source));
    }
    if (filter?.category) {
      conditions.push(eq(tasksTable.category, filter.category));
    }
    if (filter?.search) {
      conditions.push(like(tasksTable.title, `%${filter.search}%`));
    }
    if (filter?.startDate) {
      conditions.push(gte(tasksTable.createdAt, filter.startDate));
    }
    if (filter?.endDate) {
      conditions.push(lte(tasksTable.createdAt, filter.endDate));
    }

    let query = this.db.select().from(tasksTable);
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const rows: TaskRow[] = await query;
    return rows.map((r) => this.rowToEntity(r));
  }

  public async create(task: Task): Promise<Task> {
    const row = this.entityToRow(task);
    await this.db.insert(tasksTable).values(row);
    return task;
  }

  public async update(id: string, updates: Partial<Task>): Promise<Task | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const merged: Task = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const row = this.entityToRow(merged);
    await this.db
      .update(tasksTable)
      .set(row)
      .where(eq(tasksTable.id, id));

    return merged;
  }

  public async delete(id: string): Promise<boolean> {
    const res = await this.db.delete(tasksTable).where(eq(tasksTable.id, id));
    return true;
  }

  public async count(filter?: TaskFilter): Promise<number> {
    const tasks = await this.findMany(filter);
    return tasks.length;
  }
}

/**
 * Drizzle Task Repository Implementation (Extension Point for Backend Engineer)
 * 基于 Drizzle ORM 的 SQLite 仓储预留实现
 * 
 * 后端工程师切入点：
 * 1. 传入 drizzle(sqliteDb) 实例
 * 2. 直接支持零摩擦物理落盘与并发事务
 */

import { and, desc, eq, gte, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ITaskRepository } from './taskRepository.interface';
import { Task, TaskFilter } from '../../domain/task/task.types';
import { TaskPriority, TaskSource, TaskStatus } from '../../domain/task/task.enums';
import * as schema from '../db/schema';
import { NewTaskRow, TaskRow, tasksTable } from '../db/schema';

export class DrizzleTaskRepository implements ITaskRepository {
  constructor(private readonly db: BetterSQLite3Database<typeof schema>) {}

  private rowToEntity(row: TaskRow): Task {
    const tags: string[] = row.tagsJson === null ? [] : JSON.parse(row.tagsJson);

    return {
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      dueAt: row.dueAt ?? null,
      completedAt: row.completedAt ?? null,
      source: row.source as TaskSource,
      category: row.category ?? undefined,
      tags,
      contextId: row.contextId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private entityToRow(task: Task): NewTaskRow {
    return {
      id: task.id,
      title: task.title,
      description: task.description ?? null,
      status: task.status,
      priority: task.priority,
      dueAt: task.dueAt ?? null,
      completedAt: task.completedAt ?? null,
      source: task.source,
      category: task.category ?? null,
      tagsJson: task.tags && task.tags.length > 0 ? JSON.stringify(task.tags) : null,
      contextId: task.contextId ?? null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  private buildConditions(filter?: TaskFilter): SQL[] {
    const conditions: SQL[] = [];

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
      conditions.push(sql`lower(${tasksTable.category}) = lower(${filter.category})`);
    }
    if (filter?.search) {
      const escapedSearch = filter.search.replace(/[!%_]/g, '!$&');
      const searchPattern = `%${escapedSearch}%`;
      conditions.push(or(
        sql`lower(${tasksTable.title}) LIKE lower(${searchPattern}) ESCAPE '!'`,
        sql`lower(coalesce(${tasksTable.description}, '')) LIKE lower(${searchPattern}) ESCAPE '!'`
      )!);
    }
    if (filter?.startDate) {
      conditions.push(gte(tasksTable.createdAt, filter.startDate));
    }
    if (filter?.endDate) {
      conditions.push(lte(tasksTable.createdAt, filter.endDate));
    }

    return conditions;
  }

  private whereClause(filter?: TaskFilter): SQL | undefined {
    const conditions = this.buildConditions(filter);
    return conditions.length > 0 ? and(...conditions) : undefined;
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
    const rows = await this.db
      .select()
      .from(tasksTable)
      .where(this.whereClause(filter))
      .orderBy(desc(tasksTable.createdAt));
    return rows.map((r) => this.rowToEntity(r));
  }

  public async create(task: Task): Promise<Task> {
    const [row] = await this.db
      .insert(tasksTable)
      .values(this.entityToRow(task))
      .returning();
    return this.rowToEntity(row);
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

    const [row] = await this.db
      .update(tasksTable)
      .set(this.entityToRow(merged))
      .where(eq(tasksTable.id, id))
      .returning();

    return row ? this.rowToEntity(row) : null;
  }

  public async delete(id: string): Promise<boolean> {
    const deleted = await this.db
      .delete(tasksTable)
      .where(eq(tasksTable.id, id))
      .returning({ id: tasksTable.id });
    return deleted.length > 0;
  }

  public async count(filter?: TaskFilter): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(tasksTable)
      .where(this.whereClause(filter));
    return result.count;
  }
}

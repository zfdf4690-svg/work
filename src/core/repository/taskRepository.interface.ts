/**
 * Task Repository Interface
 * 数据访问层契约：定义对 Task 实体的持久化原子操作
 * 供后端工程师接入 SQLite / Drizzle ORM，或前端/测试接入 InMemory 驱动
 */

import { Task, TaskFilter } from '../../domain/task/task.types';

export interface ITaskRepository {
  findById(id: string): Promise<Task | null>;
  findMany(filter?: TaskFilter): Promise<Task[]>;
  create(task: Task): Promise<Task>;
  update(id: string, updates: Partial<Task>): Promise<Task | null>;
  delete(id: string): Promise<boolean>;
  count(filter?: TaskFilter): Promise<number>;
}

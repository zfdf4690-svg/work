/**
 * InMemory Task Repository Implementation
 * 内存仓储实现：
 * 1. 确保在无真实 SQLite 文件系统依赖时提供完整且可验证的原子数据操作
 * 2. 作为自动化测试与 Web 预览模式的标准持久化底座
 */

import { ITaskRepository } from './taskRepository.interface';
import { Task, TaskFilter } from '../../domain/task/task.types';

export class InMemoryTaskRepository implements ITaskRepository {
  private tasks: Map<string, Task> = new Map();

  constructor(initialTasks: Task[] = []) {
    initialTasks.forEach((t) => this.tasks.set(t.id, { ...t }));
  }

  public async findById(id: string): Promise<Task | null> {
    const task = this.tasks.get(id);
    return task ? { ...task } : null;
  }

  public async findMany(filter?: TaskFilter): Promise<Task[]> {
    let result = Array.from(this.tasks.values()).map((t) => ({ ...t }));

    if (!filter) {
      return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    if (filter.status && filter.status.length > 0) {
      result = result.filter((t) => filter.status!.includes(t.status));
    }

    if (filter.priority && filter.priority.length > 0) {
      result = result.filter((t) => filter.priority!.includes(t.priority));
    }

    if (filter.source && filter.source.length > 0) {
      result = result.filter((t) => filter.source!.includes(t.source));
    }

    if (filter.category) {
      result = result.filter((t) => t.category?.toLowerCase() === filter.category!.toLowerCase());
    }

    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    if (filter.startDate) {
      const start = new Date(filter.startDate).getTime();
      result = result.filter((t) => new Date(t.createdAt).getTime() >= start);
    }

    if (filter.endDate) {
      const end = new Date(filter.endDate).getTime();
      result = result.filter((t) => new Date(t.createdAt).getTime() <= end);
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async create(task: Task): Promise<Task> {
    const clone: Task = { ...task };
    this.tasks.set(task.id, clone);
    return { ...clone };
  }

  public async update(id: string, updates: Partial<Task>): Promise<Task | null> {
    const existing = this.tasks.get(id);
    if (!existing) {
      return null;
    }

    const updated: Task = {
      ...existing,
      ...updates,
      id: existing.id, // ID 不允许被修改
      createdAt: existing.createdAt, // 创建时间不允许被修改
      updatedAt: new Date().toISOString(),
    };

    this.tasks.set(id, updated);
    return { ...updated };
  }

  public async delete(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  public async count(filter?: TaskFilter): Promise<number> {
    const list = await this.findMany(filter);
    return list.length;
  }
}

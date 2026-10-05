/**
 * Task Domain Types
 * 任务领域核心实体与输入契约
 */

import { TaskPriority, TaskSource, TaskStatus } from './task.enums';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string | null; // ISO 8601 string
  completedAt?: string | null;
  source: TaskSource;
  category?: string;
  tags?: string[];
  contextId?: string | null;
  createdAt: string; // ISO 8601 string
  updatedAt: string; // ISO 8601 string
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueAt?: string | null;
  source: TaskSource;
  category?: string;
  tags?: string[];
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueAt?: string | null;
  category?: string;
  tags?: string[];
}

export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  source?: TaskSource[];
  category?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export type TaskChanges = Partial<Omit<Task, 'id' | 'createdAt'>>;

export interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt?: string | null;
}

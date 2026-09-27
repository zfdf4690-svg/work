/**
 * Task Service Interface
 * 任务领域服务契约：业务逻辑 Source of Truth
 */

import {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
} from '../../domain/task/task.types';
import { IpcResult } from '../../electron/ipc/errorContract';

export interface ITaskService {
  getTask(id: string): Promise<IpcResult<Task>>;
  listTasks(filter?: TaskFilter): Promise<IpcResult<Task[]>>;
  createTask(input: CreateTaskInput): Promise<IpcResult<Task>>;
  updateTask(input: UpdateTaskInput): Promise<IpcResult<Task>>;
  completeTask(id: string): Promise<IpcResult<Task>>;
  deleteTask(id: string, confirmed: boolean): Promise<IpcResult<{ id: string; deleted: boolean; taskId: string }>>;
}

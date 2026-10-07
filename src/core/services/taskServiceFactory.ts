import { drizzle } from 'drizzle-orm/better-sqlite3';
import { DatabaseManager } from '../db/databaseManager';
import * as schema from '../db/schema';
import { DomainEventBus, IEventBus } from '../events/eventBus';
import { DrizzleTaskRepository } from '../repository/drizzleTaskRepository';
import { ITaskRepository } from '../repository/taskRepository.interface';
import { TaskService } from './taskService';

export async function createSqliteTaskRepository(databaseManager: DatabaseManager): Promise<ITaskRepository> {
  if (!databaseManager.isReady()) {
    await databaseManager.init();
  }

  return new DrizzleTaskRepository(drizzle(databaseManager.getConnection(), { schema }));
}

export async function createTaskServiceWithSqliteRepository(
  databaseManager: DatabaseManager,
  eventBus: IEventBus = DomainEventBus.getInstance()
): Promise<TaskService> {
  const repository = await createSqliteTaskRepository(databaseManager);
  return new TaskService(repository, eventBus);
}

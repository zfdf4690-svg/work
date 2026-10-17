/**
 * Electron Main 进程数据库组合根
 * 负责：
 * 1. 通过 Electron 官方 runtime API（app.getPath('userData')）解析数据库文件路径
 * 2. 初始化并持有主进程内唯一的 DatabaseManager 单例
 * 3. 在应用退出前确定性关闭数据库连接
 *
 * Core 层的 DatabaseManager 不感知 Electron；本模块是唯一完成
 * userData 路径解析与单例装配的位置。Renderer / Preload 严禁触碰本模块。
 */

import { app } from 'electron';
import path from 'node:path';
import { DatabaseManager } from '../../core/db/databaseManager';
import { MigrationRunner } from '../../core/db/migrationRunner';

/** 数据库文件名：落位于 <userData>/data.db */
export const DATABASE_FILE_NAME = 'data.db';

let databaseManager: DatabaseManager | null = null;
export type ConversationDatabaseAvailability =
  | { available: true; error: null }
  | { available: false; error: string };

let conversationDatabaseAvailability: ConversationDatabaseAvailability = {
  available: false,
  error: 'Conversation database initialization has not completed',
};

/** 基于 Electron userData 目录解析数据库文件绝对路径 */
export function resolveDatabasePath(): string {
  return path.join(app.getPath('userData'), DATABASE_FILE_NAME);
}

/**
 * 初始化数据库（幂等，不产生重复连接）。
 * 生命周期约束：必须在 app ready 之后、registerIpcHandlers() 之前调用。
 */
export async function initializeDatabase(): Promise<DatabaseManager> {
  if (databaseManager && databaseManager.isReady()) {
    return databaseManager;
  }

  const manager = new DatabaseManager({ databasePath: resolveDatabasePath() });
  databaseManager = manager;
  conversationDatabaseAvailability = {
    available: false,
    error: 'Conversation database initialization has not completed',
  };

  try {
    await manager.init();
    const migrationRunner = new MigrationRunner(
      manager.getConnection(),
      path.join(app.getAppPath(), 'migrations')
    );

    const taskMigrationResult = migrationRunner.run(['001_init.sql']);
    console.log(
      `[Database] task migrations applied=${taskMigrationResult.applied.length}, skipped=${taskMigrationResult.skipped.length}`
    );

    try {
      migrationRunner.run(['002_conversations.sql']);
      conversationDatabaseAvailability = { available: true, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      conversationDatabaseAvailability = { available: false, error: message };
      console.error('[Database] Conversation initialization failed; Task remains available', error);
    }
  } catch (error) {
    databaseManager = null;
    await manager.close();
    throw error;
  }

  console.log(`[Database] initialized: ${databaseManager.getDatabasePath()}`);
  return databaseManager;
}

/** 获取已初始化的 DatabaseManager 单例 */
export function getDatabaseManager(): DatabaseManager {
  if (!databaseManager || !databaseManager.isReady()) {
    throw new Error('[Database] 尚未初始化，请先调用 initializeDatabase()');
  }
  return databaseManager;
}

export function getConversationDatabaseAvailability(): ConversationDatabaseAvailability {
  return conversationDatabaseAvailability;
}

/** 关闭数据库连接（幂等）。better-sqlite3 close 为同步执行。 */
export async function closeDatabase(): Promise<void> {
  if (!databaseManager) return;
  const manager = databaseManager;
  databaseManager = null;
  await manager.close();
  conversationDatabaseAvailability = {
    available: false,
    error: 'Conversation database is closed',
  };
  console.log('[Database] closed');
}

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

/** 数据库文件名：落位于 <userData>/data.db */
export const DATABASE_FILE_NAME = 'data.db';

let databaseManager: DatabaseManager | null = null;

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

  databaseManager = new DatabaseManager({ databasePath: resolveDatabasePath() });
  await databaseManager.init();

  console.log(`[Database] initialized: ${databaseManager.getDatabasePath()}`);

  // PHASE 3-B 接入点：Migration Runner 将在此处基于
  // databaseManager.getConnection() 执行 migrations/ 下的待处理迁移，
  // 迁移完成后才继续 Repository / TaskService 装配。当前阶段不实现。
  return databaseManager;
}

/** 获取已初始化的 DatabaseManager 单例 */
export function getDatabaseManager(): DatabaseManager {
  if (!databaseManager || !databaseManager.isReady()) {
    throw new Error('[Database] 尚未初始化，请先调用 initializeDatabase()');
  }
  return databaseManager;
}

/** 关闭数据库连接（幂等）。better-sqlite3 close 为同步执行。 */
export async function closeDatabase(): Promise<void> {
  if (!databaseManager) return;
  const manager = databaseManager;
  databaseManager = null;
  await manager.close();
  console.log('[Database] closed');
}

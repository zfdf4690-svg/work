/**
 * Database Manager
 * SQLite 运行时连接管理器（App Core 层，不感知 Electron）
 *
 * 职责：
 * 1. 基于调用方注入的绝对路径创建 / 打开 SQLite 数据库文件
 * 2. 应用 SQLite 运行时基础配置（WAL / foreign_keys / busy_timeout / synchronous）
 * 3. 向后续阶段暴露唯一数据库连接：
 *    - PHASE 3-B Migration Runner 在 init() 成功后通过 getConnection() 执行迁移
 *    - PHASE 3-C Repository 通过 getConnection() 构造 Drizzle 实例
 * 4. 保证进程内同一时刻至多一个打开的连接，退出前可确定性关闭
 *
 * 注意：本模块不 import electron。数据库文件路径（userData 解析）由
 * Electron Main 组合根（src/electron/main/database.ts）注入，
 * 避免 Core 层新增对 Electron 的反向依赖。
 */

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { IDatabaseConnection } from './database.interface';

export interface DatabaseManagerOptions {
  /** SQLite 数据库文件绝对路径（由组合根解析，例如 <userData>/data.db） */
  databasePath: string;
}

export class DatabaseManager implements IDatabaseConnection {
  private connection: Database.Database | null = null;
  private initPromise: Promise<void> | null = null;
  private readonly databasePath: string;

  constructor(options: DatabaseManagerOptions) {
    if (!options || typeof options.databasePath !== 'string' || !path.isAbsolute(options.databasePath)) {
      throw new Error('[DatabaseManager] databasePath 必须是非空绝对路径');
    }
    this.databasePath = options.databasePath;
  }

  /**
   * 打开数据库并应用运行时配置。幂等：重复调用复用同一连接，不产生重复连接。
   * 本方法不创建任何业务表结构（Schema 由 PHASE 3-B 的 migrations/ 负责）。
   */
  public async init(): Promise<void> {
    if (this.connection) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        fs.mkdirSync(path.dirname(this.databasePath), { recursive: true });
        const db = new Database(this.databasePath);
        // SQLite 运行时基础配置（仅运行时行为，不涉及任何 Schema 变更）
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        db.pragma('busy_timeout = 5000');
        db.pragma('synchronous = NORMAL');
        this.connection = db;
      } catch (error) {
        this.initPromise = null;
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`[DatabaseManager] 无法打开数据库 ${this.databasePath}: ${reason}`);
      }
    })();

    return this.initPromise;
  }

  /** 是否已持有打开的连接 */
  public isReady(): boolean {
    return this.connection !== null;
  }

  /**
   * 获取底层 better-sqlite3 连接。
   * 这是 PHASE 3-B Migration Runner 与 PHASE 3-C Repository 的明确接入点，
   * 调用前必须已成功完成 init()。
   */
  public getConnection(): Database.Database {
    if (!this.connection) {
      throw new Error('[DatabaseManager] 数据库尚未初始化，请先调用 init()');
    }
    return this.connection;
  }

  /** 当前数据库文件绝对路径（用于日志与运行验证） */
  public getDatabasePath(): string {
    return this.databasePath;
  }

  /**
   * 关闭连接，幂等。
   * better-sqlite3 的 close 为同步执行，因此可安全用于 Electron will-quit 阶段。
   */
  public async close(): Promise<void> {
    if (!this.connection) return;
    const db = this.connection;
    this.connection = null;
    this.initPromise = null;
    db.close();
  }
}

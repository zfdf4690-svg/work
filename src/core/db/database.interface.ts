/**
 * Database Adapter Interface
 * 数据库抽象接口：隔离具体 SQLite 驱动实现
 */

export interface IDatabaseConnection {
  init(): Promise<void>;
  close(): Promise<void>;
  isReady(): boolean;
}

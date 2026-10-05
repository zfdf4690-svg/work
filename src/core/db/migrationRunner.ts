import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export interface MigrationRunResult {
  applied: string[];
  skipped: string[];
}

interface MigrationFile {
  name: string;
  path: string;
}

export class MigrationRunner {
  constructor(
    private readonly database: Database.Database,
    private readonly migrationsDirectory: string
  ) {
    if (!path.isAbsolute(migrationsDirectory)) {
      throw new Error('[MigrationRunner] migrationsDirectory 必须是绝对路径');
    }
  }

  public run(): MigrationRunResult {
    const migrations = this.getMigrationFiles();
    const appliedMigrations = new Set(this.getAppliedMigrations());
    const applied: string[] = [];
    const skipped: string[] = [];

    for (const migration of migrations) {
      if (appliedMigrations.has(migration.name)) {
        skipped.push(migration.name);
        continue;
      }

      const sql = fs.readFileSync(migration.path, 'utf8');
      const applyMigration = this.database.transaction(() => {
        this.database.exec(sql);

        if (!this.hasTrackingTable()) {
          throw new Error('[MigrationRunner] migration 未创建 schema_migrations 表');
        }

        this.database
          .prepare('INSERT INTO schema_migrations (migration_id) VALUES (?)')
          .run(migration.name);
      });

      applyMigration();
      appliedMigrations.add(migration.name);
      applied.push(migration.name);
    }

    return { applied, skipped };
  }

  private getMigrationFiles(): MigrationFile[] {
    if (!fs.existsSync(this.migrationsDirectory)) {
      throw new Error(`[MigrationRunner] migrations 目录不存在: ${this.migrationsDirectory}`);
    }

    const files = fs
      .readdirSync(this.migrationsDirectory, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /^\d+_[a-z0-9_-]+\.sql$/i.test(entry.name))
      .map((entry) => ({
        name: entry.name,
        path: path.join(this.migrationsDirectory, entry.name),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    if (files.length === 0) {
      throw new Error(`[MigrationRunner] 未找到 SQL migration: ${this.migrationsDirectory}`);
    }

    return files;
  }

  private getAppliedMigrations(): string[] {
    if (!this.hasTrackingTable()) return [];

    const rows = this.database
      .prepare('SELECT migration_id FROM schema_migrations')
      .all() as Array<{ migration_id: string }>;
    return rows.map((row) => row.migration_id);
  }

  private hasTrackingTable(): boolean {
    const row = this.database
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get('schema_migrations');
    return row !== undefined;
  }
}
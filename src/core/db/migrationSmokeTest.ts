import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseManager } from './databaseManager';
import { MigrationRunner } from './migrationRunner';

const expectedTaskColumns = [
  'id',
  'title',
  'description',
  'status',
  'priority',
  'due_at',
  'completed_at',
  'created_at',
  'updated_at',
  'source',
  'category',
  'tags_json',
  'context_id',
];

function taskValues(id: string, overrides: Record<string, string | null> = {}) {
  return {
    id,
    title: 'Migration smoke task',
    description: null,
    status: 'PENDING',
    priority: 'MEDIUM',
    due_at: null,
    completed_at: null,
    created_at: '2026-10-04T00:00:00.000Z',
    updated_at: '2026-10-04T00:00:00.000Z',
    source: 'MANUAL',
    category: null,
    tags_json: null,
    context_id: null,
    ...overrides,
  };
}

async function runMigrationSmokeTest(): Promise<void> {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-work-assistant-migration-'));
  const databasePath = path.join(temporaryDirectory, 'data.db');
  const migrationsDirectory = path.resolve(process.cwd(), 'migrations');
  let manager = new DatabaseManager({ databasePath });

  try {
    await manager.init();
    const database = manager.getConnection();
    const runner = new MigrationRunner(database, migrationsDirectory);

    const firstRun = runner.run();
    assert.deepEqual(firstRun.applied, ['001_init.sql']);
    assert.deepEqual(firstRun.skipped, []);

    const tables = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;
    assert.deepEqual(tables.map((table) => table.name), ['schema_migrations', 'tasks']);

    const migrationRows = database
      .prepare('SELECT migration_id FROM schema_migrations ORDER BY migration_id')
      .all() as Array<{ migration_id: string }>;
    assert.deepEqual(migrationRows, [{ migration_id: '001_init.sql' }]);

    const columns = database.pragma('table_info(tasks)') as Array<{
      name: string;
      type: string;
      notnull: number;
      pk: number;
    }>;
    assert.deepEqual(columns.map((column) => column.name), expectedTaskColumns);
    assert.equal(columns.find((column) => column.name === 'id')?.type, 'TEXT');
    assert.equal(columns.find((column) => column.name === 'id')?.pk, 1);
    for (const name of ['id', 'title', 'status', 'priority', 'created_at', 'updated_at', 'source']) {
      assert.equal(columns.find((column) => column.name === name)?.notnull, 1, `${name} must be NOT NULL`);
    }
    assert.equal(columns.find((column) => column.name === 'context_id')?.type, 'TEXT');
    for (const name of ['description', 'due_at', 'completed_at', 'category', 'tags_json', 'context_id']) {
      assert.equal(columns.find((column) => column.name === name)?.notnull, 0, `${name} must be nullable`);
    }
    for (const name of ['due_at', 'completed_at', 'created_at', 'updated_at']) {
      assert.equal(columns.find((column) => column.name === name)?.type, 'DATETIME', `${name} must be DATETIME`);
    }
    assert.deepEqual(database.pragma('foreign_key_list(tasks)'), []);

    const insertTask = database.prepare(`
      INSERT INTO tasks (
        id, title, description, status, priority, due_at, completed_at,
        created_at, updated_at, source, category, tags_json, context_id
      ) VALUES (
        @id, @title, @description, @status, @priority, @due_at, @completed_at,
        @created_at, @updated_at, @source, @category, @tags_json, @context_id
      )
    `);

    insertTask.run(taskValues('550e8400-e29b-41d4-a716-446655440000', {
      context_id: 'test-context-001',
    }));
    insertTask.run(taskValues('550e8400-e29b-41d4-a716-446655440001'));

    assert.throws(
      () => insertTask.run(taskValues('550e8400-e29b-41d4-a716-446655440002', { status: 'INVALID' })),
      /CHECK constraint failed/
    );
    assert.throws(
      () => insertTask.run(taskValues('550e8400-e29b-41d4-a716-446655440003', { priority: 'INVALID' })),
      /CHECK constraint failed/
    );
    assert.throws(
      () => insertTask.run(taskValues('550e8400-e29b-41d4-a716-446655440004', { source: 'INVALID' })),
      /CHECK constraint failed/
    );

    const indexNames = (database.pragma('index_list(tasks)') as Array<{ name: string }>)
      .map((index) => index.name)
      .filter((name) => name.startsWith('idx_'));
    assert.deepEqual(indexNames.sort(), ['idx_tasks_due_at', 'idx_tasks_status']);

    const secondRun = runner.run();
    assert.deepEqual(secondRun.applied, []);
    assert.deepEqual(secondRun.skipped, ['001_init.sql']);
    const taskCount = database.prepare('SELECT COUNT(*) AS count FROM tasks').get() as { count: number };
    assert.equal(taskCount.count, 2);

    await manager.close();
    manager = new DatabaseManager({ databasePath });
    await manager.init();

    const reopenedDatabase = manager.getConnection();
    const restartRun = new MigrationRunner(reopenedDatabase, migrationsDirectory).run();
    assert.deepEqual(restartRun.applied, []);
    assert.deepEqual(restartRun.skipped, ['001_init.sql']);
    const reopenedTaskCount = reopenedDatabase
      .prepare('SELECT COUNT(*) AS count FROM tasks')
      .get() as { count: number };
    assert.equal(reopenedTaskCount.count, 2);
    const migrationCount = reopenedDatabase
      .prepare('SELECT COUNT(*) AS count FROM schema_migrations')
      .get() as { count: number };
    assert.equal(
      migrationCount.count,
      1
    );

    console.log('[MigrationSmoke] first run, idempotency, schema, constraints, context_id, and restart persistence passed');
  } finally {
    await manager.close();
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

runMigrationSmokeTest().catch((error) => {
  console.error('[MigrationSmoke] failed:', error);
  process.exitCode = 1;
});
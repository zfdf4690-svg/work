import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { DatabaseManager } from '../db/databaseManager';
import { MigrationRunner } from '../db/migrationRunner';
import * as schema from '../db/schema';
import { TaskPriority, TaskSource, TaskStatus } from '../../domain/task/task.enums';
import { Task } from '../../domain/task/task.types';
import { DrizzleTaskRepository } from './drizzleTaskRepository';
import { InMemoryTaskRepository } from './inMemoryTaskRepository';

let taskSequence = 0;

function createTask(overrides: Partial<Task> = {}): Task {
  taskSequence += 1;
  return {
    id: `00000000-0000-4000-8000-${String(taskSequence).padStart(12, '0')}`,
    title: `Task ${taskSequence}`,
    description: 'Repository test task',
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    dueAt: '2026-10-10T12:30:45.123Z',
    completedAt: null,
    source: TaskSource.MANUAL,
    category: 'Testing',
    tags: ['repository', 'sqlite'],
    contextId: 'ctx-default',
    createdAt: '2026-10-01T08:15:30.456Z',
    updatedAt: '2026-10-02T09:16:31.567Z',
    ...overrides,
  };
}

async function runRepositoryTests(): Promise<void> {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-work-assistant-repository-'));
  const databaseManager = new DatabaseManager({
    databasePath: path.join(temporaryDirectory, 'data.db'),
  });

  try {
    await databaseManager.init();
    const connection = databaseManager.getConnection();
    new MigrationRunner(connection, path.resolve(process.cwd(), 'migrations')).run();
    const repository = new DrizzleTaskRepository(drizzle(connection, { schema }));

    const roundTripInput = createTask({
      title: 'Round-trip task',
      description: 'Preserve every field',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.URGENT,
      dueAt: '2026-10-12T01:02:03.004+08:00',
      completedAt: '2026-10-03T11:12:13.014Z',
      source: TaskSource.IMPORTED,
      category: 'RoundTrip',
      tags: ['alpha', 'beta'],
      contextId: 'ctx-001',
      createdAt: '2026-09-30T07:08:09.010Z',
      updatedAt: '2026-10-01T17:18:19.020Z',
    });
    const created = await repository.create(roundTripInput);
    assert.deepEqual(created, roundTripInput);
    assert.deepEqual(await repository.findById(roundTripInput.id), roundTripInput);
    assert.equal(
      connection.prepare('SELECT context_id FROM tasks WHERE id = ?').get(roundTripInput.id)
        ?.context_id,
      'ctx-001'
    );
    assert.equal(await repository.findById('00000000-0000-4000-8000-999999999999'), null);

    const nullableTask = createTask({
      description: undefined,
      dueAt: null,
      completedAt: null,
      category: undefined,
      tags: undefined,
      contextId: null,
    });
    const nullableCreated = await repository.create(nullableTask);
    assert.equal(nullableCreated.description, undefined);
    assert.equal(nullableCreated.dueAt, null);
    assert.equal(nullableCreated.completedAt, null);
    assert.equal(nullableCreated.category, undefined);
    assert.deepEqual(nullableCreated.tags, []);
    assert.equal(nullableCreated.contextId, null);
    assert.equal(
      connection.prepare('SELECT context_id FROM tasks WHERE id = ?').get(nullableTask.id)
        ?.context_id,
      null
    );

    const optionalContextTask = createTask({ contextId: undefined, tags: [] });
    const optionalContextCreated = await repository.create(optionalContextTask);
    assert.equal(optionalContextCreated.contextId, null);
    assert.deepEqual(optionalContextCreated.tags, []);
    assert.equal(
      connection.prepare('SELECT context_id, tags_json FROM tasks WHERE id = ?').get(optionalContextTask.id)
        ?.context_id,
      null
    );
    assert.equal(
      connection.prepare('SELECT tags_json FROM tasks WHERE id = ?').get(optionalContextTask.id)
        ?.tags_json,
      null
    );

    const emptyStringTask = createTask({
      description: '',
      dueAt: '',
      completedAt: '',
      category: '',
    });
    const emptyStringCreated = await repository.create(emptyStringTask);
    assert.equal(emptyStringCreated.description, '');
    assert.equal(emptyStringCreated.dueAt, '');
    assert.equal(emptyStringCreated.completedAt, '');
    assert.equal(emptyStringCreated.category, '');

    const updateTarget = await repository.create(createTask({
      title: 'Before update',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      contextId: 'ctx-before',
    }));
    const updated = await repository.update(updateTarget.id, {
      title: 'After update',
      description: undefined,
      dueAt: null,
      tags: ['updated'],
      contextId: null,
      id: 'must-not-change-id',
      createdAt: '2000-01-01T00:00:00.000Z',
    });
    assert.ok(updated);
    assert.equal(updated.id, updateTarget.id);
    assert.equal(updated.createdAt, updateTarget.createdAt);
    assert.notEqual(updated.updatedAt, updateTarget.updatedAt);
    assert.ok(Number.isFinite(Date.parse(updated.updatedAt)));
    assert.equal(updated.title, 'After update');
    assert.equal(updated.description, undefined);
    assert.equal(updated.dueAt, null);
    assert.deepEqual(updated.tags, ['updated']);
    assert.equal(updated.contextId, null);
    assert.equal(await repository.update('missing-id', { title: 'No row' }), null);

    const statusTasks = new Map<TaskStatus, Task>();
    for (const status of Object.values(TaskStatus)) {
      const task = createTask({ status });
      await repository.create(task);
      statusTasks.set(status, task);
    }
    for (const [status, task] of statusTasks) {
      assert.equal(await repository.delete(task.id), true, `${status} should be physically deleted`);
      assert.equal(await repository.findById(task.id), null, `${status} should no longer exist`);
    }
    assert.equal(await repository.delete('missing-id'), false);

    const priorityTasks = [];
    for (const priority of Object.values(TaskPriority)) {
      const task = createTask({ priority });
      await repository.create(task);
      priorityTasks.push(task);
    }
    const sourceTasks = [];
    for (const source of Object.values(TaskSource)) {
      const task = createTask({ source });
      await repository.create(task);
      sourceTasks.push(task);
    }

    assert.equal(await repository.count(), 2 + 1 + 1 + 1 + priorityTasks.length + sourceTasks.length);
    assert.equal(await repository.count({ priority: [TaskPriority.URGENT] }), 2);
    assert.equal(await repository.count({ source: [TaskSource.IMPORTED] }), 2);
    assert.equal(
      (await repository.findMany({ category: 'roundtrip' })).length,
      1,
      'category filtering should be case-insensitive'
    );
    const memoryRepository = new InMemoryTaskRepository([roundTripInput]);
    assert.deepEqual(
      (await repository.findMany({ search: 'PRESERVE EVERY' })).map((task) => task.id),
      (await memoryRepository.findMany({ search: 'PRESERVE EVERY' })).map((task) => task.id)
    );
    assert.deepEqual(
      (await repository.findMany({ category: 'roundtrip' })).map((task) => task.id),
      (await memoryRepository.findMany({ category: 'roundtrip' })).map((task) => task.id)
    );

    const unicodeTask = createTask({ title: 'ÄPFEL schedule', category: 'Über' });
    await repository.create(unicodeTask);
    const unicodeMemoryRepository = new InMemoryTaskRepository([unicodeTask]);
    assert.deepEqual(
      (await repository.findMany({ search: 'äpfel' })).map((task) => task.id),
      (await unicodeMemoryRepository.findMany({ search: 'äpfel' })).map((task) => task.id)
    );
    assert.deepEqual(
      (await repository.findMany({ category: 'über' })).map((task) => task.id),
      (await unicodeMemoryRepository.findMany({ category: 'über' })).map((task) => task.id)
    );
    assert.equal(
      (await repository.findMany({ search: 'PRESERVE EVERY' })).length,
      1,
      'search should match description case-insensitively'
    );
    assert.equal(
      (await repository.findMany({ search: '100% literal' })).length,
      0,
      'LIKE wildcard characters should be treated literally'
    );
    assert.equal(
      (await repository.findMany({
        startDate: '2026-09-30T07:08:09.010Z',
        endDate: '2026-09-30T07:08:09.010Z',
      })).length,
      1
    );

    connection.exec(`
      CREATE TRIGGER reject_repository_insert
      BEFORE INSERT ON tasks
      BEGIN
        SELECT RAISE(ABORT, 'repository insert blocked');
      END;
    `);
    await assert.rejects(
      repository.create(createTask()),
      /repository insert blocked/
    );
    connection.exec('DROP TRIGGER reject_repository_insert');

    console.log('[RepositoryTest] CRUD, mapping, filtering/count, all-status delete, timestamps, and SQL error propagation passed');
  } finally {
    await databaseManager.close();
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

runRepositoryTests().catch((error) => {
  console.error('[RepositoryTest] failed:', error);
  process.exitCode = 1;
});
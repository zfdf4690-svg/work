import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseManager } from '../db/databaseManager';
import { MigrationRunner } from '../db/migrationRunner';
import { DomainEventBus } from '../events/eventBus';
import { TaskPriority, TaskSource, TaskStatus } from '../../domain/task/task.enums';
import type { Task, UpdateTaskInput } from '../../domain/task/task.types';
import { DrizzleTaskRepository } from '../repository/drizzleTaskRepository';
import { createTaskServiceWithSqliteRepository } from './taskServiceFactory';

const [mode, databasePath, manifestPath] = process.argv.slice(2);
if (!['write', 'verify', 'verify-delete'].includes(mode) || !databasePath || !manifestPath) {
  throw new Error('Usage: phase3fPersistenceWorker <write|verify|verify-delete> <dbPath> <manifestPath>');
}

interface Manifest {
  databasePath: string;
  taskA: Record<string, unknown>;
  taskB: Record<string, unknown>;
  taskC: Record<string, unknown>;
  deleteIds: string[];
  confirmationId: string;
}

const migrationsPath = path.resolve(process.cwd(), 'migrations');
const databaseManager = new DatabaseManager({ databasePath });

function resultTask<T>(result: { success: boolean; data?: T; error?: unknown }, label: string): T {
  assert.equal(result.success, true, `${label} should succeed: ${JSON.stringify(result)}`);
  return result.data as T;
}

function normalizeTask(task: Task): Record<string, unknown> {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    dueAt: task.dueAt,
    completedAt: task.completedAt,
    source: task.source,
    category: task.category ?? null,
    tags: task.tags,
    contextId: task.contextId,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function assertTaskDates(task: Task, label: string): void {
  for (const field of ['createdAt', 'updatedAt'] as const) {
    assert.equal(typeof task[field], 'string', `${label}.${field} must remain a string`);
    assert.equal(Number.isNaN(Date.parse(task[field])), false, `${label}.${field} must be a valid date`);
  }
  if (task.completedAt !== null && task.completedAt !== undefined) {
    assert.equal(Number.isNaN(Date.parse(task.completedAt)), false, `${label}.completedAt must be a valid date`);
  }
  for (const value of [task.description, task.dueAt, task.completedAt, task.category, task.contextId]) {
    assert.notEqual(value, 'null', `${label} must not contain the string "null"`);
    assert.notEqual(value, 'undefined', `${label} must not contain the string "undefined"`);
  }
}

async function createTask(
  service: Awaited<ReturnType<typeof createTaskServiceWithSqliteRepository>>,
  input: Parameters<typeof service.createTask>[0]
): Promise<Task> {
  return resultTask(await service.createTask(input), 'createTask');
}

async function getTask(
  service: Awaited<ReturnType<typeof createTaskServiceWithSqliteRepository>>,
  id: string
): Promise<Task> {
  return resultTask(await service.getTask(id), `getTask(${id})`);
}

async function main(): Promise<void> {
  await databaseManager.init();
  const migrationResult = new MigrationRunner(
    databaseManager.getConnection(),
    migrationsPath
  ).run();
  const service = await createTaskServiceWithSqliteRepository(databaseManager, new DomainEventBus());
  assert.ok(service['repository'] instanceof DrizzleTaskRepository, 'TaskService must use SQLiteTaskRepository');

  if (mode === 'write') {
    assert.deepEqual(migrationResult.applied, ['001_init.sql']);
    const fixedDueAt = '2026-11-15T09:30:00.000Z';
    const taskA = await createTask(service, {
      title: 'PHASE 3-F Task A before update',
      description: 'Process restart field and update persistence check',
      priority: TaskPriority.HIGH,
      dueAt: fixedDueAt,
      source: TaskSource.AI,
      category: 'Phase3F',
      tags: [],
    });

    await new Promise((resolve) => setTimeout(resolve, 5));
    const updatedTaskA = resultTask(await service.updateTask({
      id: taskA.id,
      title: 'PHASE 3-F Task A after update',
      description: 'Updated across a real process restart',
      priority: TaskPriority.URGENT,
      status: TaskStatus.IN_PROGRESS,
      tags: ['AI', 'Work', 'Important'],
    }), 'updateTask(Task A)');
    const taskAWithContext = resultTask(await service.updateTask({
      id: taskA.id,
      contextId: 'context-phase-3-f',
    } as UpdateTaskInput), 'updateTask(Task A contextId fixture)');
    assert.ok(Date.parse(taskAWithContext.updatedAt) >= Date.parse(taskA.createdAt));
    assert.notEqual(taskAWithContext.updatedAt, taskA.createdAt, 'updatedAt must reflect the update');

    const taskB = await createTask(service, {
      title: 'PHASE 3-F Task B nullable fields',
      priority: TaskPriority.LOW,
      dueAt: null,
      source: TaskSource.MANUAL,
      tags: [],
    });
    assert.equal(taskB.description, undefined);
    assert.equal(taskB.category, undefined);
    assert.equal(taskB.dueAt, null);
    assert.equal(taskB.completedAt, null);
    assert.equal(taskB.contextId, null);

    const taskC = await createTask(service, {
      title: 'PHASE 3-F Task C completed timestamp',
      description: 'Completed task must retain completedAt',
      priority: TaskPriority.MEDIUM,
      dueAt: fixedDueAt,
      source: TaskSource.SYSTEM,
      category: 'Lifecycle',
      tags: ['completed'],
    });
    resultTask(await service.updateTask({ id: taskC.id, status: TaskStatus.IN_PROGRESS }), 'start Task C');
    const completedTaskC = resultTask(await service.updateTask({ id: taskC.id, status: TaskStatus.COMPLETED }), 'complete Task C');
    assert.ok(completedTaskC.completedAt);

    const deleteIds: string[] = [];
    for (const status of Object.values(TaskStatus)) {
      const deleteTask = await createTask(service, {
        title: `PHASE 3-F delete ${status}`,
        source: TaskSource.IMPORTED,
        priority: TaskPriority.MEDIUM,
        tags: [status],
      });
      if (status === TaskStatus.IN_PROGRESS || status === TaskStatus.CANCELLED) {
        resultTask(await service.updateTask({ id: deleteTask.id, status }), `set delete task ${status}`);
      } else if (status === TaskStatus.COMPLETED) {
        resultTask(await service.updateTask({ id: deleteTask.id, status: TaskStatus.IN_PROGRESS }), 'start completed delete task');
        resultTask(await service.updateTask({ id: deleteTask.id, status }), 'set delete task COMPLETED');
      }
      const beforeDelete = await getTask(service, deleteTask.id);
      assert.equal(beforeDelete.status, status);
      resultTask(await service.deleteTask(deleteTask.id, true), `delete ${status}`);
      deleteIds.push(deleteTask.id);
    }

    const confirmationTask = await createTask(service, {
      title: 'PHASE 3-F confirmation survives restart',
      source: TaskSource.MANUAL,
      priority: TaskPriority.MEDIUM,
      tags: ['confirmation'],
    });
    const deniedDelete = await service.deleteTask(confirmationTask.id, false);
    assert.equal(deniedDelete.success, false, 'confirmed=false must not delete');
    assert.equal((await getTask(service, confirmationTask.id)).id, confirmationTask.id);

    const manifest: Manifest = {
      databasePath: databaseManager.getDatabasePath(),
      taskA: normalizeTask(taskAWithContext),
      taskB: normalizeTask(taskB),
      taskC: normalizeTask(completedTaskC),
      deleteIds,
      confirmationId: confirmationTask.id,
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`PHASE3F_RESULT=${JSON.stringify({
      mode,
      pid: process.pid,
      databasePath: databaseManager.getDatabasePath(),
      migrationResult,
      manifest,
    })}`);
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Manifest;
  assert.equal(databaseManager.getDatabasePath(), manifest.databasePath, 'Process must use the same DB path');

  if (mode === 'verify') {
    assert.deepEqual(migrationResult.applied, [], 'restart must not apply a destructive fresh migration');
    assert.deepEqual(migrationResult.skipped, ['001_init.sql']);
    const taskA = await getTask(service, (manifest.taskA.id as string));
    const taskB = await getTask(service, (manifest.taskB.id as string));
    const taskC = await getTask(service, (manifest.taskC.id as string));
    assert.deepEqual(normalizeTask(taskA), manifest.taskA, 'Task A full fields must round-trip');
    assert.deepEqual(normalizeTask(taskB), manifest.taskB, 'Task B nullable fields and empty tags must round-trip');
    assert.deepEqual(normalizeTask(taskC), manifest.taskC, 'Task C completed fields must round-trip');
    for (const task of [taskA, taskB, taskC]) assertTaskDates(task, task.id);
    assert.deepEqual(taskA.tags, ['AI', 'Work', 'Important']);
    assert.equal(taskA.contextId, 'context-phase-3-f');
    assert.equal(taskB.contextId, null);
    assert.ok(taskC.completedAt);

    for (const id of manifest.deleteIds) {
      const deleted = await service.getTask(id);
      assert.equal(deleted.success, false, `confirmed delete must remain absent after restart: ${id}`);
    }
    const confirmationTask = await getTask(service, manifest.confirmationId);
    assert.equal(confirmationTask.title, 'PHASE 3-F confirmation survives restart');
    resultTask(await service.deleteTask(manifest.confirmationId, true), 'confirmed delete after restart');

    console.log(`PHASE3F_RESULT=${JSON.stringify({
      mode,
      pid: process.pid,
      databasePath: databaseManager.getDatabasePath(),
      migrationResult,
      taskA: normalizeTask(taskA),
      taskB: normalizeTask(taskB),
      taskC: normalizeTask(taskC),
      deletedIds: manifest.deleteIds,
      confirmationStillExisted: true,
    })}`);
    return;
  }

  const confirmationTask = await service.getTask(manifest.confirmationId);
  assert.equal(confirmationTask.success, false, 'confirmed delete must remain absent after another restart');
  console.log(`PHASE3F_RESULT=${JSON.stringify({
    mode,
    pid: process.pid,
    databasePath: databaseManager.getDatabasePath(),
    migrationResult,
    confirmationAbsent: true,
  })}`);
}

main()
  .catch((error) => {
    console.error(`[phase3f:${mode}]`, error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await databaseManager.close();
  });

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseManager } from '../../core/db/databaseManager';
import { MigrationRunner } from '../../core/db/migrationRunner';
import { createTaskServiceWithSqliteRepository } from '../../core/services/taskServiceFactory';
import { TaskPriority, TaskSource, TaskStatus } from '../../domain/task/task.enums';
import { IpcErrorCode, createIpcError } from './errorContract';
import { MainTaskCreateSchema, MainTaskDeleteSchema, MainTaskGetSchema, MainTaskListSchema, MainTaskUpdateSchema } from './zodSchemas';

async function runIpcValidationTests(): Promise<void> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-work-assistant-ipc-validation-'));
  const databaseManager = new DatabaseManager({ databasePath: path.join(tempDir, 'data.db') });

  try {
    await databaseManager.init();
    new MigrationRunner(databaseManager.getConnection(), path.resolve(process.cwd(), 'migrations')).run();

    const service = await createTaskServiceWithSqliteRepository(databaseManager);
    let createCalls = 0;
    let updateCalls = 0;
    let getCalls = 0;

    const createViaHandler = async (req: unknown) => {
      const parsed = MainTaskCreateSchema.safeParse(req);
      if (!parsed.success) {
        return createIpcError(IpcErrorCode.VALIDATION_ERROR, 'Main 端创建任务校验失败', parsed.error.flatten());
      }
      createCalls += 1;
      return service.createTask(parsed.data);
    };

    const updateViaHandler = async (req: unknown) => {
      const parsed = MainTaskUpdateSchema.safeParse(req);
      if (!parsed.success) {
        return createIpcError(IpcErrorCode.VALIDATION_ERROR, 'Main 端更新任务校验失败', parsed.error.flatten());
      }
      updateCalls += 1;
      return service.updateTask(parsed.data);
    };

    const getViaHandler = async (req: unknown) => {
      const parsed = MainTaskGetSchema.safeParse(req);
      if (!parsed.success) {
        return createIpcError(IpcErrorCode.VALIDATION_ERROR, '无效的任务 ID', parsed.error.flatten());
      }
      getCalls += 1;
      return service.getTask(parsed.data.id);
    };

    const listViaHandler = async (req: unknown) => {
      const parsed = MainTaskListSchema.safeParse(req);
      if (!parsed.success) {
        return createIpcError(IpcErrorCode.VALIDATION_ERROR, 'Main 端参数校验失败', parsed.error.flatten());
      }
      return service.listTasks(parsed.data ?? undefined);
    };

    const deleteViaHandler = async (req: unknown) => {
      const parsed = MainTaskDeleteSchema.safeParse(req);
      if (!parsed.success) {
        return createIpcError(IpcErrorCode.CONFIRMATION_REQUIRED, '物理删除任务必须显式传入 confirmed=true');
      }
      return service.deleteTask(parsed.data.id, parsed.data.confirmed);
    };

    const created = await createViaHandler({
      title: 'IPC validation task',
      description: '真实 SQLite IPC 端到端校验',
      priority: TaskPriority.HIGH,
      source: TaskSource.AI,
      category: 'IPC',
      tags: ['zod', 'sqlite'],
      contextId: 'ctx-ipc-001',
    });
    assert.equal(created.success, true, 'valid create input should pass zod and reach TaskService');
    assert.equal(createCalls, 1, 'valid create should call the service exactly once');

    const invalidCreate = await createViaHandler({
      title: 'Bad input',
      source: 'not-a-real-enum',
      tags: 'bad',
    });
    assert.equal(invalidCreate.success, false, 'invalid create input should be rejected before service call');
    assert.equal(createCalls, 1, 'invalid create should not invoke the service');

    const getById = await getViaHandler({ id: created.data.id });
    assert.equal(getById.success, true, 'valid get input should pass zod and fetch the task');
    assert.equal(getCalls, 1, 'valid get should call the service exactly once');

    const listByStatus = await listViaHandler({ status: [TaskStatus.PENDING] });
    assert.equal(listByStatus.success, true, 'valid list input should pass zod and list tasks');

    const updated = await updateViaHandler({
      id: created.data.id,
      title: 'IPC validation task updated',
      priority: TaskPriority.URGENT,
      tags: ['zod', 'sqlite', 'updated'],
      contextId: 'ctx-ipc-002',
    });
    assert.equal(updated.success, true, 'valid update input should pass zod and reach TaskService');
    assert.equal(updateCalls, 1, 'valid update should call the service exactly once');

    const invalidPriority = await updateViaHandler({
      id: created.data.id,
      priority: 'not-a-priority',
    });
    assert.equal(invalidPriority.success, false, 'invalid update priority should be rejected');
    assert.equal(updateCalls, 1, 'invalid update should not invoke the service');

    const deleteBlocked = await deleteViaHandler({ id: created.data.id, confirmed: false });
    assert.equal(deleteBlocked.success, false, 'delete without confirmation must not delete');

    const deleteAllowed = await deleteViaHandler({ id: created.data.id, confirmed: true });
    assert.equal(deleteAllowed.success, true, 'delete with confirmed=true should physically remove the row');

    const afterDelete = await getViaHandler({ id: created.data.id });
    assert.equal(afterDelete.success, false, 'task should be gone after physical delete');

    console.log('[IpcValidationTest] zod validation, sqlite service path, and confirmation semantics passed');
  } finally {
    await databaseManager.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

if (process.argv[1]?.endsWith('taskServiceIpcValidationTest.ts')) {
  runIpcValidationTests().catch((error) => {
    console.error('[IpcValidationTest] failed:', error);
    process.exit(1);
  });
}

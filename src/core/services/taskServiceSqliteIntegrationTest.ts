import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DomainEventBus } from '../events/eventBus';
import { DatabaseManager } from '../db/databaseManager';
import { MigrationRunner } from '../db/migrationRunner';
import { TaskPriority, TaskSource, TaskStatus } from '../../domain/task/task.enums';
import { createTaskServiceWithSqliteRepository } from './taskServiceFactory';
import { TaskService } from './taskService';
import { DrizzleTaskRepository } from '../repository/drizzleTaskRepository';

async function runTaskServiceSqliteIntegrationTests(): Promise<void> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-work-assistant-service-sqlite-'));
  const databaseManager = new DatabaseManager({ databasePath: path.join(tempDir, 'data.db') });

  try {
    await databaseManager.init();
    new MigrationRunner(databaseManager.getConnection(), path.resolve(process.cwd(), 'migrations')).run();

    const service = await createTaskServiceWithSqliteRepository(databaseManager, new DomainEventBus());
    assert.ok(service instanceof TaskService, 'TaskService should be created with SQLite repository injection');

    const repository = service['repository'];
    assert.ok(repository instanceof DrizzleTaskRepository, '生产注入必须返回 SQLite Repository');

    const createResult = await service.createTask({
      title: 'SQLite Service Integration Task',
      description: '验证 TaskService 真实写入 SQLite Repository',
      priority: TaskPriority.HIGH,
      source: TaskSource.AI,
      category: 'Integration',
      tags: ['sqlite', 'service'],
    });
    assert.equal(createResult.success, true, 'createTask should succeed against SQLite repo');
    const createdTask = createResult.success ? createResult.data : null;
    assert.ok(createdTask?.id, 'Created task should have an id');

    const getResult = await service.getTask(createdTask!.id);
    assert.equal(getResult.success, true, 'getTask should return same task');
    assert.equal(getResult.success ? getResult.data.title : '', 'SQLite Service Integration Task');

    const listResult = await service.listTasks({ status: [TaskStatus.PENDING] });
    assert.equal(listResult.success, true, 'listTasks should work against SQLite repo');
    assert.ok(listResult.success && listResult.data.length >= 1, 'At least one list item should be present');

    const updateResult = await service.updateTask({
      id: createdTask!.id,
      title: 'SQLite Service Integration Task Updated',
      priority: TaskPriority.URGENT,
      tags: ['sqlite', 'service', 'updated'],
    });
    assert.equal(updateResult.success, true, 'updateTask should persist SQLite changes');
    assert.equal(updateResult.success ? updateResult.data.priority : '', TaskPriority.URGENT);

    const deleteWithoutConfirm = await service.deleteTask(createdTask!.id, false);
    assert.equal(deleteWithoutConfirm.success, false, 'delete without confirmed flag must not delete');

    const deleteWithConfirm = await service.deleteTask(createdTask!.id, true);
    assert.equal(deleteWithConfirm.success, true, 'delete with confirmed=true should physically delete');

    const afterDelete = await service.getTask(createdTask!.id);
    assert.equal(afterDelete.success, false, 'task should be removed after physical delete');

    console.log('[TaskServiceSqliteIntegrationTest] SQLite repository DI and CRUD flow passed');
  } finally {
    await databaseManager.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

if (process.argv[1]?.endsWith('taskServiceSqliteIntegrationTest.ts')) {
  runTaskServiceSqliteIntegrationTests().catch((error) => {
    console.error('[TaskServiceSqliteIntegrationTest] failed:', error);
    process.exit(1);
  });
}

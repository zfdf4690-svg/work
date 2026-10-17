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

const timestamp = '2026-10-04T00:00:00.000Z';

function insertConversation(database: ReturnType<DatabaseManager['getConnection']>, id: string): void {
  database.prepare(`
    INSERT INTO conversations (id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `).run(id, `Conversation ${id}`, timestamp, timestamp);
}

function insertToolCall(
  database: ReturnType<DatabaseManager['getConnection']>,
  id: string,
  conversationId: string,
  overrides: Record<string, string | number | null> = {}
): void {
  const values = {
    id,
    conversation_id: conversationId,
    tool_name: 'get_task',
    arguments_json: '{}',
    result_json: null,
    run_id: null,
    request_id: null,
    status: 'PENDING',
    confirmation_state: 'not_required',
    decision_allowed: 1,
    decision_needs_user: 0,
    decision_human_only: 0,
    decision_reason: 'read-only tool',
    decision_rule: 'read',
    decision_provenance: 'auto',
    error_text: null,
    created_at: timestamp,
    updated_at: timestamp,
    started_at: null,
    completed_at: null,
    ...overrides,
  };
  database.prepare(`
    INSERT INTO tool_calls (
      id, conversation_id, tool_name, arguments_json, result_json, run_id, request_id,
      status, confirmation_state, decision_allowed, decision_needs_user, decision_human_only,
      decision_reason, decision_rule, decision_provenance, error_text, created_at, updated_at,
      started_at, completed_at
    ) VALUES (
      @id, @conversation_id, @tool_name, @arguments_json, @result_json, @run_id, @request_id,
      @status, @confirmation_state, @decision_allowed, @decision_needs_user, @decision_human_only,
      @decision_reason, @decision_rule, @decision_provenance, @error_text, @created_at, @updated_at,
      @started_at, @completed_at
    )
  `).run(values);
}

function insertAudit(
  database: ReturnType<DatabaseManager['getConnection']>,
  id: string,
  toolCallId: string,
  userChoice: 'approve' | 'deny' | 'expired'
): void {
  database.prepare(`
    INSERT INTO audit_records (
      id, tool_call_id_snapshot, request_id_snapshot, conversation_id_snapshot, tool_name, run_id,
      decision_allowed, decision_needs_user, decision_human_only, decision_reason,
      decision_rule, decision_provenance, user_choice, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, toolCallId, `request-${toolCallId}`, `conversation-${toolCallId}`, 'create_task', 'run-1',
    0, 1, 0, 'waiting for user', 'confirmation-required', 'pending', userChoice, timestamp
  );
}

type SmokeDatabase = ReturnType<DatabaseManager['getConnection']>;

function expectDatabaseRejection(action: () => unknown, label: string): void {
  assert.throws(action, undefined, label);
}

function runConversationConstraintTests(database: SmokeDatabase): void {
  insertConversation(database, 'conversation-constraints');
  insertConversation(database, 'conversation-request-target');

  expectDatabaseRejection(
    () => insertToolCall(database, 'call-needs-user-invalid', 'conversation-constraints', {
      decision_needs_user: 1,
    }),
    'needs_user requires a pending confirmation state'
  );
  expectDatabaseRejection(
    () => insertToolCall(database, 'call-policy-invalid', 'conversation-constraints', {
      decision_allowed: 0,
      decision_reason: 'blocked by policy',
      decision_rule: 'policy-denied',
      decision_provenance: 'denied-by-policy',
    }),
    'a policy-denied call must be cancelled'
  );
  expectDatabaseRejection(
    () => insertToolCall(database, 'call-running-invalid', 'conversation-constraints', {
      status: 'RUNNING',
      decision_allowed: 0,
      decision_needs_user: 1,
      confirmation_state: 'pending',
      decision_provenance: 'pending',
    }),
    'an unapproved call cannot run'
  );
  expectDatabaseRejection(
    () => insertToolCall(database, 'call-success-invalid', 'conversation-constraints', {
      status: 'SUCCESS',
      decision_allowed: 0,
      decision_needs_user: 1,
      confirmation_state: 'pending',
      decision_provenance: 'pending',
    }),
    'an unapproved call cannot succeed'
  );

  insertToolCall(database, 'call-expired-transition', 'conversation-constraints', {
    decision_needs_user: 1,
    decision_allowed: 0,
    decision_provenance: 'pending',
    confirmation_state: 'pending',
  });
  database.prepare(`
    UPDATE tool_calls SET confirmation_state = 'expired', status = 'CANCELLED'
    WHERE id = 'call-expired-transition'
  `).run();
  expectDatabaseRejection(
    () => database.prepare(`
      UPDATE tool_calls SET confirmation_state = 'approved'
      WHERE id = 'call-expired-transition'
    `).run(),
    'expired confirmation cannot be reopened'
  );

  insertToolCall(database, 'call-denied-transition', 'conversation-constraints', {
    decision_needs_user: 1,
    decision_allowed: 0,
    decision_provenance: 'pending',
    confirmation_state: 'pending',
  });
  database.prepare(`
    UPDATE tool_calls SET confirmation_state = 'denied', status = 'CANCELLED'
    WHERE id = 'call-denied-transition'
  `).run();
  expectDatabaseRejection(
    () => database.prepare(`
      UPDATE tool_calls SET confirmation_state = 'approved'
      WHERE id = 'call-denied-transition'
    `).run(),
    'denied confirmation cannot be reopened'
  );

  insertToolCall(database, 'call-approved-expiration', 'conversation-constraints', {
    decision_needs_user: 1,
    decision_provenance: 'pending',
    confirmation_state: 'pending',
  });
  database.prepare(`
    UPDATE tool_calls SET confirmation_state = 'approved' WHERE id = 'call-approved-expiration'
  `).run();
  database.prepare(`
    UPDATE tool_calls SET confirmation_state = 'expired' WHERE id = 'call-approved-expiration'
  `).run();
  assert.equal(
    (database.prepare(`
      SELECT confirmation_state FROM tool_calls WHERE id = 'call-approved-expiration'
    `).get() as { confirmation_state: string }).confirmation_state,
    'expired'
  );

  insertToolCall(database, 'call-terminal-status', 'conversation-constraints', {
    status: 'CANCELLED',
    decision_allowed: 0,
    decision_reason: 'blocked by policy',
    decision_rule: 'policy-denied',
    decision_provenance: 'denied-by-policy',
  });
  expectDatabaseRejection(
    () => database.prepare(`
      UPDATE tool_calls SET status = 'PENDING' WHERE id = 'call-terminal-status'
    `).run(),
    'terminal ToolCall status cannot change'
  );

  insertToolCall(database, 'call-request-immutable', 'conversation-constraints', {
    request_id: 'request-call-request-immutable',
    decision_allowed: 0,
    decision_needs_user: 1,
    decision_provenance: 'pending',
    confirmation_state: 'pending',
    run_id: 'run-original',
  });
  const immutableUpdates: Array<[string, string | number | null]> = [
    ['conversation_id', 'conversation-request-target'],
    ['tool_name', 'update_task'],
    ['arguments_json', '{"changed":true}'],
    ['run_id', 'run-changed'],
    ['request_id', 'request-changed'],
    ['decision_allowed', 1],
    ['decision_needs_user', 0],
    ['decision_human_only', 1],
    ['decision_reason', 'changed'],
    ['decision_rule', 'changed'],
    ['decision_provenance', 'auto'],
  ];
  for (const [column, value] of immutableUpdates) {
    expectDatabaseRejection(
      () => database.prepare(`UPDATE tool_calls SET ${column} = ? WHERE id = ?`)
        .run(value, 'call-request-immutable'),
      `request-bound ${column} must be immutable`
    );
  }

  insertToolCall(database, 'call-audit', 'conversation-constraints', {
    request_id: 'request-call-audit',
    decision_allowed: 0,
    decision_needs_user: 1,
    decision_provenance: 'pending',
    confirmation_state: 'pending',
  });
  insertAudit(database, 'audit-approve', 'call-audit', 'approve');
  insertAudit(database, 'audit-expired', 'call-audit', 'expired');
  expectDatabaseRejection(
    () => insertAudit(database, 'audit-expired-duplicate', 'call-audit', 'expired'),
    'the same audit outcome cannot be appended twice'
  );
  expectDatabaseRejection(
    () => database.prepare(`UPDATE audit_records SET decision_reason = 'changed' WHERE id = ?`)
      .run('audit-approve'),
    'audit records cannot be updated'
  );
  expectDatabaseRejection(
    () => database.prepare('DELETE FROM audit_records WHERE id = ?').run('audit-approve'),
    'audit records cannot be deleted'
  );

  const callsIndex = database.pragma('index_list(conversation_messages)') as Array<{ name: string }>;
  assert.equal(callsIndex.filter((index) => index.name === 'idx_messages_conversation_sequence').length, 0);

  expectDatabaseRejection(
    () => database.prepare(`
      INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)
    `).run('conversation-title-too-long', 'x'.repeat(201), timestamp, timestamp),
    'conversation titles are limited to 200 characters'
  );
  expectDatabaseRejection(
    () => database.prepare(`
      INSERT INTO conversation_messages (
        id, conversation_id, sequence, role, kind, content, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('message-too-large', 'conversation-constraints', 1, 'user', 'text', 'x'.repeat(1048577), timestamp),
    'message content is limited to 1 MiB'
  );
  expectDatabaseRejection(
    () => insertToolCall(database, 'call-arguments-too-large', 'conversation-constraints', {
      arguments_json: JSON.stringify({ value: 'x'.repeat(262144) }),
    }),
    'structured JSON is limited to 256 KiB'
  );
  console.log('[MigrationSmoke] ToolCall constraints, immutable request, state transitions, and append-only audit passed');
}

function runConversationDeletionTests(database: SmokeDatabase): void {
  insertConversation(database, 'conversation-delete');
  database.prepare(`
    INSERT INTO conversation_messages (
      id, conversation_id, sequence, role, kind, content, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('message-delete', 'conversation-delete', 1, 'user', 'text', 'message', timestamp);
  insertToolCall(database, 'call-delete', 'conversation-delete', {
    request_id: 'request-call-delete',
    decision_allowed: 0,
    decision_needs_user: 1,
    decision_provenance: 'pending',
    confirmation_state: 'pending',
  });
  insertAudit(database, 'audit-delete-retained', 'call-delete', 'approve');
  database.prepare('DELETE FROM conversations WHERE id = ?').run('conversation-delete');

  assert.equal(database.prepare('SELECT id FROM conversation_messages WHERE id = ?').get('message-delete'), undefined);
  assert.equal(database.prepare('SELECT id FROM tool_calls WHERE id = ?').get('call-delete'), undefined);
  assert.notEqual(database.prepare('SELECT id FROM audit_records WHERE id = ?').get('audit-delete-retained'), undefined);
  console.log('[MigrationSmoke] conversation cascade and detached audit retention passed');
}

async function runConversationMigrationIsolationTest(
  temporaryDirectory: string,
  migrationsDirectory: string
): Promise<void> {
  const isolatedMigrations = path.join(temporaryDirectory, 'broken-migrations');
  fs.mkdirSync(isolatedMigrations);
  fs.copyFileSync(path.join(migrationsDirectory, '001_init.sql'), path.join(isolatedMigrations, '001_init.sql'));
  fs.writeFileSync(path.join(isolatedMigrations, '002_conversations.sql'), 'CREATE TABLE broken (');

  const isolatedManager = new DatabaseManager({
    databasePath: path.join(temporaryDirectory, 'isolated.db'),
  });
  await isolatedManager.init();
  try {
    const database = isolatedManager.getConnection();
    const runner = new MigrationRunner(database, isolatedMigrations);
    assert.deepEqual(runner.run(['001_init.sql']).applied, ['001_init.sql']);
    assert.throws(() => runner.run(['002_conversations.sql']));
    database.prepare(`
      INSERT INTO tasks (
        id, title, description, status, priority, due_at, completed_at, created_at, updated_at,
        source, category, tags_json, context_id
      ) VALUES (
        @id, @title, @description, @status, @priority, @due_at, @completed_at, @created_at,
        @updated_at, @source, @category, @tags_json, @context_id
      )
    `).run(taskValues('task-survives-conversation-migration-failure'));
    assert.equal(
      (database.prepare('SELECT COUNT(*) AS count FROM tasks').get() as { count: number }).count,
      1
    );
  } finally {
    await isolatedManager.close();
  }
  console.log('[MigrationSmoke] failed Conversation migration leaves Task database usable');
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
    assert.deepEqual(firstRun.applied, ['001_init.sql', '002_conversations.sql']);
    assert.deepEqual(firstRun.skipped, []);

    const tables = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as Array<{ name: string }>;
    assert.deepEqual(tables.map((table) => table.name), [
      'audit_records',
      'conversation_messages',
      'conversations',
      'schema_migrations',
      'tasks',
      'tool_calls',
    ]);
    assert.equal((database.pragma('foreign_keys') as Array<{ foreign_keys: number }>)[0]?.foreign_keys, 1);

    const migrationRows = database
      .prepare('SELECT migration_id FROM schema_migrations ORDER BY migration_id')
      .all() as Array<{ migration_id: string }>;
    assert.deepEqual(migrationRows, [
      { migration_id: '001_init.sql' },
      { migration_id: '002_conversations.sql' },
    ]);

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
    assert.deepEqual(secondRun.skipped, ['001_init.sql', '002_conversations.sql']);
    const taskCount = database.prepare('SELECT COUNT(*) AS count FROM tasks').get() as { count: number };
    assert.equal(taskCount.count, 2);

    await manager.close();
    manager = new DatabaseManager({ databasePath });
    await manager.init();

    const reopenedDatabase = manager.getConnection();
    const restartRun = new MigrationRunner(reopenedDatabase, migrationsDirectory).run();
    assert.deepEqual(restartRun.applied, []);
    assert.deepEqual(restartRun.skipped, ['001_init.sql', '002_conversations.sql']);
    const reopenedTaskCount = reopenedDatabase
      .prepare('SELECT COUNT(*) AS count FROM tasks')
      .get() as { count: number };
    assert.equal(reopenedTaskCount.count, 2);
    const migrationCount = reopenedDatabase
      .prepare('SELECT COUNT(*) AS count FROM schema_migrations')
      .get() as { count: number };
    assert.equal(
      migrationCount.count,
      2
    );

    runConversationConstraintTests(reopenedDatabase);
    runConversationDeletionTests(reopenedDatabase);
    await runConversationMigrationIsolationTest(temporaryDirectory, migrationsDirectory);

    console.log('[MigrationSmoke] Task and Conversation schemas, constraints, trigger transitions, audit append-only, cascade, migration idempotency/isolation, and restart persistence passed');
  } finally {
    await manager.close();
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

runMigrationSmokeTest().catch((error) => {
  console.error('[MigrationSmoke] failed:', error);
  process.exitCode = 1;
});
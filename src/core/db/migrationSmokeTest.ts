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

function insertMessage(
  database: ReturnType<DatabaseManager['getConnection']>,
  id: string,
  conversationId: string,
  sequence: number,
  overrides: {
    role?: string;
    kind?: string;
    content?: string;
    contextSnapshotJson?: string | null;
  } = {}
): void {
  database.prepare(`
    INSERT INTO conversation_messages (
      id, conversation_id, sequence, role, kind, content, context_snapshot_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    conversationId,
    sequence,
    overrides.role ?? 'user',
    overrides.kind ?? 'text',
    overrides.content ?? 'message',
    overrides.contextSnapshotJson ?? null,
    timestamp
  );
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
    run_id: `run-${id}`,
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
  userChoice: string | null,
  options: {
    runId?: string | null;
    approvalOrigin?: string | null;
    decisionAllowed?: number;
    decisionNeedsUser?: number;
    decisionProvenance?: string;
  } = {}
): void {
  const needsUser = userChoice !== 'not_required' && userChoice !== null;
  const decisionAllowed = options.decisionAllowed ?? (needsUser ? 0 : 1);
  const decisionNeedsUser = options.decisionNeedsUser ?? (needsUser ? 1 : 0);
  const decisionProvenance = options.decisionProvenance ?? (needsUser ? 'pending' : 'auto');
  const approvalOrigin = options.approvalOrigin === undefined
    ? (userChoice === 'approve' || userChoice === 'deny' ? 'ui' : null)
    : options.approvalOrigin;
  database.prepare(`
    INSERT INTO audit_records (
      id, tool_call_id_snapshot, request_id_snapshot, conversation_id_snapshot, tool_name, run_id,
      decision_allowed, decision_needs_user, decision_human_only, decision_reason,
      decision_rule, decision_provenance, user_choice, approval_origin, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, toolCallId, `request-${toolCallId}`, `conversation-${toolCallId}`, 'create_task',
    options.runId === undefined ? 'run-1' : options.runId,
    decisionAllowed, decisionNeedsUser, 0, 'audit decision', 'test-rule', decisionProvenance,
    userChoice, approvalOrigin, timestamp
  );
}

type SmokeDatabase = ReturnType<DatabaseManager['getConnection']>;

function expectDatabaseRejection(action: () => unknown, label: string): void {
  assert.throws(action, undefined, label);
}

function runConversationConstraintTests(database: SmokeDatabase): void {
  insertConversation(database, 'conversation-constraints');
  insertConversation(database, 'conversation-request-target');

  const missingRequestIdCases: Array<{
    state: string;
    status: string;
    label: string;
  }> = [
    { state: 'pending', status: 'PENDING', label: 'pending' },
    { state: 'approved', status: 'PENDING', label: 'approved' },
    { state: 'denied', status: 'CANCELLED', label: 'denied' },
    { state: 'expired', status: 'CANCELLED', label: 'expired' },
  ];
  for (const { state, status, label } of missingRequestIdCases) {
    expectDatabaseRejection(
      () => insertToolCall(database, `call-${label}-without-request-id`, 'conversation-constraints', {
        decision_allowed: 0,
        decision_needs_user: 1,
        decision_provenance: 'pending',
        confirmation_state: state,
        status,
      }),
      `${label} confirmation requires a request ID`
    );
  }

  insertToolCall(database, 'call-null-request-one', 'conversation-constraints');
  insertToolCall(database, 'call-null-request-two', 'conversation-constraints');
  console.log('[MigrationSmoke] null request IDs remain non-unique');

  insertToolCall(database, 'call-request-id-first', 'conversation-constraints', {
    request_id: 'request-unique',
    decision_allowed: 0,
    decision_needs_user: 1,
    decision_provenance: 'pending',
    confirmation_state: 'pending',
  });
  expectDatabaseRejection(
    () => insertToolCall(database, 'call-request-id-duplicate', 'conversation-constraints', {
      request_id: 'request-unique',
      decision_allowed: 0,
      decision_needs_user: 1,
      decision_provenance: 'pending',
      confirmation_state: 'pending',
    }),
    'request IDs are unique when present'
  );

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
      request_id: 'request-call-running-invalid',
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
      request_id: 'request-call-success-invalid',
    }),
    'an unapproved call cannot succeed'
  );
  expectDatabaseRejection(
    () => insertToolCall(database, 'call-pending-status-invalid', 'conversation-constraints', {
      status: 'FAILED',
      decision_allowed: 0,
      decision_needs_user: 1,
      confirmation_state: 'pending',
      decision_provenance: 'pending',
      request_id: 'request-pending-status-invalid',
    }),
    'a pending confirmation must have PENDING status'
  );
  for (const state of ['denied', 'expired']) {
    expectDatabaseRejection(
      () => insertToolCall(database, `call-${state}-status-invalid`, 'conversation-constraints', {
        status: 'PENDING',
        decision_allowed: 0,
        decision_needs_user: 1,
        confirmation_state: state,
        decision_provenance: 'pending',
        request_id: `request-${state}-status-invalid`,
      }),
      `${state} confirmation must have CANCELLED status`
    );
  }
  expectDatabaseRejection(
    () => insertToolCall(database, 'call-allowed-needs-user-invalid', 'conversation-constraints', {
      request_id: 'request-allowed-needs-user-invalid',
      decision_allowed: 1,
      decision_needs_user: 1,
      confirmation_state: 'pending',
      decision_provenance: 'pending',
    }),
    'a decision cannot be both allowed and requiring a user'
  );
  expectDatabaseRejection(
    () => insertToolCall(database, 'call-null-run-id', 'conversation-constraints', {
      run_id: null,
    }),
    'ToolCall run_id is required'
  );

  const validDecisionCases = [
    {
      id: 'call-decision-auto-valid',
      decision_allowed: 1,
      decision_needs_user: 0,
      decision_provenance: 'auto',
      confirmation_state: 'not_required',
      status: 'PENDING',
    },
    {
      id: 'call-decision-pending-valid',
      decision_allowed: 0,
      decision_needs_user: 1,
      decision_provenance: 'pending',
      confirmation_state: 'pending',
      request_id: 'request-call-decision-pending-valid',
      status: 'PENDING',
    },
    {
      id: 'call-decision-policy-valid',
      decision_allowed: 0,
      decision_needs_user: 0,
      decision_provenance: 'denied-by-policy',
      confirmation_state: 'not_required',
      status: 'CANCELLED',
    },
  ];
  for (const decisionCase of validDecisionCases) {
    insertToolCall(database, decisionCase.id, 'conversation-constraints', decisionCase);
  }
  console.log('[MigrationSmoke] all three ToolCall decision combinations are accepted');
  const invalidDecisionCases = [
    { allowed: 1, needsUser: 0, provenance: 'pending', label: 'allowed with pending provenance' },
    { allowed: 1, needsUser: 0, provenance: 'denied-by-policy', label: 'allowed with policy-denied provenance' },
    { allowed: 1, needsUser: 1, provenance: 'auto', label: 'allowed while requiring user' },
    { allowed: 1, needsUser: 1, provenance: 'pending', label: 'allowed and pending' },
    { allowed: 1, needsUser: 1, provenance: 'denied-by-policy', label: 'allowed and policy denied' },
    { allowed: 0, needsUser: 0, provenance: 'auto', label: 'denied without policy provenance' },
    { allowed: 0, needsUser: 0, provenance: 'pending', label: 'denied with pending provenance' },
    { allowed: 0, needsUser: 1, provenance: 'auto', label: 'pending decision with automatic provenance' },
    { allowed: 0, needsUser: 1, provenance: 'denied-by-policy', label: 'pending decision with policy-denied provenance' },
  ];
  for (let index = 0; index < invalidDecisionCases.length; index += 1) {
    const decisionCase = invalidDecisionCases[index]!;
    const needsUser = decisionCase.needsUser;
    expectDatabaseRejection(
      () => insertToolCall(database, `call-invalid-decision-${index}`, 'conversation-constraints', {
        decision_allowed: decisionCase.allowed,
        decision_needs_user: needsUser,
        decision_provenance: decisionCase.provenance,
        confirmation_state: needsUser ? 'pending' : 'not_required',
        request_id: needsUser ? `request-invalid-decision-${index}` : null,
        status: decisionCase.allowed || needsUser ? 'PENDING' : 'CANCELLED',
      }),
      `ToolCall rejects ${decisionCase.label}`
    );
  }

  insertToolCall(database, 'call-expired-transition', 'conversation-constraints', {
    request_id: 'request-call-expired-transition',
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
    request_id: 'request-call-denied-transition',
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
    request_id: 'request-call-approved-expiration',
    decision_allowed: 0,
    decision_needs_user: 1,
    decision_provenance: 'pending',
    confirmation_state: 'pending',
  });
  database.prepare(`
    UPDATE tool_calls SET confirmation_state = 'approved' WHERE id = 'call-approved-expiration'
  `).run();
  database.prepare(`
    UPDATE tool_calls
    SET confirmation_state = 'expired', status = 'CANCELLED'
    WHERE id = 'call-approved-expiration'
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

  insertToolCall(database, 'call-no-request-immutable', 'conversation-constraints');
  const noRequestImmutableUpdates: Array<[string, string | number | null]> = [
    ['arguments_json', '{"changed":true}'],
    ['decision_allowed', 0],
    ['decision_needs_user', 1],
    ['decision_human_only', 1],
    ['decision_reason', 'changed'],
    ['decision_rule', 'changed'],
    ['decision_provenance', 'pending'],
  ];
  for (const [column, value] of noRequestImmutableUpdates) {
    expectDatabaseRejection(
      () => database.prepare(`UPDATE tool_calls SET ${column} = ? WHERE id = ?`)
        .run(value, 'call-no-request-immutable'),
      `requestless ${column} must be immutable`
    );
  }
  console.log('[MigrationSmoke] requestless arguments and decision metadata are immutable');

  insertToolCall(database, 'call-mutable-state', 'conversation-constraints', {
    request_id: 'request-call-mutable-state',
    decision_allowed: 0,
    decision_needs_user: 1,
    decision_provenance: 'pending',
    confirmation_state: 'pending',
  });
  database.prepare(`
    UPDATE tool_calls SET confirmation_state = 'approved' WHERE id = 'call-mutable-state'
  `).run();
  database.prepare(`
    UPDATE tool_calls SET status = 'RUNNING' WHERE id = 'call-mutable-state'
  `).run();
  database.prepare(`
    UPDATE tool_calls SET result_json = '{"ok":true}', error_text = 'cleared', updated_at = ?
    WHERE id = 'call-mutable-state'
  `).run('2026-10-05T00:00:00.000Z');
  database.prepare(`
    UPDATE tool_calls SET status = 'SUCCESS' WHERE id = 'call-mutable-state'
  `).run();
  assert.equal(
    (database.prepare(`
      SELECT status, confirmation_state, result_json, error_text, updated_at
      FROM tool_calls WHERE id = 'call-mutable-state'
    `).get() as {
      status: string;
      confirmation_state: string;
      result_json: string;
      error_text: string;
      updated_at: string;
    }).status,
    'SUCCESS'
  );
  console.log('[MigrationSmoke] mutable ToolCall execution fields remain updateable');

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
  const validAuditDecisionCases = [
    {
      callId: 'call-audit-decision-auto',
      choice: 'not_required',
      decisionAllowed: 1,
      decisionNeedsUser: 0,
      decisionProvenance: 'auto',
    },
    {
      callId: 'call-audit-decision-pending',
      choice: 'approve',
      decisionAllowed: 0,
      decisionNeedsUser: 1,
      decisionProvenance: 'pending',
    },
    {
      callId: 'call-audit-decision-policy',
      choice: 'not_required',
      decisionAllowed: 0,
      decisionNeedsUser: 0,
      decisionProvenance: 'denied-by-policy',
    },
  ] as const;
  for (const [index, decisionCase] of validAuditDecisionCases.entries()) {
    insertAudit(database, `audit-valid-decision-${index}`, decisionCase.callId, decisionCase.choice, {
      decisionAllowed: decisionCase.decisionAllowed,
      decisionNeedsUser: decisionCase.decisionNeedsUser,
      decisionProvenance: decisionCase.decisionProvenance,
    });
  }
  console.log('[MigrationSmoke] all three audit decision combinations are accepted');
  for (let index = 0; index < invalidDecisionCases.length; index += 1) {
    const decisionCase = invalidDecisionCases[index]!;
    const needsUser = decisionCase.needsUser;
    expectDatabaseRejection(
      () => insertAudit(
        database,
        `audit-invalid-decision-${index}`,
        `call-audit-invalid-decision-${index}`,
        needsUser ? 'approve' : 'not_required',
        {
          decisionAllowed: decisionCase.allowed,
          decisionNeedsUser: needsUser,
          decisionProvenance: decisionCase.provenance,
        }
      ),
      `audit rejects ${decisionCase.label}`
    );
  }
  for (const choice of ['approve', 'deny', 'expired'] as const) {
    expectDatabaseRejection(
      () => insertAudit(database, `audit-${choice}-without-user-need`, `call-audit-${choice}-without-user-need`, choice, {
        decisionAllowed: 0,
        decisionNeedsUser: 0,
        decisionProvenance: 'denied-by-policy',
      }),
      `${choice} audit requires decision_needs_user`
    );
  }
  expectDatabaseRejection(
    () => insertAudit(
      database,
      'audit-not-required-with-user-need',
      'call-audit-not-required-with-user-need',
      'not_required',
      {
        decisionAllowed: 0,
        decisionNeedsUser: 1,
        decisionProvenance: 'pending',
      }
    ),
    'not_required audit forbids decision_needs_user'
  );
  expectDatabaseRejection(
    () => insertAudit(database, 'audit-null-choice', 'call-audit-null-choice', null),
    'audit user_choice is required'
  );
  expectDatabaseRejection(
    () => insertAudit(database, 'audit-empty-choice', 'call-audit-empty-choice', ''),
    'empty audit user_choice is invalid'
  );
  expectDatabaseRejection(
    () => insertAudit(database, 'audit-approve-without-origin', 'call-audit-no-approve-origin', 'approve', {
      approvalOrigin: null,
    }),
    'approve audit requires UI origin'
  );
  expectDatabaseRejection(
    () => insertAudit(database, 'audit-deny-without-origin', 'call-audit-no-deny-origin', 'deny', {
      approvalOrigin: null,
    }),
    'deny audit requires UI origin'
  );
  for (const choice of ['expired', 'not_required'] as const) {
    expectDatabaseRejection(
      () => insertAudit(database, `audit-${choice}-with-origin`, `call-audit-${choice}-origin`, choice, {
        approvalOrigin: 'ui',
      }),
      `${choice} audit cannot claim UI approval origin`
    );
  }
  expectDatabaseRejection(
    () => insertAudit(database, 'audit-invalid-origin', 'call-audit-invalid-origin', 'approve', {
      approvalOrigin: 'automatic',
    }),
    'audit approval origin must be ui'
  );
  for (const choice of ['approve', 'deny', 'not_required'] as const) {
    const callId = `call-audit-duplicate-${choice}`;
    insertAudit(database, `audit-${choice}-first`, callId, choice);
    expectDatabaseRejection(
      () => insertAudit(database, `audit-${choice}-duplicate`, callId, choice),
      `${choice} audit outcome cannot be appended twice for one call`
    );
  }
  expectDatabaseRejection(
    () => insertAudit(database, 'audit-null-run-id', 'call-audit-null-run-id', 'approve', {
      runId: null,
    }),
    'audit run_id is required'
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
  const toolCallIndexes = (database.pragma('index_list(tool_calls)') as Array<{ name: string }>)
    .map((index) => index.name);
  assert(toolCallIndexes.includes('uq_tool_calls_request_id'));
  assert(toolCallIndexes.includes('idx_tool_calls_conversation_created'));
  assert(toolCallIndexes.includes('idx_tool_calls_confirmation_status'));
  expectDatabaseRejection(
    () => insertMessage(database, 'message-old-confirmation-kind', 'conversation-constraints', 1, {
      role: 'assistant',
      kind: 'confirmation',
      content: 'data',
    }),
    "legacy 'confirmation' message kind is rejected"
  );
  const invalidMessageCases: Array<{
    id: string;
    contextSnapshotJson: string;
    label: string;
  }> = [
    {
      id: 'message-invalid-context-json',
      contextSnapshotJson: '{invalid',
      label: 'message context snapshot must be valid JSON',
    },
    {
      id: 'message-context-too-large',
      contextSnapshotJson: JSON.stringify({ value: 'x'.repeat(262145) }),
      label: 'message context snapshot is limited to 256 KiB',
    },
  ];
  for (const testCase of invalidMessageCases) {
    expectDatabaseRejection(
      () => insertMessage(database, testCase.id, 'conversation-constraints', 1, {
        content: 'data',
        contextSnapshotJson: testCase.contextSnapshotJson,
      }),
      testCase.label
    );
  }

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
  insertMessage(database, 'message-delete', 'conversation-delete', 1);
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
CREATE TABLE conversations (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL CHECK (length(title) <= 200),
  project_id TEXT,
  is_pinned INTEGER NOT NULL DEFAULT 0 CHECK (is_pinned IN (0, 1)),
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
  context_snapshot_json TEXT CHECK (
    context_snapshot_json IS NULL OR
    (json_valid(context_snapshot_json) AND length(CAST(context_snapshot_json AS BLOB)) <= 262144)
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_conversations_list
  ON conversations (is_pinned DESC, updated_at DESC, id DESC);

CREATE TABLE conversation_messages (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  kind TEXT NOT NULL CHECK (kind IN ('text', 'tool_call', 'tool_result', 'confirmation', 'error')),
  content TEXT NOT NULL CHECK (length(CAST(content AS BLOB)) <= 1048576),
  metadata_json TEXT CHECK (
    metadata_json IS NULL OR
    (json_valid(metadata_json) AND length(CAST(metadata_json AS BLOB)) <= 262144)
  ),
  context_snapshot_json TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (conversation_id, sequence)
);

CREATE TABLE tool_calls (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  arguments_json TEXT NOT NULL CHECK (
    json_valid(arguments_json) AND length(CAST(arguments_json AS BLOB)) <= 262144
  ),
  result_json TEXT CHECK (
    result_json IS NULL OR
    (json_valid(result_json) AND length(CAST(result_json AS BLOB)) <= 262144)
  ),
  run_id TEXT,
  request_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED')),
  confirmation_state TEXT NOT NULL CHECK (
    confirmation_state IN ('not_required', 'pending', 'approved', 'denied', 'expired')
  ),
  decision_allowed INTEGER NOT NULL CHECK (decision_allowed IN (0, 1)),
  decision_needs_user INTEGER NOT NULL CHECK (decision_needs_user IN (0, 1)),
  decision_human_only INTEGER NOT NULL CHECK (decision_human_only IN (0, 1)),
  decision_reason TEXT NOT NULL,
  decision_rule TEXT,
  decision_provenance TEXT NOT NULL CHECK (
    decision_provenance IN ('auto', 'pending', 'denied-by-policy')
  ),
  error_text TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  CHECK (
    (decision_needs_user = 1 AND confirmation_state <> 'not_required') OR
    (decision_needs_user = 0 AND confirmation_state = 'not_required')
  ),
  CHECK (confirmation_state <> 'not_required' OR request_id IS NULL),
  CHECK (NOT (decision_allowed = 0 AND decision_needs_user = 0) OR status = 'CANCELLED'),
  CHECK (status NOT IN ('RUNNING', 'SUCCESS') OR decision_allowed = 1 OR confirmation_state = 'approved')
);

CREATE TRIGGER trg_tool_calls_request_immutable
BEFORE UPDATE ON tool_calls
WHEN OLD.request_id IS NOT NULL OR NEW.request_id IS NOT NULL
BEGIN
  SELECT CASE WHEN
    OLD.conversation_id IS NOT NEW.conversation_id OR
    OLD.tool_name IS NOT NEW.tool_name OR
    OLD.arguments_json IS NOT NEW.arguments_json OR
    OLD.run_id IS NOT NEW.run_id OR
    OLD.request_id IS NOT NEW.request_id OR
    OLD.decision_allowed IS NOT NEW.decision_allowed OR
    OLD.decision_needs_user IS NOT NEW.decision_needs_user OR
    OLD.decision_human_only IS NOT NEW.decision_human_only OR
    OLD.decision_reason IS NOT NEW.decision_reason OR
    OLD.decision_rule IS NOT NEW.decision_rule OR
    OLD.decision_provenance IS NOT NEW.decision_provenance
  THEN RAISE(ABORT, 'tool call request and decision are immutable') END;
END;

CREATE TRIGGER trg_tool_calls_confirmation_transition
BEFORE UPDATE OF confirmation_state ON tool_calls
WHEN OLD.confirmation_state IS NOT NEW.confirmation_state
BEGIN
  SELECT CASE WHEN NOT (
    (OLD.confirmation_state = 'pending' AND NEW.confirmation_state IN ('approved', 'denied', 'expired')) OR
    (OLD.confirmation_state = 'approved' AND NEW.confirmation_state = 'expired')
  ) THEN RAISE(ABORT, 'invalid confirmation state transition') END;
END;

CREATE TRIGGER trg_tool_calls_terminal_status
BEFORE UPDATE OF status ON tool_calls
WHEN OLD.status IN ('SUCCESS', 'FAILED', 'CANCELLED') AND OLD.status IS NOT NEW.status
BEGIN
  SELECT RAISE(ABORT, 'terminal tool call status cannot change');
END;

CREATE TABLE audit_records (
  id TEXT PRIMARY KEY NOT NULL,
  tool_call_id_snapshot TEXT,
  request_id_snapshot TEXT,
  conversation_id_snapshot TEXT,
  tool_name TEXT NOT NULL,
  run_id TEXT,
  decision_allowed INTEGER NOT NULL CHECK (decision_allowed IN (0, 1)),
  decision_needs_user INTEGER NOT NULL CHECK (decision_needs_user IN (0, 1)),
  decision_human_only INTEGER NOT NULL CHECK (decision_human_only IN (0, 1)),
  decision_reason TEXT NOT NULL,
  decision_rule TEXT,
  decision_provenance TEXT NOT NULL CHECK (
    decision_provenance IN ('auto', 'pending', 'denied-by-policy')
  ),
  user_choice TEXT CHECK (user_choice IS NULL OR user_choice IN ('approve', 'deny', 'expired')),
  created_at TEXT NOT NULL
);

CREATE INDEX idx_audit_records_request_id_snapshot
  ON audit_records (request_id_snapshot);
CREATE UNIQUE INDEX uq_audit_tool_call_user_choice
  ON audit_records (tool_call_id_snapshot, user_choice)
  WHERE tool_call_id_snapshot IS NOT NULL;

CREATE TRIGGER trg_audit_records_no_update
BEFORE UPDATE ON audit_records
BEGIN
  SELECT RAISE(ABORT, 'audit records are append-only');
END;

CREATE TRIGGER trg_audit_records_no_delete
BEFORE DELETE ON audit_records
BEGIN
  SELECT RAISE(ABORT, 'audit records are append-only');
END;

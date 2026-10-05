CREATE TABLE IF NOT EXISTS schema_migrations (
  migration_id TEXT PRIMARY KEY NOT NULL,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  due_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('MANUAL', 'AI', 'FLOATING_BALL', 'SYSTEM', 'IMPORTED')),
  category TEXT,
  tags_json TEXT,
  context_id TEXT
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_at ON tasks(due_at);
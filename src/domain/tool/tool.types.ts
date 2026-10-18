/**
 * Tool Domain Types & Enums
 * 工具调用状态、定义与执行上下文
 */

export enum ToolCallStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum ToolRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export type ToolInvocationSource = 'assistant' | 'floating_ball' | 'dashboard' | 'system';

export type RiskClass = 'read' | 'egress' | 'external' | 'write_local' | 'exec';
export type Mode = 'discuss' | 'interactive';
export type ToolSource = 'internal' | 'mcp';
export type ConfirmPolicy = 'none' | 'always';
export type Provenance = 'auto' | 'pending' | 'denied-by-policy';
export type ConfirmationState = 'not_required' | 'pending' | 'approved' | 'denied' | 'expired';

/**
 * Planned list_tasks status filter only: all excludes CANCELLED; default limit
 * is 50 and maximum is 100. No query behavior is implemented in this phase.
 */
export type ListTasksStatus = 'all' | 'pending' | 'in_progress' | 'completed';

export interface ToolMetadata {
  name: string;
  source: ToolSource;
  category: string;
  capabilities: readonly string[];
  riskClass: RiskClass;
  confirm: ConfirmPolicy;
  humanOnly: boolean;
  batchEscalateAbove?: number;
}

export interface Decision {
  allowed: boolean;
  needsUser: boolean;
  humanOnly: boolean;
  reason: string;
  rule?: string;
  provenance: Provenance;
}

export interface EvaluateInput {
  toolName: string;
  tool: ToolMetadata | undefined;
  mode: Mode;
  affectedCount?: number;
}

export interface AuditRecord {
  id: string;
  toolCallIdSnapshot: string | null;
  requestIdSnapshot: string | null;
  conversationIdSnapshot: string | null;
  toolName: string;
  runId: string;
  decision: Decision;
  userChoice: 'approve' | 'deny' | 'not_required' | 'expired';
  approvalOrigin: 'ui' | null;
  createdAt: string;
}

/**
 * Approval must originate from the UI confirmation channel. Text returned by a
 * tool or found in task titles, knowledge documents, or messages is not consent.
 */
export interface UserApproval {
  origin: 'ui';
  requestId: string;
  decision: 'approve' | 'deny';
  at: number;
}

export interface ToolExecutionContext {
  runId: string;
  conversationId: string;
  source: ToolInvocationSource;
  permissions: string[];
  metadata?: Record<string, unknown>;
}

export interface ToolDefinition<TInput = Record<string, unknown>> {
  name: string;
  description: string;
  inputSchema?: unknown;
  riskLevel: ToolRiskLevel;
  requiresConfirmation: boolean;
  execute?: (input: TInput, context: ToolExecutionContext) => Promise<unknown>;
}

export interface ToolCall {
  toolCallId: string;
  conversationId: string;
  runId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  requestId: string | null;
  confirmationState: ConfirmationState;
  decision: Decision;
  status: ToolCallStatus;
  result?: unknown;
  errorText?: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt?: string;
}

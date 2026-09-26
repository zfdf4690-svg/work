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

export type ToolSource = 'assistant' | 'floating_ball' | 'dashboard' | 'system';

export interface ToolExecutionContext {
  runId: string;
  conversationId: string;
  source: ToolSource;
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
  runId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  status: ToolCallStatus;
  result?: unknown;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

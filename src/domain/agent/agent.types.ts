/**
 * Agent Domain Types
 * Agent 运行切片、执行状态与恢复契约
 */

import { AgentRunStatus } from './agent.enums';
import { ToolCall } from '../tool/tool.types';

export interface AgentRun {
  runId: string;
  conversationId: string;
  status: AgentRunStatus;
  currentToolCallId?: string;
  toolCalls: ToolCall[];
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface ResumeConfirmationInput {
  runId: string;
  toolCallId: string;
  approved: boolean;
  userInput?: string;
}

export interface AgentExecutionState {
  currentRun?: AgentRun;
  activeToolCalls: ToolCall[];
  isStreaming: boolean;
  canInterrupt: boolean;
}

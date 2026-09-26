/**
 * Domain Event Types
 * 事件总线发布/订阅契约 (Event Bus -> IPC Broadcast -> Store)
 */

import { Task, TaskChanges } from '../task/task.types';
import { AgentRun } from '../agent/agent.types';
import { ToolCall } from '../tool/tool.types';

export interface TaskCreatedEventPayload {
  task: Task;
}

export interface TaskUpdatedEventPayload {
  task: Task;
  changes: TaskChanges;
}

export interface TaskCompletedEventPayload {
  taskId: string;
  completedAt: string;
  task: Task;
}

export interface TaskDeletedEventPayload {
  taskId: string;
}

export interface AgentRunStartedEventPayload {
  run: AgentRun;
}

export interface AgentRunUpdatedEventPayload {
  run: AgentRun;
}

export interface ToolCallStartedEventPayload {
  toolCall: ToolCall;
}

export interface ToolCallCompletedEventPayload {
  toolCall: ToolCall;
}

export type EventType =
  | 'task:created'
  | 'task:updated'
  | 'task:completed'
  | 'task:deleted'
  | 'agent:run_started'
  | 'agent:run_updated'
  | 'agent:tool_started'
  | 'agent:tool_completed';

export interface DomainEvent<T = unknown> {
  id: string;
  type: EventType;
  payload: T;
  timestamp: string;
}

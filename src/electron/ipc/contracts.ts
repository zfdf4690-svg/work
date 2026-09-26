/**
 * Typed IPC Request / Response Contracts
 * 严密类型化的 IPC 请求与响应契约定义
 */

import {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
  ResumeConfirmationInput,
  EventType,
  DomainEvent,
} from '../../domain';
import { IpcResult } from './errorContract';

// ==========================================
// 1. Task Domain IPC Contracts
// ==========================================

export type TaskCreateRequest = CreateTaskInput;
export type TaskCreateResponse = IpcResult<Task>;

export type TaskUpdateRequest = UpdateTaskInput;
export type TaskUpdateResponse = IpcResult<Task>;

export interface TaskCompleteRequest {
  id: string;
}
export type TaskCompleteResponse = IpcResult<Task>;

export interface TaskDeleteRequest {
  id: string;
  confirmed: boolean;
}
export type TaskDeleteResponse = IpcResult<{ id: string; deleted: boolean }>;

export interface TaskGetRequest {
  id: string;
}
export type TaskGetResponse = IpcResult<Task>;

export type TaskListRequest = TaskFilter | undefined;
export type TaskListResponse = IpcResult<Task[]>;

// ==========================================
// 2. Agent Domain IPC Contracts
// ==========================================

export type AgentResumeConfirmationRequest = ResumeConfirmationInput;
export type AgentResumeConfirmationResponse = IpcResult<{
  resumed: boolean;
  runId: string;
}>;

export interface AgentInterruptRequest {
  runId: string;
  reason?: string;
}
export type AgentInterruptResponse = IpcResult<{
  interrupted: boolean;
  runId: string;
}>;

// ==========================================
// 3. Event & Subscription Contracts
// ==========================================

export interface EventSubscribeRequest {
  eventTypes: EventType[];
}
export type EventSubscribeResponse = IpcResult<{ subscribed: boolean }>;

export interface EventBroadcastPayload {
  event: DomainEvent;
}

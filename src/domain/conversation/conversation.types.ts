/**
 * Conversation & Context Domain Types
 * 会话、消息以及 ContextSnapshot 最小契约
 */

import { TaskSummary } from '../task/task.types';

export interface FileReference {
  id: string;
  name: string;
  path: string;
  size?: number;
  mimeType?: string;
}

export interface KnowledgeReference {
  id: string;
  title: string;
  path?: string;
  excerpt?: string;
}

export interface ContextSnapshot {
  conversationId: string;
  currentTask?: TaskSummary;
  selectedFiles: FileReference[];
  knowledgeRefs: KnowledgeReference[];
  projectId?: string;
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';
export type MessageKind = 'text' | 'tool_call' | 'tool_result' | 'confirmation_request' | 'error';

export interface ConversationMessage {
  id: string;
  conversationId: string;
  sequence: number;
  role: MessageRole;
  kind: MessageKind;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  projectId?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
  contextSnapshot?: ContextSnapshot;
}

/**
 * Conversation & Context Domain Types
 * 会话、消息以及 ContextSnapshot 最小契约
 */

import { TaskSummary } from '../task/task.types';
import { ToolCall } from '../tool/tool.types';

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

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  contextSnapshot?: ContextSnapshot;
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

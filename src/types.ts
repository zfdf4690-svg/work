export type TaskPriority = 'high' | 'medium' | 'low' | 'normal';

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  priority: TaskPriority;
  dueTime: string;
  category?: string;
  isImportant?: boolean;
}

export interface AISuggestion {
  id: string;
  title: string;
  badge?: string;
  targetTool: string;
  steps: ToolStep[];
}

export type ToolStatus = 'pending' | 'running' | 'success' | 'failed';

export interface ToolStep {
  id: string;
  toolName: string;
  label: string;
  status: ToolStatus;
  detail?: string;
  resultSummary?: string;
}

export interface ActionConfirmData {
  id: string;
  actionType: 'create_task' | 'sync_feishu' | 'export_doc' | 'delete_context';
  title: string;
  description: string;
  payload: Record<string, string>;
  confirmed?: boolean;
  cancelled?: boolean;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  category: string;
  timeAgo: string;
  iconType: 'mcp' | 'methodology' | 'agent' | 'doc';
  readTime: string;
  summary: string;
  tags: string[];
}

export type ContextType = 'task' | 'knowledge' | 'file' | 'project';

export interface ContextItem {
  id: string;
  type: ContextType;
  name: string;
  detail?: string;
  active: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolSteps?: ToolStep[];
  actionConfirmation?: ActionConfirmData;
}

export type NavTab = 
  | 'dashboard'
  | 'ai-assistant'
  | 'knowledge'
  | 'docs'
  | 'skills'
  | 'settings';

export type ViewportMode = 'responsive' | 'desktop' | 'tablet' | 'mobile';

export interface MeetingInfo {
  title: string;
  time: string;
  platform: string;
  participants: { name: string; avatarBg: string }[];
  link: string;
}

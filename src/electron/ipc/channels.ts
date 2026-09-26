/**
 * IPC Channels Constants
 * 集中管理的 IPC 通道名称常量
 */

export const IPC_CHANNELS = {
  // Task Domain Channels
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_COMPLETE: 'task:complete',
  TASK_DELETE: 'task:delete',
  TASK_GET: 'task:get',
  TASK_LIST: 'task:list',

  // Agent Domain Channels
  AGENT_RESUME_CONFIRMATION: 'agent:resume-confirmation',
  AGENT_INTERRUPT: 'agent:interrupt',

  // Event & Broadcast Channels
  EVENT_SUBSCRIBE: 'event:subscribe',
  EVENT_UNSUBSCRIBE: 'event:unsubscribe',
  EVENT_BROADCAST: 'event:broadcast',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

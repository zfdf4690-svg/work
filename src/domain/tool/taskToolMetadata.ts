import { registerTool } from './registry';
import type { ListTasksStatus, ToolMetadata } from './tool.types';

export const TASK_TOOL_METADATA: readonly ToolMetadata[] = Object.freeze([
  Object.freeze({
    name: 'get_task',
    source: 'internal',
    category: 'task',
    capabilities: Object.freeze(['task.read']),
    riskClass: 'read',
    confirm: 'none',
    humanOnly: false,
  }),
  Object.freeze({
    name: 'list_tasks',
    source: 'internal',
    category: 'task',
    capabilities: Object.freeze(['task.read']),
    riskClass: 'read',
    confirm: 'none',
    humanOnly: false,
  }),
  Object.freeze({
    name: 'create_task',
    source: 'internal',
    category: 'task',
    capabilities: Object.freeze(['task.write']),
    riskClass: 'write_local',
    confirm: 'none',
    humanOnly: false,
    batchEscalateAbove: 1,
  }),
  Object.freeze({
    name: 'update_task',
    source: 'internal',
    category: 'task',
    capabilities: Object.freeze(['task.write']),
    riskClass: 'write_local',
    confirm: 'none',
    humanOnly: false,
    batchEscalateAbove: 1,
  }),
  Object.freeze({
    name: 'complete_task',
    source: 'internal',
    category: 'task',
    capabilities: Object.freeze(['task.write']),
    riskClass: 'write_local',
    confirm: 'none',
    humanOnly: false,
    batchEscalateAbove: 1,
  }),
  Object.freeze({
    name: 'delete_task',
    source: 'internal',
    category: 'task',
    capabilities: Object.freeze(['task.delete']),
    riskClass: 'write_local',
    confirm: 'always',
    humanOnly: true,
  }),
]);

export const TASK_QUERY_CONTRACT_METADATA = Object.freeze({
  list_tasks: Object.freeze({
    statusFilters: Object.freeze(
      ['all', 'pending', 'in_progress', 'completed'] satisfies readonly ListTasksStatus[]
    ),
    allExcludesCancelled: true,
    defaultLimit: 50,
    maxLimit: 100,
  }),
  get_task: Object.freeze({
    supportsCancelledTasks: true,
  }),
});

export function registerTaskToolMetadata(): ToolMetadata[] {
  return TASK_TOOL_METADATA.map((metadata) => registerTool(metadata));
}

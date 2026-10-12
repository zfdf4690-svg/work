import type { RiskClass, ToolMetadata } from './tool.types';

export const PERSISTENT_AUTHORITY_TOOLS = Object.freeze([
  'save_skill',
  'create_scheduled_task',
  'update_scheduled_task',
  'delete_scheduled_task',
] as const);

export const DISABLED_CAPABILITIES = Object.freeze([
  'settings.write',
  'secrets.read',
  'secrets.write',
  'authz.read',
  'authz.write',
  'db.raw',
] as const);

export function getEffectiveRisk(tool: ToolMetadata): RiskClass {
  return tool.source === 'mcp' ? 'external' : tool.riskClass;
}

export function isPersistentAuthorityTool(toolName: string): boolean {
  return (PERSISTENT_AUTHORITY_TOOLS as readonly string[]).includes(toolName);
}

export function isConsequential(toolName: string, effectiveRisk: RiskClass): boolean {
  return effectiveRisk !== 'read' || isPersistentAuthorityTool(toolName);
}

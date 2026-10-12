import { DISABLED_CAPABILITIES } from './risk';
import type { ConfirmPolicy, RiskClass, ToolMetadata, ToolSource } from './tool.types';

export const TOOL_CONTRACT_VERSION = 1;

const tools = new Map<string, ToolMetadata>();
const VALID_RISKS: readonly RiskClass[] = ['read', 'egress', 'external', 'write_local', 'exec'];
const VALID_SOURCES: readonly ToolSource[] = ['internal', 'mcp'];
const VALID_CONFIRM_POLICIES: readonly ConfirmPolicy[] = ['none', 'always'];

export function registerTool(metadata: ToolMetadata): ToolMetadata {
  validateMetadata(metadata);

  if (tools.has(metadata.name)) {
    throw new Error(`Tool "${metadata.name}" is already registered.`);
  }

  const registered = Object.freeze({
    ...metadata,
    capabilities: Object.freeze([...metadata.capabilities]),
  });
  tools.set(registered.name, registered);
  return registered;
}

export function getTool(name: string): ToolMetadata | undefined {
  return tools.get(name);
}

export function listTools(): readonly ToolMetadata[] {
  return [...tools.values()];
}

export function withIsolatedToolRegistryForTests<T>(run: () => T): T {
  const previousTools = new Map(tools);
  tools.clear();

  try {
    const result = run();
    if (
      result !== null &&
      (typeof result === 'object' || typeof result === 'function') &&
      'then' in result
    ) {
      throw new Error('withIsolatedToolRegistryForTests 仅支持同步回调。');
    }
    return result;
  } finally {
    tools.clear();
    for (const [name, metadata] of previousTools) {
      tools.set(name, metadata);
    }
  }
}

function validateMetadata(metadata: ToolMetadata): void {
  if (!/^[a-z][a-z0-9_]*$/.test(metadata.name)) {
    throw new Error(`Invalid tool name "${metadata.name}": use lowercase letters, digits, and underscores.`);
  }

  if (!VALID_SOURCES.includes(metadata.source)) {
    throw new Error(`Invalid tool source "${metadata.source}".`);
  }

  if (!VALID_RISKS.includes(metadata.riskClass)) {
    throw new Error(`Invalid risk class "${metadata.riskClass}".`);
  }

  if (!VALID_CONFIRM_POLICIES.includes(metadata.confirm)) {
    throw new Error(`Invalid confirmation policy "${metadata.confirm}".`);
  }

  if (!Array.isArray(metadata.capabilities)) {
    throw new Error('Tool capabilities must be an array.');
  }

  if (metadata.riskClass === 'egress' || metadata.riskClass === 'exec') {
    throw new Error(`Risk class "${metadata.riskClass}" is not implemented in this phase.`);
  }

  const disabledCapability = metadata.capabilities.find((capability) =>
    (DISABLED_CAPABILITIES as readonly string[]).includes(capability)
  );
  if (disabledCapability !== undefined) {
    throw new Error(`Capability "${disabledCapability}" is disabled by policy.`);
  }

  if (metadata.riskClass === 'read' && (metadata.confirm !== 'none' || metadata.humanOnly)) {
    throw new Error('Read tools must use confirm="none" and humanOnly=false.');
  }

  if (metadata.riskClass === 'external' && metadata.confirm !== 'always') {
    throw new Error('External tools must use confirm="always".');
  }

  if (metadata.humanOnly && metadata.confirm !== 'always') {
    throw new Error('humanOnly tools must use confirm="always".');
  }

  if (
    metadata.batchEscalateAbove !== undefined &&
    (!Number.isInteger(metadata.batchEscalateAbove) || metadata.batchEscalateAbove < 0)
  ) {
    throw new Error('batchEscalateAbove must be a non-negative integer.');
  }
}

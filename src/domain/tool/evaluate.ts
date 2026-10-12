import {
  DISABLED_CAPABILITIES,
  getEffectiveRisk,
  isConsequential,
  isPersistentAuthorityTool,
} from './risk';
import type { Decision, EvaluateInput, Mode, ToolMetadata } from './tool.types';

function denied(reason: string, rule: string): Decision {
  return {
    allowed: false,
    needsUser: false,
    humanOnly: false,
    reason,
    rule,
    provenance: 'denied-by-policy',
  };
}

function pending(reason: string, rule: string, humanOnly = false): Decision {
  return {
    allowed: false,
    needsUser: true,
    humanOnly,
    reason,
    rule,
    provenance: 'pending',
  };
}

function allowed(reason: string, rule: string): Decision {
  return {
    allowed: true,
    needsUser: false,
    humanOnly: false,
    reason,
    rule,
    provenance: 'auto',
  };
}

function assertNever(value: never): never {
  throw new Error(`Unsupported tool mode: ${String(value)}`);
}

function unregisteredDecision(mode: Mode, toolName: string): Decision {
  switch (mode) {
    case 'discuss':
      return denied(`Unregistered tool "${toolName}" is denied in discuss mode.`, 'unregistered-discuss');
    case 'interactive':
      return pending(`Unregistered tool "${toolName}" requires user review.`, 'unregistered-interactive', true);
    default:
      return assertNever(mode);
  }
}

function hasDisabledCapability(tool: ToolMetadata): string | undefined {
  return tool.capabilities.find((capability) =>
    (DISABLED_CAPABILITIES as readonly string[]).includes(capability)
  );
}

export function evaluateToolCall(input: EvaluateInput): Decision {
  const { toolName, tool, mode } = input;

  if (tool === undefined || tool.name !== toolName) {
    return unregisteredDecision(mode, toolName);
  }

  const disabledCapability = hasDisabledCapability(tool);
  if (disabledCapability !== undefined) {
    return denied(`Capability "${disabledCapability}" is disabled by policy.`, 'disabled-capability');
  }

  const effectiveRisk = getEffectiveRisk(tool);
  const consequential = isConsequential(toolName, effectiveRisk);

  if (mode === 'discuss' && consequential) {
    return denied('Discuss mode is read-only.', 'discuss-read-only');
  }

  if (isPersistentAuthorityTool(toolName)) {
    return pending('Persistent authority changes require direct human approval.', 'persistent-authority', true);
  }

  if (!consequential) {
    return allowed('low risk', 'low-risk');
  }

  if (effectiveRisk === 'egress' || effectiveRisk === 'exec') {
    return pending(`Risk "${effectiveRisk}" is not implemented in this phase.`, 'unsupported-risk');
  }

  if (effectiveRisk === 'external') {
    return pending('External tools always require user approval.', 'external-risk');
  }

  if (tool.confirm === 'always' || tool.humanOnly) {
    return pending('This tool requires user approval.', 'explicit-confirmation', tool.humanOnly);
  }

  if (
    tool.batchEscalateAbove !== undefined
  ) {
    const affectedCount = input.affectedCount ?? 1;
    if (!Number.isInteger(affectedCount) || affectedCount < 0) {
      return pending('The affected item count must be a non-negative integer.', 'invalid-affected-count');
    }
    if (affectedCount > tool.batchEscalateAbove) {
      return pending('The affected item count exceeds the configured threshold.', 'batch-escalation');
    }
  }

  if (effectiveRisk === 'write_local' && tool.confirm === 'none') {
    return allowed('write allowed; reviewed after', 'write-reviewed-after');
  }

  return pending('This tool call requires user approval.', 'default-requires-user');
}

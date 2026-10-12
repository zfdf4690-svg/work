import { evaluateToolCall } from './evaluate';
import {
  getTool,
  listTools,
  registerTool,
  withIsolatedToolRegistryForTests,
} from './registry';
import type { Decision, ToolMetadata } from './tool.types';

export interface ToolContractTestResult {
  suite: string;
  name: string;
  passed: boolean;
  message?: string;
}

interface TestCase {
  name: string;
  run: () => void;
}

const results: ToolContractTestResult[] = [];

function equal(actual: unknown, expected: unknown, message: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function truthy(actual: unknown, message: string): void {
  if (!actual) {
    throw new Error(message);
  }
}

function deepEqual(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: values differ`);
  }
}

function throws(action: () => unknown, includes: string, message: string): void {
  try {
    action();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes(includes)) {
      return;
    }
    throw new Error(`${message}: unexpected error "${errorMessage}"`);
  }
  throw new Error(`${message}: expected an error containing "${includes}"`);
}

function baseTool(overrides: Partial<ToolMetadata> = {}): ToolMetadata {
  return {
    name: 'contract_test_tool',
    source: 'internal',
    category: 'test',
    capabilities: [],
    riskClass: 'write_local',
    confirm: 'none',
    humanOnly: false,
    ...overrides,
  };
}

function expectDecision(actual: Decision, expected: Partial<Decision>, message: string): void {
  for (const [key, expectedValue] of Object.entries(expected)) {
    equal(actual[key as keyof Decision], expectedValue, `${message} (${key})`);
  }
}

const cases: TestCase[] = [
  {
    name: 'unregistered tools ask in interactive mode and deny in discuss mode',
    run: () => {
      expectDecision(
        evaluateToolCall({ toolName: 'missing_tool', tool: undefined, mode: 'interactive' }),
        { allowed: false, needsUser: true, provenance: 'pending' },
        'Interactive unregistered tool'
      );
      expectDecision(
        evaluateToolCall({ toolName: 'missing_tool', tool: undefined, mode: 'discuss' }),
        { allowed: false, needsUser: false, provenance: 'denied-by-policy' },
        'Discuss unregistered tool'
      );
    },
  },
  {
    name: 'disabled capabilities are denied even when registry validation is bypassed',
    run: () => {
      const decision = evaluateToolCall({
        toolName: 'unsafe_tool',
        tool: baseTool({ capabilities: ['task.read', 'secrets.read'] }),
        mode: 'interactive',
      });
      expectDecision(decision, {
        allowed: false,
        needsUser: false,
        provenance: 'denied-by-policy',
        rule: 'disabled-capability',
      }, 'Disabled capability');
    },
  },
  {
    name: 'discuss mode denies consequential tools as read-only',
    run: () => {
      const decision = evaluateToolCall({
        toolName: 'write_tool',
        tool: baseTool(),
        mode: 'discuss',
      });
      expectDecision(decision, {
        allowed: false,
        needsUser: false,
        provenance: 'denied-by-policy',
        rule: 'discuss-read-only',
      }, 'Discuss write');
      truthy(decision.reason.includes('read-only'), 'Discuss rejection should explain read-only mode');
    },
  },
  {
    name: 'persistent authority names require human approval despite read metadata',
    run: () => {
      for (const name of ['save_skill', 'create_scheduled_task', 'update_scheduled_task', 'delete_scheduled_task']) {
        const readMetadata = baseTool({ name, riskClass: 'read' });
        expectDecision(
          evaluateToolCall({ toolName: name, tool: readMetadata, mode: 'discuss' }),
          { allowed: false, needsUser: false, provenance: 'denied-by-policy' },
          `${name} in discuss mode`
        );
        expectDecision(
          evaluateToolCall({ toolName: name, tool: readMetadata, mode: 'interactive' }),
          { allowed: false, needsUser: true, humanOnly: true, provenance: 'pending', rule: 'persistent-authority' },
          `${name} in interactive mode`
        );
      }
    },
  },
  {
    name: 'read tools are allowed without user approval',
    run: () => {
      expectDecision(
        evaluateToolCall({
          toolName: 'read_tool',
          tool: baseTool({ riskClass: 'read' }),
          mode: 'interactive',
        }),
        { allowed: true, needsUser: false, provenance: 'auto', reason: 'low risk' },
        'Read tool'
      );
    },
  },
  {
    name: 'egress and exec are defensive approval fallbacks when bypassing registration',
    run: () => {
      for (const riskClass of ['egress', 'exec'] as const) {
        expectDecision(
          evaluateToolCall({
            toolName: `unsupported_${riskClass}`,
            tool: baseTool({ riskClass }),
            mode: 'interactive',
          }),
          { allowed: false, needsUser: true, provenance: 'pending', rule: 'unsupported-risk' },
          `${riskClass} fallback`
        );
      }
    },
  },
  {
    name: 'external and MCP tools always require approval in interactive mode',
    run: () => {
      const external = baseTool({ riskClass: 'external', confirm: 'none' });
      expectDecision(
        evaluateToolCall({ toolName: 'external_tool', tool: external, mode: 'interactive' }),
        { allowed: false, needsUser: true, provenance: 'pending', rule: 'external-risk' },
        'External tool'
      );

      for (const riskClass of ['read', 'write_local'] as const) {
        const mcpTool = baseTool({ name: `mcp_${riskClass}`, source: 'mcp', riskClass });
        expectDecision(
          evaluateToolCall({ toolName: mcpTool.name, tool: mcpTool, mode: 'interactive' }),
          { allowed: false, needsUser: true, provenance: 'pending', rule: 'external-risk' },
          `MCP ${riskClass} tool`
        );
      }

      expectDecision(
        evaluateToolCall({
          toolName: 'mcp_read',
          tool: baseTool({ name: 'mcp_read', source: 'mcp', riskClass: 'read' }),
          mode: 'discuss',
        }),
        { allowed: false, needsUser: false, provenance: 'denied-by-policy', rule: 'discuss-read-only' },
        'MCP tool in discuss mode'
      );
    },
  },
  {
    name: 'explicit confirmation and human-only policy require approval',
    run: () => {
      expectDecision(
        evaluateToolCall({
          toolName: 'confirmed_tool',
          tool: baseTool({ confirm: 'always' }),
          mode: 'interactive',
        }),
        { allowed: false, needsUser: true, humanOnly: false, provenance: 'pending' },
        'Explicit confirmation'
      );
      expectDecision(
        evaluateToolCall({
          toolName: 'human_tool',
          tool: baseTool({ confirm: 'always', humanOnly: true }),
          mode: 'interactive',
        }),
        { allowed: false, needsUser: true, humanOnly: true, provenance: 'pending' },
        'Human-only confirmation'
      );
    },
  },
  {
    name: 'batch escalation uses strict greater-than and defaults affected count to one',
    run: () => {
      const tool = baseTool({ batchEscalateAbove: 1 });
      expectDecision(
        evaluateToolCall({ toolName: tool.name, tool, mode: 'interactive', affectedCount: 1 }),
        { allowed: true, provenance: 'auto' },
        'Batch count at threshold'
      );
      expectDecision(
        evaluateToolCall({ toolName: tool.name, tool, mode: 'interactive', affectedCount: 2 }),
        { allowed: false, needsUser: true, provenance: 'pending', rule: 'batch-escalation' },
        'Batch count above threshold'
      );
      expectDecision(
        evaluateToolCall({ toolName: tool.name, tool, mode: 'interactive' }),
        { allowed: true, provenance: 'auto' },
        'Default affected count'
      );
    },
  },
  {
    name: 'write_local without confirmation is allowed for after-the-fact review',
    run: () => {
      expectDecision(
        evaluateToolCall({
          toolName: 'write_tool',
          tool: baseTool(),
          mode: 'interactive',
        }),
        { allowed: true, needsUser: false, provenance: 'auto', reason: 'write allowed; reviewed after' },
        'Write without confirmation'
      );
    },
  },
  {
    name: 'registration validates name, capabilities, risks, and policy invariants',
    run: () => {
      throws(() => registerTool(baseTool({ name: 'Invalid-Name' })), 'Invalid tool name', 'Invalid tool name');
      throws(
        () => registerTool(baseTool({ name: 'disabled_capability', capabilities: ['db.raw'] })),
        'disabled by policy',
        'Disabled capability'
      );
      throws(() => registerTool(baseTool({ name: 'unsupported_egress', riskClass: 'egress' })), 'not implemented', 'Egress risk');
      throws(() => registerTool(baseTool({ name: 'unsupported_exec', riskClass: 'exec' })), 'not implemented', 'Exec risk');
      throws(
        () => registerTool(baseTool({ name: 'read_always', riskClass: 'read', confirm: 'always' })),
        'Read tools',
        'Read confirmation invariant'
      );
      throws(
        () => registerTool(baseTool({ name: 'human_without_confirm', humanOnly: true })),
        'humanOnly tools',
        'Human-only confirmation invariant'
      );
      throws(
        () => registerTool(baseTool({ name: 'external_without_confirm', riskClass: 'external', confirm: 'none' })),
        'External tools',
        'External confirmation invariant'
      );

      const valid = registerTool(baseTool({ name: 'registry_contract_valid', capabilities: ['task.read'] }));
      truthy(Object.isFrozen(valid), 'Registered metadata object should be frozen');
      truthy(Object.isFrozen(valid.capabilities), 'Registered capabilities should be frozen');
      equal(getTool(valid.name), valid, 'Registered metadata should be discoverable');
      truthy(listTools().some((tool) => tool.name === valid.name), 'Registered metadata should be listed');
      throws(() => registerTool(valid), 'already registered', 'Duplicate registration');
    },
  },
  {
    name: 'evaluation is deterministic for the same input',
    run: () => {
      const input = {
        toolName: 'deterministic_tool',
        tool: baseTool({ batchEscalateAbove: 1 }),
        mode: 'interactive' as const,
        affectedCount: 2,
      };
      deepEqual(evaluateToolCall(input), evaluateToolCall(input), 'Repeated evaluations');
    },
  },
];

export function runToolContractTests(): ToolContractTestResult[] {
  results.length = 0;
  for (const testCase of cases) {
    try {
      withIsolatedToolRegistryForTests(testCase.run);
      results.push({ suite: 'ToolContract', name: testCase.name, passed: true });
    } catch (error) {
      results.push({
        suite: 'ToolContract',
        name: testCase.name,
        passed: false,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return [...results];
}

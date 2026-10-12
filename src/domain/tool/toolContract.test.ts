import { evaluateToolCall } from './evaluate';
import {
  getTool,
  listTools,
  registerTool,
  withIsolatedToolRegistryForTests,
} from './registry';
import { registerTaskToolMetadata, TASK_QUERY_CONTRACT_METADATA } from './taskToolMetadata';
import { DISABLED_CAPABILITIES } from './risk';
import type { Decision, ListTasksStatus, ToolMetadata } from './tool.types';

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
        {
          allowed: false,
          needsUser: true,
          humanOnly: true,
          provenance: 'pending',
          rule: 'unregistered-interactive',
        },
        'Interactive unregistered tool'
      );
      expectDecision(
        evaluateToolCall({ toolName: 'missing_tool', tool: undefined, mode: 'discuss' }),
        {
          allowed: false,
          needsUser: false,
          humanOnly: false,
          provenance: 'denied-by-policy',
          rule: 'unregistered-discuss',
        },
        'Discuss unregistered tool'
      );
    },
  },
  {
    name: 'all disabled capabilities are rejected by registration and evaluation',
    run: () => {
      const expected = [
        'settings.write',
        'secrets.read',
        'secrets.write',
        'authz.read',
        'authz.write',
        'db.raw',
      ];
      deepEqual([...DISABLED_CAPABILITIES], expected, 'Disabled capability inventory');

      for (const [index, capability] of expected.entries()) {
        throws(
          () => registerTool(baseTool({ name: `disabled_${index}`, capabilities: [capability] })),
          'disabled by policy',
          `Register ${capability}`
        );
        const unsafeTool = baseTool({ name: `unsafe_${index}`, capabilities: [capability] });
        for (const mode of ['discuss', 'interactive'] as const) {
          expectDecision(
            evaluateToolCall({ toolName: unsafeTool.name, tool: unsafeTool, mode }),
            {
              allowed: false,
              needsUser: false,
              humanOnly: false,
              provenance: 'denied-by-policy',
              rule: 'disabled-capability',
            },
            `${capability} in ${mode} mode`
          );
        }
      }
    },
  },
  {
    name: 'tool name mismatch is handled as an unregistered tool',
    run: () => {
      const mismatchedTool = baseTool({ name: 'registered_name' });
      expectDecision(
        evaluateToolCall({ toolName: 'requested_name', tool: mismatchedTool, mode: 'interactive' }),
        {
          allowed: false,
          needsUser: true,
          humanOnly: true,
          provenance: 'pending',
          rule: 'unregistered-interactive',
        },
        'Mismatched tool name in interactive mode'
      );
      expectDecision(
        evaluateToolCall({ toolName: 'requested_name', tool: mismatchedTool, mode: 'discuss' }),
        {
          allowed: false,
          needsUser: false,
          humanOnly: false,
          provenance: 'denied-by-policy',
          rule: 'unregistered-discuss',
        },
        'Mismatched tool name in discuss mode'
      );
    },
  },
  {
    name: 'discuss mode denies consequential tools as read-only',
    run: () => {
      const decision = evaluateToolCall({
        toolName: 'write_tool',
        tool: baseTool({ name: 'write_tool' }),
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
          tool: baseTool({ name: 'read_tool', riskClass: 'read' }),
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
            tool: baseTool({ name: `unsupported_${riskClass}`, riskClass }),
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
      const external = baseTool({ name: 'external_tool', riskClass: 'external', confirm: 'none' });
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
          tool: baseTool({ name: 'confirmed_tool', confirm: 'always' }),
          mode: 'interactive',
        }),
        { allowed: false, needsUser: true, humanOnly: false, provenance: 'pending' },
        'Explicit confirmation'
      );
      expectDecision(
        evaluateToolCall({
          toolName: 'human_tool',
          tool: baseTool({ name: 'human_tool', confirm: 'always', humanOnly: true }),
          mode: 'interactive',
        }),
        { allowed: false, needsUser: true, humanOnly: true, provenance: 'pending' },
        'Human-only confirmation'
      );
    },
  },
  {
    name: 'batch affected counts fail closed when invalid and escalate only above threshold',
    run: () => {
      const tool = baseTool({ batchEscalateAbove: 1 });
      const cases: Array<{
        label: string;
        affectedCount?: number;
        expected: Partial<Decision>;
      }> = [
        {
          label: 'zero',
          affectedCount: 0,
          expected: {
            allowed: true,
            needsUser: false,
            humanOnly: false,
            provenance: 'auto',
            rule: 'write-reviewed-after',
            reason: 'write allowed; reviewed after',
          },
        },
        {
          label: 'one',
          affectedCount: 1,
          expected: {
            allowed: true,
            needsUser: false,
            humanOnly: false,
            provenance: 'auto',
            rule: 'write-reviewed-after',
            reason: 'write allowed; reviewed after',
          },
        },
        {
          label: 'two',
          affectedCount: 2,
          expected: {
            allowed: false,
            needsUser: true,
            humanOnly: false,
            provenance: 'pending',
            rule: 'batch-escalation',
            reason: 'The affected item count exceeds the configured threshold.',
          },
        },
        ...[Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY].map((affectedCount) => ({
          label: `invalid ${String(affectedCount)}`,
          affectedCount,
          expected: {
            allowed: false,
            needsUser: true,
            humanOnly: false,
            provenance: 'pending' as const,
            rule: 'invalid-affected-count',
            reason: 'The affected item count must be a non-negative integer.',
          },
        })),
        {
          label: 'omitted (defaults to one)',
          expected: {
            allowed: true,
            needsUser: false,
            humanOnly: false,
            provenance: 'auto',
            rule: 'write-reviewed-after',
            reason: 'write allowed; reviewed after',
          },
        },
      ];

      for (const { label, affectedCount, expected } of cases) {
        expectDecision(
          evaluateToolCall({ toolName: tool.name, tool, mode: 'interactive', affectedCount }),
          expected,
          `Affected count ${label}`
        );
      }
    },
  },
  {
    name: 'isolated registry rejects asynchronous callbacks and restores registry state',
    run: () => {
      const existing = registerTool(baseTool({ name: 'preserved_outside_isolation' }));
      throws(
        () => withIsolatedToolRegistryForTests(() => Promise.resolve('done')),
        '仅支持同步回调',
        'Asynchronous registry isolation callback'
      );
      equal(getTool(existing.name), existing, 'Registry state must be restored after callback rejection');
    },
  },
  {
    name: 'write_local without confirmation is allowed for after-the-fact review',
    run: () => {
      expectDecision(
        evaluateToolCall({
          toolName: 'write_tool',
          tool: baseTool({ name: 'write_tool' }),
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
    name: 'review decision table asserts all public Decision fields',
    run: () => {
      const scenarios: Array<{
        label: string;
        input: Parameters<typeof evaluateToolCall>[0];
        expected: Partial<Decision>;
      }> = [];
      const add = (
        label: string,
        input: Parameters<typeof evaluateToolCall>[0],
        expected: Partial<Decision>
      ): void => {
        scenarios.push({ label, input, expected });
      };
      const taskTools = registerTaskToolMetadata();

      for (const tool of taskTools) {
        if (tool.riskClass === 'read') {
          for (const mode of ['discuss', 'interactive'] as const) {
            add(`${tool.name} / ${mode}`, { toolName: tool.name, tool, mode }, {
              allowed: true,
              needsUser: false,
              humanOnly: false,
              provenance: 'auto',
              rule: 'low-risk',
              reason: 'low risk',
            });
          }
          continue;
        }

        if (tool.name === 'delete_task') {
          add('delete_task / discuss', { toolName: tool.name, tool, mode: 'discuss' }, {
            allowed: false,
            needsUser: false,
            humanOnly: false,
            provenance: 'denied-by-policy',
            rule: 'discuss-read-only',
            reason: 'Discuss mode is read-only.',
          });
          add('delete_task / interactive', { toolName: tool.name, tool, mode: 'interactive' }, {
            allowed: false,
            needsUser: true,
            humanOnly: true,
            provenance: 'pending',
            rule: 'explicit-confirmation',
            reason: 'This tool requires user approval.',
          });
          continue;
        }

        for (const affectedCount of [1, 2] as const) {
          for (const mode of ['discuss', 'interactive'] as const) {
            const expected =
              mode === 'discuss'
                ? {
                    allowed: false,
                    needsUser: false,
                    humanOnly: false,
                    provenance: 'denied-by-policy' as const,
                    rule: 'discuss-read-only',
                    reason: 'Discuss mode is read-only.',
                  }
                : affectedCount === 1
                  ? {
                      allowed: true,
                      needsUser: false,
                      humanOnly: false,
                      provenance: 'auto' as const,
                      rule: 'write-reviewed-after',
                      reason: 'write allowed; reviewed after',
                    }
                  : {
                      allowed: false,
                      needsUser: true,
                      humanOnly: false,
                      provenance: 'pending' as const,
                      rule: 'batch-escalation',
                      reason: 'The affected item count exceeds the configured threshold.',
                    };
            add(`${tool.name} / ${affectedCount} / ${mode}`, {
              toolName: tool.name,
              tool,
              mode,
              affectedCount,
            }, expected);
          }
        }
      }

      for (const mode of ['discuss', 'interactive'] as const) {
        add(`unregistered / ${mode}`, { toolName: 'missing_tool', tool: undefined, mode },
          mode === 'discuss'
            ? {
                allowed: false,
                needsUser: false,
                humanOnly: false,
                provenance: 'denied-by-policy',
                rule: 'unregistered-discuss',
                reason: 'Unregistered tool "missing_tool" is denied in discuss mode.',
              }
            : {
                allowed: false,
                needsUser: true,
                humanOnly: true,
                provenance: 'pending',
                rule: 'unregistered-interactive',
                reason: 'Unregistered tool "missing_tool" requires user review.',
              });
      }

      const mcpRead = baseTool({ name: 'untrusted_mcp_read', source: 'mcp', riskClass: 'read' });
      for (const mode of ['discuss', 'interactive'] as const) {
        add(`MCP read / ${mode}`, { toolName: mcpRead.name, tool: mcpRead, mode },
          mode === 'discuss'
            ? {
                allowed: false,
                needsUser: false,
                humanOnly: false,
                provenance: 'denied-by-policy',
                rule: 'discuss-read-only',
                reason: 'Discuss mode is read-only.',
              }
            : {
                allowed: false,
                needsUser: true,
                humanOnly: false,
                provenance: 'pending',
                rule: 'external-risk',
                reason: 'External tools always require user approval.',
              });
      }

      const persistentRead = baseTool({ name: 'save_skill', riskClass: 'read' });
      add('save_skill read / discuss', {
        toolName: persistentRead.name,
        tool: persistentRead,
        mode: 'discuss',
      }, {
        allowed: false,
        needsUser: false,
        humanOnly: false,
        provenance: 'denied-by-policy',
        rule: 'discuss-read-only',
        reason: 'Discuss mode is read-only.',
      });
      add('save_skill read / interactive', {
        toolName: persistentRead.name,
        tool: persistentRead,
        mode: 'interactive',
      }, {
        allowed: false,
        needsUser: true,
        humanOnly: true,
        provenance: 'pending',
        rule: 'persistent-authority',
        reason: 'Persistent authority changes require direct human approval.',
      });

      const disabled = baseTool({ name: 'disabled_review_tool', capabilities: ['authz.read'] });
      for (const mode of ['discuss', 'interactive'] as const) {
        add(`disabled capability / ${mode}`, {
          toolName: disabled.name,
          tool: disabled,
          mode,
        }, {
          allowed: false,
          needsUser: false,
          humanOnly: false,
          provenance: 'denied-by-policy',
          rule: 'disabled-capability',
          reason: 'Capability "authz.read" is disabled by policy.',
        });
      }

      const invalidExternal = baseTool({ name: 'external_unvalidated', riskClass: 'external', confirm: 'none' });
      add('external with wrong confirm / interactive', {
        toolName: invalidExternal.name,
        tool: invalidExternal,
        mode: 'interactive',
      }, {
        allowed: false,
        needsUser: true,
        humanOnly: false,
        provenance: 'pending',
        rule: 'external-risk',
        reason: 'External tools always require user approval.',
      });

      const batched = baseTool({ name: 'count_review_tool', batchEscalateAbove: 1 });
      for (const [label, affectedCount] of [['default', undefined], ['zero', 0]] as const) {
        add(`affected count ${label}`, {
          toolName: batched.name,
          tool: batched,
          mode: 'interactive',
          affectedCount,
        }, {
          allowed: true,
          needsUser: false,
          humanOnly: false,
          provenance: 'auto',
          rule: 'write-reviewed-after',
          reason: 'write allowed; reviewed after',
        });
      }

      for (const { label, input, expected } of scenarios) {
        expectDecision(evaluateToolCall(input), expected, label);
      }
    },
  },
  {
    name: 'registration freezes a cloned metadata object and listTools returns a copy',
    run: () => {
      const originalCapabilities = ['task.read'];
      const original = baseTool({
        name: 'clone_contract_tool',
        capabilities: originalCapabilities,
      });
      const registered = registerTool(original);

      truthy(Object.isFrozen(registered), 'Registered metadata should be frozen');
      truthy(Object.isFrozen(registered.capabilities), 'Registered capabilities should be frozen');
      equal(Object.isFrozen(original), false, 'Caller metadata should remain unfrozen');
      equal(Object.isFrozen(originalCapabilities), false, 'Caller capabilities should remain unfrozen');
      truthy(registered !== original, 'Registry must retain a cloned metadata object');
      truthy(registered.capabilities !== originalCapabilities, 'Registry must retain cloned capabilities');

      const listed: readonly ToolMetadata[] = listTools();
      equal(
        Reflect.apply(Array.prototype.pop, listed, []),
        registered,
        'Mutating the returned list should pop the registered copy'
      );
      equal(getTool(registered.name), registered, 'Mutating returned list must not change registry');
      equal(listTools().length, 1, 'Registry must still contain its registered tool');
    },
  },
  {
    name: 'Task tool metadata registers all six tools with the approved decisions',
    run: () => {
      const metadata = registerTaskToolMetadata();
      deepEqual(
        metadata.map((tool) => tool.name),
        ['get_task', 'list_tasks', 'create_task', 'update_task', 'complete_task', 'delete_task'],
        'Registered Task tools'
      );

      for (const tool of metadata) {
        const discussDecision = evaluateToolCall({ toolName: tool.name, tool, mode: 'discuss' });
        if (tool.riskClass === 'read') {
          expectDecision(
            discussDecision,
            {
              allowed: true,
              needsUser: false,
              humanOnly: false,
              provenance: 'auto',
              rule: 'low-risk',
              reason: 'low risk',
            },
            `${tool.name} in discuss mode`
          );
        } else {
          expectDecision(
            discussDecision,
            {
              allowed: false,
              needsUser: false,
              humanOnly: false,
              provenance: 'denied-by-policy',
              rule: 'discuss-read-only',
              reason: 'Discuss mode is read-only.',
            },
            `${tool.name} in discuss mode`
          );
        }

        const interactiveDecision = evaluateToolCall({
          toolName: tool.name,
          tool,
          mode: 'interactive',
        });
        if (tool.name === 'delete_task') {
          expectDecision(
            interactiveDecision,
            {
              allowed: false,
              needsUser: true,
              humanOnly: true,
              provenance: 'pending',
              rule: 'explicit-confirmation',
              reason: 'This tool requires user approval.',
            },
            'delete_task in interactive mode'
          );
        } else if (tool.riskClass === 'read') {
          expectDecision(
            interactiveDecision,
            {
              allowed: true,
              needsUser: false,
              humanOnly: false,
              provenance: 'auto',
              rule: 'low-risk',
              reason: 'low risk',
            },
            `${tool.name} in interactive mode`
          );
        } else {
          expectDecision(
            interactiveDecision,
            {
              allowed: true,
              needsUser: false,
              humanOnly: false,
              provenance: 'auto',
              rule: 'write-reviewed-after',
              reason: 'write allowed; reviewed after',
            },
            `${tool.name} in interactive mode`
          );
          expectDecision(
            evaluateToolCall({
              toolName: tool.name,
              tool,
              mode: 'interactive',
              affectedCount: 2,
            }),
            {
              allowed: false,
              needsUser: true,
              humanOnly: false,
              provenance: 'pending',
              rule: 'batch-escalation',
              reason: 'The affected item count exceeds the configured threshold.',
            },
            `${tool.name} batch of two in interactive mode`
          );
        }
      }
    },
  },
  {
    name: 'Task query metadata excludes CANCELLED from list all and permits cancelled get',
    run: () => {
      const statuses: readonly ListTasksStatus[] =
        TASK_QUERY_CONTRACT_METADATA.list_tasks.statusFilters;
      deepEqual(statuses, ['all', 'pending', 'in_progress', 'completed'], 'list_tasks statuses');
      equal(TASK_QUERY_CONTRACT_METADATA.list_tasks.allExcludesCancelled, true, 'all excludes CANCELLED');
      equal(TASK_QUERY_CONTRACT_METADATA.get_task.supportsCancelledTasks, true, 'get_task supports CANCELLED');
      equal(TASK_QUERY_CONTRACT_METADATA.list_tasks.defaultLimit, 50, 'list_tasks default limit');
      equal(TASK_QUERY_CONTRACT_METADATA.list_tasks.maxLimit, 100, 'list_tasks maximum limit');
    },
  },
  {
    name: 'evaluation is deterministic for the same input',
    run: () => {
      const input = {
        toolName: 'deterministic_tool',
        tool: baseTool({ name: 'deterministic_tool', batchEscalateAbove: 1 }),
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

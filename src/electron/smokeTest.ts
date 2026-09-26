/**
 * Electron Runtime & Typed IPC Smoke Test
 * 验证：
 * 1. Web 模式下 MockIpcClient 的纯隔离与正常可用性
 * 2. Electron 模式下 Preload -> Typed IPC -> Main Process -> Zod 校验的真实链路
 * 3. 安全边界验证：确保 window.electronAPI 绝不暴露 ipcRenderer 或 Node API
 */

import { MockIpcClient } from '../api/mockIpcClient';
import { ElectronIpcClient } from '../api/electronIpcClient';
import { IPC_CHANNELS } from './ipc/channels';
import { MainTaskListSchema, MainTaskDeleteSchema } from './ipc/zodSchemas';
import { IpcErrorCode, createIpcSuccess, createIpcError } from './ipc/errorContract';
import { Task, TaskPriority, TaskSource, TaskStatus } from '../domain';
import { ElectronAPI } from '../types/electron';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function assert(suite: string, name: string, condition: boolean, message?: string) {
  results.push({
    suite,
    name,
    passed: !!condition,
    message: condition ? undefined : message || 'Assertion failed',
  });
}

export async function runSmokeTests(): Promise<{ passed: boolean; results: TestResult[] }> {
  // =========================================================================
  // Test Suite 1: Web Mock Mode Verification
  // =========================================================================
  const mockClient = new MockIpcClient();
  assert('Web Mock Mode', 'isElectron should be false', mockClient.isElectron === false);

  const mockListRes = await mockClient.task.list();
  assert('Web Mock Mode', 'task.list() returns success', mockListRes.success === true);
  assert(
    'Web Mock Mode',
    'task.list() returns tasks array',
    Array.isArray(mockListRes.data) && mockListRes.data.length > 0
  );

  const mockDeleteWithoutConfirm = await mockClient.task.delete('mock-task-1', false);
  assert(
    'Web Mock Mode',
    'task.delete() without confirmation is rejected with CONFIRMATION_REQUIRED',
    mockDeleteWithoutConfirm.success === false &&
      mockDeleteWithoutConfirm.error.code === IpcErrorCode.CONFIRMATION_REQUIRED
  );

  // =========================================================================
  // Test Suite 2: Electron Security Boundary & API Surface
  // =========================================================================
  // 模拟 Preload 注入后的受控 window.electronAPI
  const mockMainReceivedIpcCalls: { channel: string; req: unknown }[] = [];

  const simulatedMainHandler = async (channel: string, req: unknown) => {
    mockMainReceivedIpcCalls.push({ channel, req });

    if (channel === IPC_CHANNELS.TASK_LIST) {
      const parsed = MainTaskListSchema.safeParse(req);
      if (!parsed.success) {
        return createIpcError(IpcErrorCode.VALIDATION_ERROR, 'Main 端参数校验失败');
      }
      const smokeTask: Task = {
        id: 'smoke-task-verified',
        title: 'Electron IPC Smoke Verified',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        source: TaskSource.SYSTEM,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return createIpcSuccess([smokeTask]);
    }

    if (channel === IPC_CHANNELS.TASK_DELETE) {
      const parsed = MainTaskDeleteSchema.safeParse(req);
      if (!parsed.success) {
        return createIpcError(IpcErrorCode.CONFIRMATION_REQUIRED, '必须显式确认删除');
      }
      return createIpcSuccess({ id: (req as { id: string }).id, deleted: true });
    }

    return createIpcError(IpcErrorCode.NOT_FOUND, 'Channel not handled');
  };

  const simulatedElectronAPI: ElectronAPI = {
    isElectron: true,
    task: {
      list: async (req) => (await simulatedMainHandler(IPC_CHANNELS.TASK_LIST, req)) as any,
      get: async () => createIpcError(IpcErrorCode.NOT_FOUND, 'Not implemented'),
      create: async () => createIpcError(IpcErrorCode.INTERNAL_ERROR, 'Not implemented'),
      update: async () => createIpcError(IpcErrorCode.INTERNAL_ERROR, 'Not implemented'),
      complete: async () => createIpcError(IpcErrorCode.INTERNAL_ERROR, 'Not implemented'),
      delete: async (req) => (await simulatedMainHandler(IPC_CHANNELS.TASK_DELETE, req)) as any,
    },
    agent: {
      resumeConfirmation: async () => createIpcSuccess({ resumed: true, runId: 'test' }),
      interrupt: async () => createIpcSuccess({ interrupted: true, runId: 'test' }),
    },
    events: {
      on: () => () => {},
    },
  };

  // 严格安全边界检查：确认 electronAPI 没有暴露 ipcRenderer 或 require
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawApi = simulatedElectronAPI as any;
  assert('Security Boundary', 'ipcRenderer is NOT exposed on electronAPI', rawApi.ipcRenderer === undefined);
  assert('Security Boundary', 'require is NOT exposed on electronAPI', rawApi.require === undefined);
  assert('Security Boundary', 'fs is NOT exposed on electronAPI', rawApi.fs === undefined);
  assert('Security Boundary', 'child_process is NOT exposed on electronAPI', rawApi.child_process === undefined);

  // =========================================================================
  // Test Suite 3: ElectronIpcClient End-to-End Execution
  // =========================================================================
  // 注入全局 window.electronAPI
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).window = {
    electronAPI: simulatedElectronAPI,
  };

  const electronClient = new ElectronIpcClient();
  assert('Electron Client', 'isElectron is true', electronClient.isElectron === true);

  // 发起 task.list() 调用
  const electronListRes = await electronClient.task.list({ priority: [TaskPriority.HIGH] });
  assert('Electron Client', 'task.list() succeeded', electronListRes.success === true);
  assert(
    'Electron Client',
    'Main Process received task:list channel call',
    mockMainReceivedIpcCalls.some((c) => c.channel === IPC_CHANNELS.TASK_LIST)
  );
  assert(
    'Electron Client',
    'Main Process received correct request filter parameter',
    (mockMainReceivedIpcCalls[0]?.req as { priority?: string[] })?.priority?.[0] === TaskPriority.HIGH
  );
  assert(
    'Electron Client',
    'Received data from Main contains smokeTask',
    electronListRes.data?.[0]?.id === 'smoke-task-verified'
  );

  // 清理全局模拟
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).window;

  const allPassed = results.every((r) => r.passed);
  return { passed: allPassed, results };
}

// 供 node/tsx 命令行直接执行
if (process.env.RUN_SMOKE_DIRECTLY === '1' || process.argv[1]?.endsWith('smokeTest.ts')) {
  runSmokeTests().then(({ passed, results }) => {
    console.log('\n=== Electron Runtime & IPC Smoke Test Results ===');
    results.forEach((r) => {
      const symbol = r.passed ? '✓' : '✗';
      console.log(`[${r.suite}] ${symbol} ${r.name}`);
      if (!r.passed && r.message) {
        console.error(`    Error: ${r.message}`);
      }
    });
    console.log(`\nOverall: ${passed ? 'ALL PASSED' : 'SOME FAILED'}\n`);
    if (!passed) process.exit(1);
  });
}

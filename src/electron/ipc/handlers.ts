/**
 * IPC Handler Registry
 * 在 Electron Main 进程中注册受控的 IPC 处理器
 * 严格执行 Main Process Zod 边界校验，对未实现服务返回标准错误
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from './channels';
import {
  createIpcError,
  createIpcSuccess,
  IpcErrorCode,
  IpcResult,
} from './errorContract';
import {
  MainTaskCreateSchema,
  MainTaskUpdateSchema,
  MainTaskCompleteSchema,
  MainTaskDeleteSchema,
  MainTaskGetSchema,
  MainTaskListSchema,
  MainAgentResumeConfirmationSchema,
  MainAgentInterruptSchema,
} from './zodSchemas';
import { Task, TaskPriority, TaskSource, TaskStatus } from '../../domain';

export function registerIpcHandlers(): void {
  // task:list - 冒烟测试核心通道：返回安全校验通过的临时任务数据
  ipcMain.handle(IPC_CHANNELS.TASK_LIST, async (_event, req): Promise<IpcResult<Task[]>> => {
    const parseResult = MainTaskListSchema.safeParse(req);
    if (!parseResult.success) {
      return createIpcError(
        IpcErrorCode.VALIDATION_ERROR,
        'Main 端参数安全校验失败',
        parseResult.error.flatten()
      );
    }

    const now = new Date().toISOString();
    const smokeTasks: Task[] = [
      {
        id: 'smoke-electron-task-1',
        title: 'Electron Runtime & Typed IPC Smoke Verification',
        description: 'Main Process received IPC request through Preload contextBridge',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueAt: new Date(Date.now() + 3600000).toISOString(),
        source: TaskSource.SYSTEM,
        category: 'Smoke Test',
        tags: ['electron', 'ipc', 'smoke'],
        createdAt: now,
        updatedAt: now,
      },
    ];

    return createIpcSuccess(smokeTasks);
  });

  // task:get
  ipcMain.handle(IPC_CHANNELS.TASK_GET, async (_event, req) => {
    const parseResult = MainTaskGetSchema.safeParse(req);
    if (!parseResult.success) {
      return createIpcError(IpcErrorCode.VALIDATION_ERROR, '无效的任务 ID', parseResult.error.flatten());
    }
    return createIpcError(IpcErrorCode.NOT_FOUND, 'TaskService 尚未挂载 (PHASE 3)');
  });

  // task:create
  ipcMain.handle(IPC_CHANNELS.TASK_CREATE, async (_event, req) => {
    const parseResult = MainTaskCreateSchema.safeParse(req);
    if (!parseResult.success) {
      return createIpcError(IpcErrorCode.VALIDATION_ERROR, 'Main 端创建任务校验失败', parseResult.error.flatten());
    }
    return createIpcError(IpcErrorCode.INTERNAL_ERROR, 'TaskService 尚未挂载 (PHASE 3 接入 SQLite)');
  });

  // task:update
  ipcMain.handle(IPC_CHANNELS.TASK_UPDATE, async (_event, req) => {
    const parseResult = MainTaskUpdateSchema.safeParse(req);
    if (!parseResult.success) {
      return createIpcError(IpcErrorCode.VALIDATION_ERROR, 'Main 端更新任务校验失败', parseResult.error.flatten());
    }
    return createIpcError(IpcErrorCode.INTERNAL_ERROR, 'TaskService 尚未挂载 (PHASE 3 接入 SQLite)');
  });

  // task:complete
  ipcMain.handle(IPC_CHANNELS.TASK_COMPLETE, async (_event, req) => {
    const parseResult = MainTaskCompleteSchema.safeParse(req);
    if (!parseResult.success) {
      return createIpcError(IpcErrorCode.VALIDATION_ERROR, 'Main 端完成任务校验失败', parseResult.error.flatten());
    }
    return createIpcError(IpcErrorCode.INTERNAL_ERROR, 'TaskService 尚未挂载 (PHASE 3 接入 SQLite)');
  });

  // task:delete
  ipcMain.handle(IPC_CHANNELS.TASK_DELETE, async (_event, req) => {
    const parseResult = MainTaskDeleteSchema.safeParse(req);
    if (!parseResult.success) {
      return createIpcError(IpcErrorCode.CONFIRMATION_REQUIRED, '物理删除任务必须显式传入 confirmed=true');
    }
    return createIpcError(IpcErrorCode.INTERNAL_ERROR, 'TaskService 尚未挂载 (PHASE 3 接入 SQLite)');
  });

  // agent:resume-confirmation
  ipcMain.handle(IPC_CHANNELS.AGENT_RESUME_CONFIRMATION, async (_event, req) => {
    const parseResult = MainAgentResumeConfirmationSchema.safeParse(req);
    if (!parseResult.success) {
      return createIpcError(IpcErrorCode.VALIDATION_ERROR, 'Agent 恢复参数校验失败', parseResult.error.flatten());
    }
    return createIpcError(IpcErrorCode.INTERNAL_ERROR, 'AgentRuntime 尚未挂载 (PHASE 8)');
  });

  // agent:interrupt
  ipcMain.handle(IPC_CHANNELS.AGENT_INTERRUPT, async (_event, req) => {
    const parseResult = MainAgentInterruptSchema.safeParse(req);
    if (!parseResult.success) {
      return createIpcError(IpcErrorCode.VALIDATION_ERROR, 'Agent 中断参数校验失败', parseResult.error.flatten());
    }
    return createIpcError(IpcErrorCode.INTERNAL_ERROR, 'AgentRuntime 尚未挂载 (PHASE 8)');
  });
}

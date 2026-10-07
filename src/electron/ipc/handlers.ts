/**
 * IPC Handler Registry
 * 在 Electron Main 进程中注册受控的 IPC 处理器
 * 严格执行 Main Process Zod 边界校验，并将请求交付 App Core (TaskService) 处理
 */

import { ipcMain, BrowserWindow } from 'electron';
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
import { Task } from '../../domain';
import {
  ITaskService,
  TaskService,
  ITaskRepository,
  IEventBus,
  DomainEventBus,
} from '../../core';
import { createSqliteTaskRepository } from '../../core/services/taskServiceFactory';
import { getDatabaseManager } from '../main/database';

// 默认单例仓储与服务实例
let defaultRepository: ITaskRepository | null = null;
let defaultService: ITaskService | null = null;

export async function registerIpcHandlers(
  customTaskService?: ITaskService,
  customEventBus?: IEventBus
): Promise<ITaskService> {
  const eventBus = customEventBus || DomainEventBus.getInstance();

  if (!defaultRepository) {
    defaultRepository = await createSqliteTaskRepository(getDatabaseManager());
  }

  if (!defaultService) {
    defaultService = new TaskService(defaultRepository, eventBus);
  }

  const taskService: ITaskService = customTaskService || defaultService;

  // 监听领域事件并跨进程广播至所有活跃 BrowserWindow (Event Bus -> IPC Broadcast)
  eventBus.subscribe('*', (event) => {
    try {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.EVENT_SUBSCRIBE, event);
        }
      }
    } catch {
      // 容错处理：在非 Electron 窗口活跃状态下忽略广播异常
    }
  });

  // task:list - 查询任务列表
  ipcMain.handle(IPC_CHANNELS.TASK_LIST, async (_event, req): Promise<IpcResult<Task[]>> => {
    const parseResult = MainTaskListSchema.safeParse(req);
    if (!parseResult.success) {
      return createIpcError(
        IpcErrorCode.VALIDATION_ERROR,
        'Main 端参数安全校验失败',
        parseResult.error.flatten()
      );
    }
    return taskService.listTasks(parseResult.data);
  });

  // task:get - 获取指定任务
  ipcMain.handle(IPC_CHANNELS.TASK_GET, async (_event, req): Promise<IpcResult<Task>> => {
    const parseResult = MainTaskGetSchema.safeParse(req);
    if (!parseResult.success) {
      return createIpcError(IpcErrorCode.VALIDATION_ERROR, '无效的任务 ID', parseResult.error.flatten());
    }
    return taskService.getTask(parseResult.data.id);
  });

  // task:create - 创建任务
  ipcMain.handle(IPC_CHANNELS.TASK_CREATE, async (_event, req): Promise<IpcResult<Task>> => {
    const parseResult = MainTaskCreateSchema.safeParse(req);
    if (!parseResult.success) {
      return createIpcError(IpcErrorCode.VALIDATION_ERROR, 'Main 端创建任务校验失败', parseResult.error.flatten());
    }
    return taskService.createTask(parseResult.data);
  });

  // task:update - 更新任务
  ipcMain.handle(IPC_CHANNELS.TASK_UPDATE, async (_event, req): Promise<IpcResult<Task>> => {
    const parseResult = MainTaskUpdateSchema.safeParse(req);
    if (!parseResult.success) {
      return createIpcError(IpcErrorCode.VALIDATION_ERROR, 'Main 端更新任务校验失败', parseResult.error.flatten());
    }
    return taskService.updateTask(parseResult.data);
  });

  // task:complete - 完成任务
  ipcMain.handle(IPC_CHANNELS.TASK_COMPLETE, async (_event, req): Promise<IpcResult<Task>> => {
    const parseResult = MainTaskCompleteSchema.safeParse(req);
    if (!parseResult.success) {
      return createIpcError(IpcErrorCode.VALIDATION_ERROR, 'Main 端完成任务校验失败', parseResult.error.flatten());
    }
    return taskService.completeTask(parseResult.data.id);
  });

  // task:delete - 删除任务
  ipcMain.handle(IPC_CHANNELS.TASK_DELETE, async (_event, req) => {
    const parseResult = MainTaskDeleteSchema.safeParse(req);
    if (!parseResult.success) {
      return createIpcError(IpcErrorCode.CONFIRMATION_REQUIRED, '物理删除任务必须显式传入 confirmed=true');
    }
    return taskService.deleteTask(parseResult.data.id, parseResult.data.confirmed);
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

  return taskService;
}


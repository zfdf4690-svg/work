/**
 * IPC Zod Schemas
 * 双层防御体系：Renderer UI 输入验证 + Main 端安全边界最终校验
 */

import { z } from 'zod';
import { TaskPriority, TaskSource, TaskStatus } from '../../domain';

// ============================================================================
// 1. Renderer Zod Schemas (UI 表单即时校验与用户交互提示)
// ============================================================================

export const RendererTaskCreateSchema = z.object({
  title: z.string().trim().min(1, '任务标题不能为空').max(200, '任务标题不得超过200字'),
  description: z.string().max(2000, '描述不能超过2000字').optional(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  dueAt: z.string().nullable().optional(),
  source: z.nativeEnum(TaskSource).default(TaskSource.MANUAL),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
});

export const RendererTaskUpdateSchema = z.object({
  id: z.string().min(1, '缺少任务ID'),
  title: z.string().trim().min(1, '任务标题不能为空').max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueAt: z.string().nullable().optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
});

export const RendererTaskDeleteSchema = z.object({
  id: z.string().min(1, '缺少任务ID'),
  confirmed: z.boolean({ message: '必须确认删除操作' }),
});

// ============================================================================
// 2. Main Process Zod Schemas (不可信边界严格校验与安全阻断)
// ============================================================================

export const MainTaskCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  source: z.nativeEnum(TaskSource),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
});

export const MainTaskUpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  category: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
});

export const MainTaskCompleteSchema = z.object({
  id: z.string().min(1),
});

export const MainTaskDeleteSchema = z.object({
  id: z.string().min(1),
  confirmed: z.literal(true, { message: '物理删除任务必须显式传入 confirmed=true' }),
});

export const MainTaskGetSchema = z.object({
  id: z.string().min(1),
});

export const MainTaskListSchema = z
  .object({
    status: z.array(z.nativeEnum(TaskStatus)).optional(),
    priority: z.array(z.nativeEnum(TaskPriority)).optional(),
    source: z.array(z.nativeEnum(TaskSource)).optional(),
    category: z.string().optional(),
    search: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .optional();

// ============================================================================
// 3. Main Process Agent Schemas
// ============================================================================

export const MainAgentResumeConfirmationSchema = z.object({
  runId: z.string().min(1),
  toolCallId: z.string().min(1),
  approved: z.boolean(),
  userInput: z.string().max(2000).optional(),
});

export const MainAgentInterruptSchema = z.object({
  runId: z.string().min(1),
  reason: z.string().max(200).optional(),
});

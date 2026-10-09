/**
 * Task Adapter
 * UI TaskItem ⇄ Domain Task 双向模型适配器
 * 
 * 职责：
 * 1. 优先级双向映射（UI: high/medium/low/normal ⇄ Domain: URGENT/HIGH/MEDIUM/LOW）
 * 2. 状态映射（completed = status === TaskStatus.COMPLETED）
 * 3. 重要性推导（isImportant 由 HIGH/URGENT 动态推导，不落库）
 * 4. 截止时间双向转换（dueAt ISO ⇄ dueTime 自然语言文本，输入容错不抛错）
 * 5. 新建任务输入契约转换（source 固定 MANUAL）
 */

import {
  Task,
  CreateTaskInput,
  TaskPriority as DomainTaskPriority,
  TaskSource,
  TaskStatus,
} from '../domain';
import { TaskItem, TaskPriority as UiTaskPriority } from '../types';

/**
 * UI 优先级 ➔ 后端领域优先级
 * high → HIGH
 * medium / normal → MEDIUM
 * low → LOW
 */
export function mapUiPriorityToDomain(uiPriority?: UiTaskPriority): DomainTaskPriority {
  switch (uiPriority) {
    case 'high':
      return DomainTaskPriority.HIGH;
    case 'low':
      return DomainTaskPriority.LOW;
    case 'medium':
    case 'normal':
    default:
      return DomainTaskPriority.MEDIUM;
  }
}

/**
 * 后端领域优先级 ➔ UI 优先级
 * URGENT / HIGH → high
 * MEDIUM → medium
 * LOW → low
 */
export function mapDomainPriorityToUi(domainPriority: DomainTaskPriority): UiTaskPriority {
  switch (domainPriority) {
    case DomainTaskPriority.URGENT:
    case DomainTaskPriority.HIGH:
      return 'high';
    case DomainTaskPriority.LOW:
      return 'low';
    case DomainTaskPriority.MEDIUM:
    default:
      return 'medium';
  }
}

/**
 * 根据领域优先级推导任务重要性
 * HIGH 与 URGENT 判定为重要
 */
export function isImportantFromDomain(domainPriority: DomainTaskPriority): boolean {
  return (
    domainPriority === DomainTaskPriority.HIGH ||
    domainPriority === DomainTaskPriority.URGENT
  );
}

/**
 * 后端 dueAt (ISO / null) ➔ UI dueTime 展示文本
 * - 无值或解析失败："无截止时间"
 * - 今天："今天 HH:mm"
 * - 明天："明天 HH:mm"
 * - 其它："MM-DD HH:mm"
 */
export function formatDueAtToUi(dueAt?: string | null): string {
  if (!dueAt || typeof dueAt !== 'string') {
    return '无截止时间';
  }

  const d = new Date(dueAt);
  if (isNaN(d.getTime())) {
    return '无截止时间';
  }

  const now = new Date();
  const isSameDay =
    now.getFullYear() === d.getFullYear() &&
    now.getMonth() === d.getMonth() &&
    now.getDate() === d.getDate();

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const isTomorrow =
    tomorrow.getFullYear() === d.getFullYear() &&
    tomorrow.getMonth() === d.getMonth() &&
    tomorrow.getDate() === d.getDate();

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  if (isSameDay) {
    return `今天 ${hours}:${minutes}`;
  }

  if (isTomorrow) {
    return `明天 ${hours}:${minutes}`;
  }

  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${month}-${date} ${hours}:${minutes}`;
}

/**
 * UI 输入的自然截止时间 ➔ 后端 dueAt (ISO 字符串或 null)
 * 能够解析 "今天 HH:mm"、"明天 HH:mm"、"MM-DD HH:mm" 以及标准日期字符串
 * 解析失败或无值时返回 null，绝不抛出错误
 */
export function parseDueTimeToIso(dueTime?: string | null): string | null {
  if (!dueTime || typeof dueTime !== 'string') {
    return null;
  }

  const trimmed = dueTime.trim();
  if (!trimmed || trimmed === '无截止时间' || trimmed === '无') {
    return null;
  }

  try {
    // 1. 匹配 "今天 HH:mm" / "今日 HH:mm"
    const todayMatch = trimmed.match(/^(?:今天|今日)\s*(\d{1,2})[:：](\d{1,2})(?:[:：](\d{1,2}))?$/);
    if (todayMatch) {
      const hours = parseInt(todayMatch[1], 10);
      const minutes = parseInt(todayMatch[2], 10);
      const seconds = todayMatch[3] ? parseInt(todayMatch[3], 10) : 0;
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        const now = new Date();
        const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, seconds);
        return target.toISOString();
      }
    }

    // 2. 匹配 "明天 HH:mm" / "次日 HH:mm"
    const tomorrowMatch = trimmed.match(/^(?:明天|次日)\s*(\d{1,2})[:：](\d{1,2})(?:[:：](\d{1,2}))?$/);
    if (tomorrowMatch) {
      const hours = parseInt(tomorrowMatch[1], 10);
      const minutes = parseInt(tomorrowMatch[2], 10);
      const seconds = tomorrowMatch[3] ? parseInt(tomorrowMatch[3], 10) : 0;
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        const now = new Date();
        const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hours, minutes, seconds);
        return target.toISOString();
      }
    }

    // 3. 匹配 "MM-DD HH:mm" / "MM/DD HH:mm"
    const monthDayMatch = trimmed.match(/^(\d{1,2})[-/月](\d{1,2})(?:日)?\s*(\d{1,2})[:：](\d{1,2})(?:[:：](\d{1,2}))?$/);
    if (monthDayMatch) {
      const month = parseInt(monthDayMatch[1], 10) - 1;
      const day = parseInt(monthDayMatch[2], 10);
      const hours = parseInt(monthDayMatch[3], 10);
      const minutes = parseInt(monthDayMatch[4], 10);
      const seconds = monthDayMatch[5] ? parseInt(monthDayMatch[5], 10) : 0;
      if (month >= 0 && month < 12 && day >= 1 && day <= 31 && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        const now = new Date();
        const target = new Date(now.getFullYear(), month, day, hours, minutes, seconds);
        return target.toISOString();
      }
    }

    // 4. 标准格式解析尝试 (ISO 8601 或标准可解析日期，排除纯数字等非日期文本)
    if (!/^\d+$/.test(trimmed)) {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
  } catch {
    // 捕获意外异常，降级返回 null
    return null;
  }

  return null;
}

/**
 * 后端领域 Task ➔ UI TaskItem
 */
export function domainTaskToUiTask(task: Task): TaskItem {
  return {
    id: task.id,
    title: task.title,
    completed: task.status === TaskStatus.COMPLETED,
    priority: mapDomainPriorityToUi(task.priority),
    dueTime: formatDueAtToUi(task.dueAt),
    category: task.category,
    isImportant: isImportantFromDomain(task.priority),
  };
}

export interface UiCreateTaskParams {
  title: string;
  priority?: UiTaskPriority;
  dueTime?: string;
  category?: string;
  description?: string;
}

/**
 * UI 新建任务输入 ➔ 后端 CreateTaskInput
 * - source 固定为 MANUAL
 * - category 直传
 */
export function createTaskInputFromUi(params: UiCreateTaskParams): CreateTaskInput {
  return {
    title: params.title.trim(),
    description: params.description,
    priority: mapUiPriorityToDomain(params.priority),
    dueAt: parseDueTimeToIso(params.dueTime),
    source: TaskSource.MANUAL,
    category: params.category,
  };
}

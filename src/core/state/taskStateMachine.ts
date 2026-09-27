/**
 * Task State Machine
 * 任务状态机定义与流转合法性校验
 * 
 * 状态流转规则：
 * PENDING -> IN_PROGRESS, COMPLETED, CANCELLED
 * IN_PROGRESS -> PENDING, COMPLETED, CANCELLED
 * COMPLETED -> IN_PROGRESS (Reopen), CANCELLED
 * CANCELLED -> PENDING (Reopen)
 */

import { TaskStatus } from '../../domain/task/task.enums';

export interface StateTransitionResult {
  valid: boolean;
  error?: string;
}

const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.PENDING]: [
    TaskStatus.IN_PROGRESS,
    TaskStatus.COMPLETED,
    TaskStatus.CANCELLED,
  ],
  [TaskStatus.IN_PROGRESS]: [
    TaskStatus.PENDING,
    TaskStatus.COMPLETED,
    TaskStatus.CANCELLED,
  ],
  [TaskStatus.COMPLETED]: [
    TaskStatus.IN_PROGRESS, // 允许重新打开为进行中
    TaskStatus.CANCELLED,
  ],
  [TaskStatus.CANCELLED]: [
    TaskStatus.PENDING,     // 允许重新打开为待处理
  ],
};

export class TaskStateMachine {
  /**
   * 检查状态转移是否合法
   */
  public static canTransition(current: TaskStatus, next: TaskStatus): boolean {
    if (current === next) return true;
    const allowed = ALLOWED_TRANSITIONS[current];
    return allowed ? allowed.includes(next) : false;
  }

  /**
   * 验证状态流转并在不合法时提供详细错误原因
   */
  public static validateTransition(current: TaskStatus, next: TaskStatus): StateTransitionResult {
    if (current === next) {
      return { valid: true };
    }

    if (!this.canTransition(current, next)) {
      return {
        valid: false,
        error: `非法状态跃迁: 无法从 [${current}] 直接流转至 [${next}]。允许的目标状态: [${ALLOWED_TRANSITIONS[current]?.join(', ') || '无'}]`,
      };
    }

    return { valid: true };
  }
}

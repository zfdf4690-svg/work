/**
 * Task Domain Enums
 * 任务领域枚举定义 (Source of Truth)
 */

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TaskSource {
  MANUAL = 'MANUAL',
  AI = 'AI',
  FLOATING_BALL = 'FLOATING_BALL',
  SYSTEM = 'SYSTEM',
  IMPORTED = 'IMPORTED',
}

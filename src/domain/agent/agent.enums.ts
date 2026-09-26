/**
 * Agent Domain Enums
 * AI Agent 执行状态与风险枚举
 */

export enum AgentRunStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  WAITING_CONFIRMATION = 'WAITING_CONFIRMATION',
  INTERRUPTED = 'INTERRUPTED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum AgentRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

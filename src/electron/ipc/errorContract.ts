/**
 * IPC Error & Result Contracts
 * 统一 IPC 错误模型与返回封包契约
 */

export enum IpcErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  CONFIRMATION_REQUIRED = 'CONFIRMATION_REQUIRED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface IpcError {
  code: IpcErrorCode;
  message: string;
  details?: unknown;
}

export type IpcResult<T> =
  | {
      success: true;
      data: T;
      error?: never;
    }
  | {
      success: false;
      data?: never;
      error: IpcError;
    };

export function createIpcSuccess<T>(data: T): IpcResult<T> {
  return {
    success: true,
    data,
  };
}

export function createIpcError(
  code: IpcErrorCode,
  message: string,
  details?: unknown
): IpcResult<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

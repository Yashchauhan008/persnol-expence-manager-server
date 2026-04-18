import { ErrorCodeType } from '../config/errorCode';

export class ServerError extends Error {
  statusCode: number;
  code: ErrorCodeType;

  constructor(statusCode: number, code: ErrorCodeType, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ServerError';
    Error.captureStackTrace(this, this.constructor);
  }
}

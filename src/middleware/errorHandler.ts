import { Request, Response, NextFunction } from 'express';
import { ServerError } from '../core/ServerError.class';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err);

  if (err instanceof ServerError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors,
      },
    });
    return;
  }

  // PostgreSQL unique violation
  if ((err as NodeJS.ErrnoException & { code?: string }).code === '23505') {
    res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'A record with this value already exists' },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
  });
}

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ServerError } from '../core/ServerError.class';
import { ErrorCode } from '../config/errorCode';

interface JwtPayload {
  sub: string;
  email: string;
}

export function authRequired(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new ServerError(401, ErrorCode.UNAUTHORIZED, 'Authentication required'));
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(new ServerError(401, ErrorCode.UNAUTHORIZED, 'Invalid or expired token'));
  }
}

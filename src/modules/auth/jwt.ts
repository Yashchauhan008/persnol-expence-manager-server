import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';

export function signToken(userId: string, email: string): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign({ sub: userId, email }, env.JWT_SECRET, options);
}

import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';
import { ServerError } from '../../../core/ServerError.class';
import { ErrorCode } from '../../../config/errorCode';

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await query<{
      id: string;
      email: string;
      display_name: string | null;
    }>(
      'SELECT id, email, display_name FROM users WHERE id = $1',
      [req.user!.id]
    );

    if (result.rowCount === 0) {
      throw new ServerError(401, ErrorCode.UNAUTHORIZED, 'User no longer exists');
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

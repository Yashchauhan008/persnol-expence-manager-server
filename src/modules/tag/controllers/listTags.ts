import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';

export async function listTags(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await query('SELECT * FROM tags ORDER BY name ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

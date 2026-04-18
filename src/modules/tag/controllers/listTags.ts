import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';

export async function listTags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await query(
      'SELECT * FROM tags WHERE user_id = $1 ORDER BY name ASC',
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
}

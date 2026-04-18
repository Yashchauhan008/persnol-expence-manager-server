import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';

export async function createTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name, color } = req.body as { name: string; color: string };
    const result = await query(
      'INSERT INTO tags (name, color, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name, color, userId]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

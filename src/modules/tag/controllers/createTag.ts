import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';

export async function createTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, color } = req.body as { name: string; color: string };
    const result = await query(
      'INSERT INTO tags (name, color) VALUES ($1, $2) RETURNING *',
      [name, color]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';
import { ServerError } from '../../../core/ServerError.class';

export async function updateTag(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, color } = req.body as { name?: string; color?: string };

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (name !== undefined) { fields.push(`name = $${idx++}`); values.push(name); }
    if (color !== undefined) { fields.push(`color = $${idx++}`); values.push(color); }

    if (fields.length === 0) {
      res.json({ success: true, data: null });
      return;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE tags SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      throw new ServerError(404, 'NOT_FOUND', 'Tag not found');
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';
import { ServerError } from '../../../core/ServerError.class';

export async function updateIncome(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { amount, source, note, date, chart_visibility } = req.body as {
      amount?: number; source?: string; note?: string | null; date?: string; chart_visibility?: boolean;
    };

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (amount !== undefined) { fields.push(`amount = $${idx++}`); values.push(amount); }
    if (source !== undefined) { fields.push(`source = $${idx++}`); values.push(source); }
    if (note !== undefined) { fields.push(`note = $${idx++}`); values.push(note); }
    if (date !== undefined) { fields.push(`date = $${idx++}`); values.push(date); }
    if (chart_visibility !== undefined) { fields.push(`chart_visibility = $${idx++}`); values.push(chart_visibility); }

    if (fields.length === 0) {
      const current = await query('SELECT * FROM incomes WHERE id = $1 AND user_id = $2', [id, userId]);
      if (current.rowCount === 0) throw new ServerError(404, 'NOT_FOUND', 'Income not found');
      res.json({ success: true, data: current.rows[0] });
      return;
    }

    fields.push(`updated_at = NOW()`);
    const idPlaceholder = idx;
    const userPlaceholder = idx + 1;
    values.push(id, userId);

    const result = await query(
      `UPDATE incomes SET ${fields.join(', ')} WHERE id = $${idPlaceholder} AND user_id = $${userPlaceholder} RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      throw new ServerError(404, 'NOT_FOUND', 'Income not found');
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

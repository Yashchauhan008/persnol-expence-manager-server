import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';
import { ServerError } from '../../../core/ServerError.class';

export async function updateLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { person_name, note, date, due_date } = req.body as {
      person_name?: string; note?: string | null; date?: string; due_date?: string | null;
    };

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (person_name !== undefined) { fields.push(`person_name = $${idx++}`); values.push(person_name); }
    if (note !== undefined) { fields.push(`note = $${idx++}`); values.push(note); }
    if (date !== undefined) { fields.push(`date = $${idx++}`); values.push(date); }
    if (due_date !== undefined) { fields.push(`due_date = $${idx++}`); values.push(due_date); }

    if (fields.length === 0) {
      const current = await query('SELECT * FROM loans WHERE id = $1', [id]);
      if (current.rowCount === 0) throw new ServerError(404, 'NOT_FOUND', 'Loan not found');
      res.json({ success: true, data: current.rows[0] });
      return;
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE loans SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      throw new ServerError(404, 'NOT_FOUND', 'Loan not found');
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

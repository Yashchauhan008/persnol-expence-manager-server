import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';
import { ServerError } from '../../../core/ServerError.class';

export async function getExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const result = await query(
      `SELECT
        e.id,
        e.amount,
        e.title,
        e.note,
        to_char(e.date::date, 'YYYY-MM-DD') AS date,
        e.created_at,
        e.updated_at,
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'name', t.name, 'color', t.color)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS tags
      FROM expenses e
      LEFT JOIN expense_tags et ON e.id = et.expense_id
      LEFT JOIN tags t ON et.tag_id = t.id
      WHERE e.id = $1 AND e.user_id = $2
      GROUP BY e.id, e.amount, e.title, e.note, e.date, e.created_at, e.updated_at`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      throw new ServerError(404, 'NOT_FOUND', 'Expense not found');
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

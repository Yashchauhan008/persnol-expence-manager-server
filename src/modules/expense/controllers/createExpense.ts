import { Request, Response, NextFunction } from 'express';
import { getClient } from '../../../service/database';

export async function createExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = await getClient();
  try {
    const { amount, title, note, date, tag_ids = [] } = req.body as {
      amount: number; title: string; note?: string; date: string; tag_ids: string[];
    };

    await client.query('BEGIN');

    const expenseResult = await client.query(
      'INSERT INTO expenses (amount, title, note, date) VALUES ($1, $2, $3, $4) RETURNING *',
      [amount, title, note || null, date]
    );
    const expense = expenseResult.rows[0];

    if (tag_ids.length > 0) {
      const tagValues = tag_ids.map((tagId, i) => `($1, $${i + 2})`).join(', ');
      await client.query(
        `INSERT INTO expense_tags (expense_id, tag_id) VALUES ${tagValues}`,
        [expense.id, ...tag_ids]
      );
    }

    await client.query('COMMIT');

    const fullResult = await client.query(
      `SELECT e.*, COALESCE(
        json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
        FILTER (WHERE t.id IS NOT NULL), '[]'
      ) AS tags
      FROM expenses e
      LEFT JOIN expense_tags et ON e.id = et.expense_id
      LEFT JOIN tags t ON et.tag_id = t.id
      WHERE e.id = $1
      GROUP BY e.id`,
      [expense.id]
    );

    res.status(201).json({ success: true, data: fullResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';

type TagRow = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: Date;
  updated_at: Date;
  total_expense_amount: string | number;
};

export async function listTags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const result = await query<TagRow>(
      `SELECT
         t.id,
         t.user_id,
         t.name,
         t.color,
         t.created_at,
         t.updated_at,
         COALESCE(SUM(e.amount), 0) AS total_expense_amount
       FROM tags t
       LEFT JOIN expense_tags et ON et.tag_id = t.id
       LEFT JOIN expenses e ON e.id = et.expense_id AND e.user_id = $1
       WHERE t.user_id = $1
       GROUP BY t.id
       ORDER BY t.name ASC`,
      [userId]
    );
    const data = result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      color: row.color,
      created_at: row.created_at,
      updated_at: row.updated_at,
      total_expense_amount: Number(row.total_expense_amount),
    }));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

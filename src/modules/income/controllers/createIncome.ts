import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';

export async function createIncome(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { amount, source, note, date, chart_visibility = true } = req.body as {
      amount: number; source: string; note?: string; date: string; chart_visibility?: boolean;
    };

    const result = await query(
      `INSERT INTO incomes (amount, source, note, date, user_id, chart_visibility)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [amount, source, note || null, date, userId, chart_visibility]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

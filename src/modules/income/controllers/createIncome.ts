import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';

export async function createIncome(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { amount, source, note, date } = req.body as {
      amount: number; source: string; note?: string; date: string;
    };

    const result = await query(
      'INSERT INTO incomes (amount, source, note, date) VALUES ($1, $2, $3, $4) RETURNING *',
      [amount, source, note || null, date]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

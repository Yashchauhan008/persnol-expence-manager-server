import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';

export async function createLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, person_name, amount, note, date, due_date } = req.body as {
      type: 'given' | 'taken';
      person_name: string;
      amount: number;
      note?: string;
      date: string;
      due_date?: string | null;
    };

    const result = await query(
      `INSERT INTO loans (type, person_name, amount, remaining_amount, note, date, due_date)
       VALUES ($1, $2, $3, $3, $4, $5, $6) RETURNING *`,
      [type, person_name, amount, note || null, date, due_date || null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

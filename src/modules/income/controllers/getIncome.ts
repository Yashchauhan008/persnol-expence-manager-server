import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';
import { ServerError } from '../../../core/ServerError.class';

export async function getIncome(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT i.id, i.amount, i.source, i.note,
        to_char(i.date::date, 'YYYY-MM-DD') AS date,
        i.created_at, i.updated_at
       FROM incomes i WHERE i.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      throw new ServerError(404, 'NOT_FOUND', 'Income not found');
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

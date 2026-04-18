import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';

export async function listLoans(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type, status } = req.query as { type?: string; status?: string };

    const conditions: string[] = [];
    const values: unknown[] = [];
    let p = 1;
    if (type) {
      conditions.push(`type = $${p++}`);
      values.push(type);
    }
    if (status) {
      conditions.push(`status = $${p++}`);
      values.push(status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [result, sumResult] = await Promise.all([
      query(
        `SELECT * FROM loans ${where} ORDER BY date DESC, created_at DESC`,
        values
      ),
      query<{ sum_original: string; sum_remaining: string }>(
        `SELECT COALESCE(SUM(amount), 0) AS sum_original, COALESCE(SUM(remaining_amount), 0) AS sum_remaining
         FROM loans ${where}`,
        values
      ),
    ]);

    const sumOriginal = parseFloat(sumResult.rows[0]?.sum_original || '0');
    const sumRemaining = parseFloat(sumResult.rows[0]?.sum_remaining || '0');

    res.json({
      success: true,
      data: result.rows,
      meta: {
        total: result.rowCount ?? result.rows.length,
        page: 1,
        limit: result.rowCount ?? result.rows.length,
        total_pages: 1,
        sum_original_amount: sumOriginal,
        sum_remaining_amount: sumRemaining,
        sum_visible_amount: sumOriginal,
        sum_period_amount: sumOriginal,
      },
    });
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';
import { ServerError } from '../../../core/ServerError.class';

export async function getLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const loanResult = await query('SELECT * FROM loans WHERE id = $1', [id]);

    if (loanResult.rowCount === 0) {
      throw new ServerError(404, 'NOT_FOUND', 'Loan not found');
    }

    const settlementsResult = await query(
      'SELECT * FROM loan_settlements WHERE loan_id = $1 ORDER BY date ASC, created_at ASC',
      [id]
    );

    res.json({
      success: true,
      data: { ...loanResult.rows[0], settlements: settlementsResult.rows },
    });
  } catch (err) {
    next(err);
  }
}

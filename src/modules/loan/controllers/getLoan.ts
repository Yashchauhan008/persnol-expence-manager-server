import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';
import { ServerError } from '../../../core/ServerError.class';

export async function getLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const loanResult = await query(
      'SELECT * FROM loans WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (loanResult.rowCount === 0) {
      throw new ServerError(404, 'NOT_FOUND', 'Loan not found');
    }

    const settlementsResult = await query(
      `SELECT s.* FROM loan_settlements s
       INNER JOIN loans l ON l.id = s.loan_id AND l.user_id = $2
       WHERE s.loan_id = $1
       ORDER BY s.date ASC, s.created_at ASC`,
      [id, userId]
    );

    res.json({
      success: true,
      data: { ...loanResult.rows[0], settlements: settlementsResult.rows },
    });
  } catch (err) {
    next(err);
  }
}

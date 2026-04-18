import { Request, Response, NextFunction } from 'express';
import { getClient } from '../../../service/database';
import { ServerError } from '../../../core/ServerError.class';

export async function settlePartialLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = await getClient();
  try {
    const { id } = req.params;
    const { amount, note, date } = req.body as { amount: number; note?: string; date: string };

    await client.query('BEGIN');

    const loanResult = await client.query(
      'SELECT * FROM loans WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (loanResult.rowCount === 0) {
      throw new ServerError(404, 'NOT_FOUND', 'Loan not found');
    }

    const loan = loanResult.rows[0] as {
      id: string; remaining_amount: string; amount: string; status: string;
    };

    if (loan.status === 'settled') {
      throw new ServerError(400, 'BAD_REQUEST', 'This loan is already settled');
    }

    const remaining = parseFloat(loan.remaining_amount);
    const settlementAmount = parseFloat(String(amount));

    if (settlementAmount > remaining) {
      throw new ServerError(
        400,
        'BAD_REQUEST',
        `Settlement amount (${settlementAmount}) cannot exceed remaining amount (${remaining})`
      );
    }

    const newRemaining = parseFloat((remaining - settlementAmount).toFixed(2));
    const newStatus = newRemaining === 0 ? 'settled' : 'partial';

    await client.query(
      `UPDATE loans SET remaining_amount = $1, status = $2, updated_at = NOW() WHERE id = $3`,
      [newRemaining, newStatus, id]
    );

    await client.query(
      `INSERT INTO loan_settlements (loan_id, amount, note, date) VALUES ($1, $2, $3, $4)`,
      [id, settlementAmount, note || null, date]
    );

    await client.query('COMMIT');

    const updatedLoan = await client.query('SELECT * FROM loans WHERE id = $1', [id]);
    const settlements = await client.query(
      'SELECT * FROM loan_settlements WHERE loan_id = $1 ORDER BY date ASC',
      [id]
    );

    res.json({
      success: true,
      data: { ...updatedLoan.rows[0], settlements: settlements.rows },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

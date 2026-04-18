import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';

export async function getDailySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const [
      incomeResult,
      expenseResult,
      newLoansGivenResult,
      newLoansTakenResult,
      settlementsGivenResult,
      settlementsTakenResult,
      tagResult,
    ] = await Promise.all([
      query<{ total: string }>(
        'SELECT COALESCE(SUM(amount), 0) as total FROM incomes WHERE date = $1',
        [date]
      ),
      query<{ total: string }>(
        'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date = $1',
        [date]
      ),
      query<{ total: string }>(
        "SELECT COALESCE(SUM(amount), 0) as total FROM loans WHERE type = 'given' AND date = $1",
        [date]
      ),
      query<{ total: string }>(
        "SELECT COALESCE(SUM(amount), 0) as total FROM loans WHERE type = 'taken' AND date = $1",
        [date]
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(s.amount), 0) as total
         FROM loan_settlements s
         INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'given'
         WHERE s.date = $1`,
        [date]
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(s.amount), 0) as total
         FROM loan_settlements s
         INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'taken'
         WHERE s.date = $1`,
        [date]
      ),
      query<{ tag_id: string; tag_name: string; color: string; total: string }>(
        `SELECT t.id as tag_id, t.name as tag_name, t.color, COALESCE(SUM(e.amount), 0) as total
         FROM expenses e
         JOIN expense_tags et ON e.id = et.expense_id
         JOIN tags t ON et.tag_id = t.id
         WHERE e.date = $1
         GROUP BY t.id, t.name, t.color`,
        [date]
      ),
    ]);

    const totalIncome = parseFloat(incomeResult.rows[0].total);
    const totalExpense = parseFloat(expenseResult.rows[0].total);
    const newLoansGiven = parseFloat(newLoansGivenResult.rows[0].total);
    const newLoansTaken = parseFloat(newLoansTakenResult.rows[0].total);
    const settlementsGiven = parseFloat(settlementsGivenResult.rows[0].total);
    const settlementsTaken = parseFloat(settlementsTakenResult.rows[0].total);

    const net =
      totalIncome -
      totalExpense -
      newLoansGiven +
      settlementsGiven -
      settlementsTaken;

    res.json({
      success: true,
      data: {
        total_income: totalIncome,
        total_expense: totalExpense,
        net,
        total_loans_given: newLoansGiven,
        total_loans_taken: newLoansTaken,
        total_settled_given: settlementsGiven,
        total_settled_taken: settlementsTaken,
        expenses_by_tag: tagResult.rows.map(r => ({
          tag_id: r.tag_id,
          tag_name: r.tag_name,
          color: r.color,
          total: parseFloat(r.total),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

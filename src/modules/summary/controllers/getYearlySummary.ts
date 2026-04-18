import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';

export async function getYearlySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const year = parseInt((req.query.year as string) || String(new Date().getFullYear()), 10);

    const [
      incomeResult,
      expenseResult,
      newLoansGivenResult,
      newLoansTakenResult,
      settlementsGivenResult,
      settlementsTakenResult,
      tagResult,
      monthlyResult,
    ] = await Promise.all([
      query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM incomes WHERE EXTRACT(YEAR FROM date) = $1`,
        [year]
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE EXTRACT(YEAR FROM date) = $1`,
        [year]
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM loans
         WHERE type = 'given' AND EXTRACT(YEAR FROM date) = $1`,
        [year]
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM loans
         WHERE type = 'taken' AND EXTRACT(YEAR FROM date) = $1`,
        [year]
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(s.amount), 0) as total
         FROM loan_settlements s
         INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'given'
         WHERE EXTRACT(YEAR FROM s.date) = $1`,
        [year]
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(s.amount), 0) as total
         FROM loan_settlements s
         INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'taken'
         WHERE EXTRACT(YEAR FROM s.date) = $1`,
        [year]
      ),
      query<{ tag_id: string; tag_name: string; color: string; total: string }>(
        `SELECT t.id as tag_id, t.name as tag_name, t.color, COALESCE(SUM(e.amount), 0) as total
         FROM expenses e
         JOIN expense_tags et ON e.id = et.expense_id
         JOIN tags t ON et.tag_id = t.id
         WHERE EXTRACT(YEAR FROM e.date) = $1
         GROUP BY t.id, t.name, t.color`,
        [year]
      ),
      query<{ month: number; income: string; expense: string }>(
        `SELECT m.month,
          COALESCE(i.total, 0) + COALESCE(sg.total, 0) as income,
          COALESCE(e.total, 0) + COALESCE(st.total, 0) as expense
        FROM generate_series(1, 12) AS m(month)
        LEFT JOIN (
          SELECT EXTRACT(MONTH FROM date)::int as month, SUM(amount) as total
          FROM incomes WHERE EXTRACT(YEAR FROM date) = $1 GROUP BY month
        ) i ON i.month = m.month
        LEFT JOIN (
          SELECT EXTRACT(MONTH FROM date)::int as month, SUM(amount) as total
          FROM expenses WHERE EXTRACT(YEAR FROM date) = $1 GROUP BY month
        ) e ON e.month = m.month
        LEFT JOIN (
          SELECT EXTRACT(MONTH FROM s.date)::int as month, SUM(s.amount) as total
          FROM loan_settlements s
          INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'given'
          WHERE EXTRACT(YEAR FROM s.date) = $1
          GROUP BY month
        ) sg ON sg.month = m.month
        LEFT JOIN (
          SELECT EXTRACT(MONTH FROM s.date)::int as month, SUM(s.amount) as total
          FROM loan_settlements s
          INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'taken'
          WHERE EXTRACT(YEAR FROM s.date) = $1
          GROUP BY month
        ) st ON st.month = m.month
        ORDER BY m.month`,
        [year]
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
        monthly_breakdown: monthlyResult.rows.map(r => ({
          month: r.month,
          income: parseFloat(r.income),
          expense: parseFloat(r.expense),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

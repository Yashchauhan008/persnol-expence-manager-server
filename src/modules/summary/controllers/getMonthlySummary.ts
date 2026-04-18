import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';

export async function getMonthlySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const now = new Date();
    const year = parseInt((req.query.year as string) || String(now.getFullYear()), 10);
    const month = parseInt((req.query.month as string) || String(now.getMonth() + 1), 10);

    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;

    const [
      incomeResult,
      expenseResult,
      newLoansGivenResult,
      newLoansTakenResult,
      settlementsGivenResult,
      settlementsTakenResult,
      tagResult,
      dailyResult,
    ] = await Promise.all([
      query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM incomes
         WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2`,
        [year, month]
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
         WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2`,
        [year, month]
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM loans
         WHERE type = 'given' AND EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2`,
        [year, month]
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM loans
         WHERE type = 'taken' AND EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2`,
        [year, month]
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(s.amount), 0) as total
         FROM loan_settlements s
         INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'given'
         WHERE EXTRACT(YEAR FROM s.date) = $1 AND EXTRACT(MONTH FROM s.date) = $2`,
        [year, month]
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(s.amount), 0) as total
         FROM loan_settlements s
         INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'taken'
         WHERE EXTRACT(YEAR FROM s.date) = $1 AND EXTRACT(MONTH FROM s.date) = $2`,
        [year, month]
      ),
      query<{ tag_id: string; tag_name: string; color: string; total: string }>(
        `SELECT t.id as tag_id, t.name as tag_name, t.color, COALESCE(SUM(e.amount), 0) as total
         FROM expenses e
         JOIN expense_tags et ON e.id = et.expense_id
         JOIN tags t ON et.tag_id = t.id
         WHERE EXTRACT(YEAR FROM e.date) = $1 AND EXTRACT(MONTH FROM e.date) = $2
         GROUP BY t.id, t.name, t.color`,
        [year, month]
      ),
      query<{ day: string; income: string; expense: string }>(
        `SELECT
          EXTRACT(DAY FROM d)::int as day,
          COALESCE(i.total, 0) + COALESCE(sg.total, 0) as income,
          COALESCE(e.total, 0) + COALESCE(st.total, 0) as expense
        FROM generate_series(
          $1::date,
          ($1::date + INTERVAL '1 month' - INTERVAL '1 day'),
          '1 day'::interval
        ) AS d
        LEFT JOIN (
          SELECT date, SUM(amount) as total FROM incomes
          WHERE EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3
          GROUP BY date
        ) i ON i.date = d::date
        LEFT JOIN (
          SELECT date, SUM(amount) as total FROM expenses
          WHERE EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3
          GROUP BY date
        ) e ON e.date = d::date
        LEFT JOIN (
          SELECT s.date, SUM(s.amount) as total
          FROM loan_settlements s
          INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'given'
          WHERE EXTRACT(YEAR FROM s.date) = $2 AND EXTRACT(MONTH FROM s.date) = $3
          GROUP BY s.date
        ) sg ON sg.date = d::date
        LEFT JOIN (
          SELECT s.date, SUM(s.amount) as total
          FROM loan_settlements s
          INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'taken'
          WHERE EXTRACT(YEAR FROM s.date) = $2 AND EXTRACT(MONTH FROM s.date) = $3
          GROUP BY s.date
        ) st ON st.date = d::date
        ORDER BY d`,
        [monthStart, year, month]
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
        daily_breakdown: dailyResult.rows.map(r => ({
          day: r.day,
          income: parseFloat(r.income),
          expense: parseFloat(r.expense),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

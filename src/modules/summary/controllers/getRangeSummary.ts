import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';

export async function getRangeSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const from = req.query.from as string;
    const to = req.query.to as string;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : null;
    const months = req.query.months ? (req.query.months as string).split(',').map(m => parseInt(m, 10)) : null;

    let params: any[] = [userId];
    let filterIncome = '';
    let filterExpense = '';
    let filterLoan = '';
    let filterSettlement = '';
    let filterTag = '';
    let dailyBreakdownQuery = '';

    if (year && months && months.length > 0) {
      // Multiple months selection
      filterIncome = `AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = ANY($3) AND chart_visibility = true`;
      filterExpense = `AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = ANY($3) AND chart_visibility = true`;
      filterLoan = `AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = ANY($3)`;
      filterSettlement = `AND EXTRACT(YEAR FROM s.date) = $2 AND EXTRACT(MONTH FROM s.date) = ANY($3)`;
      filterTag = `AND EXTRACT(YEAR FROM e.date) = $2 AND EXTRACT(MONTH FROM e.date) = ANY($3) AND e.chart_visibility = true`;
      
      const minMonth = Math.min(...months);
      const maxMonth = Math.max(...months);
      const startDate = `${year}-${String(minMonth).padStart(2, '0')}-01`;
      const endDate = new Date(year, maxMonth, 0).toISOString().split('T')[0];
      
      params.push(year, months, startDate, endDate);

      dailyBreakdownQuery = `SELECT
            TO_CHAR(d, 'YYYY-MM-DD') as label,
            COALESCE(i.total, 0) + COALESCE(sg.total, 0) as income,
            COALESCE(e.total, 0) + COALESCE(st.total, 0) as expense
          FROM generate_series(
            $4::date,
            $5::date,
            '1 day'::interval
          ) AS d
          LEFT JOIN (
            SELECT date, SUM(amount) as total FROM incomes
            WHERE user_id = $1
              AND chart_visibility = true
              AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = ANY($3)
            GROUP BY date
          ) i ON i.date = d::date
          LEFT JOIN (
            SELECT date, SUM(amount) as total FROM expenses
            WHERE user_id = $1
              AND chart_visibility = true
              AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = ANY($3)
            GROUP BY date
          ) e ON e.date = d::date
          LEFT JOIN (
            SELECT s.date, SUM(s.amount) as total
            FROM loan_settlements s
            INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'given' AND l.user_id = $1
            WHERE EXTRACT(YEAR FROM s.date) = $2 AND EXTRACT(MONTH FROM s.date) = ANY($3)
            GROUP BY s.date
          ) sg ON sg.date = d::date
          LEFT JOIN (
            SELECT s.date, SUM(s.amount) as total
            FROM loan_settlements s
            INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'taken' AND l.user_id = $1
            WHERE EXTRACT(YEAR FROM s.date) = $2 AND EXTRACT(MONTH FROM s.date) = ANY($3)
            GROUP BY s.date
          ) st ON st.date = d::date
          WHERE EXTRACT(MONTH FROM d) = ANY($3)
          ORDER BY d`;
    } else if (from && to) {
      // Custom range selection
      filterIncome = `AND date >= $2 AND date <= $3 AND chart_visibility = true`;
      filterExpense = `AND date >= $2 AND date <= $3 AND chart_visibility = true`;
      filterLoan = `AND date >= $2 AND date <= $3`;
      filterSettlement = `AND s.date >= $2 AND s.date <= $3`;
      filterTag = `AND e.date >= $2 AND e.date <= $3 AND e.chart_visibility = true`;
      
      params.push(from, to);

      dailyBreakdownQuery = `SELECT
            TO_CHAR(d, 'YYYY-MM-DD') as label,
            COALESCE(i.total, 0) + COALESCE(sg.total, 0) as income,
            COALESCE(e.total, 0) + COALESCE(st.total, 0) as expense
          FROM generate_series(
            $2::date,
            $3::date,
            '1 day'::interval
          ) AS d
          LEFT JOIN (
            SELECT date, SUM(amount) as total FROM incomes
            WHERE user_id = $1
              AND chart_visibility = true
              AND date >= $2 AND date <= $3
            GROUP BY date
          ) i ON i.date = d::date
          LEFT JOIN (
            SELECT date, SUM(amount) as total FROM expenses
            WHERE user_id = $1
              AND chart_visibility = true
              AND date >= $2 AND date <= $3
            GROUP BY date
          ) e ON e.date = d::date
          LEFT JOIN (
            SELECT s.date, SUM(s.amount) as total
            FROM loan_settlements s
            INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'given' AND l.user_id = $1
            WHERE s.date >= $2 AND s.date <= $3
            GROUP BY s.date
          ) sg ON sg.date = d::date
          LEFT JOIN (
            SELECT s.date, SUM(s.amount) as total
            FROM loan_settlements s
            INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'taken' AND l.user_id = $1
            WHERE s.date >= $2 AND s.date <= $3
            GROUP BY s.date
          ) st ON st.date = d::date
          ORDER BY d`;
    } else {
      res.status(400).json({ success: false, message: 'Invalid parameters' });
      return;
    }

    const basicParams = params.slice(0, 3);

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
         WHERE user_id = $1 ${filterIncome}`,
        basicParams
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
         WHERE user_id = $1 ${filterExpense}`,
        basicParams
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM loans
         WHERE user_id = $1 AND type = 'given'
         ${filterLoan}`,
        basicParams
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM loans
         WHERE user_id = $1 AND type = 'taken'
         ${filterLoan}`,
        basicParams
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(s.amount), 0) as total
         FROM loan_settlements s
         INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'given' AND l.user_id = $1
         WHERE 1=1 ${filterSettlement}`,
        basicParams
      ),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(s.amount), 0) as total
         FROM loan_settlements s
         INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'taken' AND l.user_id = $1
         WHERE 1=1 ${filterSettlement}`,
        basicParams
      ),
      query<{ tag_id: string; tag_name: string; color: string; total: string }>(
        `SELECT t.id as tag_id, t.name as tag_name, t.color, COALESCE(SUM(e.amount), 0) as total
         FROM expenses e
         JOIN expense_tags et ON e.id = et.expense_id
         JOIN tags t ON et.tag_id = t.id AND t.user_id = $1
         WHERE e.user_id = $1 ${filterTag}
         GROUP BY t.id, t.name, t.color`,
        basicParams
      ),
      query<{ label: string; income: string; expense: string }>(
        dailyBreakdownQuery,
        params
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
          label: r.label,
          income: parseFloat(r.income),
          expense: parseFloat(r.expense),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

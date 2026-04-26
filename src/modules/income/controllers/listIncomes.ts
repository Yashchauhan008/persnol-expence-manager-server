import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';

function parseNum(v: unknown): number {
  if (typeof v === 'number') return v;
  return parseFloat(String(v));
}

export async function listIncomes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;

    const incomeDateParts: string[] = [];
    const settleDateParts: string[] = [];
    const dateParams: unknown[] = [];
    let pi = 2;

    if (from) {
      incomeDateParts.push(`i.date >= $${pi}::date`);
      settleDateParts.push(`s.date >= $${pi}::date`);
      dateParams.push(from);
      pi += 1;
    }
    if (to) {
      incomeDateParts.push(`i.date <= $${pi}::date`);
      settleDateParts.push(`s.date <= $${pi}::date`);
      dateParams.push(to);
      pi += 1;
    }

    const incomeClause = incomeDateParts.length ? `AND ${incomeDateParts.join(' AND ')}` : '';
    const settleClause = settleDateParts.length ? `AND ${settleDateParts.join(' AND ')}` : '';

    const incomeSql = `
      SELECT i.id, i.amount, i.source, i.note,
        to_char(i.date::date, 'YYYY-MM-DD') AS date,
        i.chart_visibility,
        i.created_at, i.updated_at,
        'income'::text AS entry_kind
      FROM incomes i
      WHERE i.user_id = $1
      ${incomeClause}
      ORDER BY i.date DESC, i.created_at DESC
    `;

    const recoverySql = `
      SELECT s.id, s.amount,
        ('Loan recovery · ' || l.person_name) AS source,
        s.note,
        to_char(s.date::date, 'YYYY-MM-DD') AS date,
        true AS chart_visibility,
        s.created_at, s.created_at AS updated_at,
        'loan_recovery'::text AS entry_kind
      FROM loan_settlements s
      INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'given' AND l.user_id = $1
      WHERE 1 = 1
      ${settleClause}
      ORDER BY s.date DESC, s.created_at DESC
    `;

    const incomeParams = [userId, ...dateParams];
    const recoveryParams = [userId, ...dateParams];

    const sumIncSql = `
      SELECT COALESCE(SUM(i.amount), 0) AS total FROM incomes i
      WHERE i.user_id = $1 ${incomeClause}
    `;
    const sumRecSql = `
      SELECT COALESCE(SUM(s.amount), 0) AS total
      FROM loan_settlements s
      INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'given' AND l.user_id = $1
      WHERE 1 = 1 ${settleClause}
    `;

    const [incomeRows, recoveryRows, sumInc, sumRec] = await Promise.all([
      query(incomeSql, incomeParams),
      query(recoverySql, recoveryParams),
      query<{ total: string }>(sumIncSql, incomeParams),
      query<{ total: string }>(sumRecSql, recoveryParams),
    ]);

    const sumPeriodAmount = parseNum(sumInc.rows[0]?.total) + parseNum(sumRec.rows[0]?.total);

    type Row = Record<string, unknown>;
    const merged: Row[] = [...incomeRows.rows, ...recoveryRows.rows].sort((a, b) => {
      const da = String(a.date);
      const db = String(b.date);
      if (da !== db) return db.localeCompare(da);
      const ca = new Date(String(a.created_at)).getTime();
      const cb = new Date(String(b.created_at)).getTime();
      return cb - ca;
    });

    const sumVisible = merged.reduce((s, r) => s + parseNum(r.amount), 0);

    res.json({
      success: true,
      data: merged,
      meta: {
        total: merged.length,
        page: 1,
        limit: merged.length,
        total_pages: 1,
        sum_period_amount: sumPeriodAmount,
        sum_visible_amount: sumVisible,
      },
    });
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';

function buildDateWhere(alias: string, from?: string, to?: string): { clause: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (from) {
    parts.push(`${alias}.date >= $${i}::date`);
    params.push(from);
    i += 1;
  }
  if (to) {
    parts.push(`${alias}.date <= $${i}::date`);
    params.push(to);
    i += 1;
  }
  return { clause: parts.length ? `WHERE ${parts.join(' AND ')}` : '', params };
}

function parseNum(v: unknown): number {
  if (typeof v === 'number') return v;
  return parseFloat(String(v));
}

export async function listIncomes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;

    const wIncome = buildDateWhere('i', from, to);
    const wSettle = buildDateWhere('s', from, to);

    const incomeSql = `
      SELECT i.id, i.amount, i.source, i.note,
        to_char(i.date::date, 'YYYY-MM-DD') AS date,
        i.created_at, i.updated_at,
        'income'::text AS entry_kind
      FROM incomes i
      ${wIncome.clause}
      ORDER BY i.date DESC, i.created_at DESC
    `;

    const recoverySql = `
      SELECT s.id, s.amount,
        ('Loan recovery · ' || l.person_name) AS source,
        s.note,
        to_char(s.date::date, 'YYYY-MM-DD') AS date,
        s.created_at, s.created_at AS updated_at,
        'loan_recovery'::text AS entry_kind
      FROM loan_settlements s
      INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'given'
      ${wSettle.clause}
      ORDER BY s.date DESC, s.created_at DESC
    `;

    const incomeParams = wIncome.params;
    const recoveryParams = wSettle.params;

    const sumIncSql = `SELECT COALESCE(SUM(i.amount), 0) AS total FROM incomes i ${wIncome.clause}`;
    const sumRecSql = `
      SELECT COALESCE(SUM(s.amount), 0) AS total
      FROM loan_settlements s
      INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'given'
      ${wSettle.clause}
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

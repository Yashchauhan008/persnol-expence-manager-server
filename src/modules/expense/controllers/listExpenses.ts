import { Request, Response, NextFunction } from 'express';
import { query } from '../../../service/database';

function buildExpenseDateWhere(from?: string, to?: string): { clause: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (from) {
    parts.push(`e.date >= $${i}::date`);
    params.push(from);
    i += 1;
  }
  if (to) {
    parts.push(`e.date <= $${i}::date`);
    params.push(to);
    i += 1;
  }
  const clause = parts.length ? `AND ${parts.join(' AND ')}` : '';
  return { clause, params };
}

function buildSettlementDateWhere(from?: string, to?: string): { clause: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (from) {
    parts.push(`s.date >= $${i}::date`);
    params.push(from);
    i += 1;
  }
  if (to) {
    parts.push(`s.date <= $${i}::date`);
    params.push(to);
    i += 1;
  }
  const clause = parts.length ? `AND ${parts.join(' AND ')}` : '';
  return { clause, params };
}

function parseNum(v: unknown): number {
  if (typeof v === 'number') return v;
  return parseFloat(String(v));
}

export async function listExpenses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const tagIdsRaw = typeof req.query.tag_ids === 'string' ? req.query.tag_ids : undefined;
    const tagIds = tagIdsRaw ? tagIdsRaw.split(',').filter(Boolean) : [];

    const wExp = buildExpenseDateWhere(from, to);
    const wSet = buildSettlementDateWhere(from, to);

    let tagClause = '';
    const expenseParams: unknown[] = [...wExp.params];
    if (tagIds.length > 0) {
      const p = expenseParams.length + 1;
      tagClause = `AND EXISTS (
        SELECT 1 FROM expense_tags etf
        WHERE etf.expense_id = e.id AND etf.tag_id = ANY($${p}::uuid[])
      )`;
      expenseParams.push(tagIds);
    }

    const expenseSql = `
      SELECT
        e.id,
        e.amount,
        e.title,
        e.note,
        to_char(e.date::date, 'YYYY-MM-DD') AS date,
        e.created_at,
        e.updated_at,
        'expense'::text AS entry_kind,
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'name', t.name, 'color', t.color)
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) AS tags
      FROM expenses e
      LEFT JOIN expense_tags et ON e.id = et.expense_id
      LEFT JOIN tags t ON et.tag_id = t.id
      WHERE 1 = 1
      ${wExp.clause}
      ${tagClause}
      GROUP BY e.id
      ORDER BY e.date DESC, e.created_at DESC
    `;

    const settlementSql = `
      SELECT
        s.id,
        s.amount,
        ('Loan repayment · ' || l.person_name) AS title,
        s.note,
        to_char(s.date::date, 'YYYY-MM-DD') AS date,
        s.created_at,
        s.created_at AS updated_at,
        'loan_repayment'::text AS entry_kind,
        '[]'::json AS tags
      FROM loan_settlements s
      INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'taken'
      WHERE 1 = 1
      ${wSet.clause}
      ORDER BY s.date DESC, s.created_at DESC
    `;

    const sumExpSql = `SELECT COALESCE(SUM(e.amount), 0) AS total FROM expenses e WHERE 1=1 ${wExp.clause}`;
    const sumSetSql = `
      SELECT COALESCE(SUM(s.amount), 0) AS total
      FROM loan_settlements s
      INNER JOIN loans l ON l.id = s.loan_id AND l.type = 'taken'
      WHERE 1=1 ${wSet.clause}
    `;

    const sumTaggedSql = `
      SELECT COALESCE(SUM(e.amount), 0) AS total
      FROM expenses e
      WHERE 1=1
      ${wExp.clause}
      ${tagClause}
    `;

    const expenseParamsForSum = [...wExp.params];
    if (tagIds.length > 0) {
      expenseParamsForSum.push(tagIds);
    }

    const [expenseRows, sumExp, sumSet] = await Promise.all([
      query<Record<string, unknown>>(expenseSql, expenseParams),
      query<{ total: string }>(sumExpSql, wExp.params),
      query<{ total: string }>(sumSetSql, wSet.params),
    ]);

    let settlementRows: { rows: Record<string, unknown>[] } = { rows: [] };
    if (tagIds.length === 0) {
      settlementRows = await query<Record<string, unknown>>(settlementSql, wSet.params);
    }

    const merged = [...expenseRows.rows, ...settlementRows.rows].sort((a, b) => {
      const da = String(a.date);
      const db = String(b.date);
      if (da !== db) return db.localeCompare(da);
      const ca = new Date(String(a.created_at)).getTime();
      const cb = new Date(String(b.created_at)).getTime();
      return cb - ca;
    });

    const sumPeriodAmount = parseNum(sumExp.rows[0]?.total) + parseNum(sumSet.rows[0]?.total);
    const sumVisible = merged.reduce((s, r) => s + parseNum(r.amount), 0);

    let sumTaggedAmount: number | undefined;
    if (tagIds.length > 0) {
      const tr = await query<{ total: string }>(sumTaggedSql, expenseParamsForSum);
      sumTaggedAmount = parseNum(tr.rows[0]?.total);
    }

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
        ...(tagIds.length > 0 ? { sum_tagged_amount: sumTaggedAmount } : {}),
      },
    });
  } catch (err) {
    next(err);
  }
}

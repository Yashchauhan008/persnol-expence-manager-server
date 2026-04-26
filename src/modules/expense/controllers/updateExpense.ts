import { Request, Response, NextFunction } from 'express';
import { getClient } from '../../../service/database';
import { ServerError } from '../../../core/ServerError.class';
import { ErrorCode } from '../../../config/errorCode';

export async function updateExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = await getClient();
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { amount, title, note, date, tag_ids, chart_visibility } = req.body as {
      amount?: number; title?: string; note?: string | null; date?: string; tag_ids?: string[]; chart_visibility?: boolean;
    };

    await client.query('BEGIN');

    if (tag_ids !== undefined && tag_ids.length > 0) {
      const tagCheck = await client.query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM tags WHERE user_id = $1 AND id = ANY($2::uuid[])`,
        [userId, tag_ids]
      );
      const count = parseInt(tagCheck.rows[0]?.c || '0', 10);
      if (count !== tag_ids.length) {
        throw new ServerError(400, ErrorCode.BAD_REQUEST, 'One or more tags are invalid');
      }
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (amount !== undefined) { fields.push(`amount = $${idx++}`); values.push(amount); }
    if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title); }
    if (note !== undefined) { fields.push(`note = $${idx++}`); values.push(note); }
    if (date !== undefined) { fields.push(`date = $${idx++}`); values.push(date); }
    if (chart_visibility !== undefined) { fields.push(`chart_visibility = $${idx++}`); values.push(chart_visibility); }

    if (fields.length > 0) {
      fields.push(`updated_at = NOW()`);
      const idPlaceholder = idx;
      const userPlaceholder = idx + 1;
      values.push(id, userId);
      const result = await client.query(
        `UPDATE expenses SET ${fields.join(', ')} WHERE id = $${idPlaceholder} AND user_id = $${userPlaceholder} RETURNING id`,
        values
      );
      if (result.rowCount === 0) {
        throw new ServerError(404, 'NOT_FOUND', 'Expense not found');
      }
    } else {
      const check = await client.query(
        'SELECT id FROM expenses WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      if (check.rowCount === 0) throw new ServerError(404, 'NOT_FOUND', 'Expense not found');
    }

    if (tag_ids !== undefined) {
      await client.query('DELETE FROM expense_tags WHERE expense_id = $1', [id]);
      if (tag_ids.length > 0) {
        const tagValues = tag_ids.map((tagId, i) => `($1, $${i + 2})`).join(', ');
        await client.query(
          `INSERT INTO expense_tags (expense_id, tag_id) VALUES ${tagValues}`,
          [id, ...tag_ids]
        );
      }
    }

    await client.query('COMMIT');

    const fullResult = await client.query(
      `SELECT e.*, COALESCE(
        json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
        FILTER (WHERE t.id IS NOT NULL), '[]'
      ) AS tags
      FROM expenses e
      LEFT JOIN expense_tags et ON e.id = et.expense_id
      LEFT JOIN tags t ON et.tag_id = t.id
      WHERE e.id = $1 AND e.user_id = $2
      GROUP BY e.id`,
      [id, userId]
    );

    res.json({ success: true, data: fullResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

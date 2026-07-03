import { Request, Response, NextFunction } from 'express';
import { getClient } from '../../../service/database';

const DEFAULT_TAG_COLOR = '#6366f1';

interface BulkExpenseRow {
  amount: number;
  title: string;
  note?: string;
  date: string;
  tags: string[];
  chart_visibility: boolean;
}

export async function bulkCreateExpenses(req: Request, res: Response, next: NextFunction): Promise<void> {
  const client = await getClient();
  try {
    const userId = req.user!.id;
    const { expenses } = req.body as { expenses: BulkExpenseRow[] };

    await client.query('BEGIN');

    // Resolve tag names (case-insensitive) to ids, creating missing tags
    const tagNames = new Map<string, string>();
    for (const row of expenses) {
      for (const name of row.tags) {
        const trimmed = name.trim();
        if (trimmed) tagNames.set(trimmed.toLowerCase(), trimmed);
      }
    }

    const tagIdByLowerName = new Map<string, string>();
    let tagsCreated = 0;
    if (tagNames.size > 0) {
      const lowerNames = [...tagNames.keys()];
      const existing = await client.query<{ id: string; name: string }>(
        `SELECT id, name FROM tags WHERE user_id = $1 AND lower(name) = ANY($2::text[])`,
        [userId, lowerNames]
      );
      for (const tag of existing.rows) {
        tagIdByLowerName.set(tag.name.toLowerCase(), tag.id);
      }

      for (const [lower, original] of tagNames) {
        if (tagIdByLowerName.has(lower)) continue;
        const created = await client.query<{ id: string }>(
          `INSERT INTO tags (name, color, user_id) VALUES ($1, $2, $3) RETURNING id`,
          [original, DEFAULT_TAG_COLOR, userId]
        );
        tagIdByLowerName.set(lower, created.rows[0].id);
        tagsCreated++;
      }
    }

    let created = 0;
    for (const row of expenses) {
      const expenseResult = await client.query<{ id: string }>(
        `INSERT INTO expenses (amount, title, note, date, user_id, chart_visibility)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [row.amount, row.title, row.note || null, row.date, userId, row.chart_visibility]
      );
      const expenseId = expenseResult.rows[0].id;
      created++;

      const tagIds = [...new Set(
        row.tags
          .map(name => tagIdByLowerName.get(name.trim().toLowerCase()))
          .filter((id): id is string => Boolean(id))
      )];
      if (tagIds.length > 0) {
        const tagValues = tagIds.map((_, i) => `($1, $${i + 2})`).join(', ');
        await client.query(
          `INSERT INTO expense_tags (expense_id, tag_id) VALUES ${tagValues}`,
          [expenseId, ...tagIds]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({ success: true, data: { created, tags_created: tagsCreated } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

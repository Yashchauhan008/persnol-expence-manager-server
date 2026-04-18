import { query } from '../../service/database';

/** Default expense tags created when a user has none yet (names are stable for UX). */
export const DEFAULT_TAGS: { name: string; color: string }[] = [
  { name: 'Insurance', color: '#2563eb' },
  { name: 'Food', color: '#ea580c' },
  { name: 'Transportation', color: '#7c3aed' },
  { name: 'Utilities', color: '#64748b' },
  { name: 'Healthcare', color: '#e11d48' },
  { name: 'Entertainment', color: '#db2777' },
  { name: 'Shopping', color: '#d97706' },
  { name: 'Education', color: '#0d9488' },
  { name: 'Other', color: '#737373' },
];

export async function ensureDefaultTagsForUser(userId: string): Promise<void> {
  const count = await query<{ n: string }>(
    'SELECT COUNT(*)::text AS n FROM tags WHERE user_id = $1',
    [userId]
  );
  const n = parseInt(count.rows[0]?.n || '0', 10);
  if (n > 0) return;

  const values = DEFAULT_TAGS.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(', ');
  const params: unknown[] = [];
  for (const t of DEFAULT_TAGS) {
    params.push(t.name, t.color, userId);
  }

  await query(
    `INSERT INTO tags (name, color, user_id) VALUES ${values}`,
    params
  );
}

-- migrate:up
-- Add default tags for any user who has none (existing accounts before sign-in seeding).

INSERT INTO tags (name, color, user_id)
SELECT v.name, v.color, u.id
FROM users u
CROSS JOIN (VALUES
  ('Insurance', '#2563eb'),
  ('Food', '#ea580c'),
  ('Transportation', '#7c3aed'),
  ('Utilities', '#64748b'),
  ('Healthcare', '#e11d48'),
  ('Entertainment', '#db2777'),
  ('Shopping', '#d97706'),
  ('Education', '#0d9488'),
  ('Other', '#737373')
) AS v(name, color)
WHERE NOT EXISTS (SELECT 1 FROM tags t WHERE t.user_id = u.id);

-- migrate:down
-- Cannot safely remove only seeded defaults; leave tags unchanged.

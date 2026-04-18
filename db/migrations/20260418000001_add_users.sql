-- migrate:up
-- Idempotent: safe if users / user_id columns already exist (partial or full prior run).

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  display_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tags ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'incomes' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE incomes ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'loans' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE loans ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
DECLARE
  legacy UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM tags WHERE user_id IS NULL LIMIT 1)
     OR EXISTS (SELECT 1 FROM incomes WHERE user_id IS NULL LIMIT 1)
     OR EXISTS (SELECT 1 FROM expenses WHERE user_id IS NULL LIMIT 1)
     OR EXISTS (SELECT 1 FROM loans WHERE user_id IS NULL LIMIT 1) THEN
    INSERT INTO users (email, password_hash, display_name)
    VALUES (
      'legacy@migration.local',
      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      'Imported data — register a new account or reset this user'
    )
    ON CONFLICT (email) DO NOTHING;

    SELECT id INTO legacy FROM users WHERE email = 'legacy@migration.local' LIMIT 1;

    UPDATE tags SET user_id = legacy WHERE user_id IS NULL;
    UPDATE incomes SET user_id = legacy WHERE user_id IS NULL;
    UPDATE expenses SET user_id = legacy WHERE user_id IS NULL;
    UPDATE loans SET user_id = legacy WHERE user_id IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'tags' AND c.column_name = 'user_id'
  ) AND NOT EXISTS (SELECT 1 FROM tags WHERE user_id IS NULL LIMIT 1) THEN
    ALTER TABLE tags ALTER COLUMN user_id SET NOT NULL;
  END IF;
EXCEPTION
  WHEN undefined_column THEN NULL;
  WHEN invalid_table_definition THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'incomes' AND c.column_name = 'user_id'
  ) AND NOT EXISTS (SELECT 1 FROM incomes WHERE user_id IS NULL LIMIT 1) THEN
    ALTER TABLE incomes ALTER COLUMN user_id SET NOT NULL;
  END IF;
EXCEPTION
  WHEN undefined_column THEN NULL;
  WHEN invalid_table_definition THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'expenses' AND c.column_name = 'user_id'
  ) AND NOT EXISTS (SELECT 1 FROM expenses WHERE user_id IS NULL LIMIT 1) THEN
    ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;
  END IF;
EXCEPTION
  WHEN undefined_column THEN NULL;
  WHEN invalid_table_definition THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'loans' AND c.column_name = 'user_id'
  ) AND NOT EXISTS (SELECT 1 FROM loans WHERE user_id IS NULL LIMIT 1) THEN
    ALTER TABLE loans ALTER COLUMN user_id SET NOT NULL;
  END IF;
EXCEPTION
  WHEN undefined_column THEN NULL;
  WHEN invalid_table_definition THEN NULL;
END $$;

ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_name_key;

DROP INDEX IF EXISTS tags_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS tags_user_id_name_key ON tags (user_id, name);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);

-- migrate:down

DROP INDEX IF EXISTS idx_loans_user_id;
DROP INDEX IF EXISTS idx_expenses_user_id;
DROP INDEX IF EXISTS idx_incomes_user_id;
DROP INDEX IF EXISTS idx_tags_user_id;
DROP INDEX IF EXISTS idx_users_email;

DROP INDEX IF EXISTS tags_user_id_name_key;

ALTER TABLE loans DROP COLUMN IF EXISTS user_id;
ALTER TABLE expenses DROP COLUMN IF EXISTS user_id;
ALTER TABLE incomes DROP COLUMN IF EXISTS user_id;
ALTER TABLE tags DROP COLUMN IF EXISTS user_id;

DROP TABLE IF EXISTS users;

CREATE UNIQUE INDEX IF NOT EXISTS tags_name_key ON tags (name);

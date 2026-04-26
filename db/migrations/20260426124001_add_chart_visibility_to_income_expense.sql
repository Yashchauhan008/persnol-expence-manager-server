-- migrate:up
ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS chart_visibility BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS chart_visibility BOOLEAN NOT NULL DEFAULT true;

-- migrate:down
ALTER TABLE expenses
  DROP COLUMN IF EXISTS chart_visibility;

ALTER TABLE incomes
  DROP COLUMN IF EXISTS chart_visibility;

-- Up Migration

-- Erweiterte Status-Werte
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'follow_up';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'responded';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'no_interest';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'meeting';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'won';

-- Follow-up Tracking Felder
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_count INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;

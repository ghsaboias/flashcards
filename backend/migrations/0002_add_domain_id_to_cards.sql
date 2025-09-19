-- Migration: Add domain_id column to cards table
-- Date: 2025-09-18

-- Add domain_id column to cards table
ALTER TABLE cards ADD COLUMN domain_id TEXT REFERENCES domains(id);

-- Set all existing cards to Chinese domain
UPDATE cards SET domain_id = 'chinese' WHERE domain_id IS NULL;
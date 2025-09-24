-- Migration: Add network-aware fields to existing cards table

-- Add network-aware fields to existing cards table
ALTER TABLE cards ADD COLUMN hub_score REAL DEFAULT 0.0;
ALTER TABLE cards ADD COLUMN cluster_role TEXT DEFAULT 'leaf' CHECK(cluster_role IN ('anchor', 'branch', 'leaf'));
ALTER TABLE cards ADD COLUMN semantic_domain TEXT;
ALTER TABLE cards ADD COLUMN radical_family TEXT;

-- Index for network queries
CREATE INDEX IF NOT EXISTS idx_cards_hub_score ON cards(hub_score DESC);
CREATE INDEX IF NOT EXISTS idx_cards_semantic_domain ON cards(semantic_domain);
CREATE INDEX IF NOT EXISTS idx_cards_cluster_role ON cards(cluster_role);
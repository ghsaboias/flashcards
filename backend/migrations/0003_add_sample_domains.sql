-- Migration: Add geography domain with sample data
-- Date: 2025-09-18

-- Add geography domain
INSERT INTO domains (id, name, icon, has_audio) VALUES
('geography', 'World Geography', '🌍', 0);

-- Add sample geography flashcards
INSERT INTO cards (domain_id, category_key, set_key, question, answer) VALUES
('geography', 'europe', 'Geography/Europe/Western_Europe', 'France', 'Paris'),
('geography', 'europe', 'Geography/Europe/Western_Europe', 'Germany', 'Berlin'),
('geography', 'europe', 'Geography/Europe/Western_Europe', 'Spain', 'Madrid'),
('geography', 'europe', 'Geography/Europe/Western_Europe', 'Italy', 'Rome'),
('geography', 'europe', 'Geography/Europe/Western_Europe', 'United Kingdom', 'London'),
('geography', 'asia', 'Geography/Asia/East_Asia', 'Japan', 'Tokyo'),
('geography', 'asia', 'Geography/Asia/East_Asia', 'South Korea', 'Seoul'),
('geography', 'asia', 'Geography/Asia/East_Asia', 'China', 'Beijing'),
('geography', 'americas', 'Geography/Americas/North_America', 'United States', 'Washington D.C.'),
('geography', 'americas', 'Geography/Americas/North_America', 'Canada', 'Ottawa');
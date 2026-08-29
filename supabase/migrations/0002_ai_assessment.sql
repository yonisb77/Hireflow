-- Lägger till lagring för AI-bedömning av CV/profil på kandidater.
-- Kör i Supabase SQL Editor efter 0001_init.sql.

alter table public.candidates
  add column if not exists ai_assessment jsonb,
  add column if not exists ai_assessed_at timestamptz;

-- Aktiverar Supabase Realtime så kanban-vyn synkas live mellan flikar/användare.
-- Kör i Supabase SQL Editor efter 0002_ai_assessment.sql.

alter publication supabase_realtime add table public.candidates;
alter publication supabase_realtime add table public.jobs;

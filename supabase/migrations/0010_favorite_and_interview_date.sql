-- Favorit-markering och intervju-datum på kandidater. Täcks av samma
-- rad-nivå-RLS som redan finns (candidates_update), inga nya policyer behövs.

alter table public.candidates
  add column if not exists is_favorite boolean not null default false,
  add column if not exists interview_date date;

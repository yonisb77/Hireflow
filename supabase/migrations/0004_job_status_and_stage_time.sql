-- Jobbstatus (öppen/stängd) och tidsspårning per rekryteringssteg.
-- Kör i Supabase SQL Editor efter 0003_realtime.sql.

alter table public.jobs
  add column if not exists status text not null default 'open' check (status in ('open', 'closed'));

alter table public.candidates
  add column if not exists stage_changed_at timestamptz not null default now();

-- Uppdaterar automatiskt stage_changed_at varje gång en kandidat faktiskt
-- byter steg, så "dagar i detta steg" alltid är korrekt utan att klienten
-- behöver hålla reda på det själv.
create or replace function public.set_stage_changed_at()
returns trigger
language plpgsql
as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_changed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists set_stage_changed_at on public.candidates;
create trigger set_stage_changed_at
  before update of stage on public.candidates
  for each row execute function public.set_stage_changed_at();

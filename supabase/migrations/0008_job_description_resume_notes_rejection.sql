-- Fyra tillägg:
-- 1) jobs.description — kravtext för jobbet, används i AI-bedömningen.
-- 2) candidates.resume_path — pekar på en fil i Storage-bucketen "resumes".
-- 3) candidate_notes — tidslinje av tidsstämplade anteckningar (flera
--    personer kan lägga till utan att skriva över varandra), separat från
--    candidates.notes (som förblir det korta "snabb-anteckningar"-fältet
--    som visas på kanban-kortet och som AI:n läser).
-- 4) candidates.rejection_reason — fritext, relevant när stage = 'rejected'.

alter table public.jobs
  add column if not exists description text;

alter table public.candidates
  add column if not exists resume_path text,
  add column if not exists rejection_reason text;

-- ---------------------------------------------------------------------------
-- candidate_notes
-- ---------------------------------------------------------------------------
create table if not exists public.candidate_notes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  company_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_role text not null check (author_role in ('admin', 'customer')),
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.candidate_notes enable row level security;

-- company_id och author_role härleds server-side, aldrig från klienten:
-- samma mönster som candidates.company_id i 0001_init.sql.
create or replace function public.set_candidate_note_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select company_id into new.company_id from public.candidates where id = new.candidate_id;
  select role into new.author_role from public.profiles where id = new.author_id;
  return new;
end;
$$;

drop trigger if exists set_candidate_note_metadata on public.candidate_notes;
create trigger set_candidate_note_metadata
  before insert on public.candidate_notes
  for each row execute function public.set_candidate_note_metadata();

drop policy if exists "candidate_notes_select" on public.candidate_notes;
create policy "candidate_notes_select" on public.candidate_notes
  for select using (company_id = auth.uid() or public.is_admin());

drop policy if exists "candidate_notes_insert" on public.candidate_notes;
create policy "candidate_notes_insert" on public.candidate_notes
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.candidates c
      where c.id = candidate_id and (c.company_id = auth.uid() or public.is_admin())
    )
  );

create index if not exists candidate_notes_candidate_id_idx on public.candidate_notes(candidate_id);

-- ---------------------------------------------------------------------------
-- Storage: privat bucket för CV:n. Sökväg: {company_id}/{candidate_id}-{filnamn}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('resumes', 'resumes', false, 5242880)
on conflict (id) do nothing;

drop policy if exists "resumes_select" on storage.objects;
create policy "resumes_select" on storage.objects
  for select using (
    bucket_id = 'resumes'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "resumes_insert" on storage.objects;
create policy "resumes_insert" on storage.objects
  for insert with check (
    bucket_id = 'resumes'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "resumes_delete" on storage.objects;
create policy "resumes_delete" on storage.objects
  for delete using (
    bucket_id = 'resumes'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

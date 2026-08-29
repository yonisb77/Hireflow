-- Hireflow schema, RLS-policyer och auth-triggers.
-- Kör denna en gång i Supabase SQL Editor (eller via `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: en rad per inloggad användare. role='admin' kan agera åt vilken
-- 'customer' som helst. role='customer' är en tenant, identifierad av profiles.id.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  company_name text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- security definer: säker att anropa från RLS-policyer utan rekursiv RLS
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- nya användare får automatiskt en profilrad. role/company_name kan sättas
-- via user_metadata vid skapandet (se edge-funktionen).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, company_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'customer'),
    coalesce(new.raw_user_meta_data->>'company_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- jobb
-- ---------------------------------------------------------------------------
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  department text,
  created_at timestamptz not null default now()
);

alter table public.jobs enable row level security;

drop policy if exists "jobs_select" on public.jobs;
create policy "jobs_select" on public.jobs
  for select using (company_id = auth.uid() or public.is_admin());

drop policy if exists "jobs_insert" on public.jobs;
create policy "jobs_insert" on public.jobs
  for insert with check (company_id = auth.uid() or public.is_admin());

drop policy if exists "jobs_update" on public.jobs;
create policy "jobs_update" on public.jobs
  for update using (company_id = auth.uid() or public.is_admin());

drop policy if exists "jobs_delete" on public.jobs;
create policy "jobs_delete" on public.jobs
  for delete using (company_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- kandidater
-- ---------------------------------------------------------------------------
create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  company_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  email text,
  linkedin_url text,
  notes text,
  stage text not null default 'sourcing'
    check (stage in ('sourcing', 'screening', 'interview', 'offer', 'hired', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.candidates enable row level security;

-- company_id härleds alltid server-side från jobbet, så en kund kan
-- aldrig koppla en kandidat till ett annat företags jobb.
create or replace function public.set_candidate_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select company_id into new.company_id from public.jobs where id = new.job_id;
  return new;
end;
$$;

drop trigger if exists set_candidate_company_id on public.candidates;
create trigger set_candidate_company_id
  before insert or update of job_id on public.candidates
  for each row execute function public.set_candidate_company_id();

drop policy if exists "candidates_select" on public.candidates;
create policy "candidates_select" on public.candidates
  for select using (company_id = auth.uid() or public.is_admin());

drop policy if exists "candidates_insert" on public.candidates;
create policy "candidates_insert" on public.candidates
  for insert with check (
    exists (
      select 1 from public.jobs j
      where j.id = job_id and (j.company_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "candidates_update" on public.candidates;
create policy "candidates_update" on public.candidates
  for update using (company_id = auth.uid() or public.is_admin());

drop policy if exists "candidates_delete" on public.candidates;
create policy "candidates_delete" on public.candidates
  for delete using (company_id = auth.uid() or public.is_admin());

create index if not exists jobs_company_id_idx on public.jobs(company_id);
create index if not exists candidates_job_id_idx on public.candidates(job_id);
create index if not exists candidates_company_id_idx on public.candidates(company_id);

-- ---------------------------------------------------------------------------
-- Bootstrap: gör första användaren till admin.
-- Skapa en användare först (Supabase Dashboard -> Authentication),
-- kör sedan:
--   update public.profiles set role = 'admin' where email = 'din@epost.se';
-- ---------------------------------------------------------------------------

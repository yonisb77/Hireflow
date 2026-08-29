-- Säkerhetsfix: jobbstatus (öppen/stängd, tillagd i 0004) upprätthölls bara
-- i klienten (dolde stängda jobb i dropdownen). Databasen tillät fortfarande
-- att lägga till en kandidat på ett stängt jobb via ett direkt API-anrop,
-- helt förbi UI:t. Flyttar kontrollen till RLS-policyn där den hör hemma —
-- admin får fortfarande lägga till kandidater på stängda jobb (t.ex. för att
-- städa upp historik), en vanlig kund inte.

drop policy if exists "candidates_insert" on public.candidates;
create policy "candidates_insert" on public.candidates
  for insert with check (
    exists (
      select 1 from public.jobs j
      where j.id = job_id
        and (
          (j.company_id = auth.uid() and j.status = 'open')
          or public.is_admin()
        )
    )
  );

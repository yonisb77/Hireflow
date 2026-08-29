-- Säkerhetsfix: profiles_update-policyn (0001_init.sql) tillåter en kund att
-- uppdatera sin egen profilrad (id = auth.uid()), men har inget WITH CHECK
-- som begränsar VILKA kolumner som får ändras. Postgres RLS återanvänder då
-- USING som WITH CHECK, vilket bara kollar att raden fortfarande tillhör
-- samma id — inte att role-kolumnen lämnas orörd. En inloggad kund kunde
-- alltså köra update({role:'admin'}) på sin egen rad och självutnämna sig
-- till admin, helt förbi UI:t.
--
-- Fixen: en trigger som tyst återställer role om den ändras av någon som
-- inte redan är admin, oavsett vilken väg uppdateringen kom (UI, API, curl).

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role = old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_role_escalation on public.profiles;
create trigger prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- Säkerhetsfix: set_stage_changed_at (0004) triggade bara på "update of
-- stage", och när den triggade lämnade den stage_changed_at orörd om stage
-- var oförändrad. Det betydde att en klient kunde skicka ett eget värde för
-- stage_changed_at direkt (t.ex. ett gammalt datum för att slippa
-- "fastnat länge"-flaggan, eller tvärtom) via ett update som inte rör stage
-- alls, och det skulle gå igenom oemotsagt. Kolumnen ska aldrig vara
-- klientstyrd — nu normaliseras den på varje update, oavsett vilka andra
-- fält som ändras.

create or replace function public.set_stage_changed_at()
returns trigger
language plpgsql
as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_changed_at = now();
  else
    new.stage_changed_at = old.stage_changed_at;
  end if;
  return new;
end;
$$;

drop trigger if exists set_stage_changed_at on public.candidates;
create trigger set_stage_changed_at
  before update on public.candidates
  for each row execute function public.set_stage_changed_at();

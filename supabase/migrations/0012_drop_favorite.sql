-- Favorit-markering var inte del av kraven — plockar bort igen för att hålla
-- schemat till det som faktiskt används. interview_date (samma migration som
-- lade till is_favorite, 0010) behålls.

alter table public.candidates
  drop column if exists is_favorite;

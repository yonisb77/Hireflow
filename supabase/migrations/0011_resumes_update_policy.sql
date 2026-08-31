-- uploadResumeFile kör upload(..., { upsert: true }), vilket blir en UPDATE
-- mot storage.objects när samma sökväg redan finns (t.ex. samma filnamn
-- laddas upp igen). Migration 0008 gav bara select/insert/delete-policyer —
-- utan update-policyn nekas den uppdateringen av RLS.

drop policy if exists "resumes_update" on storage.objects;
create policy "resumes_update" on storage.objects
  for update using (
    bucket_id = 'resumes'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

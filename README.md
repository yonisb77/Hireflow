# Hireflow

Ett rekryteringssystem (ATS). React + Vite + Tailwind i frontend, Supabase (Postgres, Auth, Edge Functions) som backend.

## Funktioner

- Admin skapar admin- och kundkonton (inbjudan via e-post, ingen öppen registrering)
- Kunder loggar in och hanterar sina egna jobb och kandidater
- Kanban-vy över kandidater per steg (Sökning → Urval → Intervju → Erbjudande → Anställd/Avvisad), drag-and-drop
- Filtrera vyn på jobb och kandidatnamn (matchar även anteckningar)
- Exportera nuvarande (filtrerade) kandidatlista som CSV
- Jobb kan stängas ("Öppen"/"Stängd") utan att raderas — hindrar nya kandidater men behåller historiken
- Varje kandidatkort visar hur länge de suttit i sitt nuvarande steg, med en varning om det gått ≥14 dagar
- Admin ser och kan agera åt alla kunder (extra företagsfilter + företagsväljare i modalerna för jobb/kandidat)
- Ta bort jobb ("Hantera jobb") och, för admin, ta bort kundkonton ("Hantera företag") — kaskaderar bort tillhörande jobb/kandidater
- Multi-tenant dataisolering upprätthålls i databasen via Postgres Row Level Security, inte bara i UI:t
- AI-bedömning av kandidater mot jobbet (Claude)
- Jobb kan ha en beskrivning/kravprofil (redigerbar), som AI-bedömningen använder för bättre matchning
- Kandidater kan ha ett bifogat CV (PDF/Word, lagras privat i Supabase Storage, max 5 MB)
- Anteckningstidslinje per kandidat — flera personer kan lägga till tidsstämplade kommentarer utan att skriva över varandra
- Anledning till avslag kan anges när en kandidat markeras "Avvisad"
- Användarmeny (klick på namnet i headern) med byt lösenord, admin-åtgärder och utloggning samlat på ett ställe
- Statistik: andel anställda av avgjorda, snittid till anställning, kandidater per steg/jobb, antal inaktiva (≥14 dagar utan förändring) — speglar aktiva filter
- GDPR: CV-filen raderas automatiskt när en kandidat tas bort; en admin/kund kan exportera all lagrad data om en kandidat som JSON
- Riktig ångra-funktion vid borttagning av kandidat (toast med "Ångra" i 6 sek, inte bara en bekräftelse-dialog)
- Live-synk mellan flikar/användare (Supabase Realtime) — ändringar i jobb/kandidater dyker upp direkt utan att ladda om sidan, RLS gäller precis som för vanliga frågor

## Datamodell

- `profiles` — en rad per inloggad användare, `role` är `admin` eller `customer`. En kunds `profiles.id` *är* dess tenant/företags-id.
- `jobs` — tillhör ett `company_id` (en kunds profil-id).
- `candidates` — tillhör ett `job_id`; `company_id` härleds server-side från jobbet via en trigger, så det kan aldrig förfalskas av klienten.

RLS-policyer: en kund ser bara rader där `company_id = auth.uid()`; en admin (kontrolleras via funktionen `is_admin()`, `security definer`) ser och skriver allt.

## Installation

1. **Skapa ett Supabase-projekt** på supabase.com.
2. **Kör migrationerna** i ordning i SQL Editor i Supabase-dashboarden:
   - [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — schema, RLS, triggers
   - [`supabase/migrations/0002_ai_assessment.sql`](supabase/migrations/0002_ai_assessment.sql) — kolumner för AI-bedömning
   - [`supabase/migrations/0003_realtime.sql`](supabase/migrations/0003_realtime.sql) — aktiverar realtidspublicering i databasen; frontend prenumererar på den (`useAtsQuery`) för att synka jobb/kandidater live mellan flikar/användare
   - [`supabase/migrations/0004_job_status_and_stage_time.sql`](supabase/migrations/0004_job_status_and_stage_time.sql) — jobbstatus + tidsspårning per steg
   - [`supabase/migrations/0005_prevent_role_escalation.sql`](supabase/migrations/0005_prevent_role_escalation.sql) — täpper till en privilege-escalation-lucka i `profiles`-policyn (se kommentar i filen)
   - [`supabase/migrations/0006_enforce_job_status_on_insert.sql`](supabase/migrations/0006_enforce_job_status_on_insert.sql) — flyttar "stängt jobb"-kontrollen från UI till RLS
   - [`supabase/migrations/0007_lock_stage_changed_at.sql`](supabase/migrations/0007_lock_stage_changed_at.sql) — låser `stage_changed_at` mot att klienten skickar egna värden
   - [`supabase/migrations/0008_job_description_resume_notes_rejection.sql`](supabase/migrations/0008_job_description_resume_notes_rejection.sql) — jobbeskrivning, CV-lagring (Storage-bucket + RLS), anteckningstidslinje, avslagsanledning
   - [`supabase/migrations/0009_rename_admin_display.sql`](supabase/migrations/0009_rename_admin_display.sql) — engångsfix: sätter visningsnamnet för det första admin-kontot till "Admin" (byt ut e-postadressen i filen mot din egen innan den körs)
3. **Deploya edge-funktionerna** (kräver [Supabase CLI](https://supabase.com/docs/guides/cli)):
   ```bash
   npx supabase login
   npx supabase link --project-ref DITT_PROJECT_REF
   npx supabase functions deploy create-user
   npx supabase functions deploy delete-user
   npx supabase functions deploy assess-candidate
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-din-nyckel
   ```
   `create-user` och `delete-user` låter en admin bjuda in respektive ta bort kundkonton (använder service-role-nyckeln, som Supabase injicerar automatiskt i deployade funktioner — lägg aldrig den nyckeln i frontend). `assess-candidate` kör med den inloggade användarens egen JWT, så RLS avgör vad de får bedöma; kräver en Anthropic API-nyckel med krediter.
4. **Skapa första admin-kontot**: eftersom bara admins kan skapa konton måste första användaren skapas för hand:
   - Supabase Dashboard → Authentication → Users → Add user (sätt lösenord, eller använd "invite").
   - Kör sedan i SQL Editor: `update public.profiles set role = 'admin' where email = 'din@epost.se';`
   - Om "Admin"-genvägen vid inloggning ska funka (se "Hur inloggning fungerar" nedan) måste `ADMIN_SHORTCUT_EMAIL` i `src/App.tsx` ändras till samma e-postadress.
5. **Sätt miljövariabler**: kopiera `.env.example` till `.env` och fyll i projektets URL och anon-nyckel (Dashboard → Settings → API).
6. **Installera & kör**:
   ```bash
   npm install
   npm run dev
   ```

## Driftsätta frontend

Vilken statisk host som helst funkar (Vercel, Netlify, Cloudflare Pages). Sätt `VITE_SUPABASE_URL` och `VITE_SUPABASE_ANON_KEY` som miljövariabler vid bygget. `npm run build` bygger till `dist/`.

Kom ihåg att uppdatera **Site URL** och **Redirect URLs** i Supabase (Authentication → URL Configuration) till den riktiga driftsatta URL:en, annars pekar inbjudningsmail fel.

## Hur inloggning fungerar

Inloggningsfältet heter "Användarnamn" och tar emot en e-postadress för kunder. Admin-kontot har en hårdkodad genväg: att skriva "Admin" i fältet slår upp den riktiga e-postadressen (satt i `ADMIN_SHORTCUT_EMAIL` i `src/App.tsx`) innan inloggningen skickas till Supabase Auth — det är ingen egen användarnamnsinloggning, bara en förkortning för det enda admin-kontot. Att skriva admin-kontots riktiga e-postadress direkt blockeras i gränssnittet.

## Hur kontoskapande fungerar

Admin använder knappen "Skapa konto" för att skicka en e-postinbjudan (via `supabase.auth.admin.inviteUserByEmail`, körs i edge-funktionen `create-user`). Den inbjudna klickar på länken i mailet, sätter ett lösenord, och en databastrigger (`handle_new_user`) skapar deras `profiles`-rad med den roll och det företagsnamn admin angav. E-post skickas via Supabases inbyggda SMTP som standard — för produktionsvolym behöver en egen SMTP-leverantör konfigureras i Supabase-dashboarden.

## Hur AI-bedömning fungerar

På en kandidats detaljvy kan man klicka "AI-bedöm mot jobbet". Edge-funktionen `assess-candidate` hämtar kandidatens profil (namn, LinkedIn, anteckningar), jobbets titel/avdelning/beskrivning — via anroparens egen inloggning, så RLS skyddar automatiskt mot att bedöma andras kandidater — samt, om ett CV är bifogat, laddar ner filen från Storage och textextraherar den (PDF via `unpdf`, DOCX via `mammoth`; äldre `.doc`-format och skannade bild-PDF:er utan textlager stöds inte och faller tillbaka på profilinformationen). Allt skickas till Claude med en instruktion om att svara med strukturerad JSON (poäng 1–10, sammanfattning, styrkor, svagheter), och resultatet sparas på kandidaten.

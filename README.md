# Hireflow

**Ett rekryteringssystem (ATS)** — från jobbannons till anställning, i en kompakt kanban-vy. Byggt för att kunna sättas i händerna på en riktig kund snabbt: multi-tenant från grunden, säkerhet i databasen (inte bara UI:t), och en AI-driven CV-bedömning som faktiskt läser innehållet i det bifogade CV:t.

[![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth%20%2B%20Edge-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Claude AI](https://img.shields.io/badge/AI-Claude-d97757?logo=anthropic&logoColor=white)](https://anthropic.com)
[![Row Level Security](https://img.shields.io/badge/Multi--tenant-Row%20Level%20Security-0ea5e9)]()
[![Realtime](https://img.shields.io/badge/Live%20sync-Realtime-a855f7)]()
[![CI](https://img.shields.io/badge/CI-GitHub%20Actions-2088ff?logo=githubactions&logoColor=white)]()

**Live-demo:** https://hireflow-mini-ats.vercel.app

## Innehåll

- [Funktioner](#funktioner)
- [Datamodell](#datamodell)
- [Installation](#installation)
- [Driftsätta frontend](#driftsätta-frontend)
- [Hur inloggning fungerar](#hur-inloggning-fungerar)
- [Hur kontoskapande fungerar](#hur-kontoskapande-fungerar)
- [Hur AI-bedömning fungerar](#hur-ai-bedömning-fungerar)

## Funktioner

- Admin bjuder in admin-/kundkonton via mejl, ingen öppen registrering
- Kanban-vy per jobb, drag-and-drop, filter på jobb/namn
- Admin kan agera åt vilken kund som helst
- AI-bedömning (Claude) läser faktiskt CV-textens innehåll, inte bara att filen finns — med kostnadsskydd mot spam-klick
- CV-uppladdning, anteckningstidslinje, favoriter, intervjudatum, dubblettvarning
- Statistik, CSV-export, GDPR-dataexport, riktig ångra-funktion
- Live-synk mellan flikar/användare (Realtime)
- Multi-tenant dataisolering i databasen (Row Level Security), inte bara UI:t

**Säkerhet, drift & kvalitet**
- Multi-tenant dataisolering upprätthålls i databasen via Postgres Row Level Security, inte bara i UI:t
- GDPR: CV-filen raderas automatiskt när en kandidat tas bort; en admin/kund kan exportera all lagrad data om en kandidat som JSON
- Live-synk mellan flikar/användare (Supabase Realtime) — ändringar i jobb/kandidater dyker upp direkt utan att ladda om sidan, RLS gäller precis som för vanliga frågor
- TypeScript strict mode, CI (GitHub Actions) kör lint + build på varje push

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

**Kostnadsskydd:** en kandidat kan inte bedömas om igen förrän 60 sekunder gått sedan senaste bedömningen (kollas server-side mot `ai_assessed_at`, går inte att kringgå från klienten) — förhindrar att upprepad klickning eller massrankning drar onödiga Anthropic-krediter.

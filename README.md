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

## Innehåll

- [Funktioner](#funktioner)
- [Datamodell](#datamodell)
- [Installation](#installation)
- [Driftsätta frontend](#driftsätta-frontend)
- [Hur inloggning & kontoskapande fungerar](#hur-inloggning--kontoskapande-fungerar)
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
- TypeScript strict mode, CI kör lint + build på varje push

## Datamodell

`profiles` (roll admin/customer, id = tenant) → `jobs` (company_id) → `candidates` (job_id, company_id härleds server-side, kan inte förfalskas). RLS: kund ser bara sina egna rader, admin ser allt.

## Installation

1. Skapa ett Supabase-projekt, kör migrationerna i `supabase/migrations/` i ordning (SQL Editor eller `supabase db push`)
2. Deploya edge-funktionerna:
   ```bash
   npx supabase login
   npx supabase link --project-ref DITT_PROJECT_REF
   npx supabase functions deploy create-user
   npx supabase functions deploy delete-user
   npx supabase functions deploy assess-candidate
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-din-nyckel
   ```
3. Skapa första admin-kontot manuellt (Supabase Dashboard → Authentication → Add user, sätt sedan `role = 'admin'` i `profiles`-tabellen).
4. Kopiera `.env.example` till `.env`, fyll i Supabase-URL + anon-nyckel + `VITE_ADMIN_SHORTCUT_EMAIL` (samma adress som admin-kontot ovan)
5. `npm install && npm run dev`

## Driftsätta frontend

Valfri statisk host (Vercel/Netlify/Cloudflare Pages). Sätt miljövariablerna vid bygget, `npm run build` → `dist/`. Uppdatera Site URL/Redirect URLs i Supabase Auth till den riktiga URL:en.

## Hur inloggning & kontoskapande fungerar

Kunder loggar in med e-post. Admin skriver "Admin" i fältet, vilket slår upp den riktiga adressen bakom kulisserna. Nya konton skapas bara via admins "Skapa konto"-knapp (mejlinbjudan) — ingen öppen registrering.

## Hur AI-bedömning fungerar

"AI-bedöm mot jobbet" skickar kandidatens profil, jobbets kravprofil och (om bifogat) det textextraherade CV-innehållet (PDF/Word) till Claude, som svarar med poäng + motivering. Kostnadsskydd: samma kandidat kan inte bedömas om igen förrän 60 sekunder gått, kollas server-side.

import type { Stage } from './types'

export const STAGES: {
  id: Stage
  title: string
  dot: string
  header: string
  accent: string
  badge: string
}[] = [
  { id: 'sourcing', title: 'Sökning', dot: 'bg-slate-400', header: 'bg-slate-50 border-slate-100', accent: 'border-l-slate-300', badge: 'bg-slate-100 text-slate-600' },
  { id: 'screening', title: 'Urval', dot: 'bg-blue-400', header: 'bg-blue-50 border-blue-100', accent: 'border-l-blue-300', badge: 'bg-blue-50 text-blue-600' },
  { id: 'interview', title: 'Intervju', dot: 'bg-blue-600', header: 'bg-blue-50 border-blue-100', accent: 'border-l-blue-400', badge: 'bg-blue-100 text-blue-700' },
  { id: 'offer', title: 'Erbjudande', dot: 'bg-indigo-600', header: 'bg-indigo-50 border-indigo-100', accent: 'border-l-indigo-400', badge: 'bg-indigo-100 text-indigo-700' },
  { id: 'hired', title: 'Anställd', dot: 'bg-emerald-500', header: 'bg-emerald-50/80 border-emerald-100', accent: 'border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
  { id: 'rejected', title: 'Avvisad', dot: 'bg-rose-500', header: 'bg-rose-50/80 border-rose-100', accent: 'border-l-rose-500', badge: 'bg-rose-100 text-rose-700' },
]

// Linjär ordning för snabbknappen på kortet — "rejected" är ett medvetet
// beslut (kräver avslagsanledning) och är därför aldrig ett "nästa steg".
export const STAGE_ORDER: Stage[] = ['sourcing', 'screening', 'interview', 'offer', 'hired']

export const AVATAR_COLORS = [
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-teal-100 text-teal-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
]

// Admin loggar in med "Admin" istället för e-post — Supabase Auth kräver
// ändå en riktig e-post server-side, så det här slår bara upp den bakom kulisserna.
export const ADMIN_SHORTCUT_EMAIL = 'yonis_77@hotmail.com'

export const STALE_DAYS = 14
export const WIP_LIMIT = 8

export const MS_PER_DAY = 24 * 60 * 60 * 1000

// Hur länge "Ångra"-knappen lever i borttagnings-toasten. CV-filen städas bort
// efter samma fördröjning, så en återställd kandidat hinner peka på filen
// innan den faktiskt raderas — måste hållas i synk med den fördröjningen.
export const UNDO_WINDOW_MS = 6000

// Prickkonstellation som återanvänds i bakgrunden både före och efter inloggning — samma nätverksmotiv som HireflowMark.
export const BACKGROUND_CONSTELLATION = [
  { top: '15%', left: '8%', size: 'w-1.5 h-1.5', color: 'bg-blue-300/50', delay: '0s', glow: false },
  { top: '24%', left: '15%', size: 'w-1 h-1', color: 'bg-indigo-300/40', delay: '0.4s', glow: false },
  { top: '32%', left: '6%', size: 'w-2 h-2', color: 'bg-blue-200/70', delay: '0.8s', glow: true },
  { top: '68%', left: '11%', size: 'w-1 h-1', color: 'bg-violet-300/40', delay: '1.2s', glow: false },
  { top: '79%', left: '19%', size: 'w-1.5 h-1.5', color: 'bg-blue-300/50', delay: '0.2s', glow: false },
  { top: '12%', left: '88%', size: 'w-1 h-1', color: 'bg-indigo-300/40', delay: '0.6s', glow: false },
  { top: '21%', left: '93%', size: 'w-2 h-2', color: 'bg-violet-200/70', delay: '1s', glow: true },
  { top: '36%', left: '85%', size: 'w-1.5 h-1.5', color: 'bg-blue-300/40', delay: '1.4s', glow: false },
  { top: '64%', left: '90%', size: 'w-1 h-1', color: 'bg-indigo-300/40', delay: '0.3s', glow: false },
  { top: '81%', left: '83%', size: 'w-1.5 h-1.5', color: 'bg-blue-200/60', delay: '0.9s', glow: false },
] as const

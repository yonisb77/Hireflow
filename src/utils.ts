import confetti from 'canvas-confetti'
import { AVATAR_COLORS } from './constants'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export const avatarColor = (name: string) => {
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')

export const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9.\-_]/g, '_')

export const timeAgo = (isoDate: string, now: number): string => {
  const seconds = Math.floor((now - new Date(isoDate).getTime()) / 1000)
  if (seconds < 60) return 'just nu'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min sedan`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} tim sedan`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} ${days === 1 ? 'dag' : 'dagar'} sedan`
  const months = Math.floor(days / 30)
  return `${months} ${months === 1 ? 'månad' : 'månader'} sedan`
}

// Slår in en Realtime postgres_changes-händelse i en lokal lista: uppdaterar
// raden om id:t redan finns (egna optimistiska ändringar ekar tillbaka som
// no-ops), lägger till den överst annars, tar bort den vid DELETE.
export function applyRealtimeChange<T extends { id: string }>(list: T[], payload: RealtimePostgresChangesPayload<T>): T[] {
  if (payload.eventType === 'DELETE') {
    const deletedId = (payload.old as { id?: string }).id
    return deletedId ? list.filter(item => item.id !== deletedId) : list
  }
  const next = payload.new as T
  const exists = list.some(item => item.id === next.id)
  return exists ? list.map(item => item.id === next.id ? next : item) : [next, ...list]
}

// Litet delight-moment när en kandidat markeras "Anställd".
export const celebrateHire = () => {
  confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } })
}

// Supabase Auth returnerar felmeddelanden på engelska — översätter de vanligaste
// så gränssnittet är konsekvent svenskt, med originaltexten som reservfallback.
export const translateAuthError = (message: string): string => {
  if (/invalid login credentials/i.test(message)) return 'Fel användarnamn eller lösenord.'
  if (/email not confirmed/i.test(message)) return 'Kontot är inte bekräftat än.'
  if (/user already registered/i.test(message)) return 'Kontot finns redan.'
  if (/password should be at least/i.test(message)) return 'Lösenordet måste vara minst 6 tecken.'
  if (/new password should be different/i.test(message)) return 'Det nya lösenordet måste skilja sig från det gamla.'
  if (/rate limit/i.test(message)) return 'För många försök. Vänta en stund och försök igen.'
  return message
}

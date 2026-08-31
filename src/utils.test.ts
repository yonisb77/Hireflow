import { describe, it, expect } from 'vitest'
import { initials, sanitizeFilename, timeAgo, translateAuthError, avatarColor } from './utils'
import { AVATAR_COLORS } from './constants'

describe('initials', () => {
  it('tar första bokstaven i för- och efternamn', () => {
    expect(initials('Anna Andersson')).toBe('AA')
  })

  it('returnerar tom sträng för tom input', () => {
    expect(initials('')).toBe('')
  })

  it('ignorerar extra mellanslag mellan namnen', () => {
    expect(initials('Anna   Andersson')).toBe('AA')
  })
})

describe('sanitizeFilename', () => {
  it('ersätter otillåtna tecken med understreck', () => {
    expect(sanitizeFilename('my file (1).pdf')).toBe('my_file__1_.pdf')
  })

  it('lämnar redan säkra filnamn oförändrade', () => {
    expect(sanitizeFilename('cv-2024_final.pdf')).toBe('cv-2024_final.pdf')
  })
})

describe('timeAgo', () => {
  const now = new Date('2026-01-01T12:00:00Z').getTime()

  it('visar "just nu" inom en minut', () => {
    expect(timeAgo(new Date(now - 30_000).toISOString(), now)).toBe('just nu')
  })

  it('visar minuter under en timme', () => {
    expect(timeAgo(new Date(now - 5 * 60_000).toISOString(), now)).toBe('5 min sedan')
  })

  it('singular/plural för dagar', () => {
    expect(timeAgo(new Date(now - 24 * 60 * 60_000).toISOString(), now)).toBe('1 dag sedan')
    expect(timeAgo(new Date(now - 2 * 24 * 60 * 60_000).toISOString(), now)).toBe('2 dagar sedan')
  })
})

describe('translateAuthError', () => {
  it('översätter kända Supabase-felmeddelanden', () => {
    expect(translateAuthError('Invalid login credentials')).toBe('Fel användarnamn eller lösenord.')
  })

  it('faller tillbaka till originaltexten för okända fel', () => {
    expect(translateAuthError('Something unexpected happened')).toBe('Something unexpected happened')
  })
})

describe('avatarColor', () => {
  it('returnerar samma färg för samma namn (deterministiskt)', () => {
    expect(avatarColor('Anna Andersson')).toBe(avatarColor('Anna Andersson'))
  })

  it('returnerar alltid en färg ur den tillåtna paletten', () => {
    expect(AVATAR_COLORS).toContain(avatarColor('Ett Helt Nytt Namn'))
  })
})

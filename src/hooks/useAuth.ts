import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Profile } from '../types'
import type { Session } from '@supabase/supabase-js'
import { ADMIN_SHORTCUT_EMAIL } from '../constants'
import { translateAuthError } from '../utils'

export type Auth = ReturnType<typeof useAuth>

// Läses en enda gång vid modulladdning — innan Supabase-klienten hinner
// bearbeta och städa bort hash:et från URL:en. PASSWORD_RECOVERY-eventet från
// onAuthStateChange är dokumenterat opålitligt av Supabase själva (kan utebli
// helt, särskilt för inbjudningslänkar — se supabase/auth#1948), så det går
// inte lita på det ensamt. Länkens `type=invite`/`type=recovery` i URL:en är
// den pålitliga signalen.
const initialAuthLinkType = (() => {
  if (typeof window === 'undefined') return null
  const raw = window.location.hash ? window.location.hash.slice(1) : window.location.search.slice(1)
  return new URLSearchParams(raw).get('type')
})()

export function useAuth(showToast: (message: string, type?: 'success' | 'error') => void) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotBusy, setForgotBusy] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  const isInviteOrRecoveryLink = initialAuthLinkType === 'invite' || initialAuthLinkType === 'recovery'
  const [showPasswordModal, setShowPasswordModal] = useState(isInviteOrRecoveryLink)
  // Sant när rutan öppnades från en inbjudan/återställningslänk — då finns
  // inget fungerande lösenord ännu, så rutan får inte gå att stänga utan att
  // faktiskt sätta ett (annars kan kunden fastna utan sätt att logga in igen).
  const [passwordSetupRequired, setPasswordSetupRequired] = useState(isInviteOrRecoveryLink)
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const isAdmin = profile?.role === 'admin'

  const loadForSession = async (nextSession: Session | null) => {
    setSession(nextSession)
    if (!nextSession) {
      setProfile(null)
      return
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', nextSession.user.id).single().returns<Profile>()
    setProfile(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => loadForSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      loadForSession(session)
      // Klick på inbjudnings- eller återställningslänken i mailet loggar in
      // med en tillfällig session och skickar detta event — öppnar "Sätt
      // lösenord" direkt, och gör den obligatorisk (se passwordSetupRequired).
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordModal(true)
        setPasswordSetupRequired(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    const typed = email.trim().toLowerCase()
    if (typed === ADMIN_SHORTCUT_EMAIL.toLowerCase()) {
      setAuthError('Ogiltigt användarnamn.')
      return
    }
    setLoading(true)
    const resolvedEmail = typed === 'admin' ? ADMIN_SHORTCUT_EMAIL : typed
    const { error } = await supabase.auth.signInWithPassword({ email: resolvedEmail, password })
    if (error) setAuthError(translateAuthError(error.message))
    setLoading(false)
  }

  const requestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotBusy(true)
    await supabase.auth.resetPasswordForEmail(forgotEmail, { redirectTo: window.location.origin })
    setForgotBusy(false)
    // Avslöjar aldrig om kontot faktiskt finns — samma svar oavsett, som stora tjänster gör.
    setForgotSent(true)
  }

  const handleLogout = () => supabase.auth.signOut()

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    if (newPassword.length < 6) {
      setPasswordError('Lösenordet måste vara minst 6 tecken.')
      return
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordError('Lösenorden matchar inte.')
      return
    }
    setPasswordBusy(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordBusy(false)
    if (error) {
      setPasswordError(translateAuthError(error.message))
      return
    }
    setShowPasswordModal(false)
    setPasswordSetupRequired(false)
    setNewPassword('')
    setNewPasswordConfirm('')
    showToast(passwordSetupRequired ? 'Lösenord satt' : 'Lösenord ändrat')
  }

  return {
    session, profile, isAdmin,
    email, setEmail, password, setPassword, showPassword, setShowPassword, loading, authError, handleLogin, handleLogout,
    showForgotModal, setShowForgotModal, forgotEmail, setForgotEmail, forgotBusy, forgotSent, setForgotSent, requestPasswordReset,
    showPasswordModal, setShowPasswordModal, passwordSetupRequired, newPassword, setNewPassword, newPasswordConfirm, setNewPasswordConfirm, passwordBusy, passwordError, changePassword,
  }
}

import { useEffect, useRef } from 'react'
import { useToasts } from './hooks/useToasts'
import { useAuth } from './hooks/useAuth'
import { useAtsData } from './hooks/useAtsData'
import { BACKGROUND_CONSTELLATION } from './constants'
import HireflowMark from './components/HireflowMark'
import LoginScreen from './components/LoginScreen'
import AppHeader from './components/AppHeader'
import FilterToolbar from './components/FilterToolbar'
import AttentionBar from './components/AttentionBar'
import KanbanBoard from './components/KanbanBoard'
import ToastStack from './components/ToastStack'
import JobModal from './components/modals/JobModal'
import EditJobModal from './components/modals/EditJobModal'
import CandidateModal from './components/modals/CandidateModal'
import CandidateDetailModal from './components/modals/CandidateDetailModal'
import AccountModal from './components/modals/AccountModal'
import PasswordModal from './components/modals/PasswordModal'
import ManageJobsModal from './components/modals/ManageJobsModal'
import ManageCompaniesModal from './components/modals/ManageCompaniesModal'
import StatsModal from './components/modals/StatsModal'

export default function App() {
  const { toasts, showToast, dismissToast } = useToasts()
  const auth = useAuth(showToast)
  const ats = useAtsData(auth.session, auth.profile, auth.isAdmin, showToast)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Öppnar kandidaten automatiskt om sidan laddas med ?candidate=<id> i URL:en
  // (från "Kopiera länk"-knappen). Väntar tyst tills kandidaten finns i den
  // hämtade listan (RLS avgör om anroparen ens får se den), öppnar en gång.
  const openedFromLinkRef = useRef(false)
  useEffect(() => {
    if (openedFromLinkRef.current) return
    const id = new URLSearchParams(window.location.search).get('candidate')
    if (!id) { openedFromLinkRef.current = true; return }
    const candidate = ats.candidates.find(c => c.id === id)
    if (!candidate) return
    ats.openCandidate(candidate)
    openedFromLinkRef.current = true
    window.history.replaceState({}, '', window.location.pathname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ats.candidates])

  // Escape stänger vilken modal som helst är öppen, precis som klick utanför.
  // "/" fokuserar sökfältet direkt, så länge man inte redan skriver i ett fält.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (auth.showForgotModal) { auth.setShowForgotModal(false); return }
        if (ats.selectedCandidate) ats.closeCandidateModal()
        else if (ats.editingJob) ats.closeJobEdit()
        else if (ats.showJobModal) { ats.setShowJobModal(false); ats.setJobError(null) }
        else if (ats.showCandidateModal) { ats.setShowCandidateModal(false); ats.setCandidateError(null) }
        else if (ats.showAccountModal) { ats.setShowAccountModal(false); ats.setAccountMessage(null) }
        else if (auth.showPasswordModal) { auth.setShowPasswordModal(false); auth.setNewPassword(''); auth.setNewPasswordConfirm('') }
        else if (ats.showManageJobsModal) { ats.setShowManageJobsModal(false); ats.setConfirmDeleteJobId(null); ats.setManageError(null); ats.setManageJobFilter('') }
        else if (ats.showManageCompaniesModal) { ats.setShowManageCompaniesModal(false); ats.setConfirmDeleteCompanyId(null); ats.setManageError(null); ats.setManageCompanyFilter('') }
        else if (ats.showStatsModal) ats.setShowStatsModal(false)
        else if (ats.showUserMenu) ats.setShowUserMenu(false)
        else if (ats.showMoreMenu) ats.setShowMoreMenu(false)
        else if (ats.selectionMode) ats.exitSelectionMode()
        return
      }
      if (e.key === '/') {
        const el = e.target as HTMLElement
        const isTyping = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
        if (isTyping || !searchInputRef.current) return
        e.preventDefault()
        searchInputRef.current.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [ats, auth])

  if (!auth.session) return <LoginScreen auth={auth} />

  if (!auth.profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-blue-900 to-slate-900 flex items-center justify-center">
        <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl p-3 shadow-md shadow-blue-600/30 animate-float">
          <HireflowMark className="w-6 h-6" />
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-blue-900 to-slate-900 flex flex-col font-sans relative">
      <div
        className="fixed inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          maskImage: 'radial-gradient(ellipse at center, transparent 15%, black 78%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, transparent 15%, black 78%)',
        }}
      />
      <div className="fixed -top-32 -left-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none animate-drift" />
      <div className="fixed -bottom-32 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none animate-drift-slow" />
      <div className="fixed top-1/3 right-1/4 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl pointer-events-none animate-glow" />

      {/* Samma prickkonstellation som inloggningssidan, så mönstret känns igen efter inloggning */}
      {BACKGROUND_CONSTELLATION.map((n, i) => (
        <div
          key={i}
          className={`hidden md:block fixed rounded-full ${n.size} ${n.color} pointer-events-none animate-glow`}
          style={{
            top: n.top,
            left: n.left,
            animationDelay: n.delay,
            animationDuration: n.glow ? '3s' : '5s',
            boxShadow: n.glow ? '0 0 14px 2px rgba(147,197,253,0.5)' : undefined,
          }}
        />
      ))}

      <AppHeader auth={auth} ats={ats} />
      <FilterToolbar auth={auth} ats={ats} searchInputRef={searchInputRef} />
      <AttentionBar ats={ats} />
      <KanbanBoard auth={auth} ats={ats} />

      <JobModal auth={auth} ats={ats} />
      <EditJobModal ats={ats} />
      <CandidateModal auth={auth} ats={ats} />
      <AccountModal ats={ats} />
      <PasswordModal auth={auth} />
      <CandidateDetailModal auth={auth} ats={ats} />
      <ManageJobsModal auth={auth} ats={ats} />
      <ManageCompaniesModal ats={ats} />
      <StatsModal ats={ats} />

      <ToastStack toasts={toasts} dismissToast={dismissToast} />
    </div>
  )
}

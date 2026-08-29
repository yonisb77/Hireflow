import React, { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from './supabaseClient'
import type { Job, Candidate, Stage, Profile, JobStatus, CandidateNote } from './types'
import type { Json } from './database.types'
import type { Session } from '@supabase/supabase-js'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import { Plus, Search, ExternalLink, Briefcase, User, LogOut, UserPlus, ShieldCheck, Sparkles, Trash2, X, CheckCircle2, AlertCircle, Settings2, Building2, Eye, EyeOff, FilterX, ChevronDown, Copy, Download, Clock, Lock, Paperclip, MessageSquare, Pencil, KeyRound, BarChart3, ShieldAlert, Undo2 } from 'lucide-react'

const STAGES: {
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

const AVATAR_COLORS = [
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-teal-100 text-teal-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
]

const avatarColor = (name: string) => {
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')

// Prickkonstellation som återanvänds i bakgrunden både före och efter inloggning — samma nätverksmotiv som HireflowMark.
const BACKGROUND_CONSTELLATION = [
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

// Hireflow-märket: ett prickmönster där en kandidat är markerad i ett nätverk.
const HireflowMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="currentColor" aria-hidden="true">
    <circle cx="14" cy="34" r="2.5" opacity="0.4" />
    <circle cx="14" cy="24" r="2.5" opacity="0.4" />
    <circle cx="24" cy="34" r="2.5" opacity="0.4" />
    <circle cx="24" cy="24" r="3.1" opacity="0.72" />
    <circle cx="24" cy="14" r="2.5" opacity="0.4" />
    <circle cx="34" cy="24" r="2.5" opacity="0.4" />
    <circle cx="34" cy="14" r="3.6" />
  </svg>
)

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // ATS-data
  const [jobs, setJobs] = useState<Job[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [customers, setCustomers] = useState<Profile[]>([])
  const [selectedJob, setSelectedJob] = useState<string>('all')
  const [selectedCompany, setSelectedCompany] = useState<string>('all')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingData, setLoadingData] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  // Modaler
  const [showJobModal, setShowJobModal] = useState(false)
  const [showCandidateModal, setShowCandidateModal] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [showManageJobsModal, setShowManageJobsModal] = useState(false)
  const [showManageCompaniesModal, setShowManageCompaniesModal] = useState(false)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [confirmDeleteJobId, setConfirmDeleteJobId] = useState<string | null>(null)
  const [confirmDeleteCompanyId, setConfirmDeleteCompanyId] = useState<string | null>(null)
  const [manageBusyId, setManageBusyId] = useState<string | null>(null)
  const [manageError, setManageError] = useState<string | null>(null)
  const [manageJobFilter, setManageJobFilter] = useState('')
  const [manageCompanyFilter, setManageCompanyFilter] = useState('')

  // Fält
  const [newJobTitle, setNewJobTitle] = useState('')
  const [newJobDept, setNewJobDept] = useState('')
  const [newJobDescription, setNewJobDescription] = useState('')
  const [newJobCompanyId, setNewJobCompanyId] = useState('')
  const [newCandName, setNewCandName] = useState('')
  const [newCandEmail, setNewCandEmail] = useState('')
  const [newCandLinkedin, setNewCandLinkedin] = useState('')
  const [newCandJobId, setNewCandJobId] = useState('')
  const [newCandNotes, setNewCandNotes] = useState('')
  const [newCandResumeFile, setNewCandResumeFile] = useState<File | null>(null)
  const [jobError, setJobError] = useState<string | null>(null)
  const [jobBusy, setJobBusy] = useState(false)
  const [candidateError, setCandidateError] = useState<string | null>(null)
  const [candidateBusy, setCandidateBusy] = useState(false)

  // Redigera jobb
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [jobEditDraft, setJobEditDraft] = useState({ title: '', department: '', description: '' })
  const [jobEditBusy, setJobEditBusy] = useState(false)
  const [jobEditError, setJobEditError] = useState<string | null>(null)

  const [newAccEmail, setNewAccEmail] = useState('')
  const [newAccRole, setNewAccRole] = useState<'admin' | 'customer'>('customer')
  const [newAccCompany, setNewAccCompany] = useState('')
  const [accountBusy, setAccountBusy] = useState(false)
  const [accountMessage, setAccountMessage] = useState<string | null>(null)

  // Kandidat-detalj (visa/redigera/ta bort/AI-bedöm)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [editDraft, setEditDraft] = useState({ full_name: '', email: '', linkedin_url: '', notes: '', stage: 'sourcing' as Stage, rejection_reason: '' })
  const [savingCandidate, setSavingCandidate] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [resumeBusy, setResumeBusy] = useState(false)

  // Anteckningstidslinje
  const [candidateNotes, setCandidateNotes] = useState<CandidateNote[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [newNoteText, setNewNoteText] = useState('')
  const [noteBusy, setNoteBusy] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)

  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error'; action?: { label: string; onClick: () => void } }[]>([])
  const toastIdRef = useRef(0)
  const showToast = (message: string, type: 'success' | 'error' = 'success', action?: { label: string; onClick: () => void }, durationMs = 3000) => {
    const id = ++toastIdRef.current
    setToasts(prev => [...prev, { id, message, type, action }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), durationMs)
  }

  // Klockslag för "X sedan"-etiketter, uppdateras varje minut så de håller sig aktuella.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  const isAdmin = profile?.role === 'admin'

  const fetchData = async (currentProfile: Profile) => {
    setDataError(null)
    const [{ data: jobsData, error: jobsError }, { data: candsData, error: candsError }] = await Promise.all([
      supabase.from('jobs').select('*').order('created_at', { ascending: false }).returns<Job[]>(),
      supabase.from('candidates').select('*').order('created_at', { ascending: false }).returns<Candidate[]>(),
    ])
    if (jobsError || candsError) {
      setDataError(jobsError?.message || candsError?.message || 'Kunde inte hämta data')
    }
    if (jobsData) setJobs(jobsData)
    if (candsData) setCandidates(candsData)

    if (currentProfile.role === 'admin') {
      const { data: customersData } = await supabase.from('profiles').select('*').eq('role', 'customer').order('company_name').returns<Profile[]>()
      if (customersData) setCustomers(customersData)
    }
    setLoadingData(false)
  }

  const loadForSession = async (nextSession: Session | null) => {
    setSession(nextSession)
    if (!nextSession) {
      setProfile(null)
      return
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', nextSession.user.id).single().returns<Profile>()
    setProfile(data)
    if (data) fetchData(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => loadForSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => loadForSession(session))
    return () => subscription.unsubscribe()
  }, [])

  // Debounce på kandidatsökningen så filtreringen inte kör på varje tangenttryck.
  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchInput), 150)
    return () => clearTimeout(id)
  }, [searchInput])

  // Escape stänger vilken modal som helst är öppen, precis som klick utanför.
  // "/" fokuserar sökfältet direkt, så länge man inte redan skriver i ett fält.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedCandidate) {
          setSelectedCandidate(null); setAiError(null); setSaveError(null)
          setCandidateNotes([]); setNewNoteText(''); setNoteError(null)
        }
        else if (editingJob) { setEditingJob(null); setJobEditError(null) }
        else if (showJobModal) { setShowJobModal(false); setJobError(null) }
        else if (showCandidateModal) { setShowCandidateModal(false); setCandidateError(null) }
        else if (showAccountModal) { setShowAccountModal(false); setAccountMessage(null) }
        else if (showPasswordModal) { setShowPasswordModal(false); setPasswordError(null); setNewPassword(''); setNewPasswordConfirm('') }
        else if (showManageJobsModal) { setShowManageJobsModal(false); setConfirmDeleteJobId(null); setManageError(null); setManageJobFilter('') }
        else if (showManageCompaniesModal) { setShowManageCompaniesModal(false); setConfirmDeleteCompanyId(null); setManageError(null); setManageCompanyFilter('') }
        else if (showStatsModal) setShowStatsModal(false)
        else if (showUserMenu) setShowUserMenu(false)
        else if (showMoreMenu) setShowMoreMenu(false)
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
  }, [selectedCandidate, editingJob, showJobModal, showCandidateModal, showAccountModal, showPasswordModal, showManageJobsModal, showManageCompaniesModal, showStatsModal, showUserMenu, showMoreMenu, session])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setAuthError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError(error.message)
    setLoading(false)
  }

  const handleLogout = () => supabase.auth.signOut()

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    if (newPassword.length < 6) {
      setPasswordError('Lösenordet måste vara minst 6 tecken')
      return
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordError('Lösenorden matchar inte')
      return
    }
    setPasswordBusy(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordBusy(false)
    if (error) {
      setPasswordError(error.message)
      return
    }
    setShowPasswordModal(false)
    setNewPassword('')
    setNewPasswordConfirm('')
    showToast('Lösenord ändrat')
  }

  const createJob = async (e: React.FormEvent) => {
    e.preventDefault()
    setJobError(null)
    if (!session || !newJobTitle) return
    const company_id = isAdmin ? newJobCompanyId : session.user.id
    if (!company_id) return
    setJobBusy(true)
    const { data, error } = await supabase.from('jobs').insert([
      { company_id, title: newJobTitle, department: newJobDept || null, description: newJobDescription || null }
    ]).select().single().returns<Job>()
    setJobBusy(false)

    if (!error && data) {
      setJobs([data, ...jobs])
      setShowJobModal(false)
      setNewJobTitle('')
      setNewJobDept('')
      setNewJobDescription('')
      setNewJobCompanyId('')
      showToast(`Jobb "${data.title}" skapat`)
    } else if (error) {
      setJobError(error.message)
    }
  }

  const createCandidate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCandidateError(null)
    if (!newCandName || !newCandJobId || !session) return
    setCandidateBusy(true)
    const { data, error } = await supabase.from('candidates').insert([
      {
        job_id: newCandJobId,
        // Skrivs över server-side av en trigger som härleder värdet från jobbet;
        // en giltig platshållare räcker för att uppfylla not-null-kravet på uuid-kolumnen.
        company_id: session.user.id,
        full_name: newCandName,
        email: newCandEmail || null,
        linkedin_url: newCandLinkedin || null,
        notes: newCandNotes || null,
        stage: 'sourcing'
      }
    ]).select().single().returns<Candidate>()
    setCandidateBusy(false)

    if (!error && data) {
      let created = data
      if (newCandResumeFile) {
        const updated = await uploadResumeFile(created, newCandResumeFile)
        if (updated) created = updated
      }
      setCandidates([created, ...candidates])
      setShowCandidateModal(false)
      setNewCandName('')
      setNewCandEmail('')
      setNewCandLinkedin('')
      setNewCandNotes('')
      setNewCandJobId('')
      setNewCandResumeFile(null)
      showToast(`${created.full_name} tillagd`)
    } else if (error) {
      setCandidateError(error.message)
    }
  }

  const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9.\-_]/g, '_')

  const uploadResumeFile = async (candidate: Candidate, file: File): Promise<Candidate | null> => {
    setResumeBusy(true)
    const path = `${candidate.company_id}/${candidate.id}-${sanitizeFilename(file.name)}`
    const { error: uploadError } = await supabase.storage.from('resumes').upload(path, file, { upsert: true })
    if (uploadError) {
      setResumeBusy(false)
      showToast('Kunde inte ladda upp CV', 'error')
      return null
    }
    const { data, error } = await supabase.from('candidates').update({ resume_path: path }).eq('id', candidate.id).select().single().returns<Candidate>()
    setResumeBusy(false)
    if (error || !data) {
      showToast('Kunde inte spara CV-referensen', 'error')
      return null
    }
    return data
  }

  const viewResume = async (candidate: Candidate) => {
    if (!candidate.resume_path) return
    const { data, error } = await supabase.storage.from('resumes').createSignedUrl(candidate.resume_path, 60)
    if (error || !data) {
      showToast('Kunde inte öppna CV', 'error')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setAccountBusy(true)
    setAccountMessage(null)
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { email: newAccEmail, role: newAccRole, company_name: newAccCompany },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    setAccountBusy(false)
    const responseError = (data as { error?: string } | null)?.error
    if (error || responseError) {
      setAccountMessage(responseError || error?.message || 'Kunde inte skapa konto')
      return
    }
    setAccountMessage(`Inbjudan skickad till ${newAccEmail}`)
    showToast(`Inbjudan skickad till ${newAccEmail}`)
    setNewAccEmail('')
    setNewAccCompany('')
    setNewAccRole('customer')
    if (profile) fetchData(profile)
  }

  const openCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate)
    setEditDraft({
      full_name: candidate.full_name,
      email: candidate.email || '',
      linkedin_url: candidate.linkedin_url || '',
      notes: candidate.notes || '',
      stage: candidate.stage,
      rejection_reason: candidate.rejection_reason || '',
    })
    setAiError(null)
    setSaveError(null)
    fetchCandidateNotes(candidate.id)
  }

  const closeCandidateModal = () => {
    setSelectedCandidate(null)
    setAiError(null)
    setSaveError(null)
    setCandidateNotes([])
    setNewNoteText('')
    setNoteError(null)
  }

  const saveCandidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCandidate) return
    setSavingCandidate(true)
    setSaveError(null)
    const { data, error } = await supabase.from('candidates').update({
      full_name: editDraft.full_name,
      email: editDraft.email || null,
      linkedin_url: editDraft.linkedin_url || null,
      notes: editDraft.notes || null,
      stage: editDraft.stage,
      rejection_reason: editDraft.stage === 'rejected' ? (editDraft.rejection_reason || null) : null,
    }).eq('id', selectedCandidate.id).select().single().returns<Candidate>()
    setSavingCandidate(false)
    if (error || !data) {
      setSaveError(error?.message || 'Kunde inte spara')
      return
    }
    setCandidates(prev => prev.map(c => c.id === data.id ? data : c))
    setSelectedCandidate(null)
    showToast('Kandidat uppdaterad')
  }

  const fetchCandidateNotes = async (candidateId: string) => {
    setNotesLoading(true)
    const { data } = await supabase.from('candidate_notes').select('*').eq('candidate_id', candidateId).order('created_at', { ascending: true }).returns<CandidateNote[]>()
    setNotesLoading(false)
    if (data) setCandidateNotes(data)
  }

  const addNote = async () => {
    if (!selectedCandidate || !newNoteText.trim() || !session) return
    setNoteBusy(true)
    setNoteError(null)
    const { data, error } = await supabase.from('candidate_notes').insert([
      {
        candidate_id: selectedCandidate.id,
        author_id: session.user.id,
        body: newNoteText.trim(),
        // Skrivs över server-side av en trigger; platshållare räcker för att
        // uppfylla not-null-kraven.
        company_id: session.user.id,
        author_role: 'customer',
      }
    ]).select().single().returns<CandidateNote>()
    setNoteBusy(false)
    if (error || !data) {
      setNoteError(error?.message || 'Kunde inte spara anteckningen')
      return
    }
    setCandidateNotes(prev => [...prev, data])
    setNewNoteText('')
  }

  const deleteCandidate = async () => {
    if (!selectedCandidate) return
    const candidate = selectedCandidate
    setSavingCandidate(true)
    const { error } = await supabase.from('candidates').delete().eq('id', candidate.id)
    setSavingCandidate(false)
    if (error) {
      setSaveError(error.message)
      return
    }
    setCandidates(prev => prev.filter(c => c.id !== candidate.id))
    setSelectedCandidate(null)

    // Ger en kort ångra-frist innan CV-filen verkligen raderas. Om
    // kandidaten återställs pekar den nya raden på samma fil, så vi kollar
    // efteråt om filen fortfarande behövs innan den städas bort.
    if (candidate.resume_path) {
      const path = candidate.resume_path
      setTimeout(async () => {
        const { data: stillReferenced } = await supabase.from('candidates').select('id').eq('resume_path', path).maybeSingle()
        if (!stillReferenced) await supabase.storage.from('resumes').remove([path])
      }, 6000)
    }

    showToast(`${candidate.full_name} borttagen`, 'success', { label: 'Ångra', onClick: () => restoreCandidate(candidate) }, 6000)
  }

  const restoreCandidate = async (candidate: Candidate) => {
    const { data, error } = await supabase.from('candidates').insert([{
      job_id: candidate.job_id,
      company_id: candidate.company_id,
      full_name: candidate.full_name,
      email: candidate.email,
      linkedin_url: candidate.linkedin_url,
      notes: candidate.notes,
      stage: candidate.stage,
      rejection_reason: candidate.rejection_reason,
      resume_path: candidate.resume_path,
      ai_assessment: candidate.ai_assessment as unknown as Json,
    }]).select().single().returns<Candidate>()
    if (error || !data) {
      showToast('Kunde inte återställa kandidaten', 'error')
      return
    }
    setCandidates(prev => [data, ...prev])
    showToast(`${data.full_name} återställd`)
  }

  const exportCandidateData = () => {
    if (!selectedCandidate) return
    const payload = {
      ...selectedCandidate,
      notes_timeline: candidateNotes.map(n => ({ body: n.body, created_at: n.created_at, author: n.author_role })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sanitizeFilename(selectedCandidate.full_name)}-uppgifter.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Uppgifter exporterade')
  }

  const deleteJob = async (job: Job) => {
    if (confirmDeleteJobId !== job.id) {
      setConfirmDeleteJobId(job.id)
      return
    }
    setManageBusyId(job.id)
    setManageError(null)
    const { error } = await supabase.from('jobs').delete().eq('id', job.id)
    setManageBusyId(null)
    if (error) {
      setManageError(error.message)
      return
    }
    setJobs(prev => prev.filter(j => j.id !== job.id))
    setCandidates(prev => prev.filter(c => c.job_id !== job.id))
    setConfirmDeleteJobId(null)
    if (selectedJob === job.id) setSelectedJob('all')
    showToast(`Jobbet "${job.title}" borttaget`)
  }

  const toggleJobStatus = async (job: Job) => {
    const nextStatus: JobStatus = job.status === 'open' ? 'closed' : 'open'
    setManageBusyId(job.id)
    setManageError(null)
    const { data, error } = await supabase.from('jobs').update({ status: nextStatus }).eq('id', job.id).select().single().returns<Job>()
    setManageBusyId(null)
    if (error || !data) {
      setManageError(error?.message || 'Kunde inte ändra status')
      return
    }
    setJobs(prev => prev.map(j => j.id === job.id ? data : j))
    showToast(nextStatus === 'closed' ? `"${job.title}" stängt` : `"${job.title}" öppnat igen`)
  }

  const openJobEdit = (job: Job) => {
    setEditingJob(job)
    setJobEditDraft({ title: job.title, department: job.department || '', description: job.description || '' })
    setJobEditError(null)
  }

  const closeJobEdit = () => {
    setEditingJob(null)
    setJobEditError(null)
  }

  const saveJobEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingJob) return
    setJobEditBusy(true)
    setJobEditError(null)
    const { data, error } = await supabase.from('jobs').update({
      title: jobEditDraft.title,
      department: jobEditDraft.department || null,
      description: jobEditDraft.description || null,
    }).eq('id', editingJob.id).select().single().returns<Job>()
    setJobEditBusy(false)
    if (error || !data) {
      setJobEditError(error?.message || 'Kunde inte spara')
      return
    }
    setJobs(prev => prev.map(j => j.id === data.id ? data : j))
    setEditingJob(null)
    showToast('Jobb uppdaterat')
  }

  const deleteCompany = async (company: Profile) => {
    if (confirmDeleteCompanyId !== company.id) {
      setConfirmDeleteCompanyId(company.id)
      return
    }
    setManageBusyId(company.id)
    setManageError(null)
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { user_id: company.id },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    setManageBusyId(null)
    const responseError = (data as { error?: string } | null)?.error
    if (error || responseError) {
      setManageError(responseError || error?.message || 'Kunde inte ta bort företaget')
      return
    }
    setCustomers(prev => prev.filter(c => c.id !== company.id))
    setJobs(prev => prev.filter(j => j.company_id !== company.id))
    setCandidates(prev => prev.filter(c => c.company_id !== company.id))
    setConfirmDeleteCompanyId(null)
    if (selectedCompany === company.id) setSelectedCompany('all')
    showToast(`${company.company_name} borttaget`)
  }

  const assessCandidate = async () => {
    if (!selectedCandidate) return
    setAiBusy(true)
    setAiError(null)
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    const { data, error } = await supabase.functions.invoke('assess-candidate', {
      body: { candidate_id: selectedCandidate.id },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    setAiBusy(false)
    const responseError = (data as { error?: string } | null)?.error
    if (error || responseError || !(data as { candidate?: Candidate })?.candidate) {
      setAiError(responseError || error?.message || 'AI-bedömning misslyckades')
      return
    }
    const updated = (data as { candidate: Candidate }).candidate
    setCandidates(prev => prev.map(c => c.id === updated.id ? updated : c))
    setSelectedCandidate(updated)
    showToast('AI-bedömning klar')
  }

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId) return

    const previousStage = source.droppableId as Stage
    const newStage = destination.droppableId as Stage
    setCandidates(prev => prev.map(c => c.id === draggableId ? { ...c, stage: newStage } : c))

    const { error } = await supabase.from('candidates').update({ stage: newStage }).eq('id', draggableId)
    if (error) {
      setCandidates(prev => prev.map(c => c.id === draggableId ? { ...c, stage: previousStage } : c))
      showToast('Kunde inte flytta kandidaten, försök igen', 'error')
    }
  }

  const companyName = (companyId: string) => {
    if (companyId === profile?.id) return profile.company_name
    return customers.find(c => c.id === companyId)?.company_name || 'Okänt företag'
  }

  const timeAgo = (isoDate: string) => {
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

  const STALE_DAYS = 14
  const daysInStage = (candidate: Candidate) => Math.floor((now - new Date(candidate.stage_changed_at).getTime()) / 86400000)
  const isStale = (candidate: Candidate) => !['hired', 'rejected'].includes(candidate.stage) && daysInStage(candidate) >= STALE_DAYS

  const visibleJobs = useMemo(() => {
    if (!isAdmin || selectedCompany === 'all') return jobs
    return jobs.filter(j => j.company_id === selectedCompany)
  }, [jobs, isAdmin, selectedCompany])

  const filteredCandidates = candidates.filter(c => {
    const matchesCompany = !isAdmin || selectedCompany === 'all' || c.company_id === selectedCompany
    const matchesJob = selectedJob === 'all' || c.job_id === selectedJob
    const q = searchQuery.toLowerCase()
    const matchesSearch = c.full_name.toLowerCase().includes(q) ||
                          (c.email && c.email.toLowerCase().includes(q)) ||
                          (c.notes && c.notes.toLowerCase().includes(q))
    return matchesCompany && matchesJob && matchesSearch
  })

  const hasActiveFilter = searchQuery.trim() !== '' || selectedJob !== 'all' || (isAdmin && selectedCompany !== 'all')

  const clearFilters = () => {
    setSearchInput('')
    setSelectedJob('all')
    if (isAdmin) setSelectedCompany('all')
  }

  const openJobs = (isAdmin ? jobs : visibleJobs).filter(j => j.status === 'open')
  const manageableJobs = isAdmin ? jobs : visibleJobs
  const filteredManageJobs = manageableJobs.filter(job => job.title.toLowerCase().includes(manageJobFilter.toLowerCase()))
  const filteredManageCompanies = customers.filter(c => c.company_name.toLowerCase().includes(manageCompanyFilter.toLowerCase()))

  const stats = (() => {
    const scoped = filteredCandidates
    const byStage = Object.fromEntries(STAGES.map(s => [s.id, scoped.filter(c => c.stage === s.id).length])) as Record<Stage, number>
    const hired = scoped.filter(c => c.stage === 'hired')
    const rejected = scoped.filter(c => c.stage === 'rejected')
    const decided = hired.length + rejected.length
    const successRate = decided > 0 ? Math.round((hired.length / decided) * 100) : null
    const hireDurations = hired.map(c => (new Date(c.stage_changed_at).getTime() - new Date(c.created_at).getTime()) / 86400000)
    const avgTimeToHireDays = hireDurations.length > 0 ? Math.round(hireDurations.reduce((a, b) => a + b, 0) / hireDurations.length) : null
    const staleCount = scoped.filter(isStale).length
    const byJob = manageableJobs
      .map(job => ({ job, count: scoped.filter(c => c.job_id === job.id).length }))
      .filter(j => j.count > 0)
      .sort((a, b) => b.count - a.count)
    return { total: scoped.length, byStage, hiredCount: hired.length, rejectedCount: rejected.length, successRate, avgTimeToHireDays, staleCount, byJob }
  })()

  const exportCsv = () => {
    const stageTitle = (stageId: Stage) => STAGES.find(s => s.id === stageId)?.title ?? stageId
    const headers = ['Namn', 'E-post', 'LinkedIn', 'Jobb', ...(isAdmin ? ['Företag'] : []), 'Steg', 'AI-poäng', 'Tillagd']
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
    const rows = filteredCandidates.map(c => {
      const job = jobs.find(j => j.id === c.job_id)
      return [
        c.full_name,
        c.email || '',
        c.linkedin_url || '',
        job?.title || '',
        ...(isAdmin ? [companyName(c.company_id)] : []),
        stageTitle(c.stage),
        c.ai_assessment ? String(c.ai_assessment.score) : '',
        new Date(c.created_at).toLocaleDateString('sv-SE'),
      ].map(escape).join(',')
    })
    const csv = '﻿' + [headers.map(escape).join(','), ...rows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kandidater-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`${filteredCandidates.length} kandidater exporterade`)
  }

  if (!session) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br from-indigo-950 via-blue-900 to-slate-900">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
            maskImage: 'radial-gradient(ellipse at center, transparent 15%, black 78%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, transparent 15%, black 78%)',
          }}
        />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-drift" />
        <div className="absolute -bottom-32 -right-16 w-[28rem] h-[28rem] bg-indigo-500/30 rounded-full blur-3xl animate-drift-slow" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl animate-glow" />

        {/* Prickkonstellation — ekar HireflowMark, ersätter tidigare bokstavliga kanban-kort */}
        {BACKGROUND_CONSTELLATION.map((n, i) => (
          <div
            key={i}
            className={`hidden md:block absolute rounded-full ${n.size} ${n.color} animate-glow`}
            style={{
              top: n.top,
              left: n.left,
              animationDelay: n.delay,
              animationDuration: n.glow ? '3s' : '5s',
              boxShadow: n.glow ? '0 0 14px 2px rgba(147,197,253,0.5)' : undefined,
            }}
          />
        ))}

        <div className="relative bg-gradient-to-br from-blue-100 to-indigo-200 p-8 rounded-2xl shadow-2xl shadow-black/40 border border-white/50 w-full max-w-sm animate-fade-in-up overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          <div className="flex justify-center mb-5">
            <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl p-3 shadow-md shadow-blue-600/30 animate-float">
              <HireflowMark className="w-6 h-6" />
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-6 text-center">Logga in på Hireflow</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Användarnamn</label>
              <input
                type="text"
                autoComplete="off"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Lösenord</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 pr-9 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {authError && <p className="text-xs text-red-600">{authError}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white font-medium py-2 rounded-lg text-sm transition shadow-sm shadow-blue-600/20"
            >
              {loading ? 'Loggar in...' : 'Logga in'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (session && !profile) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">Laddar...</div>
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

      <header className="relative z-30 bg-slate-900/60 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-y-2">
        <div className="flex items-center gap-2.5 font-bold text-white text-lg">
          <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5 shadow-sm shadow-blue-600/30">
            <HireflowMark className="w-4 h-4" />
          </span>
          <span>Hireflow</span>
          {isAdmin && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-blue-600 px-2 py-0.5 rounded-full ml-2">
              <ShieldCheck className="w-3 h-3" /> Admin
            </span>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(v => !v)}
            className="flex items-center gap-2 text-xs text-slate-200 font-medium hover:bg-white/10 pl-1 pr-2.5 py-1.5 rounded-lg transition"
          >
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
              {initials(profile?.company_name || session.user.email || '?') || '?'}
            </span>
            <span className="max-w-[8rem] sm:max-w-none truncate">{profile?.company_name || session.user.email}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-gradient-to-br from-blue-100 to-indigo-200 border border-blue-100 rounded-xl shadow-lg z-50 py-1.5 animate-fade-in-up">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-700 truncate">{profile?.company_name}</p>
                  {!isAdmin && <p className="text-[11px] text-slate-400 truncate">{session.user.email}</p>}
                </div>
                {isAdmin && (
                  <button
                    onClick={() => { setShowManageCompaniesModal(true); setManageError(null); setShowUserMenu(false) }}
                    className="w-full text-left text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2 px-3 py-2 transition"
                  >
                    <Building2 className="w-3.5 h-3.5" /> Hantera företag
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => { setShowAccountModal(true); setShowUserMenu(false) }}
                    className="w-full text-left text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2 px-3 py-2 transition"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Skapa konto
                  </button>
                )}
                <button
                  onClick={() => { setShowPasswordModal(true); setShowUserMenu(false) }}
                  className="w-full text-left text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2 px-3 py-2 transition"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Byt lösenord
                </button>
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2 px-3 py-2 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logga ut
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="relative z-20 bg-slate-900/50 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-3 flex flex-wrap gap-3 items-center">
        <div className="relative w-full sm:w-auto sm:min-w-[220px] max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-700" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Sök kandidater..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-blue-100 border border-blue-300 text-blue-800 placeholder:text-blue-400 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              aria-label="Rensa sökning"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {isAdmin && (
            <div className="relative">
              <select
                value={selectedCompany}
                onChange={e => { setSelectedCompany(e.target.value); setSelectedJob('all') }}
                className="appearance-none rounded-lg pl-3 pr-8 py-1.5 text-sm font-semibold text-blue-800 bg-blue-100 border border-blue-300 hover:bg-blue-200 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="all">Alla företag</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500" />
            </div>
          )}

          <div className="relative">
            <select
              value={selectedJob}
              onChange={e => setSelectedJob(e.target.value)}
              className="appearance-none rounded-lg pl-3 pr-8 py-1.5 text-sm font-semibold text-blue-800 bg-blue-100 border border-blue-300 hover:bg-blue-200 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="all">Alla jobb</option>
              {visibleJobs.map(job => (
                <option key={job.id} value={job.id}>{job.title}{job.status === 'closed' ? ' (stängt)' : ''}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500" />
          </div>

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {(candidates.length > 0 || jobs.length > 0 || openJobs.length > 0 || filteredCandidates.length > 0) && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoreMenu(v => !v)}
                className="bg-blue-100 border border-blue-300 hover:bg-blue-200 hover:border-blue-400 text-blue-800 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
              >
                <Settings2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Fler</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} />
              </button>
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-gradient-to-br from-blue-100 to-indigo-200 border border-blue-100 rounded-xl shadow-lg z-50 py-1.5 animate-fade-in-up">
                    {candidates.length > 0 && (
                      <button
                        onClick={() => { setShowStatsModal(true); setShowMoreMenu(false) }}
                        className="w-full text-left text-xs font-medium text-slate-700 hover:bg-white/50 flex items-center gap-2 px-3 py-2 transition"
                      >
                        <BarChart3 className="w-3.5 h-3.5" /> Statistik
                      </button>
                    )}
                    {jobs.length > 0 && (
                      <button
                        onClick={() => { setShowManageJobsModal(true); setManageError(null); setShowMoreMenu(false) }}
                        className="w-full text-left text-xs font-medium text-slate-700 hover:bg-white/50 flex items-center gap-2 px-3 py-2 transition"
                      >
                        <Settings2 className="w-3.5 h-3.5" /> Hantera jobb
                      </button>
                    )}
                    {filteredCandidates.length > 0 && (
                      <button
                        onClick={() => { exportCsv(); setShowMoreMenu(false) }}
                        className="w-full text-left text-xs font-medium text-slate-700 hover:bg-white/50 flex items-center gap-2 px-3 py-2 transition"
                      >
                        <Download className="w-3.5 h-3.5" /> Exportera CSV
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          <button
            onClick={() => { setNewJobCompanyId(isAdmin ? (selectedCompany !== 'all' ? selectedCompany : '') : ''); setShowJobModal(true) }}
            className="bg-blue-100 border border-blue-300 hover:bg-blue-200 hover:border-blue-400 text-blue-800 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Skapa jobb</span>
          </button>
          <button
            onClick={() => setShowCandidateModal(true)}
            disabled={openJobs.length === 0}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.97] disabled:opacity-50 disabled:grayscale text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm shadow-blue-600/20"
          >
            <User className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Lägg till kandidat</span>
          </button>
        </div>
      </div>

      {dataError && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2 text-xs text-red-700">
          Kunde inte hämta data: {dataError}
        </div>
      )}

      {loadingData ? (
        <div className="flex-1 p-3 sm:p-6 overflow-x-auto slim-scroll snap-x snap-mandatory" aria-label="Laddar data" role="status">
          <div className="flex gap-3 sm:gap-4 h-full lg:min-w-[1200px]">
            {STAGES.map(stage => (
              <div key={stage.id} className="w-[85vw] max-w-xs shrink-0 snap-start lg:w-auto lg:flex-1 lg:max-w-none bg-blue-100/60 border border-blue-100 rounded-xl flex flex-col overflow-hidden animate-pulse">
                <div className="px-3.5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="h-2.5 w-16 rounded bg-slate-200" />
                  <div className="h-4 w-5 rounded-full bg-slate-200" />
                </div>
                <div className="p-2 space-y-2">
                  {[0, 1].map(i => (
                    <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-200 shrink-0" />
                        <div className="h-2.5 flex-1 rounded bg-slate-200" />
                      </div>
                      <div className="h-2 w-2/3 rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xs">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 mb-3 animate-float">
              <HireflowMark className="w-6 h-6" />
            </span>
            <p className="text-sm font-semibold text-white">Inga jobb publicerade</p>
            <p className="text-xs text-slate-300 mt-1 mb-4">Skapa ett jobb för att börja ta emot kandidater.</p>
            <button
              onClick={() => { setNewJobCompanyId(isAdmin ? (selectedCompany !== 'all' ? selectedCompany : '') : ''); setShowJobModal(true) }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.97] text-white text-xs font-semibold px-4 py-2 rounded-lg inline-flex items-center gap-1.5 transition shadow-sm shadow-blue-600/20"
            >
              <Plus className="w-3.5 h-3.5" /> Skapa jobb
            </button>
          </div>
        </div>
      ) : hasActiveFilter && filteredCandidates.length === 0 && candidates.length > 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xs">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 mb-3">
              <FilterX className="w-6 h-6 text-slate-400" />
            </span>
            <p className="text-sm font-semibold text-white">Inga kandidater matchar filtret</p>
            <p className="text-xs text-slate-300 mt-1 mb-4">Prova ett annat jobb, företag eller sökord.</p>
            <button
              onClick={clearFilters}
              className="bg-blue-100 border border-blue-300 hover:bg-blue-200 text-blue-800 text-xs font-semibold px-4 py-2 rounded-lg inline-flex items-center gap-1.5 transition"
            >
              <FilterX className="w-3.5 h-3.5" /> Rensa filter
            </button>
          </div>
        </div>
      ) : (
      <div className="flex-1 p-3 sm:p-6 overflow-x-auto slim-scroll snap-x snap-mandatory">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 sm:gap-4 h-full lg:min-w-[1200px]">
            {STAGES.map((stage, stageIndex) => {
              const stageCandidates = filteredCandidates.filter(c => c.stage === stage.id)
              return (
                <div
                  key={stage.id}
                  style={{ animationDelay: `${stageIndex * 60}ms`, animationFillMode: 'backwards' }}
                  className="w-[85vw] max-w-xs shrink-0 snap-start lg:w-auto lg:flex-1 lg:max-w-none bg-blue-100/60 border border-blue-100 rounded-xl flex flex-col max-h-[80vh] shadow-sm overflow-hidden animate-fade-in-up"
                >
                  <div className={`px-3.5 py-3 border-b flex justify-between items-center ${stage.header}`}>
                    <span className="flex items-center gap-2 font-semibold text-xs text-slate-700 uppercase tracking-wider">
                      <span className="relative flex w-2 h-2">
                        {stageCandidates.length > 0 && (
                          <span className={`absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping ${stage.dot}`} />
                        )}
                        <span className={`relative inline-flex w-2 h-2 rounded-full ${stage.dot}`} />
                      </span>
                      {stage.title}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${stage.badge}`}>{stageCandidates.length}</span>
                  </div>

                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-2 flex-1 overflow-y-auto slim-scroll space-y-2 transition-colors duration-150 ${snapshot.isDraggingOver ? 'bg-blue-50/70' : ''}`}
                      >
                        {stageCandidates.length === 0 && !snapshot.isDraggingOver && (
                          <div className="h-full min-h-[80px] flex items-center justify-center text-center px-2">
                            <p className="text-[11px] text-slate-300">Inga kandidater i detta steg</p>
                          </div>
                        )}
                        {stageCandidates.map((candidate, index) => {
                          const job = jobs.find(j => j.id === candidate.job_id)
                          return (
                            <Draggable key={candidate.id} draggableId={candidate.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => openCandidate(candidate)}
                                  className={`bg-blue-100/60 p-3 rounded-lg border border-blue-100 border-l-4 ${stage.accent} transition-all duration-150 cursor-pointer ${
                                    snapshot.isDragging
                                      ? 'shadow-2xl shadow-blue-900/20 ring-2 ring-blue-300 rotate-2 scale-[1.03]'
                                      : 'shadow-sm hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5'
                                  }`}
                                >
                                  <div className="flex items-start gap-2.5">
                                    <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${avatarColor(candidate.full_name)}`}>
                                      {initials(candidate.full_name) || '?'}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="font-semibold text-sm text-slate-800 truncate flex items-center gap-1">
                                          {candidate.full_name}
                                          {candidate.resume_path && <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />}
                                        </div>
                                        {candidate.ai_assessment && (
                                          <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 px-1.5 py-0.5 rounded-full shadow-sm shadow-purple-500/40">
                                            <Sparkles className="w-2.5 h-2.5" /> {candidate.ai_assessment.score}/10
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-500 mb-2 truncate">
                                        {job?.title || 'Okänt jobb'}
                                        {isAdmin && <span className="text-slate-400"> · {companyName(candidate.company_id)}</span>}
                                      </div>

                                      {candidate.notes && (
                                        <p className="text-xs text-slate-600 bg-slate-50 p-1.5 rounded mb-2 border border-slate-100 line-clamp-2">{candidate.notes}</p>
                                      )}

                                      <div className="flex items-center justify-between gap-2">
                                        {candidate.linkedin_url ? (
                                          <a
                                            href={candidate.linkedin_url.startsWith('http') ? candidate.linkedin_url : `https://${candidate.linkedin_url}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                                          >
                                            <ExternalLink className="w-3 h-3" /> LinkedIn
                                          </a>
                                        ) : <span />}
                                        <span
                                          title={isStale(candidate) ? `${daysInStage(candidate)} dagar i ${stage.title.toLowerCase()} utan förändring` : undefined}
                                          className={`inline-flex items-center gap-1 text-[10px] shrink-0 ${isStale(candidate) ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}
                                        >
                                          <Clock className="w-2.5 h-2.5" /> {daysInStage(candidate)}d i steget
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          )
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      </div>
      )}

      {showJobModal && (
        <div
          role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
          onClick={e => { if (e.target === e.currentTarget) { setShowJobModal(false); setJobError(null) } }}
        >
          <div className="bg-gradient-to-br from-blue-100 to-indigo-200/80 rounded-xl p-5 max-w-sm w-full animate-fade-in-up border border-blue-100/50">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5"><Briefcase className="w-4 h-4" /></span>
              Skapa nytt jobb
            </h2>
            <form onSubmit={createJob} className="space-y-3">
              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Företag</label>
                  <select required value={newJobCompanyId} onChange={e => setNewJobCompanyId(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white">
                    <option value="">Välj företag...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Jobbtitel</label>
                <input autoFocus required value={newJobTitle} onChange={e => setNewJobTitle(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" placeholder="t.ex. Frontend-utvecklare" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Avdelning (valfritt)</label>
                <input value={newJobDept} onChange={e => setNewJobDept(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" placeholder="t.ex. Teknik" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Jobbeskrivning (valfritt)</label>
                <textarea value={newJobDescription} onChange={e => setNewJobDescription(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" rows={3} placeholder="Krav, ansvarsområden, önskad erfarenhet... används av AI-bedömningen." />
              </div>
              {jobError && <p className="text-xs text-red-600">{jobError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowJobModal(false); setJobError(null) }} className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-slate-600">Avbryt</button>
                <button type="submit" disabled={jobBusy} className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.97] text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow-sm shadow-blue-600/20">
                  {jobBusy ? 'Skapar...' : 'Skapa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingJob && (
        <div
          role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
          onClick={e => { if (e.target === e.currentTarget) closeJobEdit() }}
        >
          <div className="bg-gradient-to-br from-blue-100 to-indigo-200/80 rounded-xl p-5 max-w-sm w-full animate-fade-in-up border border-blue-100/50">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5"><Pencil className="w-4 h-4" /></span>
              Redigera jobb
            </h2>
            <form onSubmit={saveJobEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Jobbtitel</label>
                <input autoFocus required value={jobEditDraft.title} onChange={e => setJobEditDraft({ ...jobEditDraft, title: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Avdelning (valfritt)</label>
                <input value={jobEditDraft.department} onChange={e => setJobEditDraft({ ...jobEditDraft, department: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Jobbeskrivning (valfritt)</label>
                <textarea value={jobEditDraft.description} onChange={e => setJobEditDraft({ ...jobEditDraft, description: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" rows={4} placeholder="Krav, ansvarsområden, önskad erfarenhet... används av AI-bedömningen." />
              </div>
              {jobEditError && <p className="text-xs text-red-600">{jobEditError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeJobEdit} className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-slate-600">Avbryt</button>
                <button type="submit" disabled={jobEditBusy} className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.97] text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow-sm shadow-blue-600/20">
                  {jobEditBusy ? 'Sparar...' : 'Spara'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCandidateModal && (
        <div
          role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
          onClick={e => { if (e.target === e.currentTarget) { setShowCandidateModal(false); setCandidateError(null) } }}
        >
          <div className="bg-gradient-to-br from-blue-100 to-indigo-200/80 rounded-xl p-5 max-w-sm w-full animate-fade-in-up border border-blue-100/50">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5"><User className="w-4 h-4" /></span>
              Lägg till kandidat
            </h2>
            <form onSubmit={createCandidate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Söker jobb</label>
                <select autoFocus required value={newCandJobId} onChange={e => setNewCandJobId(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white">
                  <option value="">Välj jobb...</option>
                  {openJobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title}{isAdmin ? ` · ${companyName(j.company_id)}` : ''}</option>
                  ))}
                </select>
                {openJobs.length === 0 && manageableJobs.length > 0 && (
                  <p className="text-[11px] text-slate-400 mt-1">Alla jobb är stängda — öppna ett i "Hantera jobb" för att lägga till kandidater.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fullständigt namn</label>
                <input required value={newCandName} onChange={e => setNewCandName(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" placeholder="Anna Andersson" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">E-post</label>
                <input type="email" value={newCandEmail} onChange={e => setNewCandEmail(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" placeholder="anna@example.com" />
                {newCandJobId && newCandEmail && candidates.some(c => c.job_id === newCandJobId && c.email?.toLowerCase() === newCandEmail.toLowerCase()) && (
                  <p className="text-[11px] text-amber-600 mt-1">Redan en kandidat med den här e-posten på detta jobb.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">LinkedIn URL</label>
                <input value={newCandLinkedin} onChange={e => setNewCandLinkedin(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" placeholder="linkedin.com/in/..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Noteringar</label>
                <textarea value={newCandNotes} onChange={e => setNewCandNotes(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" rows={2} placeholder="Noteringar..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">CV (valfritt, max 5 MB)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={e => setNewCandResumeFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-50"
                />
              </div>
              {candidateError && <p className="text-xs text-red-600">{candidateError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowCandidateModal(false); setCandidateError(null); setNewCandResumeFile(null) }} className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-slate-600">Avbryt</button>
                <button type="submit" disabled={candidateBusy || resumeBusy} className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.97] text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow-sm shadow-blue-600/20">
                  {candidateBusy ? 'Sparar...' : resumeBusy ? 'Laddar upp CV...' : 'Spara'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAccountModal && (
        <div
          role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
          onClick={e => { if (e.target === e.currentTarget) { setShowAccountModal(false); setAccountMessage(null) } }}
        >
          <div className="bg-gradient-to-br from-blue-100 to-indigo-200/80 rounded-xl p-5 max-w-sm w-full animate-fade-in-up border border-blue-100/50">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5"><UserPlus className="w-4 h-4" /></span>
              Skapa konto
            </h2>
            <form onSubmit={createAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">E-post</label>
                <input autoFocus required type="email" value={newAccEmail} onChange={e => setNewAccEmail(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" placeholder="person@foretag.se" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Kontotyp</label>
                <select value={newAccRole} onChange={e => setNewAccRole(e.target.value as 'admin' | 'customer')} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white">
                  <option value="customer">Kund</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {newAccRole === 'customer' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Företagsnamn</label>
                  <input required value={newAccCompany} onChange={e => setNewAccCompany(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" placeholder="Företaget AB" />
                </div>
              )}
              {accountMessage && <p className="text-xs text-slate-600">{accountMessage}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowAccountModal(false); setAccountMessage(null) }} className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-slate-600">Stäng</button>
                <button type="submit" disabled={accountBusy} className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.97] text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow-sm shadow-blue-600/20">
                  {accountBusy ? 'Skickar...' : 'Skicka inbjudan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div
          role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
          onClick={e => { if (e.target === e.currentTarget) { setShowPasswordModal(false); setPasswordError(null); setNewPassword(''); setNewPasswordConfirm('') } }}
        >
          <div className="bg-gradient-to-br from-blue-100 to-indigo-200/80 rounded-xl p-5 max-w-sm w-full animate-fade-in-up border border-blue-100/50">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5"><KeyRound className="w-4 h-4" /></span>
              Byt lösenord
            </h2>
            <form onSubmit={changePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nytt lösenord</label>
                <input autoFocus required type="password" minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Bekräfta lösenord</label>
                <input required type="password" minLength={6} value={newPasswordConfirm} onChange={e => setNewPasswordConfirm(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" />
              </div>
              {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowPasswordModal(false); setPasswordError(null); setNewPassword(''); setNewPasswordConfirm('') }} className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-slate-600">Avbryt</button>
                <button type="submit" disabled={passwordBusy} className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.97] text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow-sm shadow-blue-600/20">
                  {passwordBusy ? 'Sparar...' : 'Byt lösenord'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedCandidate && (
        <div
          role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
          onClick={e => { if (e.target === e.currentTarget) closeCandidateModal() }}
        >
          <div className="bg-gradient-to-br from-blue-100 to-indigo-200/80 rounded-xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto slim-scroll animate-fade-in-up border border-blue-100/50">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5"><User className="w-4 h-4" /></span>
                  Kandidat
                </h2>
                <p className="text-[11px] text-slate-400 mt-1 ml-9">Tillagd {timeAgo(selectedCandidate.created_at)}</p>
              </div>
              <button onClick={closeCandidateModal} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={saveCandidate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fullständigt namn</label>
                <input required value={editDraft.full_name} onChange={e => setEditDraft({ ...editDraft, full_name: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">E-post</label>
                <div className="relative">
                  <input type="email" value={editDraft.email} onChange={e => setEditDraft({ ...editDraft, email: e.target.value })} className="w-full px-3 py-1.5 pr-9 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" />
                  {editDraft.email && (
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(editDraft.email); showToast('E-post kopierad') }}
                      aria-label="Kopiera e-post"
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">LinkedIn URL</label>
                <input value={editDraft.linkedin_url} onChange={e => setEditDraft({ ...editDraft, linkedin_url: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Steg</label>
                <select value={editDraft.stage} onChange={e => setEditDraft({ ...editDraft, stage: e.target.value as Stage })} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white">
                  {STAGES.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
              {editDraft.stage === 'rejected' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Anledning till avslag (valfritt)</label>
                  <input value={editDraft.rejection_reason} onChange={e => setEditDraft({ ...editDraft, rejection_reason: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" placeholder="t.ex. saknad kompetens, löneförväntan..." />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Noteringar</label>
                <textarea value={editDraft.notes} onChange={e => setEditDraft({ ...editDraft, notes: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" rows={2} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1"><Paperclip className="w-3 h-3" /> CV</label>
                <div className="flex items-center gap-2">
                  {selectedCandidate.resume_path && (
                    <button type="button" onClick={() => viewResume(selectedCandidate)} className="text-xs font-semibold text-blue-600 hover:underline">
                      Visa CV
                    </button>
                  )}
                  <label className="text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-300 px-2.5 py-1.5 rounded-lg cursor-pointer transition">
                    {resumeBusy ? 'Laddar upp...' : selectedCandidate.resume_path ? 'Byt fil' : 'Ladda upp CV'}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      disabled={resumeBusy}
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (!file || !selectedCandidate) return
                        const updated = await uploadResumeFile(selectedCandidate, file)
                        if (updated) {
                          setSelectedCandidate(updated)
                          setCandidates(prev => prev.map(c => c.id === updated.id ? updated : c))
                          showToast('CV uppladdat')
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" /> AI-bedömning
                  </span>
                  <button type="button" onClick={assessCandidate} disabled={aiBusy} className="text-[11px] font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 active:scale-[0.97] px-2.5 py-1.5 rounded-lg disabled:opacity-50 transition shadow-sm shadow-purple-500/30">
                    {aiBusy ? 'Analyserar...' : selectedCandidate.ai_assessment ? 'Bedöm igen' : 'AI-bedöm mot jobbet'}
                  </button>
                </div>
                {aiError && <p className="text-xs text-red-600 mb-2">{aiError}</p>}
                {selectedCandidate.ai_assessment && (
                  <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-purple-100 rounded-lg p-2.5 text-xs space-y-1.5 animate-fade-in-up">
                    <div className="font-bold text-purple-800">Poäng: {selectedCandidate.ai_assessment.score}/10</div>
                    <p className="text-slate-700">{selectedCandidate.ai_assessment.summary}</p>
                    {selectedCandidate.ai_assessment.strengths?.length > 0 && (
                      <div>
                        <span className="font-semibold text-slate-600">Styrkor: </span>
                        <span className="text-slate-600">{selectedCandidate.ai_assessment.strengths.join(', ')}</span>
                      </div>
                    )}
                    {selectedCandidate.ai_assessment.weaknesses?.length > 0 && (
                      <div>
                        <span className="font-semibold text-slate-600">Svagheter: </span>
                        <span className="text-slate-600">{selectedCandidate.ai_assessment.weaknesses.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-3">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-2">
                  <MessageSquare className="w-3.5 h-3.5" /> Anteckningar
                </span>
                {notesLoading ? (
                  <p className="text-xs text-slate-400">Laddar...</p>
                ) : candidateNotes.length === 0 ? (
                  <p className="text-xs text-slate-400 mb-2">Inga anteckningar tillagda.</p>
                ) : (
                  <div className="space-y-2 mb-2 max-h-40 overflow-y-auto slim-scroll pr-1">
                    {candidateNotes.map(note => (
                      <div key={note.id} className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-slate-600">
                            {note.author_id === profile?.id ? 'Du' : note.author_role === 'admin' ? 'Admin' : 'Kund'}
                          </span>
                          <span className="text-slate-400">{timeAgo(note.created_at)}</span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap">{note.body}</p>
                      </div>
                    ))}
                  </div>
                )}
                {noteError && <p className="text-xs text-red-600 mb-2">{noteError}</p>}
                <div className="flex gap-2">
                  <input
                    value={newNoteText}
                    onChange={e => setNewNoteText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNote() } }}
                    placeholder="Lägg till en anteckning..."
                    className="flex-1 px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400"
                  />
                  <button type="button" onClick={addNote} disabled={noteBusy || !newNoteText.trim()} className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition">
                    {noteBusy ? '...' : 'Lägg till'}
                  </button>
                </div>
              </div>

              {saveError && <p className="text-xs text-red-600">{saveError}</p>}

              <div className="flex justify-between items-center gap-2 pt-2">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={deleteCandidate}
                    disabled={savingCandidate}
                    className="text-xs font-semibold flex items-center gap-1 px-2 py-1.5 rounded-lg disabled:opacity-50 text-red-600 hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Ta bort
                  </button>
                  <button
                    type="button"
                    onClick={exportCandidateData}
                    title="Exportera all data vi har om kandidaten (GDPR)"
                    className="text-xs font-semibold text-slate-500 hover:bg-slate-100 flex items-center gap-1 px-2 py-1.5 rounded-lg transition"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Exportera data</span>
                  </button>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={closeCandidateModal} className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-slate-600">Avbryt</button>
                  <button type="submit" disabled={savingCandidate} className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.97] text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow-sm shadow-blue-600/20">
                    {savingCandidate ? 'Sparar...' : 'Spara'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showManageJobsModal && (
        <div
          role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
          onClick={e => { if (e.target === e.currentTarget) { setShowManageJobsModal(false); setConfirmDeleteJobId(null); setManageError(null); setManageJobFilter('') } }}
        >
          <div className="bg-gradient-to-br from-blue-100 to-indigo-200/80 rounded-xl p-5 max-w-md w-full max-h-[80vh] overflow-y-auto slim-scroll animate-fade-in-up border border-blue-100/50">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5"><Settings2 className="w-4 h-4" /></span>
                Hantera jobb
              </h2>
              <button onClick={() => { setShowManageJobsModal(false); setConfirmDeleteJobId(null); setManageError(null); setManageJobFilter('') }} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            {manageError && <p className="text-xs text-red-600 mb-3">{manageError}</p>}
            {manageableJobs.length > 5 && (
              <input
                type="text"
                value={manageJobFilter}
                onChange={e => setManageJobFilter(e.target.value)}
                placeholder="Filtrera jobb..."
                className="w-full mb-3 px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            <div className="space-y-2">
              {filteredManageJobs.map(job => {
                const candidateCount = candidates.filter(c => c.job_id === job.id).length
                const isConfirming = confirmDeleteJobId === job.id
                return (
                  <div key={job.id} className="flex items-center justify-between gap-2 border border-slate-200 bg-slate-50 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-800 truncate">{job.title}</span>
                        {job.status === 'closed' && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-full">
                            <Lock className="w-2.5 h-2.5" /> Stängt
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {job.department && `${job.department} · `}
                        {candidateCount} {candidateCount === 1 ? 'kandidat' : 'kandidater'}
                        {isAdmin && ` · ${companyName(job.company_id)}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openJobEdit(job)}
                        className="text-xs font-semibold text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition"
                        aria-label="Redigera jobb"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleJobStatus(job)}
                        disabled={manageBusyId === job.id}
                        className="text-xs font-semibold text-slate-600 hover:bg-slate-200 px-2 py-1.5 rounded-lg transition disabled:opacity-50"
                      >
                        {job.status === 'open' ? 'Stäng' : 'Öppna'}
                      </button>
                      <button
                        onClick={() => deleteJob(job)}
                        disabled={manageBusyId === job.id}
                        className={`text-xs font-semibold flex items-center gap-1 px-2 py-1.5 rounded-lg transition disabled:opacity-50 ${isConfirming ? 'text-white bg-red-600 hover:bg-red-700' : 'text-red-600 hover:bg-red-50'}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> {isConfirming ? 'Bekräfta' : 'Ta bort'}
                      </button>
                    </div>
                  </div>
                )
              })}
              {manageableJobs.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Inga jobb registrerade.</p>
              )}
              {manageableJobs.length > 0 && filteredManageJobs.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Inga jobb matchar "{manageJobFilter}".</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showManageCompaniesModal && (
        <div
          role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
          onClick={e => { if (e.target === e.currentTarget) { setShowManageCompaniesModal(false); setConfirmDeleteCompanyId(null); setManageError(null); setManageCompanyFilter('') } }}
        >
          <div className="bg-gradient-to-br from-blue-100 to-indigo-200/80 rounded-xl p-5 max-w-md w-full max-h-[80vh] overflow-y-auto slim-scroll animate-fade-in-up border border-blue-100/50">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5"><Building2 className="w-4 h-4" /></span>
                Hantera företag
              </h2>
              <button onClick={() => { setShowManageCompaniesModal(false); setConfirmDeleteCompanyId(null); setManageError(null); setManageCompanyFilter('') }} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            {manageError && <p className="text-xs text-red-600 mb-3">{manageError}</p>}
            {customers.length > 5 && (
              <input
                type="text"
                value={manageCompanyFilter}
                onChange={e => setManageCompanyFilter(e.target.value)}
                placeholder="Filtrera företag..."
                className="w-full mb-3 px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            <div className="space-y-2">
              {filteredManageCompanies.map(company => {
                const jobCount = jobs.filter(j => j.company_id === company.id).length
                const isConfirming = confirmDeleteCompanyId === company.id
                return (
                  <div key={company.id} className="flex items-center justify-between gap-2 border border-slate-200 bg-slate-50 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{company.company_name}</div>
                      <div className="text-xs text-slate-400 truncate">{company.email} · {jobCount} {jobCount === 1 ? 'jobb' : 'jobb'}</div>
                    </div>
                    <button
                      onClick={() => deleteCompany(company)}
                      disabled={manageBusyId === company.id}
                      className={`shrink-0 text-xs font-semibold flex items-center gap-1 px-2 py-1.5 rounded-lg transition disabled:opacity-50 ${isConfirming ? 'text-white bg-red-600 hover:bg-red-700' : 'text-red-600 hover:bg-red-50'}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {isConfirming ? 'Bekräfta' : 'Ta bort'}
                    </button>
                  </div>
                )
              })}
              {customers.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">Inga kundkonton registrerade.</p>
              )}
              {customers.length > 0 && filteredManageCompanies.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">Inga företag matchar "{manageCompanyFilter}".</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showStatsModal && (
        <div
          role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
          onClick={e => { if (e.target === e.currentTarget) setShowStatsModal(false) }}
        >
          <div className="bg-gradient-to-br from-blue-100 to-indigo-200/80 rounded-xl p-5 max-w-lg w-full max-h-[85vh] overflow-y-auto slim-scroll animate-fade-in-up border border-blue-100/50">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5"><BarChart3 className="w-4 h-4" /></span>
                Statistik
              </h2>
              <button onClick={() => setShowStatsModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-4">Speglar de filter som är aktiva just nu ({stats.total} kandidater).</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                <div className="text-2xl font-bold text-slate-800">{stats.successRate !== null ? `${stats.successRate}%` : '—'}</div>
                <div className="text-[11px] text-slate-500">Framgångsgrad (anställd av avgjorda)</div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                <div className="text-2xl font-bold text-slate-800">{stats.avgTimeToHireDays !== null ? `${stats.avgTimeToHireDays}d` : '—'}</div>
                <div className="text-[11px] text-slate-500">Snitt-tid till anställning</div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                <div className="text-2xl font-bold text-slate-800">{stats.hiredCount}</div>
                <div className="text-[11px] text-slate-500">Anställda</div>
              </div>
              <div className={`border rounded-lg p-3 ${stats.staleCount > 0 ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                <div className={`text-2xl font-bold ${stats.staleCount > 0 ? 'text-amber-700' : 'text-slate-800'}`}>{stats.staleCount}</div>
                <div className="text-[11px] text-slate-500">Fastnat ≥14 dagar utan förändring</div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-600 mb-2">Kandidater per steg</p>
              <div className="space-y-1.5">
                {STAGES.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 w-20 shrink-0 truncate">{s.title}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${s.dot}`}
                        style={{ width: stats.total > 0 ? `${(stats.byStage[s.id] / stats.total) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 w-5 text-right shrink-0">{stats.byStage[s.id]}</span>
                  </div>
                ))}
              </div>
            </div>

            {stats.byJob.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Kandidater per jobb</p>
                <div className="space-y-1">
                  {stats.byJob.map(({ job, count }) => (
                    <div key={job.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                      <span className="text-slate-600 truncate">{job.title}</span>
                      <span className="font-semibold text-slate-700 shrink-0 ml-2">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2">
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg shadow-lg text-xs font-semibold text-white animate-toast-in ${t.type === 'error' ? 'bg-red-600' : 'bg-gradient-to-r from-slate-800 to-slate-900'}`}
          >
            {t.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {t.message}
            {t.action && (
              <button
                onClick={() => { t.action!.onClick(); setToasts(prev => prev.filter(x => x.id !== t.id)) }}
                className="ml-1.5 inline-flex items-center gap-1 text-blue-300 hover:text-white font-bold underline underline-offset-2"
              >
                <Undo2 className="w-3 h-3" /> {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

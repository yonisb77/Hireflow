import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { invokeEdgeFunction } from '../edgeFunctions'
import type { Job, Candidate, Stage, CandidateNote } from '../types'
import type { Json } from '../database.types'
import type { Session } from '@supabase/supabase-js'
import type { DropResult } from '@hello-pangea/dnd'
import { STAGES, STAGE_ORDER, STALE_DAYS, MS_PER_DAY, UNDO_WINDOW_MS } from '../constants'
import { sanitizeFilename, timeAgo as timeAgoUtil } from '../utils'

interface Params {
  session: Session | null
  isAdmin: boolean
  showToast: (message: string, type?: 'success' | 'error', action?: { label: string; onClick: () => void }, durationMs?: number) => void
  candidates: Candidate[]
  setCandidates: React.Dispatch<React.SetStateAction<Candidate[]>>
  jobs: Job[]
  manageableJobs: Job[]
  companyName: (companyId: string) => string
  selectedJob: string
  selectedCompany: string
  searchQuery: string
}

// Allt som rör kandidater: skapa/redigera/ta bort/återställ, anteckningar,
// AI-bedömning (enskild + massrankning), massflytt, kanban-flytt, samt de
// filtrerade listor och statistik som resten av appen läser.
export function useCandidates({
  session, isAdmin, showToast, candidates, setCandidates, jobs, manageableJobs, companyName,
  selectedJob, selectedCompany, searchQuery,
}: Params) {
  const [showCandidateModal, setShowCandidateModal] = useState(false)
  const [showStatsModal, setShowStatsModal] = useState(false)

  const [newCandName, setNewCandName] = useState('')
  const [newCandEmail, setNewCandEmail] = useState('')
  const [newCandLinkedin, setNewCandLinkedin] = useState('')
  const [newCandJobId, setNewCandJobId] = useState('')
  const [newCandNotes, setNewCandNotes] = useState('')
  const [newCandResumeFile, setNewCandResumeFile] = useState<File | null>(null)
  const [candidateError, setCandidateError] = useState<string | null>(null)
  const [candidateBusy, setCandidateBusy] = useState(false)
  const [resumeBusy, setResumeBusy] = useState(false)

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [editDraft, setEditDraft] = useState({ full_name: '', email: '', linkedin_url: '', notes: '', stage: 'sourcing' as Stage, rejection_reason: '' })
  const [savingCandidate, setSavingCandidate] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Massrankning: AI-bedömer alla obeslutade kandidater på ett jobb i tur och ordning.
  const [rankingBusy, setRankingBusy] = useState(false)
  const [rankingProgress, setRankingProgress] = useState<{ done: number; total: number } | null>(null)

  const [candidateNotes, setCandidateNotes] = useState<CandidateNote[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [newNoteText, setNewNoteText] = useState('')
  const [noteBusy, setNoteBusy] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)

  // Massflytt: markera flera kandidatkort och flytta dem till ett nytt steg samtidigt.
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set())

  // Klockslag för "X sedan"-etiketter, uppdateras varje minut så de håller sig aktuella.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])
  const timeAgo = (isoDate: string) => timeAgoUtil(isoDate, now)

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
      }, UNDO_WINDOW_MS)
    }

    showToast(`${candidate.full_name} borttagen`, 'success', { label: 'Ångra', onClick: () => restoreCandidate(candidate) }, UNDO_WINDOW_MS)
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

  const assessCandidate = async () => {
    if (!selectedCandidate) return
    setAiBusy(true)
    setAiError(null)
    const { data, error } = await invokeEdgeFunction('assess-candidate', { candidate_id: selectedCandidate.id })
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

  // Kör AI-bedömningen på alla obeslutade kandidater för ett jobb i tur och
  // ordning (hired/rejected är redan avgjorda och behöver ingen rankning),
  // så kanban-kolumnerna kan sorteras efter matchningspoäng.
  const rankCandidatesForJob = async (jobId: string) => {
    const targets = candidates.filter(c => c.job_id === jobId && !['hired', 'rejected'].includes(c.stage))
    if (targets.length === 0) return
    setRankingBusy(true)
    setRankingProgress({ done: 0, total: targets.length })
    let succeeded = 0
    for (const candidate of targets) {
      const { data, error } = await invokeEdgeFunction<{ candidate?: Candidate }>('assess-candidate', { candidate_id: candidate.id })
      const updated = data?.candidate
      if (!error && updated) {
        succeeded++
        setCandidates(prev => prev.map(c => c.id === updated.id ? updated : c))
      }
      setRankingProgress(prev => prev ? { done: prev.done + 1, total: prev.total } : null)
    }
    setRankingBusy(false)
    setRankingProgress(null)
    showToast(`${succeeded} av ${targets.length} kandidater rankade`)
  }

  // Sätter angivna kandidater till ett nytt steg optimistiskt i UI:t och
  // återställer local state om databasuppdateringen misslyckas. Delad av
  // drag-and-drop, framåtpilen på kortet och massflytt.
  const persistStageChange = async (ids: string[], newStage: Stage): Promise<boolean> => {
    const previousStages = new Map(candidates.filter(c => ids.includes(c.id)).map(c => [c.id, c.stage]))
    setCandidates(prev => prev.map(c => ids.includes(c.id) ? { ...c, stage: newStage } : c))
    const { error } = await supabase.from('candidates').update({ stage: newStage }).in('id', ids)
    if (error) {
      setCandidates(prev => prev.map(c => previousStages.has(c.id) ? { ...c, stage: previousStages.get(c.id)! } : c))
    }
    return !error
  }

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId) return

    const newStage = destination.droppableId as Stage
    const ok = await persistStageChange([draggableId], newStage)
    if (!ok) showToast('Kunde inte flytta kandidaten, försök igen', 'error')
  }

  const nextStage = (stage: Stage): Stage | null => {
    const i = STAGE_ORDER.indexOf(stage)
    return i === -1 || i === STAGE_ORDER.length - 1 ? null : STAGE_ORDER[i + 1]
  }

  const advanceStage = async (candidate: Candidate) => {
    const newStage = nextStage(candidate.stage)
    if (!newStage) return
    const ok = await persistStageChange([candidate.id], newStage)
    if (!ok) showToast('Kunde inte flytta kandidaten, försök igen', 'error')
  }

  const toggleCandidateSelection = (candidateId: string) => {
    setSelectedCandidateIds(prev => {
      const next = new Set(prev)
      if (next.has(candidateId)) next.delete(candidateId)
      else next.add(candidateId)
      return next
    })
  }

  const exitSelectionMode = () => {
    setSelectionMode(false)
    setSelectedCandidateIds(new Set())
  }

  const bulkMoveSelected = async (newStage: Stage) => {
    const ids = Array.from(selectedCandidateIds)
    if (ids.length === 0) return
    const ok = await persistStageChange(ids, newStage)
    if (!ok) {
      showToast('Kunde inte flytta kandidaterna, försök igen', 'error')
      return
    }
    showToast(`${ids.length} kandidater flyttade till ${STAGES.find(s => s.id === newStage)?.title}`)
    exitSelectionMode()
  }

  const daysInStage = (candidate: Candidate) => Math.floor((now - new Date(candidate.stage_changed_at).getTime()) / MS_PER_DAY)
  const isStale = (candidate: Candidate) => !['hired', 'rejected'].includes(candidate.stage) && daysInStage(candidate) >= STALE_DAYS

  const filteredCandidates = candidates.filter(c => {
    const matchesCompany = !isAdmin || selectedCompany === 'all' || c.company_id === selectedCompany
    const matchesJob = selectedJob === 'all' || c.job_id === selectedJob
    const q = searchQuery.toLowerCase()
    const matchesSearch = c.full_name.toLowerCase().includes(q) ||
                          (c.email && c.email.toLowerCase().includes(q)) ||
                          (c.notes && c.notes.toLowerCase().includes(q))
    return matchesCompany && matchesJob && matchesSearch
  })

  // Kandidaten med högst AI-poäng för det valda jobbet — får en krona istället för standardbadgen.
  const topMatchId = useMemo(() => {
    if (selectedJob === 'all') return null
    const scored = candidates.filter(c => c.job_id === selectedJob && c.ai_assessment && !['hired', 'rejected'].includes(c.stage))
    if (scored.length === 0) return null
    return scored.reduce((best, c) => (c.ai_assessment!.score > best.ai_assessment!.score ? c : best), scored[0]).id
  }, [candidates, selectedJob])

  const stats = (() => {
    const scoped = filteredCandidates
    const byStage = Object.fromEntries(STAGES.map(s => [s.id, scoped.filter(c => c.stage === s.id).length])) as Record<Stage, number>
    const hired = scoped.filter(c => c.stage === 'hired')
    const rejected = scoped.filter(c => c.stage === 'rejected')
    const decided = hired.length + rejected.length
    const successRate = decided > 0 ? Math.round((hired.length / decided) * 100) : null
    const hireDurations = hired.map(c => (new Date(c.stage_changed_at).getTime() - new Date(c.created_at).getTime()) / MS_PER_DAY)
    const avgTimeToHireDays = hireDurations.length > 0 ? Math.round(hireDurations.reduce((a, b) => a + b, 0) / hireDurations.length) : null
    const staleCount = scoped.filter(isStale).length
    const byJob = manageableJobs
      .map(job => ({ job, count: scoped.filter(c => c.job_id === job.id).length }))
      .filter(j => j.count > 0)
      .sort((a, b) => b.count - a.count)
    return { total: scoped.length, byStage, hiredCount: hired.length, successRate, avgTimeToHireDays, staleCount, byJob }
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

  return {
    showCandidateModal, setShowCandidateModal, showStatsModal, setShowStatsModal,
    newCandName, setNewCandName, newCandEmail, setNewCandEmail, newCandLinkedin, setNewCandLinkedin, newCandJobId, setNewCandJobId,
    newCandNotes, setNewCandNotes, newCandResumeFile, setNewCandResumeFile, candidateError, setCandidateError, candidateBusy, resumeBusy,
    selectedCandidate, setSelectedCandidate, editDraft, setEditDraft, savingCandidate, saveError, aiBusy, aiError,
    rankingBusy, rankingProgress,
    candidateNotes, notesLoading, newNoteText, setNewNoteText, noteBusy, noteError,
    selectionMode, setSelectionMode, selectedCandidateIds, toggleCandidateSelection, exitSelectionMode, bulkMoveSelected,
    now, timeAgo, daysInStage, isStale, nextStage,
    createCandidate, uploadResumeFile, viewResume,
    openCandidate, closeCandidateModal, saveCandidate, addNote, deleteCandidate, restoreCandidate, exportCandidateData,
    assessCandidate, rankCandidatesForJob, onDragEnd, advanceStage,
    filteredCandidates, topMatchId, stats, exportCsv,
  }
}

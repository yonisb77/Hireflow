import { useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Job, Candidate, JobStatus } from '../types'
import type { Session } from '@supabase/supabase-js'

interface Params {
  session: Session | null
  isAdmin: boolean
  showToast: (message: string, type?: 'success' | 'error') => void
  jobs: Job[]
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>
  setCandidates: React.Dispatch<React.SetStateAction<Candidate[]>>
  selectedJob: string
  setSelectedJob: (id: string) => void
  selectedCompany: string
  setSelectedCompany: (id: string) => void
  setManageBusyId: (id: string | null) => void
  setManageError: (message: string | null) => void
}

// Allt som rör jobb: skapa/redigera/ta bort/stäng/duplicera, plus de listor
// och filter som "Hantera jobb" och toolbaren behöver.
export function useJobs({
  session, isAdmin, showToast, jobs, setJobs, setCandidates,
  selectedJob, setSelectedJob, selectedCompany, setSelectedCompany,
  setManageBusyId, setManageError,
}: Params) {
  const [showJobModal, setShowJobModal] = useState(false)
  const [showManageJobsModal, setShowManageJobsModal] = useState(false)
  const [confirmDeleteJobId, setConfirmDeleteJobId] = useState<string | null>(null)
  const [manageJobFilter, setManageJobFilter] = useState('')

  const [newJobTitle, setNewJobTitle] = useState('')
  const [newJobDept, setNewJobDept] = useState('')
  const [newJobDescription, setNewJobDescription] = useState('')
  const [newJobCompanyId, setNewJobCompanyId] = useState('')
  const [jobError, setJobError] = useState<string | null>(null)
  const [jobBusy, setJobBusy] = useState(false)

  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const [jobEditDraft, setJobEditDraft] = useState({ title: '', department: '', description: '' })
  const [jobEditBusy, setJobEditBusy] = useState(false)
  const [jobEditError, setJobEditError] = useState<string | null>(null)

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
      // Filtrerar direkt till det nya jobbet — nästa naturliga steg (lägga
      // till en kandidat) har då redan rätt jobb förifyllt, utan extra klick.
      if (isAdmin) setSelectedCompany(data.company_id)
      setSelectedJob(data.id)
      showToast(`Jobb "${data.title}" skapat`)
    } else if (error) {
      setJobError(error.message)
    }
  }

  // Förifyller "Skapa jobb"-formuläret med ett befintligt jobbs uppgifter,
  // så en likartad roll inte behöver skrivas in från noll.
  const duplicateJob = (job: Job) => {
    setNewJobTitle(`${job.title} (kopia)`)
    setNewJobDept(job.department || '')
    setNewJobDescription(job.description || '')
    setNewJobCompanyId(job.company_id)
    setShowJobModal(true)
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

  const visibleJobs = !isAdmin || selectedCompany === 'all' ? jobs : jobs.filter(j => j.company_id === selectedCompany)
  const openJobs = (isAdmin ? jobs : visibleJobs).filter(j => j.status === 'open')
  const manageableJobs = isAdmin ? jobs : visibleJobs
  const filteredManageJobs = manageableJobs.filter(job => job.title.toLowerCase().includes(manageJobFilter.toLowerCase()))

  return {
    showJobModal, setShowJobModal, showManageJobsModal, setShowManageJobsModal,
    confirmDeleteJobId, setConfirmDeleteJobId, manageJobFilter, setManageJobFilter,
    newJobTitle, setNewJobTitle, newJobDept, setNewJobDept, newJobDescription, setNewJobDescription, newJobCompanyId, setNewJobCompanyId,
    jobError, setJobError, jobBusy,
    editingJob, jobEditDraft, setJobEditDraft, jobEditBusy, jobEditError,
    createJob, duplicateJob, deleteJob, toggleJobStatus, openJobEdit, closeJobEdit, saveJobEdit,
    visibleJobs, openJobs, manageableJobs, filteredManageJobs,
  }
}

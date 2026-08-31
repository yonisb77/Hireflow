import { useMemo, useState } from 'react'
import type { Profile } from '../types'
import type { Session } from '@supabase/supabase-js'
import { useAtsQuery } from './useAtsQuery'
import { useFilters } from './useFilters'
import { useJobs } from './useJobs'
import { useCandidates } from './useCandidates'
import { useCompanies } from './useCompanies'

export type AtsData = ReturnType<typeof useAtsData>

// Komposit-hook: binder ihop datahämtning, filter och de tre domän-hooksarna
// (jobb/kandidater/företag) till ett enda objekt, så komponenterna kan läsa
// allt via en enda `ats`-prop utan att bry sig om var det faktiskt bor.
export function useAtsData(
  session: Session | null,
  profile: Profile | null,
  isAdmin: boolean,
  showToast: (message: string, type?: 'success' | 'error', action?: { label: string; onClick: () => void }, durationMs?: number) => void,
) {
  const query = useAtsQuery(profile)
  const filters = useFilters(isAdmin)

  // Delas mellan jobb- och företagshantering ("Hantera jobb"/"Hantera företag"
  // är aldrig öppna samtidigt, så en gemensam busy/error-status räcker).
  const [manageBusyId, setManageBusyId] = useState<string | null>(null)
  const [manageError, setManageError] = useState<string | null>(null)

  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  const jobsHook = useJobs({
    session, isAdmin, showToast,
    jobs: query.jobs, setJobs: query.setJobs, setCandidates: query.setCandidates,
    selectedJob: filters.selectedJob, setSelectedJob: filters.setSelectedJob,
    selectedCompany: filters.selectedCompany, setSelectedCompany: filters.setSelectedCompany,
    setManageBusyId, setManageError,
  })

  const companiesHook = useCompanies({
    profile, showToast, customers: query.customers,
    setJobs: query.setJobs, setCandidates: query.setCandidates,
    selectedCompany: filters.selectedCompany, setSelectedCompany: filters.setSelectedCompany,
    setManageBusyId, setManageError,
    refetch: () => { if (profile) query.fetchData(profile) },
  })

  const candidatesHook = useCandidates({
    session, isAdmin, showToast,
    candidates: query.candidates, setCandidates: query.setCandidates,
    jobs: query.jobs, manageableJobs: jobsHook.manageableJobs, companyName: companiesHook.companyName,
    selectedJob: filters.selectedJob, selectedCompany: filters.selectedCompany, searchQuery: filters.searchQuery,
  })

  // Underlag för "Behöver uppmärksamhet"-raden — räknar över alla jobb/kandidater
  // användaren har tillgång till, oberoende av aktivt filter, så inget missas
  // bara för att man råkar stå på ett annat jobb i vyn.
  const staleCandidateCount = useMemo(() => {
    const manageableJobIds = new Set(jobsHook.manageableJobs.map(j => j.id))
    return query.candidates.filter(c => manageableJobIds.has(c.job_id) && candidatesHook.isStale(c)).length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.candidates, jobsHook.manageableJobs])

  const closableJobCount = useMemo(() => {
    return jobsHook.manageableJobs.filter(job => {
      if (job.status !== 'open') return false
      const jobCandidates = query.candidates.filter(c => c.job_id === job.id)
      return jobCandidates.length > 0 && jobCandidates.every(c => ['hired', 'rejected'].includes(c.stage))
    }).length
  }, [jobsHook.manageableJobs, query.candidates])

  return {
    showToast,
    jobs: query.jobs, candidates: query.candidates, customers: query.customers, accountStatus: query.accountStatus,
    loadingData: query.loadingData, dataError: query.dataError,
    showUserMenu, setShowUserMenu, showMoreMenu, setShowMoreMenu,
    manageBusyId, manageError, setManageError,
    staleCandidateCount, closableJobCount,
    ...filters,
    ...jobsHook,
    ...candidatesHook,
    ...companiesHook,
  }
}

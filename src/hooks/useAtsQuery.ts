import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Job, Candidate, Profile } from '../types'

// Datahämtningslagret: äger de råa listorna (jobb, kandidater, kunder,
// kontostatus) och hämtar dem tillsammans så snart en profil finns.
// Domän-hooksarna (jobb/kandidater/företag) tar emot dessa som parametrar
// istället för att var och en hämta sin egen del.
export function useAtsQuery(profile: Profile | null) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [customers, setCustomers] = useState<Profile[]>([])
  // company_id -> har kontot bekräftat sin e-post/satt lösenord (dvs. inte längre "väntar på inbjudan")
  const [accountStatus, setAccountStatus] = useState<Record<string, boolean>>({})
  const [loadingData, setLoadingData] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  const fetchData = async (currentProfile: Profile) => {
    const [{ data: jobsData, error: jobsError }, { data: candsData, error: candsError }] = await Promise.all([
      supabase.from('jobs').select('*').order('created_at', { ascending: false }).returns<Job[]>(),
      supabase.from('candidates').select('*').order('created_at', { ascending: false }).returns<Candidate[]>(),
    ])
    setDataError(jobsError || candsError ? (jobsError?.message || candsError?.message || 'Kunde inte hämta data') : null)
    if (jobsData) setJobs(jobsData)
    if (candsData) setCandidates(candsData)

    if (currentProfile.role === 'admin') {
      const { data: customersData } = await supabase.from('profiles').select('*').eq('role', 'customer').order('company_name').returns<Profile[]>()
      if (customersData) setCustomers(customersData)

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      const { data: statusData } = await supabase.functions.invoke('list-account-status', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const status = (statusData as { status?: Record<string, boolean> } | null)?.status
      if (status) setAccountStatus(status)
    }
    setLoadingData(false)
  }

  useEffect(() => {
    // fetchData är async och sätter inget state förrän efter sitt första await,
    // så det uppstår ingen synkron kaskad-rendering — lintern kan bara inte se
    // det, den flaggar varje effekt som anropar en funktion som ens sätter state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (profile) fetchData(profile)
  }, [profile])

  return {
    jobs, setJobs, candidates, setCandidates, customers, setCustomers, accountStatus, setAccountStatus,
    loadingData, dataError, fetchData,
  }
}

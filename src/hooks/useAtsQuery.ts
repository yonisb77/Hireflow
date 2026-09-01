import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { invokeEdgeFunction } from '../edgeFunctions'
import { applyRealtimeChange } from '../utils'
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

      const { data: statusData } = await invokeEdgeFunction<{ status?: Record<string, boolean> }>('list-account-status')
      const status = statusData?.status
      if (status) setAccountStatus(status)
    }
    setLoadingData(false)
  }

  useEffect(() => {
    // Vid utloggning måste föregående användares data rensas ur state. Annars
    // ligger den kvar i minnet och hinner visas för nästa användare som loggar
    // in i samma flik, innan den nya hämtningen är klar — en kund kan då se en
    // annan kunds kandidater blinka förbi.
    if (!profile) {
      /* eslint-disable react-hooks/set-state-in-effect --
         Synkroniserar mot en extern källa (Supabase Auth-sessionen), inte mot
         annan React-state — det är precis vad effekter är till för. Rensningen
         måste ske synkront så inget hinner renderas för fel användare. */
      setJobs([])
      setCandidates([])
      setCustomers([])
      setAccountStatus({})
      setDataError(null)
      setLoadingData(true)
      /* eslint-enable react-hooks/set-state-in-effect */
      return
    }
    fetchData(profile)
  }, [profile])

  // Live-synk mellan flikar/användare: `jobs`/`candidates` är redan
  // publicerade för Realtime (migration 0003) — prenumererar bara på dem här.
  // RLS gäller även Realtime, så en kund får bara ändringar på sina egna rader.
  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel('ats-changes')
      .on<Job>('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, payload => {
        setJobs(prev => applyRealtimeChange(prev, payload))
      })
      .on<Candidate>('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, payload => {
        setCandidates(prev => applyRealtimeChange(prev, payload))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile])

  return {
    jobs, setJobs, candidates, setCandidates, customers, setCustomers, accountStatus, setAccountStatus,
    loadingData, dataError, fetchData,
  }
}

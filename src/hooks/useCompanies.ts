import { useState } from 'react'
import { supabase } from '../supabaseClient'
import type { Job, Candidate, Profile } from '../types'

interface Params {
  profile: Profile | null
  showToast: (message: string, type?: 'success' | 'error') => void
  customers: Profile[]
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>
  setCandidates: React.Dispatch<React.SetStateAction<Candidate[]>>
  selectedCompany: string
  setSelectedCompany: (id: string) => void
  setManageBusyId: (id: string | null) => void
  setManageError: (message: string | null) => void
  refetch: () => void
}

// Allt som rör företag/kundkonton: bjuda in, skicka inbjudan igen, ta bort,
// samt de listor "Hantera företag" behöver.
export function useCompanies({
  profile, showToast, customers, setJobs, setCandidates,
  selectedCompany, setSelectedCompany, setManageBusyId, setManageError, refetch,
}: Params) {
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showManageCompaniesModal, setShowManageCompaniesModal] = useState(false)
  const [confirmDeleteCompanyId, setConfirmDeleteCompanyId] = useState<string | null>(null)
  const [manageCompanyFilter, setManageCompanyFilter] = useState('')

  const [newAccEmail, setNewAccEmail] = useState('')
  const [newAccRole, setNewAccRole] = useState<'admin' | 'customer'>('customer')
  const [newAccCompany, setNewAccCompany] = useState('')
  const [accountBusy, setAccountBusy] = useState(false)
  const [accountMessage, setAccountMessage] = useState<string | null>(null)

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
    refetch()
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
    setJobs(prev => prev.filter(j => j.company_id !== company.id))
    setCandidates(prev => prev.filter(c => c.company_id !== company.id))
    setConfirmDeleteCompanyId(null)
    if (selectedCompany === company.id) setSelectedCompany('all')
    showToast(`${company.company_name} borttaget`)
  }

  // Bjuder in samma e-post igen — samma edge-funktion som skapar kontot
  // första gången. Om personen redan har satt ett lösenord svarar Supabase
  // med ett fel ("redan registrerad"), vilket visas som vanligt.
  const resendInvite = async (company: Profile) => {
    setManageBusyId(company.id)
    setManageError(null)
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { email: company.email, role: 'customer', company_name: company.company_name },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    setManageBusyId(null)
    const responseError = (data as { error?: string } | null)?.error
    if (error || responseError) {
      setManageError(responseError || error?.message || 'Kunde inte skicka inbjudan igen')
      return
    }
    showToast(`Inbjudan skickad igen till ${company.email}`)
  }

  const companyName = (companyId: string) => {
    if (companyId === profile?.id) return profile.company_name
    return customers.find(c => c.id === companyId)?.company_name || 'Okänt företag'
  }

  const filteredManageCompanies = customers.filter(c => c.company_name.toLowerCase().includes(manageCompanyFilter.toLowerCase()))

  return {
    showAccountModal, setShowAccountModal, showManageCompaniesModal, setShowManageCompaniesModal,
    confirmDeleteCompanyId, setConfirmDeleteCompanyId, manageCompanyFilter, setManageCompanyFilter,
    newAccEmail, setNewAccEmail, newAccRole, setNewAccRole, newAccCompany, setNewAccCompany, accountBusy, accountMessage, setAccountMessage,
    createAccount, deleteCompany, resendInvite, companyName, filteredManageCompanies,
  }
}

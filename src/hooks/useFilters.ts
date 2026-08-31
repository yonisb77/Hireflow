import { useEffect, useState } from 'react'

// Filter-/sökläget: jobb, företag och sökterm. Kandidat- och jobb-hooksarna
// läser detta för att avgöra vad som ska visas, men äger det inte själva.
export function useFilters(isAdmin: boolean) {
  // Ihågkommet filter: appen öppnas där du senast lämnade den, inte nollställd.
  const [selectedJob, setSelectedJob] = useState<string>(() => {
    try { return localStorage.getItem('hireflow:selectedJob') || 'all' } catch { return 'all' }
  })
  const [selectedCompany, setSelectedCompany] = useState<string>(() => {
    try { return localStorage.getItem('hireflow:selectedCompany') || 'all' } catch { return 'all' }
  })
  useEffect(() => {
    try { localStorage.setItem('hireflow:selectedJob', selectedJob) } catch { /* privat läge etc. */ }
  }, [selectedJob])
  useEffect(() => {
    try { localStorage.setItem('hireflow:selectedCompany', selectedCompany) } catch { /* privat läge etc. */ }
  }, [selectedCompany])

  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Debounce på kandidatsökningen så filtreringen inte kör på varje tangenttryck.
  useEffect(() => {
    const id = setTimeout(() => setSearchQuery(searchInput), 150)
    return () => clearTimeout(id)
  }, [searchInput])

  const hasActiveFilter = searchQuery.trim() !== '' || selectedJob !== 'all' || (isAdmin && selectedCompany !== 'all')

  const clearFilters = () => {
    setSearchInput('')
    setSelectedJob('all')
    if (isAdmin) setSelectedCompany('all')
  }

  return {
    selectedJob, setSelectedJob, selectedCompany, setSelectedCompany,
    searchInput, setSearchInput, searchQuery, hasActiveFilter, clearFilters,
  }
}

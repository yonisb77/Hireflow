import type { RefObject } from 'react'
import { BarChart3, CheckSquare, ChevronDown, Download, FilterX, Plus, Search, Settings2, ShieldCheck, Sparkles, Star, User, X } from 'lucide-react'
import type { Auth } from '../hooks/useAuth'
import type { AtsData } from '../hooks/useAtsData'

export default function FilterToolbar({ auth, ats, searchInputRef }: { auth: Auth; ats: AtsData; searchInputRef: RefObject<HTMLInputElement | null> }) {
  return (
    <>
      <div className="relative z-20 bg-slate-900/50 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-3 flex flex-wrap gap-3 items-center">
        <div className="relative w-full sm:w-auto sm:min-w-[220px] max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-700" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Sök kandidater..."
            value={ats.searchInput}
            onChange={e => ats.setSearchInput(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm bg-blue-100 border border-blue-300 text-blue-800 placeholder:text-blue-400 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
          {ats.searchInput && (
            <button
              type="button"
              onClick={() => ats.setSearchInput('')}
              aria-label="Rensa sökning"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {auth.isAdmin && (
          <div className="relative">
            <select
              value={ats.selectedCompany}
              onChange={e => { ats.setSelectedCompany(e.target.value); ats.setSelectedJob('all') }}
              className="appearance-none rounded-lg pl-3 pr-8 py-1.5 text-sm font-semibold text-blue-800 bg-blue-100 border border-blue-300 hover:bg-blue-200 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="all">Alla företag</option>
              {ats.customers.map(c => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500" />
          </div>
        )}

        <div className="relative">
          <select
            value={ats.selectedJob}
            onChange={e => ats.setSelectedJob(e.target.value)}
            className="appearance-none rounded-lg pl-3 pr-8 py-1.5 text-sm font-semibold text-blue-800 bg-blue-100 border border-blue-300 hover:bg-blue-200 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            <option value="all">Alla jobb</option>
            {ats.visibleJobs.map(job => (
              <option key={job.id} value={job.id}>{job.title}{job.status === 'closed' ? ' (stängt)' : ''}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500" />
        </div>

        <button
          type="button"
          onClick={() => ats.setShowFavoritesOnly(!ats.showFavoritesOnly)}
          title="Visa bara favoritmarkerade kandidater"
          aria-label="Visa bara favoritmarkerade kandidater"
          aria-pressed={ats.showFavoritesOnly}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold border transition ${
            ats.showFavoritesOnly
              ? 'bg-amber-400 border-amber-500 text-amber-950 hover:bg-amber-300'
              : 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200 hover:border-blue-400'
          }`}
        >
          <Star className="w-3.5 h-3.5" fill={ats.showFavoritesOnly ? 'currentColor' : 'none'} /> <span className="hidden sm:inline">Favoriter</span>
        </button>

        {/* Individuellt borttagningsbara filterchips, istället för att bara nollställa allt på en gång. */}
        {ats.searchQuery.trim() && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 bg-blue-100 border border-blue-300 pl-2.5 pr-1 py-1 rounded-full">
            Sökning: {ats.searchQuery}
            <button type="button" onClick={() => ats.setSearchInput('')} aria-label="Ta bort sökfilter" className="hover:bg-blue-200 rounded-full p-0.5"><X className="w-3 h-3" /></button>
          </span>
        )}
        {ats.selectedJob !== 'all' && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 bg-blue-100 border border-blue-300 pl-2.5 pr-1 py-1 rounded-full">
            Jobb: {(ats.visibleJobs.find(j => j.id === ats.selectedJob) ?? ats.jobs.find(j => j.id === ats.selectedJob))?.title ?? 'okänt'}
            <button type="button" onClick={() => ats.setSelectedJob('all')} aria-label="Ta bort jobbfilter" className="hover:bg-blue-200 rounded-full p-0.5"><X className="w-3 h-3" /></button>
          </span>
        )}

        {ats.hasActiveFilter && (
          <button
            type="button"
            onClick={ats.clearFilters}
            className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <FilterX className="w-3.5 h-3.5" /> Rensa filter
          </button>
        )}

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {ats.selectedJob !== 'all' && (
            <button
              type="button"
              onClick={() => ats.rankCandidatesForJob(ats.selectedJob)}
              disabled={ats.rankingBusy}
              title="AI-bedöm alla obeslutade kandidater för jobbet och sortera efter matchning"
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 active:scale-[0.97] disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm shadow-purple-500/30"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{ats.rankingBusy ? `Rankar (${ats.rankingProgress?.done ?? 0}/${ats.rankingProgress?.total ?? 0})` : 'Ranka kandidater'}</span>
            </button>
          )}
          {(ats.candidates.length > 0 || ats.jobs.length > 0 || ats.openJobs.length > 0 || ats.filteredCandidates.length > 0) && (
            <div className="relative">
              <button
                type="button"
                onClick={() => ats.setShowMoreMenu(v => !v)}
                className="bg-blue-100 border border-blue-300 hover:bg-blue-200 hover:border-blue-400 text-blue-800 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
              >
                <Settings2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Fler</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${ats.showMoreMenu ? 'rotate-180' : ''}`} />
              </button>
              {ats.showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => ats.setShowMoreMenu(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-gradient-to-br from-blue-100 to-indigo-200 border border-blue-100 rounded-xl shadow-lg z-50 py-1.5 animate-fade-in-up">
                    {ats.candidates.length > 0 && (
                      <button
                        onClick={() => { ats.setShowStatsModal(true); ats.setShowMoreMenu(false) }}
                        className="w-full text-left text-xs font-medium text-slate-700 hover:bg-white/50 flex items-center gap-2 px-3 py-2 transition"
                      >
                        <BarChart3 className="w-3.5 h-3.5" /> Statistik
                      </button>
                    )}
                    {ats.jobs.length > 0 && (
                      <button
                        onClick={() => { ats.setShowManageJobsModal(true); ats.setManageError(null); ats.setShowMoreMenu(false) }}
                        className="w-full text-left text-xs font-medium text-slate-700 hover:bg-white/50 flex items-center gap-2 px-3 py-2 transition"
                      >
                        <Settings2 className="w-3.5 h-3.5" /> Hantera jobb
                      </button>
                    )}
                    {ats.filteredCandidates.length > 0 && (
                      <button
                        onClick={() => { ats.setSelectionMode(true); ats.setShowMoreMenu(false) }}
                        className="w-full text-left text-xs font-medium text-slate-700 hover:bg-white/50 flex items-center gap-2 px-3 py-2 transition"
                      >
                        <CheckSquare className="w-3.5 h-3.5" /> Välj flera kandidater
                      </button>
                    )}
                    {ats.filteredCandidates.length > 0 && (
                      <button
                        onClick={() => { ats.exportCsv(); ats.setShowMoreMenu(false) }}
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
            onClick={() => { ats.setNewJobCompanyId(auth.isAdmin ? (ats.selectedCompany !== 'all' ? ats.selectedCompany : '') : ''); ats.setShowJobModal(true) }}
            className="bg-blue-100 border border-blue-300 hover:bg-blue-200 hover:border-blue-400 text-blue-800 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Skapa jobb</span>
          </button>
          <button
            onClick={() => {
              const filteredJobIsOpen = ats.selectedJob !== 'all' && ats.openJobs.some(j => j.id === ats.selectedJob)
              ats.setNewCandJobId(filteredJobIsOpen ? ats.selectedJob : ats.openJobs.length === 1 ? ats.openJobs[0].id : '')
              ats.setShowCandidateModal(true)
            }}
            disabled={ats.openJobs.length === 0}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.97] disabled:opacity-50 disabled:grayscale text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm shadow-blue-600/20"
          >
            <User className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Lägg till kandidat</span>
          </button>
        </div>
      </div>

      {auth.isAdmin && ats.selectedCompany !== 'all' && (
        <div className="relative z-10 bg-amber-500/15 border-b border-amber-500/30 px-4 sm:px-6 py-1.5 flex items-center gap-2 text-xs text-amber-200">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>Du agerar som <strong className="font-semibold text-amber-100">{ats.customers.find(c => c.id === ats.selectedCompany)?.company_name}</strong></span>
          <button type="button" onClick={() => ats.setSelectedCompany('all')} className="ml-auto text-amber-200 hover:text-white font-semibold underline underline-offset-2 shrink-0">
            Visa alla
          </button>
        </div>
      )}
    </>
  )
}

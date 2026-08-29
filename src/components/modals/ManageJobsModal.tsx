import { Copy, Lock, Pencil, Settings2, Trash2, X } from 'lucide-react'
import type { Auth } from '../../hooks/useAuth'
import type { AtsData } from '../../hooks/useAtsData'

export default function ManageJobsModal({ auth, ats }: { auth: Auth; ats: AtsData }) {
  if (!ats.showManageJobsModal) return null

  const close = () => { ats.setShowManageJobsModal(false); ats.setConfirmDeleteJobId(null); ats.setManageError(null); ats.setManageJobFilter('') }

  return (
    <div
      role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
      onClick={e => { if (e.target === e.currentTarget) close() }}
    >
      <div className="bg-gradient-to-br from-blue-100 to-indigo-200/80 rounded-xl p-5 max-w-md w-full max-h-[80vh] overflow-y-auto slim-scroll animate-fade-in-up border border-blue-100/50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5"><Settings2 className="w-4 h-4" /></span>
            Hantera jobb
          </h2>
          <button onClick={close} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        {ats.manageError && <p className="text-xs text-red-600 mb-3">{ats.manageError}</p>}
        {ats.manageableJobs.length > 5 && (
          <input
            type="text"
            value={ats.manageJobFilter}
            onChange={e => ats.setManageJobFilter(e.target.value)}
            placeholder="Filtrera jobb..."
            className="w-full mb-3 px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
        <div className="space-y-2">
          {ats.filteredManageJobs.map(job => {
            const jobCandidates = ats.candidates.filter(c => c.job_id === job.id)
            const candidateCount = jobCandidates.length
            const isConfirming = ats.confirmDeleteJobId === job.id
            // Föreslå att stänga jobbet när det inte finns någon aktiv kandidat kvar att ta ställning till.
            const suggestClose = job.status === 'open' && candidateCount > 0 && jobCandidates.every(c => ['hired', 'rejected'].includes(c.stage))
            return (
              <div key={job.id} className="flex items-center justify-between gap-2 border border-slate-200 bg-slate-50 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (auth.isAdmin) ats.setSelectedCompany(job.company_id)
                        ats.setSelectedJob(job.id)
                        close()
                      }}
                      title="Visa detta jobb i kanban-vyn"
                      className="text-sm font-semibold text-slate-800 truncate hover:text-blue-700 hover:underline text-left"
                    >
                      {job.title}
                    </button>
                    {job.status === 'closed' && (
                      <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-full">
                        <Lock className="w-2.5 h-2.5" /> Stängt
                      </span>
                    )}
                    {suggestClose && (
                      <span title="Alla kandidater är anställda eller avvisade — inget mer att ta ställning till" className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                        Redo att stängas
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {job.department && `${job.department} · `}
                    {candidateCount} {candidateCount === 1 ? 'kandidat' : 'kandidater'}
                    {auth.isAdmin && ` · ${ats.companyName(job.company_id)}`}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => ats.duplicateJob(job)}
                    className="text-xs font-semibold text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition"
                    aria-label="Duplicera jobb"
                    title="Duplicera jobb"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => ats.openJobEdit(job)}
                    className="text-xs font-semibold text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition"
                    aria-label="Redigera jobb"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => ats.toggleJobStatus(job)}
                    disabled={ats.manageBusyId === job.id}
                    className="text-xs font-semibold text-slate-600 hover:bg-slate-200 px-2 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    {job.status === 'open' ? 'Stäng' : 'Öppna'}
                  </button>
                  <button
                    onClick={() => ats.deleteJob(job)}
                    disabled={ats.manageBusyId === job.id}
                    className={`text-xs font-semibold flex items-center gap-1 px-2 py-1.5 rounded-lg transition disabled:opacity-50 ${isConfirming ? 'text-white bg-red-600 hover:bg-red-700' : 'text-red-600 hover:bg-red-50'}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {isConfirming ? 'Bekräfta' : 'Ta bort'}
                  </button>
                </div>
              </div>
            )
          })}
          {ats.manageableJobs.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">Inga jobb registrerade</p>
          )}
          {ats.manageableJobs.length > 0 && ats.filteredManageJobs.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">Inga jobb matchar "{ats.manageJobFilter}".</p>
          )}
        </div>
      </div>
    </div>
  )
}

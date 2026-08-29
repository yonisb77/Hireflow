import { Building2, Trash2, UserPlus, X } from 'lucide-react'
import type { AtsData } from '../../hooks/useAtsData'

export default function ManageCompaniesModal({ ats }: { ats: AtsData }) {
  if (!ats.showManageCompaniesModal) return null

  const close = () => { ats.setShowManageCompaniesModal(false); ats.setConfirmDeleteCompanyId(null); ats.setManageError(null); ats.setManageCompanyFilter('') }

  return (
    <div
      role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
      onClick={e => { if (e.target === e.currentTarget) close() }}
    >
      <div className="bg-gradient-to-br from-blue-100 to-indigo-200/80 rounded-xl p-5 max-w-md w-full max-h-[80vh] overflow-y-auto slim-scroll animate-fade-in-up border border-blue-100/50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5"><Building2 className="w-4 h-4" /></span>
            Hantera företag
          </h2>
          <button onClick={close} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        {ats.manageError && <p className="text-xs text-red-600 mb-3">{ats.manageError}</p>}
        {ats.customers.length > 5 && (
          <input
            type="text"
            value={ats.manageCompanyFilter}
            onChange={e => ats.setManageCompanyFilter(e.target.value)}
            placeholder="Filtrera företag..."
            className="w-full mb-3 px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
        <div className="space-y-2">
          {ats.filteredManageCompanies.map(company => {
            const jobCount = ats.jobs.filter(j => j.company_id === company.id).length
            const isConfirming = ats.confirmDeleteCompanyId === company.id
            return (
              <div key={company.id} className="flex items-center justify-between gap-2 border border-slate-200 bg-slate-50 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      ats.setSelectedCompany(company.id)
                      ats.setSelectedJob('all')
                      close()
                    }}
                    title="Visa detta företags kandidater"
                    className="block text-sm font-semibold text-slate-800 truncate hover:text-blue-700 hover:underline text-left"
                  >
                    {company.company_name}
                  </button>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                    <span className="truncate">{company.email} · {jobCount} jobb</span>
                    {ats.accountStatus[company.id] === false && (
                      <span className="shrink-0 inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">Väntar på inbjudan</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => ats.resendInvite(company)}
                    disabled={ats.manageBusyId === company.id}
                    title="Skicka inbjudan igen"
                    className="text-xs font-semibold text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => ats.deleteCompany(company)}
                    disabled={ats.manageBusyId === company.id}
                    className={`text-xs font-semibold flex items-center gap-1 px-2 py-1.5 rounded-lg transition disabled:opacity-50 ${isConfirming ? 'text-white bg-red-600 hover:bg-red-700' : 'text-red-600 hover:bg-red-50'}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {isConfirming ? 'Bekräfta' : 'Ta bort'}
                  </button>
                </div>
              </div>
            )
          })}
          {ats.customers.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">Inga kundkonton registrerade</p>
          )}
          {ats.customers.length > 0 && ats.filteredManageCompanies.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">Inga företag matchar "{ats.manageCompanyFilter}".</p>
          )}
        </div>
      </div>
    </div>
  )
}

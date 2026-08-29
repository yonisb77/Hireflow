import { Briefcase } from 'lucide-react'
import type { Auth } from '../../hooks/useAuth'
import type { AtsData } from '../../hooks/useAtsData'

export default function JobModal({ auth, ats }: { auth: Auth; ats: AtsData }) {
  if (!ats.showJobModal) return null

  return (
    <div
      role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
      onClick={e => { if (e.target === e.currentTarget) { ats.setShowJobModal(false); ats.setJobError(null) } }}
    >
      <div className="bg-gradient-to-br from-blue-100 to-indigo-200/80 rounded-xl p-5 max-w-sm w-full animate-fade-in-up border border-blue-100/50">
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5"><Briefcase className="w-4 h-4" /></span>
          Skapa jobb
        </h2>
        <form onSubmit={ats.createJob} className="space-y-3">
          {auth.isAdmin && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Företag</label>
              <select required value={ats.newJobCompanyId} onChange={e => ats.setNewJobCompanyId(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white">
                <option value="">Välj företag...</option>
                {ats.customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Jobbtitel</label>
            <input autoFocus required value={ats.newJobTitle} onChange={e => ats.setNewJobTitle(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" placeholder="t.ex. Frontend-utvecklare" />
            {ats.newJobTitle.trim() && ats.jobs.some(j => j.title.toLowerCase() === ats.newJobTitle.trim().toLowerCase() && (!auth.isAdmin || j.company_id === ats.newJobCompanyId)) && (
              <p className="text-[11px] text-amber-600 mt-1">Ett jobb med samma titel finns redan{auth.isAdmin ? ' hos det företaget' : ''}.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Avdelning (valfritt)</label>
            <input value={ats.newJobDept} onChange={e => ats.setNewJobDept(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" placeholder="t.ex. Teknik" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Jobbeskrivning (valfritt)</label>
            <textarea value={ats.newJobDescription} onChange={e => ats.setNewJobDescription(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" rows={3} placeholder="Krav, ansvarsområden, önskad erfarenhet... används av AI-bedömningen." />
          </div>
          {ats.jobError && <p className="text-xs text-red-600">{ats.jobError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { ats.setShowJobModal(false); ats.setJobError(null) }} className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-slate-600">Avbryt</button>
            <button type="submit" disabled={ats.jobBusy} className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.97] text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow-sm shadow-blue-600/20">
              {ats.jobBusy ? 'Skapar...' : 'Skapa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

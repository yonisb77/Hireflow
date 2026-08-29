import { Pencil } from 'lucide-react'
import type { AtsData } from '../../hooks/useAtsData'

export default function EditJobModal({ ats }: { ats: AtsData }) {
  if (!ats.editingJob) return null

  return (
    <div
      role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
      onClick={e => { if (e.target === e.currentTarget) ats.closeJobEdit() }}
    >
      <div className="bg-gradient-to-br from-blue-100 to-indigo-200/80 rounded-xl p-5 max-w-sm w-full animate-fade-in-up border border-blue-100/50">
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5"><Pencil className="w-4 h-4" /></span>
          Redigera jobb
        </h2>
        <form onSubmit={ats.saveJobEdit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Jobbtitel</label>
            <input autoFocus required value={ats.jobEditDraft.title} onChange={e => ats.setJobEditDraft({ ...ats.jobEditDraft, title: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Avdelning (valfritt)</label>
            <input value={ats.jobEditDraft.department} onChange={e => ats.setJobEditDraft({ ...ats.jobEditDraft, department: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Jobbeskrivning (valfritt)</label>
            <textarea value={ats.jobEditDraft.description} onChange={e => ats.setJobEditDraft({ ...ats.jobEditDraft, description: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" rows={4} placeholder="Krav, ansvarsområden, önskad erfarenhet... används av AI-bedömningen." />
          </div>
          {ats.jobEditError && <p className="text-xs text-red-600">{ats.jobEditError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={ats.closeJobEdit} className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-slate-600">Avbryt</button>
            <button type="submit" disabled={ats.jobEditBusy} className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.97] text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow-sm shadow-blue-600/20">
              {ats.jobEditBusy ? 'Sparar...' : 'Spara'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

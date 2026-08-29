import { BarChart3, X } from 'lucide-react'
import { STAGES } from '../../constants'
import type { AtsData } from '../../hooks/useAtsData'

export default function StatsModal({ ats }: { ats: AtsData }) {
  if (!ats.showStatsModal) return null
  const stats = ats.stats

  return (
    <div
      role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
      onClick={e => { if (e.target === e.currentTarget) ats.setShowStatsModal(false) }}
    >
      <div className="bg-gradient-to-br from-blue-100 to-indigo-200/80 rounded-xl p-5 max-w-lg w-full max-h-[85vh] overflow-y-auto slim-scroll animate-fade-in-up border border-blue-100/50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5"><BarChart3 className="w-4 h-4" /></span>
            Statistik
          </h2>
          <button onClick={() => ats.setShowStatsModal(false)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mb-4">Speglar de filter som är aktiva just nu ({stats.total} kandidater).</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
            <div className="text-2xl font-bold text-slate-800">{stats.successRate !== null ? `${stats.successRate}%` : '—'}</div>
            <div className="text-[11px] text-slate-500">Framgångsgrad (andel anställda av avgjorda)</div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
            <div className="text-2xl font-bold text-slate-800">{stats.avgTimeToHireDays !== null ? `${stats.avgTimeToHireDays}d` : '—'}</div>
            <div className="text-[11px] text-slate-500">Snittid till anställning</div>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
            <div className="text-2xl font-bold text-slate-800">{stats.hiredCount}</div>
            <div className="text-[11px] text-slate-500">Anställda</div>
          </div>
          <div className={`border rounded-lg p-3 ${stats.staleCount > 0 ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
            <div className={`text-2xl font-bold ${stats.staleCount > 0 ? 'text-amber-700' : 'text-slate-800'}`}>{stats.staleCount}</div>
            <div className="text-[11px] text-slate-500">Inaktiva ≥14 dagar</div>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-600 mb-2">Kandidater per steg</p>
          <div className="space-y-1.5">
            {STAGES.map(s => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 w-20 shrink-0 truncate">{s.title}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${s.dot}`}
                    style={{ width: stats.total > 0 ? `${(stats.byStage[s.id] / stats.total) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-slate-600 w-5 text-right shrink-0">{stats.byStage[s.id]}</span>
              </div>
            ))}
          </div>
        </div>

        {stats.byJob.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Kandidater per jobb</p>
            <div className="space-y-1">
              {stats.byJob.map(({ job, count }) => (
                <div key={job.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                  <span className="text-slate-600 truncate">{job.title}</span>
                  <span className="font-semibold text-slate-700 shrink-0 ml-2">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

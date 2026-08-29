import { AlertTriangle } from 'lucide-react'
import type { AtsData } from '../hooks/useAtsData'

// Samlar det som annars ligger utspritt som små märken i kanban-vyn
// (inaktiva kandidater, jobb redo att stängas) på en rad, så kunden ser
// direkt vid inloggning vad som faktiskt behöver en åtgärd.
export default function AttentionBar({ ats }: { ats: AtsData }) {
  if (ats.staleCandidateCount === 0 && ats.closableJobCount === 0) return null

  return (
    <div className="relative z-10 bg-amber-500/10 border-b border-amber-500/20 px-4 sm:px-6 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-amber-200">
      <span className="inline-flex items-center gap-1.5 font-semibold text-amber-100">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Kräver åtgärd:
      </span>
      {ats.staleCandidateCount > 0 && (
        <button type="button" onClick={() => ats.setShowStatsModal(true)} className="hover:text-white hover:underline underline-offset-2 transition">
          {ats.staleCandidateCount} {ats.staleCandidateCount === 1 ? 'kandidat har' : 'kandidater har'} väntat ≥14 dagar
        </button>
      )}
      {ats.closableJobCount > 0 && (
        <button type="button" onClick={() => { ats.setManageError(null); ats.setShowManageJobsModal(true) }} className="hover:text-white hover:underline underline-offset-2 transition">
          {ats.closableJobCount} jobb är redo att stängas
        </button>
      )}
    </div>
  )
}

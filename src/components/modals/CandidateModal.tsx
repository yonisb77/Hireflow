import { User } from 'lucide-react'
import type { Auth } from '../../hooks/useAuth'
import type { AtsData } from '../../hooks/useAtsData'

export default function CandidateModal({ auth, ats }: { auth: Auth; ats: AtsData }) {
  if (!ats.showCandidateModal) return null

  return (
    <div
      role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
      onClick={e => { if (e.target === e.currentTarget) { ats.setShowCandidateModal(false); ats.setCandidateError(null) } }}
    >
      <div className="bg-gradient-to-br from-blue-100 to-indigo-200/80 rounded-xl p-5 max-w-sm w-full animate-fade-in-up border border-blue-100/50">
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5"><User className="w-4 h-4" /></span>
          Lägg till kandidat
        </h2>
        <form onSubmit={ats.createCandidate} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Jobb</label>
            <select autoFocus required value={ats.newCandJobId} onChange={e => ats.setNewCandJobId(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white">
              <option value="">Välj jobb...</option>
              {ats.openJobs.map(j => (
                <option key={j.id} value={j.id}>{j.title}{auth.isAdmin ? ` · ${ats.companyName(j.company_id)}` : ''}</option>
              ))}
            </select>
            {ats.openJobs.length === 0 && ats.manageableJobs.length > 0 && (
              <p className="text-[11px] text-slate-400 mt-1">Alla jobb är stängda — öppna ett i "Hantera jobb" för att lägga till kandidater.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Fullständigt namn</label>
            <input required value={ats.newCandName} onChange={e => ats.setNewCandName(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" placeholder="Anna Andersson" />
            {ats.newCandJobId && ats.newCandName.trim() && ats.candidates.some(c => c.job_id === ats.newCandJobId && c.full_name.trim().toLowerCase() === ats.newCandName.trim().toLowerCase()) && (
              <p className="text-[11px] text-amber-600 mt-1">Redan en kandidat med samma namn på detta jobb.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">E-post</label>
            <input type="email" value={ats.newCandEmail} onChange={e => ats.setNewCandEmail(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" placeholder="anna@example.com" />
            {ats.newCandJobId && ats.newCandEmail && ats.candidates.some(c => c.job_id === ats.newCandJobId && c.email?.toLowerCase() === ats.newCandEmail.toLowerCase()) && (
              <p className="text-[11px] text-amber-600 mt-1">Redan en kandidat med den här e-posten på detta jobb.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">LinkedIn-profil</label>
            <input value={ats.newCandLinkedin} onChange={e => ats.setNewCandLinkedin(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" placeholder="linkedin.com/in/..." />
            {ats.newCandLinkedin.trim() && !ats.newCandLinkedin.toLowerCase().includes('linkedin.com') && (
              <p className="text-[11px] text-amber-600 mt-1">Ser inte ut som en LinkedIn-länk.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Noteringar</label>
            <textarea value={ats.newCandNotes} onChange={e => ats.setNewCandNotes(e.target.value)} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" rows={2} placeholder="Noteringar..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">CV (valfritt, max 5 MB)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={e => ats.setNewCandResumeFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-50"
            />
          </div>
          {ats.candidateError && <p className="text-xs text-red-600">{ats.candidateError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => { ats.setShowCandidateModal(false); ats.setCandidateError(null); ats.setNewCandResumeFile(null) }} className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-slate-600">Avbryt</button>
            <button type="submit" disabled={ats.candidateBusy || ats.resumeBusy} className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.97] text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow-sm shadow-blue-600/20">
              {ats.candidateBusy ? 'Sparar...' : ats.resumeBusy ? 'Laddar upp CV...' : 'Spara'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

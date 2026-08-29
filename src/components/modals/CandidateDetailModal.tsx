import { Copy, MessageSquare, Paperclip, ShieldAlert, Sparkles, Trash2, User, X } from 'lucide-react'
import { STAGES } from '../../constants'
import type { Stage } from '../../types'
import type { Auth } from '../../hooks/useAuth'
import type { AtsData } from '../../hooks/useAtsData'

export default function CandidateDetailModal({ auth, ats }: { auth: Auth; ats: AtsData }) {
  const candidate = ats.selectedCandidate
  if (!candidate) return null

  return (
    <div
      role="dialog" aria-modal="true" className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50"
      onClick={e => { if (e.target === e.currentTarget) ats.closeCandidateModal() }}
    >
      <div className="bg-gradient-to-br from-blue-100 to-indigo-200/80 rounded-xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto slim-scroll animate-fade-in-up border border-blue-100/50">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg p-1.5"><User className="w-4 h-4" /></span>
              Kandidat
            </h2>
            <p className="text-[11px] text-slate-400 mt-1 ml-9">Tillagd {ats.timeAgo(candidate.created_at)}</p>
          </div>
          <button onClick={ats.closeCandidateModal} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={ats.saveCandidate} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Fullständigt namn</label>
            <input required value={ats.editDraft.full_name} onChange={e => ats.setEditDraft({ ...ats.editDraft, full_name: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">E-post</label>
            <div className="relative">
              <input type="email" value={ats.editDraft.email} onChange={e => ats.setEditDraft({ ...ats.editDraft, email: e.target.value })} className="w-full px-3 py-1.5 pr-9 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" />
              {ats.editDraft.email && (
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(ats.editDraft.email); ats.showToast('E-post kopierad') }}
                  aria-label="Kopiera e-post"
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">LinkedIn-profil</label>
            <input value={ats.editDraft.linkedin_url} onChange={e => ats.setEditDraft({ ...ats.editDraft, linkedin_url: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" />
            {ats.editDraft.linkedin_url.trim() && !ats.editDraft.linkedin_url.toLowerCase().includes('linkedin.com') && (
              <p className="text-[11px] text-amber-600 mt-1">Ser inte ut som en LinkedIn-länk.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Steg</label>
            <select value={ats.editDraft.stage} onChange={e => ats.setEditDraft({ ...ats.editDraft, stage: e.target.value as Stage })} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white">
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          {ats.editDraft.stage === 'rejected' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Anledning till avslag (valfritt)</label>
              <input value={ats.editDraft.rejection_reason} onChange={e => ats.setEditDraft({ ...ats.editDraft, rejection_reason: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" placeholder="t.ex. saknad kompetens, löneförväntan..." />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Noteringar</label>
            <textarea value={ats.editDraft.notes} onChange={e => ats.setEditDraft({ ...ats.editDraft, notes: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400" rows={2} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1"><Paperclip className="w-3 h-3" /> CV</label>
            <div className="flex items-center gap-2">
              {candidate.resume_path && (
                <button type="button" onClick={() => ats.viewResume(candidate)} className="text-xs font-semibold text-blue-600 hover:underline">
                  Visa CV
                </button>
              )}
              <label className="text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-300 px-2.5 py-1.5 rounded-lg cursor-pointer transition">
                {ats.resumeBusy ? 'Laddar upp...' : candidate.resume_path ? 'Byt fil' : 'Ladda upp CV'}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  disabled={ats.resumeBusy}
                  onChange={async e => {
                    const file = e.target.files?.[0]
                    if (!file || !candidate) return
                    const updated = await ats.uploadResumeFile(candidate, file)
                    if (updated) {
                      ats.setSelectedCandidate(updated)
                      ats.showToast('CV uppladdat')
                    }
                  }}
                />
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" /> AI-bedömning
              </span>
              <button type="button" onClick={ats.assessCandidate} disabled={ats.aiBusy} className="text-[11px] font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 active:scale-[0.97] px-2.5 py-1.5 rounded-lg disabled:opacity-50 transition shadow-sm shadow-purple-500/30">
                {ats.aiBusy ? 'Analyserar...' : candidate.ai_assessment ? 'Bedöm igen' : 'AI-bedöm mot jobbet'}
              </button>
            </div>
            {ats.aiError && <p className="text-xs text-red-600 mb-2">{ats.aiError}</p>}
            {candidate.ai_assessment && (
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-purple-100 rounded-lg p-2.5 text-xs space-y-1.5 animate-fade-in-up">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-purple-800">Poäng: {candidate.ai_assessment.score}/10</div>
                  {candidate.ai_assessed_at && (
                    <span className="text-[10px] text-purple-400" title="Redigeras jobbeskrivningen efteråt kan bedömningen bli inaktuell">Bedömd {ats.timeAgo(candidate.ai_assessed_at)}</span>
                  )}
                </div>
                <p className="text-slate-700">{candidate.ai_assessment.summary}</p>
                {candidate.ai_assessment.strengths?.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-600">Styrkor: </span>
                    <span className="text-slate-600">{candidate.ai_assessment.strengths.join(', ')}</span>
                  </div>
                )}
                {candidate.ai_assessment.weaknesses?.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-600">Svagheter: </span>
                    <span className="text-slate-600">{candidate.ai_assessment.weaknesses.join(', ')}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 pt-3">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-2">
              <MessageSquare className="w-3.5 h-3.5" /> Anteckningar
            </span>
            {ats.notesLoading ? (
              <p className="text-xs text-slate-400">Laddar...</p>
            ) : ats.candidateNotes.length === 0 ? (
              <p className="text-xs text-slate-400 mb-2">Inga anteckningar tillagda</p>
            ) : (
              <div className="space-y-2 mb-2 max-h-40 overflow-y-auto slim-scroll pr-1">
                {ats.candidateNotes.map(note => (
                  <div key={note.id} className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-slate-600">
                        {note.author_id === auth.profile?.id ? 'Du' : note.author_role === 'admin' ? 'Admin' : 'Kund'}
                      </span>
                      <span className="text-slate-400">{ats.timeAgo(note.created_at)}</span>
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap">{note.body}</p>
                  </div>
                ))}
              </div>
            )}
            {ats.noteError && <p className="text-xs text-red-600 mb-2">{ats.noteError}</p>}
            <div className="flex gap-2">
              <input
                value={ats.newNoteText}
                onChange={e => ats.setNewNoteText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ats.addNote() } }}
                placeholder="Lägg till en anteckning..."
                className="flex-1 px-3 py-1.5 border rounded-lg text-sm bg-white text-slate-800 placeholder:text-slate-400"
              />
              <button type="button" onClick={ats.addNote} disabled={ats.noteBusy || !ats.newNoteText.trim()} className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition">
                {ats.noteBusy ? '...' : 'Lägg till'}
              </button>
            </div>
          </div>

          {ats.saveError && <p className="text-xs text-red-600">{ats.saveError}</p>}

          <div className="flex justify-between items-center gap-2 pt-2">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={ats.deleteCandidate}
                disabled={ats.savingCandidate}
                className="text-xs font-semibold flex items-center gap-1 px-2 py-1.5 rounded-lg disabled:opacity-50 text-red-600 hover:bg-red-50 transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> Ta bort
              </button>
              <button
                type="button"
                onClick={ats.exportCandidateData}
                title="Exportera all data vi har om kandidaten (GDPR)"
                className="text-xs font-semibold text-slate-500 hover:bg-slate-100 flex items-center gap-1 px-2 py-1.5 rounded-lg transition"
              >
                <ShieldAlert className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Exportera data</span>
              </button>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={ats.closeCandidateModal} className="px-3 py-1.5 border rounded-lg text-xs font-semibold text-slate-600">Avbryt</button>
              <button type="submit" disabled={ats.savingCandidate} className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.97] text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow-sm shadow-blue-600/20">
                {ats.savingCandidate ? 'Sparar...' : 'Spara'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

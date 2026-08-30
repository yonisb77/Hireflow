import { Draggable } from '@hello-pangea/dnd'
import { CalendarClock, CheckSquare, ChevronRight, Clock, Crown, ExternalLink, Paperclip, Sparkles, Star } from 'lucide-react'
import HighlightMatch from './HighlightMatch'
import { STAGES } from '../constants'
import { avatarColor, initials } from '../utils'
import type { Candidate, Job } from '../types'
import type { Auth } from '../hooks/useAuth'
import type { AtsData } from '../hooks/useAtsData'

interface Props {
  candidate: Candidate
  job: Job | undefined
  stage: (typeof STAGES)[number]
  index: number
  auth: Auth
  ats: AtsData
}

export default function CandidateCard({ candidate, job, stage, index, auth, ats }: Props) {
  const isSelected = ats.selectedCandidateIds.has(candidate.id)

  return (
    <Draggable draggableId={candidate.id} index={index} isDragDisabled={ats.selectionMode}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => ats.selectionMode ? ats.toggleCandidateSelection(candidate.id) : ats.openCandidate(candidate)}
          className={`bg-blue-100/60 p-3 rounded-lg border border-l-4 ${stage.accent} transition-all duration-150 cursor-pointer ${
            isSelected ? 'border-blue-500 ring-2 ring-blue-400' : 'border-blue-100'
          } ${
            snapshot.isDragging
              ? 'shadow-2xl shadow-blue-900/20 ring-2 ring-blue-300 rotate-2 scale-[1.03]'
              : 'shadow-sm hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {ats.selectionMode ? (
              <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center border-2 ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'}`}>
                {isSelected && <CheckSquare className="w-3.5 h-3.5" />}
              </span>
            ) : (
              <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${avatarColor(candidate.full_name)}`}>
                {initials(candidate.full_name) || '?'}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-sm text-slate-800 truncate flex items-center gap-1">
                  <HighlightMatch text={candidate.full_name} query={ats.searchQuery} />
                  {candidate.resume_path && <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />}
                  {ats.isNew(candidate) && (
                    <span className="shrink-0 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">Ny</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {candidate.ai_assessment && (
                    <span
                      title={candidate.id === ats.topMatchId ? 'Bästa matchningen för jobbet' : undefined}
                      className={`inline-flex items-center gap-0.5 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full shadow-sm ${candidate.id === ats.topMatchId ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/40' : 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-purple-500/40'}`}
                    >
                      {candidate.id === ats.topMatchId ? <Crown className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />} {candidate.ai_assessment.score}/10
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); ats.toggleFavorite(candidate) }}
                    title={candidate.is_favorite ? 'Ta bort favoritmarkering' : 'Markera som favorit'}
                    className={`p-0.5 rounded transition ${candidate.is_favorite ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
                  >
                    <Star className="w-3.5 h-3.5" fill={candidate.is_favorite ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-500 mb-2 truncate">
                {job?.title || 'Okänt jobb'}
                {auth.isAdmin && <span className="text-slate-400"> · {ats.companyName(candidate.company_id)}</span>}
              </div>

              {candidate.notes && (
                <p className="text-xs text-slate-600 bg-slate-50 p-1.5 rounded mb-2 border border-slate-100 line-clamp-2">{candidate.notes}</p>
              )}

              {candidate.interview_date && (
                <p className="flex items-center gap-1 text-[11px] text-indigo-600 mb-2">
                  <CalendarClock className="w-3 h-3" /> Intervju {new Date(candidate.interview_date).toLocaleDateString('sv-SE')}
                </p>
              )}

              <div className="flex items-center justify-between gap-2">
                {candidate.linkedin_url ? (
                  <a
                    href={candidate.linkedin_url.startsWith('http') ? candidate.linkedin_url : `https://${candidate.linkedin_url}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> LinkedIn
                  </a>
                ) : <span />}
                <span className="flex items-center gap-1.5 shrink-0">
                  <span
                    title={ats.isStale(candidate) ? `${ats.daysInStage(candidate)} dagar i ${stage.title.toLowerCase()} utan förändring` : undefined}
                    className={`inline-flex items-center gap-1 text-[10px] ${ats.isStale(candidate) ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}
                  >
                    <Clock className="w-2.5 h-2.5" /> {ats.daysInStage(candidate)}d i steget
                  </span>
                  {!ats.selectionMode && ats.nextStage(candidate.stage) && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); ats.advanceStage(candidate) }}
                      title={`Flytta till ${STAGES.find(s => s.id === ats.nextStage(candidate.stage))?.title}`}
                      className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded p-0.5 transition"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}

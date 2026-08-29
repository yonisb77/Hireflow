import { DragDropContext, Droppable } from '@hello-pangea/dnd'
import { AlertCircle, FilterX, Plus, X } from 'lucide-react'
import HireflowMark from './HireflowMark'
import CandidateCard from './CandidateCard'
import { STAGES, WIP_LIMIT } from '../constants'
import type { Stage } from '../types'
import type { Auth } from '../hooks/useAuth'
import type { AtsData } from '../hooks/useAtsData'

export default function KanbanBoard({ auth, ats }: { auth: Auth; ats: AtsData }) {
  return (
    <>
      {ats.dataError && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2 text-xs text-red-700">
          Kunde inte hämta data: {ats.dataError}
        </div>
      )}

      {ats.loadingData ? (
        <div className="flex-1 p-3 sm:p-6 overflow-x-auto slim-scroll snap-x snap-mandatory" aria-label="Laddar data" role="status">
          <div className="flex gap-3 sm:gap-4 h-full lg:min-w-[1200px]">
            {STAGES.map(stage => (
              <div key={stage.id} className="w-[85vw] max-w-xs shrink-0 snap-start lg:w-auto lg:flex-1 lg:max-w-none bg-blue-100/60 border border-blue-100 rounded-xl flex flex-col overflow-hidden animate-pulse">
                <div className="px-3.5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="h-2.5 w-16 rounded bg-slate-200" />
                  <div className="h-4 w-5 rounded-full bg-slate-200" />
                </div>
                <div className="p-2 space-y-2">
                  {[0, 1].map(i => (
                    <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-200 shrink-0" />
                        <div className="h-2.5 flex-1 rounded bg-slate-200" />
                      </div>
                      <div className="h-2 w-2/3 rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : ats.jobs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xs">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 mb-3 animate-float">
              <HireflowMark className="w-6 h-6" />
            </span>
            <p className="text-sm font-semibold text-white">Inga jobb publicerade</p>
            <p className="text-xs text-slate-300 mt-1 mb-4">Skapa ett jobb för att börja ta emot kandidater.</p>
            <button
              onClick={() => { ats.setNewJobCompanyId(auth.isAdmin ? (ats.selectedCompany !== 'all' ? ats.selectedCompany : '') : ''); ats.setShowJobModal(true) }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.97] text-white text-xs font-semibold px-4 py-2 rounded-lg inline-flex items-center gap-1.5 transition shadow-sm shadow-blue-600/20"
            >
              <Plus className="w-3.5 h-3.5" /> Skapa jobb
            </button>
          </div>
        </div>
      ) : ats.hasActiveFilter && ats.filteredCandidates.length === 0 && ats.candidates.length > 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xs">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 mb-3">
              <FilterX className="w-6 h-6 text-slate-400" />
            </span>
            <p className="text-sm font-semibold text-white">Inga kandidater matchar filtret</p>
            <p className="text-xs text-slate-300 mt-1 mb-4">Försök med ett annat jobb, företag eller sökord.</p>
            <button
              onClick={ats.clearFilters}
              className="bg-blue-100 border border-blue-300 hover:bg-blue-200 text-blue-800 text-xs font-semibold px-4 py-2 rounded-lg inline-flex items-center gap-1.5 transition"
            >
              <FilterX className="w-3.5 h-3.5" /> Rensa filter
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-3 sm:p-6 overflow-x-auto slim-scroll snap-x snap-mandatory">
          <DragDropContext onDragEnd={ats.onDragEnd}>
            <div className="flex gap-3 sm:gap-4 h-full lg:min-w-[1200px]">
              {STAGES.map((stage, stageIndex) => {
                const stageCandidates = ats.filteredCandidates
                  .filter(c => c.stage === stage.id)
                  .slice()
                  .sort((a, b) => (b.ai_assessment?.score ?? -1) - (a.ai_assessment?.score ?? -1))
                // Varnar när för många kandidater samlas i samma aktiva steg
                // (möjlig flaskhals). Gäller inte de redan avgjorda stegen.
                const isOverWipLimit = stageCandidates.length > WIP_LIMIT && !['hired', 'rejected'].includes(stage.id)
                return (
                  <div
                    key={stage.id}
                    style={{ animationDelay: `${stageIndex * 60}ms`, animationFillMode: 'backwards' }}
                    className="w-[85vw] max-w-xs shrink-0 snap-start lg:w-auto lg:flex-1 lg:max-w-none bg-blue-100/60 border border-blue-100 rounded-xl flex flex-col max-h-[80vh] shadow-sm overflow-hidden animate-fade-in-up"
                  >
                    <div
                      title={isOverWipLimit ? `Fler än ${WIP_LIMIT} kandidater väntar i detta steg — möjlig flaskhals` : undefined}
                      className={`px-3.5 py-3 border-b flex justify-between items-center ${isOverWipLimit ? 'bg-amber-50 border-amber-200' : stage.header}`}
                    >
                      <span className="flex items-center gap-2 font-semibold text-xs text-slate-700 uppercase tracking-wider">
                        <span className="relative flex w-2 h-2">
                          {stageCandidates.length > 0 && (
                            <span className={`absolute inline-flex w-full h-full rounded-full opacity-60 animate-ping ${stage.dot}`} />
                          )}
                          <span className={`relative inline-flex w-2 h-2 rounded-full ${stage.dot}`} />
                        </span>
                        {stage.title}
                        {isOverWipLimit && <AlertCircle className="w-3 h-3 text-amber-600" />}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isOverWipLimit ? 'bg-amber-200 text-amber-800' : stage.badge}`}>{stageCandidates.length}</span>
                    </div>

                    <Droppable droppableId={stage.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`p-2 flex-1 overflow-y-auto slim-scroll space-y-2 transition-colors duration-150 ${snapshot.isDraggingOver ? 'bg-blue-50/70' : ''}`}
                        >
                          {stageCandidates.length === 0 && !snapshot.isDraggingOver && (
                            <div className="h-full min-h-[80px] flex items-center justify-center text-center px-2">
                              <p className="text-[11px] text-slate-300">Inga kandidater i detta steg</p>
                            </div>
                          )}
                          {stageCandidates.map((candidate, index) => {
                            const job = ats.jobs.find(j => j.id === candidate.job_id)
                            return (
                              <CandidateCard key={candidate.id} candidate={candidate} job={job} stage={stage} index={index} auth={auth} ats={ats} />
                            )
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )
              })}
            </div>
          </DragDropContext>
        </div>
      )}

      {ats.selectionMode && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 text-white rounded-xl shadow-2xl shadow-black/40 px-4 py-2.5 flex items-center gap-3 animate-fade-in-up">
          <span className="text-xs font-semibold">{ats.selectedCandidateIds.size} valda</span>
          <select
            onChange={e => { if (e.target.value) ats.bulkMoveSelected(e.target.value as Stage) }}
            disabled={ats.selectedCandidateIds.size === 0}
            defaultValue=""
            className="text-xs font-semibold text-slate-800 bg-white rounded-lg px-2 py-1.5 outline-none disabled:opacity-50"
          >
            <option value="" disabled>Flytta till...</option>
            {STAGES.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <button
            type="button"
            onClick={ats.exitSelectionMode}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            aria-label="Avbryt val"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  )
}

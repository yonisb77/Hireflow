import type { Database } from './database.types'

type Tables = Database['public']['Tables']

export type Role = 'admin' | 'customer'

export type Stage =
  | 'sourcing'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected'

export interface AiAssessment {
  score: number
  summary: string
  strengths: string[]
  weaknesses: string[]
}

export type Profile = Omit<Tables['profiles']['Row'], 'role'> & { role: Role }

export type JobStatus = 'open' | 'closed'

export type Job = Omit<Tables['jobs']['Row'], 'status'> & { status: JobStatus }

export type Candidate = Omit<Tables['candidates']['Row'], 'stage' | 'ai_assessment'> & {
  stage: Stage
  ai_assessment: AiAssessment | null
}

export type CandidateNote = Omit<Tables['candidate_notes']['Row'], 'author_role'> & { author_role: Role }

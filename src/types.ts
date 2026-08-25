export type Score = 1 | 2 | 3 | 4
export type Stage = 'pra-observasi' | 'observasi' | 'pasca-observasi'
export type AssessmentStatus = 'draft' | 'selesai'

export interface Teacher {
  id: string
  name: string
  subject: string
  initials: string
  color: string
}

export interface Supervisor {
  id: string
  name: string
  position: string
  active: boolean
}

export interface RubricItem {
  id: string
  number: number
  title: string
  indicator: string
  section: string
}

export interface ScoredResponse {
  score?: Score
  note: string
}

export interface FollowUp {
  aspect: string
  action: string
  owner: string
  dueDate: string
}

export interface Assessment {
  id: string
  teacherId: string
  period: string
  className: string
  subject: string
  topic: string
  observer: string
  observationDate: string
  status: AssessmentStatus
  currentStage: Stage
  preObservation: Record<string, ScoredResponse>
  observation: Record<string, ScoredResponse>
  reflection: Record<string, string>
  feedback: Record<string, { strength: string; development: string }>
  followUps: FollowUp[]
  supervisorNote: string
  recommendation: string
  createdAt: string
  updatedAt: string
}

export type AppPage = 'dashboard' | 'assessment' | 'teachers' | 'supervisors' | 'reports'

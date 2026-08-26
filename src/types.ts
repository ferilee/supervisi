export type Score = 1 | 2 | 3 | 4
export type Stage = 'pra-observasi' | 'observasi' | 'pasca-observasi'
export type AssessmentStatus = 'draft' | 'selesai'
export type UserRole = 'admin' | 'supervisor' | 'guru'

export interface AuthSession {
  userId: string
  username: string
  displayName: string
  role: UserRole
  teacherId?: string
  mustChangePassword: boolean
  backend: 'local' | 'sqlite'
}

export interface Teacher {
  id: string
  legacyId?: string
  name: string
  subject: string
  initials: string
  color: string
  active?: boolean
}

export interface Supervisor {
  id: string
  legacyId?: string
  teacherId?: string
  name: string
  position: string
  active: boolean
}

export interface AppSettings {
  schoolName: string
  defaultPeriod: string
  signatureCity: string
  signatureDetail: string
  supervisorSetupComplete: boolean
  signatureName: string
  signaturePosition: string
  signatureImage: string
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
  legacyId?: string
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

export type AppPage = 'dashboard' | 'assessment' | 'teachers' | 'supervisors' | 'settings' | 'reports'

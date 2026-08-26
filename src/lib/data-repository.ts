import { defaultSettings, getAssessments, getSettings, getSupervisors, getTeachers, saveAssessments, saveSettings, saveSupervisors, saveTeachers } from './storage'
import type { PersistedData } from './migration'
import type { AppSettings, Assessment, Supervisor, Teacher, UserRole } from '../types'

export interface DataSnapshot { teachers: Teacher[]; supervisors: Supervisor[]; assessments: Assessment[]; settings: AppSettings }
export interface MigrationResult { teachersAdded: number; supervisorsAdded: number; assessmentsAdded: number; settingsImported: boolean; skippedAssessments: number; skippedSupervisors: number }
export interface DataRepository {
  readonly backend: 'local' | 'sqlite'
  load(role: UserRole): Promise<DataSnapshot>
  saveTeachers(teachers: Teacher[]): Promise<Teacher[]>
  deleteTeacher(id: string): Promise<void>
  saveSupervisors(supervisors: Supervisor[]): Promise<Supervisor[]>
  saveSettings(settings: AppSettings): Promise<AppSettings>
  saveAssessment(assessment: Assessment): Promise<Assessment>
  migrate(local: PersistedData): Promise<MigrationResult>
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) } })
  const body = await response.json().catch(() => ({})) as { error?: string } & T
  if (!response.ok) throw new Error(body.error || `Permintaan ${path} gagal.`)
  return body
}

function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) }
function teacherPayload(teacher: Teacher) { return { ...(isUuid(teacher.id) ? { id: teacher.id } : {}), legacyId: teacher.legacyId ?? teacher.id, name: teacher.name, subject: teacher.subject, initials: teacher.initials, color: teacher.color, active: teacher.active !== false } }
function supervisorPayload(item: Supervisor) { return { ...(isUuid(item.id) ? { id: item.id } : {}), legacyId: item.legacyId ?? item.id, teacherId: item.teacherId, name: item.name, position: item.position, active: item.active } }
function assessmentPayload(item: Assessment) { return { ...(isUuid(item.id) ? { id: item.id } : {}), legacyId: item.legacyId ?? item.id, teacherId: item.teacherId, period: item.period, className: item.className, subject: item.subject, topic: item.topic, observer: item.observer, observationDate: item.observationDate, status: item.status, currentStage: item.currentStage, preObservation: item.preObservation, observation: item.observation, reflection: item.reflection, feedback: item.feedback, followUps: item.followUps, supervisorNote: item.supervisorNote, recommendation: item.recommendation, createdAt: item.createdAt, updatedAt: item.updatedAt } }

function createLocalRepository(): DataRepository {
  return {
    backend: 'local',
    async load() { return { teachers: getTeachers(), supervisors: getSupervisors(), assessments: getAssessments(), settings: getSettings() } },
    async saveTeachers(next) { saveTeachers(next); return next },
    async deleteTeacher(id) { saveTeachers(getTeachers().filter((teacher) => teacher.id !== id)) },
    async saveSupervisors(next) { saveSupervisors(next); return next },
    async saveSettings(next) { saveSettings(next); return next },
    async saveAssessment(next) { const saved = { ...next, updatedAt: new Date().toISOString() }; saveAssessments([saved, ...getAssessments().filter((item) => item.id !== saved.id)]); return saved },
    async migrate() { return { teachersAdded: 0, supervisorsAdded: 0, assessmentsAdded: 0, settingsImported: false, skippedAssessments: 0, skippedSupervisors: 0 } },
  }
}

function createSqliteRepository(): DataRepository {
  return {
    backend: 'sqlite',
    async load(role) {
      const [teachers, assessments] = await Promise.all([api<Teacher[]>('/teachers'), api<Assessment[]>('/assessments')])
      if (role === 'guru') return { teachers, assessments, supervisors: [], settings: defaultSettings }
      const [supervisors, settings] = await Promise.all([api<Supervisor[]>('/supervisors'), api<AppSettings>('/settings')])
      return { teachers, assessments, supervisors, settings }
    },
    async saveTeachers(next) { const saved: Teacher[] = []; for (const teacher of next) saved.push(await api<Teacher>('/teachers', { method: 'POST', body: JSON.stringify(teacherPayload(teacher)) })); return saved },
    async deleteTeacher(id) { await api(`/teachers/${encodeURIComponent(id)}`, { method: 'DELETE' }) },
    async saveSupervisors(next) { const saved: Supervisor[] = []; for (const item of next) saved.push(await api<Supervisor>('/supervisors', { method: 'POST', body: JSON.stringify(supervisorPayload(item)) })); return saved },
    async saveSettings(next) { return api<AppSettings>('/settings', { method: 'PATCH', body: JSON.stringify(next) }) },
    async saveAssessment(next) { return api<Assessment>('/assessments', { method: 'POST', body: JSON.stringify(assessmentPayload(next)) }) },
    async migrate(local) { return api<MigrationResult>('/admin/migrate-local', { method: 'POST', body: JSON.stringify(local) }) },
  }
}

export function createDataRepository(useLocal = false): DataRepository { return useLocal ? createLocalRepository() : createSqliteRepository() }

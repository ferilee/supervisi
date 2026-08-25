import { defaultSettings, getAssessments, getSettings, getSupervisors, getTeachers, saveAssessments, saveSettings, saveSupervisors, saveTeachers } from './storage'
import { buildMigrationPlan, type PersistedData } from './migration'
import type { AppSettings, Assessment, Supervisor, Teacher, UserRole } from '../types'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface DataSnapshot {
  teachers: Teacher[]
  supervisors: Supervisor[]
  assessments: Assessment[]
  settings: AppSettings
}

export interface MigrationResult {
  teachersAdded: number
  supervisorsAdded: number
  assessmentsAdded: number
  settingsImported: boolean
  skippedAssessments: number
  skippedSupervisors: number
}

export interface DataRepository {
  readonly backend: 'local' | 'supabase'
  load(role: UserRole): Promise<DataSnapshot>
  saveTeachers(teachers: Teacher[]): Promise<Teacher[]>
  deleteTeacher(id: string): Promise<void>
  saveSupervisors(supervisors: Supervisor[]): Promise<Supervisor[]>
  saveSettings(settings: AppSettings): Promise<AppSettings>
  saveAssessment(assessment: Assessment): Promise<Assessment>
  migrate(local: PersistedData): Promise<MigrationResult>
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function errorMessage(error: { message?: string } | null | undefined, fallback: string) {
  return error?.message ? `${fallback}: ${error.message}` : fallback
}

function mapTeacherRow(row: Record<string, unknown>): Teacher {
  return {
    id: String(row.id), legacyId: typeof row.legacy_id === 'string' ? row.legacy_id : undefined,
    name: String(row.name ?? ''), subject: String(row.subject ?? ''), initials: String(row.initials ?? ''), color: String(row.color ?? ''), active: row.active !== false,
  }
}

function mapSupervisorRow(row: Record<string, unknown>): Supervisor {
  return {
    id: String(row.id), legacyId: typeof row.legacy_id === 'string' ? row.legacy_id : undefined,
    teacherId: typeof row.teacher_id === 'string' ? row.teacher_id : undefined,
    name: String(row.name ?? ''), position: String(row.position ?? ''), active: row.active !== false,
  }
}

function mapAssessmentRow(row: Record<string, unknown>): Assessment {
  return {
    id: String(row.id), legacyId: typeof row.legacy_id === 'string' ? row.legacy_id : undefined,
    teacherId: String(row.teacher_id ?? ''), period: String(row.period ?? ''), className: String(row.class_name ?? ''), subject: String(row.subject ?? ''), topic: String(row.topic ?? ''), observer: String(row.observer ?? ''), observationDate: String(row.observation_date ?? ''),
    status: row.status === 'selesai' ? 'selesai' : 'draft', currentStage: row.current_stage === 'observasi' || row.current_stage === 'pasca-observasi' ? row.current_stage : 'pra-observasi',
    preObservation: (row.pre_observation ?? {}) as Assessment['preObservation'], observation: (row.observation ?? {}) as Assessment['observation'], reflection: (row.reflection ?? {}) as Assessment['reflection'], feedback: (row.feedback ?? {}) as Assessment['feedback'], followUps: (row.follow_ups ?? []) as Assessment['followUps'], supervisorNote: String(row.supervisor_note ?? ''), recommendation: String(row.recommendation ?? ''), createdAt: String(row.created_at ?? ''), updatedAt: String(row.updated_at ?? ''),
  }
}

function teacherRow(teacher: Teacher) {
  return { ...(isUuid(teacher.id) ? { id: teacher.id } : {}), legacy_id: teacher.legacyId ?? (isUuid(teacher.id) ? null : teacher.id), name: teacher.name, subject: teacher.subject, initials: teacher.initials, color: teacher.color, active: teacher.active !== false }
}

function supervisorRow(supervisor: Supervisor) {
  return { ...(isUuid(supervisor.id) ? { id: supervisor.id } : {}), legacy_id: supervisor.legacyId ?? (isUuid(supervisor.id) ? null : supervisor.id), teacher_id: supervisor.teacherId ?? null, name: supervisor.name, position: supervisor.position, active: supervisor.active }
}

function assessmentRow(assessment: Assessment) {
  return { ...(isUuid(assessment.id) ? { id: assessment.id } : {}), legacy_id: assessment.legacyId ?? (isUuid(assessment.id) ? null : assessment.id), teacher_id: assessment.teacherId || null, period: assessment.period, class_name: assessment.className, subject: assessment.subject, topic: assessment.topic, observer: assessment.observer, observation_date: assessment.observationDate || null, status: assessment.status, current_stage: assessment.currentStage, pre_observation: assessment.preObservation, observation: assessment.observation, reflection: assessment.reflection, feedback: assessment.feedback, follow_ups: assessment.followUps, supervisor_note: assessment.supervisorNote, recommendation: assessment.recommendation }
}

function createLocalRepository(): DataRepository {
  return {
    backend: 'local',
    async load() { return { teachers: getTeachers(), supervisors: getSupervisors(), assessments: getAssessments(), settings: getSettings() } },
    async saveTeachers(next) { saveTeachers(next); return next },
    async deleteTeacher(id) { saveTeachers(getTeachers().filter((teacher) => teacher.id !== id)) },
    async saveSupervisors(next) { saveSupervisors(next); return next },
    async saveSettings(next) { saveSettings(next); return next },
    async saveAssessment(next) { const current = getAssessments(); const saved = { ...next, updatedAt: new Date().toISOString() }; saveAssessments([saved, ...current.filter((item) => item.id !== saved.id)]); return saved },
    async migrate() { return { teachersAdded: 0, supervisorsAdded: 0, assessmentsAdded: 0, settingsImported: false, skippedAssessments: 0, skippedSupervisors: 0 } },
  }
}

function createSupabaseRepository(client: SupabaseClient): DataRepository {
  async function saveRow(table: string, row: Record<string, unknown>, conflict: 'id' | 'legacy_id') {
    const { data, error } = await client.from(table).upsert(row, { onConflict: conflict }).select('*').single()
    if (error || !data) throw new Error(errorMessage(error, `Data ${table} gagal disimpan`))
    return data as Record<string, unknown>
  }

  return {
    backend: 'supabase',
    async load(role) {
      const teachersPromise = client.from('teachers').select('*').order('name')
      const assessmentsPromise = client.from('assessments').select('*').order('updated_at', { ascending: false })
      const [teachersResult, assessmentsResult] = await Promise.all([teachersPromise, assessmentsPromise])
      if (teachersResult.error) throw new Error(errorMessage(teachersResult.error, 'Daftar guru gagal dimuat'))
      if (assessmentsResult.error) throw new Error(errorMessage(assessmentsResult.error, 'Penilaian gagal dimuat'))

      let supervisors: Supervisor[] = []
      let settings = defaultSettings
      if (role !== 'guru') {
        const [supervisorResult, settingsResult] = await Promise.all([
          client.from('supervisors').select('*').order('name'),
          client.from('school_settings').select('*').eq('id', true).maybeSingle(),
        ])
        if (supervisorResult.error) throw new Error(errorMessage(supervisorResult.error, 'Daftar supervisor gagal dimuat'))
        if (settingsResult.error) throw new Error(errorMessage(settingsResult.error, 'Pengaturan sekolah gagal dimuat'))
        supervisors = (supervisorResult.data ?? []).map((row) => mapSupervisorRow(row as Record<string, unknown>))
        if (settingsResult.data) settings = { ...defaultSettings, schoolName: String(settingsResult.data.school_name ?? defaultSettings.schoolName), defaultPeriod: String(settingsResult.data.default_period ?? defaultSettings.defaultPeriod), signatureCity: String(settingsResult.data.signature_city ?? defaultSettings.signatureCity), signatureDetail: String(settingsResult.data.signature_detail ?? defaultSettings.signatureDetail), signatureName: String(settingsResult.data.signature_name ?? ''), signaturePosition: String(settingsResult.data.signature_position ?? ''), signatureImage: String(settingsResult.data.signature_image ?? '') }
      }
      return { teachers: (teachersResult.data ?? []).map((row) => mapTeacherRow(row as Record<string, unknown>)), supervisors, assessments: (assessmentsResult.data ?? []).map((row) => mapAssessmentRow(row as Record<string, unknown>)), settings: { ...settings, supervisorSetupComplete: settings.supervisorSetupComplete || supervisors.some((item) => item.active) } }
    },
    async saveTeachers(next) {
      const saved: Teacher[] = []
      for (const teacher of next) {
        const row = await saveRow('teachers', teacherRow(teacher), isUuid(teacher.id) ? 'id' : 'legacy_id')
        saved.push(mapTeacherRow(row))
      }
      return saved
    },
    async deleteTeacher(id) {
      if (!isUuid(id)) return
      const { error } = await client.from('teachers').delete().eq('id', id)
      if (error) throw new Error(errorMessage(error, 'Guru gagal dihapus'))
    },
    async saveSupervisors(next) {
      const saved: Supervisor[] = []
      for (const supervisor of next) {
        const row = await saveRow('supervisors', supervisorRow(supervisor), isUuid(supervisor.id) ? 'id' : 'legacy_id')
        saved.push(mapSupervisorRow(row))
      }
      return saved
    },
    async saveSettings(next) {
      const { data, error } = await client.from('school_settings').upsert({ id: true, school_name: next.schoolName, default_period: next.defaultPeriod, signature_city: next.signatureCity, signature_detail: next.signatureDetail, signature_name: next.signatureName, signature_position: next.signaturePosition, signature_image: next.signatureImage }).select('*').single()
      if (error || !data) throw new Error(errorMessage(error, 'Pengaturan gagal disimpan'))
      return { ...next, supervisorSetupComplete: true }
    },
    async saveAssessment(next) {
      const row = await saveRow('assessments', assessmentRow(next), isUuid(next.id) ? 'id' : 'legacy_id')
      return mapAssessmentRow(row)
    },
    async migrate(local) {
      const remote = await this.load('admin')
      const { data: storedSettings, error: settingsError } = await client.from('school_settings').select('id').eq('id', true).maybeSingle()
      if (settingsError) throw new Error(errorMessage(settingsError, 'Status pengaturan gagal diperiksa'))
      const plan = buildMigrationPlan(local, { ...remote, settings: storedSettings ? remote.settings : null })
      const insertedTeachers = await this.saveTeachers(plan.teachers)
      const teacherIdMap = { ...plan.teacherIdMap }
      plan.teachers.forEach((teacher, index) => { const saved = insertedTeachers[index]; if (saved) teacherIdMap[teacher.id] = saved.id })
      const insertedSupervisors = await this.saveSupervisors(plan.supervisors.map((item) => ({ ...item, teacherId: item.teacherId ? (teacherIdMap[item.teacherId] ?? item.teacherId) : undefined })))
      let assessmentsAdded = 0
      for (const assessment of plan.assessments) { await this.saveAssessment({ ...assessment, teacherId: teacherIdMap[assessment.teacherId] ?? assessment.teacherId }); assessmentsAdded += 1 }
      let settingsImported = false
      if (plan.settings) { await this.saveSettings(plan.settings); settingsImported = true }
      return { teachersAdded: insertedTeachers.length, supervisorsAdded: insertedSupervisors.length, assessmentsAdded, settingsImported, skippedAssessments: plan.skippedAssessments, skippedSupervisors: plan.skippedSupervisors }
    },
  }
}

export function createDataRepository(client: SupabaseClient | null): DataRepository {
  return client ? createSupabaseRepository(client) : createLocalRepository()
}

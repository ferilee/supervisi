import type { AppSettings, Assessment, Supervisor, Teacher } from '../types'
import type { PersistedData } from './migration'

const ASSESSMENTS_KEY = 'supervisi-assessments-v1'
const TEACHERS_KEY = 'supervisi-teachers-v1'
const SUPERVISORS_KEY = 'supervisi-supervisors-v1'
const SETTINGS_KEY = 'supervisi-settings-v1'
export const LOCAL_MIGRATION_KEY = 'supervisi-local-migration-v1'

export const defaultTeachers: Teacher[] = []

export const defaultSupervisors: Supervisor[] = [
  { id: 's-1', name: 'Kepala Sekolah', position: 'Kepala Sekolah', active: true },
]

export const defaultSettings: AppSettings = {
  schoolName: 'SMKN Pasirian',
  defaultPeriod: '2026',
  signatureCity: 'Pasirian',
  signatureDetail: 'Kepala Sekolah & Pendamping Sekolah',
  supervisorSetupComplete: false,
  signatureName: '',
  signaturePosition: '',
  signatureImage: '',
}

function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

export function getTeachers() {
  return read<Teacher[]>(TEACHERS_KEY, defaultTeachers).map((teacher) => ({ ...teacher, active: teacher.active !== false }))
}

export function saveTeachers(teachers: Teacher[]) {
  localStorage.setItem(TEACHERS_KEY, JSON.stringify(teachers))
}

export function getSupervisors() {
  return read<Supervisor[]>(SUPERVISORS_KEY, defaultSupervisors)
}

export function saveSupervisors(supervisors: Supervisor[]) {
  localStorage.setItem(SUPERVISORS_KEY, JSON.stringify(supervisors))
}

export function getSettings() {
  return { ...defaultSettings, ...read<Partial<AppSettings>>(SETTINGS_KEY, {}) }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function getAssessments() {
  return read<Assessment[]>(ASSESSMENTS_KEY, [])
}

export function saveAssessments(assessments: Assessment[]) {
  localStorage.setItem(ASSESSMENTS_KEY, JSON.stringify(assessments))
}

export function hasLocalData() {
  return [TEACHERS_KEY, SUPERVISORS_KEY, SETTINGS_KEY, ASSESSMENTS_KEY].some((key) => Boolean(localStorage.getItem(key)))
}

export function hasCompletedLocalMigration() {
  return localStorage.getItem(LOCAL_MIGRATION_KEY) === 'completed'
}

export function markLocalMigrationCompleted() {
  localStorage.setItem(LOCAL_MIGRATION_KEY, 'completed')
}

export function getLocalDataSnapshot(): PersistedData {
  return {
    teachers: getTeachers(),
    supervisors: getSupervisors(),
    assessments: getAssessments(),
    settings: localStorage.getItem(SETTINGS_KEY) ? getSettings() : null,
  }
}

export function makeId() {
  return `assessment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

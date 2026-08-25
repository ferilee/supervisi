import type { AppSettings, Assessment, Supervisor, Teacher } from '../types'

const ASSESSMENTS_KEY = 'supervisi-assessments-v1'
const TEACHERS_KEY = 'supervisi-teachers-v1'
const SUPERVISORS_KEY = 'supervisi-supervisors-v1'
const SETTINGS_KEY = 'supervisi-settings-v1'

export const defaultTeachers: Teacher[] = [
  { id: 't-1', name: 'Siti Rahmawati, S.Pd.', subject: 'Bahasa Indonesia', initials: 'SR', color: '#b9e3d5' },
  { id: 't-2', name: 'Budi Santoso, S.Kom.', subject: 'Informatika', initials: 'BS', color: '#c7d8f8' },
  { id: 't-3', name: 'Dewi Lestari, S.Pd.', subject: 'Matematika', initials: 'DL', color: '#f7d7b4' },
  { id: 't-4', name: 'Ahmad Fauzan, S.Pd.', subject: 'Teknik Pemesinan', initials: 'AF', color: '#e7c5ed' },
]

export const defaultSupervisors: Supervisor[] = [
  { id: 's-1', name: 'Kepala Sekolah', position: 'Kepala Sekolah', active: true },
]

export const defaultSettings: AppSettings = {
  schoolName: 'SMKN Pasirian',
  defaultPeriod: '2026',
  signatureCity: 'Pasirian',
  signatureDetail: 'Kepala Sekolah & Pendamping Sekolah',
  supervisorSetupComplete: false,
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
  return read<Teacher[]>(TEACHERS_KEY, defaultTeachers)
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

export function makeId() {
  return `assessment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

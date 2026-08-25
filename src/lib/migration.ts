import type { AppSettings, Assessment, Supervisor, Teacher } from '../types'

export interface PersistedData {
  teachers: Teacher[]
  supervisors: Supervisor[]
  assessments: Assessment[]
  settings: AppSettings | null
}

export interface MigrationPlan {
  teacherIdMap: Record<string, string>
  teachers: Teacher[]
  supervisors: Supervisor[]
  assessments: Assessment[]
  settings?: AppSettings
  skippedAssessments: number
  skippedSupervisors: number
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('id-ID')
}

function findByLegacyOrName<T extends { id: string; legacyId?: string; name: string }>(items: T[], candidate: T) {
  return items.find((item) => item.legacyId === candidate.id) ?? items.find((item) => normalize(item.name) === normalize(candidate.name))
}

export function buildMigrationPlan(local: PersistedData, remote: PersistedData): MigrationPlan {
  const teacherIdMap: Record<string, string> = {}
  const teachers: Teacher[] = []

  local.teachers.forEach((teacher) => {
    const existing = findByLegacyOrName(remote.teachers, teacher)
    if (existing) teacherIdMap[teacher.id] = existing.id
    else teachers.push({ ...teacher, legacyId: teacher.legacyId ?? teacher.id })
  })

  const supervisors: Supervisor[] = []
  let skippedSupervisors = 0
  local.supervisors.forEach((item) => {
    const existing = findByLegacyOrName(remote.supervisors, item)
    if (existing) skippedSupervisors += 1
    else supervisors.push({ ...item, legacyId: item.legacyId ?? item.id, teacherId: item.teacherId ? (teacherIdMap[item.teacherId] ?? item.teacherId) : undefined })
  })

  const knownAssessmentIds = new Set(remote.assessments.map((item) => item.legacyId).filter(Boolean))
  const assessments: Assessment[] = []
  let skippedAssessments = 0
  local.assessments.forEach((item) => {
    if (knownAssessmentIds.has(item.legacyId ?? item.id)) {
      skippedAssessments += 1
      return
    }
    const teacherId = teacherIdMap[item.teacherId] ?? (remote.teachers.some((teacher) => teacher.id === item.teacherId) ? item.teacherId : '')
    if (item.teacherId && !teacherId) {
      skippedAssessments += 1
      return
    }
    assessments.push({ ...item, legacyId: item.legacyId ?? item.id, teacherId })
  })

  return {
    teacherIdMap,
    teachers,
    supervisors,
    assessments,
    settings: remote.settings ? undefined : local.settings ?? undefined,
    skippedAssessments,
    skippedSupervisors,
  }
}

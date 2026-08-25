import { describe, expect, it } from 'vitest'
import { buildMigrationPlan } from './migration'
import type { AppSettings, Assessment, Supervisor, Teacher } from '../types'

const settings: AppSettings = {
  schoolName: 'SMKN Pasirian', defaultPeriod: '2026', signatureCity: 'Pasirian',
  signatureDetail: 'Kepala Sekolah & Pendamping Sekolah', supervisorSetupComplete: false,
  signatureName: '', signaturePosition: '', signatureImage: '',
}

const teacher = (id: string, name: string): Teacher => ({ id, name, subject: 'Informatika', initials: 'AS', color: '#fff', active: true })
const supervisor = (id: string, name: string): Supervisor => ({ id, name, position: 'Supervisor', active: true })
const assessment = (id: string, teacherId: string): Assessment => ({
  id, teacherId, period: '2026', className: 'XI', subject: 'Informatika', topic: 'Jaringan', observer: 'Ayu', observationDate: '2026-08-26',
  status: 'draft', currentStage: 'pra-observasi', preObservation: {}, observation: {}, reflection: {}, feedback: {}, followUps: [], supervisorNote: '', recommendation: '',
  createdAt: '2026-08-26T00:00:00.000Z', updatedAt: '2026-08-26T00:00:00.000Z',
})

describe('buildMigrationPlan', () => {
  it('memetakan guru lokal ke ID server dan menyiapkan penilaian dengan relasi baru', () => {
    const plan = buildMigrationPlan({ teachers: [teacher('local-1', 'Ayu Sari')], supervisors: [], assessments: [assessment('local-a', 'local-1')], settings }, {
      teachers: [teacher('remote-1', 'ayu sari')], supervisors: [], assessments: [], settings,
    })

    expect(plan.teacherIdMap).toEqual({ 'local-1': 'remote-1' })
    expect(plan.teachers).toHaveLength(0)
    expect(plan.assessments[0]?.teacherId).toBe('remote-1')
    expect(plan.assessments[0]?.legacyId).toBe('local-a')
  })

  it('mempertahankan data server saat guru lokal memiliki nama yang sama', () => {
    const plan = buildMigrationPlan({ teachers: [teacher('local-1', 'Ayu Sari')], supervisors: [supervisor('local-s-1', 'Budi')], assessments: [], settings }, {
      teachers: [teacher('remote-1', 'Ayu Sari')], supervisors: [supervisor('remote-s-1', 'Budi')], assessments: [], settings,
    })

    expect(plan.teachers).toHaveLength(0)
    expect(plan.supervisors).toHaveLength(0)
    expect(plan.skippedSupervisors).toBe(1)
  })
})

import { describe, expect, it, vi } from 'vitest'
import { createDataRepository } from './data-repository'

describe('SQLite HTTP data repository', () => {
  it('memuat data dari API backend', async () => {
    const responses: Record<string, unknown> = {
      '/api/teachers': [{ id: 'teacher-remote', name: 'Ayu Sari', subject: 'Informatika', initials: 'AS', color: '#fff', active: true }],
      '/api/assessments': [{ id: 'assessment-remote', teacherId: 'teacher-remote', period: '2026', status: 'draft', currentStage: 'pra-observasi' }],
      '/api/supervisors': [{ id: 'supervisor-remote', name: 'Budi', position: 'Kepala Sekolah', active: true }],
      '/api/settings': { schoolName: 'SMKN Pasirian' },
    }
    vi.stubGlobal('fetch', vi.fn(async (input: string) => ({ ok: true, json: async () => responses[input] })))
    const data = await createDataRepository().load('admin')
    expect(data.teachers[0]?.name).toBe('Ayu Sari')
    expect(data.assessments[0]?.teacherId).toBe('teacher-remote')
    expect(data.supervisors[0]?.name).toBe('Budi')
    expect(data.settings.schoolName).toBe('SMKN Pasirian')
    vi.unstubAllGlobals()
  })
})

import { describe, expect, it } from 'vitest'
import { createDataRepository } from './data-repository'
import type { SupabaseClient } from '@supabase/supabase-js'

function clientFor(rows: Record<string, unknown[]>) {
  return {
    from(table: string) {
      const result = { data: rows[table] ?? [], error: null }
      const chain = {
        select: () => chain,
        order: () => Promise.resolve(result),
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: (rows[table] ?? [])[0] ?? null, error: null }) }),
      }
      return chain
    },
  } as unknown as SupabaseClient
}

describe('Supabase data repository', () => {
  it('memuat daftar guru dan penilaian dari backend, bukan localStorage', async () => {
    const repository = createDataRepository(clientFor({
      teachers: [{ id: 'teacher-remote', name: 'Ayu Sari', subject: 'Informatika', initials: 'AS', color: '#fff', active: true }],
      assessments: [{ id: 'assessment-remote', teacher_id: 'teacher-remote', period: '2026', status: 'draft', current_stage: 'pra-observasi' }],
      supervisors: [{ id: 'supervisor-remote', name: 'Budi', position: 'Kepala Sekolah', active: true }],
      school_settings: [{ id: true, school_name: 'SMKN Pasirian' }],
    }))

    const data = await repository.load('admin')

    expect(data.teachers[0]?.name).toBe('Ayu Sari')
    expect(data.assessments[0]?.teacherId).toBe('teacher-remote')
    expect(data.supervisors[0]?.name).toBe('Budi')
    expect(data.settings.schoolName).toBe('SMKN Pasirian')
  })
})

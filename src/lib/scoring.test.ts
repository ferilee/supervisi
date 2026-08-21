import { describe, expect, it } from 'vitest'
import { averageScore, completedCount, totalScore } from './scoring'
import type { RubricItem } from '../types'

const items: RubricItem[] = [
  { id: 'a', number: 1, title: 'A', indicator: '', section: 'S' },
  { id: 'b', number: 2, title: 'B', indicator: '', section: 'S' },
  { id: 'c', number: 3, title: 'C', indicator: '', section: 'S' },
]

describe('scoring helpers', () => {
  it('menghitung jumlah butir yang sudah dinilai', () => {
    expect(completedCount(items, { a: { score: 4, note: '' }, c: { score: 2, note: '' } })).toBe(2)
  })

  it('mengabaikan butir yang belum memiliki skor pada total', () => {
    expect(totalScore(items, { a: { score: 4, note: '' }, b: { note: 'belum selesai' } })).toBe(4)
  })

  it('menghitung rata-rata hanya dari butir yang sudah dinilai', () => {
    expect(averageScore(items, { a: { score: 4, note: '' }, c: { score: 2, note: '' } })).toBe(3)
    expect(averageScore(items, {})).toBe(0)
  })
})

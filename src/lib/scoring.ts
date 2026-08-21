import type { RubricItem, ScoredResponse, Score } from '../types'

export function totalScore(items: RubricItem[], responses: Record<string, ScoredResponse>) {
  return items.reduce((total, item) => total + (responses[item.id]?.score ?? 0), 0)
}

export function completedCount(items: RubricItem[], responses: Record<string, ScoredResponse>) {
  return items.filter((item) => responses[item.id]?.score !== undefined).length
}

export function averageScore(items: RubricItem[], responses: Record<string, ScoredResponse>) {
  const completed = completedCount(items, responses)
  return completed === 0 ? 0 : totalScore(items, responses) / completed
}

export function setScore(response: ScoredResponse | undefined, score: Score): ScoredResponse {
  return { note: response?.note ?? '', score }
}

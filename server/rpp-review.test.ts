import { describe, expect, it, vi } from 'vitest'
import { analyzeRpp, normalizeReview, OpenAICompatibleRppAnalyzer } from './rpp-review.js'
import { preObservationItems } from '../src/data/instrument.js'

describe('RPP AI review module', () => {
  it('mengembalikan tepat satu hasil untuk setiap butir instrumen', () => {
    const result = normalizeReview({
      summary: 'Identitas dan tujuan ditemukan.',
      items: [{ itemId: 'pre-1', status: 'terpenuhi', suggestedScore: 4, evidence: 'Mata pelajaran Informatika', pageNumber: 2, rationale: 'Identitas lengkap.', confidence: 'tinggi' }],
    })

    expect(result.items).toHaveLength(preObservationItems.length)
    expect(result.items[0]).toMatchObject({ itemId: 'pre-1', status: 'terpenuhi', suggestedScore: 4, pageNumber: 2 })
    expect(result.items.at(-1)?.status).toBe('belum-ditemukan')
  })

  it('menolak status, skor, dan keyakinan yang tidak valid dengan default aman', () => {
    const result = normalizeReview({ items: [{ itemId: 'pre-1', status: 'mengarang', suggestedScore: 9, confidence: 'pasti' }] })
    expect(result.items[0]).toMatchObject({ status: 'belum-ditemukan', confidence: 'rendah' })
    expect(result.items[0]?.suggestedScore).toBeUndefined()
  })

  it('mengubah respons provider AI menjadi hasil telaah ber-ID instrumen', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ summary: 'Ringkasan', items: [{ itemId: 'pre-1', status: 'sebagian', suggestedScore: 3, evidence: 'Tujuan pembelajaran', pageNumber: 1, rationale: 'Sebagian indikator tampak.', confidence: 'sedang' }] }) } }] }) }))
    vi.stubGlobal('fetch', fetchMock)
    const review = await analyzeRpp(new OpenAICompatibleRppAnalyzer({ apiKey: 'test-key', url: 'http://ai.test', model: 'test-model' }), { filename: 'rpp.pdf', pages: [{ pageNumber: 1, text: 'Tujuan pembelajaran' }], assessmentContext: { subject: 'Informatika', className: 'XI', topic: 'Jaringan' } })
    expect(review.items).toHaveLength(preObservationItems.length)
    expect(review.items[0]).toMatchObject({ status: 'sebagian', suggestedScore: 3, evidence: 'Tujuan pembelajaran' })
    expect(review.provider).toBe('openai-compatible')
    const requestInit = (fetchMock.mock.calls[0] as unknown[] | undefined)?.[1] as { body?: string } | undefined
    const request = JSON.parse(String(requestInit?.body)) as { messages: Array<{ content: string }> }
    expect(request.messages[1]?.content).toContain('REFERENSI SEKOLAH')
    expect(request.messages[1]?.content).toContain('PANDUAN FORMAT PERENCANAAN PEMBELAJARAN MENDALAM')
    vi.unstubAllGlobals()
  })
})

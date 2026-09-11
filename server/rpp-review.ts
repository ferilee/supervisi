import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PDFParse } from 'pdf-parse'
import { preObservationItems } from '../src/data/instrument.js'
import type { RppReview, RppReviewConfidence, RppReviewItem, RppReviewStatus, Score } from '../src/types.js'

export type ExtractedRpp = { text: string; pages: Array<{ pageNumber: number; text: string }> }

export interface RppAnalyzer {
  readonly provider: string
  readonly model: string
  analyze(input: { filename: string; pages: ExtractedRpp['pages']; assessmentContext: { subject: string; className: string; topic: string } }): Promise<Pick<RppReview, 'summary' | 'items'>>
}

const maxDocumentChars = Number(process.env.AI_MAX_DOCUMENT_CHARS || 120_000)
const referenceFiles = [
  'panduan_perencanaan_pembelajaran_pm.md',
  'instrumen-praobservasi.md',
  'instrumen-observasi.md',
  'instrumen-pascaobservasi.md',
] as const

function loadSchoolReferences() {
  const referenceDir = process.env.RPP_REFERENCE_DIR || path.resolve(process.cwd(), 'docs')
  return referenceFiles.map((filename) => {
    try {
      return `=== ${filename} ===\n${readFileSync(path.join(referenceDir, filename), 'utf8')}`
    } catch {
      return ''
    }
  }).filter(Boolean).join('\n\n').slice(0, 30_000)
}

export async function extractRppText(buffer: Buffer): Promise<ExtractedRpp> {
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    const pages = result.pages.map((page) => ({ pageNumber: page.num, text: page.text.trim() })).filter((page) => page.text)
    const text = pages.map((page) => `--- HALAMAN ${page.pageNumber} ---\n${page.text}`).join('\n\n')
    if (text.replace(/\s/g, '').length < 80) throw new Error('PDF tidak memiliki lapisan teks yang cukup. Unggah PDF yang dapat diseleksi teksnya; dukungan OCR akan ditambahkan pada tahap berikutnya.')
    return { text: text.slice(0, maxDocumentChars), pages }
  } finally {
    await parser.destroy()
  }
}

function score(value: unknown): Score | undefined { return value === 1 || value === 2 || value === 3 || value === 4 ? value : undefined }
function status(value: unknown): RppReviewStatus { return value === 'terpenuhi' || value === 'sebagian' ? value : 'belum-ditemukan' }
function confidence(value: unknown): RppReviewConfidence { return value === 'tinggi' || value === 'sedang' ? value : 'rendah' }

export function normalizeReview(raw: unknown): Pick<RppReview, 'summary' | 'items'> {
  const input = raw && typeof raw === 'object' ? raw as { summary?: unknown; items?: unknown } : {}
  const values = Array.isArray(input.items) ? input.items : []
  const byId = new Map(values.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')).map((item) => [String(item.itemId ?? ''), item]))
  const items: RppReviewItem[] = preObservationItems.map((rubric) => {
    const item = byId.get(rubric.id)
    return {
      itemId: rubric.id,
      status: status(item?.status),
      suggestedScore: score(item?.suggestedScore),
      evidence: typeof item?.evidence === 'string' ? item.evidence.slice(0, 1200) : '',
      pageNumber: typeof item?.pageNumber === 'number' && item.pageNumber > 0 ? Math.floor(item.pageNumber) : undefined,
      rationale: typeof item?.rationale === 'string' ? item.rationale.slice(0, 1600) : 'Bukti belum diberikan oleh AI.',
      confidence: confidence(item?.confidence),
    }
  })
  return { summary: typeof input.summary === 'string' ? input.summary.slice(0, 3000) : 'Analisis selesai. Periksa setiap bukti sebelum menyetujui skor.', items }
}

function extractJson(content: unknown) {
  const text = typeof content === 'string' ? content : JSON.stringify(content ?? {})
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1] ?? text
  try { return JSON.parse(fenced) } catch { throw new Error('Respons AI tidak berformat JSON yang valid.') }
}

export class OpenAICompatibleRppAnalyzer implements RppAnalyzer {
  readonly provider = 'openai-compatible'
  readonly model: string
  private readonly url: string
  private readonly apiKey: string

  constructor(options: { url?: string; apiKey?: string; model?: string } = {}) {
    this.url = options.url || process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions'
    this.apiKey = options.apiKey || process.env.AI_API_KEY || ''
    this.model = options.model || process.env.AI_MODEL || 'gpt-4o-mini'
  }

  async analyze(input: { filename: string; pages: ExtractedRpp['pages']; assessmentContext: { subject: string; className: string; topic: string } }): Promise<Pick<RppReview, 'summary' | 'items'>> {
    if (!this.apiKey) throw new Error('AI belum dikonfigurasi. Isi AI_API_KEY pada environment backend.')
    const rubric = preObservationItems.map((item) => ({ itemId: item.id, number: item.number, title: item.title, indicator: item.indicator })).map((item) => JSON.stringify(item)).join('\n')
    const document = input.pages.map((page) => `HALAMAN ${page.pageNumber}:\n${page.text}`).join('\n\n').slice(0, maxDocumentChars)
    const references = loadSchoolReferences()
    const system = `Anda adalah asisten telaah RPP/Modul Ajar untuk supervisor sekolah. Gunakan REFERENSI SEKOLAH sebagai pedoman interpretasi Pembelajaran Mendalam dan instrumen, tetapi nilai hanya berdasarkan isi DOKUMEN RPP. Jangan mengarang bukti. Jika bukti tidak ditemukan, gunakan status "belum-ditemukan", evidence kosong, pageNumber kosong, confidence rendah. "sebagian" berarti indikator hanya didukung sebagian. suggestedScore memakai skala 1-4 sebagai SARAN, bukan keputusan final. Kembalikan JSON valid tanpa markdown dengan bentuk {"summary":"...","items":[{"itemId":"pre-1","status":"terpenuhi|sebagian|belum-ditemukan","suggestedScore":1,"evidence":"kutipan singkat","pageNumber":1,"rationale":"...","confidence":"tinggi|sedang|rendah"}]}. Wajib mengembalikan semua item instrumen tepat satu kali.`
    const user = `Nama berkas: ${input.filename}\nKonteks penilaian: mata pelajaran=${input.assessmentContext.subject || '-'}, kelas=${input.assessmentContext.className || '-'}, materi=${input.assessmentContext.topic || '-'}\n\nINSTRUMEN PRA-OBSERVASI YANG DINILAI:\n${rubric}\n\nREFERENSI SEKOLAH:\n${references || 'Referensi sekolah tidak tersedia; gunakan instrumen yang diberikan.'}\n\nDOKUMEN RPP:\n${document}`
    const response = await fetch(this.url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` }, body: JSON.stringify({ model: this.model, temperature: 0.1, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }) })
    const payload = await response.json().catch(() => ({})) as { error?: { message?: string }; choices?: Array<{ message?: { content?: unknown } }> }
    if (!response.ok) throw new Error(payload.error?.message || `Layanan AI gagal (${response.status}).`)
    return normalizeReview(extractJson(payload.choices?.[0]?.message?.content))
  }
}

export async function analyzeRpp(analyzer: RppAnalyzer, input: { filename: string; pages: ExtractedRpp['pages']; assessmentContext: { subject: string; className: string; topic: string } }): Promise<RppReview> {
  const result = normalizeReview(await analyzer.analyze(input))
  return { id: randomUUID(), analyzedAt: new Date().toISOString(), provider: analyzer.provider, model: analyzer.model, ...result }
}

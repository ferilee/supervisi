import { useMemo, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BarChart3, Bell, BookOpenCheck, Check, ChevronDown, ClipboardCheck,
  FileDown, FileText, LayoutDashboard, Menu, MoreHorizontal, Plus, Search, Settings2, ShieldCheck,
  Sparkles, Users, X,
} from 'lucide-react'
import { feedbackAspects, followUpAspects, observationItems, preObservationItems, reflectionQuestions, scoreLabels } from './data/instrument'
import { averageScore, completedCount, totalScore } from './lib/scoring'
import { getAssessments, getTeachers, makeId, saveAssessments } from './lib/storage'
import type { AppPage, Assessment, RubricItem, ScoredResponse, Score, Stage, Teacher } from './types'

const steps: Array<{ id: Stage; label: string; short: string }> = [
  { id: 'pra-observasi', label: 'Pra-observasi', short: 'RPP / Modul Ajar' },
  { id: 'observasi', label: 'Observasi', short: 'Praktik di Kelas' },
  { id: 'pasca-observasi', label: 'Pasca-observasi', short: 'Refleksi & Tindak Lanjut' },
]

const freshAssessment = (teacherId = ''): Assessment => ({
  id: makeId(), teacherId, period: '2026', className: '', subject: '', topic: '', observer: 'Kepala Sekolah', observationDate: new Date().toISOString().slice(0, 10),
  status: 'draft', currentStage: 'pra-observasi', preObservation: {}, observation: {}, reflection: {}, feedback: {},
  followUps: followUpAspects.map((aspect) => ({ aspect, action: '', owner: '', dueDate: '' })), supervisorNote: '', recommendation: '',
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
})

function App() {
  const [page, setPage] = useState<AppPage>('dashboard')
  const [mobileNav, setMobileNav] = useState(false)
  const [teachers] = useState<Teacher[]>(() => getTeachers())
  const [assessments, setAssessments] = useState<Assessment[]>(() => getAssessments())
  const [active, setActive] = useState<Assessment | null>(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')

  const persistAssessment = (next: Assessment, message = 'Perubahan tersimpan') => {
    const updated = { ...next, updatedAt: new Date().toISOString() }
    const nextList = [updated, ...assessments.filter((item) => item.id !== updated.id)]
    setAssessments(nextList)
    saveAssessments(nextList)
    setActive(updated)
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const startAssessment = () => {
    setActive(freshAssessment())
    setPage('assessment')
  }

  const editAssessment = (assessment: Assessment) => {
    setActive(assessment)
    setPage('assessment')
  }

  const navigate = (nextPage: AppPage) => {
    setPage(nextPage)
    setMobileNav(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'is-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={21} /></div>
          <div><strong>supervisi</strong><span>SMKN Pasirian</span></div>
        </div>
        <div className="sidebar-label">Ruang kerja</div>
        <nav>
          <NavItem icon={<LayoutDashboard size={18} />} label="Ringkasan" active={page === 'dashboard'} onClick={() => navigate('dashboard')} />
          <NavItem icon={<ClipboardCheck size={18} />} label="Penilaian" active={page === 'assessment'} onClick={() => navigate('assessment')} />
          <NavItem icon={<Users size={18} />} label="Daftar guru" active={page === 'teachers'} onClick={() => navigate('teachers')} />
          <NavItem icon={<BarChart3 size={18} />} label="Laporan" active={page === 'reports'} onClick={() => navigate('reports')} />
        </nav>
        <div className="sidebar-spacer" />
        <div className="help-card"><Sparkles size={18} /><strong>Ruang refleksi</strong><span>Supervisi adalah percakapan untuk tumbuh bersama.</span></div>
        <div className="sidebar-footer"><Settings2 size={17} /><span>Pengaturan</span></div>
      </aside>
      {mobileNav && <button className="mobile-overlay" onClick={() => setMobileNav(false)} aria-label="Tutup menu" />}
      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Buka menu"><Menu size={22} /></button>
          <div className="breadcrumbs"><span>SMKN Pasirian</span><span className="slash">/</span><strong>{page === 'dashboard' ? 'Ringkasan' : page === 'assessment' ? 'Penilaian' : page === 'teachers' ? 'Daftar guru' : 'Laporan'}</strong></div>
          <div className="topbar-actions"><button className="icon-button" aria-label="Notifikasi"><Bell size={18} /><i /></button><div className="profile"><div className="avatar navy">KS</div><div><strong>Kepala Sekolah</strong><span>Administrator</span></div><ChevronDown size={16} /></div></div>
        </header>
        {page === 'dashboard' && <Dashboard assessments={assessments} teachers={teachers} onNew={startAssessment} onOpen={editAssessment} />}
        {page === 'teachers' && <Teachers teachers={teachers} assessments={assessments} onNew={startAssessment} />}
        {page === 'reports' && <Reports assessments={assessments} teachers={teachers} onOpen={editAssessment} />}
        {page === 'assessment' && <AssessmentWorkspace assessment={active ?? freshAssessment()} teachers={teachers} onBack={() => navigate('dashboard')} onSave={persistAssessment} />}
      </main>
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
    </div>
  )
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{active && <span className="nav-pip" />}</button>
}

function Dashboard({ assessments, teachers, onNew, onOpen }: { assessments: Assessment[]; teachers: Teacher[]; onNew: () => void; onOpen: (assessment: Assessment) => void }) {
  const done = assessments.filter((item) => item.status === 'selesai').length
  const inProgress = assessments.filter((item) => item.status === 'draft').length
  return <div className="page-wrap">
    <section className="welcome-row"><div><p className="eyebrow">Jumat, 21 Agustus 2026</p><h1>Selamat datang, Kepala Sekolah.</h1><p className="muted">Mari melihat perkembangan supervisi pembelajaran di sekolah.</p></div><button className="primary-button" onClick={onNew}><Plus size={18} /> Penilaian baru</button></section>
    <section className="stats-grid"><StatCard icon={<Users size={19} />} label="Guru dalam pemantauan" value={String(teachers.length)} detail="Tahun ajaran 2026" tone="mint" /><StatCard icon={<ClipboardCheck size={19} />} label="Penilaian selesai" value={String(done)} detail="Dari seluruh penilaian" tone="blue" /><StatCard icon={<FileText size={19} />} label="Masih berjalan" value={String(inProgress)} detail="Perlu ditindaklanjuti" tone="peach" /><StatCard icon={<Sparkles size={19} />} label="Rata-rata sekolah" value={assessments.length ? `${(assessments.reduce((sum, a) => sum + averageScore(observationItems, a.observation), 0) / assessments.length || 0).toFixed(1)}` : '—'} detail="Skala 1 sampai 4" tone="lilac" /></section>
    <section className="content-grid"><div className="panel recent-panel"><div className="panel-head"><div><h2>Aktivitas terbaru</h2><p className="muted">Perubahan terakhir pada penilaian guru.</p></div><button className="text-button" onClick={onNew}>Lihat semua <ArrowRight size={15} /></button></div>{assessments.length === 0 ? <EmptyState onNew={onNew} /> : <div className="activity-list">{assessments.slice(0, 5).map((assessment) => <AssessmentRow key={assessment.id} assessment={assessment} teachers={teachers} onClick={() => onOpen(assessment)} />)}</div>}</div><div className="panel cycle-panel"><div className="panel-head"><div><h2>Siklus supervisi</h2><p className="muted">Alur pendampingan pembelajaran.</p></div><MoreHorizontal size={18} className="muted" /></div><div className="cycle-list"><CycleStep number="01" title="Pra-observasi" detail="Telaah RPP / Modul Ajar" done={assessments.length > 0} /><CycleStep number="02" title="Observasi" detail="Praktik pembelajaran di kelas" done={assessments.some((a) => a.currentStage !== 'pra-observasi')} /><CycleStep number="03" title="Pasca-observasi" detail="Refleksi dan umpan balik" done={assessments.some((a) => a.status === 'selesai')} /></div><div className="cycle-quote">“Yang kita cari bukan kesempurnaan, tetapi langkah kecil yang berarti.”</div></div></section>
  </div>
}

function StatCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div> }
function CycleStep({ number, title, detail, done }: { number: string; title: string; detail: string; done: boolean }) { return <div className="cycle-step"><div className={`step-number ${done ? 'done' : ''}`}>{done ? <Check size={15} /> : number}</div><div><strong>{title}</strong><span>{detail}</span></div><span className={`step-status ${done ? 'complete' : ''}`}>{done ? 'Selesai' : 'Berikutnya'}</span></div> }
function EmptyState({ onNew }: { onNew: () => void }) { return <div className="empty-state"><BookOpenCheck size={32} /><strong>Belum ada penilaian</strong><span>Mulai dari membuat penilaian untuk seorang guru.</span><button className="secondary-button" onClick={onNew}>Buat penilaian pertama</button></div> }
function AssessmentRow({ assessment, teachers, onClick }: { assessment: Assessment; teachers: Teacher[]; onClick: () => void }) { const teacher = teachers.find((item) => item.id === assessment.teacherId); const avg = averageScore(observationItems, assessment.observation); return <button className="activity-row" onClick={onClick}><div className="avatar" style={{ background: teacher?.color }}>{teacher?.initials ?? '?'}</div><div className="row-main"><strong>{teacher?.name ?? 'Guru belum dipilih'}</strong><span>{assessment.subject || teacher?.subject || 'Mata pelajaran belum diisi'} · {formatDate(assessment.updatedAt)}</span></div><div className="row-score">{avg ? <><strong>{avg.toFixed(1)}</strong><span>rata-rata</span></> : <span className="draft-label">Draf</span>}</div><div className="row-chevron"><ArrowRight size={16} /></div></button> }

function isStageUnlocked(index: number, assessment: Assessment) {
  const preComplete = completedCount(preObservationItems, assessment.preObservation) === preObservationItems.length
  const observationComplete = completedCount(observationItems, assessment.observation) === observationItems.length
  return index === 0 || (index === 1 && preComplete) || (index === 2 && preComplete && observationComplete)
}

function AssessmentWorkspace({ assessment: initial, teachers, onBack, onSave }: { assessment: Assessment; teachers: Teacher[]; onBack: () => void; onSave: (assessment: Assessment, message?: string) => void }) {
  const [assessment, setAssessment] = useState(initial)
  const [stage, setStage] = useState<Stage>(initial.currentStage)
  const [showMeta, setShowMeta] = useState(!initial.teacherId)
  const teacher = teachers.find((item) => item.id === assessment.teacherId)
  const stageIndex = steps.findIndex((step) => step.id === stage)
  const update = (patch: Partial<Assessment>) => setAssessment((current) => ({ ...current, ...patch, currentStage: stage }))
  const updateResponse = (bucket: 'preObservation' | 'observation', id: string, patch: Partial<ScoredResponse>) => setAssessment((current) => { const existing = current[bucket][id] ?? { note: '' }; return { ...current, [bucket]: { ...current[bucket], [id]: { ...existing, ...patch } } } })
  const preComplete = completedCount(preObservationItems, assessment.preObservation) === preObservationItems.length
  const observationComplete = completedCount(observationItems, assessment.observation) === observationItems.length
  const save = (message = 'Perubahan tersimpan') => onSave(assessment, message)
  const moveTo = (nextStage: Stage, message = 'Tahap penilaian diperbarui') => { const next = { ...assessment, currentStage: nextStage }; setAssessment(next); setStage(nextStage); onSave(next, message) }
  const goNext = () => { if (stageIndex === 0) { if (!preComplete) { window.alert('Lengkapi seluruh skor pra-observasi sebelum melanjutkan ke observasi.'); return } moveTo('observasi', 'Tahap observasi dibuka') } else if (stageIndex === 1) { if (!observationComplete) { window.alert('Lengkapi seluruh skor observasi sebelum melanjutkan ke pasca-observasi.'); return } moveTo('pasca-observasi', 'Tahap pasca-observasi dibuka') } else { const finished = { ...assessment, status: 'selesai' as const, currentStage: 'pasca-observasi' as const }; onSave(finished, 'Penilaian ditandai selesai') } }
  return <div className="page-wrap workspace-page">
    <div className="workspace-top"><button className="back-button" onClick={onBack}><ArrowLeft size={17} /> Kembali ke ringkasan</button><div className="workspace-actions"><span className={`status-badge ${assessment.status}`}>{assessment.status === 'selesai' ? <Check size={14} /> : <span className="status-dot" />}{assessment.status === 'selesai' ? 'Selesai' : 'Draf'}</span><button className="secondary-button compact" onClick={() => save()}><Check size={16} /> Simpan draf</button></div></div>
    <div className="workspace-heading"><div><p className="eyebrow">Penilaian kinerja guru · {assessment.period}</p><h1>{teacher?.name ?? 'Penilaian baru'}</h1><p className="muted">Lengkapi instrumen secara bertahap. Perubahan tersimpan sebagai draf.</p></div><button className="icon-button outlined" aria-label="Unduh laporan" onClick={() => window.print()}><FileDown size={18} /></button></div>
    {showMeta && <MetaForm assessment={assessment} teachers={teachers} onChange={update} onClose={() => setShowMeta(false)} />}
    {!showMeta && <button className="meta-summary" onClick={() => setShowMeta(true)}><div className="avatar" style={{ background: teacher?.color }}>{teacher?.initials ?? '?'}</div><div><strong>{teacher?.name ?? 'Pilih guru'}</strong><span>{assessment.className || 'Kelas belum diisi'} · {assessment.subject || teacher?.subject || 'Mata pelajaran belum diisi'} · Observasi {formatDate(assessment.observationDate)}</span></div><ChevronDown size={18} /></button>}
    <div className="stepper">{steps.map((item, index) => { const unlocked = isStageUnlocked(index, assessment); return <button key={item.id} className={`stepper-item ${stage === item.id ? 'current' : ''} ${index < stageIndex ? 'visited' : ''} ${!unlocked ? 'locked' : ''}`} disabled={!unlocked} onClick={() => moveTo(item.id)}><span className="stepper-circle">{index < stageIndex ? <Check size={15} /> : index + 1}</span><span><strong>{item.label}</strong><small>{unlocked ? item.short : 'Selesaikan tahap sebelumnya'}</small></span></button> })}</div>
    {stage === 'pra-observasi' && <ProgressiveRubricStage title="Telaah RPP / Modul Ajar" intro="Tinjau kesiapan perencanaan pembelajaran sebelum observasi berlangsung." items={preObservationItems} responses={assessment.preObservation} onResponse={(id, patch) => updateResponse('preObservation', id, patch)} />}
    {stage === 'observasi' && <ProgressiveRubricStage title="Observasi Pembelajaran" intro="Catat bukti pembelajaran yang terlihat selama observasi di kelas." items={observationItems} responses={assessment.observation} onResponse={(id, patch) => updateResponse('observation', id, patch)} evidenceLabel="Bukti pembelajaran" mode="sections" />}
    {stage === 'pasca-observasi' && <PostObservation assessment={assessment} onChange={setAssessment} />}
    <div className="workspace-footer"><button className="secondary-button" onClick={() => { if (stageIndex > 0) moveTo(steps[stageIndex - 1].id) }} disabled={stageIndex === 0}><ArrowLeft size={16} /> Sebelumnya</button><div className="footer-progress"><span>{stageIndex + 1} dari {steps.length}</span><div className="progress-line"><i style={{ width: `${((stageIndex + 1) / steps.length) * 100}%` }} /></div></div><button className="primary-button" onClick={goNext}>{stageIndex === steps.length - 1 ? 'Selesaikan penilaian' : 'Lanjutkan'} <ArrowRight size={16} /></button></div>
  </div>
}

function MetaForm({ assessment, teachers, onChange, onClose }: { assessment: Assessment; teachers: Teacher[]; onChange: (patch: Partial<Assessment>) => void; onClose: () => void }) { return <div className="meta-form panel"><div className="panel-head"><div><h2>Informasi observasi</h2><p className="muted">Identitas ini akan tampil di laporan.</p></div><button className="icon-button" onClick={onClose} aria-label="Tutup"><X size={18} /></button></div><div className="form-grid"><label>Nama guru<select value={assessment.teacherId} onChange={(event) => { const teacher = teachers.find((item) => item.id === event.target.value); onChange({ teacherId: event.target.value, subject: assessment.subject || teacher?.subject || '' }) }}><option value="">Pilih guru...</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label><label>Kelas<input value={assessment.className} onChange={(event) => onChange({ className: event.target.value })} placeholder="Contoh: XI TJKT 1" /></label><label>Mata pelajaran<input value={assessment.subject} onChange={(event) => onChange({ subject: event.target.value })} placeholder="Mata pelajaran" /></label><label>Materi pokok<input value={assessment.topic} onChange={(event) => onChange({ topic: event.target.value })} placeholder="Materi yang diamati" /></label><label>Tanggal observasi<input type="date" value={assessment.observationDate} onChange={(event) => onChange({ observationDate: event.target.value })} /></label><label>Supervisor<input value={assessment.observer} onChange={(event) => onChange({ observer: event.target.value })} /></label></div><button className="secondary-button compact" onClick={onClose}>Simpan identitas</button></div> }

function RubricStage({ title, intro, items, responses, onResponse, evidenceLabel = 'Catatan supervisor' }: { title: string; intro: string; items: RubricItem[]; responses: Record<string, ScoredResponse>; onResponse: (id: string, patch: Partial<ScoredResponse>) => void; evidenceLabel?: string }) { const grouped = items.reduce<Record<string, RubricItem[]>>((result, item) => { (result[item.section] ??= []).push(item); return result }, {}); const done = completedCount(items, responses); return <section className="rubric-stage"><div className="stage-intro"><div><h2>{title}</h2><p className="muted">{intro}</p></div><div className="stage-score"><strong>{done}<span>/{items.length}</span></strong><small>butir dinilai</small></div></div><div className="score-guide"><span>Skala penilaian</span>{Object.entries(scoreLabels).map(([score, label]) => <span key={score}><b>{score}</b>{label}</span>)}</div>{Object.entries(grouped).map(([section, sectionItems]) => <div className="rubric-section" key={section}><div className="section-title"><span>{section}</span><em>{sectionItems.length} butir</em></div>{sectionItems.map((item) => <RubricCard item={item} key={item.id} response={responses[item.id]} onResponse={onResponse} evidenceLabel={evidenceLabel} />)}</div>)}<div className="total-card"><div><span>Total skor sementara</span><strong>{totalScore(items, responses)} <small>/ {items.length * 4}</small></strong></div><div className="total-meter"><i style={{ width: `${(totalScore(items, responses) / (items.length * 4)) * 100}%` }} /></div><span className="muted">Rata-rata {averageScore(items, responses) ? averageScore(items, responses).toFixed(2) : '—'}</span></div></section> }

function RubricCard({ item, response, onResponse, evidenceLabel }: { item: RubricItem; response?: ScoredResponse; onResponse: (id: string, patch: Partial<ScoredResponse>) => void; evidenceLabel: string }) { return <div className={`rubric-card ${response?.score ? 'has-score' : ''}`}><div className="rubric-number">{String(item.number).padStart(2, '0')}</div><div className="rubric-content"><div className="rubric-title"><strong>{item.title}</strong>{response?.score && <span className={`score-pill score-${response.score}`}>{response.score} · {scoreLabels[response.score]}</span>}</div><p>{item.indicator}</p><label className="note-field"><span>{evidenceLabel}</span><textarea value={response?.note ?? ''} onChange={(event) => onResponse(item.id, { note: event.target.value })} placeholder="Tulis catatan atau bukti yang terlihat..." rows={2} /></label></div><div className="score-control"><span>Skor</span><div>{([1, 2, 3, 4] as Score[]).map((score) => <button key={score} className={response?.score === score ? `selected score-${score}` : ''} onClick={() => onResponse(item.id, { score })} aria-label={`Skor ${score}`}>{score}</button>)}</div></div></div> }

type RubricDisplayMode = 'pages' | 'sections'

const RUBRIC_PAGE_SIZE = 5

function ProgressiveRubricStage({ title, intro, items, responses, onResponse, evidenceLabel = 'Catatan supervisor', mode = 'pages' }: { title: string; intro: string; items: RubricItem[]; responses: Record<string, ScoredResponse>; onResponse: (id: string, patch: Partial<ScoredResponse>) => void; evidenceLabel?: string; mode?: RubricDisplayMode }) {
  const grouped = items.reduce<Record<string, RubricItem[]>>((result, item) => { (result[item.section] ??= []).push(item); return result }, {})
  const sections = Object.entries(grouped)
  const [page, setPage] = useState(0)
  const [openSection, setOpenSection] = useState(sections[0]?.[0] ?? '')
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set())
  const done = completedCount(items, responses)
  const pageCount = Math.max(1, Math.ceil(items.length / RUBRIC_PAGE_SIZE))
  const currentItems = items.slice(page * RUBRIC_PAGE_SIZE, (page + 1) * RUBRIC_PAGE_SIZE)
  const goToPage = (nextPage: number) => { const bounded = Math.max(0, Math.min(nextPage, pageCount - 1)); setPage(bounded); window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' })) }
  const toggleNote = (id: string) => setOpenNotes((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const jumpTo = (item: RubricItem, index: number) => { if (mode === 'sections') setOpenSection(item.section); else goToPage(Math.floor(index / RUBRIC_PAGE_SIZE)) }
  const renderCards = (visibleItems: RubricItem[]) => visibleItems.map((item) => <ProgressiveRubricCard key={item.id} item={item} response={responses[item.id]} noteOpen={openNotes.has(item.id)} onToggleNote={() => toggleNote(item.id)} onResponse={onResponse} evidenceLabel={evidenceLabel} />)

  return <section className="rubric-stage progressive-stage">
    <div className="stage-intro"><div><h2>{title}</h2><p className="muted">{intro}</p></div><div className="stage-score"><strong>{done}<span>/{items.length}</span></strong><small>butir dinilai</small></div></div>
    <div className="score-guide"><span>Skala penilaian</span>{Object.entries(scoreLabels).map(([score, label]) => <span key={score}><b>{score}</b>{label}</span>)}</div>
    <div className="item-map"><span className="item-map-label">Lompat ke butir</span>{items.map((item, index) => <button type="button" key={item.id} className={responses[item.id]?.score ? 'complete' : ''} onClick={() => jumpTo(item, index)} aria-label={`Buka butir ${item.number}`}>{responses[item.id]?.score ? <Check size={12} /> : item.number}</button>)}</div>
    {mode === 'pages' && <div className="rubric-section progressive-section"><div className="section-title"><span>{items[0]?.section}</span><em>{items.length} butir · halaman {page + 1} dari {pageCount}</em></div>{renderCards(currentItems)}</div>}
    {mode === 'sections' && <div className="section-accordion">{sections.map(([section, sectionItems]) => { const isOpen = openSection === section; return <div className={`rubric-section accordion-section ${isOpen ? 'open' : ''}`} key={section}><button type="button" className="section-toggle" onClick={() => setOpenSection(isOpen ? '' : section)}><span className="section-title"><span>{section}</span><em>{completedCount(sectionItems, responses)}/{sectionItems.length} selesai</em></span><ChevronDown size={17} /></button>{isOpen && renderCards(sectionItems)}</div> })}</div>}
    {mode === 'pages' && <div className="progressive-pagination"><button type="button" className="secondary-button compact" onClick={() => goToPage(page - 1)} disabled={page === 0}><ArrowLeft size={14} /> Sebelumnya</button><span>Butir {page * RUBRIC_PAGE_SIZE + 1}–{Math.min((page + 1) * RUBRIC_PAGE_SIZE, items.length)} dari {items.length}</span><button type="button" className="secondary-button compact" onClick={() => goToPage(page + 1)} disabled={page === pageCount - 1}>Berikutnya <ArrowRight size={14} /></button></div>}
    <div className="total-card"><div><span>Total skor sementara</span><strong>{totalScore(items, responses)} <small>/ {items.length * 4}</small></strong></div><div className="total-meter"><i style={{ width: `${(totalScore(items, responses) / (items.length * 4)) * 100}%` }} /></div><span className="muted">Rata-rata {averageScore(items, responses) ? averageScore(items, responses).toFixed(2) : '—'}</span></div>
  </section>
}

function ProgressiveRubricCard({ item, response, noteOpen, onToggleNote, onResponse, evidenceLabel }: { item: RubricItem; response?: ScoredResponse; noteOpen: boolean; onToggleNote: () => void; onResponse: (id: string, patch: Partial<ScoredResponse>) => void; evidenceLabel: string }) {
  const hasNote = Boolean(response?.note?.trim())
  return <article className={`rubric-card progressive-card ${response?.score ? 'has-score' : ''}`}><div className="rubric-number">{String(item.number).padStart(2, '0')}</div><div className="rubric-content"><div className="rubric-title"><strong>{item.title}</strong>{response?.score && <span className={`score-pill score-${response.score}`}>{response.score} · {scoreLabels[response.score]}</span>}</div><p>{item.indicator}</p><div className="rubric-actions"><div className="score-control"><span>Skor</span><div>{([1, 2, 3, 4] as Score[]).map((score) => <button type="button" key={score} className={response?.score === score ? `selected score-${score}` : ''} onClick={() => onResponse(item.id, { score })} aria-label={`Skor ${score}`}>{score}</button>)}</div></div><button type="button" className={`note-toggle ${hasNote ? 'has-note' : ''}`} onClick={onToggleNote}><FileText size={14} />{noteOpen ? 'Sembunyikan catatan' : hasNote ? 'Lihat catatan' : 'Tambah catatan'}</button></div>{noteOpen && <label className="note-field"><span>{evidenceLabel}</span><textarea autoFocus={!hasNote} value={response?.note ?? ''} onChange={(event) => onResponse(item.id, { note: event.target.value })} placeholder="Tulis catatan atau bukti yang terlihat..." rows={2} /></label>}</div></article>
}

function PostObservation({ assessment, onChange }: { assessment: Assessment; onChange: (next: Assessment) => void }) { const updateReflection = (key: string, value: string) => onChange({ ...assessment, reflection: { ...assessment.reflection, [key]: value } }); const updateFeedback = (aspect: string, field: 'strength' | 'development', value: string) => { const existing = assessment.feedback[aspect] ?? { strength: '', development: '' }; onChange({ ...assessment, feedback: { ...assessment.feedback, [aspect]: { ...existing, [field]: value } } }) }; const updateFollowUp = (index: number, field: 'action' | 'owner' | 'dueDate', value: string) => onChange({ ...assessment, followUps: assessment.followUps.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }); return <section className="post-stage"><div className="stage-intro"><div><h2>Refleksi & tindak lanjut</h2><p className="muted">Tutup proses supervisi dengan percakapan yang konkret dan disepakati bersama.</p></div></div><div className="post-section"><div className="section-title"><span>Refleksi guru</span><em>Diisi oleh guru</em></div>{reflectionQuestions.map(([key, question]) => <label className="long-field" key={key}><span>{question}</span><textarea value={assessment.reflection[key] ?? ''} onChange={(event) => updateReflection(key, event.target.value)} placeholder="Tulis refleksi guru..." rows={3} /></label>)}</div><div className="post-section"><div className="section-title"><span>Umpan balik supervisor</span><em>Kekuatan & area pengembangan</em></div><div className="feedback-table"><div className="feedback-header"><span>Aspek</span><span>Apresiasi / kekuatan</span><span>Area pengembangan</span></div>{feedbackAspects.map((aspect) => <div className="feedback-row" key={aspect}><strong>{aspect}</strong><textarea value={assessment.feedback[aspect]?.strength ?? ''} onChange={(event) => updateFeedback(aspect, 'strength', event.target.value)} placeholder="Apa yang sudah baik?" rows={3} /><textarea value={assessment.feedback[aspect]?.development ?? ''} onChange={(event) => updateFeedback(aspect, 'development', event.target.value)} placeholder="Apa yang perlu dikembangkan?" rows={3} /></div>)}</div></div><div className="post-section"><div className="section-title"><span>Rencana tindak lanjut</span><em>Kesepakatan bersama</em></div><div className="follow-up-list">{assessment.followUps.map((item, index) => <div className="follow-up-row" key={item.aspect}><strong>{item.aspect}</strong><input value={item.action} onChange={(event) => updateFollowUp(index, 'action', event.target.value)} placeholder="Tindak lanjut yang disepakati" /><input value={item.owner} onChange={(event) => updateFollowUp(index, 'owner', event.target.value)} placeholder="Penanggung jawab" /><input type="date" value={item.dueDate} onChange={(event) => updateFollowUp(index, 'dueDate', event.target.value)} /></div>)}</div><div className="form-grid two"><label>Catatan supervisor<textarea value={assessment.supervisorNote} onChange={(event) => onChange({ ...assessment, supervisorNote: event.target.value })} rows={4} placeholder="Catatan tambahan..." /></label><label>Rekomendasi / saran perbaikan<textarea value={assessment.recommendation} onChange={(event) => onChange({ ...assessment, recommendation: event.target.value })} rows={4} placeholder="Rekomendasi untuk periode berikutnya..." /></label></div></div></section> }

function Teachers({ teachers, assessments, onNew }: { teachers: Teacher[]; assessments: Assessment[]; onNew: () => void }) { return <div className="page-wrap"><section className="welcome-row"><div><p className="eyebrow">Data sekolah</p><h1>Daftar guru</h1><p className="muted">Kelola guru yang masuk dalam pemantauan kinerja.</p></div><button className="primary-button" onClick={onNew}><Plus size={18} /> Penilaian baru</button></section><div className="panel table-panel"><div className="panel-head"><div><h2>{teachers.length} guru terdaftar</h2><p className="muted">Data contoh siap diganti dengan data sekolah.</p></div><button className="secondary-button compact"><Plus size={16} /> Tambah guru</button></div><div className="teacher-table"><div className="teacher-header"><span>Guru</span><span>Mata pelajaran</span><span>Penilaian</span><span>Status terbaru</span></div>{teachers.map((teacher) => { const items = assessments.filter((assessment) => assessment.teacherId === teacher.id); const latest = items[0]; return <div className="teacher-row" key={teacher.id}><div className="teacher-cell"><div className="avatar" style={{ background: teacher.color }}>{teacher.initials}</div><strong>{teacher.name}</strong></div><span>{teacher.subject}</span><span>{items.length} penilaian</span><span className={`status-text ${latest?.status === 'selesai' ? 'complete' : ''}`}>{latest ? latest.status === 'selesai' ? 'Selesai' : 'Draf' : 'Belum ada'}</span></div> })}</div></div></div> }

function Reports({ assessments, teachers, onOpen }: { assessments: Assessment[]; teachers: Teacher[]; onOpen: (assessment: Assessment) => void }) { const [query, setQuery] = useState(''); const filtered = assessments.filter((assessment) => teachers.find((teacher) => teacher.id === assessment.teacherId)?.name.toLowerCase().includes(query.toLowerCase())); return <div className="page-wrap"><section className="welcome-row"><div><p className="eyebrow">Dokumentasi</p><h1>Laporan supervisi</h1><p className="muted">Cari, tinjau, dan cetak hasil supervisi guru.</p></div></section><div className="panel table-panel"><div className="report-toolbar"><div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama guru..." /></div><span className="muted">{filtered.length} laporan</span></div>{filtered.length === 0 ? <EmptyState onNew={() => undefined} /> : <div className="report-list">{filtered.map((assessment) => { const teacher = teachers.find((item) => item.id === assessment.teacherId); return <button className="report-row" key={assessment.id} onClick={() => onOpen(assessment)}><div className="file-icon"><FileText size={19} /></div><div><strong>{teacher?.name ?? 'Guru belum dipilih'}</strong><span>{assessment.period} · {assessment.subject || teacher?.subject || '—'} · diperbarui {formatDate(assessment.updatedAt)}</span></div><span className={`status-badge ${assessment.status}`}>{assessment.status === 'selesai' ? 'Selesai' : 'Draf'}</span><ArrowRight size={17} /></button> })}</div>}</div></div> }

function formatDate(value: string) { return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) }

export default App

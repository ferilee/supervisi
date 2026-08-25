import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  ArrowLeft, ArrowRight, BarChart3, Bell, BookOpenCheck, Check, ChevronDown, CircleAlert, ClipboardCheck,
  Download, FileDown, FileText, LayoutDashboard, Maximize2, Menu, MoreHorizontal, Plus, Search, Settings2, ShieldCheck,
  Sparkles, Upload, Users, X,
} from 'lucide-react'
import { feedbackAspects, followUpAspects, observationItems, preObservationItems, reflectionQuestions, scoreLabels } from './data/instrument'
import { averageScore, completedCount, totalScore } from './lib/scoring'
import { defaultSupervisors, getAssessments, getSupervisors, getTeachers, makeId, saveAssessments, saveSupervisors, saveTeachers } from './lib/storage'
import type { AppPage, Assessment, RubricItem, ScoredResponse, Score, Stage, Supervisor, Teacher } from './types'

const steps: Array<{ id: Stage; label: string; short: string }> = [
  { id: 'pra-observasi', label: 'Pra-observasi', short: 'RPP / Modul Ajar' },
  { id: 'observasi', label: 'Observasi', short: 'Praktik di Kelas' },
  { id: 'pasca-observasi', label: 'Pasca-observasi', short: 'Refleksi & Tindak Lanjut' },
]

const freshAssessment = (teacherId = '', observer = defaultSupervisors[0]?.name ?? ''): Assessment => ({
  id: makeId(), teacherId, period: '2026', className: '', subject: '', topic: '', observer, observationDate: new Date().toISOString().slice(0, 10),
  status: 'draft', currentStage: 'pra-observasi', preObservation: {}, observation: {}, reflection: {}, feedback: {},
  followUps: followUpAspects.map((aspect) => ({ aspect, action: '', owner: '', dueDate: '' })), supervisorNote: '', recommendation: '',
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
})

function App() {
  const [page, setPage] = useState<AppPage>('dashboard')
  const [mobileNav, setMobileNav] = useState(false)
  const [teachers, setTeachers] = useState<Teacher[]>(() => getTeachers())
  const [supervisors, setSupervisors] = useState<Supervisor[]>(() => getSupervisors())
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

  const persistTeachers = (next: Teacher[]) => { setTeachers(next); saveTeachers(next) }
  const persistSupervisors = (next: Supervisor[]) => { setSupervisors(next); saveSupervisors(next) }

  const startAssessment = () => {
    setActive(freshAssessment('', supervisors.find((item) => item.active)?.name ?? ''))
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
          <NavItem icon={<Settings2 size={18} />} label="Supervisor" active={page === 'supervisors'} onClick={() => navigate('supervisors')} />
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
          <div className="breadcrumbs"><span>SMKN Pasirian</span><span className="slash">/</span><strong>{page === 'dashboard' ? 'Ringkasan' : page === 'assessment' ? 'Penilaian' : page === 'teachers' ? 'Daftar guru' : page === 'supervisors' ? 'Supervisor' : 'Laporan'}</strong></div>
          <div className="topbar-actions"><button className="icon-button" aria-label="Notifikasi"><Bell size={18} /><i /></button><div className="profile"><div className="avatar navy">KS</div><div><strong>Kepala Sekolah</strong><span>Administrator</span></div><ChevronDown size={16} /></div></div>
        </header>
        {page === 'dashboard' && <Dashboard assessments={assessments} teachers={teachers} onNew={startAssessment} onOpen={editAssessment} />}
        {page === 'teachers' && <Teachers teachers={teachers} assessments={assessments} onNew={startAssessment} onTeachersChange={persistTeachers} />}
        {page === 'supervisors' && <Supervisors teachers={teachers} supervisors={supervisors} onSupervisorsChange={persistSupervisors} />}
        {page === 'reports' && <Reports assessments={assessments} teachers={teachers} onOpen={editAssessment} />}
        {page === 'assessment' && <AssessmentWorkspace assessment={active ?? freshAssessment('', supervisors.find((item) => item.active)?.name ?? '')} teachers={teachers} supervisors={supervisors} onBack={() => navigate('dashboard')} onSave={persistAssessment} />}
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

function getMissingObservationInfo(assessment: Assessment) {
  const missing: string[] = []
  if (!assessment.teacherId) missing.push('nama guru')
  if (!assessment.className.trim()) missing.push('kelas')
  if (!assessment.subject.trim()) missing.push('mata pelajaran')
  if (!assessment.topic.trim()) missing.push('materi pokok')
  if (!assessment.observationDate) missing.push('tanggal observasi')
  if (!assessment.observer.trim()) missing.push('supervisor')
  return missing
}

function AssessmentWorkspace({ assessment: initial, teachers, supervisors, onBack, onSave }: { assessment: Assessment; teachers: Teacher[]; supervisors: Supervisor[]; onBack: () => void; onSave: (assessment: Assessment, message?: string) => void }) {
  const [assessment, setAssessment] = useState(initial)
  const [stage, setStage] = useState<Stage>(initial.currentStage)
  const [showMeta, setShowMeta] = useState(false)
  const teacher = teachers.find((item) => item.id === assessment.teacherId)
  const stageIndex = steps.findIndex((step) => step.id === stage)
  const update = (patch: Partial<Assessment>) => setAssessment((current) => ({ ...current, ...patch, currentStage: stage }))
  const updateResponse = (bucket: 'preObservation' | 'observation', id: string, patch: Partial<ScoredResponse>) => setAssessment((current) => { const existing = current[bucket][id] ?? { note: '' }; return { ...current, [bucket]: { ...current[bucket], [id]: { ...existing, ...patch } } } })
  const preComplete = completedCount(preObservationItems, assessment.preObservation) === preObservationItems.length
  const observationComplete = completedCount(observationItems, assessment.observation) === observationItems.length
  const missingObservationInfo = getMissingObservationInfo(assessment)
  const observationInfoComplete = missingObservationInfo.length === 0
  const save = (message = 'Perubahan tersimpan') => onSave(assessment, message)
  const moveTo = (nextStage: Stage, message = 'Tahap penilaian diperbarui') => { const next = { ...assessment, currentStage: nextStage }; setAssessment(next); setStage(nextStage); onSave(next, message) }
  const goNext = () => { if (!observationInfoComplete) { setShowMeta(true); return } if (stageIndex === 0) { if (!preComplete) { window.alert('Lengkapi seluruh skor pra-observasi sebelum melanjutkan ke observasi.'); return } moveTo('observasi', 'Tahap observasi dibuka') } else if (stageIndex === 1) { if (!observationComplete) { window.alert('Lengkapi seluruh skor observasi sebelum melanjutkan ke pasca-observasi.'); return } moveTo('pasca-observasi', 'Tahap pasca-observasi dibuka') } else { const finished = { ...assessment, status: 'selesai' as const, currentStage: 'pasca-observasi' as const }; onSave(finished, 'Penilaian ditandai selesai') } }
  return <div className="page-wrap workspace-page">
    <div className="workspace-top"><button className="back-button" onClick={onBack}><ArrowLeft size={17} /> Kembali ke ringkasan</button><div className="workspace-actions"><span className={`status-badge ${assessment.status}`}>{assessment.status === 'selesai' ? <Check size={14} /> : <span className="status-dot" />}{assessment.status === 'selesai' ? 'Selesai' : 'Draf'}</span><button className="secondary-button compact" onClick={() => save()}><Check size={16} /> Simpan draf</button></div></div>
    <div className="workspace-heading"><div><p className="eyebrow">Penilaian kinerja guru · {assessment.period}</p><h1>{teacher?.name ?? 'Penilaian baru'}</h1><p className="muted">Lengkapi instrumen secara bertahap. Perubahan tersimpan sebagai draf.</p></div><button className="icon-button outlined" aria-label="Unduh laporan" onClick={() => window.print()}><FileDown size={18} /></button></div>
    {showMeta && <MetaForm assessment={assessment} teachers={teachers} supervisors={supervisors} onChange={update} onClose={() => { save('Identitas observasi tersimpan'); setShowMeta(false) }} />}
    {!showMeta && <button className={`meta-summary ${teacher ? '' : 'is-empty'}`} onClick={() => setShowMeta(true)} aria-expanded={false} aria-controls="observation-info-panel"><div className="avatar" style={{ background: teacher?.color }}>{teacher?.initials ?? '?'}</div><div><strong>{teacher?.name ?? 'Lengkapi informasi observasi'}</strong><span>{teacher ? `${assessment.className || 'Kelas belum diisi'} · ${assessment.subject || teacher.subject} · Observasi ${formatDate(assessment.observationDate)}` : 'Tambahkan guru, kelas, mata pelajaran, dan tanggal observasi'}</span></div><ChevronDown size={18} /></button>}
    <div className="stepper">{steps.map((item, index) => { const unlocked = observationInfoComplete && isStageUnlocked(index, assessment); return <button key={item.id} className={`stepper-item ${stage === item.id && observationInfoComplete ? 'current' : ''} ${index < stageIndex ? 'visited' : ''} ${!unlocked ? 'locked' : ''}`} disabled={!unlocked} onClick={() => moveTo(item.id)}><span className="stepper-circle">{index < stageIndex ? <Check size={15} /> : index + 1}</span><span><strong>{item.label}</strong><small>{!observationInfoComplete ? 'Lengkapi informasi observasi' : unlocked ? item.short : 'Selesaikan tahap sebelumnya'}</small></span></button> })}</div>
    {!observationInfoComplete && <ObservationInfoRequired missing={missingObservationInfo} onOpen={() => setShowMeta(true)} />}
    {observationInfoComplete && stage === 'pra-observasi' && <FocusedRubricStage title="Telaah RPP / Modul Ajar" intro="Tinjau kesiapan perencanaan pembelajaran sebelum observasi berlangsung." items={preObservationItems} responses={assessment.preObservation} onResponse={(id, patch) => updateResponse('preObservation', id, patch)} />}
    {observationInfoComplete && stage === 'observasi' && <FocusedRubricStage title="Observasi Pembelajaran" intro="Catat bukti pembelajaran yang terlihat selama observasi di kelas." items={observationItems} responses={assessment.observation} onResponse={(id, patch) => updateResponse('observation', id, patch)} evidenceLabel="Bukti pembelajaran" mode="sections" />}
    {observationInfoComplete && stage === 'pasca-observasi' && <PostObservation assessment={assessment} onChange={setAssessment} />}
    <div className="workspace-footer"><button className="secondary-button" onClick={() => { if (stageIndex > 0) moveTo(steps[stageIndex - 1].id) }} disabled={stageIndex === 0}><ArrowLeft size={16} /> Sebelumnya</button><div className="footer-progress"><span>{stageIndex + 1} dari {steps.length}</span><div className="progress-line"><i style={{ width: `${((stageIndex + 1) / steps.length) * 100}%` }} /></div></div><button className="primary-button" onClick={goNext}>{!observationInfoComplete ? 'Lengkapi informasi' : stageIndex === steps.length - 1 ? 'Selesaikan penilaian' : 'Lanjutkan'} <ArrowRight size={16} /></button></div>
    <PrintReport assessment={assessment} teacher={teacher} />
  </div>
}

function ObservationInfoRequired({ missing, onOpen }: { missing: string[]; onOpen: () => void }) {
  return <div className="observation-info-required"><div className="required-info-icon"><CircleAlert size={20} /></div><div className="required-info-copy"><strong>Lengkapi informasi observasi terlebih dahulu</strong><span>Butir penilaian akan aktif setelah data berikut diisi: {missing.join(', ')}.</span></div><button className="primary-button compact" onClick={onOpen}>Isi informasi</button></div>
}

function MetaForm({ assessment, teachers, supervisors, onChange, onClose }: { assessment: Assessment; teachers: Teacher[]; supervisors: Supervisor[]; onChange: (patch: Partial<Assessment>) => void; onClose: () => void }) {
  const selectedTeacher = teachers.find((item) => item.id === assessment.teacherId)
  const subjectOptions = selectedTeacher ? getTeacherSubjects(selectedTeacher) : []
  const currentSubjectIsLegacy = Boolean(assessment.subject) && !subjectOptions.includes(assessment.subject)
  const activeSupervisors = supervisors.filter((item) => item.active)
  const currentSupervisorIsLegacy = Boolean(assessment.observer) && !activeSupervisors.some((item) => item.name === assessment.observer)
  return <div id="observation-info-panel" className="meta-form panel"><div className="panel-head"><div><h2>Informasi observasi</h2><p className="muted">Identitas ini akan tampil di laporan.</p></div><button className="icon-button" onClick={onClose} aria-label="Tutup informasi observasi"><X size={18} /></button></div><div className="form-grid"><label>Nama guru<select value={assessment.teacherId} onChange={(event) => { const teacher = teachers.find((item) => item.id === event.target.value); const subjects = teacher ? getTeacherSubjects(teacher) : []; onChange({ teacherId: event.target.value, subject: subjects[0] ?? '' }) }}><option value="">Pilih guru...</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label><label>Kelas<input value={assessment.className} onChange={(event) => onChange({ className: event.target.value })} placeholder="Contoh: XI TJKT 1" /></label><label>Mata pelajaran<select value={assessment.subject} onChange={(event) => onChange({ subject: event.target.value })} disabled={!selectedTeacher}><option value="">{selectedTeacher ? 'Pilih mata pelajaran...' : 'Pilih guru terlebih dahulu'}</option>{currentSubjectIsLegacy && <option value={assessment.subject}>{assessment.subject} (tersimpan)</option>}{subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label><label>Materi pokok<input value={assessment.topic} onChange={(event) => onChange({ topic: event.target.value })} placeholder="Materi yang diamati" /></label><label>Tanggal observasi<input type="date" value={assessment.observationDate} onChange={(event) => onChange({ observationDate: event.target.value })} /></label><label>Supervisor<select value={assessment.observer} onChange={(event) => onChange({ observer: event.target.value })} disabled={activeSupervisors.length === 0}><option value="">{activeSupervisors.length ? 'Pilih supervisor...' : 'Atur supervisor terlebih dahulu'}</option>{currentSupervisorIsLegacy && <option value={assessment.observer}>{assessment.observer} (tersimpan)</option>}{activeSupervisors.map((supervisor) => <option key={supervisor.id} value={supervisor.name}>{supervisor.name}{supervisor.position ? ` — ${supervisor.position}` : ''}</option>)}</select></label></div><button className="secondary-button compact" onClick={onClose}>Simpan identitas</button></div>
}

function getTeacherSubjects(teacher: Teacher) {
  return teacher.subject.split(/[;,]/).map((subject) => subject.trim()).filter(Boolean)
}

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

function FocusedRubricStage({ title, intro, items, responses, onResponse, evidenceLabel = 'Catatan supervisor', mode = 'pages' }: { title: string; intro: string; items: RubricItem[]; responses: Record<string, ScoredResponse>; onResponse: (id: string, patch: Partial<ScoredResponse>) => void; evidenceLabel?: string; mode?: RubricDisplayMode }) {
  const grouped = items.reduce<Record<string, RubricItem[]>>((result, item) => { (result[item.section] ??= []).push(item); return result }, {})
  const sections = Object.entries(grouped)
  const [page, setPage] = useState(0)
  const [openSection, setOpenSection] = useState(sections[0]?.[0] ?? '')
  const [openNotes, setOpenNotes] = useState<Set<string>>(new Set())
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const done = completedCount(items, responses)
  const pageCount = Math.max(1, Math.ceil(items.length / RUBRIC_PAGE_SIZE))
  const currentItems = items.slice(page * RUBRIC_PAGE_SIZE, (page + 1) * RUBRIC_PAGE_SIZE)
  const goToPage = (nextPage: number) => { const bounded = Math.max(0, Math.min(nextPage, pageCount - 1)); setPage(bounded); window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' })) }
  const toggleNote = (id: string) => setOpenNotes((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const openFocus = (index: number) => { if (mode === 'sections') setOpenSection(items[index].section); else goToPage(Math.floor(index / RUBRIC_PAGE_SIZE)); setFocusIndex(index) }
  const openFirstIncomplete = () => openFocus(Math.max(0, items.findIndex((item) => !responses[item.id]?.score)))
  const renderCards = (visibleItems: RubricItem[]) => visibleItems.map((item) => <ProgressiveRubricCard key={item.id} item={item} response={responses[item.id]} noteOpen={openNotes.has(item.id)} onToggleNote={() => toggleNote(item.id)} onResponse={onResponse} evidenceLabel={evidenceLabel} />)

  return <section className="rubric-stage progressive-stage">
    <div className="stage-intro"><div><h2>{title}</h2><p className="muted">{intro}</p></div><div className="stage-actions"><button type="button" className="focus-button" onClick={openFirstIncomplete}><Maximize2 size={15} /> Mode fokus</button><div className="stage-score"><strong>{done}<span>/{items.length}</span></strong><small>butir dinilai</small></div></div></div>
    <div className="score-guide"><span>Skala penilaian</span>{Object.entries(scoreLabels).map(([score, label]) => <span key={score}><b>{score}</b>{label}</span>)}</div>
    <div className="item-map"><span className="item-map-label">Lompat ke butir</span>{items.map((item, index) => <button type="button" key={item.id} className={responses[item.id]?.score ? 'complete' : ''} onClick={() => openFocus(index)} aria-label={`Buka butir ${item.number}`}>{responses[item.id]?.score ? <Check size={12} /> : item.number}</button>)}</div>
    {mode === 'pages' && <div className="rubric-section progressive-section"><div className="section-title"><span>{items[0]?.section}</span><em>{items.length} butir · halaman {page + 1} dari {pageCount}</em></div>{renderCards(currentItems)}</div>}
    {mode === 'sections' && <div className="section-accordion">{sections.map(([section, sectionItems]) => { const isOpen = openSection === section; return <div className={`rubric-section accordion-section ${isOpen ? 'open' : ''}`} key={section}><button type="button" className="section-toggle" onClick={() => setOpenSection(isOpen ? '' : section)}><span className="section-title"><span>{section}</span><em>{completedCount(sectionItems, responses)}/{sectionItems.length} selesai</em></span><ChevronDown size={17} /></button>{isOpen && renderCards(sectionItems)}</div> })}</div>}
    {mode === 'pages' && <div className="progressive-pagination"><button type="button" className="secondary-button compact" onClick={() => goToPage(page - 1)} disabled={page === 0}><ArrowLeft size={14} /> Sebelumnya</button><span>Butir {page * RUBRIC_PAGE_SIZE + 1}–{Math.min((page + 1) * RUBRIC_PAGE_SIZE, items.length)} dari {items.length}</span><button type="button" className="secondary-button compact" onClick={() => goToPage(page + 1)} disabled={page === pageCount - 1}>Berikutnya <ArrowRight size={14} /></button></div>}
    <div className="total-card"><div><span>Total skor sementara</span><strong>{totalScore(items, responses)} <small>/ {items.length * 4}</small></strong></div><div className="total-meter"><i style={{ width: `${(totalScore(items, responses) / (items.length * 4)) * 100}%` }} /></div><span className="muted">Rata-rata {averageScore(items, responses) ? averageScore(items, responses).toFixed(2) : '—'}</span></div>
    {focusIndex !== null && <FocusRubricModal item={items[focusIndex]} index={focusIndex} total={items.length} response={responses[items[focusIndex].id]} evidenceLabel={evidenceLabel} onResponse={onResponse} onClose={() => setFocusIndex(null)} onNavigate={(nextIndex) => openFocus(nextIndex)} />}
  </section>
}

function FocusRubricModal({ item, index, total, response, evidenceLabel, onResponse, onClose, onNavigate }: { item: RubricItem; index: number; total: number; response?: ScoredResponse; evidenceLabel: string; onResponse: (id: string, patch: Partial<ScoredResponse>) => void; onClose: () => void; onNavigate: (index: number) => void }) {
  useEffect(() => { const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); if (event.key === 'ArrowLeft' && index > 0) onNavigate(index - 1); if (event.key === 'ArrowRight' && index < total - 1) onNavigate(index + 1) }; document.body.style.overflow = 'hidden'; document.addEventListener('keydown', handleKeyDown); return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', handleKeyDown) } }, [index, total, onClose, onNavigate])
  return <div className="focus-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="focus-modal" role="dialog" aria-modal="true" aria-labelledby="focus-modal-title"><div className="focus-modal-header"><div><span className="focus-kicker">{item.section}</span><strong>Butir {String(item.number).padStart(2, '0')} dari {total}</strong></div><button type="button" className="focus-close" onClick={onClose} aria-label="Tutup mode fokus"><X size={19} /></button></div><div className="focus-progress"><i style={{ width: `${((index + 1) / total) * 100}%` }} /></div><div className="focus-modal-body"><h3 id="focus-modal-title">{item.title}</h3><p>{item.indicator}</p><div className="focus-score-label">Pilih skor</div><div className="focus-score-options">{([1, 2, 3, 4] as Score[]).map((score) => <button type="button" key={score} className={response?.score === score ? `selected score-${score}` : ''} onClick={() => onResponse(item.id, { score })}><strong>{score}</strong><span>{scoreLabels[score]}</span></button>)}</div><label className="focus-note"><span>{evidenceLabel}</span><textarea autoFocus value={response?.note ?? ''} onChange={(event) => onResponse(item.id, { note: event.target.value })} placeholder="Tulis catatan atau bukti yang terlihat..." rows={6} /></label></div><div className="focus-modal-footer"><button type="button" className="secondary-button compact" onClick={() => onNavigate(index - 1)} disabled={index === 0}><ArrowLeft size={14} /> Sebelumnya</button><span>{index + 1} / {total}</span><button type="button" className="primary-button compact" onClick={() => index === total - 1 ? onClose() : onNavigate(index + 1)}>{index === total - 1 ? 'Tutup' : 'Berikutnya'} {index < total - 1 && <ArrowRight size={14} />}</button></div></div></div>
}

function PostObservation({ assessment, onChange }: { assessment: Assessment; onChange: (next: Assessment) => void }) { const updateReflection = (key: string, value: string) => onChange({ ...assessment, reflection: { ...assessment.reflection, [key]: value } }); const updateFeedback = (aspect: string, field: 'strength' | 'development', value: string) => { const existing = assessment.feedback[aspect] ?? { strength: '', development: '' }; onChange({ ...assessment, feedback: { ...assessment.feedback, [aspect]: { ...existing, [field]: value } } }) }; const updateFollowUp = (index: number, field: 'action' | 'owner' | 'dueDate', value: string) => onChange({ ...assessment, followUps: assessment.followUps.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }); return <section className="post-stage"><div className="stage-intro"><div><h2>Refleksi & tindak lanjut</h2><p className="muted">Tutup proses supervisi dengan percakapan yang konkret dan disepakati bersama.</p></div></div><div className="post-section"><div className="section-title"><span>Refleksi guru</span><em>Diisi oleh guru</em></div>{reflectionQuestions.map(([key, question]) => <label className="long-field" key={key}><span>{question}</span><textarea value={assessment.reflection[key] ?? ''} onChange={(event) => updateReflection(key, event.target.value)} placeholder="Tulis refleksi guru..." rows={3} /></label>)}</div><div className="post-section"><div className="section-title"><span>Umpan balik supervisor</span><em>Kekuatan & area pengembangan</em></div><div className="feedback-table"><div className="feedback-header"><span>Aspek</span><span>Apresiasi / kekuatan</span><span>Area pengembangan</span></div>{feedbackAspects.map((aspect) => <div className="feedback-row" key={aspect}><strong>{aspect}</strong><textarea value={assessment.feedback[aspect]?.strength ?? ''} onChange={(event) => updateFeedback(aspect, 'strength', event.target.value)} placeholder="Apa yang sudah baik?" rows={3} /><textarea value={assessment.feedback[aspect]?.development ?? ''} onChange={(event) => updateFeedback(aspect, 'development', event.target.value)} placeholder="Apa yang perlu dikembangkan?" rows={3} /></div>)}</div></div><div className="post-section"><div className="section-title"><span>Rencana tindak lanjut</span><em>Kesepakatan bersama</em></div><div className="follow-up-list">{assessment.followUps.map((item, index) => <div className="follow-up-row" key={item.aspect}><strong>{item.aspect}</strong><input value={item.action} onChange={(event) => updateFollowUp(index, 'action', event.target.value)} placeholder="Tindak lanjut yang disepakati" /><input value={item.owner} onChange={(event) => updateFollowUp(index, 'owner', event.target.value)} placeholder="Penanggung jawab" /><input type="date" value={item.dueDate} onChange={(event) => updateFollowUp(index, 'dueDate', event.target.value)} /></div>)}</div><div className="form-grid two"><label>Catatan supervisor<textarea value={assessment.supervisorNote} onChange={(event) => onChange({ ...assessment, supervisorNote: event.target.value })} rows={4} placeholder="Catatan tambahan..." /></label><label>Rekomendasi / saran perbaikan<textarea value={assessment.recommendation} onChange={(event) => onChange({ ...assessment, recommendation: event.target.value })} rows={4} placeholder="Rekomendasi untuk periode berikutnya..." /></label></div></div></section> }

function PrintReport({ assessment, teacher }: { assessment: Assessment; teacher?: Teacher }) {
  const teacherName = teacher?.name ?? ''
  const subject = assessment.subject || teacher?.subject || ''
  const fields = { teacher: teacherName, school: 'SMKN Pasirian', className: assessment.className, subject, topic: assessment.topic }
  const observationGroups = [
    { section: 'Perencanaan di Kelas', title: 'A. PERENCANAAN DI KELAS', evidence: 'Catatan' },
    { section: 'Pelaksanaan Pembelajaran', title: 'B. PELAKSANAAN PEMBELAJARAN', evidence: 'Bukti Pembelajaran' },
    { section: 'Pengelolaan Kelas', title: 'C. PENGELOLAAN KELAS', evidence: 'Bukti Pembelajaran' },
    { section: 'Asesmen', title: 'E. ASESMEN', evidence: 'Catatan' },
    { section: 'Refleksi Guru', title: 'F. REFLEKSI GURU', evidence: 'Catatan' },
  ]
  const deepObservationGroups = [
    { section: 'Implementasi Pembelajaran Mendalam', title: '1. Keselarasan', evidence: 'Bukti Pembelajaran', itemNumbers: [9, 10] },
    { section: 'Kerangka Pembelajaran', title: '2. Kerangka Pembelajaran', evidence: 'Bukti Pembelajaran', itemNumbers: [11, 12, 13, 14] },
    { section: 'Langkah Pembelajaran', title: '3. Langkah Pembelajaran', evidence: 'Catatan', itemNumbers: [15, 16, 17, 18, 19, 20] },
  ]

  return <div className="print-report" aria-hidden="true">
    <PrintPreObservation fields={fields} responses={assessment.preObservation} year={assessment.period} />
    <PrintObservation fields={fields} responses={assessment.observation} assessment={assessment} groups={observationGroups} deepGroups={deepObservationGroups} year={assessment.period} />
    <PrintPostObservation fields={fields} assessment={assessment} />
    <PrintFlow />
  </div>
}

function PrintFields({ fields, includeSchool = false }: { fields: { teacher: string; school: string; className: string; subject: string; topic: string }; includeSchool?: boolean }) {
  const rows = includeSchool
    ? [['Nama Guru', fields.teacher], ['Nama Sekolah', fields.school], ['Mata Pelajaran', fields.subject]]
    : [['Nama Guru', fields.teacher], ['Kelas', fields.className], ['Mata Pelajaran', fields.subject], ['Materi Pokok', fields.topic]]
  return <div className="print-fields">{rows.map(([label, value]) => <div className="print-field" key={label}><span>{label}</span><b>:</b><strong>{value || '\u00a0'}</strong></div>)}</div>
}

function PrintPreObservation({ fields, responses, year }: { fields: Parameters<typeof PrintFields>[0]['fields']; responses: Assessment['preObservation']; year: string }) {
  return <section className="print-page print-pre-page">
    <PrintHeading title="Instrumen Telaah" subtitle="RPP/MODUL AJAR (Pra Observasi)" />
    <PrintFields fields={fields} includeSchool />
    <PrintRubricTable className="print-pre-table" items={preObservationItems} responses={responses} firstHeader="Komponen RPP/MA" indicatorHeader="Indikator Yang Diamati" evidenceHeader="Catatan" showTotal />
    <PrintAdditionalNotes />
    <PrintDate year={year} />
    <PrintSignature observer="Supervisor" detail="( Kepala sekolah & Pendamping Sekolah)" />
  </section>
}

function PrintHeading({ title, subtitle, italic }: { title: string; subtitle?: string; italic?: string }) {
  return <div className="print-heading"><h1>{title}</h1>{subtitle && <h2>{subtitle}</h2>}{italic && <p>{italic}</p>}</div>
}

function PrintRubricTable({ className, items, responses, firstHeader, indicatorHeader, evidenceHeader, showTotal = false }: { className: string; items: RubricItem[]; responses: Record<string, ScoredResponse>; firstHeader: string; indicatorHeader: string; evidenceHeader: string; showTotal?: boolean }) {
  return <table className={`print-table print-rubric-table ${className}`}><colgroup><col className="print-col-no" /><col className="print-col-first" /><col className="print-col-indicator" /><col className="print-col-score" /><col className="print-col-evidence" /></colgroup><thead><tr><th>No</th><th>{firstHeader}</th><th>{indicatorHeader}</th><th>Skor<br />(1–4)</th><th>{evidenceHeader}</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td className="print-center">{item.number}</td><td>{item.title}</td><td>{item.indicator}</td><td className="print-score">{responses[item.id]?.score ?? ''}</td><td>{responses[item.id]?.note || '\u00a0'}</td></tr>)}</tbody>{showTotal && <tfoot><tr className="print-total-row"><td colSpan={3}>Total Skor</td><td className="print-score">{totalScore(items, responses) || ''}</td><td>{'\u00a0'}</td></tr></tfoot>}</table>
}

function PrintObservation({ fields, responses, assessment, groups, deepGroups, year }: { fields: Parameters<typeof PrintFields>[0]['fields']; responses: Assessment['observation']; assessment: Assessment; groups: Array<{ section: string; title: string; evidence: string }>; deepGroups: Array<{ section: string; title: string; evidence: string; itemNumbers: number[] }>; year: string }) {
  const followUpText = assessment.followUps.map((item) => item.action.trim()).filter(Boolean).join(' | ')
  return <section className="print-page print-observation-page">
    <PrintHeading title="INSTRUMEN SUPERVISI PENGELOLAAN DAN PEMBELAJARAN DI KELAS" subtitle="(OBSERVASI)" italic="(Observasi & Umpan Balik Implementasi Pembelajaran Mendalam)" />
    <PrintFields fields={fields} />
    {groups.slice(0, 3).map((group) => { const items = observationItems.filter((item) => item.section === group.section); return <div className="print-observation-group" key={group.section}><h3>{group.title}</h3><PrintRubricTable className="print-observation-table" items={items} responses={responses} firstHeader="Aspek yang Diamati" indicatorHeader="Indikator" evidenceHeader={group.evidence} /></div> })}
    <div className="print-observation-group print-deep-group"><h3>D. IMPLEMENTASI PEMBELAJARAN MENDALAM</h3>{deepGroups.map((group) => { const items = observationItems.filter((item) => group.itemNumbers.includes(item.number)); return <div className="print-deep-subgroup" key={group.title}><h4>{group.title}</h4><PrintCompactRubricTable items={items} responses={responses} evidenceHeader={group.evidence} /></div> })}</div>
    {groups.slice(3).map((group) => { const items = observationItems.filter((item) => item.section === group.section); return <div className="print-observation-group" key={group.section}><h3>{group.title}</h3>{group.section === 'Refleksi Guru' ? <PrintCompactRubricTable items={items} responses={responses} evidenceHeader={group.evidence} firstHeader="Aspek Refleksi" /> : <PrintRubricTable className="print-observation-table" items={items} responses={responses} firstHeader="Aspek yang Diamati" indicatorHeader="Indikator" evidenceHeader={group.evidence} />}</div> })}
    <PrintTotalTable items={observationItems} responses={responses} />
    <PrintScoringGuide />
    <div className="print-summary-block"><h3>Catatan Supervisor:</h3><div className="print-dotted-line">{assessment.supervisorNote || '\u00a0'}</div><h3>Rekomendasi/Saran Perbaikan:</h3><div className="print-dotted-line">{assessment.recommendation || '\u00a0'}</div><h3>Tindak Lanjut:</h3><div className="print-dotted-line">{followUpText || '\u00a0'}</div></div>
    <PrintDate year={year} />
    <PrintSignature observer="Supervisor" detail="(Kepala Sekolah & Pendamping Sekolah)" />
  </section>
}

function PrintTotalTable({ items, responses }: { items: RubricItem[]; responses: Record<string, ScoredResponse> }) {
  return <table className="print-table print-total-table"><colgroup><col className="print-col-no" /><col className="print-col-first" /><col className="print-col-indicator" /><col className="print-col-score" /><col className="print-col-evidence" /></colgroup><tbody><tr className="print-total-row"><td colSpan={3}>Total Skor</td><td className="print-score">{totalScore(items, responses) || ''}</td><td>{'\u00a0'}</td></tr></tbody></table>
}

function PrintCompactRubricTable({ items, responses, evidenceHeader, firstHeader = 'Aspek yang Diamati' }: { items: RubricItem[]; responses: Record<string, ScoredResponse>; evidenceHeader: string; firstHeader?: string }) {
  return <table className="print-table print-compact-table"><colgroup><col className="print-col-no" /><col className="print-col-compact-aspect" /><col className="print-col-score" /><col className="print-col-evidence" /></colgroup><thead><tr><th>No</th><th>{firstHeader}</th><th>Skor<br />(1-4)</th><th>{evidenceHeader}</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td className="print-center">{item.number}</td><td>{item.indicator}</td><td className="print-score">{responses[item.id]?.score ?? ''}</td><td>{responses[item.id]?.note || '\u00a0'}</td></tr>)}</tbody></table>
}

function PrintScoringGuide() {
  return <div className="print-scoring-guide"><strong>SKORING</strong><span>1 = Tidak Tampak</span><span>2 = Kurang</span><span>3 = Baik</span><span>4 = Sangat Baik</span></div>
}

function PrintPostObservation({ fields, assessment }: { fields: Parameters<typeof PrintFields>[0]['fields']; assessment: Assessment }) {
  return <section className="print-page print-post-page">
    <PrintHeading title="INSTRUMEN PASCA OBSERVASI SUPERVISI PEMBELAJARAN" />
    <PrintFields fields={fields} />
    <h3 className="print-section-title">A. Refleksi Guru</h3>
    <table className="print-table print-reflection-table"><colgroup><col className="print-col-post-no" /><col className="print-col-question" /><col className="print-col-answer" /></colgroup><thead><tr><th>No</th><th>Pertanyaan Refleksi</th><th>Catatan Guru</th></tr></thead><tbody>{reflectionQuestions.map(([key, question], index) => <tr key={key}><td className="print-center">{index + 1}</td><td>{question}</td><td>{assessment.reflection[key] || '\u00a0'}</td></tr>)}</tbody></table>
    <h3 className="print-section-title">B. Umpan Balik Supervisor</h3>
    <table className="print-table print-feedback-table"><colgroup><col className="print-col-post-no" /><col className="print-col-feedback-aspect" /><col className="print-col-feedback" /><col className="print-col-feedback" /></colgroup><thead><tr><th>No</th><th>Aspek yang Diamati</th><th>Apresiasi (Kekuatan)</th><th>Area Pengembangan</th></tr></thead><tbody>{feedbackAspects.map((aspect, index) => <tr key={aspect}><td className="print-center">{index + 1}</td><td>{aspect}</td><td>{assessment.feedback[aspect]?.strength || '\u00a0'}</td><td>{assessment.feedback[aspect]?.development || '\u00a0'}</td></tr>)}</tbody></table>
    <h3 className="print-section-title">C. Rencana Tindak Lanjut</h3>
    <table className="print-table print-followup-table"><colgroup><col className="print-col-post-no" /><col className="print-col-followup-aspect" /><col className="print-col-action" /><col className="print-col-owner" /><col className="print-col-date" /></colgroup><thead><tr><th>No</th><th>Aspek</th><th>Tindak Lanjut yang Disepakati</th><th>Penanggung Jawab</th><th>Waktu Pelaksanaan</th></tr></thead><tbody>{assessment.followUps.map((item, index) => <tr key={item.aspect}><td className="print-center">{index + 1}</td><td>{item.aspect}</td><td>{item.action || '\u00a0'}</td><td>{item.owner || '\u00a0'}</td><td>{item.dueDate ? formatDate(item.dueDate) : '\u00a0'}</td></tr>)}</tbody></table>
    <div className="print-post-notes"><h3>Catatan Supervisor</h3><div className="print-dotted-line">{assessment.supervisorNote || '\u00a0'}</div><h3>Kesepakatan Bersama</h3><div className="print-dotted-line">{assessment.recommendation || '\u00a0'}</div></div>
    <div className="print-date-line">........................, {assessment.period}</div>
    <div className="print-signatures"><PrintSignature observer="Supervisor" detail="(Kepala Sekolah & Pendamping Sekolah)" /><PrintSignature observer="Guru" /></div>
  </section>
}

function PrintAdditionalNotes() {
  return <div className="print-additional-notes"><h3>Catatan Tambahan</h3>{['Tuliskan kelebihan Perencanaan Pembelajaran:', 'Tuliskan hal yang perlu ditingkatkan dari Perencanaan Pembelajaran:', 'Tuliskan rekomendasi dan lanjutkan dengan revisi Perencanaan Pembelajaran sesuai prinsip PM:'].map((label, index) => <div className="print-note-block" key={label}><strong>{String.fromCharCode(97 + index)}) &nbsp;{label}</strong><div className="print-dotted-line" /></div>)}</div>
}

function PrintSignature({ observer, detail }: { observer: string; detail?: string }) {
  return <div className="print-signature"><strong>{observer}</strong>{detail && <span>{detail}</span>}<div className="signature-space" /><span>(................................................)</span></div>
}

function PrintDate({ year }: { year: string }) {
  return <div className="print-date-line">........................, {year}</div>
}

function PrintFlow() {
  return <section className="print-page print-flow-page"><h2>Alur Pelaksanaan Observasi:</h2><ol><li>Instrumen Observasi → digunakan saat supervisi berlangsung.</li><li>Instrumen Pasca Observasi → digunakan setelah observasi, untuk refleksi guru dan umpan balik supervisor.</li><li>Tindak Lanjut → menjadi catatan bersama yang disepakati.</li></ol></section>
}

function Supervisors({ teachers, supervisors, onSupervisorsChange }: { teachers: Teacher[]; supervisors: Supervisor[]; onSupervisorsChange: (supervisors: Supervisor[]) => void }) {
  const [showDialog, setShowDialog] = useState(false)
  const [feedback, setFeedback] = useState('')
  const addSupervisor = (name: string, position: string) => {
    const duplicate = supervisors.some((supervisor) => supervisor.name.trim().toLowerCase() === name.trim().toLowerCase())
    if (duplicate) return 'Supervisor dengan nama tersebut sudah terdaftar.'
    const supervisor = { id: `supervisor-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: name.trim(), position: position.trim(), active: true }
    onSupervisorsChange([...supervisors, supervisor])
    setShowDialog(false)
    setFeedback(`${supervisor.name} berhasil ditambahkan.`)
    return undefined
  }
  const toggleSupervisor = (id: string) => onSupervisorsChange(supervisors.map((supervisor) => supervisor.id === id ? { ...supervisor, active: !supervisor.active } : supervisor))

  return <div className="page-wrap"><section className="welcome-row"><div><p className="eyebrow">Pengaturan data</p><h1>Supervisor</h1><p className="muted">Atur nama supervisor yang dapat dipilih pada informasi observasi.</p></div><button className="primary-button" onClick={() => setShowDialog(true)}><Plus size={18} /> Tambah supervisor</button></section><div className="panel table-panel"><div className="panel-head"><div><h2>{supervisors.length} supervisor terdaftar</h2><p className="muted">Supervisor nonaktif tidak muncul pada penilaian baru.</p></div></div>{feedback && <div className="csv-feedback success" role="status">{feedback}<button type="button" onClick={() => setFeedback('')} aria-label="Tutup pesan"><X size={14} /></button></div>}<div className="supervisor-table"><div className="supervisor-header"><span>Nama supervisor</span><span>Jabatan</span><span>Status</span><span /></div>{supervisors.map((supervisor) => <div className="supervisor-row" key={supervisor.id}><div className="teacher-cell"><div className="avatar navy">{makeTeacherInitials(supervisor.name)}</div><strong>{supervisor.name}</strong></div><span>{supervisor.position || '—'}</span><span className={`status-text ${supervisor.active ? 'complete' : ''}`}>{supervisor.active ? 'Aktif' : 'Nonaktif'}</span><button type="button" className="secondary-button compact supervisor-toggle" onClick={() => toggleSupervisor(supervisor.id)}>{supervisor.active ? 'Nonaktifkan' : 'Aktifkan'}</button></div>)}</div></div>{showDialog && <SupervisorDialog teachers={teachers} supervisors={supervisors} onClose={() => setShowDialog(false)} onSubmit={addSupervisor} />}</div>
}

function SupervisorDialog({ teachers, supervisors, onClose, onSubmit }: { teachers: Teacher[]; supervisors: Supervisor[]; onClose: () => void; onSubmit: (name: string, position: string) => string | undefined }) {
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [error, setError] = useState('')
  const existingNames = new Set(supervisors.map((supervisor) => supervisor.name.trim().toLowerCase()))
  const availableTeachers = teachers.filter((teacher) => !existingNames.has(teacher.name.trim().toLowerCase()))
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!name.trim()) { setError('Nama supervisor wajib diisi.'); return } const message = onSubmit(name, position); if (message) setError(message) }
  return <div className="teacher-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="teacher-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="supervisor-modal-title"><div className="teacher-modal-head"><div><span className="eyebrow">Pengaturan data</span><h2 id="supervisor-modal-title">Tambah supervisor</h2><p className="muted">Pilih nama dari daftar guru yang terdaftar.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Tutup"><X size={18} /></button></div><div className="teacher-form-fields"><label>Nama supervisor<select autoFocus value={name} onChange={(event) => setName(event.target.value)} disabled={availableTeachers.length === 0}><option value="">{availableTeachers.length ? 'Pilih nama guru...' : 'Semua guru sudah terdaftar'}</option>{availableTeachers.map((teacher) => <option key={teacher.id} value={teacher.name}>{teacher.name}</option>)}</select></label><label>Jabatan<input value={position} onChange={(event) => setPosition(event.target.value)} placeholder="Contoh: Kepala Sekolah" /></label></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="teacher-modal-footer"><button type="button" className="secondary-button compact" onClick={onClose}>Batal</button><button type="submit" className="primary-button compact" disabled={availableTeachers.length === 0}><Plus size={15} /> Tambahkan supervisor</button></div></form></div>
}

function Teachers({ teachers, assessments, onNew, onTeachersChange }: { teachers: Teacher[]; assessments: Assessment[]; onNew: () => void; onTeachersChange: (teachers: Teacher[]) => void }) {
  const [showDialog, setShowDialog] = useState(false)
  const [csvFeedback, setCsvFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const addTeacher = (name: string, subject: string) => {
    const duplicate = teachers.some((teacher) => teacher.name.trim().toLowerCase() === name.trim().toLowerCase())
    if (duplicate) return 'Guru dengan nama tersebut sudah terdaftar.'
    const newTeacher = createTeacher(name, subject, teachers.length)
    onTeachersChange([...teachers, newTeacher])
    setShowDialog(false)
    setCsvFeedback({ type: 'success', text: `${newTeacher.name} berhasil ditambahkan.` })
    return undefined
  }

  const handleCsvUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    const result = parseTeacherCsv(await file.text(), teachers)
    if (result.error) { setCsvFeedback({ type: 'error', text: result.error }); return }
    if (result.teachers.length === 0) { setCsvFeedback({ type: 'error', text: 'Tidak ada baris guru baru yang dapat diimpor.' }); return }
    onTeachersChange([...teachers, ...result.teachers])
    setCsvFeedback({ type: 'success', text: `${result.teachers.length} guru berhasil diimpor${result.skipped ? `, ${result.skipped} baris dilewati` : ''}.` })
  }

  return <div className="page-wrap"><section className="welcome-row"><div><p className="eyebrow">Data sekolah</p><h1>Daftar guru</h1><p className="muted">Kelola guru yang masuk dalam pemantauan kinerja.</p></div><button className="primary-button" onClick={onNew}><Plus size={18} /> Penilaian baru</button></section><div className="panel table-panel"><div className="panel-head teacher-panel-head"><div><h2>{teachers.length} guru terdaftar</h2><p className="muted">Tambahkan satu guru atau impor data dari CSV.</p></div><div className="teacher-actions"><button className="secondary-button compact" onClick={() => setShowDialog(true)}><Plus size={16} /> Tambah guru</button><label className="secondary-button compact upload-button" htmlFor="teacher-csv-upload"><Upload size={15} /> Unggah CSV</label><input id="teacher-csv-upload" className="visually-hidden" type="file" accept=".csv,text/csv" onChange={handleCsvUpload} /><button className="template-button" onClick={downloadTeacherTemplate}><Download size={14} /> Template CSV</button></div></div>{csvFeedback && <div className={`csv-feedback ${csvFeedback.type}`} role="status">{csvFeedback.text}<button type="button" onClick={() => setCsvFeedback(null)} aria-label="Tutup pesan"><X size={14} /></button></div>}<div className="teacher-table"><div className="teacher-header"><span>Guru</span><span>Mata pelajaran</span><span>Penilaian</span><span>Status terbaru</span></div>{teachers.map((teacher) => { const items = assessments.filter((assessment) => assessment.teacherId === teacher.id); const latest = items[0]; return <div className="teacher-row" key={teacher.id}><div className="teacher-cell"><div className="avatar" style={{ background: teacher.color }}>{teacher.initials}</div><strong>{teacher.name}</strong></div><span>{teacher.subject}</span><span>{items.length} penilaian</span><span className={`status-text ${latest?.status === 'selesai' ? 'complete' : ''}`}>{latest ? latest.status === 'selesai' ? 'Selesai' : 'Draf' : 'Belum ada'}</span></div> })}</div></div>{showDialog && <TeacherDialog onClose={() => setShowDialog(false)} onSubmit={addTeacher} />}</div>
}

function TeacherDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (name: string, subject: string) => string | undefined }) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!name.trim() || !subject.trim()) { setError('Nama guru dan mata pelajaran wajib diisi.'); return } const message = onSubmit(name, subject); if (message) setError(message) }
  return <div className="teacher-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="teacher-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="teacher-modal-title"><div className="teacher-modal-head"><div><span className="eyebrow">Data sekolah</span><h2 id="teacher-modal-title">Tambah guru</h2><p className="muted">Masukkan identitas guru yang akan dipantau.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Tutup"><X size={18} /></button></div><div className="teacher-form-fields"><label>Nama guru<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Siti Rahmawati, S.Pd." /></label><label>Mata pelajaran<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Contoh: Bahasa Indonesia" /></label></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="teacher-modal-footer"><button type="button" className="secondary-button compact" onClick={onClose}>Batal</button><button type="submit" className="primary-button compact"><Plus size={15} /> Tambahkan guru</button></div></form></div>
}

function createTeacher(name: string, subject: string, index: number): Teacher {
  return { id: `teacher-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: name.trim(), subject: subject.trim(), initials: makeTeacherInitials(name), color: teacherColors[index % teacherColors.length] }
}

const teacherColors = ['#d9d5ff', '#d6f0e5', '#ffe3cd', '#d3e9f4', '#f3d7e9']

function makeTeacherInitials(name: string) {
  const words = name.replace(/[,.]/g, '').trim().split(/\s+/).filter(Boolean)
  return (words.slice(0, 2).map((word) => word[0]).join('') || name.slice(0, 2)).toUpperCase()
}

function parseTeacherCsv(contents: string, existing: Teacher[]) {
  const lines = contents.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return { teachers: [] as Teacher[], skipped: 0, error: 'CSV harus memiliki baris header dan minimal satu data guru.' }
  const delimiter = (lines[0].match(/;/g) ?? []).length > (lines[0].match(/,/g) ?? []).length ? ';' : ','
  const headers = parseCsvLine(lines[0], delimiter).map((header) => header.toLowerCase().replace(/[^a-z0-9]/g, ''))
  const nameIndex = headers.findIndex((header) => ['nama', 'namaguru', 'name'].includes(header))
  const subjectIndex = headers.findIndex((header) => ['matapelajaran', 'mapel', 'subject'].includes(header))
  const initialsIndex = headers.findIndex((header) => ['inisial', 'initials'].includes(header))
  if (nameIndex < 0 || subjectIndex < 0) return { teachers: [] as Teacher[], skipped: 0, error: 'Header CSV wajib memuat kolom nama dan mata_pelajaran.' }
  const knownNames = new Set(existing.map((teacher) => teacher.name.trim().toLowerCase()))
  const imported: Teacher[] = []
  let skipped = 0
  lines.slice(1).forEach((line, index) => { const cells = parseCsvLine(line, delimiter); const name = cells[nameIndex]?.trim(); const subject = cells[subjectIndex]?.trim(); if (!name || !subject || knownNames.has(name.toLowerCase())) { skipped += 1; return } knownNames.add(name.toLowerCase()); imported.push({ id: `teacher-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`, name, subject, initials: cells[initialsIndex]?.trim().toUpperCase() || makeTeacherInitials(name), color: teacherColors[(existing.length + imported.length) % teacherColors.length] }) })
  return { teachers: imported, skipped }
}

function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) { const character = line[index]; const next = line[index + 1]; if (character === '"' && quoted && next === '"') { cell += '"'; index += 1 } else if (character === '"') quoted = !quoted; else if (character === delimiter && !quoted) { cells.push(cell); cell = '' } else cell += character }
  cells.push(cell)
  return cells
}

function downloadTeacherTemplate() {
  const csv = 'nama,mata_pelajaran,inisial\nSiti Rahmawati,Bahasa Indonesia,SR\nBudi Santoso,Informatika,BS\n'
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'template-guru-smkn-pasirian.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function Reports({ assessments, teachers, onOpen }: { assessments: Assessment[]; teachers: Teacher[]; onOpen: (assessment: Assessment) => void }) { const [query, setQuery] = useState(''); const filtered = assessments.filter((assessment) => teachers.find((teacher) => teacher.id === assessment.teacherId)?.name.toLowerCase().includes(query.toLowerCase())); return <div className="page-wrap"><section className="welcome-row"><div><p className="eyebrow">Dokumentasi</p><h1>Laporan supervisi</h1><p className="muted">Cari, tinjau, dan cetak hasil supervisi guru.</p></div></section><div className="panel table-panel"><div className="report-toolbar"><div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama guru..." /></div><span className="muted">{filtered.length} laporan</span></div>{filtered.length === 0 ? <EmptyState onNew={() => undefined} /> : <div className="report-list">{filtered.map((assessment) => { const teacher = teachers.find((item) => item.id === assessment.teacherId); return <button className="report-row" key={assessment.id} onClick={() => onOpen(assessment)}><div className="file-icon"><FileText size={19} /></div><div><strong>{teacher?.name ?? 'Guru belum dipilih'}</strong><span>{assessment.period} · {assessment.subject || teacher?.subject || '—'} · diperbarui {formatDate(assessment.updatedAt)}</span></div><span className={`status-badge ${assessment.status}`}>{assessment.status === 'selesai' ? 'Selesai' : 'Draf'}</span><ArrowRight size={17} /></button> })}</div>}</div></div> }

function formatDate(value: string) { return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) }

export default App

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  Archive, ArrowLeft, ArrowRight, BarChart3, Bell, BookOpenCheck, Check, ChevronDown, CircleAlert, ClipboardCheck,
  Download, FileDown, FileText, KeyRound, LayoutDashboard, LogOut, Maximize2, Menu, MoreHorizontal, Plus, RotateCcw, Search, Settings2, ShieldCheck,
  Sparkles, Trash2, Upload, UserRound, Users, X,
} from 'lucide-react'
import { feedbackAspects, followUpAspects, observationItems, preObservationItems, reflectionQuestions, scoreLabels } from './data/instrument'
import { bootstrapLocalAccounts, changePassword, getCurrentSession, getStoredSession, isBackendConfigured, signIn, signOut } from './lib/auth'
import { averageScore, completedCount, totalScore } from './lib/scoring'
import { defaultSettings, defaultSupervisors, getAssessments, getLocalDataSnapshot, getSettings, getSupervisors, getTeachers, hasCompletedLocalMigration, hasLocalData, makeId, markLocalMigrationCompleted } from './lib/storage'
import { createDataRepository, type MigrationResult } from './lib/data-repository'
import type { AppPage, AppSettings, Assessment, AuthSession, RubricItem, ScoredResponse, Score, Stage, Supervisor, Teacher, UserRole } from './types'

const steps: Array<{ id: Stage; label: string; short: string }> = [
  { id: 'pra-observasi', label: 'Pra-observasi', short: 'RPP / Modul Ajar' },
  { id: 'observasi', label: 'Observasi', short: 'Praktik di Kelas' },
  { id: 'pasca-observasi', label: 'Pasca-observasi', short: 'Refleksi & Tindak Lanjut' },
]

const freshAssessment = (teacherId = '', observer = defaultSupervisors[0]?.name ?? '', period = defaultSettings.defaultPeriod): Assessment => ({
  id: makeId(), teacherId, period, className: '', subject: '', topic: '', observer, observationDate: new Date().toISOString().slice(0, 10),
  status: 'draft', currentStage: 'pra-observasi', preObservation: {}, observation: {}, reflection: {}, feedback: {},
  followUps: followUpAspects.map((aspect) => ({ aspect, action: '', owner: '', dueDate: '' })), supervisorNote: '', recommendation: '',
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
})

function App() {
  const [page, setPage] = useState<AppPage>('dashboard')
  const [isBooting, setIsBooting] = useState(true)
  const [authReady, setAuthReady] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [teachers, setTeachers] = useState<Teacher[]>(() => getTeachers())
  const [supervisors, setSupervisors] = useState<Supervisor[]>(() => getSupervisors())
  const [settings, setSettings] = useState<AppSettings>(() => getSettings())
  const [assessments, setAssessments] = useState<Assessment[]>(() => getAssessments())
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession())
  const [dataReady, setDataReady] = useState(false)
  const [dataError, setDataError] = useState('')
  const [showMigration, setShowMigration] = useState(false)
  const [migrationBusy, setMigrationBusy] = useState(false)
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null)
  const [active, setActive] = useState<Assessment | null>(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const repository = useRef(createDataRepository(!isBackendConfigured)).current

  const persistAssessment = async (next: Assessment, message = 'Perubahan tersimpan') => {
    try {
      const updated = await repository.saveAssessment({ ...next, updatedAt: new Date().toISOString() })
      const nextList = [updated, ...assessments.filter((item) => item.id !== updated.id && item.id !== next.id)]
      setAssessments(nextList)
      setActive(updated)
      setToast(message)
      window.setTimeout(() => setToast(''), 2600)
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : 'Perubahan gagal disimpan.')
    }
  }

  const persistTeachers = async (next: Teacher[], removedId?: string) => {
    try {
      const saved = await repository.saveTeachers(next)
      if (removedId) await repository.deleteTeacher(removedId)
      setTeachers(saved)
    } catch (reason) { const error = reason instanceof Error ? reason : new Error('Data guru gagal disimpan.'); setToast(error.message); throw error }
  }
  const persistSupervisors = async (next: Supervisor[]) => {
    try { setSupervisors(await repository.saveSupervisors(next)) } catch (reason) { const error = reason instanceof Error ? reason : new Error('Data supervisor gagal disimpan.'); setToast(error.message); throw error }
  }
  const persistSettings = async (next: AppSettings) => {
    try { setSettings(await repository.saveSettings(next)) } catch (reason) { const error = reason instanceof Error ? reason : new Error('Pengaturan gagal disimpan.'); setToast(error.message); throw error }
  }

  const loadRemoteData = async (nextSession: AuthSession) => {
    if (nextSession.backend !== 'sqlite') { setDataReady(true); return }
    setDataReady(false)
    setDataError('')
    try {
      const loaded = await repository.load(nextSession.role)
      setTeachers(loaded.teachers)
      setSupervisors(loaded.supervisors)
      setAssessments(loaded.assessments)
      setSettings(loaded.settings)
      setDataReady(true)
      if (nextSession.role === 'admin' && hasLocalData() && !hasCompletedLocalMigration()) setShowMigration(true)
    } catch (reason) {
      setDataError(reason instanceof Error ? reason.message : 'Data SQLite gagal dimuat.')
      setDataReady(true)
    }
  }

  const migrateLocalData = async () => {
    if (!session || session.backend !== 'sqlite') return
    setMigrationBusy(true)
    try {
      const result = await repository.migrate(getLocalDataSnapshot())
      const loaded = await repository.load(session.role)
      setTeachers(loaded.teachers); setSupervisors(loaded.supervisors); setAssessments(loaded.assessments); setSettings(loaded.settings)
      markLocalMigrationCompleted()
      setMigrationResult(result)
      setShowMigration(false)
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : 'Migrasi data gagal.')
    } finally { setMigrationBusy(false) }
  }

  useEffect(() => { void getCurrentSession().then((nextSession) => { setSession(nextSession); setAuthReady(true) }) }, [])
  useEffect(() => { bootstrapLocalAccounts(supervisors) }, [supervisors])
  useEffect(() => { if (session) void loadRemoteData(session) }, [session?.userId])

  const startAssessment = () => {
    setActive(freshAssessment('', supervisors.find((item) => item.active)?.name ?? '', settings.defaultPeriod))
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

  const handleSignIn = async (input: { username: string; password: string; role: UserRole; teacherId?: string }) => {
    const nextSession = await signIn({ ...input, supervisors, teachers })
    setSession(nextSession)
    setPage(nextSession.role === 'guru' ? 'reports' : 'dashboard')
  }

  const handleSignOut = async () => { await signOut(); setSession(null); setActive(null); setPage('dashboard') }

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => setIsBooting(false), reducedMotion ? 80 : 720)
    return () => window.clearTimeout(timer)
  }, [])

  const completeSupervisorSetup = async (teacherId: string) => {
    const teacher = teachers.find((item) => item.id === teacherId)
    if (!teacher) return
    const existing = supervisors.find((item) => item.name.trim().toLowerCase() === teacher.name.trim().toLowerCase())
    const selected: Supervisor = existing ?? { id: `supervisor-${Date.now()}`, name: teacher.name, position: 'Supervisor', active: true }
    const nextSupervisors = [{ ...selected, active: true }, ...supervisors.filter((item) => item.id !== selected.id).map((item) => item.id === 's-1' && item.name === 'Kepala Sekolah' ? { ...item, active: false } : item)]
    const nextSettings = { ...settings, supervisorSetupComplete: true }
    await persistSupervisors(nextSupervisors)
    await persistSettings(nextSettings)
  }

  if (isBooting || !authReady) return <LoadingScreen schoolName={settings.schoolName} />
  if (!session) return <LoginScreen teachers={teachers} backendConfigured={isBackendConfigured} onSubmit={handleSignIn} />
  if (!dataReady) return <DataLoadingScreen schoolName={settings.schoolName} />
  if (dataError) return <DataErrorScreen message={dataError} onRetry={() => void loadRemoteData(session)} onSignOut={handleSignOut} />
  if (session.mustChangePassword || showPasswordChange) return <PasswordChangeScreen session={session} supervisors={supervisors} required={session.mustChangePassword} onComplete={(nextSession) => { setSession(nextSession); setShowPasswordChange(false) }} onCancel={() => setShowPasswordChange(false)} onSignOut={handleSignOut} />
  if (showMigration && session.role === 'admin') return <DataMigrationDialog busy={migrationBusy} onMigrate={migrateLocalData} onClose={() => setShowMigration(false)} />
  if (!settings.supervisorSetupComplete && session.role === 'admin' && teachers.some((teacher) => teacher.active !== false)) return <SupervisorSetup teachers={teachers} onComplete={completeSupervisorSetup} />

  const isAdmin = session.role === 'admin'
  const isGuru = session.role === 'guru'
  const visibleAssessments = isGuru ? assessments.filter((item) => item.teacherId === session.teacherId) : assessments
  const visibleTeachers = isGuru ? teachers.filter((item) => item.id === session.teacherId) : teachers
  const canManage = !isGuru

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'is-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={21} /></div>
          <div><strong>supervisi</strong><span>{settings.schoolName}</span></div>
        </div>
        <div className="sidebar-label">Ruang kerja</div>
        <nav>
          <NavItem icon={<LayoutDashboard size={18} />} label="Ringkasan" active={page === 'dashboard'} onClick={() => navigate('dashboard')} />
          {!isGuru && <NavItem icon={<ClipboardCheck size={18} />} label="Penilaian" active={page === 'assessment'} onClick={() => navigate('assessment')} />}
          {isAdmin && <NavItem icon={<Users size={18} />} label="Daftar guru" active={page === 'teachers'} onClick={() => navigate('teachers')} />}
          {isAdmin && <NavItem icon={<Settings2 size={18} />} label="Supervisor" active={page === 'supervisors'} onClick={() => navigate('supervisors')} />}
          <NavItem icon={<BarChart3 size={18} />} label="Laporan" active={page === 'reports'} onClick={() => navigate('reports')} />
          {isAdmin && <NavItem icon={<Settings2 size={18} />} label="Pengaturan" active={page === 'settings'} onClick={() => navigate('settings')} />}
        </nav>
        <div className="sidebar-spacer" />
        <div className="help-card"><Sparkles size={18} /><strong>Ruang refleksi</strong><span>Supervisi adalah percakapan untuk tumbuh bersama.</span></div>
        {isAdmin && <button className={`sidebar-footer ${page === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')}><Settings2 size={17} /><span>Pengaturan</span></button>}
      </aside>
      {mobileNav && <button className="mobile-overlay" onClick={() => setMobileNav(false)} aria-label="Tutup menu" />}
      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Buka menu"><Menu size={22} /></button>
          <div className="breadcrumbs"><span>{settings.schoolName}</span><span className="slash">/</span><strong>{page === 'dashboard' ? 'Ringkasan' : page === 'assessment' ? 'Penilaian' : page === 'teachers' ? 'Daftar guru' : page === 'supervisors' ? 'Supervisor' : page === 'settings' ? 'Pengaturan' : 'Laporan'}</strong></div>
          <div className="topbar-actions">{!isGuru && <NotificationBell assessments={visibleAssessments} teachers={visibleTeachers} onOpen={editAssessment} onNew={startAssessment} />}<div className="profile"><div className="avatar navy"><UserRound size={16} /></div><div><strong>{session.displayName}</strong><span>{roleLabel(session.role)}</span></div>{session.role === 'supervisor' && <button className="profile-password" type="button" onClick={() => setShowPasswordChange(true)} aria-label="Ganti password"><KeyRound size={15} /></button>}<button className="profile-logout" type="button" onClick={handleSignOut} aria-label="Keluar"><LogOut size={15} /></button></div></div>
        </header>
        {page === 'dashboard' && <Dashboard assessments={visibleAssessments} teachers={visibleTeachers} displayName={session.displayName} canCreate={canManage} onNew={startAssessment} onOpen={editAssessment} />}
        {page === 'teachers' && isAdmin && <Teachers teachers={teachers} assessments={assessments} onNew={startAssessment} onTeachersChange={persistTeachers} />}
        {page === 'supervisors' && isAdmin && <Supervisors teachers={teachers} supervisors={supervisors} onSupervisorsChange={persistSupervisors} />}
        {page === 'settings' && isAdmin && <SettingsPage settings={settings} onSettingsChange={persistSettings} />}
        {page === 'reports' && <Reports assessments={visibleAssessments} teachers={visibleTeachers} onOpen={editAssessment} />}
        {page === 'assessment' && <AssessmentWorkspace assessment={active ?? visibleAssessments[0] ?? freshAssessment('', supervisors.find((item) => item.active)?.name ?? '', settings.defaultPeriod)} teachers={visibleTeachers} supervisors={supervisors} settings={settings} readOnly={isGuru} onBack={() => navigate(isGuru ? 'reports' : 'dashboard')} onSave={persistAssessment} />}
      </main>
      {toast && <div className="toast"><Check size={16} />{toast}</div>}
      {migrationResult && <MigrationResultNotice result={migrationResult} onClose={() => setMigrationResult(null)} />}
    </div>
  )
}

function roleLabel(role: UserRole) { return role === 'admin' ? 'Administrator' : role === 'supervisor' ? 'Supervisor' : 'Guru · baca saja' }

function LoadingScreen({ schoolName }: { schoolName: string }) {
  return <div className="startup-screen loading-screen"><div className="startup-brand"><div className="startup-mark"><ShieldCheck size={26} /></div><strong>supervisi</strong><span>{schoolName}</span></div><div className="loading-indicator" aria-label="Memuat aplikasi"><i /></div><p>Menyiapkan ruang supervisi...</p></div>
}

function DataLoadingScreen({ schoolName }: { schoolName: string }) {
  return <div className="startup-screen loading-screen"><div className="startup-brand"><div className="startup-mark"><ShieldCheck size={26} /></div><strong>supervisi</strong><span>{schoolName}</span></div><div className="loading-indicator" aria-label="Memuat data"><i /></div><p>Mengambil data dari server...</p></div>
}

function DataErrorScreen({ message, onRetry, onSignOut }: { message: string; onRetry: () => void; onSignOut: () => Promise<void> }) {
  return <div className="startup-screen setup-screen"><div className="setup-card"><div className="startup-mark"><CircleAlert size={26} /></div><p className="eyebrow">Koneksi data</p><h1>Data belum dapat dimuat</h1><p className="setup-intro">Aplikasi produksi tidak menggunakan data lokal sebagai pengganti agar data antar-browser tetap konsisten.</p><p className="setup-error" role="alert">{message}</p><div className="teacher-modal-footer"><button className="secondary-button compact" onClick={() => void onSignOut()}>Keluar</button><button className="primary-button compact" onClick={onRetry}><RotateCcw size={16} /> Coba lagi</button></div></div></div>
}

function DataMigrationDialog({ busy, onMigrate, onClose }: { busy: boolean; onMigrate: () => Promise<void>; onClose: () => void }) {
  const local = getLocalDataSnapshot()
  return <div className="teacher-modal-backdrop" role="presentation"><div className="teacher-modal" role="dialog" aria-modal="true" aria-labelledby="migration-title"><div className="teacher-modal-head"><div><span className="eyebrow">Sinkronisasi data</span><h2 id="migration-title">Pindahkan data browser lama?</h2><p className="muted">Data lokal ditemukan di browser ini. Pindahkan ke SQLite agar dapat dibuka dari browser atau perangkat lain.</p></div><button type="button" className="icon-button" onClick={onClose} disabled={busy} aria-label="Tutup"><X size={18} /></button></div><div className="migration-summary"><span><strong>{local.teachers.length}</strong> guru</span><span><strong>{local.supervisors.length}</strong> supervisor</span><span><strong>{local.assessments.length}</strong> penilaian</span></div><p className="muted">Data server yang sudah ada akan dipertahankan. Data lokal hanya ditambahkan jika belum ditemukan, tanpa menghapus cadangan lokal.</p><div className="teacher-modal-footer"><button type="button" className="secondary-button compact" onClick={onClose} disabled={busy}>Nanti</button><button type="button" className="primary-button compact" onClick={() => void onMigrate()} disabled={busy}>{busy ? 'Memindahkan...' : 'Migrasikan ke SQLite'}</button></div></div></div>
}

function MigrationResultNotice({ result, onClose }: { result: MigrationResult; onClose: () => void }) {
  return <div className="migration-result" role="status"><div><strong>Sinkronisasi selesai</strong><span>{result.teachersAdded} guru, {result.supervisorsAdded} supervisor, dan {result.assessmentsAdded} penilaian ditambahkan.</span>{(result.skippedAssessments || result.skippedSupervisors) > 0 && <small>{result.skippedAssessments + result.skippedSupervisors} data dilewati karena sudah ada atau relasinya tidak ditemukan.</small>}</div><button type="button" onClick={onClose} aria-label="Tutup notifikasi"><X size={16} /></button></div>
}

function SupervisorSetup({ teachers, onComplete }: { teachers: Teacher[]; onComplete: (teacherId: string) => Promise<void> }) {
  const [teacherId, setTeacherId] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!teacherId) { setError('Pilih nama supervisor terlebih dahulu.'); return } try { await onComplete(teacherId) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Supervisor gagal disimpan.') } }
  const activeTeachers = teachers.filter((teacher) => teacher.active !== false)
  return <div className="startup-screen setup-screen"><div className="setup-card"><div className="startup-mark"><ShieldCheck size={26} /></div><p className="eyebrow">Penyiapan awal</p><h1>Selamat datang di supervisi</h1><p className="setup-intro">Sebelum membuka dashboard, tentukan nama supervisor yang akan digunakan pada penilaian.</p><form onSubmit={submit}><label>Nama supervisor<select autoFocus value={teacherId} onChange={(event) => { setTeacherId(event.target.value); setError('') }} disabled={activeTeachers.length === 0}><option value="">{activeTeachers.length ? 'Pilih nama guru...' : 'Belum ada guru terdaftar'}</option>{activeTeachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>{activeTeachers.length === 0 && <p className="setup-error">Tambahkan guru terlebih dahulu agar nama supervisor dapat dipilih.</p>}{error && <p className="setup-error">{error}</p>}<button type="submit" className="primary-button" disabled={!activeTeachers.length}><Check size={17} /> Simpan & buka dashboard</button></form><small>Nama ini dapat dikelola kembali melalui menu Supervisor.</small></div></div>
}

function LoginScreen({ teachers, backendConfigured, onSubmit }: { teachers: Teacher[]; backendConfigured: boolean; onSubmit: (input: { username: string; password: string; role: UserRole; teacherId?: string }) => Promise<void> }) {
  const [role, setRole] = useState<UserRole>('admin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [error, setError] = useState('')
  const selectedTeacher = teachers.find((teacher) => teacher.id === teacherId)
  const backendGuruLogin = backendConfigured && role === 'guru'
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    try {
      await onSubmit({ username: role === 'guru' && !backendGuruLogin ? usernameFromName(selectedTeacher?.name ?? '') : username, password, role, teacherId: role === 'guru' && !backendGuruLogin ? teacherId : undefined })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Login gagal. Periksa kembali data akun.')
    }
  }
  const activeTeachers = teachers.filter((teacher) => teacher.active !== false)
  return <div className="startup-screen login-screen"><div className="login-card"><div className="startup-mark"><ShieldCheck size={26} /></div><p className="eyebrow">Akses ruang supervisi</p><h1>Masuk ke supervisi</h1><p className="setup-intro">Pilih peran sesuai akun untuk membuka data yang tersedia.</p><form onSubmit={submit}><label>Peran<select value={role} onChange={(event) => { const nextRole = event.target.value as UserRole; setRole(nextRole); setUsername(''); setPassword(''); setTeacherId(''); setError('') }}><option value="admin">Admin</option><option value="supervisor">Supervisor</option><option value="guru">Guru · baca saja</option></select></label>{role === 'guru' && !backendGuruLogin ? <label>Nama guru<select autoFocus value={teacherId} onChange={(event) => { const nextTeacherId = event.target.value; setTeacherId(nextTeacherId); setUsername(''); setError('') }}><option value="">Pilih nama Anda...</option>{activeTeachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label> : <label>Username<input autoFocus value={username} onChange={(event) => setUsername(event.target.value)} placeholder={role === 'supervisor' ? 'Contoh: Nurdiana' : role === 'guru' ? 'Nama depan guru' : 'Masukkan username admin'} autoComplete="username" /></label>}{(role !== 'guru' || backendGuruLogin) && <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan password" autoComplete="current-password" /></label>}{role === 'guru' && <p className="login-readonly-note"><UserRound size={15} /> {backendGuruLogin ? 'Masukkan username dan password akun guru Anda.' : 'Mode lokal: pilih nama untuk melihat data pribadi. Mode guru tetap read-only.'}</p>}{error && <p className="setup-error" role="alert">{error}</p>}<button type="submit" className="primary-button" disabled={role === 'guru' ? (backendGuruLogin ? !username || !password : !teacherId) : !username || !password}><KeyRound size={17} /> Masuk</button></form><small>Supervisor baru menggunakan password awal <strong>supervisorsmakenpas</strong> dan wajib menggantinya saat pertama masuk.</small></div></div>
}

function PasswordChangeScreen({ session, supervisors, required, onComplete, onCancel, onSignOut }: { session: AuthSession; supervisors: Supervisor[]; required: boolean; onComplete: (session: AuthSession) => void; onCancel: () => void; onSignOut: () => Promise<void> }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (nextPassword !== confirmation) { setError('Konfirmasi password baru belum sama.'); return }
    setSaving(true)
    setError('')
    try { onComplete(await changePassword(session, currentPassword, nextPassword, supervisors)) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Password gagal diperbarui.') } finally { setSaving(false) }
  }
  return <div className="startup-screen login-screen"><div className="login-card"><div className="startup-mark"><KeyRound size={25} /></div><p className="eyebrow">Keamanan akun</p><h1>Ganti password</h1><p className="setup-intro">{required ? 'Password awal supervisor harus diganti sebelum dashboard dapat digunakan.' : 'Perbarui password supervisor secara berkala untuk menjaga keamanan akun.'}</p><form onSubmit={submit}><label>Password saat ini<input type="password" autoFocus value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></label><label>Password baru<input type="password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} minLength={8} autoComplete="new-password" /></label><label>Ulangi password baru<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} autoComplete="new-password" /></label>{error && <p className="setup-error" role="alert">{error}</p>}<button type="submit" className="primary-button" disabled={saving || !currentPassword || nextPassword.length < 8 || !confirmation}>{saving ? 'Menyimpan...' : 'Simpan password'}</button></form>{!required && <button type="button" className="text-button login-signout" onClick={onCancel}>Batal</button>}<button type="button" className="text-button login-signout" onClick={onSignOut}><LogOut size={15} /> Keluar</button></div></div>
}

function usernameFromName(name: string) { return name.trim().split(/\s+/)[0] ?? '' }

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{active && <span className="nav-pip" />}</button>
}

type AppNotification = { id: string; title: string; detail: string; assessmentId?: string; tone: 'warning' | 'info' | 'success' }

function NotificationBell({ assessments, teachers, onOpen, onNew }: { assessments: Assessment[]; teachers: Teacher[]; onOpen: (assessment: Assessment) => void; onNew: () => void }) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const notifications = buildNotifications(assessments, teachers)
  useEffect(() => {
    if (!open) return undefined
    const closeOnOutsideClick = (event: MouseEvent) => { if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [open])
  const openNotification = (notification: AppNotification) => {
    setOpen(false)
    const assessment = notification.assessmentId ? assessments.find((item) => item.id === notification.assessmentId) : undefined
    if (assessment) onOpen(assessment)
    else onNew()
  }
  return <div className="notification-center" ref={panelRef}><button type="button" className="icon-button notification-trigger" aria-label={`${notifications.length} notifikasi`} aria-expanded={open} onClick={() => setOpen((current) => !current)}><Bell size={18} />{notifications.length > 0 && <span className="notification-badge">{notifications.length > 9 ? '9+' : notifications.length}</span>}</button>{open && <div className="notification-panel"><div className="notification-panel-head"><div><strong>Notifikasi</strong><span>{notifications.length ? `${notifications.length} hal perlu diperhatikan` : 'Semua sudah tertangani'}</span></div><button type="button" className="notification-close" onClick={() => setOpen(false)} aria-label="Tutup notifikasi"><X size={15} /></button></div>{notifications.length === 0 ? <div className="notification-empty"><Check size={20} /><span>Tidak ada pengingat baru.</span></div> : <div className="notification-list">{notifications.map((notification) => <button type="button" className="notification-item" key={notification.id} onClick={() => openNotification(notification)}><span className={`notification-item-icon ${notification.tone}`}>{notification.tone === 'success' ? <Check size={15} /> : <CircleAlert size={15} />}</span><span className="notification-item-copy"><strong>{notification.title}</strong><small>{notification.detail}</small></span><ArrowRight size={15} /></button>)}</div>}</div>}</div>
}

function buildNotifications(assessments: Assessment[], teachers: Teacher[]) {
  if (assessments.length === 0) return [{ id: 'new-assessment', title: 'Belum ada penilaian', detail: 'Mulai penilaian kinerja guru pertama.', tone: 'info' as const }]
  const notifications: AppNotification[] = []
  assessments.slice(0, 20).forEach((assessment) => {
    if (assessment.status === 'selesai') return
    const teacherName = teachers.find((teacher) => teacher.id === assessment.teacherId)?.name ?? 'Guru belum dipilih'
    const missing = getMissingObservationInfo(assessment)
    const preDone = completedCount(preObservationItems, assessment.preObservation) === preObservationItems.length
    const observationDone = completedCount(observationItems, assessment.observation) === observationItems.length
    if (missing.length > 0) {
      notifications.push({ id: `${assessment.id}-identity`, title: `Lengkapi informasi · ${teacherName}`, detail: missing.slice(0, 3).join(', '), assessmentId: assessment.id, tone: 'warning' })
      return
    }
    if (assessment.currentStage === 'pra-observasi' && preDone) {
      notifications.push({ id: `${assessment.id}-observation-ready`, title: `Observasi siap dimulai · ${teacherName}`, detail: 'Pra-observasi selesai. Buka penilaian untuk melanjutkan.', assessmentId: assessment.id, tone: 'success' })
    } else if (assessment.currentStage === 'pra-observasi') {
      notifications.push({ id: `${assessment.id}-pre`, title: `Pra-observasi belum selesai · ${teacherName}`, detail: `${completedCount(preObservationItems, assessment.preObservation)} dari ${preObservationItems.length} butir sudah dinilai.`, assessmentId: assessment.id, tone: 'warning' })
    } else if (assessment.currentStage === 'observasi' && !observationDone) {
      notifications.push({ id: `${assessment.id}-observation`, title: `Observasi perlu dituntaskan · ${teacherName}`, detail: `${completedCount(observationItems, assessment.observation)} dari ${observationItems.length} butir sudah dinilai.`, assessmentId: assessment.id, tone: 'warning' })
    } else if (assessment.currentStage === 'observasi' && observationDone) {
      notifications.push({ id: `${assessment.id}-post-ready`, title: `Pasca-observasi siap dimulai · ${teacherName}`, detail: 'Observasi selesai. Buka penilaian untuk mengisi refleksi dan tindak lanjut.', assessmentId: assessment.id, tone: 'success' })
    } else if (assessment.currentStage === 'pasca-observasi') {
      const reflectionDone = reflectionQuestions.every(([key]) => Boolean(assessment.reflection[key]?.trim()))
      const feedbackDone = feedbackAspects.every((aspect) => Boolean(assessment.feedback[aspect]?.strength?.trim() && assessment.feedback[aspect]?.development?.trim()))
      const followUpDone = assessment.followUps.every((item) => Boolean(item.action.trim()))
      const detail = !reflectionDone ? 'Lengkapi refleksi guru.' : !feedbackDone ? 'Lengkapi umpan balik supervisor.' : !followUpDone ? 'Isi rencana tindak lanjut.' : 'Tandai penilaian sebagai selesai.'
      notifications.push({ id: `${assessment.id}-post`, title: `Pasca-observasi perlu dituntaskan · ${teacherName}`, detail, assessmentId: assessment.id, tone: 'info' })
    }
  })
  return notifications
}

function Dashboard({ assessments, teachers, displayName = 'Kepala Sekolah', canCreate = true, onNew, onOpen }: { assessments: Assessment[]; teachers: Teacher[]; displayName?: string; canCreate?: boolean; onNew: () => void; onOpen: (assessment: Assessment) => void }) {
  const done = assessments.filter((item) => item.status === 'selesai').length
  const inProgress = assessments.filter((item) => item.status === 'draft').length
  return <div className="page-wrap">
    <section className="welcome-row"><div><p className="eyebrow">Jumat, 21 Agustus 2026</p><h1>Selamat datang, {displayName}.</h1><p className="muted">{canCreate ? 'Mari melihat perkembangan supervisi pembelajaran di sekolah.' : 'Berikut ringkasan data supervisi Anda.'}</p></div>{canCreate && <button className="primary-button" onClick={onNew}><Plus size={18} /> Penilaian baru</button>}</section>
    <section className="stats-grid"><StatCard icon={<Users size={19} />} label="Guru dalam pemantauan" value={String(teachers.length)} detail="Tahun ajaran 2026" tone="mint" /><StatCard icon={<ClipboardCheck size={19} />} label="Penilaian selesai" value={String(done)} detail="Dari seluruh penilaian" tone="blue" /><StatCard icon={<FileText size={19} />} label="Masih berjalan" value={String(inProgress)} detail="Perlu ditindaklanjuti" tone="peach" /><StatCard icon={<Sparkles size={19} />} label="Rata-rata sekolah" value={assessments.length ? `${(assessments.reduce((sum, a) => sum + averageScore(observationItems, a.observation), 0) / assessments.length || 0).toFixed(1)}` : '—'} detail="Skala 1 sampai 4" tone="lilac" /></section>
    <section className="content-grid"><div className="panel recent-panel"><div className="panel-head"><div><h2>Aktivitas terbaru</h2><p className="muted">Perubahan terakhir pada penilaian guru.</p></div>{canCreate && <button className="text-button" onClick={onNew}>Lihat semua <ArrowRight size={15} /></button>}</div>{assessments.length === 0 ? <EmptyState onNew={canCreate ? onNew : undefined} /> : <div className="activity-list">{assessments.slice(0, 5).map((assessment) => <AssessmentRow key={assessment.id} assessment={assessment} teachers={teachers} onClick={() => onOpen(assessment)} />)}</div>}</div><div className="panel cycle-panel"><div className="panel-head"><div><h2>Siklus supervisi</h2><p className="muted">Alur pendampingan pembelajaran.</p></div><MoreHorizontal size={18} className="muted" /></div><div className="cycle-list"><CycleStep number="01" title="Pra-observasi" detail="Telaah RPP / Modul Ajar" done={assessments.length > 0} /><CycleStep number="02" title="Observasi" detail="Praktik pembelajaran di kelas" done={assessments.some((a) => a.currentStage !== 'pra-observasi')} /><CycleStep number="03" title="Pasca-observasi" detail="Refleksi dan umpan balik" done={assessments.some((a) => a.status === 'selesai')} /></div><div className="cycle-quote">“Yang kita cari bukan kesempurnaan, tetapi langkah kecil yang berarti.”</div></div></section>
  </div>
}

function StatCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: string }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div> }
function CycleStep({ number, title, detail, done }: { number: string; title: string; detail: string; done: boolean }) { return <div className="cycle-step"><div className={`step-number ${done ? 'done' : ''}`}>{done ? <Check size={15} /> : number}</div><div><strong>{title}</strong><span>{detail}</span></div><span className={`step-status ${done ? 'complete' : ''}`}>{done ? 'Selesai' : 'Berikutnya'}</span></div> }
function EmptyState({ onNew }: { onNew?: () => void }) { return <div className="empty-state"><BookOpenCheck size={32} /><strong>Belum ada penilaian</strong><span>{onNew ? 'Mulai dari membuat penilaian untuk seorang guru.' : 'Belum ada laporan penilaian untuk akun ini.'}</span>{onNew && <button className="secondary-button" onClick={onNew}>Buat penilaian pertama</button>}</div> }
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

function AssessmentWorkspace({ assessment: initial, teachers, supervisors, settings, readOnly = false, onBack, onSave }: { assessment: Assessment; teachers: Teacher[]; supervisors: Supervisor[]; settings: AppSettings; readOnly?: boolean; onBack: () => void; onSave: (assessment: Assessment, message?: string) => void }) {
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
  return <div className={`page-wrap workspace-page ${readOnly ? 'read-only-workspace' : ''}`}>
    <div className="workspace-top"><button className="back-button" onClick={onBack}><ArrowLeft size={17} /> Kembali ke ringkasan</button><div className="workspace-actions"><span className={`status-badge ${assessment.status}`}>{assessment.status === 'selesai' ? <Check size={14} /> : <span className="status-dot" />}{assessment.status === 'selesai' ? 'Selesai' : 'Draf'}</span>{!readOnly && <button className="secondary-button compact" onClick={() => save()}><Check size={16} /> Simpan draf</button>}</div></div>
    <div className="workspace-heading"><div><p className="eyebrow">Penilaian kinerja guru · {assessment.period}</p><h1>{teacher?.name ?? 'Penilaian baru'}</h1><p className="muted">Lengkapi instrumen secara bertahap. Perubahan tersimpan sebagai draf.</p></div><button className="icon-button outlined" aria-label="Unduh laporan" onClick={() => window.print()}><FileDown size={18} /></button></div>
    <fieldset disabled={readOnly} className="workspace-fields">
      {showMeta && <MetaForm assessment={assessment} teachers={teachers} supervisors={supervisors} onChange={update} onClose={() => { save('Identitas observasi tersimpan'); setShowMeta(false) }} />}
      {!showMeta && <button className={`meta-summary ${teacher ? '' : 'is-empty'}`} onClick={() => setShowMeta(true)} aria-expanded={false} aria-controls="observation-info-panel"><div className="avatar" style={{ background: teacher?.color }}>{teacher?.initials ?? '?'}</div><div><strong>{teacher?.name ?? 'Lengkapi informasi observasi'}</strong><span>{teacher ? `${assessment.className || 'Kelas belum diisi'} · ${assessment.subject || teacher.subject} · Observasi ${formatDate(assessment.observationDate)}` : 'Tambahkan guru, kelas, mata pelajaran, dan tanggal observasi'}</span></div><ChevronDown size={18} /></button>}
      <div className="stepper">{steps.map((item, index) => { const unlocked = observationInfoComplete && isStageUnlocked(index, assessment); return <button key={item.id} className={`stepper-item ${stage === item.id && observationInfoComplete ? 'current' : ''} ${index < stageIndex ? 'visited' : ''} ${!unlocked ? 'locked' : ''}`} disabled={!unlocked} onClick={() => moveTo(item.id)}><span className="stepper-circle">{index < stageIndex ? <Check size={15} /> : index + 1}</span><span><strong>{item.label}</strong><small>{!observationInfoComplete ? 'Lengkapi informasi observasi' : unlocked ? item.short : 'Selesaikan tahap sebelumnya'}</small></span></button> })}</div>
      {!observationInfoComplete && <ObservationInfoRequired missing={missingObservationInfo} onOpen={() => setShowMeta(true)} />}
      {observationInfoComplete && stage === 'pra-observasi' && <FocusedRubricStage title="Telaah RPP / Modul Ajar" intro="Tinjau kesiapan perencanaan pembelajaran sebelum observasi berlangsung." items={preObservationItems} responses={assessment.preObservation} onResponse={(id, patch) => updateResponse('preObservation', id, patch)} />}
      {observationInfoComplete && stage === 'observasi' && <FocusedRubricStage title="Observasi Pembelajaran" intro="Catat bukti pembelajaran yang terlihat selama observasi di kelas." items={observationItems} responses={assessment.observation} onResponse={(id, patch) => updateResponse('observation', id, patch)} evidenceLabel="Bukti pembelajaran" mode="sections" />}
      {observationInfoComplete && stage === 'pasca-observasi' && <PostObservation assessment={assessment} onChange={setAssessment} />}
    </fieldset>
    {readOnly ? <div className="read-only-notice"><UserRound size={17} /><span>Mode guru: data ini hanya dapat dilihat. Perubahan dilakukan oleh supervisor.</span></div> : <div className="workspace-footer"><button className="secondary-button" onClick={() => { if (stageIndex > 0) moveTo(steps[stageIndex - 1].id) }} disabled={stageIndex === 0}><ArrowLeft size={16} /> Sebelumnya</button><div className="footer-progress"><span>{stageIndex + 1} dari {steps.length}</span><div className="progress-line"><i style={{ width: `${((stageIndex + 1) / steps.length) * 100}%` }} /></div></div><button className="primary-button" onClick={goNext}>{!observationInfoComplete ? 'Lengkapi informasi' : stageIndex === steps.length - 1 ? 'Selesaikan penilaian' : 'Lanjutkan'} <ArrowRight size={16} /></button></div>}
    <PrintReport assessment={assessment} teacher={teacher} settings={settings} />
  </div>
}

function ObservationInfoRequired({ missing, onOpen }: { missing: string[]; onOpen: () => void }) {
  return <div className="observation-info-required"><div className="required-info-icon"><CircleAlert size={20} /></div><div className="required-info-copy"><strong>Lengkapi informasi observasi terlebih dahulu</strong><span>Butir penilaian akan aktif setelah data berikut diisi: {missing.join(', ')}.</span></div><button className="primary-button compact" onClick={onOpen}>Isi informasi</button></div>
}

function MetaForm({ assessment, teachers, supervisors, onChange, onClose }: { assessment: Assessment; teachers: Teacher[]; supervisors: Supervisor[]; onChange: (patch: Partial<Assessment>) => void; onClose: () => void }) {
  const selectedTeacher = teachers.find((item) => item.id === assessment.teacherId)
  const activeTeachers = teachers.filter((teacher) => teacher.active !== false)
  const subjectOptions = selectedTeacher ? getTeacherSubjects(selectedTeacher) : []
  const currentSubjectIsLegacy = Boolean(assessment.subject) && !subjectOptions.includes(assessment.subject)
  const activeSupervisors = supervisors.filter((item) => item.active)
  const currentSupervisorIsLegacy = Boolean(assessment.observer) && !activeSupervisors.some((item) => item.name === assessment.observer)
  return <div id="observation-info-panel" className="meta-form panel"><div className="panel-head"><div><h2>Informasi observasi</h2><p className="muted">Identitas ini akan tampil di laporan.</p></div><button className="icon-button" onClick={onClose} aria-label="Tutup informasi observasi"><X size={18} /></button></div><div className="form-grid"><label>Nama guru<select value={assessment.teacherId} onChange={(event) => { const teacher = teachers.find((item) => item.id === event.target.value); const subjects = teacher ? getTeacherSubjects(teacher) : []; onChange({ teacherId: event.target.value, subject: subjects[0] ?? '' }) }}><option value="">Pilih guru...</option>{selectedTeacher?.active === false && <option value={selectedTeacher.id}>{selectedTeacher.name} (diarsipkan)</option>}{activeTeachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label><label>Kelas<input value={assessment.className} onChange={(event) => onChange({ className: event.target.value })} placeholder="Contoh: XI TJKT 1" /></label><label>Mata pelajaran<select value={assessment.subject} onChange={(event) => onChange({ subject: event.target.value })} disabled={!selectedTeacher}><option value="">{selectedTeacher ? 'Pilih mata pelajaran...' : 'Pilih guru terlebih dahulu'}</option>{currentSubjectIsLegacy && <option value={assessment.subject}>{assessment.subject} (tersimpan)</option>}{subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label><label>Materi pokok<input value={assessment.topic} onChange={(event) => onChange({ topic: event.target.value })} placeholder="Materi yang diamati" /></label><label>Tanggal observasi<input type="date" value={assessment.observationDate} onChange={(event) => onChange({ observationDate: event.target.value })} /></label><label>Supervisor<select value={assessment.observer} onChange={(event) => onChange({ observer: event.target.value })} disabled={activeSupervisors.length === 0}><option value="">{activeSupervisors.length ? 'Pilih supervisor...' : 'Atur supervisor terlebih dahulu'}</option>{currentSupervisorIsLegacy && <option value={assessment.observer}>{assessment.observer} (tersimpan)</option>}{activeSupervisors.map((supervisor) => <option key={supervisor.id} value={supervisor.name}>{supervisor.name}{supervisor.position ? ` — ${supervisor.position}` : ''}</option>)}</select></label></div><button className="secondary-button compact" onClick={onClose}>Simpan identitas</button></div>
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

type PostObservationTab = 'reflection' | 'feedback' | 'follow-up'

function PostObservation({ assessment, onChange }: { assessment: Assessment; onChange: (next: Assessment) => void }) {
  const [activeTab, setActiveTab] = useState<PostObservationTab>('reflection')
  const tabs: Array<{ id: PostObservationTab; label: string; detail: string; complete: boolean }> = [
    { id: 'reflection', label: 'Refleksi Guru', detail: 'Pengalaman pembelajaran', complete: reflectionQuestions.every(([key]) => Boolean(assessment.reflection[key]?.trim())) },
    { id: 'feedback', label: 'Umpan Balik Supervisor', detail: 'Kekuatan & pengembangan', complete: feedbackAspects.every((aspect) => Boolean(assessment.feedback[aspect]?.strength?.trim() && assessment.feedback[aspect]?.development?.trim())) },
    { id: 'follow-up', label: 'Rencana Tindak Lanjut', detail: 'Kesepakatan bersama', complete: assessment.followUps.every((item) => Boolean(item.action.trim())) },
  ]
  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab)
  const updateReflection = (key: string, value: string) => onChange({ ...assessment, reflection: { ...assessment.reflection, [key]: value } })
  const updateFeedback = (aspect: string, field: 'strength' | 'development', value: string) => { const existing = assessment.feedback[aspect] ?? { strength: '', development: '' }; onChange({ ...assessment, feedback: { ...assessment.feedback, [aspect]: { ...existing, [field]: value } } }) }
  const updateFollowUp = (index: number, field: 'action' | 'owner' | 'dueDate', value: string) => onChange({ ...assessment, followUps: assessment.followUps.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) })

  return <section className="post-stage">
    <div className="stage-intro"><div><h2>Refleksi & tindak lanjut</h2><p className="muted">Tutup proses supervisi dengan percakapan yang konkret dan disepakati bersama.</p></div></div>
    <div className="post-tabs" role="tablist" aria-label="Tahapan pasca-observasi">{tabs.map((tab, index) => <button type="button" key={tab.id} className={`post-tab ${activeTab === tab.id ? 'active' : ''}`} role="tab" aria-selected={activeTab === tab.id} aria-controls={`post-panel-${tab.id}`} onClick={() => setActiveTab(tab.id)}><span className="post-tab-number">{tab.complete ? <Check size={13} /> : index + 1}</span><span><strong>{tab.label}</strong><small>{tab.detail}</small></span></button>)}</div>
    <div className="post-tab-panel" id={`post-panel-${activeTab}`} role="tabpanel">
      {activeTab === 'reflection' && <div className="post-section"><div className="section-title"><span>Refleksi guru</span><em>Diisi oleh guru</em></div>{reflectionQuestions.map(([key, question]) => <label className="long-field" key={key}><span>{question}</span><textarea value={assessment.reflection[key] ?? ''} onChange={(event) => updateReflection(key, event.target.value)} placeholder="Tulis refleksi guru..." rows={3} /></label>)}</div>}
      {activeTab === 'feedback' && <div className="post-section"><div className="section-title"><span>Umpan balik supervisor</span><em>Kekuatan & area pengembangan</em></div><div className="feedback-table"><div className="feedback-header"><span>Aspek</span><span>Apresiasi / kekuatan</span><span>Area pengembangan</span></div>{feedbackAspects.map((aspect) => <div className="feedback-row" key={aspect}><strong>{aspect}</strong><textarea value={assessment.feedback[aspect]?.strength ?? ''} onChange={(event) => updateFeedback(aspect, 'strength', event.target.value)} placeholder="Apa yang sudah baik?" rows={3} /><textarea value={assessment.feedback[aspect]?.development ?? ''} onChange={(event) => updateFeedback(aspect, 'development', event.target.value)} placeholder="Apa yang perlu dikembangkan?" rows={3} /></div>)}</div></div>}
      {activeTab === 'follow-up' && <div className="post-section"><div className="section-title"><span>Rencana tindak lanjut</span><em>Kesepakatan bersama</em></div><div className="follow-up-list">{assessment.followUps.map((item, index) => <div className="follow-up-row" key={item.aspect}><strong>{item.aspect}</strong><input value={item.action} onChange={(event) => updateFollowUp(index, 'action', event.target.value)} placeholder="Tindak lanjut yang disepakati" /><input value={item.owner} onChange={(event) => updateFollowUp(index, 'owner', event.target.value)} placeholder="Penanggung jawab" /><input type="date" value={item.dueDate} onChange={(event) => updateFollowUp(index, 'dueDate', event.target.value)} /></div>)}</div><div className="form-grid two"><label>Catatan supervisor<textarea value={assessment.supervisorNote} onChange={(event) => onChange({ ...assessment, supervisorNote: event.target.value })} rows={4} placeholder="Catatan tambahan..." /></label><label>Rekomendasi / saran perbaikan<textarea value={assessment.recommendation} onChange={(event) => onChange({ ...assessment, recommendation: event.target.value })} rows={4} placeholder="Rekomendasi untuk periode berikutnya..." /></label></div></div>}
    </div>
    <div className="post-tab-footer"><button type="button" className="secondary-button compact" onClick={() => setActiveTab(tabs[activeIndex - 1].id)} disabled={activeIndex === 0}><ArrowLeft size={14} /> Sebelumnya</button><span>Tab {activeIndex + 1} dari {tabs.length}</span><button type="button" className="primary-button compact" onClick={() => setActiveTab(tabs[activeIndex + 1].id)} disabled={activeIndex === tabs.length - 1}>Berikutnya <ArrowRight size={14} /></button></div>
  </section>
}

function PostObservationLegacy({ assessment, onChange }: { assessment: Assessment; onChange: (next: Assessment) => void }) { const updateReflection = (key: string, value: string) => onChange({ ...assessment, reflection: { ...assessment.reflection, [key]: value } }); const updateFeedback = (aspect: string, field: 'strength' | 'development', value: string) => { const existing = assessment.feedback[aspect] ?? { strength: '', development: '' }; onChange({ ...assessment, feedback: { ...assessment.feedback, [aspect]: { ...existing, [field]: value } } }) }; const updateFollowUp = (index: number, field: 'action' | 'owner' | 'dueDate', value: string) => onChange({ ...assessment, followUps: assessment.followUps.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) }); return <section className="post-stage"><div className="stage-intro"><div><h2>Refleksi & tindak lanjut</h2><p className="muted">Tutup proses supervisi dengan percakapan yang konkret dan disepakati bersama.</p></div></div><div className="post-section"><div className="section-title"><span>Refleksi guru</span><em>Diisi oleh guru</em></div>{reflectionQuestions.map(([key, question]) => <label className="long-field" key={key}><span>{question}</span><textarea value={assessment.reflection[key] ?? ''} onChange={(event) => updateReflection(key, event.target.value)} placeholder="Tulis refleksi guru..." rows={3} /></label>)}</div><div className="post-section"><div className="section-title"><span>Umpan balik supervisor</span><em>Kekuatan & area pengembangan</em></div><div className="feedback-table"><div className="feedback-header"><span>Aspek</span><span>Apresiasi / kekuatan</span><span>Area pengembangan</span></div>{feedbackAspects.map((aspect) => <div className="feedback-row" key={aspect}><strong>{aspect}</strong><textarea value={assessment.feedback[aspect]?.strength ?? ''} onChange={(event) => updateFeedback(aspect, 'strength', event.target.value)} placeholder="Apa yang sudah baik?" rows={3} /><textarea value={assessment.feedback[aspect]?.development ?? ''} onChange={(event) => updateFeedback(aspect, 'development', event.target.value)} placeholder="Apa yang perlu dikembangkan?" rows={3} /></div>)}</div></div><div className="post-section"><div className="section-title"><span>Rencana tindak lanjut</span><em>Kesepakatan bersama</em></div><div className="follow-up-list">{assessment.followUps.map((item, index) => <div className="follow-up-row" key={item.aspect}><strong>{item.aspect}</strong><input value={item.action} onChange={(event) => updateFollowUp(index, 'action', event.target.value)} placeholder="Tindak lanjut yang disepakati" /><input value={item.owner} onChange={(event) => updateFollowUp(index, 'owner', event.target.value)} placeholder="Penanggung jawab" /><input type="date" value={item.dueDate} onChange={(event) => updateFollowUp(index, 'dueDate', event.target.value)} /></div>)}</div><div className="form-grid two"><label>Catatan supervisor<textarea value={assessment.supervisorNote} onChange={(event) => onChange({ ...assessment, supervisorNote: event.target.value })} rows={4} placeholder="Catatan tambahan..." /></label><label>Rekomendasi / saran perbaikan<textarea value={assessment.recommendation} onChange={(event) => onChange({ ...assessment, recommendation: assessment.recommendation })} rows={4} placeholder="Rekomendasi untuk periode berikutnya..." /></label></div></div></section> }

function PrintReport({ assessment, teacher, settings }: { assessment: Assessment; teacher?: Teacher; settings: AppSettings }) {
  const teacherName = teacher?.name ?? ''
  const subject = assessment.subject || teacher?.subject || ''
  const signatureName = settings.signatureName || assessment.observer
  const fields = { teacher: teacherName, school: settings.schoolName, className: assessment.className, subject, topic: assessment.topic }
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
    <PrintPreObservation fields={fields} responses={assessment.preObservation} year={assessment.period} settings={settings} signatureName={signatureName} />
    <PrintObservation fields={fields} responses={assessment.observation} assessment={assessment} groups={observationGroups} deepGroups={deepObservationGroups} year={assessment.period} settings={settings} signatureName={signatureName} />
    <PrintPostObservation fields={fields} assessment={assessment} settings={settings} signatureName={signatureName} />
    <PrintFlow />
  </div>
}

function PrintFields({ fields, includeSchool = false }: { fields: { teacher: string; school: string; className: string; subject: string; topic: string }; includeSchool?: boolean }) {
  const rows = includeSchool
    ? [['Nama Guru', fields.teacher], ['Nama Sekolah', fields.school], ['Mata Pelajaran', fields.subject]]
    : [['Nama Guru', fields.teacher], ['Kelas', fields.className], ['Mata Pelajaran', fields.subject], ['Materi Pokok', fields.topic]]
  return <div className="print-fields">{rows.map(([label, value]) => <div className="print-field" key={label}><span>{label}</span><b>:</b><strong>{value || '\u00a0'}</strong></div>)}</div>
}

function PrintPreObservation({ fields, responses, year, settings, signatureName }: { fields: Parameters<typeof PrintFields>[0]['fields']; responses: Assessment['preObservation']; year: string; settings: AppSettings; signatureName: string }) {
  return <section className="print-page print-pre-page">
    <PrintHeading title="Instrumen Telaah" subtitle="RPP/MODUL AJAR (Pra Observasi)" />
    <PrintFields fields={fields} includeSchool />
    <PrintRubricTable className="print-pre-table" items={preObservationItems} responses={responses} firstHeader="Komponen RPP/MA" indicatorHeader="Indikator Yang Diamati" evidenceHeader="Catatan" showTotal />
    <PrintAdditionalNotes />
    <PrintDate year={year} city={settings.signatureCity} />
    <PrintSignature observer="Supervisor" detail={`( ${settings.signatureDetail})`} name={signatureName} position={settings.signaturePosition} image={settings.signatureImage} />
  </section>
}

function PrintHeading({ title, subtitle, italic }: { title: string; subtitle?: string; italic?: string }) {
  return <div className="print-heading"><h1>{title}</h1>{subtitle && <h2>{subtitle}</h2>}{italic && <p>{italic}</p>}</div>
}

function PrintRubricTable({ className, items, responses, firstHeader, indicatorHeader, evidenceHeader, showTotal = false }: { className: string; items: RubricItem[]; responses: Record<string, ScoredResponse>; firstHeader: string; indicatorHeader: string; evidenceHeader: string; showTotal?: boolean }) {
  return <table className={`print-table print-rubric-table ${className}`}><colgroup><col className="print-col-no" /><col className="print-col-first" /><col className="print-col-indicator" /><col className="print-col-score" /><col className="print-col-evidence" /></colgroup><thead><tr><th>No</th><th>{firstHeader}</th><th>{indicatorHeader}</th><th>Skor<br />(1–4)</th><th>{evidenceHeader}</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td className="print-center">{item.number}</td><td>{item.title}</td><td>{item.indicator}</td><td className="print-score">{responses[item.id]?.score ?? ''}</td><td>{responses[item.id]?.note || '\u00a0'}</td></tr>)}</tbody>{showTotal && <tfoot><tr className="print-total-row"><td colSpan={3}>Total Skor</td><td className="print-score">{totalScore(items, responses) || ''}</td><td>{'\u00a0'}</td></tr></tfoot>}</table>
}

function PrintObservation({ fields, responses, assessment, groups, deepGroups, year, settings, signatureName }: { fields: Parameters<typeof PrintFields>[0]['fields']; responses: Assessment['observation']; assessment: Assessment; groups: Array<{ section: string; title: string; evidence: string }>; deepGroups: Array<{ section: string; title: string; evidence: string; itemNumbers: number[] }>; year: string; settings: AppSettings; signatureName: string }) {
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
    <PrintDate year={year} city={settings.signatureCity} />
    <PrintSignature observer="Supervisor" detail={`(${settings.signatureDetail})`} name={signatureName} position={settings.signaturePosition} image={settings.signatureImage} />
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

function PrintPostObservation({ fields, assessment, settings, signatureName }: { fields: Parameters<typeof PrintFields>[0]['fields']; assessment: Assessment; settings: AppSettings; signatureName: string }) {
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
    <PrintDate year={assessment.period} city={settings.signatureCity} />
    <div className="print-signatures"><PrintSignature observer="Supervisor" detail={`(${settings.signatureDetail})`} name={signatureName} position={settings.signaturePosition} image={settings.signatureImage} /><PrintSignature observer="Guru" /></div>
  </section>
}

function PrintAdditionalNotes() {
  return <div className="print-additional-notes"><h3>Catatan Tambahan</h3>{['Tuliskan kelebihan Perencanaan Pembelajaran:', 'Tuliskan hal yang perlu ditingkatkan dari Perencanaan Pembelajaran:', 'Tuliskan rekomendasi dan lanjutkan dengan revisi Perencanaan Pembelajaran sesuai prinsip PM:'].map((label, index) => <div className="print-note-block" key={label}><strong>{String.fromCharCode(97 + index)}) &nbsp;{label}</strong><div className="print-dotted-line" /></div>)}</div>
}

function PrintSignature({ observer, detail, name = '', position = '', image = '' }: { observer: string; detail?: string; name?: string; position?: string; image?: string }) {
  return <div className="print-signature"><strong>{observer}</strong>{detail && <span>{detail}</span>}<div className="print-signature-write">{image && <img src={image} alt="Tanda tangan penandatangan" />}{name ? <strong className="print-signature-name">{name}</strong> : <span className="print-signature-name">(................................................)</span>}{position && <span className="print-signature-position">{position}</span>}</div></div>
}

function PrintDate({ year, city }: { year: string; city: string }) {
  return <div className="print-date-line">{city || '........................'}, {year}</div>
}

function PrintFlow() {
  return <section className="print-page print-flow-page"><h2>Alur Pelaksanaan Observasi:</h2><ol><li>Instrumen Observasi → digunakan saat supervisi berlangsung.</li><li>Instrumen Pasca Observasi → digunakan setelah observasi, untuk refleksi guru dan umpan balik supervisor.</li><li>Tindak Lanjut → menjadi catatan bersama yang disepakati.</li></ol></section>
}

function SettingsPage({ settings, onSettingsChange }: { settings: AppSettings; onSettingsChange: (settings: AppSettings) => Promise<void> }) {
  const [draft, setDraft] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [uploadError, setUploadError] = useState('')
  useEffect(() => setDraft(settings), [settings])
  const update = (patch: Partial<AppSettings>) => { setDraft((current) => ({ ...current, ...patch })); setSaved(false) }
  const handleSignatureUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    if (file.type !== 'image/png') { setUploadError('Tanda tangan harus berupa file PNG transparan.'); return }
    if (file.size > 1024 * 1024) { setUploadError('Ukuran tanda tangan maksimal 1 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => { update({ signatureImage: typeof reader.result === 'string' ? reader.result : '' }); setUploadError('') }
    reader.readAsDataURL(file)
  }
  const save = async () => { try { await onSettingsChange(draft); setSaved(true); window.setTimeout(() => setSaved(false), 2600) } catch { setSaved(false) } }
  return <div className="page-wrap settings-page"><section className="welcome-row"><div><p className="eyebrow">Pengaturan aplikasi</p><h1>Pengaturan</h1><p className="muted">Kelola identitas sekolah dan format default yang digunakan dalam penilaian serta laporan.</p></div><button className="primary-button" onClick={save}><Check size={17} /> Simpan pengaturan</button></section><div className="settings-grid"><section className="panel settings-panel"><div className="settings-panel-head"><div className="settings-icon"><ShieldCheck size={18} /></div><div><h2>Identitas sekolah</h2><p className="muted">Ditampilkan pada header aplikasi dan laporan PDF.</p></div></div><div className="settings-fields"><label>Nama sekolah<input value={draft.schoolName} onChange={(event) => update({ schoolName: event.target.value })} placeholder="Contoh: SMKN Pasirian" /></label><label>Kota / tempat tanda tangan<input value={draft.signatureCity} onChange={(event) => update({ signatureCity: event.target.value })} placeholder="Contoh: Pasirian" /></label></div></section><section className="panel settings-panel"><div className="settings-panel-head"><div className="settings-icon lilac"><ClipboardCheck size={18} /></div><div><h2>Default penilaian</h2><p className="muted">Dipakai saat membuat penilaian baru. Penilaian lama tidak berubah.</p></div></div><div className="settings-fields"><label>Periode penilaian default<input value={draft.defaultPeriod} onChange={(event) => update({ defaultPeriod: event.target.value })} placeholder="Contoh: 2026" /></label></div></section><section className="panel settings-panel"><div className="settings-panel-head"><div className="settings-icon peach"><FileText size={18} /></div><div><h2>Tanda tangan laporan</h2><p className="muted">Nama, jabatan, dan PNG transparan ini ditampilkan pada laporan PDF.</p></div></div><div className="settings-fields signature-settings-fields"><label>Nama penandatangan<input value={draft.signatureName} onChange={(event) => update({ signatureName: event.target.value })} placeholder="Contoh: Siti Rahmawati, S.Pd." /></label><label>Jabatan penandatangan<input value={draft.signaturePosition} onChange={(event) => update({ signaturePosition: event.target.value })} placeholder="Contoh: Kepala Sekolah" /></label><label>Keterangan di bawah supervisor<input value={draft.signatureDetail} onChange={(event) => update({ signatureDetail: event.target.value })} placeholder="Contoh: Kepala Sekolah & Pendamping Sekolah" /></label><label>Gambar tanda tangan PNG<input type="file" accept="image/png" onChange={handleSignatureUpload} /><small>PNG transparan, maksimal 1 MB.</small></label></div>{draft.signatureImage && <div className="signature-preview"><img src={draft.signatureImage} alt="Pratinjau tanda tangan" /><button type="button" className="secondary-button compact" onClick={() => { update({ signatureImage: '' }); setUploadError('') }}>Hapus tanda tangan</button></div>}{uploadError && <p className="settings-upload-error" role="alert">{uploadError}</p>}</section></div>{saved && <div className="settings-saved" role="status"><Check size={16} /> Pengaturan tersimpan.</div>}</div>
}

function Supervisors({ teachers, supervisors, onSupervisorsChange }: { teachers: Teacher[]; supervisors: Supervisor[]; onSupervisorsChange: (supervisors: Supervisor[]) => Promise<void> }) {
  const [showDialog, setShowDialog] = useState(false)
  const [feedback, setFeedback] = useState('')
  const addSupervisor = async (name: string, position: string) => {
    const duplicate = supervisors.some((supervisor) => supervisor.name.trim().toLowerCase() === name.trim().toLowerCase())
    if (duplicate) return 'Supervisor dengan nama tersebut sudah terdaftar.'
    const teacher = teachers.find((item) => item.name.trim().toLowerCase() === name.trim().toLowerCase())
    const supervisor = { id: `supervisor-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: name.trim(), position: position.trim(), teacherId: teacher?.id, active: true }
    try { await onSupervisorsChange([...supervisors, supervisor]) } catch (reason) { return reason instanceof Error ? reason.message : 'Supervisor gagal disimpan.' }
    setShowDialog(false)
    setFeedback(`${supervisor.name} berhasil ditambahkan.`)
    return undefined
  }
  const toggleSupervisor = async (id: string) => { try { await onSupervisorsChange(supervisors.map((supervisor) => supervisor.id === id ? { ...supervisor, active: !supervisor.active } : supervisor)) } catch (reason) { setFeedback(reason instanceof Error ? reason.message : 'Status supervisor gagal diperbarui.') } }

  return <div className="page-wrap"><section className="welcome-row"><div><p className="eyebrow">Pengaturan data</p><h1>Supervisor</h1><p className="muted">Atur nama supervisor yang dapat dipilih pada informasi observasi.</p></div><button className="primary-button" onClick={() => setShowDialog(true)}><Plus size={18} /> Tambah supervisor</button></section><div className="panel table-panel"><div className="panel-head"><div><h2>{supervisors.length} supervisor terdaftar</h2><p className="muted">Supervisor nonaktif tidak muncul pada penilaian baru.</p></div></div>{feedback && <div className="csv-feedback success" role="status">{feedback}<button type="button" onClick={() => setFeedback('')} aria-label="Tutup pesan"><X size={14} /></button></div>}<div className="supervisor-table"><div className="supervisor-header"><span>Nama supervisor</span><span>Jabatan</span><span>Status</span><span /></div>{supervisors.map((supervisor) => <div className="supervisor-row" key={supervisor.id}><div className="teacher-cell"><div className="avatar navy">{makeTeacherInitials(supervisor.name)}</div><strong>{supervisor.name}</strong></div><span>{supervisor.position || '—'}</span><span className={`status-text ${supervisor.active ? 'complete' : ''}`}>{supervisor.active ? 'Aktif' : 'Nonaktif'}</span><button type="button" className="secondary-button compact supervisor-toggle" onClick={() => toggleSupervisor(supervisor.id)}>{supervisor.active ? 'Nonaktifkan' : 'Aktifkan'}</button></div>)}</div></div>{showDialog && <SupervisorDialog teachers={teachers} supervisors={supervisors} onClose={() => setShowDialog(false)} onSubmit={addSupervisor} />}</div>
}

function SupervisorDialog({ teachers, supervisors, onClose, onSubmit }: { teachers: Teacher[]; supervisors: Supervisor[]; onClose: () => void; onSubmit: (name: string, position: string) => Promise<string | undefined> }) {
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [error, setError] = useState('')
  const existingNames = new Set(supervisors.map((supervisor) => supervisor.name.trim().toLowerCase()))
  const availableTeachers = teachers.filter((teacher) => teacher.active !== false && !existingNames.has(teacher.name.trim().toLowerCase()))
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!name.trim()) { setError('Nama supervisor wajib diisi.'); return } const message = await onSubmit(name, position); if (message) setError(message) }
  return <div className="teacher-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="teacher-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="supervisor-modal-title"><div className="teacher-modal-head"><div><span className="eyebrow">Pengaturan data</span><h2 id="supervisor-modal-title">Tambah supervisor</h2><p className="muted">Pilih nama dari daftar guru yang terdaftar.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Tutup"><X size={18} /></button></div><div className="teacher-form-fields"><label>Nama supervisor<select autoFocus value={name} onChange={(event) => setName(event.target.value)} disabled={availableTeachers.length === 0}><option value="">{availableTeachers.length ? 'Pilih nama guru...' : 'Semua guru sudah terdaftar'}</option>{availableTeachers.map((teacher) => <option key={teacher.id} value={teacher.name}>{teacher.name}</option>)}</select></label><label>Jabatan<input value={position} onChange={(event) => setPosition(event.target.value)} placeholder="Contoh: Kepala Sekolah" /></label></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="teacher-modal-footer"><button type="button" className="secondary-button compact" onClick={onClose}>Batal</button><button type="submit" className="primary-button compact" disabled={availableTeachers.length === 0}><Plus size={15} /> Tambahkan supervisor</button></div></form></div>
}

function Teachers({ teachers, assessments, onNew, onTeachersChange }: { teachers: Teacher[]; assessments: Assessment[]; onNew: () => void; onTeachersChange: (teachers: Teacher[], removedId?: string) => Promise<void> }) {
  const [showDialog, setShowDialog] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [csvFeedback, setCsvFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const activeTeachers = teachers.filter((teacher) => teacher.active !== false)
  const archivedTeachers = teachers.filter((teacher) => teacher.active === false)
  const displayedTeachers = showArchived ? archivedTeachers : activeTeachers

  const addTeacher = async (name: string, subject: string) => {
    const duplicate = teachers.some((teacher) => teacher.name.trim().toLowerCase() === name.trim().toLowerCase())
    if (duplicate) return 'Guru dengan nama tersebut sudah terdaftar.'
    const newTeacher = createTeacher(name, subject, activeTeachers.length)
    try { await onTeachersChange([...teachers, newTeacher]) } catch (reason) { return reason instanceof Error ? reason.message : 'Guru gagal disimpan.' }
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
    try { await onTeachersChange([...teachers, ...result.teachers]); setCsvFeedback({ type: 'success', text: `${result.teachers.length} guru berhasil diimpor${result.skipped ? `, ${result.skipped} baris dilewati` : ''}.` }) } catch (reason) { setCsvFeedback({ type: 'error', text: reason instanceof Error ? reason.message : 'Guru gagal diimpor.' }) }
  }

  const archiveTeacher = async (teacher: Teacher) => {
    try { await onTeachersChange(teachers.map((item) => item.id === teacher.id ? { ...item, active: false } : item)); setCsvFeedback({ type: 'success', text: `${teacher.name} diarsipkan. Riwayat penilaiannya tetap tersimpan.` }) } catch (reason) { setCsvFeedback({ type: 'error', text: reason instanceof Error ? reason.message : 'Guru gagal diarsipkan.' }) }
  }

  const restoreTeacher = async (teacher: Teacher) => {
    try { await onTeachersChange(teachers.map((item) => item.id === teacher.id ? { ...item, active: true } : item)); setCsvFeedback({ type: 'success', text: `${teacher.name} dipulihkan ke daftar aktif.` }) } catch (reason) { setCsvFeedback({ type: 'error', text: reason instanceof Error ? reason.message : 'Guru gagal dipulihkan.' }) }
  }

  const deleteTeacher = async (teacher: Teacher) => {
    const assessmentCount = assessments.filter((assessment) => assessment.teacherId === teacher.id).length
    if (assessmentCount > 0) {
      setCsvFeedback({ type: 'error', text: `${teacher.name} memiliki ${assessmentCount} penilaian dan tidak dapat dihapus. Gunakan Arsipkan.` })
      return
    }
    if (!window.confirm(`Hapus permanen data ${teacher.name}?`)) return
    try { await onTeachersChange(teachers.filter((item) => item.id !== teacher.id), teacher.id); setCsvFeedback({ type: 'success', text: `${teacher.name} dihapus permanen.` }) } catch (reason) { setCsvFeedback({ type: 'error', text: reason instanceof Error ? reason.message : 'Guru gagal dihapus.' }) }
  }

  return <div className="page-wrap"><section className="welcome-row"><div><p className="eyebrow">Data sekolah</p><h1>Daftar guru</h1><p className="muted">Kelola guru aktif dan arsip guru yang sudah tidak dipantau.</p></div><button className="primary-button" onClick={onNew}><Plus size={18} /> Penilaian baru</button></section><div className="panel table-panel"><div className="panel-head teacher-panel-head"><div><h2>{activeTeachers.length} guru aktif</h2><p className="muted">{archivedTeachers.length ? `${archivedTeachers.length} guru diarsipkan. ` : ''}Tambahkan atau impor data guru melalui CSV.</p></div><div className="teacher-actions"><button className="secondary-button compact" onClick={() => setShowDialog(true)}><Plus size={16} /> Tambah guru</button><label className="secondary-button compact upload-button" htmlFor="teacher-csv-upload"><Upload size={15} /> Unggah CSV</label><input id="teacher-csv-upload" className="visually-hidden" type="file" accept=".csv,text/csv" onChange={handleCsvUpload} /><button className="template-button" onClick={downloadTeacherTemplate}><Download size={14} /> Template CSV</button>{archivedTeachers.length > 0 && <button className="template-button" onClick={() => setShowArchived((current) => !current)}>{showArchived ? 'Lihat guru aktif' : `Lihat arsip (${archivedTeachers.length})`}</button>}</div></div>{csvFeedback && <div className={`csv-feedback ${csvFeedback.type}`} role="status">{csvFeedback.text}<button type="button" onClick={() => setCsvFeedback(null)} aria-label="Tutup pesan"><X size={14} /></button></div>}<div className="teacher-table"><div className="teacher-header"><span>Guru</span><span>Mata pelajaran</span><span>Penilaian</span><span>Status terbaru</span><span>Aksi</span></div>{displayedTeachers.length === 0 ? <div className="teacher-empty">{showArchived ? 'Belum ada guru diarsipkan.' : 'Belum ada guru aktif. Tambahkan guru atau unggah CSV.'}</div> : displayedTeachers.map((teacher) => { const items = assessments.filter((assessment) => assessment.teacherId === teacher.id); const latest = items[0]; const isActive = teacher.active !== false; return <div className={`teacher-row ${isActive ? '' : 'archived'}`} key={teacher.id}><div className="teacher-cell"><div className="avatar" style={{ background: teacher.color }}>{teacher.initials}</div><strong>{teacher.name}</strong></div><span>{teacher.subject}</span><span>{items.length} penilaian</span><span className={`status-text ${!isActive ? 'archived' : latest?.status === 'selesai' ? 'complete' : ''}`}>{!isActive ? 'Diarsipkan' : latest ? latest.status === 'selesai' ? 'Selesai' : 'Draf' : 'Belum ada'}</span><div className="teacher-actions-cell">{isActive ? <button type="button" className="secondary-button compact" onClick={() => archiveTeacher(teacher)}><Archive size={14} /> Arsipkan</button> : <button type="button" className="secondary-button compact" onClick={() => restoreTeacher(teacher)}><RotateCcw size={14} /> Pulihkan</button>}{items.length === 0 && <button type="button" className="danger-button compact" onClick={() => deleteTeacher(teacher)} aria-label={`Hapus ${teacher.name}`}><Trash2 size={14} /></button>}</div></div> })}</div></div>{showDialog && <TeacherDialog onClose={() => setShowDialog(false)} onSubmit={addTeacher} />}</div>
}

function TeacherDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (name: string, subject: string) => Promise<string | undefined> }) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!name.trim() || !subject.trim()) { setError('Nama guru dan mata pelajaran wajib diisi.'); return } const message = await onSubmit(name, subject); if (message) setError(message) }
  return <div className="teacher-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="teacher-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="teacher-modal-title"><div className="teacher-modal-head"><div><span className="eyebrow">Data sekolah</span><h2 id="teacher-modal-title">Tambah guru</h2><p className="muted">Masukkan identitas guru yang akan dipantau.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Tutup"><X size={18} /></button></div><div className="teacher-form-fields"><label>Nama guru<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Contoh: Siti Rahmawati, S.Pd." /></label><label>Mata pelajaran<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Contoh: Bahasa Indonesia" /></label></div>{error && <p className="form-error" role="alert">{error}</p>}<div className="teacher-modal-footer"><button type="button" className="secondary-button compact" onClick={onClose}>Batal</button><button type="submit" className="primary-button compact"><Plus size={15} /> Tambahkan guru</button></div></form></div>
}

function createTeacher(name: string, subject: string, index: number): Teacher {
  return { id: `teacher-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: name.trim(), subject: subject.trim(), initials: makeTeacherInitials(name), color: teacherColors[index % teacherColors.length], active: true }
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
  lines.slice(1).forEach((line, index) => { const cells = parseCsvLine(line, delimiter); const name = cells[nameIndex]?.trim(); const subject = cells[subjectIndex]?.trim(); if (!name || !subject || knownNames.has(name.toLowerCase())) { skipped += 1; return } knownNames.add(name.toLowerCase()); imported.push({ id: `teacher-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`, name, subject, initials: cells[initialsIndex]?.trim().toUpperCase() || makeTeacherInitials(name), color: teacherColors[(existing.length + imported.length) % teacherColors.length], active: true }) })
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

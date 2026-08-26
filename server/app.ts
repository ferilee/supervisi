import express, { type NextFunction, type Request, type Response } from 'express'
import cookieParser from 'cookie-parser'
import { defaultSettings, DEFAULT_SUPERVISOR_PASSWORD, DEFAULT_TEACHER_PASSWORD, type DatabaseHandle } from './db.js'
import { destroySession, hashPassword, issueSession, mapUser, purgeExpiredSessions, sessionPayload, userFromRequest, verifyPassword, type AuthUser } from './auth.js'
import type { PersistedData } from '../src/lib/migration.js'
import type { Assessment, AppSettings, Supervisor, Teacher } from '../src/types.js'
import { newId } from './auth.js'

declare global {
  namespace Express { interface Request { user?: AuthUser } }
}

type Json = Record<string, unknown>

function now() { return new Date().toISOString() }
function bool(value: unknown) { return value !== false && value !== 0 }
function json<T>(value: unknown, fallback: T): T { try { return typeof value === 'string' ? JSON.parse(value) as T : (value as T) } catch { return fallback } }
function roleIs(...roles: AuthUser['role'][]) { return (request: Request, response: Response, next: NextFunction) => { if (!request.user || !roles.includes(request.user.role)) return response.status(403).json({ error: 'Akses tidak diizinkan.' }); next() } }
function error(response: Response, message: string, status = 400) { return response.status(status).json({ error: message }) }
function initials(name: string) { return name.trim().split(/\s+/).map((part) => part[0] ?? '').join('').slice(0, 2).toUpperCase() }
function usernameBase(name: string) { return name.trim().split(/\s+/)[0] ?? '' }
function uniqueUsername(db: DatabaseHandle, name: string, role: 'guru' | 'supervisor') {
  const base = usernameBase(name) || role
  let candidate = base
  let suffix = 2
  while (db.prepare('SELECT 1 FROM users WHERE username = ? COLLATE NOCASE').get(candidate)) candidate = `${base}${suffix++}`
  return candidate
}

function teacherFromRow(row: Json): Teacher { return { id: String(row.id), legacyId: typeof row.legacy_id === 'string' ? row.legacy_id : undefined, name: String(row.name), subject: String(row.subject ?? ''), initials: String(row.initials ?? ''), color: String(row.color ?? ''), active: bool(row.active) } }
function supervisorFromRow(row: Json): Supervisor { return { id: String(row.id), legacyId: typeof row.legacy_id === 'string' ? row.legacy_id : undefined, teacherId: typeof row.teacher_id === 'string' ? row.teacher_id : undefined, name: String(row.name), position: String(row.position ?? ''), active: bool(row.active) } }
function assessmentFromRow(row: Json): Assessment { return { id: String(row.id), legacyId: typeof row.legacy_id === 'string' ? row.legacy_id : undefined, teacherId: String(row.teacher_id ?? ''), period: String(row.period ?? ''), className: String(row.class_name ?? ''), subject: String(row.subject ?? ''), topic: String(row.topic ?? ''), observer: String(row.observer ?? ''), observationDate: String(row.observation_date ?? ''), status: row.status === 'selesai' ? 'selesai' : 'draft', currentStage: row.current_stage === 'observasi' || row.current_stage === 'pasca-observasi' ? row.current_stage : 'pra-observasi', preObservation: json(row.pre_observation, {}), observation: json(row.observation, {}), reflection: json(row.reflection, {}), feedback: json(row.feedback, {}), followUps: json(row.follow_ups, []), supervisorNote: String(row.supervisor_note ?? ''), recommendation: String(row.recommendation ?? ''), createdAt: String(row.created_at ?? ''), updatedAt: String(row.updated_at ?? '') } }
function settingsFromRow(row: Json): AppSettings { return { schoolName: String(row.school_name ?? defaultSettings.schoolName), defaultPeriod: String(row.default_period ?? defaultSettings.defaultPeriod), signatureCity: String(row.signature_city ?? defaultSettings.signatureCity), signatureDetail: String(row.signature_detail ?? defaultSettings.signatureDetail), supervisorSetupComplete: bool(row.supervisor_setup_complete), signatureName: String(row.signature_name ?? ''), signaturePosition: String(row.signature_position ?? ''), signatureImage: String(row.signature_image ?? '') } }

function provisionUser(db: DatabaseHandle, name: string, role: 'guru' | 'supervisor', teacherId?: string) {
  const existing = teacherId ? db.prepare('SELECT id FROM users WHERE role = ? AND teacher_id = ?').get(role, teacherId) : undefined
  if (existing) return
  const username = uniqueUsername(db, name, role)
  db.prepare(`INSERT INTO users (id, username, display_name, role, teacher_id, password_hash, active, must_change_password, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)`).run(newId(), username, name, role, teacherId ?? null, hashPassword(role === 'guru' ? DEFAULT_TEACHER_PASSWORD : DEFAULT_SUPERVISOR_PASSWORD), now())
}

function upsertTeacher(db: DatabaseHandle, input: Partial<Teacher>) {
  const existing = input.id ? db.prepare('SELECT * FROM teachers WHERE id = ?').get(input.id) as Json | undefined : (input.legacyId ? db.prepare('SELECT * FROM teachers WHERE legacy_id = ?').get(input.legacyId) as Json | undefined : undefined)
  const id = existing?.id ? String(existing.id) : newId()
  const data = { id, legacyId: input.legacyId ?? (existing?.legacy_id as string | null) ?? null, name: String(input.name ?? ''), subject: String(input.subject ?? ''), initials: String(input.initials ?? initials(String(input.name ?? ''))), color: String(input.color ?? '#d9f3eb'), active: input.active !== false ? 1 : 0, createdAt: String(existing?.created_at ?? now()) }
  if (!data.name.trim()) throw new Error('Nama guru wajib diisi.')
  db.prepare(`INSERT INTO teachers (id, legacy_id, name, subject, initials, color, active, created_at) VALUES (@id, @legacyId, @name, @subject, @initials, @color, @active, @createdAt)
    ON CONFLICT(id) DO UPDATE SET legacy_id=excluded.legacy_id, name=excluded.name, subject=excluded.subject, initials=excluded.initials, color=excluded.color, active=excluded.active`).run(data)
  const saved = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id) as Json
  provisionUser(db, data.name, 'guru', id)
  if (!data.active) db.prepare("UPDATE users SET active = 0 WHERE role = 'guru' AND teacher_id = ?").run(id)
  return teacherFromRow(saved)
}

function upsertSupervisor(db: DatabaseHandle, input: Partial<Supervisor>) {
  const existing = input.id ? db.prepare('SELECT * FROM supervisors WHERE id = ?').get(input.id) as Json | undefined : (input.legacyId ? db.prepare('SELECT * FROM supervisors WHERE legacy_id = ?').get(input.legacyId) as Json | undefined : undefined)
  const id = existing?.id ? String(existing.id) : newId()
  const data = { id, legacyId: input.legacyId ?? (existing?.legacy_id as string | null) ?? null, teacherId: input.teacherId ?? (existing?.teacher_id as string | null) ?? null, name: String(input.name ?? ''), position: String(input.position ?? ''), active: input.active !== false ? 1 : 0, createdAt: String(existing?.created_at ?? now()) }
  if (!data.name.trim()) throw new Error('Nama supervisor wajib diisi.')
  db.prepare(`INSERT INTO supervisors (id, legacy_id, teacher_id, name, position, active, created_at) VALUES (@id, @legacyId, @teacherId, @name, @position, @active, @createdAt)
    ON CONFLICT(id) DO UPDATE SET legacy_id=excluded.legacy_id, teacher_id=excluded.teacher_id, name=excluded.name, position=excluded.position, active=excluded.active`).run(data)
  provisionUser(db, data.name, 'supervisor', data.teacherId ?? undefined)
  if (!data.active) db.prepare("UPDATE users SET active = 0 WHERE role = 'supervisor' AND teacher_id = ?").run(data.teacherId)
  return supervisorFromRow(db.prepare('SELECT * FROM supervisors WHERE id = ?').get(id) as Json)
}

function assessmentValues(input: Partial<Assessment>, existing?: Json) {
  const createdAt = String(existing?.created_at ?? input.createdAt ?? now())
  return { id: String(existing?.id ?? input.id ?? newId()), legacyId: input.legacyId ?? (existing?.legacy_id as string | null) ?? null, teacherId: input.teacherId || (existing?.teacher_id as string | null) || null, period: String(input.period ?? ''), className: String(input.className ?? ''), subject: String(input.subject ?? ''), topic: String(input.topic ?? ''), observer: String(input.observer ?? ''), observationDate: String(input.observationDate ?? ''), status: input.status === 'selesai' ? 'selesai' : 'draft', currentStage: input.currentStage ?? 'pra-observasi', preObservation: JSON.stringify(input.preObservation ?? {}), observation: JSON.stringify(input.observation ?? {}), reflection: JSON.stringify(input.reflection ?? {}), feedback: JSON.stringify(input.feedback ?? {}), followUps: JSON.stringify(input.followUps ?? []), supervisorNote: String(input.supervisorNote ?? ''), recommendation: String(input.recommendation ?? ''), createdAt, updatedAt: now() }
}

function upsertAssessment(db: DatabaseHandle, input: Partial<Assessment>) {
  const existing = input.id ? db.prepare('SELECT * FROM assessments WHERE id = ?').get(input.id) as Json | undefined : (input.legacyId ? db.prepare('SELECT * FROM assessments WHERE legacy_id = ?').get(input.legacyId) as Json | undefined : undefined)
  const data = assessmentValues(input, existing)
  db.prepare(`INSERT INTO assessments (id, legacy_id, teacher_id, period, class_name, subject, topic, observer, observation_date, status, current_stage, pre_observation, observation, reflection, feedback, follow_ups, supervisor_note, recommendation, created_at, updated_at)
    VALUES (@id, @legacyId, @teacherId, @period, @className, @subject, @topic, @observer, @observationDate, @status, @currentStage, @preObservation, @observation, @reflection, @feedback, @followUps, @supervisorNote, @recommendation, @createdAt, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET legacy_id=excluded.legacy_id, teacher_id=excluded.teacher_id, period=excluded.period, class_name=excluded.class_name, subject=excluded.subject, topic=excluded.topic, observer=excluded.observer, observation_date=excluded.observation_date, status=excluded.status, current_stage=excluded.current_stage, pre_observation=excluded.pre_observation, observation=excluded.observation, reflection=excluded.reflection, feedback=excluded.feedback, follow_ups=excluded.follow_ups, supervisor_note=excluded.supervisor_note, recommendation=excluded.recommendation, updated_at=excluded.updated_at`).run(data)
  return assessmentFromRow(db.prepare('SELECT * FROM assessments WHERE id = ?').get(data.id) as Json)
}

function localMigration(db: DatabaseHandle, local: PersistedData) {
  const transaction = db.transaction(() => {
    const teacherMap: Record<string, string> = {}
    let teachersAdded = 0
    for (const item of local.teachers ?? []) {
      const existing = (item.legacyId ? db.prepare('SELECT * FROM teachers WHERE legacy_id = ?').get(item.legacyId) : undefined) as Json | undefined
        ?? db.prepare('SELECT * FROM teachers WHERE lower(name) = lower(?)').get(item.name) as Json | undefined
      const saved = existing ? teacherFromRow(existing) : upsertTeacher(db, { ...item, legacyId: item.legacyId ?? item.id })
      teacherMap[item.id] = saved.id
      if (!existing) teachersAdded += 1
    }
    let supervisorsAdded = 0
    let skippedSupervisors = 0
    for (const item of local.supervisors ?? []) {
      const existing = (item.legacyId ? db.prepare('SELECT * FROM supervisors WHERE legacy_id = ?').get(item.legacyId) : undefined) as Json | undefined
        ?? db.prepare('SELECT * FROM supervisors WHERE lower(name) = lower(?)').get(item.name) as Json | undefined
      if (existing) { skippedSupervisors += 1; continue }
      upsertSupervisor(db, { ...item, legacyId: item.legacyId ?? item.id, teacherId: item.teacherId ? (teacherMap[item.teacherId] ?? item.teacherId) : undefined })
      supervisorsAdded += 1
    }
    let assessmentsAdded = 0
    let skippedAssessments = 0
    for (const item of local.assessments ?? []) {
      const existing = item.legacyId ? db.prepare('SELECT id FROM assessments WHERE legacy_id = ?').get(item.legacyId) : undefined
      const teacherId = item.teacherId ? (teacherMap[item.teacherId] ?? item.teacherId) : ''
      if (existing || (teacherId && !db.prepare('SELECT id FROM teachers WHERE id = ?').get(teacherId))) { skippedAssessments += 1; continue }
      upsertAssessment(db, { ...item, legacyId: item.legacyId ?? item.id, teacherId })
      assessmentsAdded += 1
    }
    let settingsImported = false
    const storedSettings = db.prepare('SELECT * FROM school_settings WHERE id = 1').get() as Json | undefined
    const pristineSettings = storedSettings && String(storedSettings.school_name) === defaultSettings.schoolName && String(storedSettings.default_period) === defaultSettings.defaultPeriod && String(storedSettings.signature_city) === defaultSettings.signatureCity && String(storedSettings.signature_detail) === defaultSettings.signatureDetail && !String(storedSettings.signature_name ?? '') && !String(storedSettings.signature_position ?? '') && !String(storedSettings.signature_image ?? '')
    if (local.settings && pristineSettings) { updateSettings(db, local.settings); settingsImported = true }
    return { teachersAdded, supervisorsAdded, assessmentsAdded, settingsImported, skippedAssessments, skippedSupervisors }
  })
  return transaction()
}

function updateSettings(db: DatabaseHandle, input: Partial<AppSettings>) {
  db.prepare(`UPDATE school_settings SET school_name=@schoolName, default_period=@defaultPeriod, signature_city=@signatureCity, signature_detail=@signatureDetail, supervisor_setup_complete=@supervisorSetupComplete, signature_name=@signatureName, signature_position=@signaturePosition, signature_image=@signatureImage WHERE id=1`).run({
    schoolName: input.schoolName ?? defaultSettings.schoolName, defaultPeriod: input.defaultPeriod ?? defaultSettings.defaultPeriod, signatureCity: input.signatureCity ?? defaultSettings.signatureCity, signatureDetail: input.signatureDetail ?? defaultSettings.signatureDetail, supervisorSetupComplete: input.supervisorSetupComplete ? 1 : 0, signatureName: input.signatureName ?? '', signaturePosition: input.signaturePosition ?? '', signatureImage: input.signatureImage ?? '',
  })
  return settingsFromRow(db.prepare('SELECT * FROM school_settings WHERE id=1').get() as Json)
}

export function createApp(db: DatabaseHandle) {
  const app = express()
  app.use(express.json({ limit: '10mb' }))
  app.use(cookieParser())
  app.use((_request, _response, next) => { purgeExpiredSessions(db); next() })
  app.get('/healthz', (_request, response) => response.json({ ok: true }))

  app.post('/api/auth/login', (request, response) => {
    const { username, password, role } = request.body as { username?: string; password?: string; role?: string }
    const row = username ? db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username.trim()) as Json | undefined : undefined
    if (!row || !password || !verifyPassword(password, String(row.password_hash)) || row.active !== 1) return error(response, 'Username atau password tidak sesuai.', 401)
    if (row.role !== role) return error(response, 'Peran akun tidak sesuai.', 403)
    const user = mapUser(row)
    issueSession(db, user.id, response)
    return response.json(sessionPayload(user))
  })
  app.post('/api/auth/logout', (request, response) => { destroySession(db, request, response); response.json({ ok: true }) })
  app.use('/api', (request, response, next) => { const user = userFromRequest(db, request); if (!user) return error(response, 'Sesi tidak ditemukan atau sudah berakhir.', 401); request.user = user; next() })
  app.get('/api/auth/me', (request, response) => response.json(sessionPayload(request.user!)))
  app.post('/api/auth/change-password', (request, response) => {
    const { currentPassword, nextPassword } = request.body as { currentPassword?: string; nextPassword?: string }
    if (!currentPassword || !nextPassword || nextPassword.length < 8) return error(response, 'Password baru minimal 8 karakter.')
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(request.user!.id) as { password_hash: string } | undefined
    if (!row || !verifyPassword(currentPassword, row.password_hash)) return error(response, 'Password saat ini tidak sesuai.', 400)
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(hashPassword(nextPassword), request.user!.id)
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(request.user!.id) as Json
    return response.json(sessionPayload(mapUser(updated)))
  })

  app.get('/api/teachers', (request, response) => {
    const query = request.user!.role === 'guru' ? db.prepare('SELECT * FROM teachers WHERE id = ? ORDER BY name').all(request.user!.teacherId) : db.prepare('SELECT * FROM teachers ORDER BY name').all()
    response.json((query as unknown[]).map((row) => teacherFromRow(row as Json)))
  })
  app.post('/api/teachers', roleIs('admin'), (request, response) => { try { response.status(201).json(upsertTeacher(db, request.body as Partial<Teacher>)) } catch (reason) { error(response, reason instanceof Error ? reason.message : 'Guru gagal disimpan.') } })
  app.patch('/api/teachers/:id', roleIs('admin'), (request, response) => { try { response.json(upsertTeacher(db, { ...(request.body as Partial<Teacher>), id: String(request.params.id) })) } catch (reason) { error(response, reason instanceof Error ? reason.message : 'Guru gagal diperbarui.') } })
  app.delete('/api/teachers/:id', roleIs('admin'), (request, response) => {
    const id = String(request.params.id)
    const assessment = db.prepare('SELECT id FROM assessments WHERE teacher_id = ? LIMIT 1').get(id)
    if (assessment) return error(response, 'Guru yang memiliki riwayat penilaian hanya dapat diarsipkan.', 409)
    db.prepare("DELETE FROM users WHERE role = 'guru' AND teacher_id = ?").run(id)
    db.prepare('DELETE FROM teachers WHERE id = ?').run(id)
    return response.json({ ok: true })
  })

  app.get('/api/supervisors', roleIs('admin', 'supervisor'), (_request, response) => response.json((db.prepare('SELECT * FROM supervisors ORDER BY name').all() as unknown[]).map((row) => supervisorFromRow(row as Json))))
  app.post('/api/supervisors', roleIs('admin'), (request, response) => { try { response.status(201).json(upsertSupervisor(db, request.body as Partial<Supervisor>)) } catch (reason) { error(response, reason instanceof Error ? reason.message : 'Supervisor gagal disimpan.') } })
  app.patch('/api/supervisors/:id', roleIs('admin'), (request, response) => { try { response.json(upsertSupervisor(db, { ...(request.body as Partial<Supervisor>), id: String(request.params.id) })) } catch (reason) { error(response, reason instanceof Error ? reason.message : 'Supervisor gagal diperbarui.') } })

  app.get('/api/assessments', (request, response) => {
    const rows = request.user!.role === 'guru' ? db.prepare('SELECT * FROM assessments WHERE teacher_id = ? ORDER BY updated_at DESC').all(request.user!.teacherId) : db.prepare('SELECT * FROM assessments ORDER BY updated_at DESC').all()
    response.json((rows as unknown[]).map((row) => assessmentFromRow(row as Json)))
  })
  app.post('/api/assessments', roleIs('admin', 'supervisor'), (request, response) => { try { response.status(201).json(upsertAssessment(db, request.body as Partial<Assessment>)) } catch (reason) { error(response, reason instanceof Error ? reason.message : 'Penilaian gagal disimpan.') } })
  app.patch('/api/assessments/:id', roleIs('admin', 'supervisor'), (request, response) => { try { response.json(upsertAssessment(db, { ...(request.body as Partial<Assessment>), id: String(request.params.id) })) } catch (reason) { error(response, reason instanceof Error ? reason.message : 'Penilaian gagal diperbarui.') } })

  app.get('/api/settings', roleIs('admin', 'supervisor'), (_request, response) => response.json(settingsFromRow(db.prepare('SELECT * FROM school_settings WHERE id=1').get() as Json)))
  app.patch('/api/settings', roleIs('admin'), (request, response) => response.json(updateSettings(db, request.body as Partial<AppSettings>)))
  app.post('/api/admin/migrate-local', roleIs('admin'), (request, response) => { try { response.json(localMigration(db, request.body as PersistedData)) } catch (reason) { error(response, reason instanceof Error ? reason.message : 'Migrasi data gagal.') } })

  const staticRoot = process.env.STATIC_ROOT
  if (staticRoot) {
    app.use(express.static(staticRoot))
    app.use((_request, response) => response.sendFile(`${staticRoot}/index.html`))
  }
  return app
}

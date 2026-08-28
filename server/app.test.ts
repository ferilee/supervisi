import { afterEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { rmSync } from 'node:fs'
import request from 'supertest'
import { createApp } from './app.js'
import { closeDatabase, createDatabase } from './db.js'
import { hashPassword } from './auth.js'

const databases: ReturnType<typeof createDatabase>[] = []

function testApp() {
  const db = createDatabase(':memory:')
  databases.push(db)
  return request(createApp(db))
}

afterEach(() => {
  while (databases.length) closeDatabase(databases.pop()!)
})

describe('SQLite backend', () => {
  it('menerima login admin dan menyimpan guru lintas request', async () => {
    const app = testApp()
    const login = await app.post('/api/auth/login').send({ username: 'Ferilee', password: 'F3r!-lee', role: 'admin' }).expect(200)
    const cookie = login.headers['set-cookie']
    expect(login.body.backend).toBe('sqlite')

    await app.post('/api/teachers').set('Cookie', cookie).send({ name: 'Siti Rahmawati, S.Pd.', subject: 'Bahasa Indonesia', initials: 'SR', color: '#d9f3eb', active: true }).expect(201)
    const teachers = await app.get('/api/teachers').set('Cookie', cookie).expect(200)
    expect(teachers.body).toHaveLength(1)
    expect(teachers.body[0].name).toBe('Siti Rahmawati, S.Pd.')
  })

  it('migrasi browser mempertahankan data server dan tidak menggandakan guru', async () => {
    const app = testApp()
    const login = await app.post('/api/auth/login').send({ username: 'Ferilee', password: 'F3r!-lee', role: 'admin' }).expect(200)
    const cookie = login.headers['set-cookie']
    const snapshot = { teachers: [{ id: 'local-1', name: 'Dewi Lestari, S.Pd.', subject: 'Matematika', initials: 'DL', color: '#f6dca8', active: true }], supervisors: [], assessments: [], settings: null }

    await app.post('/api/admin/migrate-local').set('Cookie', cookie).send(snapshot).expect(200)
    const second = await app.post('/api/admin/migrate-local').set('Cookie', cookie).send(snapshot).expect(200)
    expect(second.body.teachersAdded).toBe(0)
    expect((await app.get('/api/teachers').set('Cookie', cookie)).body).toHaveLength(1)
  })

  it('akun guru dibuat otomatis, wajib ganti password, dan tidak dapat menulis penilaian', async () => {
    const app = testApp()
    const admin = await app.post('/api/auth/login').send({ username: 'Ferilee', password: 'F3r!-lee', role: 'admin' }).expect(200)
    const adminCookie = admin.headers['set-cookie']
    const teacher = await app.post('/api/teachers').set('Cookie', adminCookie).send({ name: 'Ahmad Fauzan, S.Pd.', subject: 'Teknik Pemesinan', active: true }).expect(201)

    const guru = await app.post('/api/auth/login').send({ username: 'Ahmad', password: 'gurusmakenpas', role: 'guru' }).expect(200)
    expect(guru.body.teacherId).toBe(teacher.body.id)
    expect(guru.body.mustChangePassword).toBe(true)
    const guruCookie = guru.headers['set-cookie']
    await app.post('/api/assessments').set('Cookie', guruCookie).send({ teacherId: teacher.body.id }).expect(403)
    await app.post('/api/auth/change-password').set('Cookie', guruCookie).send({ currentPassword: 'gurusmakenpas', nextPassword: 'password-baru-123' }).expect(200)
  }, 20000)

  it('membersihkan tanda baca pada username supervisor dan memakai suffix yang benar', async () => {
    const app = testApp()
    const admin = await app.post('/api/auth/login').send({ username: 'Ferilee', password: 'F3r!-lee', role: 'admin' }).expect(200)
    const cookie = admin.headers['set-cookie']
    await app.post('/api/teachers').set('Cookie', cookie).send({ name: 'Winarsih, S.Pd', subject: 'Matematika', active: true }).expect(201)
    await app.post('/api/supervisors').set('Cookie', cookie).send({ name: 'Winarsih, S.Pd', position: 'Supervisor', active: true }).expect(201)
    const users = await app.post('/api/auth/login').send({ username: 'Winarsih2', password: 'supervisorsmakenpas', role: 'supervisor' }).expect(200)
    expect(users.body.username).toBe('Winarsih2')
  })

  it('memperbaiki username lama Winarsih,2 saat database dibuka kembali', () => {
    const filename = `/tmp/supervisi-username-${randomUUID()}.sqlite`
    const first = createDatabase(filename)
    first.prepare(`INSERT INTO users (id, username, display_name, role, password_hash, active, must_change_password, created_at)
      VALUES (?, ?, ?, 'supervisor', ?, 1, 1, ?)`).run(randomUUID(), 'Winarsih,2', 'Winarsih, S.Pd', hashPassword('supervisorsmakenpas'), new Date().toISOString())
    closeDatabase(first)

    const second = createDatabase(filename)
    expect((second.prepare("SELECT username FROM users WHERE role = 'supervisor'").all() as Array<{ username: string }>).map((row) => row.username)).toContain('Winarsih2')
    closeDatabase(second)
    rmSync(filename, { force: true }); rmSync(`${filename}-shm`, { force: true }); rmSync(`${filename}-wal`, { force: true })
  })
})

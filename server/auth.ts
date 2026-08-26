import bcrypt from 'bcryptjs'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { Request, Response } from 'express'
import type { DatabaseHandle } from './db.js'

export const SESSION_COOKIE = 'supervisi_session'
const SESSION_DAYS = 30

export type AuthUser = {
  id: string
  username: string
  displayName: string
  role: 'admin' | 'supervisor' | 'guru'
  teacherId?: string
  mustChangePassword: boolean
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 12)
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash)
}

export function mapUser(row: Record<string, unknown>): AuthUser {
  return {
    id: String(row.id), username: String(row.username), displayName: String(row.display_name),
    role: row.role as AuthUser['role'], teacherId: typeof row.teacher_id === 'string' ? row.teacher_id : undefined,
    mustChangePassword: Boolean(row.must_change_password),
  }
}

export function sessionPayload(user: AuthUser) {
  return { userId: user.id, username: user.username, displayName: user.displayName, role: user.role, teacherId: user.teacherId, mustChangePassword: user.mustChangePassword, backend: 'sqlite' as const }
}

export function issueSession(db: DatabaseHandle, userId: string, response: Response) {
  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  const expires = new Date(now.getTime() + SESSION_DAYS * 86_400_000)
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(hashToken(token), userId, expires.toISOString(), now.toISOString())
  response.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', expires, path: '/' })
}

export function destroySession(db: DatabaseHandle, request: Request, response: Response) {
  const token = request.cookies?.[SESSION_COOKIE]
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token))
  response.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' })
}

export function userFromRequest(db: DatabaseHandle, request: Request) {
  const token = request.cookies?.[SESSION_COOKIE]
  if (!token) return null
  const row = db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND u.active = 1`).get(hashToken(token)) as Record<string, unknown> | undefined
  return row ? mapUser(row) : null
}

export function purgeExpiredSessions(db: DatabaseHandle) {
  db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run()
}

export function newId() {
  return randomUUID()
}

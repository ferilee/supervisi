import type { AuthSession, Supervisor, Teacher, UserRole } from '../types'

const SESSION_KEY = 'supervisi-auth-session-v1'
const ACCOUNTS_KEY = 'supervisi-auth-accounts-v1'
const DEFAULT_SUPERVISOR_PASSWORD = 'supervisorsmakenpas'
const ADMIN_USERNAME = 'Ferilee'
const ADMIN_PASSWORD = 'F3r!-lee'
const useLocalData = import.meta.env.VITE_USE_LOCAL_DATA === 'true'

type LocalAccount = AuthSession & { password: string }
export const isBackendConfigured = !useLocalData

function normalize(value: string) { return value.trim().toLocaleLowerCase('id-ID') }
export function usernameFromName(name: string) { return name.trim().split(/\s+/)[0] ?? '' }

async function backendRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`/api${path}`, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) } })
  const body = await response.json().catch(() => ({})) as { error?: string } & T
  if (!response.ok) throw new Error(body.error || 'Permintaan backend gagal.')
  return body
}

function getLocalAccounts(): LocalAccount[] { try { const stored = localStorage.getItem(ACCOUNTS_KEY); return stored ? JSON.parse(stored) as LocalAccount[] : [] } catch { return [] } }
function saveLocalAccounts(accounts: LocalAccount[]) { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)) }
function ensureSupervisorAccounts(supervisors: Supervisor[]) {
  const accounts = getLocalAccounts(); const next = [...accounts]
  supervisors.forEach((supervisor) => { const username = usernameFromName(supervisor.name); if (!username || next.some((account) => account.role === 'supervisor' && account.userId === supervisor.id)) return; next.push({ userId: supervisor.id, username, displayName: supervisor.name, role: 'supervisor', mustChangePassword: true, backend: 'local', password: DEFAULT_SUPERVISOR_PASSWORD }) })
  if (next.length !== accounts.length) saveLocalAccounts(next)
}
export function bootstrapLocalAccounts(supervisors: Supervisor[]) { if (useLocalData) ensureSupervisorAccounts(supervisors) }

export function getStoredSession(): AuthSession | null {
  if (!useLocalData) return null
  try { const stored = localStorage.getItem(SESSION_KEY); return stored ? JSON.parse(stored) as AuthSession : null } catch { return null }
}
export async function getCurrentSession() { if (useLocalData) return getStoredSession(); try { return await backendRequest<AuthSession>('/auth/me') } catch { return null } }
export function clearStoredSession() { localStorage.removeItem(SESSION_KEY) }
function saveSession(session: AuthSession) { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); return session }

export async function signIn({ username, password, role, teacherId, supervisors, teachers }: { username: string; password: string; role: UserRole; teacherId?: string; supervisors: Supervisor[]; teachers?: Teacher[] }): Promise<AuthSession> {
  if (!useLocalData) return backendRequest<AuthSession>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password, role }) })
  ensureSupervisorAccounts(supervisors)
  if (role === 'admin' && normalize(username) === normalize(ADMIN_USERNAME) && password === ADMIN_PASSWORD) return saveSession({ userId: 'local-admin', username: ADMIN_USERNAME, displayName: 'Ferilee', role: 'admin', mustChangePassword: false, backend: 'local' })
  if (role === 'guru' && teacherId) { const teacher = teachers?.find((item) => item.id === teacherId); if (!teacher) throw new Error('Nama guru tidak ditemukan.'); return saveSession({ userId: `local-teacher-${teacher.id}`, username: usernameFromName(teacher.name), displayName: teacher.name, role: 'guru', teacherId: teacher.id, mustChangePassword: false, backend: 'local' }) }
  const account = getLocalAccounts().find((item) => item.role === role && normalize(item.username) === normalize(username) && item.password === password && (!teacherId || item.teacherId === teacherId))
  if (!account) throw new Error('Username atau password tidak sesuai.')
  if (role === 'supervisor' && !supervisors.some((supervisor) => supervisor.id === account.userId && supervisor.active)) throw new Error('Akun supervisor ini sudah dinonaktifkan oleh Admin.')
  const { password: _password, ...session } = account; return saveSession(session)
}

export async function changePassword(session: AuthSession, currentPassword: string, nextPassword: string, _supervisors: Supervisor[]) {
  if (nextPassword.length < 8) throw new Error('Password baru minimal 8 karakter.')
  if (session.backend === 'sqlite') return backendRequest<AuthSession>('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, nextPassword }) })
  const accounts = getLocalAccounts(); const index = accounts.findIndex((account) => account.userId === session.userId)
  if (index < 0 || accounts[index].password !== currentPassword) throw new Error('Password saat ini tidak sesuai.')
  accounts[index] = { ...accounts[index], password: nextPassword, mustChangePassword: false }; saveLocalAccounts(accounts)
  return saveSession({ ...session, mustChangePassword: false })
}

export async function signOut() { if (!useLocalData) await backendRequest('/auth/logout', { method: 'POST' }); clearStoredSession() }
export function createLocalTeacherAccount(teacher: Teacher) { if (!useLocalData) return; const accounts = getLocalAccounts(); if (accounts.some((account) => account.teacherId === teacher.id && account.role === 'guru')) return; saveLocalAccounts([...accounts, { userId: `teacher-${teacher.id}`, username: usernameFromName(teacher.name), displayName: teacher.name, role: 'guru', teacherId: teacher.id, mustChangePassword: true, backend: 'local', password: '' }]) }
export { DEFAULT_SUPERVISOR_PASSWORD }

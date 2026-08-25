import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AuthSession, Supervisor, Teacher, UserRole } from '../types'

const SESSION_KEY = 'supervisi-auth-session-v1'
const ACCOUNTS_KEY = 'supervisi-auth-accounts-v1'
const DEFAULT_SUPERVISOR_PASSWORD = 'supervisorsmakenpas'
const ADMIN_USERNAME = 'Ferilee'
const ADMIN_PASSWORD = 'F3r!-lee'

type LocalAccount = AuthSession & { password: string }

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const isBackendConfigured = Boolean(supabase)

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('id-ID')
}

export function usernameFromName(name: string) {
  return name.trim().split(/\s+/)[0] ?? ''
}

function getLocalAccounts(): LocalAccount[] {
  try {
    const stored = localStorage.getItem(ACCOUNTS_KEY)
    return stored ? JSON.parse(stored) as LocalAccount[] : []
  } catch {
    return []
  }
}

function saveLocalAccounts(accounts: LocalAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

function ensureSupervisorAccounts(supervisors: Supervisor[]) {
  const accounts = getLocalAccounts()
  const next = [...accounts]
  supervisors.forEach((supervisor) => {
    const username = usernameFromName(supervisor.name)
    if (!username || next.some((account) => account.role === 'supervisor' && account.userId === supervisor.id)) return
    next.push({ userId: supervisor.id, username, displayName: supervisor.name, role: 'supervisor', mustChangePassword: true, backend: 'local', password: DEFAULT_SUPERVISOR_PASSWORD })
  })
  if (next.length !== accounts.length) saveLocalAccounts(next)
}

export function bootstrapLocalAccounts(supervisors: Supervisor[]) {
  ensureSupervisorAccounts(supervisors)
}

export function getStoredSession(): AuthSession | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY)
    return stored ? JSON.parse(stored) as AuthSession : null
  } catch {
    return null
  }
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY)
}

function saveSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export async function signIn({ username, password, role, teacherId, supervisors, teachers }: { username: string; password: string; role: UserRole; teacherId?: string; supervisors: Supervisor[]; teachers?: Teacher[] }): Promise<AuthSession> {
  if (supabase) {
    const email = `${normalize(username)}@auth.smknpasirian.local`
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) throw new Error('Username atau password tidak sesuai.')
    const { data: profile, error: profileError } = await supabase.from('profiles').select('id, username, display_name, role, teacher_id, must_change_password').eq('id', data.user.id).single()
    if (profileError || !profile || profile.role !== role || (role === 'guru' && teacherId && profile.teacher_id !== teacherId)) throw new Error('Profil akun belum dikonfigurasi dengan benar.')
    return saveSession({ userId: profile.id, username: profile.username, displayName: profile.display_name, role: profile.role, teacherId: profile.teacher_id ?? undefined, mustChangePassword: profile.must_change_password, backend: 'supabase' })
  }

  ensureSupervisorAccounts(supervisors)
  if (role === 'admin' && normalize(username) === normalize(ADMIN_USERNAME) && password === ADMIN_PASSWORD) {
    return saveSession({ userId: 'local-admin', username: ADMIN_USERNAME, displayName: 'Ferilee', role: 'admin', mustChangePassword: false, backend: 'local' })
  }
  if (role === 'guru' && teacherId) {
    const teacher = teachers?.find((item) => item.id === teacherId)
    if (!teacher) throw new Error('Nama guru tidak ditemukan.')
    return saveSession({ userId: `local-teacher-${teacher.id}`, username: usernameFromName(teacher.name), displayName: teacher.name, role: 'guru', teacherId: teacher.id, mustChangePassword: false, backend: 'local' })
  }
  const account = getLocalAccounts().find((item) => item.role === role && normalize(item.username) === normalize(username) && item.password === password && (!teacherId || item.teacherId === teacherId))
  if (!account) throw new Error('Username atau password tidak sesuai.')
  const { password: _password, ...session } = account
  return saveSession(session)
}

export async function changePassword(session: AuthSession, currentPassword: string, nextPassword: string, supervisors: Supervisor[]) {
  if (nextPassword.length < 8) throw new Error('Password baru minimal 8 karakter.')
  if (supabase && session.backend === 'supabase') {
    const email = `${normalize(session.username)}@auth.smknpasirian.local`
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
    if (signInError) throw new Error('Password saat ini tidak sesuai.')
    const { error } = await supabase.auth.updateUser({ password: nextPassword })
    if (error) throw new Error('Password gagal diperbarui.')
    const { error: profileError } = await supabase.rpc('complete_password_change')
    if (profileError) throw new Error('Password berubah, tetapi status akun belum dapat diperbarui. Hubungi admin.')
  } else {
    const accounts = getLocalAccounts()
    const index = accounts.findIndex((account) => account.userId === session.userId)
    if (index < 0 || accounts[index].password !== currentPassword) throw new Error('Password saat ini tidak sesuai.')
    accounts[index] = { ...accounts[index], password: nextPassword, mustChangePassword: false }
    saveLocalAccounts(accounts)
  }
  return saveSession({ ...session, mustChangePassword: false })
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut()
  clearStoredSession()
}

export function createLocalTeacherAccount(teacher: Teacher) {
  const accounts = getLocalAccounts()
  if (accounts.some((account) => account.teacherId === teacher.id && account.role === 'guru')) return
  const username = usernameFromName(teacher.name)
  saveLocalAccounts([...accounts, { userId: `teacher-${teacher.id}`, username, displayName: teacher.name, role: 'guru', teacherId: teacher.id, mustChangePassword: true, backend: 'local', password: '' }])
}

export { DEFAULT_SUPERVISOR_PASSWORD }

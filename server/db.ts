import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

export type DatabaseHandle = Database.Database

export const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME?.trim() || 'Ferilee'
export const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'F3r!-lee'
export const DEFAULT_SUPERVISOR_PASSWORD = 'supervisorsmakenpas'
export const DEFAULT_TEACHER_PASSWORD = 'gurusmakenpas'

export const defaultSettings = {
  schoolName: 'SMKN Pasirian',
  defaultPeriod: '2026',
  signatureCity: 'Pasirian',
  signatureDetail: 'Kepala Sekolah & Pendamping Sekolah',
  supervisorSetupComplete: false,
  signatureName: '',
  signaturePosition: '',
  signatureImage: '',
}

export function createDatabase(filename: string): DatabaseHandle {
  if (filename !== ':memory:') mkdirSync(path.dirname(path.resolve(filename)), { recursive: true })
  const db = new Database(filename)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_versions (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      legacy_id TEXT UNIQUE,
      name TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      initials TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#d9f3eb',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS supervisors (
      id TEXT PRIMARY KEY,
      legacy_id TEXT UNIQUE,
      teacher_id TEXT,
      name TEXT NOT NULL,
      position TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'guru')),
      teacher_id TEXT,
      password_hash TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      legacy_id TEXT UNIQUE,
      teacher_id TEXT,
      period TEXT NOT NULL DEFAULT '',
      class_name TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      topic TEXT NOT NULL DEFAULT '',
      observer TEXT NOT NULL DEFAULT '',
      observation_date TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'selesai')),
      current_stage TEXT NOT NULL DEFAULT 'pra-observasi',
      pre_observation TEXT NOT NULL DEFAULT '{}',
      observation TEXT NOT NULL DEFAULT '{}',
      reflection TEXT NOT NULL DEFAULT '{}',
      feedback TEXT NOT NULL DEFAULT '{}',
      follow_ups TEXT NOT NULL DEFAULT '[]',
      supervisor_note TEXT NOT NULL DEFAULT '',
      recommendation TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS school_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      school_name TEXT NOT NULL,
      default_period TEXT NOT NULL,
      signature_city TEXT NOT NULL,
      signature_detail TEXT NOT NULL,
      supervisor_setup_complete INTEGER NOT NULL DEFAULT 0,
      signature_name TEXT NOT NULL DEFAULT '',
      signature_position TEXT NOT NULL DEFAULT '',
      signature_image TEXT NOT NULL DEFAULT ''
    );
  `)

  const now = new Date().toISOString()
  const existingSettings = db.prepare('SELECT id FROM school_settings WHERE id = 1').get()
  if (!existingSettings) {
    db.prepare(`INSERT INTO school_settings (id, school_name, default_period, signature_city, signature_detail, supervisor_setup_complete, signature_name, signature_position, signature_image)
      VALUES (1, @schoolName, @defaultPeriod, @signatureCity, @signatureDetail, @supervisorSetupComplete, @signatureName, @signaturePosition, @signatureImage)`).run({
      ...defaultSettings,
      supervisorSetupComplete: defaultSettings.supervisorSetupComplete ? 1 : 0,
    })
  }

  const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as { id: string } | undefined
  if (!admin) {
    db.prepare(`INSERT INTO users (id, username, display_name, role, password_hash, active, must_change_password, created_at)
      VALUES (@id, @username, @displayName, 'admin', @passwordHash, 1, 0, @createdAt)`).run({
      id: randomUUID(), username: DEFAULT_ADMIN_USERNAME, displayName: DEFAULT_ADMIN_USERNAME,
      passwordHash: bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 12), createdAt: now,
    })
  }
  return db
}

export function closeDatabase(db: DatabaseHandle) {
  db.close()
}

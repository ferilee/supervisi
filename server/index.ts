import path from 'node:path'
import { createApp } from './app.js'
import { closeDatabase, createDatabase } from './db.js'

const databasePath = process.env.DATABASE_PATH || path.resolve('data/supervisi.sqlite')
process.env.STATIC_ROOT ||= path.resolve('dist')
const db = createDatabase(databasePath)
const app = createApp(db)
const port = Number(process.env.PORT || 2005)
const server = app.listen(port, '0.0.0.0', () => console.log(`Supervisi API listening on :${port}`))

function shutdown() {
  server.close(() => { closeDatabase(db); process.exit(0) })
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

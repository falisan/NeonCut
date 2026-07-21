import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

let db: SqlJsDatabase
let dbFilePath: string

function wasmDir(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist')
    : join(app.getAppPath(), 'node_modules', 'sql.js', 'dist')
}

export async function openDb(filePath: string): Promise<void> {
  dbFilePath = filePath
  const SQL = await initSqlJs({ locateFile: (file) => join(wasmDir(), file) })
  db = existsSync(filePath) ? new SQL.Database(readFileSync(filePath)) : new SQL.Database()
}

function persist(): void {
  writeFileSync(dbFilePath, Buffer.from(db.export()))
}

export function exec(sql: string): void {
  db.exec(sql)
  persist()
}

export function run(sql: string, params: Record<string, unknown> = {}): void {
  const stmt = db.prepare(sql)
  stmt.bind(params as never)
  stmt.step()
  stmt.free()
  persist()
}

export function all<T = Record<string, unknown>>(sql: string, params: Record<string, unknown> = {}): T[] {
  const stmt = db.prepare(sql)
  stmt.bind(params as never)
  const rows: T[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T)
  }
  stmt.free()
  return rows
}

export function get<T = Record<string, unknown>>(sql: string, params: Record<string, unknown> = {}): T | undefined {
  return all<T>(sql, params)[0]
}

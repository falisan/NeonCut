import { join } from 'path'
import { mkdirSync } from 'fs'
import { getUserDataDir, getDefaultDownloadsDir } from './paths'
import { openDb, exec, run } from './sqljs'

export async function initDb(): Promise<void> {
  const dir = getUserDataDir()
  mkdirSync(dir, { recursive: true })
  await openDb(join(dir, 'neoncut.db'))

  exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mode TEXT NOT NULL,
      quality TEXT NOT NULL,
      container TEXT NOT NULL,
      audioFormat TEXT,
      audioQuality TEXT,
      destFolder TEXT,
      createdAt INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS library (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      sourceUrl TEXT NOT NULL,
      thumbnail TEXT,
      filePath TEXT NOT NULL,
      format TEXT,
      container TEXT,
      quality TEXT,
      durationSec REAL,
      sizeBytes INTEGER,
      project TEXT,
      tags TEXT,
      createdAt INTEGER NOT NULL
    );
  `)

  const defaults: Record<string, string> = {
    downloadPath: getDefaultDownloadsDir(),
    maxConcurrent: '1',
    rateLimitKbps: '0',
    neonIntensity: '1',
    scanlinesEnabled: '1',
    grainEnabled: '1',
    soundEnabled: '0',
    reducedContrast: '0',
    sponsorBlockEnabled: '0',
    legalNoticeSeen: '0'
  }
  for (const [key, value] of Object.entries(defaults)) {
    run('INSERT OR IGNORE INTO settings (key, value) VALUES (@key, @value)', { '@key': key, '@value': value })
  }
}

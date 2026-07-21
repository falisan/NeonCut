import { randomUUID } from 'crypto'
import { all, run } from './sqljs'

export interface Settings {
  downloadPath: string
  maxConcurrent: number
  rateLimitKbps: number
  neonIntensity: number
  scanlinesEnabled: boolean
  grainEnabled: boolean
  soundEnabled: boolean
  reducedContrast: boolean
  sponsorBlockEnabled: boolean
  legalNoticeSeen: boolean
}

const BOOL_KEYS = new Set([
  'scanlinesEnabled',
  'grainEnabled',
  'soundEnabled',
  'reducedContrast',
  'sponsorBlockEnabled',
  'legalNoticeSeen'
])
const NUM_KEYS = new Set(['maxConcurrent', 'rateLimitKbps', 'neonIntensity'])

export function getSettings(): Settings {
  const rows = all<{ key: string; value: string }>('SELECT key, value FROM settings')
  const out: Record<string, unknown> = {}
  for (const { key, value } of rows) {
    if (BOOL_KEYS.has(key)) out[key] = value === '1'
    else if (NUM_KEYS.has(key)) out[key] = Number(value)
    else out[key] = value
  }
  return out as unknown as Settings
}

export function setSetting(key: string, value: string | number | boolean): void {
  const v = typeof value === 'boolean' ? (value ? '1' : '0') : String(value)
  run('INSERT INTO settings (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value=@value', {
    '@key': key,
    '@value': v
  })
}

export interface Preset {
  id: string
  name: string
  mode: 'video' | 'clip' | 'audio'
  quality: string
  container: string
  audioFormat?: string
  audioQuality?: string
  destFolder?: string
  createdAt: number
}

export function listPresets(): Preset[] {
  return all<Preset>('SELECT * FROM presets ORDER BY createdAt DESC')
}

export function savePreset(p: Omit<Preset, 'id' | 'createdAt'>): Preset {
  const row: Preset = { ...p, id: randomUUID(), createdAt: Date.now() }
  run(
    `INSERT INTO presets (id, name, mode, quality, container, audioFormat, audioQuality, destFolder, createdAt)
     VALUES (@id, @name, @mode, @quality, @container, @audioFormat, @audioQuality, @destFolder, @createdAt)`,
    {
      '@id': row.id,
      '@name': row.name,
      '@mode': row.mode,
      '@quality': row.quality,
      '@container': row.container,
      '@audioFormat': row.audioFormat ?? null,
      '@audioQuality': row.audioQuality ?? null,
      '@destFolder': row.destFolder ?? null,
      '@createdAt': row.createdAt
    }
  )
  return row
}

export function deletePreset(id: string): void {
  run('DELETE FROM presets WHERE id = @id', { '@id': id })
}

export interface LibraryItem {
  id: string
  title: string
  sourceUrl: string
  thumbnail?: string
  filePath: string
  format?: string
  container?: string
  quality?: string
  durationSec?: number
  sizeBytes?: number
  project?: string
  tags?: string
  createdAt: number
}

export function addLibraryItem(item: Omit<LibraryItem, 'id' | 'createdAt'>): LibraryItem {
  const row: LibraryItem = { ...item, id: randomUUID(), createdAt: Date.now() }
  run(
    `INSERT INTO library (id, title, sourceUrl, thumbnail, filePath, format, container, quality, durationSec, sizeBytes, project, tags, createdAt)
     VALUES (@id, @title, @sourceUrl, @thumbnail, @filePath, @format, @container, @quality, @durationSec, @sizeBytes, @project, @tags, @createdAt)`,
    {
      '@id': row.id,
      '@title': row.title,
      '@sourceUrl': row.sourceUrl,
      '@thumbnail': row.thumbnail ?? null,
      '@filePath': row.filePath,
      '@format': row.format ?? null,
      '@container': row.container ?? null,
      '@quality': row.quality ?? null,
      '@durationSec': row.durationSec ?? null,
      '@sizeBytes': row.sizeBytes ?? null,
      '@project': row.project ?? null,
      '@tags': row.tags ?? null,
      '@createdAt': row.createdAt
    }
  )
  return row
}

export function listLibrary(): LibraryItem[] {
  return all<LibraryItem>('SELECT * FROM library ORDER BY createdAt DESC')
}

export function deleteLibraryItem(id: string): void {
  run('DELETE FROM library WHERE id = @id', { '@id': id })
}

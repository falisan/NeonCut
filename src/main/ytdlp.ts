import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import { randomUUID } from 'crypto'
import { dirname } from 'path'
import { getBinaryPath } from './paths'
import { getSettings } from './repo'

export interface FormatInfo {
  formatId: string
  ext: string
  vcodec: string
  acodec: string
  height?: number
  fps?: number
  tbr?: number
  filesizeApprox?: number
  note?: string
}

export interface AnalyzeResult {
  id: string
  title: string
  thumbnail?: string
  durationSec?: number
  webpageUrl: string
  uploader?: string
  formats: FormatInfo[]
  isPlaylist: boolean
  playlistCount?: number
}

export interface PlaylistEntry {
  index: number
  id: string
  title: string
  url: string
}

export interface PlaylistResult {
  id: string
  title: string
  webpageUrl: string
  entries: PlaylistEntry[]
}

function runJson(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const bin = getBinaryPath('ytdlp')
    const proc = spawn(bin, args)
    let out = ''
    let err = ''
    proc.stdout.on('data', (d) => (out += d.toString()))
    proc.stderr.on('data', (d) => (err += d.toString()))
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve(out)
      else reject(new Error(err.trim() || `yt-dlp salio con codigo ${code}`))
    })
  })
}

export async function analyzeUrl(url: string): Promise<AnalyzeResult> {
  const ffmpegDir = dirname(getBinaryPath('ffmpeg'))
  const raw = await runJson([
    '-J',
    '--no-warnings',
    '--no-playlist',
    '--ffmpeg-location',
    ffmpegDir,
    url
  ])
  const data = JSON.parse(raw)

  const formats: FormatInfo[] = (data.formats ?? []).map((f: Record<string, unknown>) => ({
    formatId: String(f.format_id),
    ext: String(f.ext),
    vcodec: String(f.vcodec ?? 'none'),
    acodec: String(f.acodec ?? 'none'),
    height: typeof f.height === 'number' ? f.height : undefined,
    fps: typeof f.fps === 'number' ? f.fps : undefined,
    tbr: typeof f.tbr === 'number' ? f.tbr : undefined,
    filesizeApprox:
      typeof f.filesize === 'number'
        ? f.filesize
        : typeof f.filesize_approx === 'number'
          ? f.filesize_approx
          : undefined,
    note: typeof f.format_note === 'string' ? f.format_note : undefined
  }))

  return {
    id: String(data.id),
    title: String(data.title ?? url),
    thumbnail: typeof data.thumbnail === 'string' ? data.thumbnail : undefined,
    durationSec: typeof data.duration === 'number' ? data.duration : undefined,
    webpageUrl: String(data.webpage_url ?? url),
    uploader: typeof data.uploader === 'string' ? data.uploader : undefined,
    formats,
    isPlaylist: data._type === 'playlist'
  }
}

export async function analyzePlaylist(url: string): Promise<PlaylistResult> {
  const ffmpegDir = dirname(getBinaryPath('ffmpeg'))
  const raw = await runJson([
    '-J',
    '--no-warnings',
    '--yes-playlist',
    '--flat-playlist',
    '--ffmpeg-location',
    ffmpegDir,
    url
  ])
  const data = JSON.parse(raw)

  const rawEntries: Record<string, unknown>[] = Array.isArray(data.entries) ? data.entries : []
  const entries: PlaylistEntry[] = rawEntries.map((e, i) => ({
    index: i + 1,
    id: String(e.id ?? i),
    title: String(e.title ?? e.id ?? `Elemento ${i + 1}`),
    url: String(e.url ?? e.webpage_url ?? '')
  }))

  return {
    id: String(data.id ?? url),
    title: String(data.title ?? url),
    webpageUrl: String(data.webpage_url ?? url),
    entries
  }
}

export async function getPreviewUrl(url: string): Promise<string | null> {
  const ffmpegDir = dirname(getBinaryPath('ffmpeg'))
  try {
    const raw = await runJson([
      '-g',
      '--no-warnings',
      '--no-playlist',
      '--ffmpeg-location',
      ffmpegDir,
      '-f',
      '18/best[ext=mp4][vcodec!=none][acodec!=none]/best[vcodec!=none][acodec!=none]',
      url
    ])
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    return lines[0] ?? null
  } catch {
    return null
  }
}

export type QualityStep = 'max' | '1080p' | '720p' | 'custom'
export type Container = 'mp4' | 'mkv' | 'mov'
export type AudioFormat = 'wav' | 'flac' | 'mp3' | 'm4a' | 'opus'

export interface ClipRange {
  startSec: number
  endSec: number
}

export interface DownloadJobRequest {
  url: string
  destFolder: string
  mode: 'video' | 'clip' | 'audio'
  quality: QualityStep
  customFormat?: string
  container: Container
  clips?: ClipRange[]
  audioFormat?: AudioFormat
  audioQuality?: string
  embedExtras?: boolean
  sponsorBlock?: boolean
  rateLimitKbps?: number
  titleHint?: string
  isPlaylist?: boolean
  playlistItems?: string
}

export interface ProgressEvent {
  jobId: string
  status: 'queued' | 'starting' | 'downloading' | 'postprocessing' | 'done' | 'error'
  percent?: number
  downloadedBytes?: number
  speedStr?: string
  etaStr?: string
  logLine?: string
  finalFilePath?: string
  errorMessage?: string
}

function fmtSecToClock(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = (sec % 60).toFixed(3)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.padStart(6, '0')}`
}

function qualityToFormatSelector(quality: QualityStep, custom?: string): string {
  switch (quality) {
    case 'max':
      return 'bestvideo+bestaudio/best'
    case '1080p':
      return 'bestvideo[height<=1080]+bestaudio/best[height<=1080]'
    case '720p':
      return 'bestvideo[height<=720]+bestaudio/best[height<=720]'
    case 'custom':
      return custom || 'bestvideo+bestaudio/best'
  }
}

function buildArgs(job: DownloadJobRequest, ffmpegDir: string): string[] {
  const args: string[] = [
    '--newline',
    '--no-warnings',
    '--progress',
    '--ffmpeg-location',
    ffmpegDir,
    '--progress-template',
    'download:NEONCUT_PROGRESS|%(progress.status)s|%(progress.downloaded_bytes)s|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s',
    '--print',
    'after_move:NEONCUT_FILE|%(filepath)s'
  ]

  if (job.isPlaylist) {
    args.push('--yes-playlist')
    if (job.playlistItems) args.push('--playlist-items', job.playlistItems)
  } else {
    args.push('--no-playlist')
  }

  if (job.rateLimitKbps && job.rateLimitKbps > 0) {
    args.push('--limit-rate', `${job.rateLimitKbps}K`)
  }

  if (job.mode === 'audio') {
    args.push('-x', '--audio-format', job.audioFormat ?? 'wav')
    args.push('--audio-quality', job.audioQuality ?? '0')
  } else {
    args.push('-f', qualityToFormatSelector(job.quality, job.customFormat))
    args.push('--merge-output-format', job.container)
  }

  if (job.embedExtras) {
    args.push('--embed-thumbnail', '--embed-metadata')
    if (job.mode !== 'audio') args.push('--embed-subs')
  }

  if (job.sponsorBlock) {
    args.push('--sponsorblock-remove', 'sponsor')
  }

  if (job.mode === 'clip' && job.clips && job.clips.length > 0) {
    for (const c of job.clips) {
      args.push('--download-sections', `*${fmtSecToClock(c.startSec)}-${fmtSecToClock(c.endSec)}`)
    }
    const multi = job.clips.length > 1
    const ext = job.container
    const nameTpl = multi
      ? `%(title)s_%(section_start)s-%(section_end)s.${ext}`
      : `%(title)s.${ext}`
    args.push('-o', `${job.destFolder}/${nameTpl}`)
  } else {
    const ext = job.mode === 'audio' ? '%(ext)s' : job.container
    const prefix = job.isPlaylist ? '%(playlist_index)s_' : ''
    args.push('-o', `${job.destFolder}/${prefix}%(title)s_%(resolution)s.${ext}`)
  }

  args.push(job.url)
  return args
}

interface PendingJob {
  jobId: string
  job: DownloadJobRequest
  onEvent: (evt: ProgressEvent) => void
}

const pending: PendingJob[] = []
const running = new Map<string, ChildProcessWithoutNullStreams>()

function pump(): void {
  const { maxConcurrent } = getSettings()
  const limit = Math.max(1, maxConcurrent || 1)
  while (running.size < limit && pending.length > 0) {
    const next = pending.shift()
    if (!next) break
    spawnJob(next.jobId, next.job, next.onEvent)
  }
}

function spawnJob(jobId: string, job: DownloadJobRequest, onEvent: (evt: ProgressEvent) => void): void {
  const ffmpegDir = dirname(getBinaryPath('ffmpeg'))
  const args = buildArgs(job, ffmpegDir)
  const bin = getBinaryPath('ytdlp')

  const proc = spawn(bin, args)
  running.set(jobId, proc)
  onEvent({ jobId, status: 'starting' })

  let stderrTail = ''
  let stdoutBuf = ''

  proc.stdout.on('data', (chunk: Buffer) => {
    stdoutBuf += chunk.toString()
    const lines = stdoutBuf.split(/\r?\n/)
    stdoutBuf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line) continue
      if (line.startsWith('NEONCUT_PROGRESS|')) {
        const [, status, downloaded, percentStr, speedStr, etaStr] = line.split('|')
        const downloadedBytes = Number(downloaded) || undefined
        const parsedPercent = parseFloat(percentStr)
        onEvent({
          jobId,
          status: status === 'finished' ? 'postprocessing' : 'downloading',
          downloadedBytes,
          percent: Number.isFinite(parsedPercent) ? Math.min(100, Math.max(0, parsedPercent)) : undefined,
          speedStr: speedStr && speedStr !== 'N/A' ? speedStr.trim() : undefined,
          etaStr: etaStr && etaStr !== 'N/A' ? etaStr.trim() : undefined
        })
      } else if (line.startsWith('NEONCUT_FILE|')) {
        const finalFilePath = line.slice('NEONCUT_FILE|'.length)
        onEvent({ jobId, status: 'postprocessing', finalFilePath, logLine: line })
      } else {
        onEvent({ jobId, status: 'downloading', logLine: line })
      }
    }
  })

  proc.stderr.on('data', (chunk: Buffer) => {
    const text = chunk.toString()
    stderrTail = (stderrTail + text).slice(-4000)
    onEvent({ jobId, status: 'downloading', logLine: text.trim() })
  })

  proc.on('error', (err) => {
    running.delete(jobId)
    onEvent({ jobId, status: 'error', errorMessage: err.message })
    pump()
  })

  proc.on('close', (code) => {
    running.delete(jobId)
    if (code === 0) {
      onEvent({ jobId, status: 'done', percent: 100 })
    } else {
      onEvent({ jobId, status: 'error', errorMessage: stderrTail.trim() || `yt-dlp salio con codigo ${code}` })
    }
    pump()
  })
}

export function cancelJob(jobId: string): boolean {
  const pendingIdx = pending.findIndex((p) => p.jobId === jobId)
  if (pendingIdx !== -1) {
    pending.splice(pendingIdx, 1)
    return true
  }
  const proc = running.get(jobId)
  if (!proc) return false
  proc.kill()
  running.delete(jobId)
  pump()
  return true
}

export function startDownload(
  job: DownloadJobRequest,
  onEvent: (evt: ProgressEvent) => void
): string {
  const jobId = randomUUID()
  pending.push({ jobId, job, onEvent })
  onEvent({ jobId, status: 'queued' })
  pump()
  return jobId
}

export async function updateEngine(onLog: (line: string) => void): Promise<void> {
  const bin = getBinaryPath('ytdlp')
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(bin, ['-U'])
    proc.stdout.on('data', (d) => onLog(d.toString()))
    proc.stderr.on('data', (d) => onLog(d.toString()))
    proc.on('error', reject)
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Actualizacion fallo con codigo ${code}`))))
  })
}

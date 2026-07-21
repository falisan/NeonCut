import { app } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'

const BIN_NAMES = {
  ytdlp: 'yt-dlp.exe',
  ffmpeg: 'ffmpeg.exe',
  ffprobe: 'ffprobe.exe'
} as const

function binDir(): string {
  return app.isPackaged ? join(process.resourcesPath, 'bin') : join(app.getAppPath(), 'resources', 'bin')
}

export function getBinaryPath(name: keyof typeof BIN_NAMES): string {
  const p = join(binDir(), BIN_NAMES[name])
  return p
}

export function binariesPresent(): { ytdlp: boolean; ffmpeg: boolean; ffprobe: boolean } {
  return {
    ytdlp: existsSync(getBinaryPath('ytdlp')),
    ffmpeg: existsSync(getBinaryPath('ffmpeg')),
    ffprobe: existsSync(getBinaryPath('ffprobe'))
  }
}

export function getUserDataDir(): string {
  return app.getPath('userData')
}

export function getDefaultDownloadsDir(): string {
  return join(app.getPath('videos'), 'NEONCUT')
}

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

export type Screen = 'dashboard' | 'clip' | 'queue' | 'library' | 'settings'

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

export interface ClipRange {
  id: string
  startSec: number
  endSec: number
}

export type JobMode = 'video' | 'clip' | 'audio'
export type JobStatus = 'queued' | 'starting' | 'downloading' | 'postprocessing' | 'done' | 'error' | 'cancelled'

export interface QueueJob {
  jobId: string
  title: string
  url: string
  mode: JobMode
  container: string
  quality: string
  audioFormat?: string
  status: JobStatus
  percent: number
  hasPercent: boolean
  downloadedBytes?: number
  speedStr?: string
  etaStr?: string
  lastLogLine?: string
  finalFilePath?: string
  errorMessage?: string
  destFolder: string
  createdAt: number
}

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

export interface Preset {
  id: string
  name: string
  mode: JobMode
  quality: string
  container: string
  audioFormat?: string
  audioQuality?: string
  destFolder?: string
  createdAt: number
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
  project?: string
  tags?: string
  createdAt: number
}

interface StoreState {
  screen: Screen
  setScreen: (s: Screen) => void

  url: string
  setUrl: (u: string) => void
  analyzing: boolean
  analysis: AnalyzeResult | null
  analyzeError: string | null
  runAnalyze: () => Promise<void>

  mode: JobMode
  setMode: (m: JobMode) => void
  quality: 'max' | '1080p' | '720p' | 'custom'
  setQuality: (q: 'max' | '1080p' | '720p' | 'custom') => void
  container: 'mp4' | 'mkv' | 'mov'
  setContainer: (c: 'mp4' | 'mkv' | 'mov') => void
  audioFormat: 'wav' | 'flac' | 'mp3' | 'm4a' | 'opus'
  setAudioFormat: (a: 'wav' | 'flac' | 'mp3' | 'm4a' | 'opus') => void

  clips: ClipRange[]
  setClips: (c: ClipRange[]) => void
  addClip: () => void
  removeClip: (id: string) => void
  updateClip: (id: string, patch: Partial<ClipRange>) => void

  playlist: PlaylistResult | null
  analyzingPlaylist: boolean
  playlistError: string | null
  playlistSelected: Set<number>
  runAnalyzePlaylist: () => Promise<void>
  togglePlaylistEntry: (index: number) => void
  setAllPlaylistSelected: (select: boolean) => void
  enqueuePlaylistDownload: () => Promise<void>

  queue: QueueJob[]
  enqueueDownload: () => Promise<void>
  cancelJob: (jobId: string) => Promise<void>
  clearQueue: () => Promise<void>

  library: LibraryItem[]
  refreshLibrary: () => Promise<void>

  presets: Preset[]
  refreshPresets: () => Promise<void>
  savePreset: (p: Omit<Preset, 'id' | 'createdAt'>) => Promise<void>
  deletePreset: (id: string) => Promise<void>
  applyPreset: (p: Preset) => void

  settings: Settings | null
  refreshSettings: () => Promise<void>
  updateSetting: (key: keyof Settings, value: string | number | boolean) => Promise<void>

  engineConsole: string[]
  clearConsole: () => void
}

const StoreCtx = createContext<StoreState | null>(null)

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [url, setUrl] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const [mode, setMode] = useState<JobMode>('video')
  const [quality, setQuality] = useState<'max' | '1080p' | '720p' | 'custom'>('max')
  const [container, setContainer] = useState<'mp4' | 'mkv' | 'mov'>('mp4')
  const [audioFormat, setAudioFormat] = useState<'wav' | 'flac' | 'mp3' | 'm4a' | 'opus'>('wav')
  const [clips, setClips] = useState<ClipRange[]>([])

  const [playlist, setPlaylist] = useState<PlaylistResult | null>(null)
  const [analyzingPlaylist, setAnalyzingPlaylist] = useState(false)
  const [playlistError, setPlaylistError] = useState<string | null>(null)
  const [playlistSelected, setPlaylistSelected] = useState<Set<number>>(new Set())

  const [queue, setQueue] = useState<QueueJob[]>([])
  const [library, setLibrary] = useState<LibraryItem[]>([])
  const [presets, setPresets] = useState<Preset[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [engineConsole, setEngineConsole] = useState<string[]>([])

  const queueRef = useRef<QueueJob[]>([])
  queueRef.current = queue

  const refreshLibrary = useCallback(async () => {
    const items = await window.neoncut.listLibrary()
    setLibrary(items as LibraryItem[])
  }, [])

  const refreshPresets = useCallback(async () => {
    const items = await window.neoncut.listPresets()
    setPresets(items as Preset[])
  }, [])

  const refreshSettings = useCallback(async () => {
    const s = await window.neoncut.getSettings()
    setSettings(s as Settings)
  }, [])

  useEffect(() => {
    refreshLibrary()
    refreshPresets()
    refreshSettings()

    const offProgress = window.neoncut.onDownloadProgress((raw: unknown) => {
      const evt = raw as {
        jobId: string
        status: JobStatus
        percent?: number
        downloadedBytes?: number
        speedStr?: string
        etaStr?: string
        finalFilePath?: string
        errorMessage?: string
        logLine?: string
      }
      if (evt.logLine) {
        setEngineConsole((prev) => [...prev.slice(-300), evt.logLine as string])
      }
      setQueue((prev) =>
        prev.map((j) =>
          j.jobId === evt.jobId
            ? {
                ...j,
                status: evt.status,
                percent: evt.percent ?? j.percent,
                hasPercent: evt.percent !== undefined ? true : j.hasPercent,
                downloadedBytes: evt.downloadedBytes ?? j.downloadedBytes,
                speedStr: evt.speedStr ?? j.speedStr,
                etaStr: evt.etaStr ?? j.etaStr,
                lastLogLine: evt.logLine ?? j.lastLogLine,
                finalFilePath: evt.finalFilePath ?? j.finalFilePath,
                errorMessage: evt.errorMessage ?? j.errorMessage
              }
            : j
        )
      )
      if (evt.status === 'done') {
        const job = queueRef.current.find((j) => j.jobId === evt.jobId)
        if (job) {
          window.neoncut
            .addLibraryItem({
              title: job.title,
              sourceUrl: job.url,
              filePath: job.finalFilePath ?? evt.finalFilePath ?? '',
              format: job.mode,
              container: job.container,
              quality: job.quality,
              createdAt: Date.now()
            })
            .then(() => refreshLibrary())
        }
      }
    })

    const offClipboard = window.neoncut.onClipboardUrl((detected: string) => {
      setUrl((current) => (current ? current : detected))
    })

    return () => {
      offProgress()
      offClipboard()
    }
  }, [refreshLibrary, refreshPresets, refreshSettings])

  const runAnalyze = useCallback(async () => {
    if (!url.trim()) return
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const res = await window.neoncut.analyze(url.trim())
      setAnalysis(res as AnalyzeResult)
      setClips([{ id: uid(), startSec: 0, endSec: Math.min(30, (res as AnalyzeResult).durationSec ?? 30) }])
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : String(e))
      setAnalysis(null)
    } finally {
      setAnalyzing(false)
    }
  }, [url])

  const runAnalyzePlaylist = useCallback(async () => {
    if (!url.trim()) return
    setAnalyzingPlaylist(true)
    setPlaylistError(null)
    try {
      const res = (await window.neoncut.analyzePlaylist(url.trim())) as PlaylistResult
      setPlaylist(res)
      setPlaylistSelected(new Set(res.entries.map((e) => e.index)))
    } catch (e) {
      setPlaylistError(e instanceof Error ? e.message : String(e))
      setPlaylist(null)
    } finally {
      setAnalyzingPlaylist(false)
    }
  }, [url])

  const togglePlaylistEntry = useCallback((index: number) => {
    setPlaylistSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const setAllPlaylistSelected = useCallback(
    (select: boolean) => {
      setPlaylistSelected(select ? new Set(playlist?.entries.map((e) => e.index) ?? []) : new Set())
    },
    [playlist]
  )

  const enqueuePlaylistDownload = useCallback(async () => {
    if (!playlist || !settings || playlistSelected.size === 0) return
    const destFolder = settings.downloadPath
    const allSelected = playlistSelected.size === playlist.entries.length
    const playlistItems = allSelected
      ? undefined
      : Array.from(playlistSelected)
          .sort((a, b) => a - b)
          .join(',')

    const jobReq = {
      url: playlist.webpageUrl,
      destFolder,
      mode: mode === 'clip' ? 'video' : mode,
      quality,
      container,
      audioFormat: mode === 'audio' ? audioFormat : undefined,
      audioQuality: '0',
      embedExtras: true,
      sponsorBlock: settings.sponsorBlockEnabled,
      rateLimitKbps: settings.rateLimitKbps,
      titleHint: playlist.title,
      isPlaylist: true,
      playlistItems
    }
    const jobId = (await window.neoncut.startDownload(jobReq)) as string
    setQueue((prev) => [
      {
        jobId,
        title: `${playlist.title} (${playlistSelected.size} elementos)`,
        url: playlist.webpageUrl,
        mode: mode === 'clip' ? 'video' : mode,
        container,
        quality: mode === 'audio' ? audioFormat : quality,
        status: 'queued',
        percent: 0,
        hasPercent: false,
        destFolder,
        createdAt: Date.now()
      },
      ...prev
    ])
    setScreen('queue')
  }, [playlist, settings, playlistSelected, mode, quality, container, audioFormat])

  const addClip = useCallback(() => {
    setClips((prev) => {
      const dur = analysis?.durationSec ?? 60
      const lastEnd = prev.length ? prev[prev.length - 1].endSec : 0
      const start = Math.min(dur, lastEnd)
      const end = Math.min(dur, start + 15)
      return [...prev, { id: uid(), startSec: start, endSec: end }]
    })
  }, [analysis])

  const removeClip = useCallback((id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const updateClip = useCallback((id: string, patch: Partial<ClipRange>) => {
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }, [])

  const enqueueDownload = useCallback(async () => {
    if (!analysis || !settings) return
    const destFolder = settings.downloadPath
    const jobReq = {
      url: analysis.webpageUrl,
      destFolder,
      mode,
      quality,
      container,
      clips: mode === 'clip' ? clips.map((c) => ({ startSec: c.startSec, endSec: c.endSec })) : undefined,
      audioFormat: mode === 'audio' ? audioFormat : undefined,
      audioQuality: '0',
      embedExtras: true,
      sponsorBlock: settings.sponsorBlockEnabled,
      rateLimitKbps: settings.rateLimitKbps,
      titleHint: analysis.title
    }
    const jobId = (await window.neoncut.startDownload(jobReq)) as string
    setQueue((prev) => [
      {
        jobId,
        title: analysis.title,
        url: analysis.webpageUrl,
        mode,
        container,
        quality: mode === 'audio' ? audioFormat : quality,
        status: 'queued',
        percent: 0,
        hasPercent: false,
        destFolder,
        createdAt: Date.now()
      },
      ...prev
    ])
    setScreen('queue')
  }, [analysis, settings, mode, quality, container, clips, audioFormat])

  const cancelJob = useCallback(async (jobId: string) => {
    await window.neoncut.cancelDownload(jobId)
    setQueue((prev) => prev.map((j) => (j.jobId === jobId ? { ...j, status: 'cancelled' } : j)))
  }, [])

  const clearQueue = useCallback(async () => {
    const active = queueRef.current.filter((j) =>
      ['queued', 'starting', 'downloading', 'postprocessing'].includes(j.status)
    )
    await Promise.all(active.map((j) => window.neoncut.cancelDownload(j.jobId)))
    setQueue([])
  }, [])

  const savePreset = useCallback(
    async (p: Omit<Preset, 'id' | 'createdAt'>) => {
      await window.neoncut.savePreset(p)
      await refreshPresets()
    },
    [refreshPresets]
  )

  const deletePreset = useCallback(
    async (id: string) => {
      await window.neoncut.deletePreset(id)
      await refreshPresets()
    },
    [refreshPresets]
  )

  const applyPreset = useCallback((p: Preset) => {
    setMode(p.mode)
    setQuality(p.quality as 'max' | '1080p' | '720p' | 'custom')
    setContainer(p.container as 'mp4' | 'mkv' | 'mov')
    if (p.audioFormat) setAudioFormat(p.audioFormat as 'wav' | 'flac' | 'mp3' | 'm4a' | 'opus')
  }, [])

  const updateSetting = useCallback(async (key: keyof Settings, value: string | number | boolean) => {
    const s = await window.neoncut.setSetting(key, value)
    setSettings(s as Settings)
  }, [])

  const clearConsole = useCallback(() => setEngineConsole([]), [])

  const value = useMemo<StoreState>(
    () => ({
      screen,
      setScreen,
      url,
      setUrl,
      analyzing,
      analysis,
      analyzeError,
      runAnalyze,
      mode,
      setMode,
      quality,
      setQuality,
      container,
      setContainer,
      audioFormat,
      setAudioFormat,
      clips,
      setClips,
      addClip,
      removeClip,
      updateClip,
      playlist,
      analyzingPlaylist,
      playlistError,
      playlistSelected,
      runAnalyzePlaylist,
      togglePlaylistEntry,
      setAllPlaylistSelected,
      enqueuePlaylistDownload,
      queue,
      enqueueDownload,
      cancelJob,
      clearQueue,
      library,
      refreshLibrary,
      presets,
      refreshPresets,
      savePreset,
      deletePreset,
      applyPreset,
      settings,
      refreshSettings,
      updateSetting,
      engineConsole,
      clearConsole
    }),
    [
      screen,
      url,
      analyzing,
      analysis,
      analyzeError,
      runAnalyze,
      mode,
      quality,
      container,
      audioFormat,
      clips,
      addClip,
      removeClip,
      updateClip,
      playlist,
      analyzingPlaylist,
      playlistError,
      playlistSelected,
      runAnalyzePlaylist,
      togglePlaylistEntry,
      setAllPlaylistSelected,
      enqueuePlaylistDownload,
      queue,
      enqueueDownload,
      cancelJob,
      clearQueue,
      library,
      refreshLibrary,
      presets,
      refreshPresets,
      savePreset,
      deletePreset,
      applyPreset,
      settings,
      refreshSettings,
      updateSetting,
      engineConsole,
      clearConsole
    ]
  )

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore(): StoreState {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider')
  return ctx
}

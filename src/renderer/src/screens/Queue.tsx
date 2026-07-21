import React, { useState } from 'react'
import { useStore } from '../state/store'
import { StatusTag } from '../components/StatusTag'
import { ProgressBar } from '../components/ProgressBar'

function bytesFmt(n?: number): string {
  if (!n) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let v = n
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(1)} ${units[i]}`
}

const ACTIVE_STATUSES = ['queued', 'starting', 'downloading', 'postprocessing']

const STATUS_TONE: Record<string, 'cyan' | 'yellow' | 'green' | 'red'> = {
  queued: 'cyan',
  starting: 'cyan',
  downloading: 'yellow',
  postprocessing: 'yellow',
  done: 'green',
  error: 'red',
  cancelled: 'red'
}

const STATUS_LABEL: Record<string, string> = {
  queued: 'EN COLA',
  starting: 'INICIANDO',
  downloading: 'DESCARGANDO',
  postprocessing: 'PROCESANDO',
  done: 'COMPLETO',
  error: 'ERROR',
  cancelled: 'CANCELADO'
}

function statusLabel(status: string, lastLogLine?: string): string {
  if (status === 'postprocessing' && lastLogLine?.includes('[Merger]')) return 'FUSIONANDO CON FFMPEG'
  if (status === 'postprocessing' && lastLogLine?.includes('[ExtractAudio]')) return 'EXTRAYENDO AUDIO'
  return STATUS_LABEL[status] ?? status.toUpperCase()
}

export const Queue: React.FC = () => {
  const { queue, cancelJob, clearQueue, engineConsole } = useStore()
  const [notFoundId, setNotFoundId] = useState<string | null>(null)

  const openFolder = async (jobId: string, filePath: string): Promise<void> => {
    const ok = await window.neoncut.openInFolder(filePath)
    setNotFoundId(ok ? null : jobId)
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
      {queue.length === 0 && (
        <div className="panel panel--cut-corner" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
          <span className="mono">COLA VACIA — analiza un video para empezar</span>
        </div>
      )}

      {queue.map((job) => (
        <div key={job.jobId} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {job.title}
            </span>
            <StatusTag tone={STATUS_TONE[job.status]}>{statusLabel(job.status, job.lastLogLine)}</StatusTag>
          </div>

          <ProgressBar
            percent={job.percent}
            indeterminate={!job.hasPercent && ACTIVE_STATUSES.includes(job.status)}
          />

          <div style={{ display: 'flex', gap: 16, fontSize: 11, flexWrap: 'wrap' }} className="mono">
            <span style={{ color: 'var(--text-muted)' }}>
              {job.hasPercent ? `${job.percent.toFixed(1)}%` : bytesFmt(job.downloadedBytes)}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>VEL: {job.speedStr ?? '—'}</span>
            <span style={{ color: 'var(--text-muted)' }}>ETA: {job.etaStr ?? '—'}</span>
            <span style={{ color: 'var(--text-muted)' }}>{job.mode.toUpperCase()} · {job.container.toUpperCase()}</span>
          </div>

          {ACTIVE_STATUSES.includes(job.status) && job.lastLogLine && (
            <div
              className="mono"
              style={{
                color: 'var(--green)',
                fontSize: 10.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {job.lastLogLine}
            </div>
          )}

          {job.errorMessage && (
            <div className="mono" style={{ color: 'var(--red)', fontSize: 11 }}>
              {job.errorMessage}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {(job.status === 'queued' ||
              job.status === 'downloading' ||
              job.status === 'starting' ||
              job.status === 'postprocessing') && (
              <button className="btn btn-danger" onClick={() => cancelJob(job.jobId)}>
                Cancelar
              </button>
            )}
            {job.status === 'done' && job.finalFilePath && (
              <button className="btn btn-ghost" onClick={() => openFolder(job.jobId, job.finalFilePath as string)}>
                Abrir carpeta
              </button>
            )}
            {notFoundId === job.jobId && (
              <span className="mono" style={{ color: 'var(--red)', fontSize: 11, alignSelf: 'center' }}>
                Archivo no encontrado
              </span>
            )}
          </div>
        </div>
      ))}

      {queue.length > 0 && (
        <button className="btn btn-danger" style={{ alignSelf: 'flex-start' }} onClick={clearQueue}>
          Vaciar cola
        </button>
      )}

      <div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
          CONSOLA DEL MOTOR (yt-dlp / ffmpeg)
        </div>
        <div className="engine-console" style={{ height: 180 }}>
          {engineConsole.slice(-120).map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

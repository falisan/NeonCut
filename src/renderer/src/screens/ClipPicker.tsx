import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { ClipTimeline } from '../components/ClipTimeline'
import { secToClock, clockToSec } from '../lib/time'

export const ClipPicker: React.FC = () => {
  const { analysis, clips, addClip, removeClip, updateClip, enqueueDownload, setScreen } = useStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewFailed, setPreviewFailed] = useState(false)

  useEffect(() => {
    if (!analysis) return
    setPreviewUrl(null)
    setPreviewFailed(false)
    setPreviewLoading(true)
    window.neoncut
      .getPreviewUrl(analysis.webpageUrl)
      .then((url: string | null) => {
        if (url) setPreviewUrl(url)
        else setPreviewFailed(true)
      })
      .catch(() => setPreviewFailed(true))
      .finally(() => setPreviewLoading(false))
  }, [analysis])

  if (!analysis) {
    return (
      <div style={{ padding: 24, color: 'var(--text-muted)' }} className="mono">
        Analiza un video primero desde el Dashboard.
      </div>
    )
  }

  const duration = analysis.durationSec ?? 0

  const useCurrentTimeFor = (clipId: string, edge: 'startSec' | 'endSec'): void => {
    const t = videoRef.current?.currentTime
    if (t === undefined) return
    updateClip(clipId, { [edge]: t } as Partial<{ startSec: number; endSec: number }>)
  }

  const seekPreview = (t: number): void => {
    const video = videoRef.current
    if (!video) return
    if (!video.paused) video.pause()
    video.currentTime = t
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 15, color: 'var(--text-main)', textTransform: 'none', letterSpacing: 0 }}>
          {analysis.title}
        </h2>
        <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
          DURACION TOTAL: {secToClock(duration)}
        </span>
      </div>

      <div className="panel" style={{ padding: previewUrl ? 0 : 16 }}>
        {previewLoading && (
          <div className="mono" style={{ color: 'var(--text-muted)', fontSize: 12, padding: 16, textAlign: 'center' }}>
            Cargando previsualización…
          </div>
        )}
        {!previewLoading && previewUrl && (
          <video
            ref={videoRef}
            src={previewUrl}
            controls
            style={{ width: '100%', maxHeight: 360, display: 'block', background: '#000' }}
            onError={() => {
              setPreviewUrl(null)
              setPreviewFailed(true)
            }}
          />
        )}
        {!previewLoading && !previewUrl && previewFailed && (
          <div className="mono" style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
            Vista previa no disponible para esta fuente — los marcadores de tiempo siguen funcionando con normalidad.
          </div>
        )}
      </div>

      {clips.map((c, idx) => (
        <div key={c.id} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="status-tag status-tag--cyan">FRAGMENTO {String(idx + 1).padStart(2, '0')}</span>
            {clips.length > 1 && (
              <button className="btn btn-danger" onClick={() => removeClip(c.id)}>
                Eliminar
              </button>
            )}
          </div>

          <ClipTimeline
            durationSec={duration}
            startSec={c.startSec}
            endSec={c.endSec}
            onChange={(start, end) => updateClip(c.id, { startSec: start, endSec: end })}
            onScrub={previewUrl ? seekPreview : undefined}
          />

          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <label className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              ENTRADA
              <input
                className="mono"
                defaultValue={secToClock(c.startSec)}
                onBlur={(e) => {
                  const v = clockToSec(e.target.value)
                  if (v === null) return
                  const clamped = Math.min(v, c.endSec - 0.1)
                  updateClip(c.id, { startSec: clamped })
                  if (previewUrl) seekPreview(clamped)
                }}
                style={{
                  display: 'block',
                  marginTop: 4,
                  background: 'var(--bg-base)',
                  border: '1px solid var(--cyan)',
                  color: 'var(--cyan)',
                  padding: '6px 8px',
                  width: 130
                }}
              />
            </label>
            <label className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              SALIDA
              <input
                className="mono"
                defaultValue={secToClock(c.endSec)}
                onBlur={(e) => {
                  const v = clockToSec(e.target.value)
                  if (v === null) return
                  const clamped = Math.max(v, c.startSec + 0.1)
                  updateClip(c.id, { endSec: clamped })
                  if (previewUrl) seekPreview(clamped)
                }}
                style={{
                  display: 'block',
                  marginTop: 4,
                  background: 'var(--bg-base)',
                  border: '1px solid var(--magenta)',
                  color: 'var(--magenta)',
                  padding: '6px 8px',
                  width: 130
                }}
              />
            </label>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 14 }}>
              duracion: {secToClock(Math.max(0, c.endSec - c.startSec))}
            </span>
            {previewUrl && (
              <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                <button className="btn btn-ghost" onClick={() => useCurrentTimeFor(c.id, 'startSec')}>
                  ⏵ entrada
                </button>
                <button className="btn btn-ghost" onClick={() => useCurrentTimeFor(c.id, 'endSec')}>
                  ⏵ salida
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" onClick={addClip}>
          + Anadir otro fragmento
        </button>
        <button className="btn btn-ghost" onClick={() => setScreen('dashboard')}>
          ← Volver
        </button>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={enqueueDownload}>
          Descargar {clips.length > 1 ? `${clips.length} fragmentos` : 'fragmento'}
        </button>
      </div>
    </div>
  )
}

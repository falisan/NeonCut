import React from 'react'
import { useStore } from '../state/store'
import { StatusTag } from '../components/StatusTag'

function formatBytes(n?: number): string {
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

function formatDuration(sec?: number): string {
  if (!sec) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

export const Dashboard: React.FC = () => {
  const {
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
    enqueueDownload,
    setScreen,
    presets,
    applyPreset,
    playlist,
    analyzingPlaylist,
    playlistError,
    playlistSelected,
    runAnalyzePlaylist,
    togglePlaylistEntry,
    setAllPlaylistSelected,
    enqueuePlaylistDownload
  } = useStore()

  const bestVideo = analysis?.formats
    ?.filter((f) => f.vcodec !== 'none')
    .sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0]
  const bestAudio = analysis?.formats?.filter((f) => f.acodec !== 'none' && f.vcodec === 'none')[0]

  const onSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    runAnalyze()
  }

  const goEnqueue = async (): Promise<void> => {
    if (mode === 'clip') {
      setScreen('clip')
      return
    }
    await enqueueDownload()
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
      <form onSubmit={onSubmit} className="url-field" style={{ display: 'flex', gap: 10 }}>
        <div className="url-field" style={{ flex: 1 }}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Pega la URL del video (deteccion automatica desde el portapapeles)…"
          />
          <div className="scan-bar" />
        </div>
        <button className="btn btn-primary" type="submit" disabled={analyzing || !url.trim()}>
          {analyzing ? 'Analizando…' : 'Analizar'}
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          disabled={analyzingPlaylist || !url.trim()}
          onClick={runAnalyzePlaylist}
        >
          {analyzingPlaylist ? 'Analizando lista…' : 'Analizar como lista'}
        </button>
      </form>

      {playlistError && (
        <div className="panel" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>
          ERROR: {playlistError}
        </div>
      )}

      {playlist && (
        <div className="panel panel--cut-corner" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 14, color: 'var(--text-main)', textTransform: 'none', letterSpacing: 0 }}>
              LISTA: {playlist.title}
            </h2>
            <span className="status-tag status-tag--cyan">
              {playlistSelected.size} / {playlist.entries.length} SELECCIONADOS
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setAllPlaylistSelected(true)}>
              Seleccionar todos
            </button>
            <button className="btn btn-ghost" onClick={() => setAllPlaylistSelected(false)}>
              Ninguno
            </button>
          </div>

          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {playlist.entries.map((e) => (
              <label
                key={e.index}
                className="mono"
                style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--text-main)' }}
              >
                <input
                  type="checkbox"
                  checked={playlistSelected.has(e.index)}
                  onChange={() => togglePlaylistEntry(e.index)}
                />
                <span style={{ color: 'var(--text-muted)' }}>{String(e.index).padStart(2, '0')}</span>
                {e.title}
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            {(['video', 'audio'] as const).map((m) => (
              <button
                key={m}
                className="btn"
                onClick={() => setMode(m)}
                style={{
                  background: mode === m ? 'rgba(0,245,255,0.12)' : 'transparent',
                  color: mode === m ? 'var(--cyan)' : 'var(--text-muted)',
                  border: mode === m ? '1px solid var(--cyan)' : '1px solid rgba(124,138,165,0.3)'
                }}
              >
                {m === 'video' ? 'Video completo' : 'Solo audio'}
              </button>
            ))}
          </div>

          <button
            className="btn btn-primary"
            style={{ alignSelf: 'flex-start' }}
            disabled={playlistSelected.size === 0}
            onClick={enqueuePlaylistDownload}
          >
            Anadir {playlistSelected.size} elemento{playlistSelected.size === 1 ? '' : 's'} a la cola
          </button>
        </div>
      )}

      {presets.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="mono" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
            PRESETS:
          </span>
          {presets.map((p) => (
            <button key={p.id} className="btn btn-ghost" onClick={() => applyPreset(p)}>
              {p.name}
            </button>
          ))}
        </div>
      )}

      {analyzeError && (
        <div className="panel" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>
          ERROR: {analyzeError}
        </div>
      )}

      {analysis && (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div className="detection-box" style={{ width: 340, height: 190, flexShrink: 0, overflow: 'hidden' }}>
            <span className="corner-tl" />
            <span className="corner-br" />
            {analysis.thumbnail ? (
              <img
                src={analysis.thumbnail}
                alt={analysis.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)'
                }}
                className="mono"
              >
                SIN MINIATURA
              </div>
            )}
            <div
              className="mono"
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                background: 'var(--yellow)',
                color: '#1a1a00',
                fontSize: 10,
                padding: '3px 8px',
                letterSpacing: '0.05em'
              }}
            >
              ANALIZANDO VIDEO
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 style={{ fontSize: 16, color: 'var(--text-main)', textTransform: 'none', letterSpacing: 0 }}>
              {analysis.title}
            </h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <StatusTag tone="cyan">
                FORMATO: {bestVideo ? `${bestVideo.ext.toUpperCase()} (${bestVideo.vcodec})` : 'N/D'}
              </StatusTag>
              <StatusTag tone="yellow">
                CALIDAD: {bestVideo?.height ? `${bestVideo.height}p${bestVideo.fps ?? ''}` : 'N/D'}
              </StatusTag>
              <StatusTag tone="green">
                AUDIO: {bestAudio ? `${bestAudio.acodec.toUpperCase()} ${Math.round(bestAudio.tbr ?? 0)}kbps` : 'N/D'}
              </StatusTag>
              <StatusTag tone="cyan">DURACION: {formatDuration(analysis.durationSec)}</StatusTag>
              <StatusTag tone="green">ESTADO: LISTO PARA DESCARGA</StatusTag>
            </div>

            <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
              {(['video', 'clip', 'audio'] as const).map((m) => (
                <button
                  key={m}
                  className="btn"
                  onClick={() => setMode(m)}
                  style={{
                    background: mode === m ? 'rgba(0,245,255,0.12)' : 'transparent',
                    color: mode === m ? 'var(--cyan)' : 'var(--text-muted)',
                    border: mode === m ? '1px solid var(--cyan)' : '1px solid rgba(124,138,165,0.3)'
                  }}
                >
                  {m === 'video' ? 'Video completo' : m === 'clip' ? 'Recorte de fragmento' : 'Solo audio'}
                </button>
              ))}
            </div>

            {mode !== 'audio' ? (
              <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                <div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
                    CALIDAD
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['max', '1080p', '720p'] as const).map((q) => (
                      <button
                        key={q}
                        className="btn btn-ghost"
                        onClick={() => setQuality(q)}
                        style={
                          quality === q
                            ? { color: 'var(--cyan)', borderColor: 'var(--cyan)' }
                            : undefined
                        }
                      >
                        {q === 'max' ? 'Automatico / Maxima' : q}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
                    CONTENEDOR
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {(['mp4', 'mkv', 'mov'] as const).map((c) => (
                      <button
                        key={c}
                        className="btn btn-ghost"
                        onClick={() => setContainer(c)}
                        style={
                          container === c
                            ? { color: 'var(--cyan)', borderColor: 'var(--cyan)' }
                            : undefined
                        }
                      >
                        {c.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 8 }}>
                <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
                  FORMATO DE AUDIO
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(['wav', 'flac', 'mp3', 'm4a', 'opus'] as const).map((a) => (
                    <button
                      key={a}
                      className="btn btn-ghost"
                      onClick={() => setAudioFormat(a)}
                      style={
                        audioFormat === a ? { color: 'var(--cyan)', borderColor: 'var(--cyan)' } : undefined
                      }
                    >
                      {a.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className="btn btn-primary" style={{ marginTop: 16, alignSelf: 'flex-start' }} onClick={goEnqueue}>
              {mode === 'clip' ? 'Ir al recorte de fragmentos →' : 'Anadir a la cola de descargas'}
            </button>
          </div>
        </div>
      )}

      {!analysis && !analyzing && (
        <div className="panel panel--cut-corner" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 48 }}>
          <div className="mono" style={{ fontSize: 12 }}>
            REC ( ) 00:00:00 — esperando URL para iniciar analisis
          </div>
        </div>
      )}
    </div>
  )
}

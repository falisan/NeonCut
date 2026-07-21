import React, { useEffect, useState } from 'react'

interface UpdaterStatusEvent {
  state: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  percent?: number
  message?: string
}

export const UpdateBanner: React.FC = () => {
  const [status, setStatus] = useState<UpdaterStatusEvent | null>(null)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    return window.neoncut.onUpdaterStatus((raw: unknown) => setStatus(raw as UpdaterStatusEvent))
  }, [])

  if (!status) return null
  if (status.state === 'checking' || status.state === 'not-available' || status.state === 'error') return null

  const install = async (): Promise<void> => {
    setInstalling(true)
    await window.neoncut.installUpdate()
  }

  return (
    <div
      className="mono"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px',
        fontSize: 11.5,
        background: 'rgba(0, 245, 255, 0.08)',
        borderBottom: '1px solid rgba(0, 245, 255, 0.3)',
        color: 'var(--text-main)'
      }}
    >
      <span className="status-tag status-tag--cyan">ACTUALIZACION</span>

      {status.state === 'available' && (
        <span>Nueva version {status.version ?? ''} encontrada — preparando descarga…</span>
      )}

      {status.state === 'downloading' && (
        <>
          <span>Descargando actualizacion{status.version ? ` ${status.version}` : ''}…</span>
          <div style={{ width: 140 }}>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${Math.max(0, Math.min(100, status.percent ?? 0))}%` }}
              />
            </div>
          </div>
          <span style={{ color: 'var(--text-muted)' }}>{(status.percent ?? 0).toFixed(0)}%</span>
        </>
      )}

      {status.state === 'downloaded' && (
        <>
          <span style={{ color: 'var(--green)' }}>
            Actualizacion {status.version ?? ''} lista para instalar.
          </span>
          <button className="btn btn-primary" style={{ padding: '4px 12px' }} onClick={install} disabled={installing}>
            {installing ? 'Reiniciando…' : 'Reiniciar y actualizar'}
          </button>
        </>
      )}
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { useStore } from '../state/store'
import { LegalModal } from '../components/LegalModal'

export const Settings: React.FC = () => {
  const { settings, updateSetting, presets, savePreset, deletePreset, mode, quality, container, audioFormat } =
    useStore()
  const [presetName, setPresetName] = useState('')
  const [updateLog, setUpdateLog] = useState<string[]>([])
  const [updating, setUpdating] = useState(false)
  const [showLegal, setShowLegal] = useState(false)

  useEffect(() => {
    return window.neoncut.onEngineUpdateLog((line) => setUpdateLog((prev) => [...prev.slice(-100), line]))
  }, [])

  if (!settings) return null

  const chooseFolder = async (): Promise<void> => {
    const dir = await window.neoncut.chooseFolder()
    if (dir) updateSetting('downloadPath', dir)
  }

  const runUpdate = async (): Promise<void> => {
    setUpdating(true)
    setUpdateLog([])
    try {
      await window.neoncut.updateEngine()
    } finally {
      setUpdating(false)
    }
  }

  const createPreset = async (): Promise<void> => {
    if (!presetName.trim()) return
    await savePreset({
      name: presetName.trim(),
      mode,
      quality,
      container,
      audioFormat,
      destFolder: settings.downloadPath
    })
    setPresetName('')
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto' }}>
      <section className="panel">
        <h3 style={{ fontSize: 13, color: 'var(--cyan)', marginBottom: 12 }}>Rutas y descargas</h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-main)', flex: 1 }}>
            {settings.downloadPath}
          </span>
          <button className="btn btn-secondary" onClick={chooseFolder}>
            Cambiar carpeta
          </button>
        </div>

        <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
          <label className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            DESCARGAS SIMULTANEAS
            <input
              type="number"
              min={1}
              max={5}
              defaultValue={settings.maxConcurrent}
              onBlur={(e) => updateSetting('maxConcurrent', Number(e.target.value))}
              style={{ display: 'block', marginTop: 4, width: 100, background: 'var(--bg-base)', border: '1px solid var(--cyan)', color: 'var(--cyan)', padding: 6 }}
            />
          </label>
          <label className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            LIMITE DE VELOCIDAD (KB/s, 0 = sin limite)
            <input
              type="number"
              min={0}
              defaultValue={settings.rateLimitKbps}
              onBlur={(e) => updateSetting('rateLimitKbps', Number(e.target.value))}
              style={{ display: 'block', marginTop: 4, width: 160, background: 'var(--bg-base)', border: '1px solid var(--cyan)', color: 'var(--cyan)', padding: 6 }}
            />
          </label>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={settings.sponsorBlockEnabled}
            onChange={(e) => updateSetting('sponsorBlockEnabled', e.target.checked)}
          />
          Omitir tramos patrocinados (SponsorBlock)
        </label>
      </section>

      <section className="panel">
        <h3 style={{ fontSize: 13, color: 'var(--cyan)', marginBottom: 12 }}>Motor (yt-dlp / FFmpeg)</h3>
        <button className="btn btn-primary" onClick={runUpdate} disabled={updating}>
          {updating ? 'Actualizando…' : 'Actualizar motor'}
        </button>
        {updateLog.length > 0 && (
          <div className="engine-console" style={{ height: 120, marginTop: 12 }}>
            {updateLog.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h3 style={{ fontSize: 13, color: 'var(--cyan)', marginBottom: 12 }}>Perfiles / presets</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            className="mono"
            placeholder="Nombre del preset (usa la config. actual del Dashboard)…"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            style={{ flex: 1, background: 'var(--bg-base)', border: '1px solid rgba(0,245,255,0.3)', color: 'var(--text-main)', padding: 8 }}
          />
          <button className="btn btn-secondary" onClick={createPreset}>
            Guardar preset
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {presets.map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
              <span>
                {p.name} <span className="mono" style={{ color: 'var(--text-muted)' }}>({p.mode} · {p.quality} · {p.container})</span>
              </span>
              <button className="btn btn-danger" onClick={() => deletePreset(p.id)}>
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3 style={{ fontSize: 13, color: 'var(--cyan)', marginBottom: 12 }}>Apariencia y accesibilidad</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={settings.scanlinesEnabled}
            onChange={(e) => updateSetting('scanlinesEnabled', e.target.checked)}
          />
          Scanlines
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={settings.grainEnabled}
            onChange={(e) => updateSetting('grainEnabled', e.target.checked)}
          />
          Grano fotografico
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => updateSetting('soundEnabled', e.target.checked)}
          />
          Sonido de interfaz
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={settings.reducedContrast}
            onChange={(e) => updateSetting('reducedContrast', e.target.checked)}
          />
          Modo contraste reducido (desactiva glow/grano/scanlines)
        </label>
      </section>

      <section className="panel">
        <h3 style={{ fontSize: 13, color: 'var(--cyan)', marginBottom: 12 }}>Legal</h3>
        <button className="btn btn-ghost" onClick={() => setShowLegal(true)}>
          Ver aviso legal y etico
        </button>
      </section>

      {showLegal && <LegalModal forceOpen onClose={() => setShowLegal(false)} />}
    </div>
  )
}

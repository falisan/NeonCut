import React, { useMemo, useState } from 'react'
import { useStore } from '../state/store'

export const Library: React.FC = () => {
  const { library } = useStore()
  const [search, setSearch] = useState('')
  const [notFoundId, setNotFoundId] = useState<string | null>(null)

  const openFolder = async (id: string, filePath: string): Promise<void> => {
    const ok = await window.neoncut.openInFolder(filePath)
    setNotFoundId(ok ? null : id)
  }

  const filtered = useMemo(
    () => library.filter((it) => it.title.toLowerCase().includes(search.toLowerCase())),
    [library, search]
  )

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
      <input
        className="mono"
        placeholder="Buscar en la biblioteca…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid rgba(0,245,255,0.3)',
          color: 'var(--text-main)',
          padding: '10px 12px',
          borderRadius: 2
        }}
      />

      {filtered.length === 0 && (
        <div className="panel panel--cut-corner" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>
          <span className="mono">BIBLIOTECA VACIA</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {filtered.map((item) => (
          <div key={item.id} className="detection-box panel" style={{ padding: 10 }}>
            <span className="corner-tl" />
            <span className="corner-br" />
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--text-main)',
                marginBottom: 8,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {item.title}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              <span className="status-tag status-tag--cyan">{(item.format ?? '').toUpperCase()}</span>
              <span className="status-tag status-tag--yellow">{(item.container ?? '').toUpperCase()}</span>
              <span className="status-tag status-tag--green">{item.quality}</span>
            </div>
            <button className="btn btn-ghost" onClick={() => openFolder(item.id, item.filePath)}>
              Abrir carpeta
            </button>
            {notFoundId === item.id && (
              <div className="mono" style={{ color: 'var(--red)', fontSize: 11, marginTop: 6 }}>
                Archivo no encontrado
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

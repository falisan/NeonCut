import React from 'react'
import { Screen, useStore } from '../state/store'

const TABS: { id: Screen; label: string; jp: string }[] = [
  { id: 'dashboard', label: 'Captura', jp: '取得' },
  { id: 'clip', label: 'Recorte', jp: '切断' },
  { id: 'queue', label: 'Cola', jp: '待列' },
  { id: 'library', label: 'Biblioteca', jp: '書庫' },
  { id: 'settings', label: 'Config', jp: '設定' }
]

export const TopBar: React.FC = () => {
  const { screen, setScreen, queue } = useStore()
  const activeCount = queue.filter((j) => j.status === 'downloading' || j.status === 'starting' || j.status === 'postprocessing').length

  return (
    <div>
      <div className="top-bar">
        <span className="brand">NEONCUT</span>
        <span className="cjk">監視モード起動中</span>
        <span>yt-dlp * offline-first * windows</span>
      </div>
      <nav
        style={{
          display: 'flex',
          gap: 4,
          padding: '10px 14px',
          borderBottom: '1px solid rgba(0,245,255,0.15)'
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setScreen(t.id)}
            className="btn"
            style={{
              background: screen === t.id ? 'rgba(0,245,255,0.12)' : 'transparent',
              color: screen === t.id ? 'var(--cyan)' : 'var(--text-muted)',
              border: screen === t.id ? '1px solid var(--cyan)' : '1px solid transparent',
              boxShadow: screen === t.id ? 'var(--glow-cyan)' : 'none',
              position: 'relative'
            }}
          >
            {t.label} <span className="cjk" style={{ opacity: 0.6, marginLeft: 4 }}>{t.jp}</span>
            {t.id === 'queue' && activeCount > 0 && (
              <span
                className="mono"
                style={{
                  marginLeft: 6,
                  background: 'var(--yellow)',
                  color: '#1a1a00',
                  borderRadius: 8,
                  padding: '0 6px',
                  fontSize: 10
                }}
              >
                {activeCount}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}

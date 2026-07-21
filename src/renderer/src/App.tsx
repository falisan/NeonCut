import React, { useEffect } from 'react'
import { useStore } from './state/store'
import { TopBar } from './components/TopBar'
import { LegalModal } from './components/LegalModal'
import { UpdateBanner } from './components/UpdateBanner'
import { Dashboard } from './screens/Dashboard'
import { ClipPicker } from './screens/ClipPicker'
import { Queue } from './screens/Queue'
import { Library } from './screens/Library'
import { Settings } from './screens/Settings'

const SCREENS: Record<string, React.FC> = {
  dashboard: Dashboard,
  clip: ClipPicker,
  queue: Queue,
  library: Library,
  settings: Settings
}

export const App: React.FC = () => {
  const { screen, settings, setUrl, runAnalyze } = useStore()

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-reduced-contrast', settings?.reducedContrast ? '1' : '0')
  }, [settings?.reducedContrast])

  useEffect(() => {
    const onDragOver = (e: DragEvent): void => e.preventDefault()
    const onDrop = (e: DragEvent): void => {
      e.preventDefault()
      const text = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain')
      if (text && /^https?:\/\//i.test(text.trim())) {
        setUrl(text.trim())
        setTimeout(() => runAnalyze(), 50)
      }
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [setUrl, runAnalyze])

  const ScreenComp = SCREENS[screen] ?? Dashboard

  return (
    <div className="app-shell">
      {settings?.grainEnabled !== false && <div className="texture-grid" />}
      {settings?.grainEnabled && <div className="texture-grain" />}
      {settings?.scanlinesEnabled && <div className="texture-scanlines" />}
      <div className="app-content doc-frame">
        <UpdateBanner />
        <TopBar />
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ScreenComp />
        </div>
      </div>
      <LegalModal />
    </div>
  )
}

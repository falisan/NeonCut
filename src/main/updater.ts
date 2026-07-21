import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'

export type UpdaterState =
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export interface UpdaterStatusEvent {
  state: UpdaterState
  version?: string
  percent?: number
  message?: string
}

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // cada 4 horas

export function initUpdater(getWindow: () => BrowserWindow | null): void {
  if (!app.isPackaged) return // no tiene sentido en modo desarrollo

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false

  const send = (evt: UpdaterStatusEvent): void => {
    getWindow()?.webContents.send('updater:status', evt)
  }

  autoUpdater.on('checking-for-update', () => send({ state: 'checking' }))
  autoUpdater.on('update-available', (info) => send({ state: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => send({ state: 'not-available' }))
  autoUpdater.on('download-progress', (p) => send({ state: 'downloading', percent: p.percent }))
  autoUpdater.on('update-downloaded', (info) => send({ state: 'downloaded', version: info.version }))
  autoUpdater.on('error', (err) => send({ state: 'error', message: err.message }))

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall()
  })
  ipcMain.handle('updater:check', () => autoUpdater.checkForUpdates())

  autoUpdater.checkForUpdates().catch(() => {})
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, CHECK_INTERVAL_MS)
}

import { ipcMain, dialog, shell, BrowserWindow, Notification } from 'electron'
import { existsSync } from 'fs'
import {
  analyzeUrl,
  analyzePlaylist,
  startDownload,
  cancelJob,
  updateEngine,
  getPreviewUrl,
  DownloadJobRequest,
  ProgressEvent
} from './ytdlp'
import { getSettings, setSetting, listPresets, savePreset, deletePreset, listLibrary, addLibraryItem, deleteLibraryItem } from './repo'
import { binariesPresent } from './paths'

export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('engine:status', () => binariesPresent())

  ipcMain.handle('analyze', async (_e, url: string) => {
    return analyzeUrl(url)
  })

  ipcMain.handle('analyzePlaylist', async (_e, url: string) => {
    return analyzePlaylist(url)
  })

  ipcMain.handle('download:start', (_e, job: DownloadJobRequest) => {
    const win = getWindow()
    const jobId = startDownload(job, (evt: ProgressEvent) => {
      win?.webContents.send('download:progress', evt)
      if (evt.status === 'done') {
        if (getSettings().soundEnabled) win?.webContents.send('sfx:play', 'complete')
        new Notification({
          title: 'NEONCUT — Descarga completa',
          body: job.titleHint ?? job.url
        }).show()
      }
      if (evt.status === 'error') {
        new Notification({
          title: 'NEONCUT — Error de descarga',
          body: evt.errorMessage ?? 'Fallo desconocido'
        }).show()
      }
    })
    return jobId
  })

  ipcMain.handle('download:cancel', (_e, jobId: string) => cancelJob(jobId))

  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_e, key: string, value: string | number | boolean) => {
    setSetting(key, value)
    return getSettings()
  })

  ipcMain.handle('presets:list', () => listPresets())
  ipcMain.handle('presets:save', (_e, preset) => savePreset(preset))
  ipcMain.handle('presets:delete', (_e, id: string) => deletePreset(id))

  ipcMain.handle('library:list', () => listLibrary())
  ipcMain.handle('library:add', (_e, item) => addLibraryItem(item))
  ipcMain.handle('library:delete', (_e, id: string) => deleteLibraryItem(id))
  ipcMain.handle('library:openFolder', (_e, filePath: string) => {
    if (!filePath || !existsSync(filePath)) return false
    shell.showItemInFolder(filePath)
    return true
  })

  ipcMain.handle('preview:getUrl', async (_e, url: string) => {
    return getPreviewUrl(url)
  })

  ipcMain.handle('engine:update', async () => {
    const win = getWindow()
    await updateEngine((line) => win?.webContents.send('engine:update-log', line))
    return true
  })

  ipcMain.handle('dialog:chooseFolder', async () => {
    const win = getWindow()
    if (!win) return null
    const res = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] })
    if (res.canceled || res.filePaths.length === 0) return null
    return res.filePaths[0]
  })
}

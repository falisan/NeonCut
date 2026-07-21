import { contextBridge, ipcRenderer, webUtils } from 'electron'

const api = {
  engineStatus: () => ipcRenderer.invoke('engine:status'),
  analyze: (url: string) => ipcRenderer.invoke('analyze', url),
  analyzePlaylist: (url: string) => ipcRenderer.invoke('analyzePlaylist', url),

  startDownload: (job: unknown) => ipcRenderer.invoke('download:start', job),
  cancelDownload: (jobId: string) => ipcRenderer.invoke('download:cancel', jobId),
  onDownloadProgress: (cb: (evt: unknown) => void) => {
    const listener = (_e: unknown, evt: unknown): void => cb(evt)
    ipcRenderer.on('download:progress', listener)
    return (): void => {
      ipcRenderer.removeListener('download:progress', listener)
    }
  },

  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key: string, value: string | number | boolean) =>
    ipcRenderer.invoke('settings:set', key, value),

  listPresets: () => ipcRenderer.invoke('presets:list'),
  savePreset: (preset: unknown) => ipcRenderer.invoke('presets:save', preset),
  deletePreset: (id: string) => ipcRenderer.invoke('presets:delete', id),

  listLibrary: () => ipcRenderer.invoke('library:list'),
  addLibraryItem: (item: unknown) => ipcRenderer.invoke('library:add', item),
  deleteLibraryItem: (id: string) => ipcRenderer.invoke('library:delete', id),
  openInFolder: (filePath: string) => ipcRenderer.invoke('library:openFolder', filePath),
  getPreviewUrl: (url: string) => ipcRenderer.invoke('preview:getUrl', url),

  updateEngine: () => ipcRenderer.invoke('engine:update'),
  onEngineUpdateLog: (cb: (line: string) => void) => {
    const listener = (_e: unknown, line: string): void => cb(line)
    ipcRenderer.on('engine:update-log', listener)
    return (): void => {
      ipcRenderer.removeListener('engine:update-log', listener)
    }
  },

  chooseFolder: () => ipcRenderer.invoke('dialog:chooseFolder'),

  onClipboardUrl: (cb: (url: string) => void) => {
    const listener = (_e: unknown, url: string): void => cb(url)
    ipcRenderer.on('clipboard:url', listener)
    return (): void => {
      ipcRenderer.removeListener('clipboard:url', listener)
    }
  },

  onSfxPlay: (cb: (name: string) => void) => {
    const listener = (_e: unknown, name: string): void => cb(name)
    ipcRenderer.on('sfx:play', listener)
    return (): void => {
      ipcRenderer.removeListener('sfx:play', listener)
    }
  },

  getPathForFile: (file: File) => webUtils.getPathForFile(file),

  checkForUpdate: () => ipcRenderer.invoke('updater:check'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdaterStatus: (cb: (evt: unknown) => void) => {
    const listener = (_e: unknown, evt: unknown): void => cb(evt)
    ipcRenderer.on('updater:status', listener)
    return (): void => {
      ipcRenderer.removeListener('updater:status', listener)
    }
  }
}

export type NeoncutApi = typeof api

contextBridge.exposeInMainWorld('neoncut', api)

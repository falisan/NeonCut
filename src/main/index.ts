import { app, BrowserWindow, clipboard, shell } from 'electron'
import { join } from 'path'
import { initDb } from './db'
import { registerIpcHandlers } from './ipc'
import { initUpdater } from './updater'

app.commandLine.appendSwitch('force-renderer-accessibility')

let mainWindow: BrowserWindow | null = null
let lastClipboardText = ''

const URL_RE = /^(https?:\/\/)[^\s]+$/i

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: '#0A0E17',
    autoHideMenuBar: true,
    icon: join(app.getAppPath(), 'build', 'icon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function startClipboardWatch(): void {
  setInterval(() => {
    const text = clipboard.readText().trim()
    if (text && text !== lastClipboardText && URL_RE.test(text)) {
      lastClipboardText = text
      mainWindow?.webContents.send('clipboard:url', text)
    } else if (text !== lastClipboardText) {
      lastClipboardText = text
    }
  }, 1200)
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    app.setAccessibilitySupportEnabled(true)
    await initDb()
    registerIpcHandlers(() => mainWindow)
    createWindow()
    startClipboardWatch()
    initUpdater(() => mainWindow)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}

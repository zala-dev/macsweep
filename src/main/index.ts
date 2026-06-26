import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { registerIpcHandlers } from './ipc.js'
import { reportSafetySmokeTest } from './safety/smokeTest.js'
import type { TargetManager } from './target/TargetManager.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --smoke-test runs the SafetyGuard verification headlessly and exits.
if (process.argv.includes('--smoke-test')) {
  const code = reportSafetySmokeTest()
  process.exit(code)
}

let manager: TargetManager | null = null

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#0a0e1a',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // electron-vite injects this env var in dev; otherwise load the built file.
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    win.loadURL(devUrl)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Verify safety invariants at boot — log loudly if anything regressed.
  reportSafetySmokeTest()

  manager = registerIpcHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', async () => {
  if (manager) await manager.disposeAll()
})

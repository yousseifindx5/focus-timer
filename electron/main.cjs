const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const path = require('path')

app.setAppUserModelId('com.focustimer.app')
if (!app.requestSingleInstanceLock()) app.quit()

let win = null
let savedBounds = null

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 620,
    title: 'Focus Timer',
    backgroundColor: '#0f1115',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required',
      backgroundThrottling: false,
    },
  })
  Menu.setApplicationMenu(null)
  if (process.env.VITE_DEV) win.loadURL('http://localhost:5173')
  else win.loadFile(path.join(__dirname, '../dist/index.html'))
  win.on('focus', () => win && win.flashFrame(false))
  win.on('closed', () => (win = null))
}

app.whenReady().then(createWindow)
app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})
app.on('window-all-closed', () => app.quit())

// Compact / minimal window
ipcMain.on('compact', (_e, on, top) => {
  if (!win) return
  if (on) {
    if (win.isMaximized()) win.unmaximize()
    if (!savedBounds) savedBounds = win.getBounds()
    win.setMinimumSize(300, 220)
    win.setSize(340, 460)
    win.setAlwaysOnTop(!!top)
  } else {
    win.setAlwaysOnTop(false)
    win.setMinimumSize(900, 620)
    if (savedBounds) {
      win.setBounds(savedBounds)
      savedBounds = null
    }
  }
})
ipcMain.on('top', (_e, v) => win && win.setAlwaysOnTop(!!v))
ipcMain.on('flash', () => {
  if (win && !win.isFocused()) win.flashFrame(true)
})

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  compact: (on, top) => ipcRenderer.send('compact', on, top),
  top: (v) => ipcRenderer.send('top', v),
  flash: () => ipcRenderer.send('flash'),
})

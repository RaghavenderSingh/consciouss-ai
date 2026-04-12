import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('clapBridge', {
  sendClap: () => ipcRenderer.send('clap-detected')
})

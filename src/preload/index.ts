import { contextBridge, ipcRenderer } from 'electron'
import type { CaptureResult, ChatSession } from '../main/types'

const electronAPI = {
  // Screen capture
  captureScreen: (): Promise<CaptureResult> => ipcRenderer.invoke('capture-screen'),

  // Mouse control
  moveMouse: (x: number, y: number): Promise<void> => ipcRenderer.invoke('move-mouse', { x, y }),

  clickMouse: (x: number, y: number, button = 'left'): Promise<void> =>
    ipcRenderer.invoke('click-mouse', { x, y, button }),

  // Keyboard control
  typeText: (text: string): Promise<void> => ipcRenderer.invoke('type-text', { text }),

  keyCombo: (keys: string[]): Promise<void> => ipcRenderer.invoke('key-combo', { keys }),

  // Shell
  runCommand: (cmd: string): Promise<string> => ipcRenderer.invoke('run-command', { cmd }),

  // App / URL
  openApp: (name: string): Promise<void> => ipcRenderer.invoke('open-app', { name }),

  openUrl: (url: string, appName?: string): Promise<void> =>
    ipcRenderer.invoke('open-url', { url, appName }),

  // AppleScript
  appleScript: (script: string): Promise<string> => ipcRenderer.invoke('applescript', { script }),

  // Telegram
  onTelegramMessage: (callback: (text: string) => void): void => {
    ipcRenderer.removeAllListeners('telegram-message')
    ipcRenderer.on('telegram-message', (_, text) => callback(text))
  },

  onTelegramStop: (callback: () => void): void => {
    ipcRenderer.removeAllListeners('telegram-stop')
    ipcRenderer.on('telegram-stop', () => callback())
  },

  onTelegramScreenshotRequest: (callback: () => void): void => {
    ipcRenderer.removeAllListeners('telegram-screenshot-request')
    ipcRenderer.on('telegram-screenshot-request', () => callback())
  },

  sendTelegramReply: (text: string): void => {
    ipcRenderer.send('telegram-reply', text)
  },

  sendTelegramScreenshot: (base64: string): void => {
    ipcRenderer.send('telegram-screenshot-reply', base64)
  },

  // Chats
  readChats: (): Promise<ChatSession[]> => ipcRenderer.invoke('read-chats'),
  writeChats: (sessions: ChatSession[]): Promise<void> =>
    ipcRenderer.invoke('write-chats', sessions),

  // Window control
  setWindowSize: (mode: 'expanded' | 'companion' | 'pill' | 'spotlight'): Promise<void> =>
    ipcRenderer.invoke('set-window-size', mode),

  // Memory
  readMemory: (): Promise<{ summary: string; updatedAt: string } | null> =>
    ipcRenderer.invoke('read-memory'),

  writeMemory: (summary: string): Promise<void> => ipcRenderer.invoke('write-memory', summary),

  // Audio transcription (Groq Whisper via main process — no CORS issues)
  transcribeAudio: (buffer: Uint8Array, mimeType: string): Promise<string> =>
    ipcRenderer.invoke('transcribe-audio', { buffer, mimeType }),

  // Google OAuth
  googleAuth: (): Promise<{ id: string; name: string; email: string; avatarUrl: string; subscription: string }> =>
    ipcRenderer.invoke('google-auth'),

  // Wake shortcut listener
  onWakeShortcut: (callback: () => void): void => {
    ipcRenderer.removeAllListeners('wake-shortcut')
    ipcRenderer.on('wake-shortcut', () => callback())
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore: electronAPI is added to window object
  window.electronAPI = electronAPI
}

export interface ScreenInfo {
  dataURL: string
  id: string | number
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface CaptureResult {
  screens: ScreenInfo[]
  totalBounds: {
    left: number
    top: number
    right: number
    bottom: number
  }
  dataURL?: string
}

export interface ElectronBridge {
  captureScreen(): Promise<CaptureResult>
  moveMouse(x: number, y: number): Promise<void>
  clickMouse(x: number, y: number, button?: string): Promise<void>
  typeText(text: string): Promise<void>
  keyCombo(keys: string[]): Promise<void>
  runCommand(cmd: string): Promise<string>
  openApp(name: string): Promise<void>
  openUrl(url: string, appName?: string): Promise<void>
  appleScript(script: string): Promise<string>
  onTelegramMessage(callback: (text: string) => void): void
  onTelegramStop(callback: () => void): void
  onTelegramScreenshotRequest(callback: () => void): void
  sendTelegramReply(text: string): void
  sendTelegramScreenshot(base64: string): void
  getTelegramConfig(): Promise<any>
  updateTelegramConfig(config: any): Promise<any>
  getTelegramStatus(): Promise<any>
  startTelegramDiscovery(): Promise<any>
  onTelegramDiscovered(callback: (data: any) => void): void
  readChats(): Promise<any[]>
  writeChats(sessions: any[]): Promise<void>
  setWindowSize(mode: 'expanded' | 'companion' | 'pill' | 'spotlight'): Promise<void>
  readMemory(): Promise<{ summary: string; updatedAt: string } | null>
  writeMemory(summary: string): Promise<void>
  onWakeShortcut(callback: () => void): void
  transcribeAudio(buffer: Uint8Array, mimeType: string): Promise<string>
  googleAuth(): Promise<{ id: string; name: string; email: string; avatarUrl: string; subscription: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronBridge
  }
}

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

  // Workflow Automation
  listWorkflows(): Promise<any[]>
  saveWorkflow(workflow: any): Promise<void>
  deleteWorkflow(id: string): Promise<void>
  runWorkflow(id: string): Promise<void>
  stopWorkflow(): Promise<void>
  onWorkflowProgress(callback: (data: any) => void): () => void

  // Native Rust-Powered APIs
  listWindows(): Promise<Array<{
    pid: number
    appName: string
    title: string
    x: number
    y: number
    width: number
    height: number
    layer: number
    isOnScreen: boolean
  }>>
  getFrontmostApp(): Promise<string>
  isAccessibilityTrusted(): Promise<boolean>
  getFrontmostAppPid(): Promise<number>
  listUIElements(pid: number, depth?: number): Promise<any[]>
  clipboardRead(): Promise<string>
  clipboardWrite(text: string): Promise<void>
  nativeNotify(title: string, body: string): Promise<void>
  systemInfo(): Promise<{
    cpuBrand: string
    cpuCount: number
    memTotalMb: number
    memUsedMb: number
    osVersion: string
    hostname: string
    cwd: string
  }>
  nativeCaptureScreen(displayIndex?: number): Promise<string>
  displayInfo(): Promise<{
    count: number
    displays: Array<{
      id: number
      x: number
      y: number
      width: number
      height: number
      isMain: boolean
    }>
  }>

  // Attention Telemetry
  getMouseLocation(): Promise<{ x: number; y: number }>
  getSystemIdleTime(): Promise<number>
  attentionFocus(data: any): Promise<void>
  onHudFocus(callback: (data: any) => void): void
}

declare global {
  interface Window {
    electronAPI: ElectronBridge
  }
}

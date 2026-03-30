export type ActionStatus = 'pending' | 'running' | 'done' | 'failed'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  action?: AIAction
  actionStatus?: ActionStatus
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  lastActive: Date
}

export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string
  subscription: string
}

export interface LoginLog {
  id: string
  timestamp: Date
  method: 'google' | 'email' | 'github'
  status: 'success' | 'failed' | 'pending'
  ipAddress?: string
  device?: string
}

export interface StatusChip {
  id: string
  text: string
}

export type AppState =
  | 'splash'
  | 'idle'
  | 'working'
  | 'executing'
  | 'chat'
  | 'companion'
  | 'spotlight'

export interface AIAction {
  type:
    | 'open_app'
    | 'open_url'
    | 'click'
    | 'type_text'
    | 'run_command'
    | 'applescript'
    | 'screenshot'
    | 'none'
  payload?: {
    name?: string
    app_name?: string
    url?: string
    browser?: string
    appName?: string
    x?: number
    y?: number
    text?: string
    cmd?: string
    script?: string
  }
}

export interface AIResponse {
  message: string
  action: AIAction
  continue_task?: boolean
}

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
  screens?: ScreenInfo[]
  totalBounds?: {
    left: number
    top: number
    right: number
    bottom: number
  }
  dataURL?: string
}

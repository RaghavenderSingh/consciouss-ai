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

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date | string
  action?: AIAction
  actionStatus?: string
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  lastActive: Date | string
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
  screens: ScreenInfo[]
  totalBounds: {
    left: number
    top: number
    right: number
    bottom: number
  }
}

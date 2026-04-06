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

// ─── Workflow Types ───────────────────────────────────────

export type WorkflowActionType = AIAction['type'] | 'trigger' | 'delay'

export interface WorkflowNodeData {
  label: string
  actionType: WorkflowActionType
  payload: AIAction['payload'] & { delayMs?: number }
  status: 'idle' | 'running' | 'success' | 'error'
  error?: string
  output?: string
  [key: string]: unknown
}

export interface SerializedNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: WorkflowNodeData
}

export interface SerializedEdge {
  id: string
  source: string
  target: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  icon: string
  nodes: SerializedNode[]
  edges: SerializedEdge[]
  viewport: { x: number; y: number; zoom: number }
  createdAt: string
  updatedAt: string
  lastRunAt?: string
  runCount: number
}

export interface AXElement {
  role: string
  title: string
  description: string
  x: number
  y: number
  width: number
  height: number
}

export interface WorkflowProgress {
  workflowId: string
  nodeId: string
  status: 'running' | 'success' | 'error'
  error?: string
  output?: string
}

import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  screen,
  globalShortcut,
  systemPreferences,
  Menu,
  MenuItemConstructorOptions,
  net,
  desktopCapturer
} from 'electron'
import { join } from 'path'
import { exec } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import TelegramBot from 'node-telegram-bot-api'

// ─── Load .env manually for main process ──────────────────────────────────────
import { config } from 'dotenv'
config({ path: join(__dirname, '../../.env') })

import { createServer } from 'http'
import { createHash, randomBytes } from 'crypto'
import { parse as parseUrl } from 'url'

const native = require(join(__dirname, '../../native/index.js'))


let mainWindow: BrowserWindow | null = null
let hudWindow: BrowserWindow | null = null
let clapWindow: BrowserWindow | null = null
let telegramBot: TelegramBot | null = null
let telegramDiscoveryMode = false

const MEMORY_PATH = join(app.getPath('userData'), 'memory.json')
const CHATS_PATH = join(app.getPath('userData'), 'chats.json')
const TELEGRAM_CONFIG_PATH = join(app.getPath('userData'), 'telegram_config.json')
const WORKFLOWS_PATH = join(app.getPath('userData'), 'workflows.json')

import type { ChatSession } from './types'

interface TelegramConfig {
  token: string
  chatId: string
  enabled: boolean
}

function getTelegramConfig(): TelegramConfig {
  try {
    if (existsSync(TELEGRAM_CONFIG_PATH)) {
      return JSON.parse(readFileSync(TELEGRAM_CONFIG_PATH, 'utf-8'))
    }
  } catch (err) {
    console.error('[Telegram] Failed to read config:', err)
  }
  return {
    token: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    enabled: !!process.env.TELEGRAM_BOT_TOKEN
  }
}

// ─── Telegram bot init ────────────────────────────────────────────────────────
function initTelegram(): void {
  // Stop existing bot if running
  if (telegramBot) {
    telegramBot.stopPolling()
    telegramBot = null
    // Clear existing IPC listeners to avoid duplicates
    ipcMain.removeAllListeners('telegram-reply')
    ipcMain.removeAllListeners('telegram-screenshot-reply')
  }

  const { token, chatId: allowedChatId, enabled } = getTelegramConfig()

  if (!enabled || !token || token.startsWith('your_') || token.trim() === '') {
    console.log('[Telegram] Bot disabled or no valid token')
    return
  }

  if (!token || token.startsWith('your_')) {
    console.log('[Telegram] No valid TELEGRAM_BOT_TOKEN set, skipping bot init')
    return
  }

  try {
    telegramBot = new TelegramBot(token, { polling: true })

    telegramBot.on('polling_error', (err: Error & { code?: string }) => {
      if (err.code === 'ETELEGRAM' && err.message.includes('404')) {
        console.error('[Telegram] Invalid bot token — stopping polling')
        telegramBot?.stopPolling()
      }
    })

    telegramBot.on('message', (msg) => {
      const chatId = String(msg.chat.id)
      
      // Discovery Mode: auto-capture chatId
      if (telegramDiscoveryMode) {
        console.log(`[Telegram] Discovery: Captured Chat ID ${chatId}`)
        telegramDiscoveryMode = false
        
        const config = getTelegramConfig()
        const newConfig = { ...config, chatId, enabled: true }
        writeFileSync(TELEGRAM_CONFIG_PATH, JSON.stringify(newConfig, null, 2))
        
        mainWindow?.webContents.send('telegram-discovered', { chatId, username: msg.from?.username || 'User' })
        
        // Welcome message
        telegramBot?.sendMessage(chatId, `✅ Successfully linked to Consciouss AI! You can now control your desktop remotely from here.`).catch(console.error)
        return
      }

      // Security: only respond to allowed chat
      if (allowedChatId && chatId !== allowedChatId) {
        console.log(`[Telegram] Blocked message from unauthorized chat ${chatId}`)
        return
      }

      const text = msg.text ?? ''

      if (text === '/screenshot') {
        // Capture screen and send photo
        mainWindow?.webContents.send('telegram-screenshot-request')
        return
      }

      if (text === '/stop') {
        mainWindow?.webContents.send('telegram-stop')
        return
      }

      // Forward message to renderer
      mainWindow?.webContents.send('telegram-message', text)
    })

    // Listen for replies from renderer to send back to Telegram
    ipcMain.on('telegram-reply', (_, text: string) => {
      const config = getTelegramConfig()
      if (!config.chatId) return
      telegramBot?.sendMessage(config.chatId, text).catch(console.error)
    })

    // Listen for screenshot to send to Telegram
    ipcMain.on('telegram-screenshot-reply', (_, base64: string) => {
      const config = getTelegramConfig()
      if (!config.chatId) return
      const buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
      telegramBot
        ?.sendPhoto(config.chatId, buffer, { caption: 'Current screen' })
        .catch(console.error)
    })

    console.log('[Telegram] Bot initialized')
  } catch (err) {
    console.error('[Telegram] Failed to init bot:', err)
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

// 1. Capture screen → { dataURL, width, height }
ipcMain.handle('capture-screen', async () => {
  try {
    const displays = screen.getAllDisplays()
    const screens = displays.map((d, i) => {
      // Use Rust native capture for each display
      const buffer = native.captureScreen(i)
      return {
        dataURL: `data:image/jpeg;base64,${buffer.toString('base64')}`,
        id: d.id,
        bounds: d.bounds
      }
    })

    return {
      screens,
      totalBounds: {
        left: Math.min(...displays.map((d) => d.bounds.x)),
        top: Math.min(...displays.map((d) => d.bounds.y)),
        right: Math.max(...displays.map((d) => d.bounds.x + d.bounds.width)),
        bottom: Math.max(...displays.map((d) => d.bounds.y + d.bounds.height))
      }
    }
  } catch (err) {
    console.error('[IPC] capture-screen error:', err)
    throw err
  }
})

// 2. Move mouse
ipcMain.handle('move-mouse', async (_, { x, y }: { x: number; y: number }) => {
  try {
    const displays = screen.getAllDisplays()
    const left = Math.min(...displays.map((d) => d.bounds.x))
    const top = Math.min(...displays.map((d) => d.bounds.y))
    const desktopW = Math.max(...displays.map((d) => d.bounds.x + d.bounds.width)) - left

    const scaleFactor = desktopW / 1280
    const scaledX = left + x * scaleFactor
    const scaledY = top + y * scaleFactor

    console.log(`[IPC] move-mouse: AI(${x}, ${y}) -> Total Desktop(${Math.round(scaledX)}, ${Math.round(scaledY)})`)
    native.moveMouse(Math.round(scaledX), Math.round(scaledY))
  } catch (err) {
    console.error('[IPC] move-mouse error:', err)
    throw err
  }
})

// 3. Click mouse
ipcMain.handle(
  'click-mouse',
  async (_, { x, y, button = 'left' }: { x: number; y: number; button?: string }) => {
    try {
      const displays = screen.getAllDisplays()
      const left = Math.min(...displays.map((d) => d.bounds.x))
      const top = Math.min(...displays.map((d) => d.bounds.y))
      const desktopW = Math.max(...displays.map((d) => d.bounds.x + d.bounds.width)) - left

      const scaleFactor = desktopW / 1280
      const scaledX = Math.round(left + x * scaleFactor)
      const scaledY = Math.round(top + y * scaleFactor)

      console.log(
        `[IPC] click-mouse: AI(${x}, ${y}) -> Total Desktop(${scaledX}, ${scaledY})`
      )

      if (button === 'right') {
        native.rightClick(scaledX, scaledY)
      } else {
        native.click(scaledX, scaledY)
      }
    } catch (err) {
      console.error('[IPC] click-mouse error:', err)
      throw err
    }
  }
)

// 4. Type text
ipcMain.handle('type-text', async (_, { text }: { text: string }) => {
  try {
    native.typeText(text)
  } catch (err) {
    console.error('[IPC] type-text error:', err)
    throw err
  }
})

// 5. Key combo
ipcMain.handle('key-combo', async (_, { keys }: { keys: string[] }) => {
  try {
    native.keyCombo(keys)
  } catch (err) {
    console.error('[IPC] key-combo error:', err)
    throw err
  }
})

// 6. Run shell command
ipcMain.handle('run-command', (_, { cmd }: { cmd: string }) => {
  try {
    const result = native.execCommand(cmd, 15000)
    if (result.code !== 0 && result.stderr) {
      throw new Error(result.stderr)
    }
    return result.stdout
  } catch (err) {
    throw err
  }
})

// 7. Open app
ipcMain.handle('open-app', (_, { name }: { name: string }) => {
  // Normalize shorthand names the AI commonly generates
  const aliases: Record<string, string> = {
    brave: 'Brave Browser',
    chrome: 'Google Chrome',
    firefox: 'Firefox',
    safari: 'Safari',
    terminal: 'Terminal',
    vscode: 'Visual Studio Code',
    code: 'Visual Studio Code',
    finder: 'Finder',
    notes: 'Notes',
    mail: 'Mail',
    messages: 'Messages',
    spotify: 'Spotify',
    slack: 'Slack',
    figma: 'Figma',
    notion: 'Notion',
  }
  const resolved = aliases[name.trim().toLowerCase()] ?? name.trim()

  const tryOpen = (appName: string): Promise<void> =>
    new Promise((res, rej) => {
      try {
        native.activateApp(appName)
        res()
      } catch (err) {
        // Fall back to open -a if native activation fails
        exec(`open -a "${appName}"`, (err2) => {
          if (err2) rej(err2.message)
          else res()
        })
      }
    })

  // Try resolved name first, then the original if different
  return tryOpen(resolved).catch(() =>
    resolved !== name.trim() ? tryOpen(name.trim()) : Promise.reject(`App not found: ${name}`)
  )
})

// 8. Open URL
ipcMain.handle('open-url', async (_, { url, appName }: { url: string; appName?: string }) => {
  if (appName) {
    const fullAppName = appName.toLowerCase().includes('brave')
      ? 'Brave Browser'
      : appName.toLowerCase().includes('chrome')
        ? 'Google Chrome'
        : appName

    console.log(`[IPC] open-url: Targeting ${fullAppName} for ${url}`)

    if (fullAppName === 'Brave Browser' || fullAppName === 'Google Chrome') {
      const script = `
        tell application "${fullAppName}"
          activate
          if (count of windows) is 0 then
            make new window
            set URL of active tab of front window to "${url}"
          else
            tell front window
              set found to false
              set theTabs to tabs
              repeat with t in theTabs
                if URL of t contains "youtube.com" then
                  set URL of t to "${url}"
                  set active tab index to (index of t)
                  set found to true
                  exit repeat
                end if
              end repeat
              if not found then
                make new tab with properties {URL:"${url}"}
              end if
            end tell
          end if
        end tell`

      return new Promise<void>((resolve, reject) => {
        exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, (error) => {
          if (error) {
            console.error(`[IPC] open-url AppleScript error:`, error)
            // Fallback to simple open if AppleScript fails
            exec(`open -a "${fullAppName}" "${url}"`, (err2) => {
              if (err2) reject(err2)
              else resolve()
            })
          } else {
            resolve()
          }
        })
      })
    }

    return new Promise<void>((resolve, reject) => {
      exec(`open -a "${fullAppName}" "${url}"`, (error) => {
        if (error) reject(error)
        else resolve()
      })
    })
  }
  await shell.openExternal(url)
})

// 9. AppleScript
ipcMain.handle('applescript', (_, { script }: { script: string }) => {
  return new Promise<string>((resolve, reject) => {
    const child = exec('osascript', { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('[AppleScript] Execution error:', stderr || error.message);
        reject(stderr || error.message)
        return
      }
      resolve(stdout.trim())
    })

    if (child.stdin) {
      child.stdin.write(script)
      child.stdin.end()
    }
  })
})
// ── Native-powered capabilities (Rust) ─────────────────────────────────────────

// 10. List all open windows
ipcMain.handle('list-windows', () => {
  return native.listWindows()
})

ipcMain.handle('is-accessibility-trusted', () => {
  return native.isAccessibilityTrusted()
})

ipcMain.handle('get-frontmost-app-pid', () => {
  return native.getFrontmostAppPid()
})

ipcMain.handle('list-ui-elements', (_, pid: number, depth: number = 7) => {
  try {
    return native.listUiElements(pid, depth)
  } catch (err) {
    console.error('Failed to list UI elements:', err)
    return []
  }
})

ipcMain.handle('get-frontmost-app', () => {
  return native.getFrontmostApp()
})

// 12. Clipboard read/write
ipcMain.handle('clipboard-read', () => {
  return native.clipboardRead()
})

ipcMain.handle('clipboard-write', (_, { text }: { text: string }) => {
  native.clipboardWrite(text)
})

// 13. Native macOS notification
ipcMain.handle('native-notify', (_, { title, body }: { title: string; body: string }) => {
  native.notify(title, body)
})

// 14. System info
ipcMain.handle('system-info', () => {
  return native.getSystemInfo()
})

// 15. Native screen capture (via CoreGraphics — faster, more reliable)
ipcMain.handle('native-capture-screen', (_, { displayIndex }: { displayIndex?: number } = {}) => {
  const buffer = native.captureScreen(displayIndex ?? 0)
  return buffer.toString('base64')
})

// 16. Native display info
ipcMain.handle('display-info', () => {
  return {
    count: native.getDisplayCount(),
    displays: native.getDisplayBounds()
  }
})

// 17. Attention Telemetry
ipcMain.handle('get-mouse-location', () => {
  return native.getMouseLocation()
})

ipcMain.handle('get-system-idle-time', () => {
  return native.getSystemIdleTime()
})

ipcMain.handle('attention-focus', (_, data: any) => {
  hudWindow?.webContents.send('hud-focus', data)
})

// ── Audio transcription via Groq Whisper ──────────────────────────────────────
ipcMain.handle('transcribe-audio', async (_, { buffer, mimeType }: { buffer: Uint8Array; mimeType: string }) => {
  const apiKey = process.env.VITE_GROQ_API_KEY
  if (!apiKey) throw new Error('VITE_GROQ_API_KEY not set in .env')

  const ext = mimeType.includes('ogg') ? 'ogg' : 'webm'
  const audioBlob = new Blob([Buffer.from(buffer)], { type: mimeType.split(';')[0] })

  const form = new FormData()
  form.append('file', audioBlob, `audio.${ext}`)
  form.append('model', 'whisper-large-v3-turbo')
  form.append('language', 'en')

  const res = await net.fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form as unknown as BodyInit
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq ${res.status}: ${err}`)
  }

  const { text } = (await res.json()) as { text: string }
  return text ?? ''
})

// ── Google OAuth ──────────────────────────────────────────────────────────────
ipcMain.handle('google-auth', async () => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || clientId === 'your_google_client_id_here') {
    throw new Error('GOOGLE_CLIENT_ID not configured in .env')
  }
  if (!clientSecret || clientSecret === 'your_google_client_secret_here') {
    throw new Error('GOOGLE_CLIENT_SECRET not configured in .env')
  }

  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
  const state = randomBytes(16).toString('hex')

  return new Promise<{ id: string; name: string; email: string; avatarUrl: string; subscription: string }>((resolve, reject) => {
    let serverPort = 0

    const server = createServer(async (req, res) => {
      try {
        const parsed = parseUrl(req.url || '', true)

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(`<!DOCTYPE html><html><head><title>Consciouss</title></head><body style="font-family:-apple-system,sans-serif;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center;padding:40px"><div style="font-size:48px;margin-bottom:16px">&#10003;</div><h2 style="font-weight:700;letter-spacing:-0.02em">Signed in successfully</h2><p style="color:rgba(255,255,255,0.5);margin-top:8px">You can close this window and return to Consciouss.</p></div></body></html>`)

        server.close()

        const { query } = parsed

        if (query.error) {
          reject(new Error(String(query.error_description || query.error)))
          return
        }

        if (query.state !== state) {
          reject(new Error('Security error: state mismatch'))
          return
        }

        const code = String(query.code)

        const tokenRes = await net.fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: `http://127.0.0.1:${serverPort}`,
            grant_type: 'authorization_code',
            code_verifier: codeVerifier
          }).toString()
        })

        const tokenData = await tokenRes.json() as {
          access_token?: string
          error?: string
          error_description?: string
        }

        if (!tokenData.access_token) {
          reject(new Error(tokenData.error_description || tokenData.error || 'Token exchange failed'))
          return
        }

        const userRes = await net.fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        })

        const googleUser = await userRes.json() as {
          sub: string
          name: string
          email: string
          picture: string
        }

        resolve({
          id: googleUser.sub,
          name: googleUser.name,
          email: googleUser.email,
          avatarUrl: googleUser.picture,
          subscription: 'FREE'
        })
      } catch (err) {
        reject(err)
      }
    })

    const OAUTH_PORT = 4284
    server.listen(OAUTH_PORT, '127.0.0.1', () => {
      serverPort = OAUTH_PORT

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `http://127.0.0.1:${serverPort}`,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        access_type: 'offline',
        prompt: 'select_account'
      })

      shell.openExternal(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
      console.log('[OAuth] Opened Google sign-in, waiting on port', serverPort)
    })

    setTimeout(() => {
      server.close()
      reject(new Error('Authentication timed out (5 minutes)'))
    }, 5 * 60 * 1000)
  })
})

// ── Window size control ───────────────────────────────────────────────────────
ipcMain.handle('set-window-size', (_, mode: 'expanded' | 'companion' | 'pill' | 'spotlight') => {
  if (!mainWindow || mainWindow.isDestroyed()) return
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize

  const sizes = {
    expanded: {
      x: Math.round((sw - 1440) / 2),
      y: Math.round((sh - 900) / 2),
      width: 1440,
      height: 900
    },
    companion: {
      x: sw - 400,
      y: 0,
      width: 380,
      height: sh
    },
    pill: {
      x: sw - 440,
      y: sh - 92,
      width: 420,
      height: 72
    },
    spotlight: {
      x: Math.round((sw - 680) / 2),
      y: Math.round((sh - 160) / 2),
      width: 680,
      height: 160
    }
  }

  mainWindow.setBounds(sizes[mode], true) // true = native macOS spring animation
})

// ─── Telegram IPC ─────────────────────────────────────────────────────────────
ipcMain.handle('get-telegram-config', () => getTelegramConfig())

ipcMain.handle('update-telegram-config', (_, newConfig: TelegramConfig) => {
  try {
    writeFileSync(TELEGRAM_CONFIG_PATH, JSON.stringify(newConfig, null, 2))
    initTelegram()
    return { success: true }
  } catch (err) {
    console.error('[Telegram] Failed to save config:', err)
    return { success: false, error: String(err) }
  }
})

ipcMain.handle('get-telegram-status', () => {
  return {
    isActive: !!telegramBot && telegramBot.isPolling(),
    botName: telegramBot ? 'Consciouss Bot' : null,
    isDiscoveryActive: telegramDiscoveryMode
  }
})

ipcMain.handle('start-telegram-discovery', () => {
  if (!telegramBot) return { success: false, error: 'Bot not initialized. Please provide a token first.' }
  telegramDiscoveryMode = true
  console.log('[Telegram] Discovery mode activated')
  return { success: true }
})

// ── Session memory (upgraded: full MemoryStore JSON) ─────────────────────────
ipcMain.handle('read-memory', () => {
  try {
    if (!existsSync(MEMORY_PATH)) return null
    return JSON.parse(readFileSync(MEMORY_PATH, 'utf-8'))
  } catch {
    return null
  }
})

ipcMain.handle('write-memory', (_, store: any) => {
  try {
    writeFileSync(MEMORY_PATH, JSON.stringify(store, null, 2))
  } catch (err) {
    console.error('[Memory] write failed:', err)
  }
})

ipcMain.handle('read-chats', () => {
  try {
    if (!existsSync(CHATS_PATH)) return []
    return JSON.parse(readFileSync(CHATS_PATH, 'utf-8'))
  } catch {
    return []
  }
})

ipcMain.handle('write-chats', (_, sessions: ChatSession[]) => {
  try {
    writeFileSync(CHATS_PATH, JSON.stringify(sessions, null, 2))
  } catch (err) {
    console.error('[Chats] write failed:', err)
  }
})

// ─── Workflow Automation ──────────────────────────────────────────────────────

let workflowAbortController: AbortController | null = null

function readWorkflows(): any[] {
  try {
    if (!existsSync(WORKFLOWS_PATH)) return []
    return JSON.parse(readFileSync(WORKFLOWS_PATH, 'utf-8'))
  } catch {
    return []
  }
}

function writeWorkflows(workflows: any[]): void {
  writeFileSync(WORKFLOWS_PATH, JSON.stringify(workflows, null, 2))
}

ipcMain.handle('workflow:list', () => {
  return readWorkflows()
})

ipcMain.handle('workflow:save', (_, workflow: any) => {
  const workflows = readWorkflows()
  const idx = workflows.findIndex((w: any) => w.id === workflow.id)
  if (idx >= 0) {
    workflows[idx] = workflow
  } else {
    workflows.push(workflow)
  }
  writeWorkflows(workflows)
})

ipcMain.handle('workflow:delete', (_, id: string) => {
  const workflows = readWorkflows().filter((w: any) => w.id !== id)
  writeWorkflows(workflows)
})

ipcMain.handle('workflow:run', async (_, id: string) => {
  const workflows = readWorkflows()
  const wf = workflows.find((w: any) => w.id === id)
  if (!wf) throw new Error(`Workflow ${id} not found`)

  workflowAbortController = new AbortController()
  const signal = workflowAbortController.signal

  // Build adjacency list from edges
  const adj: Record<string, string[]> = {}
  const inDegree: Record<string, number> = {}
  for (const node of wf.nodes) {
    adj[node.id] = []
    inDegree[node.id] = 0
  }
  for (const edge of wf.edges) {
    adj[edge.source] = adj[edge.source] || []
    adj[edge.source].push(edge.target)
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1
  }

  // Topological sort (Kahn's algorithm)
  const queue: string[] = []
  for (const nodeId of Object.keys(inDegree)) {
    if (inDegree[nodeId] === 0) queue.push(nodeId)
  }
  const sorted: string[] = []
  while (queue.length > 0) {
    const curr = queue.shift()!
    sorted.push(curr)
    for (const next of (adj[curr] || [])) {
      inDegree[next]--
      if (inDegree[next] === 0) queue.push(next)
    }
  }

  // Execute each node in order
  const nodeMap: Record<string, any> = {}
  for (const n of wf.nodes) nodeMap[n.id] = n

  for (const nodeId of sorted) {
    if (signal.aborted) break

    const node = nodeMap[nodeId]
    if (!node) continue

    const data = node.data
    mainWindow?.webContents.send('workflow:progress', {
      workflowId: id,
      nodeId,
      status: 'running',
    })

    try {
      let nodeOutput = ''

      // Execute based on action type
      switch (data.actionType) {
        case 'trigger':
          nodeOutput = 'Workflow started'
          break

        case 'click': {
          const { x, y } = data.payload || {}
          if (x != null && y != null) {
            native.click(x, y)
            nodeOutput = `Clicked at (${x}, ${y})`
          } else {
            nodeOutput = 'Skipped — no coordinates set'
          }
          break
        }

        case 'type_text': {
          const { text } = data.payload || {}
          if (text) {
            native.typeText(text)
            nodeOutput = `Typed: "${text}"`
          } else {
            nodeOutput = 'Skipped — no text set'
          }
          break
        }

        case 'open_app': {
          const name = data.payload?.name || data.payload?.app_name
          if (name) {
            native.activateApp(name)
            nodeOutput = `Opened ${name}`
          } else {
            nodeOutput = 'Skipped — no app name set'
          }
          break
        }

        case 'open_url': {
          const { url, browser } = data.payload || {}
          if (url) {
            if (browser) {
              native.execCommand(`open -a "${browser}" "${url}"`, 10000)
            } else {
              await shell.openExternal(url)
            }
            nodeOutput = `Opened ${url}`
          } else {
            nodeOutput = 'Skipped — no URL set'
          }
          break
        }

        case 'run_command': {
          const cmd = data.payload?.cmd
          if (cmd) {
            const result = native.execCommand(cmd, 15000)
            if (result.code !== 0 && result.stderr) {
              throw new Error(`Exit ${result.code}: ${result.stderr}`)
            }
            nodeOutput = result.stdout || result.stderr || '(no output)'
          } else {
            nodeOutput = 'Skipped — no command set'
          }
          break
        }

        case 'applescript': {
          const script = data.payload?.script
          if (script) {
            const escaped = script.replace(/'/g, "'\"'\"'")
            const result = native.execCommand(`osascript -e '${escaped}'`, 15000)
            if (result.code !== 0 && result.stderr) {
              throw new Error(`AppleScript error: ${result.stderr}`)
            }
            nodeOutput = result.stdout || '(no output)'
          } else {
            nodeOutput = 'Skipped — no script set'
          }
          break
        }

        case 'screenshot': {
          nodeOutput = 'Screenshot captured'
          break
        }

        case 'delay': {
          const ms = data.payload?.delayMs || 1000
          await new Promise((r) => setTimeout(r, ms))
          nodeOutput = `Waited ${ms}ms`
          break
        }

        default:
          nodeOutput = 'Unknown action'
          break
      }

      if (!signal.aborted) {
        mainWindow?.webContents.send('workflow:progress', {
          workflowId: id,
          nodeId,
          status: 'success',
          output: nodeOutput,
        })
      }

      // Post-step delay (unless it's already a delay node)
      if (data.actionType !== 'delay' && data.actionType !== 'trigger') {
        const afterDelay = data.payload?.delayMs || 800
        await new Promise((r) => setTimeout(r, afterDelay))
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      mainWindow?.webContents.send('workflow:progress', {
        workflowId: id,
        nodeId,
        status: 'error',
        error: errMsg,
        output: `Error: ${errMsg}`,
      })
      break // Stop on error
    }
  }

  // Update run count
  const updatedWorkflows = readWorkflows()
  const wfIdx = updatedWorkflows.findIndex((w: any) => w.id === id)
  if (wfIdx >= 0) {
    updatedWorkflows[wfIdx].runCount = (updatedWorkflows[wfIdx].runCount || 0) + 1
    updatedWorkflows[wfIdx].lastRunAt = new Date().toISOString()
    writeWorkflows(updatedWorkflows)
  }

  workflowAbortController = null
})

ipcMain.handle('workflow:stop', () => {
  workflowAbortController?.abort()
  workflowAbortController = null
})

// ─── Create window ────────────────────────────────────────────────────────────
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    frame: false,
    titleBarStyle: 'hiddenInset',
    transparent: true,
    vibrancy: 'fullscreen-ui',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.webContents.session.setPermissionRequestHandler((_, permission, callback) => {
    callback(permission === 'media')
  })

  mainWindow.on('ready-to-show', () => {
    const { wasOpenedAtLogin } = app.getLoginItemSettings()
    if (!wasOpenedAtLogin) mainWindow?.show()
  })

  mainWindow.on('closed', () => { mainWindow = null })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createHudWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().bounds

  hudWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    enableLargerThanScreen: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  hudWindow.setIgnoreMouseEvents(true, { forward: true })
  hudWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    hudWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#hud`)
  } else {
    hudWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'hud' })
  }
}

function createClapWindow(): void {
  clapWindow = new BrowserWindow({
    width: 1,
    height: 1,
    show: false,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/clap.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  clapWindow.webContents.session.setPermissionRequestHandler((_, permission, callback) => {
    callback(permission === 'media')
  })

  const htmlPath = app.isPackaged
    ? join(process.resourcesPath, 'resources', 'clap-detector.html')
    : join(__dirname, '../../resources/clap-detector.html')

  clapWindow.loadFile(htmlPath)

  clapWindow.on('closed', () => { clapWindow = null })
}

// IPC: double-clap received from hidden audio window → wake main window
ipcMain.on('clap-detected', () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    // Main window was closed — recreate it
    createWindow()
    return
  }
  console.log('[Clap] Double clap — waking app')
  try {
    mainWindow.show()
    mainWindow.focus()
    if (!mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send('wake-shortcut')
    }
  } catch (err) {
    console.error('[Clap] Failed to wake window:', err)
  }
})

// ─── Native Menu setup ────────────────────────────────────────────────────────
function setupMenu(): void {
  const isMac = process.platform === 'darwin'
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }
        ] as MenuItemConstructorOptions[])
      : []),
    {
      label: 'File',
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: 'Speech',
                submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }]
              }
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }])
      ] as MenuItemConstructorOptions[]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close' }])
      ] as MenuItemConstructorOptions[]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.consciouss')

  // Request macOS permissions upfront
  if (process.platform === 'darwin') {
    const micStatus = systemPreferences.getMediaAccessStatus('microphone')
    if (micStatus !== 'granted') await systemPreferences.askForMediaAccess('microphone')

    const isTrusted = systemPreferences.isTrustedAccessibilityClient(true)
    if (!isTrusted) {
      console.warn('[Permissions] Accessibility not granted — asking user')
    }

    const screenStatus = systemPreferences.getMediaAccessStatus('screen')
    if (screenStatus !== 'granted') {
      console.warn(
        '[Permissions] Screen recording not granted — go to System Preferences > Privacy & Security > Screen Recording and enable Electron'
      )
      // Trigger prompt
      desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } })
        .then(() => {})
        .catch(() => {})
    }
  }


  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register as a login item so the app auto-starts on boot (hidden, no visible window)
  app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true })

  createWindow()
  createHudWindow()
  createClapWindow()
  initTelegram()
  setupMenu()

  // Global shortcut — primary wake trigger
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (!mainWindow) return
    console.log('[Shortcut] Wake word triggered')

    // Set size to spotlight FIRST while it's hidden to avoid the full-screen flash
    const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize
    const spotlightWidth = 780
    const spotlightHeight = 160

    mainWindow.setBounds(
      {
        x: Math.round((sw - spotlightWidth) / 2),
        y: Math.round((sh - spotlightHeight) / 2),
        width: spotlightWidth,
        height: spotlightHeight
      },
      false
    ) // No animation while hidden

    mainWindow.show()
    mainWindow.webContents.send('wake-shortcut')
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  telegramBot?.stopPolling()
  if (process.platform !== 'darwin') app.quit()
})

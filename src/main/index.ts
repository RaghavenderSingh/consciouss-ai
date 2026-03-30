import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  screen,
  globalShortcut,
  systemPreferences,
  Menu,
  MenuItemConstructorOptions,
  net
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


let mainWindow: BrowserWindow | null = null
let telegramBot: TelegramBot | null = null
let telegramDiscoveryMode = false

// ─── Session memory ────────────────────────────────────────────────────────────
const MEMORY_PATH = join(app.getPath('userData'), 'memory.json')
const CHATS_PATH = join(app.getPath('userData'), 'chats.json')
const TELEGRAM_CONFIG_PATH = join(app.getPath('userData'), 'telegram_config.json')

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
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1280, height: 800 }
    })
    
    // Map sources to their displays to know their positions
    return {
      screens: sources.map((s, i) => ({
        dataURL: s.thumbnail.toDataURL(),
        id: s.display_id,
        bounds: displays[i]?.bounds || displays[0].bounds
      })),
      totalBounds: {
        left: Math.min(...displays.map(d => d.bounds.x)),
        top: Math.min(...displays.map(d => d.bounds.y)),
        right: Math.max(...displays.map(d => d.bounds.x + d.bounds.width)),
        bottom: Math.max(...displays.map(d => d.bounds.y + d.bounds.height))
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
    const { mouse, Point } = await import('@nut-tree-fork/nut-js')
    const displays = screen.getAllDisplays()
    const left = Math.min(...displays.map((d) => d.bounds.x))
    const top = Math.min(...displays.map((d) => d.bounds.y))
    const desktopW = Math.max(...displays.map((d) => d.bounds.x + d.bounds.width)) - left

    const scaleFactor = desktopW / 1280
    const scaledX = left + x * scaleFactor
    const scaledY = top + y * scaleFactor

    console.log(`[IPC] move-mouse: AI(${x}, ${y}) -> Total Desktop(${Math.round(scaledX)}, ${Math.round(scaledY)})`)
    await mouse.move([new Point(scaledX, scaledY)])
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
      const { mouse, Point, Button } = await import('@nut-tree-fork/nut-js')
      const displays = screen.getAllDisplays()
      const left = Math.min(...displays.map((d) => d.bounds.x))
      const top = Math.min(...displays.map((d) => d.bounds.y))
      const desktopW = Math.max(...displays.map((d) => d.bounds.x + d.bounds.width)) - left

      const scaleFactor = desktopW / 1280
      const scaledX = left + x * scaleFactor
      const scaledY = top + y * scaleFactor

      console.log(
        `[IPC] click-mouse: AI(${x}, ${y}) -> Total Desktop(${Math.round(scaledX)}, ${Math.round(scaledY)})`
      )

      await mouse.move([new Point(scaledX, scaledY)])
      const btn =
        button === 'right' ? Button.RIGHT : button === 'middle' ? Button.MIDDLE : Button.LEFT
      await mouse.click(btn)
    } catch (err) {
      console.error('[IPC] click-mouse error:', err)
      throw err
    }
  }
)

// 4. Type text
ipcMain.handle('type-text', async (_, { text }: { text: string }) => {
  try {
    const { keyboard } = await import('@nut-tree-fork/nut-js')
    await keyboard.type(text)
  } catch (err) {
    console.error('[IPC] type-text error:', err)
    throw err
  }
})

// 5. Key combo
ipcMain.handle('key-combo', async (_, { keys }: { keys: string[] }) => {
  try {
    const { keyboard, Key } = await import('@nut-tree-fork/nut-js')
    const mapped = keys.map((k) => {
      const upper = k.toUpperCase()
      return (Key as Record<string, unknown>)[upper] ?? k
    })
    await keyboard.pressKey(...(mapped as Parameters<typeof keyboard.pressKey>))
  } catch (err) {
    console.error('[IPC] key-combo error:', err)
    throw err
  }
})

// 6. Run shell command
ipcMain.handle('run-command', (_, { cmd }: { cmd: string }) => {
  return new Promise<string>((resolve, reject) => {
    exec(cmd, { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message)
        return
      }
      resolve(stdout)
    })
  })
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
      // Use AppleScript so the app activates and comes to front
      const script = `tell application "${appName}" to activate`
      exec(`osascript -e '${script}'`, (err) => {
        if (err) {
          // Fall back to open -a if AppleScript fails (app not running yet)
          exec(`open -a "${appName}"`, (err2) => {
            if (err2) rej(err2.message)
            else res()
          })
        } else res()
      })
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

// ── Audio transcription via Groq Whisper ──────────────────────────────────────
ipcMain.handle('transcribe-audio', async (_, { buffer, mimeType }: { buffer: Uint8Array; mimeType: string }) => {
  const apiKey = process.env.VITE_GROQ_API_KEY
  if (!apiKey) throw new Error('VITE_GROQ_API_KEY not set in .env')

  const ext = mimeType.includes('ogg') ? 'ogg' : 'webm'
  const audioBlob = new Blob([buffer.buffer as ArrayBuffer], { type: mimeType.split(';')[0] })

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
  if (!mainWindow) return
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

// ── Session memory ────────────────────────────────────────────────────────────
ipcMain.handle('read-memory', () => {
  try {
    if (!existsSync(MEMORY_PATH)) return null
    return JSON.parse(readFileSync(MEMORY_PATH, 'utf-8'))
  } catch {
    return null
  }
})

ipcMain.handle('write-memory', (_, summary: string) => {
  try {
    writeFileSync(
      MEMORY_PATH,
      JSON.stringify({
        summary,
        updatedAt: new Date().toISOString()
      })
    )
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

// ─── Create window ────────────────────────────────────────────────────────────
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    frame: false,
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
    mainWindow?.show()
  })

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

    const screenStatus = systemPreferences.getMediaAccessStatus('screen')
    if (screenStatus !== 'granted') {
      console.warn(
        '[Permissions] Screen recording not granted — go to System Preferences > Privacy & Security > Screen Recording and enable Electron'
      )
    }
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
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

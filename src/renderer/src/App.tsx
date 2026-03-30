import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AIAction, ActionStatus, AppState, Message, CaptureResult, ChatSession, User, LoginLog } from './types'

import SplashScreen from './components/SplashScreen'
import CommandBar from './components/CommandBar'
import ChatPanel from './components/ChatPanel'
import Sidebar from './components/Sidebar'
import GlassContainer from './components/GlassContainer'
import ControlStrip from './components/ControlStrip'
import HomeView from './components/HomeView'
import SpotlightBar from './components/SpotlightBar'
import LoginView from './components/LoginView'
import LoginLogsView from './components/LoginLogsView'

import { useOpenRouter } from './hooks/useOpenRouter'
import { useScreenCapture } from './hooks/useScreenCapture'
import { useVoiceInput } from './hooks/useVoiceInput'
import { executeAction } from './lib/actions'
import { ActiveApp } from './components/ContextStrip'

export default function App(): ReactElement {
  const [appState, setAppState] = useState<AppState>('splash')
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [workingTimer, setWorkingTimer] = useState(60)
  const sessionMemory = null
  const [activeApp, setActiveApp] = useState<ActiveApp | null>(null)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [activeTab, setActiveTab] = useState<'chats' | 'workflows' | 'logs' | 'telegram'>('chats')

  // ── Auth state ───────────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('consciouss_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>(() => {
    try {
      const stored = localStorage.getItem('consciouss_login_logs')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [hasSeenSplash, setHasSeenSplash] = useState(false)
  const [hasSkippedLogin, setHasSkippedLogin] = useState(
    () => localStorage.getItem('consciouss_skipped_login') === 'true'
  )

  const isCompanion = windowWidth <= 420
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { sendMessage, isStreaming, streamingText, error: aiError } = useOpenRouter()
  const { startCapture } = useScreenCapture()

  // ── Session Management ───────────────────────────────────────────────────

  // Load sessions from disk on mount
  useEffect(() => {
    window.electronAPI?.readChats?.().then((data: ChatSession[]) => {
      const initialId = `session-${Date.now()}`
      const initialSession: ChatSession = {
        id: initialId,
        title: 'New Chat',
        messages: [],
        lastActive: new Date()
      }

      if (data && data.length > 0) {
        const sorted = [...data].sort(
          (a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
        )

        if (sorted[0].messages.length === 0) {
          setSessions(sorted)
          setCurrentSessionId(sorted[0].id)
        } else {
          setSessions([initialSession, ...sorted])
          setCurrentSessionId(initialId)
        }
      } else {
        setSessions([initialSession])
        setCurrentSessionId(initialId)
      }

      setMessages([])
      setAppState('idle')
    })
  }, [])

  // Auto-save sessions when they change
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    window.electronAPI?.writeChats?.(sessions)
  }, [sessions])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const startChips = useCallback((): void => { }, [])
  const stopChips = useCallback((): void => { }, [])

  const startTimer = useCallback((): void => {
    setWorkingTimer(60)
    countdownRef.current = setInterval(() => {
      setWorkingTimer((t) => {
        if (t <= 1) {
          clearInterval(countdownRef.current!)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }, [])

  const stopTimer = useCallback((): void => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  const handleStop = useCallback((): void => {
    stopChips()
    stopTimer()
    window.speechSynthesis.cancel()
    setAppState(messages.length > 0 ? 'chat' : 'idle')
  }, [messages.length, stopChips, stopTimer])

  const handleNewChat = useCallback(async (): Promise<void> => {
    if (messages.length === 0 && currentSessionId) {
      setAppState('idle')
      setActiveApp(null)
      stopChips()
      stopTimer()
      await window.electronAPI?.setWindowSize('expanded')
      return
    }

    const newId = `session-${Date.now()}`
    const newSession: ChatSession = {
      id: newId,
      title: 'New Chat',
      messages: [],
      lastActive: new Date()
    }

    setSessions((prev) => [newSession, ...prev])
    setCurrentSessionId(newId)
    setMessages([])
    setActiveApp(null)
    setAppState('idle')
    stopChips()
    stopTimer()
    await window.electronAPI?.setWindowSize('expanded')
  }, [messages.length, currentSessionId, stopChips, stopTimer])

  const handleSelectSession = useCallback(
    (id: string) => {
      const session = sessions.find((s) => s.id === id)
      if (session) {
        setCurrentSessionId(id)
        setMessages(session.messages)
        setAppState(session.messages.length > 0 ? 'chat' : 'idle')
      }
    },
    [sessions]
  )

  const handleDeleteSession = useCallback(
    (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation()
      const updated = sessions.filter((s) => s.id !== id)
      setSessions(updated)
      window.electronAPI?.writeChats?.(updated)

      if (currentSessionId === id) {
        if (updated.length > 0) {
          handleSelectSession(updated[0].id)
        } else {
          handleNewChat()
        }
      }
    },
    [sessions, currentSessionId, handleSelectSession, handleNewChat]
  )

  const handleClearAllSessions = useCallback(() => {
    setSessions([])
    window.electronAPI?.writeChats?.([])
    handleNewChat()
  }, [handleNewChat])

  const handleSubmit = useCallback(
    async (text: string) => {
      setVoiceTranscript('')

      const timestamp = new Date()
      const newUserMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp
      }

      // Update session title if first message
      if (messages.length === 0 && currentSessionId) {
        const title = text.length > 30 ? text.slice(0, 30) + '...' : text
        setSessions((prev) =>
          prev.map((s) => (s.id === currentSessionId ? { ...s, title, lastActive: timestamp } : s))
        )
      }

      setMessages((prev) => {
        const next = [...prev, newUserMsg]
        // Sync to sessions array
        if (currentSessionId) {
          setSessions((sPrev) =>
            sPrev.map((s) =>
              s.id === currentSessionId ? { ...s, messages: next, lastActive: timestamp } : s
            )
          )
        }
        return next
      })

      setAppState('working')
      startChips()
      startTimer()

      try {
        let stitched: string | null = null
        try {
          const res = (await window.electronAPI?.captureScreen()) as CaptureResult
          if (res && res.screens && res.totalBounds) {
            const canvas = document.createElement('canvas')
            const { screens, totalBounds } = res
            const fullW = totalBounds.right - totalBounds.left
            const fullH = totalBounds.bottom - totalBounds.top
            const scale = 1280 / fullW
            canvas.width = 1280
            canvas.height = fullH * scale
            const ctx = canvas.getContext('2d')
            if (ctx) {
              for (const s of screens) {
                const img = new Image()
                img.src = s.dataURL
                await new Promise((resolve) => {
                  img.onload = resolve
                })
                ctx.drawImage(
                  img,
                  (s.bounds.x - totalBounds.left) * scale,
                  (s.bounds.y - totalBounds.top) * scale,
                  s.bounds.width * scale,
                  s.bounds.height * scale
                )
              }
              stitched = canvas.toDataURL('image/jpeg', 0.8)
            }
          } else {
            stitched = res?.dataURL || null
          }
        } catch (captureErr) {
          console.error('[App] Initial screenshot failure, continuing without vision:', captureErr)
        }

        const aiResponse = await sendMessage(
          text,
          stitched,
          messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          sessionMemory
        )

        stopChips()
        stopTimer()

        if (!aiResponse) {
          setAppState('chat')
          return
        }

        if (aiResponse.message) {
          window.speechSynthesis.cancel()
          const utterance = new SpeechSynthesisUtterance(aiResponse.message)
          // Optional: slightly tune the voice
          utterance.rate = 1.05
          window.speechSynthesis.speak(utterance)
        }

        const agentMsgId = `msg-${Date.now()}-ai`
        const agentMsg: Message = {
          id: agentMsgId,
          role: 'assistant',
          content: aiResponse.message,
          timestamp: new Date(),
          action: aiResponse.action,
          actionStatus: aiResponse.action.type !== 'none' ? 'pending' : undefined
        }

        setMessages((prev) => {
          const next = [...prev, agentMsg]
          if (currentSessionId) {
            setSessions((sPrev) =>
              sPrev.map((s) =>
                s.id === currentSessionId ? { ...s, messages: next, lastActive: new Date() } : s
              )
            )
          }
          return next
        })

        if (aiResponse.action.type !== 'none') {
          const loopHistory = [
            ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
            { role: 'user' as const, content: text },
            { role: 'assistant' as const, content: aiResponse.message }
          ]

          const executeStep = async (action: AIAction, msgId: string): Promise<string> => {
            if (action.type === 'none') return 'No action'
            await window.electronAPI?.setWindowSize('companion')
            setAppState('executing')
            setMessages((prev) => {
              const next = prev.map((m) =>
                m.id === msgId ? { ...m, actionStatus: 'running' as ActionStatus } : m
              )
              if (currentSessionId) {
                setSessions((sPrev) =>
                  sPrev.map((s) => (s.id === currentSessionId ? { ...s, messages: next } : s))
                )
              }
              return next
            })

            let result = ''
            try {
              const output = await executeAction(action, (status) => {
                setMessages((prev) => {
                  const next = prev.map((m) =>
                    m.id === msgId ? { ...m, actionStatus: status as ActionStatus } : m
                  )
                  if (currentSessionId) {
                    setSessions((sPrev) =>
                      sPrev.map((s) => (s.id === currentSessionId ? { ...s, messages: next } : s))
                    )
                  }
                  return next
                })
                if (status === 'done' && action.type === 'open_app') {
                  setActiveApp({ name: action.payload?.name || 'App', openedAt: new Date() })
                }
              })
              result =
                action.type === 'screenshot'
                  ? 'Screenshot captured'
                  : typeof output === 'string'
                    ? output
                    : 'Success'
            } catch (err) {
              result = `Error: ${err instanceof Error ? err.message : String(err)}`
            }
            return result
          }

          await executeStep(aiResponse.action, agentMsgId)
          let current = aiResponse
          let loopCount = 0
          const MAX_LOOPS = 5

          while (current.continue_task && loopCount < MAX_LOOPS) {
            loopCount++
            await new Promise((r) => setTimeout(r, 8000))

            let freshScreenshot: string | null = null
            try {
              const loopRes = (await window.electronAPI?.captureScreen()) as CaptureResult
              if (loopRes && loopRes.screens && loopRes.totalBounds) {
                const lCanvas = document.createElement('canvas')
                const { screens, totalBounds } = loopRes
                const fullW = totalBounds.right - totalBounds.left
                const fullH = totalBounds.bottom - totalBounds.top
                const scale = 1280 / fullW
                lCanvas.width = 1280
                lCanvas.height = fullH * scale
                const lCtx = lCanvas.getContext('2d')
                if (lCtx) {
                  for (const s of screens) {
                    const img = new Image()
                    img.src = s.dataURL
                    await new Promise((resolve) => {
                      img.onload = resolve
                    })
                    lCtx.drawImage(
                      img,
                      (s.bounds.x - totalBounds.left) * scale,
                      (s.bounds.y - totalBounds.top) * scale,
                      s.bounds.width * scale,
                      s.bounds.height * scale
                    )
                  }
                  freshScreenshot = lCanvas.toDataURL('image/jpeg', 0.8)
                }
              } else {
                freshScreenshot = loopRes?.dataURL || null
              }
            } catch (err) {
              console.error('[App] loop screenshot failure:', err)
            }

            const sysContext = freshScreenshot
              ? '(System: Fresh screenshot captured)'
              : '(System: Warning - Vision unavailable)'
            const next = await sendMessage(
              `Task: "${text}". ${sysContext}. RESPONSE MUST BE JSON. IF JS FAILS: Use physical 'click' (e.g. at 600, 400).`,
              freshScreenshot,
              loopHistory,
              sessionMemory
            )
            if (!next) break

            loopHistory.push({
              role: 'assistant' as const,
              content: `${next.message} (Memory Trace: Executing ${next.action.type})`
            })

            let currentMsgId = agentMsgId
            if (next.message !== current.message && next.message.trim() !== '') {
              currentMsgId = `msg-${Date.now()}-ai`
              setMessages((prev) => {
                const nextMsgArr: Message[] = [
                  ...prev,
                  {
                    id: currentMsgId,
                    role: 'assistant' as const,
                    content: next.message,
                    timestamp: new Date(),
                    action: next.action,
                    actionStatus: next.action.type !== 'none' ? 'pending' : undefined
                  }
                ]
                if (currentSessionId) {
                  setSessions((sPrev) =>
                    sPrev.map((s) =>
                      s.id === currentSessionId ? { ...s, messages: nextMsgArr } : s
                    )
                  )
                }
                return nextMsgArr
              })
            }

            if (next.action.type === 'none') break
            const loopResult = await executeStep(next.action, currentMsgId)
            loopHistory.push({
              role: 'user' as const,
              content: `Action Result: ${loopResult}. (Memory Trace: Previous was ${next.action.type}).`
            })
            current = next
          }
          setAppState('companion')
        } else {
          setAppState('chat')
        }
        window.electronAPI?.sendTelegramReply?.(aiResponse.message)
      } catch (err) {
        console.error('[App] handleSubmit catastrophic failure:', err)
        setAppState('chat')
      }
    },
    [
      sendMessage,
      messages,
      sessionMemory,
      startChips,
      startTimer,
      stopChips,
      stopTimer,
      currentSessionId
    ]
  )

  const exitCompanion = useCallback(async (): Promise<void> => {
    await window.electronAPI?.setWindowSize('expanded')
    setActiveApp(null)
    setAppState('chat')
  }, [])

  useEffect(() => {
    if (appState !== 'companion' || !activeApp) return
    const processName = activeApp.name
    const interval = setInterval(async () => {
      try {
        const result = await window.electronAPI?.runCommand(
          `pgrep -x "${processName}" && echo 1 || echo 0`
        )
        if (result?.trim() === '0') exitCompanion()
      } catch {
        /* ignore */
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [appState, activeApp, exitCompanion])

  const handleWakeWord = useCallback((): void => {
    window.electronAPI?.setWindowSize('spotlight')
    setAppState('spotlight')
  }, [])

  const { isListening, toggleListening } = useVoiceInput({
    onTranscript: (text: string): void => setVoiceTranscript(text),
    onWakeWord: handleWakeWord
  })

  // ── Listeners ────────────────────────────────────────────────────────────

  const latestSubmitRef = useRef(handleSubmit)
  useEffect(() => {
    latestSubmitRef.current = handleSubmit
  }, [handleSubmit])

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.onTelegramMessage((text): void => {
      latestSubmitRef.current(text)
    })
    window.electronAPI.onTelegramStop((): void => handleStop())
    window.electronAPI.onWakeShortcut((): void => handleWakeWord())
    window.electronAPI.onTelegramScreenshotRequest(async (): Promise<void> => {
      const res = await window.electronAPI!.captureScreen()
      if (res.dataURL) window.electronAPI!.sendTelegramScreenshot(res.dataURL)
    })
  }, [handleStop, handleWakeWord])

  // ── UI Helpers ───────────────────────────────────────────────────────────

  const handleSplashComplete = useCallback((): void => {
    setAppState('idle')
    setHasSeenSplash(true)
    window.electronAPI?.setWindowSize('expanded')
  }, [])

  const handleLogin = useCallback((newUser: User, log: LoginLog): void => {
    setUser(newUser)
    localStorage.setItem('consciouss_user', JSON.stringify(newUser))
    setLoginLogs((prev) => {
      const updated = [log, ...prev]
      localStorage.setItem('consciouss_login_logs', JSON.stringify(updated))
      return updated
    })
  }, [])

  const handleLogout = useCallback((): void => {
    setUser(null)
    localStorage.removeItem('consciouss_user')
  }, [])

  const handleSkipLogin = useCallback((): void => {
    setHasSkippedLogin(true)
    localStorage.setItem('consciouss_skipped_login', 'true')
  }, [])

  useEffect(() => {
    startCapture()
  }, [startCapture])

  useEffect(() => {
    const handler = (): void => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    if (appState === 'idle' || appState === 'chat' || appState === 'working') {
      window.electronAPI?.setWindowSize('expanded')
    }
  }, [appState])

  useEffect(() => {
    return () => {
      stopChips()
      stopTimer()
    }
  }, [stopChips, stopTimer])

  const inChat =
    appState === 'chat' ||
    appState === 'working' ||
    appState === 'executing' ||
    appState === 'companion'
  const isWorking = appState === 'working' || appState === 'executing'

  const getPlaceholder = (): string => {
    if (appState === 'working') return 'Processing...'
    if (appState === 'executing') return 'Executing...'
    if (isListening) return 'Listening...'
    if (isCompanion) return 'Ask anything...'
    return 'Ask Consciouss anything...'
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'transparent',
        display: 'flex',
        alignItems: appState === 'spotlight' ? 'center' : 'stretch',
        justifyContent: 'center',
        padding: appState === 'spotlight' ? 0 : isCompanion ? 8 : 12,
        gap: isCompanion ? 8 : 12,
        overflow: 'hidden',
        position: 'relative',
        fontFamily: '-apple-system, SF Pro Display, BlinkMacSystemFont, sans-serif'
      }}
    >
      <style>{`
        body { background: transparent !important; margin: 0; overflow: hidden; height: 100vh; width: 100vw; }
      `}</style>

      <SplashScreen onComplete={handleSplashComplete} />

      <SpotlightBar
        isVisible={appState === 'spotlight'}
        isListening={isListening}
        onSubmit={(text): void => {
          window.electronAPI?.setWindowSize('expanded')
          setTimeout(() => {
            setAppState('idle')
            handleSubmit(text)
          }, 300)
        }}
        onDismiss={async (): Promise<void> => {
          await window.electronAPI?.setWindowSize('expanded')
          setAppState(messages.length > 0 ? 'chat' : 'idle')
        }}
      />

      <AnimatePresence>
        {appState !== 'spotlight' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'flex',
              flex: 1,
              height: '100%',
              gap: isCompanion ? 8 : 20,
              width: '100%',
              alignItems: 'stretch'
            }}
          >
            {!isCompanion && (
              <Sidebar
                isCollapsed={isSidebarCollapsed}
                onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                onNewChat={handleNewChat}
                sessions={sessions}
                activeSessionId={currentSessionId || undefined}
                onSelectSession={handleSelectSession}
                onDeleteSession={handleDeleteSession}
                onClearAll={handleClearAllSessions}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                user={user}
                onLogout={handleLogout}
              />
            )}

            <GlassContainer
              intensity="high"
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                position: 'relative',
                minWidth: 0,
                zIndex: 2,
                border: `1px solid ${isStreaming ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.03)'}`,
                transition: 'border-color 0.5s ease',
                borderRadius: isCompanion ? 16 : 32
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 24px',
                  flexShrink: 0,
                  zIndex: 100,
                  pointerEvents: 'none'
                }}
              >


                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 16, pointerEvents: 'auto' }}
                >

                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  position: 'relative',
                  overflow: 'hidden',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <AnimatePresence mode="wait">
                  {inChat ? (
                    <motion.div
                      key="chat"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      style={{
                        height: '100%',
                        width: '100%',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <ChatPanel
                        messages={messages}
                        isStreaming={isStreaming}
                        streamingText={streamingText}
                        activeApp={activeApp}
                        isCompact={isCompanion}
                      />
                    </motion.div>
                  ) : activeTab === 'logs' ? (
                    <motion.div
                      key="logs"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}
                    >
                      <LoginLogsView logs={loginLogs} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <HomeView
                        onSubmit={handleSubmit}
                        isListening={isListening}
                        toggleListening={toggleListening}
                        isWorking={isWorking}
                        voiceTranscript={voiceTranscript}
                        onNewChat={handleNewChat}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {aiError && (
                <div
                  style={{
                    margin: '0 40px 20px',
                    padding: '12px 20px',
                    background: 'rgba(232,25,44,0.05)',
                    borderRadius: 12,
                    fontSize: 13,
                    color: '#fca5a5',
                    border: '1px solid rgba(232,25,44,0.1)'
                  }}
                >
                  {aiError}
                </div>
              )}

              <AnimatePresence>
                {inChat && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    style={{
                      padding: isCompanion ? '0 10px 10px' : '0 32px 32px',
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: isCompanion ? 6 : 12
                    }}
                  >
                    <ControlStrip
                      isWorking={isWorking}
                      timeRemaining={workingTimer}
                      onStop={handleStop}
                      onPause={() => { }}
                      isCompact={isCompanion}
                    />
                    <CommandBar
                      onSubmit={handleSubmit}
                      onMicClick={toggleListening}
                      isListening={isListening}
                      isWorking={isWorking}
                      voiceTranscript={voiceTranscript}
                      onNewChat={handleNewChat}
                      placeholder={getPlaceholder()}
                      isCompact={isCompanion}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassContainer>
          </motion.div>
        )}
      </AnimatePresence>

      {hasSeenSplash && !user && !hasSkippedLogin && (
        <LoginView onLogin={handleLogin} onSkip={handleSkipLogin} />
      )}
    </div>
  )
}

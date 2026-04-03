import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import { AppState, Message, ChatSession, User } from './types'

import SplashScreen from './components/SplashScreen'
import ChatPanel from './components/ChatPanel'
import Sidebar from './components/Sidebar'
import GlassContainer from './components/GlassContainer'
import ControlStrip from './components/ControlStrip'
import SpotlightBar from './components/SpotlightBar'
import CommandBar from './components/CommandBar'
import SovereignHUD from './components/SovereignHUD'

import { useOpenRouter } from './hooks/useOpenRouter'
import { useScreenCapture } from './hooks/useScreenCapture'
import { useVoiceInput } from './hooks/useVoiceInput'
import { useAttention } from './hooks/useAttention'
import { SovereignOrchestrator } from './lib/orchestrator'
import { AGENT_ROLES } from './lib/prompts'

export default function App(): ReactElement {
  const [appState, setAppState] = useState<AppState>('splash')
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [workingTimer, setWorkingTimer] = useState(60)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [activeTab, setActiveTab] = useState<'chats' | 'workflows' | 'logs' | 'telegram' | 'lab'>('chats')

  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('consciouss_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  
  const [hasSkippedLogin] = useState(
    () => localStorage.getItem('consciouss_skipped_login') === 'true'
  )

  const isCompanion = windowWidth <= 420
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { sendMessage, isStreaming, streamingText } = useOpenRouter()
  const { startCapture } = useScreenCapture()
  const { focusElement } = useAttention()

  const isHud = window.location.hash === '#hud'

  useEffect(() => {
    if (!isHud && focusElement) {
      window.electronAPI.attentionFocus(focusElement)
    }
  }, [focusElement, isHud])

  // --- Sovereign Research Agent (Proactive Phase 1) ---
  const isResearchingRef = useRef(false)
  useEffect(() => {
    if (isHud || !focusElement || isResearchingRef.current) return
    const title = (focusElement.title || '').toLowerCase()
    const desc = (focusElement.description || '').toLowerCase()
    if (title.includes('error') || title.includes('exception') || desc.includes('error')) {
      isResearchingRef.current = true
      sendMessage(
        `Implicit intent: Help me with this error: "${focusElement.title}"`,
        null,
        [],
        null,
        null,
        { silent: true }
      ).then((res) => {
        if (res) {
          window.electronAPI.attentionFocus({ ...focusElement, title: `Insight: ${res.message.slice(0, 50)}...` })
        }
        isResearchingRef.current = false
      })
    }
  }, [focusElement, isHud, sendMessage])

  useEffect(() => {
    window.electronAPI?.readChats?.().then((data: ChatSession[]) => {
      if (data && data.length > 0) {
        setSessions(data)
        setCurrentSessionId(data[0].id)
        setMessages(data[0].messages)
      } else {
        handleNewChat()
      }
      setAppState('idle')
    })
  }, [])

  const handleNewChat = useCallback(() => {
    const newId = `session-${crypto.randomUUID()}`
    const newSession: ChatSession = { id: newId, title: 'New Chat', messages: [], lastActive: new Date() }
    setSessions(prev => [newSession, ...prev])
    setCurrentSessionId(newId)
    setMessages([])
    setAppState('idle')
  }, [])

  const handleSelectSession = useCallback((id: string) => {
    const s = sessions.find(x => x.id === id)
    if (s) {
      setCurrentSessionId(id)
      setMessages(s.messages)
      setAppState(s.messages.length > 0 ? 'chat' : 'idle')
    }
  }, [sessions])

  const handleDeleteSession = useCallback((id: string) => {
    const updated = sessions.filter(s => s.id !== id)
    setSessions(updated)
    window.electronAPI?.writeChats?.(updated)
  }, [sessions])

  const handleClearAllSessions = useCallback(() => {
    setSessions([])
    window.electronAPI?.writeChats?.([])
    handleNewChat()
  }, [handleNewChat])

  const handleSubmit = useCallback(async (text: string, source: 'ui' | 'telegram' = 'ui') => {
    setVoiceTranscript('')
    const timestamp = new Date()
    const newUserMsg: Message = { id: `msg-${Date.now()}`, role: 'user', content: text, timestamp }

    setMessages(prev => {
      const next = [...prev, newUserMsg]
      if (currentSessionId) {
        setSessions(sPrev => sPrev.map(s => s.id === currentSessionId ? { ...s, messages: next, lastActive: timestamp } : s))
      }
      return next
    })

    setAppState('working')
    setWorkingTimer(60)
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => setWorkingTimer(t => (t > 0 ? t - 1 : 0)), 1000)

    try {
      const orchestrator = new SovereignOrchestrator(
        text,
        [...messages, newUserMsg],
        sendMessage,
        (state, aiResponse) => {
          setAppState(state.activeAgent === AGENT_ROLES.SUPERVISOR ? 'working' : 'executing')
          if (aiResponse) {
            const agentMsg: Message = {
              id: `msg-${Date.now()}-${state.activeAgent}`,
              role: 'assistant',
              content: aiResponse.message,
              timestamp: new Date(),
              action: aiResponse.action,
              agent: state.activeAgent,
              actionStatus: aiResponse.action.type !== 'none' ? 'done' : undefined
            }
            setMessages(prev => {
              const next = [...prev, agentMsg]
              if (currentSessionId) {
                setSessions(sPrev => sPrev.map(s => s.id === currentSessionId ? { ...s, messages: next, lastActive: new Date() } : s))
              }
              return next
            })
            if (source === 'telegram') window.electronAPI?.sendTelegramReply?.(`[${state.activeAgent}] ${aiResponse.message}`)
          }
          if (!state.isWorking) {
            setAppState('chat')
            if (countdownRef.current) clearInterval(countdownRef.current)
          }
        }
      )
      await orchestrator.start()
    } catch (err) {
      console.error('[App] Sovereign failure:', err)
      setAppState('chat')
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [messages, currentSessionId, sendMessage])

  const handleWakeWord = useCallback(() => {
    window.electronAPI?.setWindowSize('spotlight')
    setAppState('spotlight')
  }, [])

  const { isListening, toggleListening } = useVoiceInput({
    onTranscript: setVoiceTranscript,
    onWakeWord: handleWakeWord
  })

  useEffect(() => {
    if (!window.electronAPI) return
    window.electronAPI.onTelegramMessage(t => handleSubmit(t, 'telegram'))
    window.electronAPI.onWakeShortcut(() => handleWakeWord())
  }, [handleSubmit, handleWakeWord])

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

  const handleSplashComplete = useCallback(() => {
    setAppState('idle')
    window.electronAPI?.setWindowSize('expanded')
  }, [])

  useEffect(() => {
    if (appState !== 'splash' && (user || hasSkippedLogin)) {
      startCapture()
    }
  }, [startCapture, appState, user, hasSkippedLogin])

  if (isHud) return <SovereignHUD />

  const isWorking = appState === 'working' || appState === 'executing'

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'transparent', display: 'flex', overflow: 'hidden' }}>
      <SplashScreen onComplete={handleSplashComplete} />
      <SpotlightBar isVisible={appState === 'spotlight'} isListening={isListening} onSubmit={t => { window.electronAPI?.setWindowSize('expanded'); handleSubmit(t) }} onDismiss={() => setAppState('chat')} />
      
      {!isCompanion && (
        <Sidebar 
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          sessions={sessions} 
          activeSessionId={currentSessionId || undefined} 
          onSelectSession={handleSelectSession} 
          onDeleteSession={handleDeleteSession} 
          onNewChat={handleNewChat} 
          onClearAll={handleClearAllSessions} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          user={user} 
          onLogout={() => setUser(null)} 
        />
      )}

      <GlassContainer style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 32, margin: 12, overflow: 'hidden', position: 'relative' }}>
        <ChatPanel 
          messages={messages} 
          isStreaming={isStreaming} 
          streamingText={streamingText}
          activeApp={null}
          isCompact={isCompanion}
        />
        
        <div style={{ padding: isCompanion ? '0 12px 12px' : '0 40px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <CommandBar 
            onSubmit={handleSubmit}
            onMicClick={toggleListening}
            isListening={isListening}
            isWorking={isWorking}
            voiceTranscript={voiceTranscript}
            onNewChat={handleNewChat}
            isCompact={isCompanion}
          />

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ControlStrip 
              isWorking={isWorking} 
              timeRemaining={workingTimer}
              onStop={() => setAppState('chat')} 
              onPause={() => {}}
              isCompact={isCompanion}
            />
          </div>
        </div>
      </GlassContainer>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Loader2
} from 'lucide-react'

interface TelegramConfig {
  token: string
  chatId: string
  enabled: boolean
}

interface TelegramStatus {
  isActive: boolean
  botName: string | null
  isDiscoveryActive?: boolean
}

export default function TelegramView(): React.ReactElement {
  const [config, setConfig] = useState<TelegramConfig>({ token: '', chatId: '', enabled: false })
  const [status, setStatus] = useState<TelegramStatus>({ isActive: false, botName: null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [showToken] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [setupMode, setSetupMode] = useState<'manual' | 'auto'>('auto')

  useEffect(() => {
    console.log('[TelegramView] Checking for API...', typeof window.electronAPI?.getTelegramConfig === 'function')
    
    const checkAPI = () => {
      const api = (window as any).electronAPI
      if (api && typeof api.getTelegramConfig === 'function') {
        setLoading(true)
        loadData()
        return true
      }
      return false
    }

    if (!checkAPI()) {
      const poll = setInterval(() => {
        if (checkAPI()) clearInterval(poll)
      }, 500)
      return () => clearInterval(poll)
    }

    const interval = setInterval(updateStatus, 5000)
    
    // Listen for discovery success
    window.electronAPI?.onTelegramDiscovered?.((data) => {
      setConfig(prev => ({ ...prev, chatId: data.chatId, enabled: true }))
      setIsDiscovering(false)
      updateStatus()
    })

    return () => {
      clearInterval(interval)
      // Cleanup if needed
    }
  }, [])

  const loadData = async () => {
    if (typeof window.electronAPI?.getTelegramConfig !== 'function') {
      setLoading(false)
      return
    }
    try {
      const savedConfig = await window.electronAPI.getTelegramConfig()
      setConfig(savedConfig)
      await updateStatus()
    } catch (err) {
      console.error('Failed to load Telegram config:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async () => {
    if (typeof window.electronAPI?.getTelegramStatus !== 'function') return
    try {
      const currentStatus = await window.electronAPI.getTelegramStatus()
      setStatus(currentStatus)
      if (currentStatus.isDiscoveryActive) setIsDiscovering(true)
    } catch (err) {
      console.error('Failed to get Telegram status:', err)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const result = await window.electronAPI.updateTelegramConfig(config)
      if (result.success) {
        await updateStatus()
      } else {
        setError(result.error || 'Failed to save configuration')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  const startDiscovery = async () => {
    if (!config.token) {
      setError('Please enter a Bot Token first')
      return
    }
    
    setSaving(true)
    try {
      // First save the token so the bot can start
      await window.electronAPI.updateTelegramConfig({ ...config, enabled: true })
      const result = await window.electronAPI.startTelegramDiscovery()
      if (result.success) {
        setIsDiscovering(true)
        setError(null)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  if (loading && typeof window.electronAPI?.getTelegramConfig === 'function') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(255,255,255,0.4)' }}>
        <Loader2 className="animate-spin" size={24} />
      </div>
    )
  }

  if (typeof window.electronAPI?.getTelegramConfig !== 'function') {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%', 
        padding: '40px',
        textAlign: 'center',
        gap: '20px'
      }}>
        <div>
          <h2 style={{ color: 'white', fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0' }}>Restart Required</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', maxWidth: '400px', lineHeight: 1.5 }}>
            The Telegram service hasn't been initialized yet. This usually happens after a code update. Please close and run <code style={{ color: 'white', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>npm run dev</code>.
          </p>
          <div style={{ marginTop: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
            Debug: {window.electronAPI ? `API Found (${Object.keys(window.electronAPI).length} methods)` : 'window.electronAPI is undefined'}
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()}
          style={{
            background: 'white',
            color: 'black',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '12px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Check Again
        </button>
      </div>
    )
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      padding: '40px',
      overflowY: 'auto',
      gap: '32px',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      {/* Header Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <h1 style={{ color: 'white', fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.03em' }}>Telegram Connect</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', marginTop: '4px' }}>
              Link your personal Telegram bot for remote access and notifications.
            </p>
          </div>
        </div>
        
        <StatusIndicator isActive={status.isActive} />
      </div>

      {/* Mode Switcher */}
      <div style={{ 
        display: 'flex', 
        background: 'rgba(255,255,255,0.03)', 
        padding: '4px', 
        borderRadius: '14px',
        width: 'fit-content',
        position: 'relative',
        border: '1px solid rgba(255,255,255,0.04)'
      }}>
        <button 
          onClick={() => setSetupMode('auto')}
          style={{ 
            padding: '10px 24px', 
            borderRadius: '10px', 
            border: 'none', 
            background: 'transparent',
            color: setupMode === 'auto' ? 'white' : 'rgba(255,255,255,0.4)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            position: 'relative',
            zIndex: 1,
            transition: 'color 0.2s ease',
            outline: 'none'
          }}
        >
          {setupMode === 'auto' && (
            <motion.div
              layoutId="activeTab"
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '10px',
                zIndex: -1
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          Guided Setup
        </button>
        <button 
          onClick={() => setSetupMode('manual')}
          style={{ 
            padding: '10px 24px', 
            borderRadius: '10px', 
            border: 'none', 
            background: 'transparent',
            color: setupMode === 'manual' ? 'white' : 'rgba(255,255,255,0.4)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            position: 'relative',
            zIndex: 1,
            transition: 'color 0.2s ease',
            outline: 'none'
          }}
        >
          {setupMode === 'manual' && (
            <motion.div
              layoutId="activeTab"
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '10px',
                zIndex: -1
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          Manual Config
        </button>
      </div>

      <div style={{ position: 'relative', minHeight: '600px' }}>
        <AnimatePresence mode="wait">
          {setupMode === 'auto' ? (
            <motion.div 
              key="auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', position: 'absolute', inset: 0 }}
            >
            {/* Step-by-Step Wizard */}
            <div style={{ 
              background: 'rgba(255,255,255,0.03)', 
              borderRadius: '24px', 
              padding: '32px', 
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '28px'
            }}>
              <AutoStep 
                number={1} 
                title="Create your Personal Bot" 
                text="Message @BotFather on Telegram and send /newbot to create a new bot instantly."
                action={
                  <button 
                    onClick={() => window.open('https://t.me/BotFather?start=newbot')}
                    style={{
                      background: 'rgba(0, 136, 204, 0.1)',
                      color: '#0088CC',
                      border: '1px solid rgba(0, 136, 204, 0.2)',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '12px'
                    }}
                  >
                    Open @BotFather
                  </button>
                }
              />

              <AutoStep 
                number={2} 
                title="Secure your Bot Token" 
                text="Paste the API token you received from BotFather below."
                content={
                  <div style={{ position: 'relative', marginTop: '12px' }}>
                    <input 
                      type={showToken ? 'text' : 'password'}
                      value={config.token}
                      onChange={(e) => setConfig({ ...config, token: e.target.value })}
                      placeholder="e.g. 8216079761:AAEB7AnHo..."
                      style={{
                        width: '100%',
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '12px 40px 12px 14px',
                        color: 'white',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                      {showToken ? 'Hide' : 'Show'}
                  </div>
                }
              />

              <AutoStep 
                number={3} 
                title="Magic Link" 
                text="Click detect and send any message to your bot. We'll automatically identify your ID."
                status={isDiscovering ? 'active' : config.chatId ? 'connected' : 'idle'}
                action={
                  <button 
                    onClick={startDiscovery}
                    disabled={isDiscovering || saving}
                    style={{
                      background: config.chatId ? 'rgba(74, 222, 128, 0.1)' : 'white',
                      color: config.chatId ? '#4ade80' : 'black',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '12px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {isDiscovering ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Waiting for message...
                      </>
                    ) : config.chatId ? (
                      <>
                         Successfully Linked
                      </>
                    ) : (
                      <>
                        Auto-Detect My ID
                      </>
                    )}
                  </button>
                }
              />
              
              {error && (
                <div style={{ color: '#f87171', fontSize: '13px', padding: '12px', background: 'rgba(248, 113, 113, 0.05)', borderRadius: '10px', border: '1px solid rgba(248, 113, 113, 0.1)' }}>
                  {error}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ 
                background: 'rgba(255,255,255,0.02)', 
                borderRadius: '24px', 
                padding: '24px', 
                border: '1px solid rgba(255,255,255,0.04)',
                textAlign: 'center'
              }}>
                <h3 style={{ color: 'white', fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0' }}>Safe & Private</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                  We use your unique Chat ID to ensure that ONLY YOU can send instructions to this AI instance.
                </p>
              </div>

              <div style={{ 
                background: 'rgba(255,255,255,0.02)', 
                borderRadius: '24px', 
                padding: '24px', 
                border: '1px solid rgba(255,255,255,0.04)'
              }}>
                <h3 style={{ color: 'white', fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Need help?
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                  If auto-detection doesn't work, ensure you've started your bot first by clicking the link in Step 1.
                </p>
              </div>
            </div>
          </motion.div>
          ) : (
            <motion.div 
              key="manual"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', position: 'absolute', inset: 0 }}
            >
              <div style={{ 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: '24px', 
                padding: '32px', 
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Bot Token</label>
              <input 
                type="password"
                value={config.token}
                onChange={(e) => setConfig({ ...config, token: e.target.value })}
                placeholder="Paste token here..."
                style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 14px', color: 'white', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Authorized Chat ID</label>
              <input 
                type="text"
                value={config.chatId}
                onChange={(e) => setConfig({ ...config, chatId: e.target.value })}
                placeholder="Paste Chat ID here..."
                style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 14px', color: 'white', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  background: config.enabled ? 'linear-gradient(135deg, #FF54B0 0%, #FF4B33 100%)' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative'
                }}
              >
                <div style={{ position: 'absolute', top: '2px', left: config.enabled ? '22px' : '2px', width: '20px', height: '20px', borderRadius: '10px', background: 'white', transition: '0.2s' }} />
              </button>
              <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>Enable Bot Connection</span>
            </div>
            <button 
              onClick={handleSave}
              disabled={saving}
              style={{
                height: '44px',
                borderRadius: '12px',
                background: 'white',
                color: 'black',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>

              {/* Empty placeholder to maintain grid on the right if needed, or keep same cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  borderRadius: '24px', 
                  padding: '24px', 
                  border: '1px solid rgba(255,255,255,0.04)',
                  textAlign: 'center'
                }}>
                  <h3 style={{ color: 'white', fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0' }}>Manual Override</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                    Use this mode if you already have your Chat ID or want to configure the bot manually.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Commands Reference */}
      <div style={{ marginTop: '12px' }}>
        <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Available Cloud Commands</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <CommandCard cmd="/start" desc="Check connection." />
          <CommandCard cmd="/screenshot" desc="Get live view." />
          <CommandCard cmd="/stop" desc="Kill current task." />
        </div>
      </div>
    </div>
  )
}

function StatusIndicator({ isActive }: { isActive: boolean }) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '10px', 
      background: isActive ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
      padding: '8px 16px',
      borderRadius: '20px',
      border: `1px solid ${isActive ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`
    }}>
      <div style={{ 
        width: '8px', 
        height: '8px', 
        borderRadius: '50%', 
        background: isActive ? '#4ade80' : '#f87171',
        boxShadow: isActive ? '0 0 10px #4ade80' : 'none'
      }} />
      <span style={{ color: isActive ? '#4ade80' : '#f87171', fontSize: '13px', fontWeight: 700 }}>
        {isActive ? 'CONNECTED' : 'OFFLINE'}
      </span>
    </div>
  )
}

function AutoStep({ number, title, text, action, content, status }: { 
  number: number, 
  title: string, 
  text: string, 
  action?: React.ReactNode,
  content?: React.ReactNode,
  status?: 'idle' | 'active' | 'connected'
}) {
  return (
    <div style={{ display: 'flex', gap: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ 
          width: '32px', 
          height: '32px', 
          borderRadius: '16px', 
          background: status === 'connected' ? '#4ade80' : 'rgba(255,255,255,0.05)', 
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          color: status === 'connected' ? 'black' : 'white',
          fontWeight: 700,
          flexShrink: 0,
          zIndex: 1
        }}>
          {status === 'connected' ? '✓' : number}
        </div>
        {number < 3 && <div style={{ flex: 1, width: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />}
      </div>
      <div style={{ flex: 1, paddingBottom: number < 3 ? '12px' : 0 }}>
        <div style={{ color: 'white', fontSize: '16px', fontWeight: 600 }}>{title}</div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '4px 0 0 0', lineHeight: 1.4 }}>{text}</p>
        {content}
        {action}
      </div>
    </div>
  )
}

function CommandCard({ cmd, desc }: { cmd: string, desc: string }) {
  return (
    <div style={{ 
      padding: '16px', 
      background: 'rgba(255,255,255,0.02)', 
      borderRadius: '16px', 
      border: '1px solid rgba(255,255,255,0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 600 }}>
        <code>{cmd}</code>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0 }}>{desc}</p>
    </div>
  )
}

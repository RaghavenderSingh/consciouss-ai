import { useRef, useState, useEffect } from 'react'
import { Plus, Mic, ArrowUpRight } from 'lucide-react'
import LogoIcon from './LogoIcon'
import OrbShader from './OrbShader'

interface Props {
  onSubmit: (text: string) => void
  onMicClick: () => void
  isListening: boolean
  isWorking: boolean
  voiceTranscript?: string
  placeholder?: string
  isCompact?: boolean
  onNewChat?: () => void
}

export default function CommandBar({
  onSubmit,
  onMicClick,
  isListening,
  isWorking,
  voiceTranscript,
  placeholder,
  isCompact,
  onNewChat
}: Props): React.ReactElement {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (voiceTranscript) {
      onSubmit(voiceTranscript.trim())
      // eslint-disable-next-line
      setValue('')
      if (isListening) {
        onMicClick()
      }
    }
  }, [voiceTranscript, onSubmit, isListening, onMicClick])

  const handleSubmit = (): void => {
    if (!value.trim() || isWorking) return
    onSubmit(value.trim())
    setValue('')
  }

  const defaultPlaceholder =
    placeholder ?? (isWorking ? 'Neural Core Processing...' : 'Ask Consciouss anything...')

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isCompact ? 8 : 16,
        width: '100%',
        maxWidth: 720,
        margin: isCompact ? '0 auto' : '32px auto 0 auto',
        position: 'relative',
        zIndex: 10
      }}
    >
      {/* Left Logo Icon — hidden in compact mode */}
      {!isCompact && (
        <div
          onClick={onMicClick}
          style={{
            flexShrink: 0,
            width: 52,
            height: 52,
            borderRadius: 14,
            background: isListening ? 'transparent' : 'linear-gradient(135deg, #FF54B0 0%, #FF4B33 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'none',
            cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden'
          }}
        >
          {isListening || isWorking ? (
            <div style={{ transform: 'scale(1.2)' }}>
              <OrbShader isListening={isListening} isWorking={isWorking} size={64} />
            </div>
          ) : (
            <LogoIcon size={32} />
          )}
        </div>
      )}

      {/* Main Input Container */}
      <div
        style={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(18, 18, 18, 0.85)',
          backdropFilter: 'blur(30px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(30px) saturate(1.8)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: isCompact ? 14 : 20,
          padding: isCompact ? '4px 6px 4px 14px' : '6px 8px 6px 20px',
          boxShadow: 'none',
          opacity: isWorking ? 0.7 : 1,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
          placeholder={defaultPlaceholder}
          disabled={isWorking}
          style={{
            flexGrow: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'white',
            fontSize: isCompact ? 14 : 17,
            fontWeight: 500,
            padding: isCompact ? '8px 0' : '10px 0',
            letterSpacing: '-0.01em'
          }}
        />

        {/* Action Buttons Group */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '4px 6px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.04)',
            marginRight: 8
          }}
        >
          <button
            onClick={onNewChat}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.3)',
              padding: 6,
              cursor: onNewChat ? 'pointer' : 'default',
              display: 'flex'
            }}
          >
            <Plus size={16} />
          </button>

          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.06)' }} />

          <button
            onClick={onMicClick}
            style={{
              background: 'transparent',
              border: 'none',
              color: isListening ? '#ef4444' : 'rgba(255,255,255,0.3)',
              padding: 6,
              cursor: 'pointer',
              display: 'flex'
            }}
          >
            <Mic size={16} className={isListening ? 'animate-pulse' : ''} />
          </button>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isWorking}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background:
              !value.trim() || isWorking
                ? 'rgba(255,255,255,0.03)'
                : 'linear-gradient(135deg, #FF54B0 0%, #FF4B33 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            color: !value.trim() || isWorking ? 'rgba(255,255,255,0.1)' : 'white',
            cursor: !value.trim() || isWorking ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
        >
          <ArrowUpRight size={22} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}

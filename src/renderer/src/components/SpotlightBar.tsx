import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LogoIcon from './LogoIcon'

interface Props {
  isVisible: boolean
  isListening: boolean
  onSubmit: (text: string) => void
  onDismiss: () => void
}

export default function SpotlightBar({ isVisible, isListening, onSubmit, onDismiss }: Props) {
  const [value, setValue] = useState('')
  const [bars, setBars] = useState<number[]>([0.15, 0.3, 0.5, 0.35, 0.2, 0.4, 0.25])
  const inputRef = useRef<HTMLInputElement>(null)
  const animRef = useRef<number | undefined>(undefined)
  const streamRef = useRef<MediaStream | null>(null)

  // Real mic frequency visualizer
  useEffect(() => {
    if (!isVisible || !isListening) {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      setBars([0.15, 0.3, 0.5, 0.35, 0.2, 0.4, 0.25])
      return
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
        streamRef.current = stream
        const ctx = new AudioContext()
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 32
        analyser.smoothingTimeConstant = 0.8
        source.connect(analyser)

        const data = new Uint8Array(analyser.frequencyBinCount)

        const tick = () => {
          analyser.getByteFrequencyData(data)
          const newBars = Array.from({ length: 7 }, (_, i) => {
            const val = data[Math.floor((i * data.length) / 7)]
            return Math.max(0.08, val / 255)
          })
          setBars(newBars)
          animRef.current = requestAnimationFrame(tick)
        }
        tick()
      })
      .catch(() => {
        // Permission denied — animated fallback
        let t = 0
        const fakeTick = () => {
          t += 0.08
          setBars(Array.from({ length: 7 }, (_, i) => 0.15 + 0.3 * Math.abs(Math.sin(t + i * 0.7))))
          animRef.current = requestAnimationFrame(fakeTick)
        }
        fakeTick()
      })

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [isVisible, isListening])

  // Focus on show, clear on hide
  useEffect(() => {
    if (isVisible) {
      setTimeout(() => inputRef.current?.focus(), 150)
    } else {
      setValue('')
    }
  }, [isVisible])

  // Escape to dismiss
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) onDismiss()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isVisible, onDismiss])

  const handleSubmit = useCallback(() => {
    if (!value.trim()) return
    onSubmit(value.trim())
    setValue('')
    onDismiss()
  }, [value, onSubmit, onDismiss])

  const showBars = isListening && !value
  const BAR_HEIGHTS = [28, 36, 44, 36, 28, 40, 32]

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -8, opacity: 0, scale: 0.99 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -12, opacity: 0, scale: 0.96, filter: 'blur(10px)' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30, opacity: { duration: 0.2 } }}
          style={{
            width: '100%',
            maxWidth: 600,
            zIndex: 9999,
            position: 'relative'
          }}
        >
          {/* External Bloom / Glow */}
          <div
            style={{
              position: 'absolute',
              inset: -20,
              background: 'radial-gradient(circle, rgba(232,25,44,0.08) 0%, transparent 70%)',
              filter: 'blur(30px)',
              zIndex: -1,
              pointerEvents: 'none'
            }}
          />

          {/* Main pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '0 16px 0 24px',
              height: 80,
              background: 'rgba(10, 10, 12, 0.92)',
              backdropFilter: 'blur(50px) saturate(2.2)',
              WebkitBackdropFilter: 'blur(50px) saturate(2.2)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 999,
              boxShadow: `
                0 32px 100px rgba(0,0,0,0.7),
                0 0 0 0.5px rgba(255,255,255,0.06),
                inset 0 1px 0 rgba(255,255,255,0.08)
              `
            }}
          >
            {/* Logo / mic indicator */}
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: isListening ? 'rgba(232,25,44,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${isListening ? 'rgba(232,25,44,0.4)' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isListening ? '0 0 20px rgba(232,25,44,0.3)' : 'none'
              }}
            >
              {isListening ? (
                <svg width="18" height="20" viewBox="0 0 14 16" fill="none">
                  <rect
                    x="4.5"
                    y="0.5"
                    width="5"
                    height="9"
                    rx="2.5"
                    stroke="#FF54B0"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M1 8C1 11.31 3.69 14 7 14C10.31 14 13 11.31 13 8"
                    stroke="#FF54B0"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <LogoIcon size={24} />
              )}
            </div>

            {/* Waveform bars — only when listening and no text */}
            <AnimatePresence>
              {showBars && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 72 }}
                  exit={{ opacity: 0, width: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    height: 48,
                    overflow: 'hidden',
                    flexShrink: 0
                  }}
                >
                  {bars.map((h, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: `${Math.round(h * BAR_HEIGHTS[i])}px` }}
                      transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                      style={{
                        width: 4,
                        borderRadius: 3,
                        background: '#FF54B0',
                        opacity: 0.6 + h * 0.4,
                        minHeight: 4,
                        boxShadow: '0 0 10px rgba(232,25,44,0.2)'
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Text input */}
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={isListening && !value ? 'Listening...' : 'What do you need?'}
              style={{
                flex: 1,
                fontSize: 24,
                fontWeight: 400,
                color: 'white',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                caretColor: '#FF54B0',
                letterSpacing: '-0.025em',
                minWidth: 0,
                fontFamily: '-apple-system, SF Pro Display, BlinkMacSystemFont, sans-serif'
              }}
            />

            {/* Submit button — springs in when there's text */}
            <AnimatePresence>
              {value.trim() && (
                <motion.button
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 24 }}
                  onClick={handleSubmit}
                  whileTap={{ scale: 0.94 }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FF54B0 0%, #FF4B33 100%)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 8px 24px rgba(232,25,44,0.3)'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 13V3M3 8l5-5 5 5"
                      stroke="white"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Hint text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              textAlign: 'center',
              marginTop: 18,
              fontSize: 12,
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 600
            }}
          >
            Esc to dismiss · Enter to send
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

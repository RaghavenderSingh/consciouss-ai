import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  isWorking: boolean
  timeRemaining: number
  onStop: () => void
  onPause: () => void
  isCompact?: boolean
}

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}s`
}

export default function ControlStrip({
  isWorking,
  timeRemaining,
  onStop,
  onPause,
  isCompact
}: Props) {
  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(28,28,30,0.85)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        borderRadius: 999,
        padding: '8px 16px',
        border: '1px solid rgba(255,255,255,0.1)',
        userSelect: 'none'
      }}
    >
      {/* Working state extras */}
      <AnimatePresence>
        {isWorking && (
          <motion.div
            key="working"
            initial={{ opacity: 0, width: 0, marginRight: 0 }}
            animate={{ opacity: 1, width: 'auto', marginRight: 4 }}
            exit={{ opacity: 0, width: 0, marginRight: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}
          >
            {/* Pulsing red dot */}
            <motion.div
              animate={{ scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#FF54B0',
                flexShrink: 0
              }}
            />
            <span
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 500,
                whiteSpace: 'nowrap'
              }}
            >
              Working
            </span>
            {/* Amber shimmer bar */}
            <div
              style={{
                width: 72,
                height: 3,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                overflow: 'hidden',
                flexShrink: 0
              }}
            >
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: '55%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)',
                  borderRadius: 999
                }}
              />
            </div>
            {/* Timer */}
            <span
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.4)',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap'
              }}
            >
              {formatTime(timeRemaining)}
            </span>
            <div
              style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model selector — hidden in compact */}
      {!isCompact && (
        <motion.div
          whileHover={{ background: 'rgba(255,255,255,0.07)' }}
          whileTap={{ scale: 0.95 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '4px 10px',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.18)',
            cursor: 'pointer'
          }}
        >
          <span style={{ color: 'white', fontSize: 12, fontWeight: 600, letterSpacing: '0.02em' }}>
            G1
          </span>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path
              d="M1.5 3L4.5 6L7.5 3"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      )}

      {/* Stop */}
      <motion.button
        onClick={onStop}
        whileHover={{ background: 'rgba(255,255,255,0.08)' }}
        whileTap={{ scale: 0.9 }}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Stop"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <rect x="2" y="2" width="6" height="6" rx="1" fill="rgba(255,255,255,0.7)" />
        </svg>
      </motion.button>

      {/* Pause + divider + grid — hidden in compact */}
      {!isCompact && (
        <>
          <motion.button
            onClick={onPause}
            whileHover={{ background: 'rgba(255,255,255,0.08)' }}
            whileTap={{ scale: 0.9 }}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Pause"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="2.5" y="2" width="2" height="6" rx="0.8" fill="rgba(255,255,255,0.7)" />
              <rect x="5.5" y="2" width="2" height="6" rx="0.8" fill="rgba(255,255,255,0.7)" />
            </svg>
          </motion.button>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)' }} />
          <motion.button
            whileHover={{ background: 'rgba(255,255,255,0.08)' }}
            whileTap={{ scale: 0.9 }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Menu"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <rect x="1" y="1" width="4" height="4" rx="1" fill="rgba(255,255,255,0.5)" />
              <rect x="8" y="1" width="4" height="4" rx="1" fill="rgba(255,255,255,0.5)" />
              <rect x="1" y="8" width="4" height="4" rx="1" fill="rgba(255,255,255,0.5)" />
              <rect x="8" y="8" width="4" height="4" rx="1" fill="rgba(255,255,255,0.5)" />
            </svg>
          </motion.button>
        </>
      )}
    </motion.div>
  )
}

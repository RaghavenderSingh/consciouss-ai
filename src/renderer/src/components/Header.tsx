import { motion } from 'framer-motion'
import LogoIcon from './LogoIcon'

interface Props {
  isOnline: boolean
  onToggleOnline: () => void
}

export default function Header({ isOnline, onToggleOnline }: Props) {
  return (
    <header
      style={{
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0
      }}
    >
      {/* Left: logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LogoIcon size={22} />
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            background: 'linear-gradient(135deg, #FF54B0, #FF4B33)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em'
          }}
        >
          ConscioussAI
        </span>
      </div>

      {/* Right: status + icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {/* Online toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)'
            }}
          >
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <motion.button
            onClick={onToggleOnline}
            style={{
              width: 30,
              height: 17,
              borderRadius: 999,
              background: isOnline ? 'rgba(255,84,176,0.35)' : 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '2px 3px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isOnline ? 'flex-end' : 'flex-start'
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              style={{
                width: 11,
                height: 11,
                borderRadius: '50%',
                background: isOnline ? '#FF54B0' : 'rgba(255,255,255,0.2)'
              }}
            />
          </motion.button>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.07)' }} />

        {/* Settings */}
        <motion.button
          whileHover={{ color: 'rgba(255,255,255,0.9)' }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.35)',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Settings"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M8 1v2M8 13v2M1 8h2M13 8h2M2.93 2.93l1.41 1.41M11.66 11.66l1.41 1.41M2.93 13.07l1.41-1.41M11.66 4.34l1.41-1.41"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </motion.button>

        {/* Sensors */}
        <motion.button
          whileHover={{ color: 'rgba(255,255,255,0.9)' }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.35)',
            display: 'flex',
            alignItems: 'center'
          }}
          title="Screen access"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect
              x="1"
              y="3"
              width="14"
              height="9"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path
              d="M5 14h6M8 12v2"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </motion.button>
      </div>
    </header>
  )
}

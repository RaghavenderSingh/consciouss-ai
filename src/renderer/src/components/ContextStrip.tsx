import { motion, AnimatePresence } from 'framer-motion'

export interface ActiveApp {
  name: string
  openedAt: Date
}

interface Props {
  activeApp: ActiveApp | null
}

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  return `${Math.floor(s / 60)}m ago`
}

export default function ContextStrip({ activeApp }: Props) {
  return (
    <AnimatePresence>
      {activeApp && (
        <motion.div
          initial={{ y: -44, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -44, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 24px',
            background: 'rgba(255,255,255,0.015)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            flexShrink: 0
          }}
        >
          {/* Live dot */}
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#10b981',
              flexShrink: 0
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}
          >
            Active
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>·</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
            {activeApp.name}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>·</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            {timeAgo(activeApp.openedAt)}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

import { motion, AnimatePresence } from 'framer-motion'
import { AIAction, ActionStatus } from '../types'

interface Props {
  action: AIAction
  status: ActionStatus
}

const STATUS = {
  pending: { symbol: '○', color: 'rgba(255,255,255,0.3)', label: 'pending' },
  running: { symbol: '●', color: '#f59e0b', label: 'running...' },
  done: { symbol: '✓', color: '#10b981', label: 'done' },
  failed: { symbol: '✗', color: '#FF4B33', label: 'failed' }
}

function getLabel(action: AIAction): string {
  switch (action.type) {
    case 'open_app':
      return `Open ${action.payload?.name || 'app'}`
    case 'open_url':
      return `Open ${action.payload?.url?.replace('https://', '') || 'URL'}`
    case 'applescript':
      return 'Run automation'
    case 'run_command':
      return 'Run command'
    case 'type_text':
      return `Type "${(action.payload?.text || '').slice(0, 24)}"`
    case 'click':
      return `Click at ${action.payload?.x}, ${action.payload?.y}`
    case 'screenshot':
      return 'Capture screen'
    default:
      return action.type
  }
}

export default function ActionCard({ action, status }: Props) {
  const cfg = STATUS[status]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0, marginTop: 0 }}
        animate={{ height: 48, opacity: 1, marginTop: 10 }}
        exit={{ height: 0, opacity: 0, marginTop: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{ overflow: 'hidden' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 14px',
            height: 48,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.75)',
              fontWeight: 500,
              letterSpacing: '0.01em'
            }}
          >
            {getLabel(action)}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <motion.span
              key={status}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                fontSize: 12,
                color: cfg.color,
                fontWeight: 600,
                letterSpacing: '0.02em'
              }}
            >
              {cfg.symbol} {cfg.label}
            </motion.span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

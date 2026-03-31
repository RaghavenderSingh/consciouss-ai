import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AIAction, ActionStatus } from '../types'

interface Props {
  action: AIAction
  status?: ActionStatus
}

const ACTION_META: Record<
  AIAction['type'],
  { label: string; icon: React.ReactNode; color: string; glow: string }
> = {
  open_app: {
    label: 'Open App',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="1" width="4.5" height="4.5" rx="1.2" fill="currentColor" opacity="0.9" />
        <rect x="6.5" y="1" width="4.5" height="4.5" rx="1.2" fill="currentColor" opacity="0.7" />
        <rect x="1" y="6.5" width="4.5" height="4.5" rx="1.2" fill="currentColor" opacity="0.7" />
        <rect x="6.5" y="6.5" width="4.5" height="4.5" rx="1.2" fill="currentColor" opacity="0.5" />
      </svg>
    ),
    color: '#A78BFA',
    glow: 'rgba(167,139,250,0.25)'
  },
  open_url: {
    label: 'Open URL',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
        <path d="M6 1.5C6 1.5 4.5 3.5 4.5 6s1.5 4.5 1.5 4.5M6 1.5C6 1.5 7.5 3.5 7.5 6 7.5 8.5 6 10.5 6 10.5M1.5 6h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
    color: '#34D399',
    glow: 'rgba(52,211,153,0.22)'
  },
  click: {
    label: 'Click',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M4 2.5v5.8l1.6-1.6 1.1 2.8 1.1-.4-1.1-2.8H8.5L4 2.5z" fill="currentColor" />
      </svg>
    ),
    color: '#60A5FA',
    glow: 'rgba(96,165,250,0.22)'
  },
  type_text: {
    label: 'Type Text',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="3" width="10" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4 6h4M6 4.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    color: '#F472B6',
    glow: 'rgba(244,114,182,0.22)'
  },
  run_command: {
    label: 'Run Command',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="2" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M3.5 5l1.8 1.5L3.5 8M6.5 8h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: '#FBBF24',
    glow: 'rgba(251,191,36,0.22)'
  },
  applescript: {
    label: 'AppleScript',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M3 4.5L1.5 6 3 7.5M9 4.5L10.5 6 9 7.5M5.5 8.5l1-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: '#FB923C',
    glow: 'rgba(251,146,60,0.22)'
  },
  screenshot: {
    label: 'Screenshot',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="2.5" width="10" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="6" cy="6" r="1.8" fill="currentColor" opacity="0.8" />
      </svg>
    ),
    color: '#22D3EE',
    glow: 'rgba(34,211,238,0.22)'
  },
  none: {
    label: 'Complete',
    icon: (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2.5 6.5L5 9l4.5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    color: '#4ADE80',
    glow: 'rgba(74,222,128,0.22)'
  }
}

function Spinner({ color }: { color: string }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        border: `1.5px solid ${color}30`,
        borderTopColor: color,
        flexShrink: 0
      }}
    />
  )
}

export default function ActionBadge({ action, status }: Props): React.ReactElement | null {
  if (action.type === 'none' && status !== 'done') return null

  const meta = ACTION_META[action.type] || ACTION_META.none
  const isDone = status === 'done'
  const isFailed = status === 'failed'
  const isRunning = status === 'running' || status === 'pending'

  // Build a human-readable label
  const getDetail = (): string => {
    const p = action.payload ?? {}
    if (action.type === 'open_app') return p.name || p.app_name || ''
    if (action.type === 'open_url') {
      try {
        return new URL(p.url || '').hostname
      } catch {
        return p.url || ''
      }
    }
    if (action.type === 'click') return `(${p.x}, ${p.y})`
    if (action.type === 'type_text') return `"${(p.text || '').slice(0, 24)}${(p.text || '').length > 24 ? '…' : ''}"`
    if (action.type === 'run_command') return (p.cmd || '').slice(0, 30)
    if (action.type === 'applescript') return 'macOS Script'
    return ''
  }

  const detail = getDetail()
  const color = isFailed ? '#F87171' : meta.color
  const glow = isFailed ? 'rgba(248,113,113,0.2)' : meta.glow

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        marginTop: 10,
        padding: '6px 12px 6px 9px',
        borderRadius: 999,
        background: `rgba(255,255,255,0.04)`,
        border: `1px solid ${color}30`,
        boxShadow: `0 0 16px ${glow}`,
        fontSize: 12,
        color,
        fontWeight: 500,
        letterSpacing: '0.01em',
        maxWidth: '100%',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        userSelect: 'none'
      }}
    >
      {/* Icon */}
      <motion.div
        style={{
          width: 18,
          height: 18,
          borderRadius: 6,
          background: `${color}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          flexShrink: 0
        }}
      >
        {meta.icon}
      </motion.div>

      {/* Label */}
      <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
        {meta.label}
      </span>

      {/* Detail */}
      {detail && (
        <>
          <div style={{ width: 1, height: 10, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
          <span style={{
            color: 'rgba(255,255,255,0.4)',
            fontFamily: 'monospace',
            fontSize: 11,
            maxWidth: 160,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {detail}
          </span>
        </>
      )}

      {/* Status indicator */}
      <div style={{ marginLeft: 2 }}>
        <AnimatePresence mode="wait">
          {isRunning && (
            <motion.div
              key="running"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
            >
              <Spinner color={color} />
            </motion.div>
          )}
          {isDone && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              style={{ color: '#4ADE80', display: 'flex' }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5.2L4.2 7.5l4-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          )}
          {isFailed && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              style={{ color: '#F87171', display: 'flex' }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Message } from '../types'
import ContextStrip, { ActiveApp } from './ContextStrip'

interface Props {
  messages: Message[]
  isStreaming: boolean
  streamingText: string
  activeApp: ActiveApp | null
  isCompact?: boolean
}

function UserBubble({ content }: { content: string }): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}
    >
      <div
        style={{
          maxWidth: '70%',
          background: 'linear-gradient(135deg, #FF54B0 0%, #FF4B33 100%)',
          color: 'white',
          borderRadius: '24px 24px 4px 24px',
          padding: '14px 20px',
          fontSize: 14,
          lineHeight: 1.55,
          fontWeight: 550,
          boxShadow: '0 8px 30px rgba(232,25,44,0.15), inset 0 1px 1px rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.1)',
          letterSpacing: '0.01em'
        }}
      >
        {content}
      </div>
    </motion.div>
  )
}

function AgentBubble({
  content,
  streaming
}: {
  content: string
  streaming?: boolean
}): React.ReactElement {
  if (!content && !streaming) return <></>

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}
    >
      <div
        style={{
          maxWidth: '80%',
          borderRadius: '24px 24px 24px 4px',
          padding: '14px 20px',
          fontSize: 14,
          lineHeight: 1.6,
          color: 'rgba(255,255,255,0.9)',
          fontWeight: 400,
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          letterSpacing: '0.01em'
        }}
      >
        <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>
        {streaming && (
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{
              display: 'inline-block',
              width: 2,
              height: 15,
              background: '#FF54B0',
              marginLeft: 6,
              verticalAlign: 'middle'
            }}
          />
        )}
      </div>
    </motion.div>
  )
}

export default function ChatPanel({
  messages,
  isStreaming,
  streamingText,
  activeApp,
  isCompact
}: Props): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages, streamingText])

  const getStreamingContent = (text: string): string => {
    const trimmed = text.trim()
    // Robust JSON detection even for partial streams
    if (trimmed.includes('"message"') || trimmed.startsWith('{')) {
      // Look for the value of the "message" key
      const match = text.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"?/)
      if (match) {
        return match[1]
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
      }
      // If we see JSON start but no message value yet, show nothing or placeholder
      if (trimmed === '{' || trimmed.includes('{"')) return ''
      return '...'
    }
    return text
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <ContextStrip activeApp={activeApp} />

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: isCompact ? '64px 14px 12px' : '72px 40px 32px',
          display: 'flex',
          flexDirection: 'column',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, transparent 16px, black 72px, black 100%)',
          maskImage: 'linear-gradient(to bottom, transparent 0px, transparent 16px, black 72px, black 100%)'
        }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {messages.map((msg) =>
            msg.role === 'user' ? (
              <UserBubble key={msg.id} content={msg.content} />
            ) : (
              <AgentBubble key={msg.id} content={msg.content} />
            )
          )}
          {isStreaming && streamingText && (
            <AgentBubble
              key="streaming"
              content={getStreamingContent(streamingText)}
              streaming
            />
          )}
        </AnimatePresence>

        {messages.length === 0 && !isStreaming && (
          <div
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span
              style={{
                color: 'rgba(255,255,255,0.1)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase'
              }}
            >
              Neural Core Initialized
            </span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

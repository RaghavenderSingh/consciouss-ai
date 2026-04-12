import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AXElement } from '../types'

export default function SovereignHUD() {
  const [focus, setFocus] = useState<AXElement | null>(null)

  useEffect(() => {
    // Listen for focus updates from the main process
    window.electronAPI.onHudFocus((data) => {
      setFocus(data)
    })
  }, [])

  if (!focus) return null

  return (
    <div style={{ width: '100vw', height: '100vh', pointerEvents: 'none', position: 'relative' }}>
      <AnimatePresence>
        {focus && (
          <motion.div
            key={`${focus.x}-${focus.y}-${focus.width}-${focus.height}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: focus.x,
              top: focus.y,
              width: focus.width,
              height: focus.height,
              border: '2px solid #E31C5F', // Ruby Red
              borderRadius: 8,
              boxShadow: '0 0 20px rgba(227, 28, 95, 0.4), inset 0 0 10px rgba(227, 28, 95, 0.2)',
              background: 'rgba(227, 28, 95, 0.03)'
            }}
          >
            {/* Pulsing "Thinking" indicator */}
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{
                position: 'absolute',
                top: -24,
                left: 0,
                background: '#E31C5F',
                color: 'white',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 4,
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}
            >
              Implicit Focus: {focus.title || focus.role}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

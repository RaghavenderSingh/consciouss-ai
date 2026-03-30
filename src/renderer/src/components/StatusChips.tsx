import { RefObject } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StatusChip } from '../types'

interface Props {
  chips: StatusChip[]
  containerRef: RefObject<HTMLDivElement | null>
}

// Cache random offsets per chip id so they don't re-randomize on re-render
const offsetCache = new Map<string, { x: number; y: number; rotate: number }>()

function getOffset(id: string) {
  if (!offsetCache.has(id)) {
    const angle = Math.random() * Math.PI * 2
    const r = 90 + Math.random() * 70
    offsetCache.set(id, {
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r * 0.55,
      rotate: (Math.random() - 0.5) * 10
    })
  }
  return offsetCache.get(id)!
}

export default function StatusChips({ chips, containerRef }: Props) {
  const getCenter = () => {
    const rect = containerRef.current?.getBoundingClientRect()
    return {
      cx: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      cy: rect ? rect.top + rect.height / 2 : window.innerHeight - 80
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      <AnimatePresence>
        {chips.map((chip) => {
          const { cx, cy } = getCenter()
          const { x, y, rotate } = getOffset(chip.id)

          return (
            <motion.div
              key={chip.id}
              initial={{ opacity: 0, x: cx, y: cy, scale: 0.7, rotate: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                x: [cx, cx + x, cx + x * 1.15],
                y: [cy, cy + y, cy + y * 1.1 - 12],
                scale: [0.7, 1, 0.95],
                rotate: [0, rotate]
              }}
              transition={{ duration: 2.5, ease: 'easeInOut', times: [0, 0.18, 0.78, 1] }}
              style={{
                position: 'fixed',
                left: 0,
                top: 0,
                background: '#2c2c2e',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 999,
                padding: '4px 12px',
                fontSize: 12,
                color: 'white',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                letterSpacing: '0.01em'
              }}
            >
              {chip.text}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

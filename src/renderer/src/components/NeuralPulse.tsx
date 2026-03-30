import { motion, AnimatePresence } from 'framer-motion'

interface NeuralPulseProps {
  state: 'idle' | 'working' | 'chat'
}

export default function NeuralPulse({ state }: NeuralPulseProps) {
  const colors = {
    idle: ['#3b82f6', '#1d4ed8'],
    working: ['#f59e0b', '#d97706'],
    chat: ['#FF54B0', '#FF4B33']
  }

  const currentColors = colors[state] || colors.idle

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: '#040405'
      }}
    >
      {/* SVG Filters for Liquid Caustics */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id="caustics">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.01"
            numOctaves="4"
            seed="1"
            result="noise"
          />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="120" />
        </filter>
        <filter id="liquid-glow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="40" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -10"
          />
        </filter>
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: '-20%',
          filter: 'url(#caustics)',
          opacity: 0.4
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            style={{ position: 'absolute', inset: 0 }}
          >
            {/* Morphing Liquid Base */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360]
              }}
              transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                top: '-10%',
                left: '-10%',
                width: '120%',
                height: '120%',
                background: `radial-gradient(circle at 40% 40%, ${currentColors[0]}44 0%, transparent 60%), 
                            radial-gradient(circle at 60% 60%, ${currentColors[1]}22 0%, transparent 50%)`,
                filter: 'url(#liquid-glow)'
              }}
            />

            {/* Moving Light Highlights */}
            <motion.div
              animate={{
                x: ['-20%', '20%', '-20%'],
                y: ['-10%', '10%', '-10%']
              }}
              transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(circle at center, ${currentColors[0]}22 0%, transparent 40%)`,
                mixBlendMode: 'plus-lighter'
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Subtle Surface Texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.05,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          pointerEvents: 'none'
        }}
      />
    </div>
  )
}

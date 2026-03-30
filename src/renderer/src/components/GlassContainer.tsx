import { ReactElement } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'

interface GlassContainerProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode
  intensity?: 'low' | 'medium' | 'high'
}

export default function GlassContainer({
  children,
  intensity = 'medium',
  style,
  ...props
}: GlassContainerProps): ReactElement {
  const blurAmounts = {
    low: '10px',
    medium: '20px',
    high: '40px'
  }

  return (
    <motion.div
      style={{
        position: 'relative',
        background: 'rgba(18, 18, 18, 0.85)',
        backdropFilter: `blur(${blurAmounts[intensity]}) saturate(1.8)`,
        WebkitBackdropFilter: `blur(${blurAmounts[intensity]}) saturate(1.8)`,
        borderRadius: 32,
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.3)',
        ...style
      }}
      {...props}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.02,
          pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)'/%3E%3C/svg%3E")`,
          zIndex: 0
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {children}
      </div>
    </motion.div>
  )
}

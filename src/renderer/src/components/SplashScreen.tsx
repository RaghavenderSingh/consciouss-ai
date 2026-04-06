import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { Shader, FlowingGradient, CursorTrail } from 'shaders/react'

const TAGLINE = 'The AI that runs your computer'
const DURATION = 5000
const TITLE = 'Consciouss.'
const EXPO = [0.16, 1, 0.3, 1] as const

const LOGO_D = 'M78.41,47.06l-31.54,62.94c-2.18,4.35.98,9.48,5.85,9.48h83.35c3.62,0,6.55,2.93,6.55,6.55v30.34c0,3.62-2.93,6.55-6.55,6.55H40.56c-3.62,0-6.55-2.93-6.55-6.55v-24.91c0-3.62-2.93-6.55-6.55-6.55H6.56c-4.87,0-8.03-5.13-5.85-9.48L37.68,41.63c1.11-2.22,3.38-3.61,5.85-3.61h27.42c3.62,0,6.55-2.93,6.55-6.55V6.55C77.5,2.93,80.43,0,84.05,0h52.07c3.62,0,6.55,2.93,6.55,6.55v30.35c0,3.62-2.93,6.55-6.55,6.55H84.26c-2.48,0-4.74,1.4-5.85,3.61Z'

const PIECES = [
  { id: 'p1', clipEl: 'rect', clipProps: { x: '76', y: '-10', width: '66', height: '55' },       grad: ['#FF69B4', '#FF54B0'], from: { x: 42,  y: -75, rotate: 22,  scale: 0.65 }, delay: 0,    dur: 0.68 },
  { id: 'p2', clipEl: 'poly', clipProps: { points: '-5,170 -5,38 82,38 82,170' },                 grad: ['#FF54B0', '#FF4B33'], from: { x: -78, y: 25,  rotate: -18, scale: 0.60 }, delay: 0.09, dur: 0.70 },
  { id: 'p3', clipEl: 'rect', clipProps: { x: '-5', y: '107', width: '148', height: '66' },       grad: ['#FF69B4', '#FF8F00'], from: { x: 0,   y: 78,  rotate: -12, scale: 0.60 }, delay: 0.18, dur: 0.67 },
  { id: 'p4', clipEl: 'rect', clipProps: { x: '97', y: '43',  width: '46',  height: '70'  },      grad: ['#FF54B0', '#FF4B33'], from: { x: 78,  y: -25, rotate: 18,  scale: 0.65 }, delay: 0.13, dur: 0.66 },
]

interface Props { onComplete: () => void }

export default function SplashScreen({ onComplete }: Props) {
  const animRef                         = useRef<number | undefined>(undefined)
  const [visible, setVisible]           = useState(true)
  const [logoPhase, setLogoPhase]       = useState<'pieces' | 'full'>('pieces')
  const [showTitle, setShowTitle]       = useState(false)
  const [showTagline, setShowTagline]   = useState(false)
  const [typedText, setTypedText]       = useState('')
  const progress                        = useMotionValue(0)
  const springProg                      = useSpring(progress, { stiffness: 55, damping: 18 })

  // ── Sequence ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t1 = setTimeout(() => setLogoPhase('full'),     1100)
    const t2 = setTimeout(() => setShowTitle(true),       1380)
    const t3 = setTimeout(() => setShowTagline(true),     2400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  useEffect(() => {
    if (!showTagline) return
    let i = 0
    const id = setInterval(() => { i++; setTypedText(TAGLINE.slice(0, i)); if (i >= TAGLINE.length) clearInterval(id) }, 44)
    return () => clearInterval(id)
  }, [showTagline])

  useEffect(() => {
    const start = Date.now()
    const tick = () => { const p = Math.min((Date.now() - start) / DURATION, 1); progress.set(p); if (p < 1) requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  }, [progress])

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); if (animRef.current) cancelAnimationFrame(animRef.current); setTimeout(onComplete, 850) }, DURATION)
    return () => clearTimeout(t)
  }, [onComplete])

  const letters = TITLE.split('')

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: 'blur(18px)' }}
          transition={{ duration: 0.85, ease: EXPO }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, overflow: 'hidden', background: '#050506' }}
        >
          <Shader>
            <FlowingGradient
              colorA="#050506"
              colorB="#0E0E12"
              colorC="#FF54B0"
              colorD="#FF4B33"
              speed={0.8}
            />
            <CursorTrail 
              colorA="#FF54B0" 
              colorB="#FF8F00" 
              radius={0.3} 
              length={0.5}
            />
          </Shader>

          {/* Vignette */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `
              radial-gradient(ellipse 55% 55% at 50% 50%, transparent 0%, rgba(5,5,6,.45) 58%, rgba(5,5,6,.92) 100%),
              radial-gradient(ellipse 40% 100% at 0% 50%, rgba(5,5,6,.88) 0%, transparent 52%),
              radial-gradient(ellipse 40% 100% at 100% 50%, rgba(5,5,6,.88) 0%, transparent 52%),
              radial-gradient(ellipse 100% 32% at 50% 0%, rgba(5,5,6,.90) 0%, transparent 55%),
              radial-gradient(ellipse 100% 32% at 50% 100%, rgba(5,5,6,.90) 0%, transparent 55%)
            `
          }} />

          {/* Center content */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 0,
          }}>

            {/* ── Liquid glass logo card ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.78, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1.0, ease: EXPO }}
              style={{
                position: 'relative',
                width: 112, height: 112,
                borderRadius: 28,
                background: 'rgba(255,255,255,0.045)',
                backdropFilter: 'blur(48px) saturate(2)',
                WebkitBackdropFilter: 'blur(48px) saturate(2)',
                border: '1px solid rgba(255,255,255,0.11)',
                boxShadow: '0 0 0 0.5px rgba(255,255,255,0.05) inset, 0 24px 64px rgba(0,0,0,0.55), 0 0 80px rgba(255,84,176,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 48, overflow: 'hidden',
              }}
            >
              {/* Top gloss line */}
              <div style={{
                position: 'absolute', top: 0, left: '8%', right: '8%', height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)',
              }} />
              {/* Bottom subtle shadow line */}
              <div style={{
                position: 'absolute', bottom: 0, left: '12%', right: '12%', height: 1,
                background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.4), transparent)',
              }} />
              {/* Inner red ambient */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(circle at 50% 70%, rgba(255,84,176,0.14) 0%, transparent 60%)',
              }} />

              {/* Pieces */}
              <AnimatePresence>
                {logoPhase === 'pieces' && PIECES.map((p) => (
                  <motion.svg
                    key={p.id}
                    viewBox="0 0 136 163"
                    overflow="visible"
                    style={{ position: 'absolute', width: 58, height: 70 }}
                    initial={{ x: p.from.x, y: p.from.y, rotate: p.from.rotate, scale: p.from.scale, opacity: 0 }}
                    animate={{ x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }}
                    transition={{ delay: p.delay, duration: p.dur, type: 'spring', stiffness: 175, damping: 17 }}
                  >
                    <defs>
                      <linearGradient id={`g${p.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={p.grad[0]} />
                        <stop offset="100%" stopColor={p.grad[1]} />
                      </linearGradient>
                      <clipPath id={`c${p.id}`}>
                        {p.clipEl === 'rect'
                          ? <rect {...(p.clipProps as any)} />
                          : <polygon {...(p.clipProps as any)} />
                        }
                      </clipPath>
                    </defs>
                    <path clipPath={`url(#c${p.id})`} fill={`url(#g${p.id})`} d={LOGO_D} />
                  </motion.svg>
                ))}
              </AnimatePresence>

              {/* Full assembled */}
              <AnimatePresence>
                {logoPhase === 'full' && (
                  <motion.svg
                    key="full"
                    viewBox="0 0 136 163"
                    style={{ width: 58, height: 70, position: 'relative', zIndex: 1 }}
                    initial={{ opacity: 0, scale: 0.9, filter: 'brightness(4)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'brightness(1)' }}
                    transition={{ duration: 0.45, ease: EXPO }}
                  >
                    <defs>
                      <linearGradient id="gfull" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FF54B0" />
                        <stop offset="100%" stopColor="#FF4B33" />
                      </linearGradient>
                    </defs>
                    <path fill="url(#gfull)" d={LOGO_D} />
                  </motion.svg>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── Title — letter blur reveal ── */}
            <div style={{ height: 68, display: 'flex', alignItems: 'center' }}>
              <AnimatePresence>
                {showTitle && (
                  <div style={{ display: 'flex', alignItems: 'baseline' }}>
                    {letters.map((char, i) => {
                      const isDot = char === '.'
                      return (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, filter: 'blur(14px)', y: 18 }}
                          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                          transition={{ delay: 0.04 + i * 0.052, duration: 0.52, ease: EXPO }}
                          style={{
                            fontFamily: '"-apple-system", "SF Pro Display", BlinkMacSystemFont, sans-serif',
                            fontSize: 54,
                            fontWeight: 600,
                            letterSpacing: '-0.04em',
                            lineHeight: 1,
                            display: 'inline-block',
                            color: isDot ? '#FF54B0' : 'rgba(255,255,255,0.93)',
                            textShadow: isDot
                              ? '0 0 32px rgba(255,84,176,0.7), 0 0 80px rgba(255,84,176,0.3)'
                              : '0 2px 40px rgba(0,0,0,0.4)',
                          }}
                        >
                          {char}
                        </motion.span>
                      )
                    })}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Tagline ── */}
            <div style={{ height: 28, display: 'flex', alignItems: 'center', marginTop: 12 }}>
              <AnimatePresence>
                {showTagline && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: EXPO }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 10, fontWeight: 400,
                      letterSpacing: '0.26em', textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.25)',
                      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                    }}
                  >
                    {typedText}
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
                      style={{ display: 'inline-block', width: 1, height: 10, background: '#FF54B0', borderRadius: 1 }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Progress bar ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{ position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)', width: 200 }}
          >
            <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 999, overflow: 'hidden' }}>
              <motion.div
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, rgba(255,84,176,0.4), #FF54B0)',
                  borderRadius: 999,
                  boxShadow: '0 0 8px rgba(255,84,176,0.6)',
                  scaleX: springProg,
                  transformOrigin: 'left',
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'

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

const LIGHTS = [
  { nx: 0.72, ny: 0.18, r: 0.90, cr: 235, cg: 22, cb: 32, w: 1.0  },
  { nx: 0.38, ny: 0.55, r: 0.85, cr: 190, cg: 12, cb: 22, w: 0.85 },
  { nx: 0.65, ny: 0.72, r: 0.80, cr: 175, cg: 10, cb: 50, w: 0.75 },
  { nx: 0.20, ny: 0.25, r: 0.75, cr: 160, cg: 14, cb: 30, w: 0.70 },
  { nx: 0.88, ny: 0.65, r: 0.72, cr: 200, cg: 16, cb: 38, w: 0.80 },
  { nx: 0.10, ny: 0.80, r: 0.70, cr: 120, cg: 8,  cb: 18, w: 0.55 },
  { nx: 0.90, ny: 0.10, r: 0.68, cr: 145, cg: 12, cb: 25, w: 0.60 },
  { nx: 0.50, ny: 0.10, r: 0.65, cr: 130, cg: 10, cb: 20, w: 0.50 },
  { nx: 0.50, ny: 0.90, r: 0.65, cr: 118, cg: 8,  cb: 30, w: 0.50 },
  { nx: 0.05, ny: 0.50, r: 0.62, cr: 108, cg: 7,  cb: 18, w: 0.45 },
  { nx: 0.95, ny: 0.50, r: 0.62, cr: 115, cg: 9,  cb: 22, w: 0.45 },
]

function sampleColor(nx: number, ny: number) {
  let r = 0, g = 0, b = 0, tw = 0
  for (const l of LIGHTS) {
    const d = Math.hypot(nx - l.nx, ny - l.ny)
    const t = Math.max(0, 1 - d / l.r)
    const w = t * t * l.w
    r += l.cr * w; g += l.cg * w; b += l.cb * w; tw += w
  }
  if (tw < 0.001) return { r: 22, g: 4, b: 7 }
  return { r: Math.min(255, r / tw), g: Math.min(255, g / tw), b: Math.min(255, b / tw) }
}

interface Props { onComplete: () => void }

export default function SplashScreen({ onComplete }: Props) {
  const canvasRef                       = useRef<HTMLCanvasElement>(null)
  const animRef                         = useRef<number | undefined>(undefined)
  const [visible, setVisible]           = useState(true)
  const [logoPhase, setLogoPhase]       = useState<'pieces' | 'full'>('pieces')
  const [showTitle, setShowTitle]       = useState(false)
  const [showTagline, setShowTagline]   = useState(false)
  const [typedText, setTypedText]       = useState('')
  const progress                        = useMotionValue(0)
  const springProg                      = useSpring(progress, { stiffness: 55, damping: 18 })

  // ── Canvas grain ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    let W = 0, H = 0
    const mv: any[] = [], st: any[] = []
    const CM = 10000, CS = 24000, WA = -Math.PI * 0.16, WS = 0.26

    function mkM(rand = false) {
      const x = rand ? Math.random() * W : -2, y = rand ? Math.random() * H : Math.random() * H
      const a = WA + (Math.random() - 0.5) * 0.5, sp = WS * (0.2 + Math.random() * 1.2)
      const ro = Math.random(), mx = 120 + Math.random() * 480
      const sz = ro < 0.75 ? 0.08 + Math.random() * 0.18 : ro < 0.93 ? 0.24 + Math.random() * 0.22 : ro < 0.99 ? 0.45 + Math.random() * 0.25 : 0.75 + Math.random() * 0.3
      return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: sz, ba: 0.04 + Math.random() * 0.72, wf: 0.003 + Math.random() * 0.013, wa: 0.02 + Math.random() * 0.18, wp: Math.random() * Math.PI * 2, age: rand ? Math.floor(Math.random() * mx) : 0, mx }
    }
    function mkS() {
      const ro = Math.random()
      return { x: Math.random() * W, y: Math.random() * H, size: ro < 0.82 ? 0.10 + Math.random() * 0.16 : ro < 0.97 ? 0.24 + Math.random() * 0.20 : 0.42 + Math.random() * 0.18, a: 0, ta: 0.03 + Math.random() * 0.22, ph: Math.random() * Math.PI * 2, sp: 0.006 + Math.random() * 0.022 }
    }
    function resize() {
      W = window.innerWidth; H = window.innerHeight
      canvas.width = W * dpr; canvas.height = H * dpr
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      mv.length = 0; st.length = 0
      for (let i = 0; i < CM; i++) mv.push(mkM(true))
      for (let i = 0; i < CS; i++) st.push(mkS())
    }
    resize()
    window.addEventListener('resize', resize)

    let fr = 0
    function draw() {
      fr++
      ctx.fillStyle = 'rgba(5,5,6,0.32)'; ctx.fillRect(0, 0, W, H)
      for (const s of st) {
        s.ph += s.sp; s.a = s.ta * (0.4 + 0.6 * Math.abs(Math.sin(s.ph)))
        const c = sampleColor(s.x / W, s.y / H)
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${(s.a * 0.48).toFixed(3)})`
        ctx.fill()
      }
      for (let i = 0; i < mv.length; i++) {
        const g = mv[i]; g.age++
        const pp = g.wa * Math.sin(g.age * g.wf + g.wp)
        g.x += g.vx + Math.sin(WA + Math.PI * 0.5) * pp * 0.022
        g.y += g.vy - Math.cos(WA + Math.PI * 0.5) * pp * 0.022
        if (g.x > W + 3 || g.x < -3 || g.y < -3 || g.y > H + 3 || g.age > g.mx) { mv[i] = mkM(false); continue }
        const lr = g.age / g.mx
        const al = lr < 0.06 ? (lr / 0.06) * g.ba : lr > 0.85 ? ((1 - lr) / 0.15) * g.ba : g.ba
        const c = sampleColor(g.x / W, g.y / H)
        const fl = (fr * 13 + i * 17) % 280 === 0
        ctx.beginPath(); ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2)
        ctx.fillStyle = fl
          ? `rgba(${Math.min(255, c.r * 2)},${Math.min(255, c.g * 1.5)},${Math.min(255, c.b * 1.4)},${Math.min(1, al * 1.5).toFixed(3)})`
          : `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${al.toFixed(3)})`
        ctx.fill()
      }
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener('resize', resize); if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

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
          {/* Grain canvas */}
          <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />

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

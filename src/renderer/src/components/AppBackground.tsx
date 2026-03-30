import { useEffect, useRef } from 'react'

const LIGHTS = [
  { nx: 0.72, ny: 0.18, r: 0.90, cr: 235, cg: 22, cb: 32, w: 1.0 },
  { nx: 0.38, ny: 0.55, r: 0.85, cr: 190, cg: 12, cb: 22, w: 0.85 },
  { nx: 0.65, ny: 0.72, r: 0.80, cr: 175, cg: 10, cb: 50, w: 0.75 },
  { nx: 0.20, ny: 0.25, r: 0.75, cr: 160, cg: 14, cb: 30, w: 0.70 },
  { nx: 0.88, ny: 0.65, r: 0.72, cr: 200, cg: 16, cb: 38, w: 0.80 },
  { nx: 0.10, ny: 0.80, r: 0.70, cr: 120, cg: 8, cb: 18, w: 0.55 },
  { nx: 0.90, ny: 0.10, r: 0.68, cr: 145, cg: 12, cb: 25, w: 0.60 },
  { nx: 0.50, ny: 0.10, r: 0.65, cr: 130, cg: 10, cb: 20, w: 0.50 },
  { nx: 0.50, ny: 0.90, r: 0.65, cr: 118, cg: 8, cb: 30, w: 0.50 },
  { nx: 0.05, ny: 0.50, r: 0.62, cr: 108, cg: 7, cb: 18, w: 0.45 },
  { nx: 0.95, ny: 0.50, r: 0.62, cr: 115, cg: 9, cb: 22, w: 0.45 }
]

function sampleColor(nx: number, ny: number) {
  let r = 0,
    g = 0,
    b = 0,
    tw = 0
  for (const l of LIGHTS) {
    const d = Math.hypot(nx - l.nx, ny - l.ny)
    const t = Math.max(0, 1 - d / l.r)
    const w = t * t * l.w
    r += l.cr * w
    g += l.cg * w
    b += l.cb * w
    tw += w
  }
  if (tw < 0.001) return { r: 22, g: 4, b: 7 }
  return { r: Math.min(255, r / tw), g: Math.min(255, g / tw), b: Math.min(255, b / tw) }
}

export default function AppBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number | undefined>(undefined)

  // ── Canvas grain ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    let W = 0,
      H = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mv: any[] = [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      st: any[] = []
    const CM = 10000,
      CS = 24000,
      WA = -Math.PI * 0.16,
      WS = 0.26

    function mkM(rand = false) {
      const x = rand ? Math.random() * W : -2,
        y = rand ? Math.random() * H : Math.random() * H
      const a = WA + (Math.random() - 0.5) * 0.5,
        sp = WS * (0.2 + Math.random() * 1.2)
      const ro = Math.random(),
        mx = 120 + Math.random() * 480
      const sz =
        ro < 0.75
          ? 0.08 + Math.random() * 0.18
          : ro < 0.93
            ? 0.24 + Math.random() * 0.22
            : ro < 0.99
              ? 0.45 + Math.random() * 0.25
              : 0.75 + Math.random() * 0.3
      return {
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        size: sz,
        ba: 0.04 + Math.random() * 0.72,
        wf: 0.003 + Math.random() * 0.013,
        wa: 0.02 + Math.random() * 0.18,
        wp: Math.random() * Math.PI * 2,
        age: rand ? Math.floor(Math.random() * mx) : 0,
        mx
      }
    }
    function mkS() {
      const ro = Math.random()
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        size:
          ro < 0.82
            ? 0.1 + Math.random() * 0.16
            : ro < 0.97
              ? 0.24 + Math.random() * 0.2
              : 0.42 + Math.random() * 0.18,
        a: 0,
        ta: 0.03 + Math.random() * 0.22,
        ph: Math.random() * Math.PI * 2,
        sp: 0.006 + Math.random() * 0.022
      }
    }
    function resize() {
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = W * dpr
      canvas.height = H * dpr
      canvas.style.width = W + 'px'
      canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      mv.length = 0
      st.length = 0
      for (let i = 0; i < CM; i++) mv.push(mkM(true))
      for (let i = 0; i < CS; i++) st.push(mkS())
    }
    resize()
    window.addEventListener('resize', resize)

    let fr = 0
    function draw() {
      fr++
      ctx.fillStyle = 'rgba(5,5,6,0.32)'
      ctx.fillRect(0, 0, W, H)
      for (const s of st) {
        s.ph += s.sp
        s.a = s.ta * (0.4 + 0.6 * Math.abs(Math.sin(s.ph)))
        const c = sampleColor(s.x / W, s.y / H)
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${(s.a * 0.48).toFixed(3)})`
        ctx.fill()
      }
      for (let i = 0; i < mv.length; i++) {
        const g = mv[i]
        g.age++
        const pp = g.wa * Math.sin(g.age * g.wf + g.wp)
        g.x += g.vx + Math.sin(WA + Math.PI * 0.5) * pp * 0.022
        g.y += g.vy - Math.cos(WA + Math.PI * 0.5) * pp * 0.022
        if (g.x > W + 3 || g.x < -3 || g.y < -3 || g.y > H + 3 || g.age > g.mx) {
          mv[i] = mkM(false)
          continue
        }
        const lr = g.age / g.mx
        const al = lr < 0.06 ? (lr / 0.06) * g.ba : lr > 0.85 ? ((1 - lr) / 0.15) * g.ba : g.ba
        const c = sampleColor(g.x / W, g.y / H)
        const fl = (fr * 13 + i * 17) % 280 === 0
        ctx.beginPath()
        ctx.arc(g.x, g.y, g.size, 0, Math.PI * 2)
        ctx.fillStyle = fl
          ? `rgba(${Math.min(255, c.r * 2)},${Math.min(255, c.g * 1.5)},${Math.min(255, c.b * 1.4)},${Math.min(1, al * 1.5).toFixed(3)})`
          : `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${al.toFixed(3)})`
        ctx.fill()
      }
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      window.removeEventListener('resize', resize)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1, // Ensure it stays behind all content
        overflow: 'hidden',
        pointerEvents: 'none',
        background: '#050506'
      }}
    >
      {/* Grain canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 55% 55% at 50% 50%, transparent 0%, rgba(5,5,6,.45) 58%, rgba(5,5,6,.92) 100%),
            radial-gradient(ellipse 40% 100% at 0% 50%, rgba(5,5,6,.88) 0%, transparent 52%),
            radial-gradient(ellipse 40% 100% at 100% 50%, rgba(5,5,6,.88) 0%, transparent 52%),
            radial-gradient(ellipse 100% 32% at 50% 0%, rgba(5,5,6,.90) 0%, transparent 55%),
            radial-gradient(ellipse 100% 32% at 50% 100%, rgba(5,5,6,.90) 0%, transparent 55%)
          `
        }}
      />
    </div>
  )
}

import React, { useEffect, useRef } from 'react'

/* ── Sphere Geometry ─────────────────────────────────────────────────────── */
function buildSphere(lat: number, lon: number) {
  const pos: number[] = [], nrm: number[] = [], idx: number[] = []
  for (let i = 0; i <= lat; i++) {
    const theta = (i * Math.PI) / lat
    const st = Math.sin(theta), ct = Math.cos(theta)
    for (let j = 0; j <= lon; j++) {
      const phi = (j * 2 * Math.PI) / lon
      const x = Math.cos(phi) * st, y = ct, z = Math.sin(phi) * st
      pos.push(x, y, z); nrm.push(x, y, z)
    }
  }
  for (let i = 0; i < lat; i++)
    for (let j = 0; j < lon; j++) {
      const a = i * (lon + 1) + j, b = a + lon + 1
      idx.push(a, b, a + 1, b, b + 1, a + 1)
    }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: new Uint16Array(idx) }
}

/* ── Matrix Math (column-major WebGL) ───────────────────────────────────── */
function perspective(fov: number, near: number, far: number): Float32Array {
  const f = 1 / Math.tan(fov / 2), d = near - far
  return new Float32Array([f, 0, 0, 0, 0, f, 0, 0, 0, 0, (near + far) / d, -1, 0, 0, (2 * near * far) / d, 0])
}
function rotY(a: number): Float32Array {
  const c = Math.cos(a), s = Math.sin(a)
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1])
}
function mul(a: Float32Array, b: Float32Array): Float32Array {
  const o = new Float32Array(16)
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++)
    o[i + j * 4] += a[i + k * 4] * b[k + j * 4]
  return o
}

/* ── Vertex Shader ───────────────────────────────────────────────────────── */
const VERT = `
precision highp float;
attribute vec3 aPos;
attribute vec3 aNrm;
uniform mat4 uMVP;
uniform mat4 uMV;
uniform float uTime;
uniform float uAudio;
varying vec3 vEyePos;
varying vec3 vEyeNrm;
varying float vNoise;

vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+10.)*x);}
vec4 tInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}

float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-vec3(.5);
  i=mod289(i);
  vec4 p=permute(permute(permute(
    i.z+vec4(0.,i1.z,i2.z,1.))+
    i.y+vec4(0.,i1.y,i2.y,1.))+
    i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;
  vec3 ns=n_*vec4(0.,.5,1.,2.).wyz-vec4(0.,.5,1.,2.).xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z),y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy,y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy),b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.,s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x),p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z),p3=vec3(a1.zw,h.w);
  vec4 norm=tInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m*=m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

void main(){
  vec3 p=aPos;
  // Three octaves of organic noise
  float n1=snoise(p*1.8+vec3(uTime*.25,uTime*.15,uTime*.2));
  float n2=snoise(p*3.5-vec3(uTime*.2,uTime*.25,0.))*0.5;
  float n3=snoise(p*7.+vec3(0.,uTime*.4,uTime*.3))*0.25;
  // Audio-reactive spikes on top
  float spike=snoise(p*4.+vec3(uTime*1.8))*uAudio;
  float noise=(n1+n2+n3)/1.75+spike;
  vNoise=noise;
  // Scale displacement with audio amplitude
  float disp=0.045+uAudio*0.22;
  vec3 displaced=p*(1.+noise*disp);
  vec4 ep=uMV*vec4(displaced,1.);
  vEyePos=ep.xyz;
  vEyeNrm=mat3(uMV)*aNrm;
  gl_Position=uMVP*vec4(displaced,1.);
}
`

/* ── Fragment Shader ─────────────────────────────────────────────────────── */
const FRAG = `
precision highp float;
uniform float uTime;
uniform float uAudio;
uniform int uState;
varying vec3 vEyePos;
varying vec3 vEyeNrm;
varying float vNoise;

void main(){
  vec3 N=normalize(vEyeNrm);
  vec3 V=normalize(-vEyePos);
  float nv=max(dot(N,V),0.);
  // Fresnel rim
  float fr=pow(1.-nv,3.);

  // State-based color palettes
  vec3 cA,rA,cB,rB;
  if(uState==1){
    // Listening: electric blue / violet
    cA=vec3(.1,.45,1.);  rA=vec3(.55,.1,1.);
    cB=vec3(.15,.7,1.);  rB=vec3(.3,0.,.92);
  } else if(uState==2){
    // Working: amber / deep orange
    cA=vec3(1.,.52,.05); rA=vec3(1.,.14,0.);
    cB=vec3(1.,.72,.12); rB=vec3(.88,.07,0.);
  } else {
    // Idle: coral pink / magenta
    cA=vec3(1.,.33,.66); rA=vec3(.85,.08,.38);
    cB=vec3(.72,.18,.9); rB=vec3(1.,.2,.52);
  }

  // Iridescent oscillation driven by fresnel, time, noise
  float ip=sin(fr*3.14159+uTime*.85+vNoise*2.)*.5+.5;
  vec3 core=mix(cA,cB,ip);
  vec3 rim=mix(rA,rB,ip);
  vec3 col=mix(core,rim,fr*fr);

  // Blinn-Phong specular
  vec3 L=normalize(vec3(1.,1.5,2.));
  vec3 H=normalize(L+V);
  float sp=pow(max(dot(N,H),0.),96.);
  col+=vec3(.85,.92,1.)*sp*.65;

  // Audio-reactive rim glow
  col+=rim*fr*uAudio*.95;

  // Subtle inner brightness from positive noise bumps
  col+=core*max(vNoise,0.)*.13;

  float alpha=.78+fr*.18+uAudio*.04;
  gl_FragColor=vec4(col,alpha);
}
`

/* ── Component ───────────────────────────────────────────────────────────── */
interface Props {
  isListening: boolean
  isWorking: boolean
  size?: number
}

export default function OrbShader({ isListening, isWorking, size = 260 }: Props): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isListeningRef = useRef(isListening)
  const isWorkingRef = useRef(isWorking)
  const actxRef = useRef<AudioContext | null>(null)
  
  // Audio references shared with the WebGL loop
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    isListeningRef.current = isListening
    if (isListening && actxRef.current && actxRef.current.state === 'suspended') {
      actxRef.current.resume()
    }
  }, [isListening])
  useEffect(() => { isWorkingRef.current = isWorking }, [isWorking])

  // Only request mic when active
  useEffect(() => {
    if (isListening || isWorking) {
      if (!streamRef.current) {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          .then(s => {
            streamRef.current = s
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
            if (!actxRef.current) actxRef.current = new AudioCtx()
            const src = actxRef.current.createMediaStreamSource(s)
            const analyser = actxRef.current.createAnalyser()
            analyser.fftSize = 256
            analyser.smoothingTimeConstant = 0.8
            src.connect(analyser)
            analyserRef.current = analyser
            dataArrRef.current = new Uint8Array(analyser.frequencyBinCount)
          })
          .catch(() => { /* no mic */ })
      }
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
        analyserRef.current = null
        dataArrRef.current = null
      }
    }
  }, [isListening, isWorking])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const phys = Math.round(size * dpr)
    canvas.width = phys
    canvas.height = phys

    const glMaybe = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true })
    if (!glMaybe) { console.error('[OrbShader] WebGL not available'); return }
    // Assign to const so TypeScript propagates the non-null narrowing into closures
    const gl: WebGLRenderingContext = glMaybe

    function compile(type: number, src: string): WebGLShader {
      const sh = gl!.createShader(type)!
      gl!.shaderSource(sh, src)
      gl!.compileShader(sh)
      if (!gl!.getShaderParameter(sh, gl!.COMPILE_STATUS))
        console.error('[OrbShader] Compile:', gl!.getShaderInfoLog(sh))
      return sh
    }

    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
      console.error('[OrbShader] Link:', gl.getProgramInfoLog(prog))
    gl.useProgram(prog)

    // Build and upload sphere geometry
    const { pos, nrm, idx } = buildSphere(52, 52)
    const posB = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, posB)
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW)

    const nrmB = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, nrmB)
    gl.bufferData(gl.ARRAY_BUFFER, nrm, gl.STATIC_DRAW)

    const idxB = gl.createBuffer()!
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxB)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW)

    const aPos  = gl.getAttribLocation(prog, 'aPos')
    const aNrm  = gl.getAttribLocation(prog, 'aNrm')
    const uMVP  = gl.getUniformLocation(prog, 'uMVP')
    const uMV   = gl.getUniformLocation(prog, 'uMV')
    const uTime = gl.getUniformLocation(prog, 'uTime')
    const uAudio= gl.getUniformLocation(prog, 'uAudio')
    const uState= gl.getUniformLocation(prog, 'uState')

    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.viewport(0, 0, phys, phys)

    // Pre-computed constant matrices
    const proj = perspective(Math.PI / 3.5, 0.1, 100)
    // Camera at z=3 looking at origin (view = translate by -3 on z)
    const view = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-3,1])

    let amp = 0
    let rafId = 0
    const t0 = performance.now()

    function frame(): void {
      rafId = requestAnimationFrame(frame)

      // Read voice-band amplitude and smooth it
      if (analyserRef.current && dataArrRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrRef.current)
        let sum = 0
        // Bins 2-32 cover roughly 100–2200 Hz at 44.1 kHz — voice range
        const end = Math.min(32, dataArrRef.current.length)
        for (let i = 2; i < end; i++) sum += dataArrRef.current[i]
        const raw = sum / (end - 2) / 255
        const target = Math.min(raw * 3.2, 1.0)   // boost sensitivity
        amp += (target - amp) * 0.14               // smooth
      }

      const t = (performance.now() - t0) / 1000
      const state = isWorkingRef.current ? 2 : isListeningRef.current ? 1 : 0

      const mv  = mul(view, rotY(t * 0.22))
      const mvp = mul(proj, mv)

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      gl.uniformMatrix4fv(uMVP,  false, mvp)
      gl.uniformMatrix4fv(uMV,   false, mv)
      gl.uniform1f(uTime,  t)
      gl.uniform1f(uAudio, amp)
      gl.uniform1i(uState, state)

      gl.bindBuffer(gl.ARRAY_BUFFER, posB)
      gl.enableVertexAttribArray(aPos)
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0)

      gl.bindBuffer(gl.ARRAY_BUFFER, nrmB)
      gl.enableVertexAttribArray(aNrm)
      gl.vertexAttribPointer(aNrm, 3, gl.FLOAT, false, 0, 0)

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxB)
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0)
    }

    frame()

    return () => {
      cancelAnimationFrame(rafId)
      gl.deleteBuffer(posB)
      gl.deleteBuffer(nrmB)
      gl.deleteBuffer(idxB)
      gl.deleteProgram(prog)
    }
  }, [size])

  // Dynamic glow color matches shader state
  const glowColor = isWorking
    ? 'rgba(255,110,20,0.4)'
    : isListening
    ? 'rgba(60,120,255,0.4)'
    : 'rgba(255,40,110,0.35)'

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Soft ambient glow behind the orb */}
      <div style={{
        position: 'absolute',
        inset: -24,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${glowColor} 0%, transparent 68%)`,
        filter: 'blur(18px)',
        pointerEvents: 'none',
        transition: 'background 0.6s ease'
      }} />
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          display: 'block',
          position: 'relative',
          zIndex: 1
        }}
      />
    </div>
  )
}

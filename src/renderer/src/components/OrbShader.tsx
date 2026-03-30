import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Shader, Blob } from 'shaders/react'

/* ── Component ───────────────────────────────────────────────────────────── */
interface Props {
  isListening: boolean
  isWorking: boolean
  size?: number
}

export default function OrbShader({ isListening, isWorking, size = 260 }: Props): React.ReactElement {
  const [amplitude, setAmplitude] = useState(0)
  const isListeningRef = useRef(isListening)
  const isWorkingRef = useRef(isWorking)
  const actxRef = useRef<AudioContext | null>(null)
  
  // Audio references for the sampling loop
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrRef = useRef<Uint8Array | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafIdRef = useRef<number>(0)

  useEffect(() => {
    isListeningRef.current = isListening
    if (isListening && actxRef.current && actxRef.current.state === 'suspended') {
      actxRef.current.resume()
    }
  }, [isListening])

  useEffect(() => {
    isWorkingRef.current = isWorking
  }, [isWorking])

  // Media Stream & Audio Context Setup
  useEffect(() => {
    if (isListening || isWorking) {
      if (!streamRef.current) {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          .then(s => {
            streamRef.current = s
            const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
            if (!actxRef.current) actxRef.current = new AudioCtx()
            
            const currentActx = actxRef.current
            if (!currentActx) return

            const src = currentActx.createMediaStreamSource(s)
            const analyser = currentActx.createAnalyser()
            analyser.fftSize = 256
            analyser.smoothingTimeConstant = 0.8
            src.connect(analyser)
            analyserRef.current = analyser
            dataArrRef.current = new Uint8Array(analyser.frequencyBinCount)

            // Start sampling loop
            const sample = () => {
              if (analyserRef.current && dataArrRef.current) {
                analyserRef.current.getByteFrequencyData(dataArrRef.current as any)
                let sum = 0
                // Focus on voice range (roughly 100-2000Hz)
                const end = Math.min(32, dataArrRef.current.length)
                for (let i = 2; i < end; i++) sum += dataArrRef.current[i]
                const raw = sum / (end - 2) / 255
                const target = Math.min(raw * 3.5, 1.2) // Boost sensitivity for the library
                
                setAmplitude(prev => prev + (target - prev) * 0.15) // Smooth transitions
              }
              rafIdRef.current = requestAnimationFrame(sample)
            }
            sample()
          })
          .catch(err => console.error('[OrbShader] Mic access error:', err))
      }
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
        analyserRef.current = null
        dataArrRef.current = null
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
        setAmplitude(0)
      }
    }

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    }
  }, [isListening, isWorking])

  // Determine colors based on state
  const colors = useMemo(() => {
    if (isWorking) {
      return { 
        a: '#FF8C00', // Deep Orange
        b: '#FFD700', // Gold
        highlight: '#FFFFFF',
        glow: 'rgba(255,140,0,0.4)',
        speed: 0.8 + amplitude * 1.5
      }
    }
    if (isListening) {
      return {
        a: '#007AFF', // Azure Blue
        b: '#5AC8FA', // Sky Blue
        highlight: '#E0F0FF',
        glow: 'rgba(0,122,255,0.4)',
        speed: 1.2 + amplitude * 2.5
      }
    }
    // Idle
    return {
      a: '#FF2D55', // Raspberry
      b: '#FF375F', // Soft Red
      highlight: '#FFD1DC',
      glow: 'rgba(255,45,85,0.3)',
      speed: 0.4 + amplitude * 1.0
    }
  }, [isListening, isWorking, amplitude])

  // Map amplitude to deformation and size for an organic "bubble" feel
  const deformation = 0.05 + (amplitude * 0.25) 
  const scale = 1.0 + (amplitude * 0.1)

  return (
    <div style={{ 
      position: 'relative', 
      width: size, 
      height: size, 
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
     
      overflow: 'visible'
    }}>
      {/* Premium Ambient Glow */}
      <div 
        style={{
          position: 'absolute',
          width: '120%',
          height: '120%',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
          filter: 'blur(32px)',
          pointerEvents: 'none',
          transition: 'background 0.8s ease',
          zIndex: 0
        }} 
      />

      {/* Shaders.com Component */}
      <div style={{ 
        width: size * 1.6, 
        height: size * 1.6, 
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1,
        pointerEvents: 'none'
      }}>
        <Shader>
          <Blob
            colorA={colors.a}
            colorB={colors.b}
            highlightColor={colors.highlight}
            size={0.4 * scale}
            deformation={deformation}
            speed={colors.speed * 0.6}
            softness={0.1}
            highlightIntensity={0.9 + amplitude * 0.3}
          />
        </Shader>
      </div>
    </div>
  )
}

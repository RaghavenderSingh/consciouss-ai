import { useState, useRef, useCallback, useEffect } from 'react'
import { CaptureResult } from '../types'

const INTERVAL_NORMAL = 2000 // 2s default
const INTERVAL_CALL = 1000 // 1s during active call
const MEMORY_SIZE = 3 // keep last 3 screenshots

interface UseScreenCaptureReturn {
  currentScreenshot: string | null
  screenMemory: React.RefObject<string[]>
  startCapture: () => void
  stopCapture: () => void
  isCapturing: boolean
  permissionError: boolean
}

export function useScreenCapture(isCallActive = false): UseScreenCaptureReturn {
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [permissionError, setPermissionError] = useState(false)
  const screenMemory = useRef<string[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const capture = useCallback(async () => {
    try {
      const res = (await window.electronAPI.captureScreen()) as CaptureResult
      let dataURL = ''
      
      if (res && res.screens && res.totalBounds) {
        const canvas = document.createElement('canvas')
        const { screens, totalBounds } = res
        const fullW = totalBounds.right - totalBounds.left
        const fullH = totalBounds.bottom - totalBounds.top
        const scale = 1280 / fullW
        canvas.width = 1280
        canvas.height = fullH * scale
        const ctx = canvas.getContext('2d')
        if (ctx) {
          for (const s of screens) {
            const img = new Image()
            img.src = s.dataURL
            await new Promise((resolve) => { img.onload = resolve })
            ctx.drawImage(
              img, 
              (s.bounds.x - totalBounds.left) * scale, 
              (s.bounds.y - totalBounds.top) * scale,
              s.bounds.width * scale,
              s.bounds.height * scale
            )
          }
          dataURL = canvas.toDataURL('image/jpeg', 0.8)
        }
      } else {
        dataURL = res.dataURL || ''
      }

      setCurrentScreenshot(dataURL)
      setPermissionError(false)
      screenMemory.current = [...screenMemory.current.slice(-(MEMORY_SIZE - 1)), dataURL]
    } catch (err) {
      console.error(
        '[useScreenCapture] capture failed — check Screen Recording permission in System Settings:',
        err
      )
      setPermissionError(true)
      // Stop retrying — user must grant permission and restart
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsCapturing(false)
    }
  }, [])

  const startCapture = useCallback(() => {
    if (intervalRef.current) return
    setIsCapturing(true)
    
    const shouldRunCapture = () => document.hasFocus() || isCallActive

    if (shouldRunCapture()) {
      capture() // immediate first capture
    }

    const ms = isCallActive ? INTERVAL_CALL : INTERVAL_NORMAL
    intervalRef.current = setInterval(() => {
      if (shouldRunCapture()) {
        capture()
      }
    }, ms)
  }, [capture, isCallActive])

  const stopCapture = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsCapturing(false)
  }, [])

  // Restart with new interval if call state changes
  useEffect(() => {
    if (isCapturing) {
      stopCapture()
      startCapture()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCallActive])

  // Log screenshot size every 5s for debugging
  useEffect(() => {
    const t = setInterval(() => {
      if (currentScreenshot) {
        console.log(
          '[Screen] latest screenshot size:',
          Math.round(currentScreenshot.length / 1024),
          'KB'
        )
      }
    }, 5000)
    return () => clearInterval(t)
  }, [currentScreenshot])

  // Cleanup on unmount
  useEffect(() => () => stopCapture(), [stopCapture])

  return {
    currentScreenshot,
    screenMemory,
    startCapture,
    stopCapture,
    isCapturing,
    permissionError
  }
}

import { useEffect, useRef, useState } from 'react'
import { AXElement } from '../types'

interface MousePos {
  x: number
  y: number
}

export function useAttention() {
  const [mousePos, setMousePos] = useState<MousePos>({ x: 0, y: 0 })
  const [focusElement, setFocusElement] = useState<AXElement | null>(null)
  const [isIdle, setIsIdle] = useState(false)
  
  const lastPosRef = useRef<MousePos>({ x: 0, y: 0 })
  const dwellStartTimeRef = useRef<number>(Date.now())
  const lastFocusAttemptRef = useRef<number>(0)

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        // 1. Get Mouse Location
        const pos = await window.electronAPI.getMouseLocation()
        setMousePos(pos)

        // 2. Presence Sensing (Idle Check)
        const idleTime = await window.electronAPI.getSystemIdleTime()
        setIsIdle(idleTime > 60) // 1 minute idle

        // 3. Dwell-Time Logic (Focus Detection)
        const dist = Math.sqrt(
          Math.pow(pos.x - lastPosRef.current.x, 2) + 
          Math.pow(pos.y - lastPosRef.current.y, 2)
        )

        const now = Date.now()
        if (dist > 10) {
          // Mouse moved significantly
          lastPosRef.current = pos
          dwellStartTimeRef.current = now
        } else {
          // Mouse is dwelling
          const dwellTime = now - dwellStartTimeRef.current
          
          if (dwellTime > 1500 && now - lastFocusAttemptRef.current > 2000) {
            // Implicit Intent Detected: User is dwelling on a location
            lastFocusAttemptRef.current = now
            identifyElementAt(pos.x, pos.y)
          }
        }
      } catch (err) {
        console.error('[useAttention] Polling error:', err)
      }
    }, 200)

    return () => clearInterval(pollInterval)
  }, [])

  const identifyElementAt = async (x: number, y: number) => {
    try {
      const pid = await window.electronAPI.getFrontmostAppPid()
      if (!pid) return

      // Use the existing native function to list elements
      // We'll filter for the one that contains the mouse coordinates
      const elements = await window.electronAPI.listUIElements(pid, 5) 
      const hit = elements.find((el: AXElement) => 
        x >= el.x && x <= el.x + el.width &&
        y >= el.y && y <= el.y + el.height
      )

      if (hit && hit.title !== focusElement?.title) {
        console.log('[useAttention] Sovereign Focus Shift:', hit.title || hit.role)
        setFocusElement(hit)
      }
    } catch (err) {
      console.warn('[useAttention] Element identification failed:', err)
    }
  }

  return { mousePos, focusElement, isIdle }
}

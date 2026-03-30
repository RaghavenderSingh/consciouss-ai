import { useState, useRef, useCallback, useEffect } from 'react'

interface UseVoiceInputOptions {
  onTranscript?: (text: string) => void
  onWakeWord?: () => void
}

interface UseVoiceInputReturn {
  isListening: boolean
  toggleListening: () => void
  startContinuous: () => void
  stopContinuous: () => void
}

// Transcription is handled in the main process (no CORS) via window.electronAPI.transcribeAudio

export function useVoiceInput({
  onTranscript,
}: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const isListeningRef = useRef(false)
  // Keep onTranscript in a ref so the recorder.onstop closure never goes stale
  const onTranscriptRef = useRef(onTranscript)
  useEffect(() => { onTranscriptRef.current = onTranscript }, [onTranscript])

  const transcribeBlob = useCallback(async (blob: Blob, mimeType: string) => {
    if (blob.size < 1500) return // too short — skip (noise / accidental tap)

    try {
      const arrayBuffer = await blob.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)
      const text = await window.electronAPI.transcribeAudio(buffer, mimeType)
      if (text?.trim()) {
        onTranscriptRef.current?.(text.trim())
      }
    } catch (err) {
      console.error('[Voice] Transcription failed:', err)
    }
  }, [])

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    recorder.stop() // triggers onstop → transcription
  }, [])

  const toggleListening = useCallback(async () => {
    if (isListeningRef.current) {
      isListeningRef.current = false
      stopRecording()
      return
    }

    // Start a new recording session
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch (err) {
      console.error('[Voice] Mic access denied:', err)
      return
    }

    streamRef.current = stream
    chunksRef.current = []

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/ogg'

    const recorder = new MediaRecorder(stream, { mimeType })
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      // Release mic
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null

      setIsListening(false)

      const blob = new Blob(chunksRef.current, { type: mimeType })
      chunksRef.current = []
      transcribeBlob(blob, mimeType)
    }

    recorder.start()
    isListeningRef.current = true
    setIsListening(true)
  }, [stopRecording, transcribeBlob])

  // Stubs — Whisper is batch-only, no continuous/wake-word mode
  const startContinuous = useCallback(() => {}, [])
  const stopContinuous = useCallback(() => {
    isListeningRef.current = false
    stopRecording()
  }, [stopRecording])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recorderRef.current?.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return { isListening, toggleListening, startContinuous, stopContinuous }
}

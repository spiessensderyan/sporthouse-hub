'use client'

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'

const MAX_DURATION = 90 * 60 // 1.5 uur in seconden

// ─── Web Speech API types ─────────────────────────────────────────────────────

interface ISpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}
interface ISpeechRecognitionErrorEvent extends Event {
  error: string
}
interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((e: ISpeechRecognitionEvent) => void) | null
  onerror:  ((e: ISpeechRecognitionErrorEvent) => void) | null
  onend:    (() => void) | null
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecordingStage = 'idle' | 'recording' | 'stopped'

interface RecordingContextType {
  stage:            RecordingStage
  duration:         number
  finalTranscript:  string
  interimTranscript: string
  clientId:         string | null
  clientName:       string | null
  error:            string | null
  startRecording:   (clientId: string, clientName: string) => void
  stopRecording:    () => void
  reset:            () => void
  clearError:       () => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const RecordingContext = createContext<RecordingContextType | null>(null)

export function useRecording() {
  const ctx = useContext(RecordingContext)
  if (!ctx) throw new Error('useRecording must be used within RecordingProvider')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [stage,             setStage]             = useState<RecordingStage>('idle')
  const [duration,          setDuration]          = useState(0)
  const [finalTranscript,   setFinalTranscript]   = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [clientId,          setClientId]          = useState<string | null>(null)
  const [clientName,        setClientName]        = useState<string | null>(null)
  const [error,             setError]             = useState<string | null>(null)

  const recognitionRef  = useRef<ISpeechRecognition | null>(null)
  const isRecordingRef  = useRef(false)
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const durationRef     = useRef(0)

  // ── Stop ───────────────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    isRecordingRef.current = false
    try { recognitionRef.current?.stop() } catch {}
    recognitionRef.current = null
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setInterimTranscript('')
    setStage('stopped')
  }, [])

  // ── Start ──────────────────────────────────────────────────────────────────
  function startRecording(cid: string, cname: string) {
    setError(null)
    setClientId(cid)
    setClientName(cname)
    setFinalTranscript('')
    setInterimTranscript('')
    setDuration(0)
    durationRef.current = 0

    type Win = Window & {
      webkitSpeechRecognition?: new () => ISpeechRecognition
      SpeechRecognition?: new () => ISpeechRecognition
    }
    const SR = (window as Win).webkitSpeechRecognition ?? (window as Win).SpeechRecognition
    if (!SR) {
      setError('Web Speech API wordt niet ondersteund. Gebruik Chrome of Edge.')
      return
    }

    const recognition = new SR()
    recognition.continuous     = true
    recognition.interimResults = true
    recognition.lang           = 'nl-BE'

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) setFinalTranscript(prev => prev + r[0].transcript + ' ')
        else interim += r[0].transcript
      }
      setInterimTranscript(interim)
    }

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      // Transient errors — onend will auto-restart, no action needed here.
      // 'aborted'       → page briefly lost focus (notification, phone call, screen lock)
      // 'audio-capture' → audio stream temporarily interrupted
      // 'network'       → brief network hiccup
      // 'no-speech'     → silence, already handled
      const transient = ['no-speech', 'aborted', 'audio-capture', 'network']
      if (transient.includes(event.error)) return

      // Fatal: user revoked microphone permission — actually stop.
      setError(`Microfoon fout: ${event.error}`)
      stopRecording()
    }

    // Auto-restart whenever speech recognition ends (silence, interruption, notification, etc.)
    recognition.onend = () => {
      if (isRecordingRef.current && recognitionRef.current === recognition) {
        // Small delay avoids rapid restart loops after errors
        setTimeout(() => {
          if (isRecordingRef.current && recognitionRef.current === recognition) {
            try { recognition.start() } catch {}
          }
        }, 200)
      }
    }

    recognitionRef.current = recognition
    isRecordingRef.current = true

    try {
      recognition.start()
    } catch {
      setError('Kon microfoon niet starten. Controleer de toestemming.')
      return
    }

    setStage('recording')

    timerRef.current = setInterval(() => {
      durationRef.current += 1
      setDuration(durationRef.current)
      // Auto-stop na 1.5 uur
      if (durationRef.current >= MAX_DURATION) {
        stopRecording()
      }
    }, 1000)
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  function reset() {
    setStage('idle')
    setFinalTranscript('')
    setInterimTranscript('')
    setDuration(0)
    durationRef.current = 0
    setError(null)
    setClientId(null)
    setClientName(null)
  }

  // ── Tab-visibility: herstart recognition als tab terug actief wordt ─────────
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible' && isRecordingRef.current && recognitionRef.current) {
        // Page came back into focus — force a clean restart in case recognition
        // silently died while hidden (e.g. screen lock, notification overlay)
        try { recognitionRef.current.stop() } catch {}
        setTimeout(() => {
          if (isRecordingRef.current && recognitionRef.current) {
            try { recognitionRef.current.start() } catch {}
          }
        }, 400)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // ── Warn before closing browser tab ────────────────────────────────────────
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isRecordingRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  return (
    <RecordingContext.Provider value={{
      stage, duration, finalTranscript, interimTranscript,
      clientId, clientName, error,
      startRecording, stopRecording, reset,
      clearError: () => setError(null),
    }}>
      {children}
    </RecordingContext.Provider>
  )
}

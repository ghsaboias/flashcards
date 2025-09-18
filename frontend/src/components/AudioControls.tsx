import { useEffect, useRef } from 'react'

interface AutoTTSProps {
  text: string
  enabled: boolean
  speak: (text: string) => void
}

export function AutoTTS({ text, enabled, speak }: AutoTTSProps) {
  const lastSpokenRef = useRef<{ text: string; ts: number } | null>(null)

  useEffect(() => {
    if (!enabled || !text) return
    const now = Date.now()
    const last = lastSpokenRef.current
    // Guard to avoid duplicate TTS under React StrictMode double-invocation
    if (last && last.text === text && now - last.ts < 1000) return
    speak(text)
    lastSpokenRef.current = { text, ts: now }
  }, [text, enabled])

  return null // This component only provides side effects
}
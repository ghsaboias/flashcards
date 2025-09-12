import { useEffect, useRef } from 'react'

export interface AudioControlsHook {
  speak: (text: string) => void
  playCorrectChime: () => void
}

export function useAudioControls(): AudioControlsHook {
  const voicesRef = useRef<SpeechSynthesisVoice[] | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Load voices on mount
  useEffect(() => {
    function loadVoices() {
      const v = window.speechSynthesis.getVoices()
      voicesRef.current = v
    }
    loadVoices()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])

  const speak = (text: string) => {
    if (!text || !('speechSynthesis' in window)) return
    const utter = new SpeechSynthesisUtterance(text)
    const voices = voicesRef.current || window.speechSynthesis.getVoices()
    const zhVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('zh'))
    if (zhVoice) utter.voice = zhVoice
    utter.rate = 0.9
    utter.pitch = 1
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utter)
  }

  const playCorrectChime = () => {
    try {
      const AC = (window as typeof window & {
        AudioContext?: typeof AudioContext
        webkitAudioContext?: typeof AudioContext
      }).AudioContext || (window as typeof window & {
        webkitAudioContext?: typeof AudioContext
      }).webkitAudioContext
      if (!AC) return
      if (!audioCtxRef.current) audioCtxRef.current = new AC()
      const ctx = audioCtxRef.current!
      if (ctx.state === 'suspended') {
        // Resume on user gesture contexts (Safari/iOS)
        ctx.resume().catch(() => { /* noop */ })
      }

      const now = ctx.currentTime
      const gain = ctx.createGain()
      // Main gain should be audible; individual tones handle their own envelopes
      gain.gain.setValueAtTime(1, now)
      gain.connect(ctx.destination)

      // Simple two-tone chime
      const tone = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + start)
        const g = ctx.createGain()
        g.gain.setValueAtTime(0, now + start)
        g.gain.linearRampToValueAtTime(0.2, now + start + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur)
        osc.connect(g)
        g.connect(gain)
        osc.start(now + start)
        osc.stop(now + start + dur)
        osc.onended = () => {
          osc.disconnect()
          g.disconnect()
        }
      }

      tone(660, 0, 0.15)
      tone(880, 0.12, 0.18)

      // Cleanup main gain shortly after
      const endAt = now + 0.12 + 0.18
      gain.gain.setValueAtTime(0, endAt)
      setTimeout(() => {
        try { gain.disconnect() } catch { /* noop */ }
      }, Math.ceil((endAt - ctx.currentTime) * 1000) + 50)
    } catch {
      // No audio available; ignore
    }
  }

  return {
    speak,
    playCorrectChime
  }
}
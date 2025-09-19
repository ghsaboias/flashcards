import { useEffect } from 'react'
import type { SessionState, SessionActions } from '../types/session-types'
import { hasChinese } from '../utils/pinyin'

interface KeyboardHandlerProps {
  sessionState: SessionState
  actions: SessionActions
  speak: (text: string) => void
}

export default function KeyboardHandler({ sessionState, actions, speak }: KeyboardHandlerProps) {
  const {
    question,
    selectedSets
  } = sessionState

  const {
    beginMultiSetSession,
    beginMultiSetDifficult,
    beginMultiSetSrs
  } = actions

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore shortcuts while the user is typing in an input/textarea/contentEditable
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = (target.tagName || '').toLowerCase()
        const isTyping = tag === 'input' || tag === 'textarea' || 
                         (target as HTMLElement).isContentEditable ||
                         (target as HTMLInputElement).type === 'text'
        if (isTyping) {
          e.stopPropagation() // Prevent event bubbling
          return
        }
      }

      if (e.key === 'r' || e.key === 'R') {
        if (question && hasChinese(question)) speak(question)
      } else if (e.key === '1') {
        if (selectedSets.length > 0) beginMultiSetSession()
      } else if (e.key === '2') {
        if (selectedSets.length > 0) beginMultiSetDifficult()
      } else if (e.key === '3') {
        if (selectedSets.length > 0) beginMultiSetSrs()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    question,
    selectedSets,
    speak,
    beginMultiSetSession,
    beginMultiSetDifficult,
    beginMultiSetSrs
  ])

  return null // This component only provides keyboard handling side effects
}
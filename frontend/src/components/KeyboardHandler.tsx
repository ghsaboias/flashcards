import { useEffect } from 'react'
import type { SessionState, SessionActions } from './SessionManager'
import { hasChinese } from '../utils/pinyin'

interface KeyboardHandlerProps {
  sessionState: SessionState
  actions: SessionActions
  speak: (text: string) => void
}

export default function KeyboardHandler({ sessionState, actions, speak }: KeyboardHandlerProps) {
  const {
    question,
    selectedSet,
    selectedCategory,
    selectedSets,
    mode,
    inBrowseMode,
    browseIndex,
    browseRows
  } = sessionState

  const {
    beginSetSession,
    beginCategorySession,
    beginMultiSetSession,
    beginDifficultSet,
    beginDifficultCategory,
    beginMultiSetDifficult,
    beginSrsSets,
    beginSrsCategories,
    beginMultiSetSrs,
    nextBrowse,
    prevBrowse
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
        if (inBrowseMode) {
          const q = browseRows[browseIndex]?.question
          if (q && hasChinese(q)) speak(q)
        }
      } else if (e.key === '1') {
        if (mode === 'set' && selectedSet) beginSetSession()
        else if (mode === 'category' && selectedCategory) beginCategorySession()
        else if (mode === 'multi-set' && selectedSets.length > 0) beginMultiSetSession()
      } else if (e.key === '2') {
        if (mode === 'set' && selectedSet) beginDifficultSet()
        else if (mode === 'category' && selectedCategory) beginDifficultCategory()
        else if (mode === 'multi-set' && selectedSets.length > 0) beginMultiSetDifficult()
      } else if (e.key === '3') {
        if (mode === 'set' && selectedSet) beginSrsSets()
        else if (mode === 'category' && selectedCategory) beginSrsCategories()
        else if (mode === 'multi-set' && selectedSets.length > 0) beginMultiSetSrs()
      } else if (e.key === '4') {
        if (selectedCategory) beginCategorySession()
      } else if (e.key === '5') {
        if (selectedCategory) beginDifficultCategory()
      } else if (e.key === '6') {
        if (selectedCategory) beginSrsCategories()
      } else if (inBrowseMode && (e.key === 'ArrowRight' || e.key === 'PageDown')) {
        e.preventDefault()
        nextBrowse()
      } else if (inBrowseMode && (e.key === 'ArrowLeft' || e.key === 'PageUp')) {
        e.preventDefault()
        prevBrowse()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    question,
    selectedSet,
    selectedCategory,
    selectedSets,
    mode,
    inBrowseMode,
    browseIndex,
    browseRows,
    speak,
    beginSetSession,
    beginCategorySession,
    beginMultiSetSession,
    beginDifficultSet,
    beginDifficultCategory,
    beginMultiSetDifficult,
    beginSrsSets,
    beginSrsCategories,
    beginMultiSetSrs,
    nextBrowse,
    prevBrowse
  ])

  return null // This component only provides keyboard handling side effects
}
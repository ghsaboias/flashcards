import type { ReactNode } from 'react'
import { SessionProvider } from '../contexts/SessionContext'
import KeyboardHandler from '../components/KeyboardHandler'
import { AutoTTS } from '../components/AudioControls'
import { hasChinese } from '../utils/pinyin'
import { useAudioControls } from '../hooks/useAudioControls'
import type { SessionState, SessionActions } from '../types/session-types'

interface SessionLayoutProps {
  children: ReactNode
  sessionState: SessionState
  actions: SessionActions
  className?: string
}

export default function SessionLayout({
  children,
  sessionState,
  actions,
  className = ''
}: SessionLayoutProps) {
  const { speak } = useAudioControls()

  return (
    <SessionProvider sessionState={sessionState} actions={actions} speak={speak}>
      <div className={`container ${className}`}>
        {/* Auto TTS for Chinese characters */}
        <AutoTTS
          text={sessionState.question}
          enabled={hasChinese(sessionState.question)}
          speak={speak}
        />

        {/* Keyboard shortcuts handler */}
        <KeyboardHandler
          sessionState={sessionState}
          actions={actions}
          speak={speak}
        />

        {children}
      </div>
    </SessionProvider>
  )
}
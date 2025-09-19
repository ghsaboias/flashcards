import { memo, type ReactNode } from 'react'
import KeyboardHandler from '../components/KeyboardHandler'
import { AutoTTS } from '../components/AudioControls'
import { hasChinese } from '../utils/pinyin'
import { useAudioControls } from '../hooks/useAudioControls'
import { useSessionContext } from '../hooks/useSessionContext'

interface SessionLayoutProps {
  children: ReactNode
  className?: string
}

const SessionLayout = memo(function SessionLayout({
  children,
  className = ''
}: SessionLayoutProps) {
  const { state: sessionState, actions } = useSessionContext()
  const { speak } = useAudioControls()

  return (
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
  )
})

export default SessionLayout
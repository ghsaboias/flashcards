import { useMemo, type ReactNode } from 'react'
import { useSessionManager } from '../hooks/useSessionManager'
import { useAppContext } from '../hooks/useAppContext'
import { SessionProvider } from '../contexts/SessionContext'
import { useAudioControls } from '../hooks/useAudioControls'

interface GlobalSessionProviderProps {
  children: ReactNode
}

export function GlobalSessionProvider({ children }: GlobalSessionProviderProps) {
  const { selectedDomain } = useAppContext()
  const [sessionState, actions] = useSessionManager(selectedDomain)
  const { speak } = useAudioControls()

  // Memoize provider props to prevent unnecessary re-renders
  const providerProps = useMemo(() => ({
    sessionState,
    actions,
    speak
  }), [sessionState, actions, speak])

  return (
    <SessionProvider {...providerProps}>
      {children}
    </SessionProvider>
  )
}
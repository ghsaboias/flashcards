import { memo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStateAndActions } from '../hooks/useSessionContext'
import { useAppContext } from '../hooks/useAppContext'
import { useNavigationGuardContext } from '../hooks/useNavigationGuardContext'
import MainLayout from '../layouts/MainLayout'

// Prefetch functions for likely next routes
const prefetchPracticePage = () => import('./PracticePage')
const prefetchSessionFlow = () => {
  // Prefetch session and complete pages together since they're part of the same flow
  return Promise.all([
    import('./SessionPage'),
    import('./CompletePage')
  ])
}

const HomePage = memo(function HomePage() {
  const { selectedDomain } = useAppContext()
  const [, actions] = useSessionStateAndActions()
  const navigate = useNavigate()
  const { navigateWithGuard } = useNavigationGuardContext()

  // Prefetch likely next pages after component mounts
  useEffect(() => {
    // Prefetch PracticePage immediately as it's the most likely next destination
    const prefetchTimer = setTimeout(() => {
      prefetchPracticePage().catch(console.error)
    }, 500) // Delay slightly to avoid blocking initial render

    // Prefetch session flow after a longer delay
    const sessionPrefetchTimer = setTimeout(() => {
      prefetchSessionFlow().catch(console.error)
    }, 2000)

    return () => {
      clearTimeout(prefetchTimer)
      clearTimeout(sessionPrefetchTimer)
    }
  }, [])

  const handleStartSession = async () => {
    try {
      const response = await actions.beginAutoSession(selectedDomain?.id)
      if (response?.session_id) {
        navigate(`/session/${response.session_id}`)
      }
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  const handleAdvancedOptions = async () => {
    await navigateWithGuard('/practice')
  }

  // Prefetch on hover/focus for Advanced Options button
  const handleAdvancedOptionsHover = () => {
    prefetchPracticePage().catch(console.error)
  }

  return (
    <MainLayout>
      <div className="streamlined-start">
        <div className="single-button-hero" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <button className="btn-primary start-practice" onClick={handleStartSession}>
            Start
          </button>

          <button
            className="btn-tertiary"
            onClick={handleAdvancedOptions}
            onMouseEnter={handleAdvancedOptionsHover}
            onFocus={handleAdvancedOptionsHover}
          >
            Advanced Options
          </button>
        </div>
      </div>
    </MainLayout>
  )
})

export default HomePage

import { memo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStateAndActions } from '../hooks/useSessionContext'
import { useAppContext } from '../hooks/useAppContext'
import { useNavigationGuardContext } from '../hooks/useNavigationGuardContext'
import MainLayout from '../layouts/MainLayout'
import NewCardsPrompt from '../components/NewCardsPrompt'

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
  const [state, actions] = useSessionStateAndActions()
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

      // Handle new cards detection response
      if (response && 'type' in response && response.type === 'new_cards_detected') {
        // NewCardsPrompt will be shown automatically via state.newCardsDetection
        return
      }

      // Normal session response
      if (response && 'session_id' in response && response.session_id) {
        navigate(`/session/${response.session_id}`)
      }
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  const handleContinueWithNew = async () => {
    try {
      const response = await actions.beginAutoSession(selectedDomain?.id, true, false)
      if (response && 'session_id' in response && response.session_id) {
        navigate(`/session/${response.session_id}`)
      }
    } catch (error) {
      console.error('Failed to start session with new cards:', error)
    }
  }

  const handlePracticeOnly = async () => {
    try {
      const response = await actions.beginAutoSession(selectedDomain?.id, true, true)
      if (response && 'session_id' in response && response.session_id) {
        navigate(`/session/${response.session_id}`)
      }
    } catch (error) {
      console.error('Failed to start practice-only session:', error)
    }
  }

  const handleBrowseFirst = () => {
    if (state.newCardsDetection?.options.browse_first.sets_to_browse?.[0]) {
      const setName = state.newCardsDetection.options.browse_first.sets_to_browse[0]
      navigate(`/browse/${encodeURIComponent(setName)}`)
    }
  }

  const handleClosePrompt = () => {
    // Clear the new cards detection state
    actions.resetSessionUI()
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

      {/* New Cards Detection Prompt */}
      {state.newCardsDetection && (
        <NewCardsPrompt
          detection={state.newCardsDetection}
          onContinueWithNew={handleContinueWithNew}
          onPracticeOnly={handlePracticeOnly}
          onBrowseFirst={handleBrowseFirst}
          onCancel={handleClosePrompt}
        />
      )}
    </MainLayout>
  )
})

export default HomePage

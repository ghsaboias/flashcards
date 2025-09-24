import { memo, useEffect, useMemo, useState } from 'react'
import { useSessionStateAndActions } from '../hooks/useSessionContext'
import { useAppContext } from '../hooks/useAppContext'
import { useNavigate } from 'react-router-dom'
import { formatMultiSetLabel } from '../utils/hsk-label-utils'
import { countByDifficulty } from '../utils/session-utils'
import MainLayout from '../layouts/MainLayout'
import NewCardsPromptManager from '../components/NewCardsPromptManager'
import QuickStartSection from '../components/QuickStartSection'
import { PracticeModesSection } from '../components/home/PracticeModesSection'
import '../styles/home.css'

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
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

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


  const handleNetworkExploration = async () => {
    navigate('/network')
  }

  const selectedDifficulties = useMemo(() => {
    const values: Array<'easy' | 'medium' | 'hard'> = []
    if (state.diffEasy) values.push('easy')
    if (state.diffMedium) values.push('medium')
    if (state.diffHard) values.push('hard')
    return values
  }, [state.diffEasy, state.diffMedium, state.diffHard])

  const canStartByDifficulty = selectedDifficulties.length > 0

  const difficultyCounts = useMemo(() => {
    if (!state.difficultyRows || state.difficultyRows.length === 0) {
      return { easy: 0, medium: 0, hard: 0 }
    }
    return countByDifficulty(state.difficultyRows)
  }, [state.difficultyRows])


  const knowledgeGraphAvailable = selectedDomain?.id === 'chinese'

  const renderContent = () => {
    // Special flows that override the main page
    if (state.newCardsDetection) {
      return <NewCardsPromptManager />
    }


    // Main page structure - always show quick start first
    return (
      <>
        {/* Primary Action - Always Visible */}
        <QuickStartSection
          sessionState={state}
          actions={actions}
          selectedDomain={selectedDomain}
        />

        {/* Network Exploration for Chinese domain */}
        {knowledgeGraphAvailable && (
          <div className="knowledge-graph-cta">
            <button
              className="btn-secondary knowledge-graph-btn"
              onClick={handleNetworkExploration}
            >
              Explore Character Network
            </button>
          </div>
        )}

        {/* Advanced Options Toggle */}
        <div className="advanced-options-section">
          <button
            className="btn-tertiary advanced-toggle"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
          </button>

          {showAdvancedOptions && (
            <PracticeModesSection
              sessionState={state}
              actions={actions}
              canStartByDifficulty={canStartByDifficulty}
              difficultyCounts={difficultyCounts}
              getMultiSetLabel={() => formatMultiSetLabel(state.selectedSets)}
              onBackToSimple={() => setShowAdvancedOptions(false)}
              backLabel="← Hide Advanced Options"
            />
          )}
        </div>
      </>
    )
  }

  return (
    <MainLayout>
      {renderContent()}
    </MainLayout>
  )
})

export default HomePage

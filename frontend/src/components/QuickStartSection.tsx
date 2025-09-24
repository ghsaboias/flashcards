import React from 'react'
import type { Domain } from '../types/api-types'
import type { SessionState, SessionActions } from '../types/session-types'
import { useNavigate } from 'react-router-dom'

interface QuickStartSectionProps {
  sessionState: SessionState
  actions: SessionActions
  selectedDomain: Domain | null
}

export default function QuickStartSection({
  sessionState,
  actions,
  selectedDomain
}: QuickStartSectionProps) {
  const {
    beginAutoSession,
    beginConnectionAwareSession,
    setLearningMode
  } = actions
  const { learningMode } = sessionState
  const navigate = useNavigate()

  const isChineseDomain = selectedDomain?.id === 'chinese'
  const isSemanticMode = isChineseDomain && learningMode === 'connected'
  const hasAutoSwitchedRef = React.useRef(false)

  // Set default mode to connection-aware for Chinese domain
  React.useEffect(() => {
    if (isChineseDomain) {
      if (!hasAutoSwitchedRef.current && learningMode === 'random') {
        setLearningMode('connected')
        hasAutoSwitchedRef.current = true
      }
    } else {
      hasAutoSwitchedRef.current = false
    }
  }, [isChineseDomain, learningMode, setLearningMode])

  // Auto-select best cluster for semantic learning
  const selectBestCluster = () => {
    if (!sessionState.availableClusters.length) return null

    // Pick cluster with lowest completion percentage
    const incomplete = sessionState.availableClusters.filter(c => (c.completion || 0) < 0.9)
    if (incomplete.length > 0) {
      return incomplete.sort((a, b) => (a.completion || 0) - (b.completion || 0))[0].id
    }

    // Fallback to first available cluster
    return sessionState.availableClusters[0]?.id || null
  }

  const handleQuickStart = async () => {
    try {
      if (isSemanticMode) {
        // Auto-select best cluster and start semantic session
        const bestCluster = selectBestCluster()
        const result = await beginConnectionAwareSession(bestCluster || undefined)

        if (result && typeof result === 'object' && 'session_id' in result && result.session_id) {
          navigate(`/session/${result.session_id}`)
        }
        return
      }

      // Regular auto session
      const result = await beginAutoSession(selectedDomain?.id, false, false, learningMode === 'connected')
      if (result && typeof result === 'object' && 'session_id' in result && result.session_id) {
        navigate(`/session/${result.session_id}`)
      }
    } catch (error) {
      console.error('Failed to start session:', error)
      // Fallback to regular auto session
      const fallback = await beginAutoSession(selectedDomain?.id)
      if (fallback && typeof fallback === 'object' && 'session_id' in fallback && fallback.session_id) {
        navigate(`/session/${fallback.session_id}`)
      }
    }
  }

  const handleLearningModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMode = e.target.value as 'random' | 'connected'
    setLearningMode(newMode)
  }

  const connectionReady = true // Always ready - auto-select cluster if needed
  const buttonText = isSemanticMode ? 'Start Semantic Learning' : 'Start Practice'

  return (
    <section className="quick-start-section">
      <div className="quick-start-header">
        <h2>Ready to Practice?</h2>
      </div>

      {isChineseDomain && (
        <div className="learning-mode-selector">
          <fieldset className="mode-group">
            <legend>Learning Style</legend>
            <div className="mode-options">
              <label className="mode-option">
                <input
                  type="radio"
                  value="random"
                  checked={learningMode === 'random'}
                  onChange={handleLearningModeChange}
                />
                <span className="mode-label">Random Practice</span>
              </label>
              <label className="mode-option">
                <input
                  type="radio"
                  value="connected"
                  checked={learningMode === 'connected'}
                  onChange={handleLearningModeChange}
                />
                <span className="mode-label">Semantic Learning</span>
              </label>
            </div>
          </fieldset>
        </div>
      )}

      <div className="primary-action">
        <button
          className="btn-primary-large quick-start-button"
          onClick={handleQuickStart}
          disabled={!connectionReady}
        >
          {buttonText}
        </button>

        {isSemanticMode && !connectionReady && (
          <div className="loading-hint">
            Preparing semantic clusters...
          </div>
        )}
      </div>

    </section>
  )
}
import { useMemo, memo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStateAndActions } from '../hooks/useSessionContext'
import { countByDifficulty } from '../utils/session-utils'
import { formatMultiSetLabel } from '../utils/hsk-label-utils'
import MainLayout from '../layouts/MainLayout'

// Prefetch session flow components since practice leads to sessions
const prefetchSessionFlow = () => {
  return Promise.all([
    import('./SessionPage'),
    import('./CompletePage')
  ])
}

const PracticePage = memo(function PracticePage() {
  const [sessionState, actions] = useSessionStateAndActions()
  const navigate = useNavigate()

  const {
    sets,
    selectedSets,
    diffEasy,
    diffMedium,
    diffHard,
    difficultyRows
  } = sessionState

  const {
    setDiffEasy,
    setDiffMedium,
    setDiffHard,
    addSetToSelection,
    removeSetFromSelection
  } = actions

  // Prefetch session flow since this page leads to sessions
  useEffect(() => {
    const prefetchTimer = setTimeout(() => {
      prefetchSessionFlow().catch(console.error)
    }, 1000) // Delay to avoid blocking page render

    return () => clearTimeout(prefetchTimer)
  }, [])

  const selectedDifficulties = useMemo(() => {
    const vals: Array<'easy' | 'medium' | 'hard'> = []
    if (diffEasy) vals.push('easy')
    if (diffMedium) vals.push('medium')
    if (diffHard) vals.push('hard')
    return vals
  }, [diffEasy, diffMedium, diffHard])

  const canStartByDifficulty = selectedDifficulties.length > 0

  const difficultyCounts = useMemo(() => {
    if (!difficultyRows || difficultyRows.length === 0) {
      return { easy: 0, medium: 0, hard: 0 }
    }
    return countByDifficulty(difficultyRows)
  }, [difficultyRows])

  const getMultiSetLabel = () => formatMultiSetLabel(selectedSets)

  const handleStartSession = async (mode: string) => {
    try {
      switch (mode) {
        case 'browse':
          navigate(`/browse/${selectedSets[0] || ''}`)
          return
        case 'drawing':
          navigate(`/drawing/${selectedSets[0] || ''}`)
          return
        case 'stats':
          navigate('/stats')
          return
        case 'practice':
          await actions.beginMultiSetSession()
          break
        case 'difficult':
          await actions.beginMultiSetDifficult()
          break
        case 'srs':
          await actions.beginMultiSetSrs()
          break
        default:
          return
      }

      if (sessionState.sessionId) {
        navigate(`/session/${sessionState.sessionId}`)
      }
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  return (
    <MainLayout>
      <div className="section">
        <button
          className="btn-tertiary"
          onClick={() => navigate('/')}
          style={{ marginBottom: '16px' }}
        >
          ← Back to Simple
        </button>

        <div className="group">
          <div className="multi-set-selection">
            <div className="selected-sets">
              <strong>Selected Sets:</strong> {getMultiSetLabel()}
            </div>
            <div className="set-list">
              {Array.isArray(sets) && sets.map((s) => (
                <label key={s} className="checkbox">
                  <input
                    type="checkbox"
                    checked={selectedSets.includes(s)}
                    onChange={(e) => e.target.checked ? addSetToSelection(s) : removeSetFromSelection(s)}
                  />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <fieldset className="group">
          <legend>Difficulty</legend>
          <div className="row" role="group" aria-label="Select difficulties">
            <label className="radio">
              <input type="checkbox" checked={diffHard} onChange={(e) => setDiffHard(e.target.checked)} />
              <span className="statusPill hard"><span className="dot" />Hard</span>
            </label>
            <label className="radio">
              <input type="checkbox" checked={diffMedium} onChange={(e) => setDiffMedium(e.target.checked)} />
              <span className="statusPill medium"><span className="dot" />Medium</span>
            </label>
            <label className="radio">
              <input type="checkbox" checked={diffEasy} onChange={(e) => setDiffEasy(e.target.checked)} />
              <span className="statusPill easy"><span className="dot" />Easy</span>
            </label>
          </div>
          <div className="muted" style={{ marginTop: 4 }}>
            {(() => {
              const parts: string[] = []
              if (diffHard) parts.push(`${difficultyCounts.hard} hard`)
              if (diffMedium) parts.push(`${difficultyCounts.medium} medium`)
              if (diffEasy) parts.push(`${difficultyCounts.easy} easy`)
              const text = parts.length > 0 ? parts.join('; ') : 'None selected'
              return <>Selected questions: {text}</>
            })()}
          </div>
        </fieldset>

        <div className="row">
          <button
            className="btn-primary"
            onClick={() => handleStartSession('browse')}
            disabled={selectedSets.length === 0}
          >
            Start Review
          </button>
          <button
            className="btn-primary"
            onClick={() => handleStartSession('practice')}
            disabled={selectedSets.length === 0}
          >
            Start Practice
          </button>
          <button
            className="btn-secondary"
            onClick={() => handleStartSession('difficult')}
            disabled={selectedSets.length === 0 || !canStartByDifficulty}
          >
            Practice by Difficulty
          </button>
          <button
            className="btn-secondary"
            title="Spaced Repetition System"
            onClick={() => handleStartSession('srs')}
            disabled={selectedSets.length === 0}
          >
            Practice SRS
          </button>
          <button
            className="btn-secondary"
            title="Draw characters within their outlines"
            onClick={() => handleStartSession('drawing')}
            disabled={selectedSets.length === 0}
          >
            Practice Drawing
          </button>
          <button
            className="btn-tertiary"
            title="View performance analytics"
            onClick={() => handleStartSession('stats')}
          >
            View Performance
          </button>
        </div>
      </div>
    </MainLayout>
  )
})

export default PracticePage
import { useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStateAndActions } from '../hooks/useSessionContext'
import { useAppContext } from '../hooks/useAppContext'
import { formatMultiSetLabel } from '../utils/hsk-label-utils'
import MainLayout from '../layouts/MainLayout'

const CompletePage = memo(function CompletePage() {
  const navigate = useNavigate()
  const { selectedDomain } = useAppContext()
  const [sessionState, actions] = useSessionStateAndActions()

  const {
    results,
    progress,
    selectedSets,
    isHighIntensityMode
  } = sessionState

  const {
    beginAutoSession,
    beginMultiSetSession,
    beginReviewIncorrect
  } = actions

  const summaryStats = useMemo(() => {
    const total = results.length
    const correct = results.filter(r => r.correct).length
    const incorrect = total - correct
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
    return { total, correct, incorrect, accuracy }
  }, [results])

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  const getMultiSetLabel = () => formatMultiSetLabel(selectedSets)

  const handleNewSession = async () => {
    const response = await beginAutoSession(selectedDomain?.id)
    if (response && 'session_id' in response && response.session_id) {
      navigate(`/session/${response.session_id}`)
    }
  }

  const handleReviewIncorrect = async () => {
    const response = await beginReviewIncorrect()
    if (response?.session_id) {
      navigate(`/session/${response.session_id}`)
    }
  }

  const handleRestartPractice = async () => {
    const response = await beginMultiSetSession()
    if (response?.session_id) {
      navigate(`/session/${response.session_id}`)
    }
  }

  const handleViewStats = () => {
    navigate('/stats')
  }

  // If no results, redirect to home
  if (!results || results.length === 0) {
    return (
      <MainLayout>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>No session results found.</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Start New Session
          </button>
        </div>
      </MainLayout>
    )
  }

  if (isHighIntensityMode) {
    return (
      <MainLayout showNavigation={false}>
        <div className="high-intensity-complete">
          <h2>🎯 Session Complete</h2>
          <div className="quick-stats">
            <span className={summaryStats.accuracy >= 80 ? 'good' : summaryStats.accuracy >= 60 ? 'ok' : 'needs-work'}>
              {summaryStats.accuracy}% accuracy
            </span>
            <span>{summaryStats.correct}/{summaryStats.total} correct</span>
          </div>

          {results.some(r => !r.correct) ? (
            <div className="knowledge-gaps">
              <h3>🔍 Concepts to Master</h3>
              <div className="gap-list">
                {results.filter(r => !r.correct).map((r, i) => (
                  <div key={i} className="gap-item">
                    <span className="question">{r.question}</span>
                    <span className="answer">→ {r.correct_answer}</span>
                  </div>
                ))}
              </div>
              <button className="btn-primary reinforcement-btn" onClick={handleReviewIncorrect}>
                🚀 Quick Reinforcement
              </button>
            </div>
          ) : (
            <div className="perfect-session">
              <h3>🎉 Perfect Session!</h3>
              <p>All concepts mastered. Ready for new challenges?</p>
            </div>
          )}

          <div className="next-actions">
            <button className="btn-primary" onClick={handleNewSession}>Continue Practice</button>
            <button className="btn-secondary" onClick={() => navigate('/practice')}>View Details</button>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="completePanel" role="region" aria-label="Session complete">
        <h3 className="completeTitle">
          Session Complete — {getMultiSetLabel()}
        </h3>

        <div className="progress" aria-label={`Progress ${progress.current} of ${progress.total}`}>
          Progress: {progress.current}/{progress.total}
        </div>
        <div className="progressBar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
          <div className="progressFill" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="kpis">
          <div className="kpi">
            <div className="value">{summaryStats.accuracy}%</div>
            <div className="label">Accuracy</div>
          </div>
          <div className="kpi">
            <div className="value">{summaryStats.correct}</div>
            <div className="label">Correct</div>
          </div>
          <div className="kpi">
            <div className="value">{summaryStats.incorrect}</div>
            <div className="label">Incorrect</div>
          </div>
        </div>

        <div className="next-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
          <button className="btn-primary" onClick={handleNewSession}>
            New Session
          </button>
          <button className="btn-secondary" onClick={handleRestartPractice}>
            Restart Practice
          </button>
          <button className="btn-secondary" onClick={handleReviewIncorrect} disabled={summaryStats.incorrect === 0}>
            Review Incorrect
          </button>
          <button className="btn-tertiary" onClick={handleViewStats}>
            View Stats
          </button>
        </div>
      </div>
    </MainLayout>
  )
})

export default CompletePage

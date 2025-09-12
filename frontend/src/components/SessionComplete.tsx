import { useMemo } from 'react'
import type { SessionState, SessionActions } from './SessionManager'

interface SessionCompleteProps {
  sessionState: SessionState
  actions: SessionActions
  canStartByDifficulty: boolean
  humanizeSetLabel: (raw: string) => string
  humanizeCategoryLabel: (raw: string) => string
  getMultiSetLabel: () => string
}

export default function SessionComplete({ 
  sessionState, 
  actions, 
  canStartByDifficulty,
  humanizeSetLabel,
  humanizeCategoryLabel,
  getMultiSetLabel
}: SessionCompleteProps) {
  const {
    results,
    progress,
    selectedSet,
    selectedCategory,
    selectedSets,
    mode,
    isHighIntensityMode
  } = sessionState

  const {
    beginAutoSession,
    beginSetSession,
    beginCategorySession,
    beginMultiSetSession,
    beginReviewIncorrect,
    beginDifficultSet,
    beginDifficultCategory,
    beginMultiSetDifficult,
    setIsHighIntensityMode,
    viewStats,
    viewSrs,
    viewPerformance
  } = actions

  const summaryStats = useMemo(() => {
    const total = results.length
    const correct = results.filter(r => r.correct).length
    const incorrect = total - correct
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
    return { total, correct, incorrect, accuracy }
  }, [results])

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  const restartPractice = () => {
    if (mode === 'set') return beginSetSession()
    if (mode === 'category') return beginCategorySession()
    if (mode === 'multi-set') return beginMultiSetSession()
  }

  const practiceDifficultNow = () => {
    if (mode === 'set') return beginDifficultSet()
    if (mode === 'category') return beginDifficultCategory()
    if (mode === 'multi-set') return beginMultiSetDifficult()
  }

  if (isHighIntensityMode) {
    return (
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
            <button className="btn-primary reinforcement-btn" onClick={beginReviewIncorrect}>
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
          <button className="btn-primary" onClick={beginAutoSession}>Continue Practice</button>
          <button className="btn-secondary" onClick={() => setIsHighIntensityMode(false)}>View Details</button>
        </div>
      </div>
    )
  }

  return (
    <div className="completePanel" role="region" aria-label="Session complete">
      <h3 className="completeTitle">
        Session Complete {
          mode === 'set' ? `— ${humanizeSetLabel(selectedSet)}` :
          mode === 'category' ? `— ${humanizeCategoryLabel(selectedCategory)}` :
          `— ${getMultiSetLabel()}`
        }
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
          <div className="value ok">{summaryStats.correct}</div>
          <div className="label">Correct</div>
        </div>
        <div className="kpi">
          <div className="value bad">{summaryStats.incorrect}</div>
          <div className="label">Incorrect</div>
        </div>
        <div className="kpi">
          <div className="value">{summaryStats.total}</div>
          <div className="label">Total</div>
        </div>
      </div>

      {results.some(r => !r.correct) ? (
        <div className="incorrectBlock">
          <h4>Review Incorrect</h4>
          <table className="statsTable">
            <thead>
              <tr>
                <th>#</th>
                <th>Question</th>
                <th>Pinyin</th>
                <th>Meaning (Correct)</th>
                <th>Your Answer</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => !r.correct ? (
                <tr key={`inc-${i}`}>
                  <td>{i + 1}</td>
                  <td>{r.question}</td>
                  <td className="muted">{r.pinyin || ''}</td>
                  <td title="Correct answer">{r.correct_answer}</td>
                  <td className="bad" title="Your answer">{r.user_answer || '—'}</td>
                </tr>
              ) : null)}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="muted" style={{ marginTop: 12 }}>
          Perfect run — no incorrect answers 🎉
        </div>
      )}

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn-primary" onClick={restartPractice}>
          Restart
        </button>
        <button 
          className="btn-secondary" 
          onClick={beginReviewIncorrect} 
          disabled={!results.some(r => !r.correct)}
        >
          Review Incorrect
        </button>
        <button 
          className="btn-secondary" 
          onClick={practiceDifficultNow} 
          disabled={
            (mode === 'set' ? !selectedSet :
             mode === 'category' ? !selectedCategory :
             selectedSets.length === 0) || !canStartByDifficulty
          }
        >
          Practice by Difficulty
        </button>
        <button className="btn-tertiary" onClick={viewStats}>
          View Stats
        </button>
        <button className="btn-tertiary" onClick={viewSrs}>
          View SRS
        </button>
        <button className="btn-tertiary" onClick={viewPerformance}>
          View Performance
        </button>
      </div>
    </div>
  )
}
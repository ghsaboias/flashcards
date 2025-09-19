import type { SessionState } from '../types/session-types'
import UnifiedTable from './UnifiedTable'
import DrawingCanvas from './DrawingCanvas'
import { hasChinese } from '../utils/pinyin'

interface StatsOverviewProps {
  sessionState: SessionState
  humanizeSetLabel: (raw: string) => string
  humanizeCategoryLabel: (raw: string) => string
  getMultiSetLabel: () => string
  speak: (text: string) => void
  exitBrowse: () => void
  nextBrowse: () => void
  prevBrowse: () => void
  setInDrawingMode: (enabled: boolean) => void
  setDrawingProgress: (progress: { current: number; total: number }) => void
  onDrawingComplete: (nextPos: number, total: number) => void
}

export default function StatsOverview({ 
  sessionState, 
  humanizeSetLabel, 
  humanizeCategoryLabel, 
  getMultiSetLabel,
  speak,
  exitBrowse,
  nextBrowse,
  prevBrowse,
  setInDrawingMode,
  setDrawingProgress,
  onDrawingComplete
}: StatsOverviewProps) {
  const {
    mode,
    selectedSet,
    selectedCategory,
    inDrawingMode,
    drawingCards,
    drawingPosition,
    drawingProgress,
    inBrowseMode,
    browseRows,
    browseIndex,
    browsePinyin,
    showPerformance,
    performance,
    srsRows,
    stats
  } = sessionState

  // Get due count for SRS  
  // const dueNowCount = 0 // Placeholder - would need to implement SRS due logic

  if (inDrawingMode) {
    const total = drawingCards.length
    const current = total > 0 ? drawingCards[drawingPosition] : null
    
    const handleProgressUpdate = () => {
      // This is just for the canvas drawing percentage, not session progress
    }
    
    const handleComplete = () => {
      const nextPos = drawingPosition + 1
      setDrawingProgress({ current: nextPos, total })
      onDrawingComplete(nextPos, total)
    }

    return (
      <div className="statsPanel" style={{ marginTop: 8 }}>
        <div className="metaRow">
          <h3>Practice Drawing {
            mode === 'set' ? `— ${humanizeSetLabel(selectedSet)}` :
            mode === 'category' ? `— ${humanizeCategoryLabel(selectedCategory)}` :
            `— ${getMultiSetLabel()}`
          }</h3>
          <div className="muted">{total > 0 ? `${drawingPosition + 1}/${total}` : '0/0'}</div>
        </div>
        
        {/* Session progress */}
        <div style={{ marginBottom: 16 }}>
          <div className="progress" aria-label={`Session Progress ${drawingProgress.current} of ${drawingProgress.total}`}>
            Session Progress: {drawingProgress.current}/{drawingProgress.total}
          </div>
          <div className="progressBar" role="progressbar" aria-valuemin={0} aria-valuemax={100} 
               aria-valuenow={drawingProgress.total > 0 ? Math.round((drawingProgress.current / drawingProgress.total) * 100) : 0}>
            <div className="progressFill" style={{ 
              width: `${drawingProgress.total > 0 ? Math.round((drawingProgress.current / drawingProgress.total) * 100) : 0}%` 
            }} />
          </div>
        </div>

        {current ? (
          <div>
            <div style={{ fontSize: 24, marginBottom: 16, textAlign: 'center' }}>
              Draw: <strong>{current.question}</strong>
            </div>
            <div style={{ fontSize: 16, marginBottom: 16, textAlign: 'center', color: '#666' }}>
              Meaning: {current.answer}
            </div>
            <DrawingCanvas 
              character={current.question}
              onProgressUpdate={handleProgressUpdate}
              onComplete={handleComplete}
            />
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 8 }}>No Chinese characters found</div>
        )}

        <div className="row" style={{ marginTop: 12 }}>
          <button 
            className="btn-tertiary" 
            onClick={() => setInDrawingMode(false)}
          >
            Exit Drawing
          </button>
        </div>
      </div>
    )
  }

  if (inBrowseMode) {
    const total = browseRows.length
    const i = Math.min(Math.max(browseIndex, 0), Math.max(0, total - 1))
    const current = total > 0 ? browseRows[i] : null

    return (
      <div className="statsPanel" style={{ marginTop: 8 }}>
        <div className="metaRow">
          <h3>Review {
            mode === 'set' ? `— ${humanizeSetLabel(selectedSet)}` :
            mode === 'category' ? `— ${humanizeCategoryLabel(selectedCategory)}` :
            `— ${getMultiSetLabel()}`
          }</h3>
          <div className="muted">{total > 0 ? `${i + 1}/${total}` : '0/0'}</div>
        </div>

        {current ? (
          <div className="questionWrap">
            <div className={`question ${hasChinese(current.question) ? 'zh' : ''}`} lang={hasChinese(current.question) ? 'zh' : undefined}>
              {current.question}
            </div>
            {browsePinyin && (
              <div className="pinyin" style={{ color: '#9da7b3' }}>{browsePinyin}</div>
            )}
            <div style={{ fontSize: 18, marginTop: 16 }}>{current.answer}</div>
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 8 }}>No items</div>
        )}

        <div className="row" style={{ marginTop: 12 }}>
          <button onClick={prevBrowse} disabled={i <= 0}>Prev</button>
          <button onClick={nextBrowse} disabled={i >= total - 1}>Next</button>
          {current && hasChinese(current.question) && (
            <button aria-label="Play audio (R)" title="Play audio (R)" onClick={() => speak(current.question)}>🔊</button>
          )}
          <button className="btn-tertiary" onClick={exitBrowse}>Exit Review</button>
        </div>
      </div>
    )
  }

  if (showPerformance) {
    return (
      <div className="statsPanel" style={{ marginTop: 8 }}>
        <div className="metaRow">
          <h3>📊 Performance Analytics</h3>
          {performance && <div className="muted">{performance.summary.overall_accuracy}% overall accuracy</div>}
        </div>

        {performance && (
          <div className="panelSubtext muted">
            <div>
              Sessions: <strong>{performance.summary.total_sessions}</strong> · Questions: <strong>{performance.summary.total_questions}</strong> · Study Days: <strong>{performance.summary.study_days}</strong>
            </div>
            <div>
              Avg Questions/Session: <strong>{performance.summary.avg_questions_per_session}</strong> · Overall Accuracy: <strong>{performance.summary.overall_accuracy}%</strong>
            </div>
          </div>
        )}

        {performance && performance.daily.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: 14, marginBottom: 8 }}>Daily Performance</h4>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="statsTable">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Sessions</th>
                    <th>Questions</th>
                    <th>Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.daily.slice(-20).map((day, i) => (
                    <tr key={i}>
                      <td>{day.date}</td>
                      <td>{day.sessions}</td>
                      <td>{day.questions}</td>
                      <td className={day.accuracy >= 90 ? 'ok' : day.accuracy >= 80 ? '' : 'bad'}>
                        {day.accuracy.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Always show unified SRS & Stats table when data is available
  if (stats || srsRows.length > 0) {
    const title = 'SRS & Stats'
    const subtitle = stats ? `${stats.summary.accuracy}% accuracy` : srsRows.length > 0 ? `${srsRows.length} items` : ''
    
    return (
      <div className="statsPanel" style={{ marginTop: 8 }}>
        <div className="metaRow">
          <h3>{title} {
            mode === 'set' ? `— ${humanizeSetLabel(selectedSet)}` :
            mode === 'category' ? `— ${humanizeCategoryLabel(selectedCategory)}` :
            `— ${getMultiSetLabel()}`
          }</h3>
          <div className="muted">{subtitle}</div>
        </div>

        {stats && (
          <div className="panelSubtext muted" style={{ marginBottom: 16 }}>
            <div>
              <strong>{stats.summary.accuracy}% accuracy</strong> · Correct: {stats.summary.correct} · Incorrect: {stats.summary.incorrect} · Attempts: {stats.summary.total}
            </div>
            <div>
              Cards: {stats.summary.total_cards} · Attempted: {stats.summary.attempted_cards} · Difficult (&lt;80%): {stats.summary.difficult_count}
            </div>
          </div>
        )}

        {/* Due cards preview */}
        <div style={{
          padding: '12px 16px',
          margin: '0 0 16px 0',
          background: 'var(--panel)',
          borderRadius: '6px',
          textAlign: 'center',
          fontSize: '14px',
          color: 'var(--muted)'
        }}>
          450 cards due now
        </div>

        <UnifiedTable
          srsRows={srsRows.length > 0 ? srsRows : undefined}
          statsRows={stats ? stats.rows || [] : undefined}
        />
      </div>
    )
  }

  return null
}
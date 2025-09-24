import { useRef, useEffect, useState } from 'react'
import type { PracticeSessionProps } from '../types/component-props'
import { hasChinese } from '../utils/pinyin'
import { formatSessionDuration } from '../utils/timer-utils'
import { humanizeSetLabel } from '../utils/hsk-label-utils'
import MiniNetworkViewer from './MiniNetworkViewer'

export default function PracticeSession({ sessionState, actions, canAnswer, speak }: PracticeSessionProps) {
  const {
    question,
    pinyin,
    progress,
    input,
    lastEval,
    streak,
    bestStreak,
    isHighIntensityMode,
    adaptiveFeedbackDuration,
    sessionStartTime,
    currentCardSet,
    showPinyin
  } = sessionState

  const { setInput, submitAnswer, setIsHighIntensityMode, setShowPinyin } = actions

  const inputRef = useRef<HTMLInputElement | null>(null)
  const [sessionTimer, setSessionTimer] = useState("")
  
  // Auto-focus input field when a new question loads
  useEffect(() => {
    if (question && canAnswer && inputRef.current) {
      inputRef.current.focus()
    }
  }, [question, canAnswer])

  // Update session timer every second
  useEffect(() => {
    if (!sessionStartTime) return

    const updateTimer = () => {
      setSessionTimer(formatSessionDuration(sessionStartTime))
    }

    updateTimer() // Initial update
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [sessionStartTime])

  // Auto-hide feedback with adaptive duration
  useEffect(() => {
    if (!lastEval) return
    const id = window.setTimeout(() => {
      // Clear feedback - this would need to be handled by the parent
    }, adaptiveFeedbackDuration)
    return () => window.clearTimeout(id)
  }, [lastEval, adaptiveFeedbackDuration])

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <>
      {isHighIntensityMode && (
        <div className="high-intensity-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          fontSize: '14px',
          color: '#666'
        }}>
          <div className="session-timer">⏱️ {sessionTimer}</div>
          <div className="minimal-progress">{progress.current}/{progress.total} · {progress.total - progress.current} left</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {pinyin && hasChinese(question) && (
              <button
                className={`btn-tertiary ${showPinyin ? 'active' : ''}`}
                onClick={() => setShowPinyin(!showPinyin)}
                title={showPinyin ? 'Hide pinyin' : 'Show pinyin'}
                style={{ fontSize: '12px', padding: '2px 6px' }}
              >
                拼
              </button>
            )}
            {currentCardSet && <div className="card-set">{humanizeSetLabel(currentCardSet)}</div>}
          </div>
        </div>
      )}
      
      <div className={isHighIntensityMode ? "high-intensity-question" : ""}>
        {!isHighIntensityMode && (
          <>
            <div className="progress" aria-label={`Progress ${progress.current} of ${progress.total}`}>
              Progress: {progress.current}/{progress.total}
            </div>
            <div className="progressBar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
              <div className="progressFill" style={{ width: `${progressPercent}%` }} />
            </div>
          </>
        )}
        
        {!isHighIntensityMode && (
          <div className="metaRow">
            <div className="streak">
              🔥 Streak: {streak} <span className="muted">(Best {bestStreak})</span>
            </div>
          </div>
        )}
        
        <div className="questionWrap">
          <div className={`question ${hasChinese(question) ? 'zh' : ''}`} lang={hasChinese(question) ? 'zh' : undefined}>
            {question || 'No active question'}
          </div>
          {pinyin && showPinyin && hasChinese(question) && (
            <div className="pinyin" style={{ color: '#9da7b3', marginTop: 8 }}>{pinyin}</div>
          )}

          {/* Mini-network viewer for connection-aware sessions */}
          {sessionState.connection_session && question && hasChinese(question) && (
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
              <MiniNetworkViewer
                currentCharacter={question}
                connections={sessionState.connection_session.connections || []}
              />
            </div>
          )}
        </div>
        
        {canAnswer && (
          <div className="row">
            <input
              ref={inputRef}
              placeholder="Your answer"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitAnswer() }}
              type="text"
              aria-label="Your answer"
              autoFocus
            />
            <button onClick={submitAnswer} disabled={!input.trim()}>Submit</button>
            
            {hasChinese(question) && (
              <button
                aria-label="Play audio (R)"
                title="Play audio (R)"
                onClick={() => speak(question)}
              >
                🔊
              </button>
            )}

            {!isHighIntensityMode && pinyin && hasChinese(question) && (
              <button
                className={`btn-tertiary ${showPinyin ? 'active' : ''}`}
                onClick={() => setShowPinyin(!showPinyin)}
                title={showPinyin ? 'Hide pinyin' : 'Show pinyin'}
                style={{ fontSize: '12px' }}
              >
                拼音
              </button>
            )}
            
            {isHighIntensityMode && (
              <button className="btn-tertiary" onClick={() => setIsHighIntensityMode(false)}>
                Exit
              </button>
            )}
            
            {lastEval && (
              <div className={`feedback ${lastEval.correct ? 'ok' : 'bad'}`} aria-live="polite">
                {lastEval.correct ? 'Correct!' : `Incorrect. Correct: ${lastEval.correct_answer}`}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
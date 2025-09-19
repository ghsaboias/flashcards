import { useRef, useEffect } from 'react'
import type { PracticeSessionProps } from '../types/component-props'
import { hasChinese } from '../utils/pinyin'

export default function PracticeSession({ sessionState, actions, canAnswer, speak }: PracticeSessionProps) {
  const {
    question,
    pinyin,
    progress,
    input,
    lastEval,
    streak,
    bestStreak,
    oldFocusMode,
    isHighIntensityMode,
    adaptiveFeedbackDuration
  } = sessionState
  
  const { setInput, submitAnswer, setOldFocusMode, setIsHighIntensityMode } = actions
  
  const inputRef = useRef<HTMLInputElement | null>(null)
  
  // Auto-focus input field when a new question loads
  useEffect(() => {
    if (question && canAnswer && inputRef.current) {
      inputRef.current.focus()
    }
  }, [question, canAnswer])

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
        <div className="minimal-progress">
          {progress.current}/{progress.total}
        </div>
      )}
      
      <div className={isHighIntensityMode ? "high-intensity-question" : ""}>
        {!isHighIntensityMode && !oldFocusMode && (
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
            {!oldFocusMode && (
              <div className="streak">
                🔥 Streak: {streak} <span className="muted">(Best {bestStreak})</span>
              </div>
            )}
            
            
            <button 
              onClick={() => setOldFocusMode(!oldFocusMode)}
              className="btn-tertiary"
              style={{ fontSize: '12px', padding: '4px 8px' }}
              title={oldFocusMode ? "Exit focus mode" : "Enter focus mode"}
            >
              {oldFocusMode ? '👁️ Exit Focus' : '🎯 Focus'}
            </button>
          </div>
        )}
        
        <div className="questionWrap">
          <div className={`question ${hasChinese(question) ? 'zh' : ''}`} lang={hasChinese(question) ? 'zh' : undefined}>
            {question || 'No active question'}
          </div>
          {pinyin && !oldFocusMode && !isHighIntensityMode && (
            <div className="pinyin" style={{ color: '#9da7b3', marginTop: 8 }}>{pinyin}</div>
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
import { useMemo, useRef, useEffect, useState } from 'react'
import './styles/index.css'
import { useSessionManager } from './hooks/useSessionManager'
import { SessionProvider } from './contexts/SessionContext'
import PracticeSession from './components/PracticeSession'
import SessionComplete from './components/SessionComplete'
import HighIntensityMode from './components/HighIntensityMode'
import TraditionalModes from './components/TraditionalModes'
import DomainSelector from './components/DomainSelector'
import StatsOverview from './components/StatsOverview'
import KeyboardHandler from './components/KeyboardHandler'
import { useAudioControls } from './hooks/useAudioControls'
import { AutoTTS } from './components/AudioControls'
import { hasChinese } from './utils/pinyin'
import { humanizeSetLabel, formatMultiSetLabel } from './utils/hsk-label-utils'
import { countByDifficulty, isSessionComplete } from './utils/session-utils'
import type { Domain } from './types/api-types'

function App() {
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null)
  const [sessionState, actions] = useSessionManager(selectedDomain)
  const { speak } = useAudioControls()
  const summaryRef = useRef<HTMLDivElement | null>(null)
  const previousResultsLengthRef = useRef<number>(0)

  // Computed values
  const canAnswer = useMemo(() => (
    !!sessionState.sessionId && !!sessionState.question
  ), [sessionState.sessionId, sessionState.question])

  const sessionComplete = useMemo(() =>
    isSessionComplete(sessionState.progress, sessionState.results)
  , [sessionState.progress, sessionState.results])

  const selectedDifficulties = useMemo(() => {
    const vals: Array<'easy' | 'medium' | 'hard'> = []
    if (sessionState.diffEasy) vals.push('easy')
    if (sessionState.diffMedium) vals.push('medium')
    if (sessionState.diffHard) vals.push('hard')
    return vals
  }, [sessionState.diffEasy, sessionState.diffMedium, sessionState.diffHard])

  const canStartByDifficulty = selectedDifficulties.length > 0

  const difficultyCounts = useMemo(() => {
    if (!sessionState.difficultyRows || sessionState.difficultyRows.length === 0) {
      return { easy: 0, medium: 0, hard: 0 }
    }
    return countByDifficulty(sessionState.difficultyRows)
  }, [sessionState.difficultyRows])

  // Auto-scroll session summary when new rows are added
  useEffect(() => {
    const container = summaryRef.current
    if (!container) return
    if (sessionState.results.length > previousResultsLengthRef.current) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
    }
    previousResultsLengthRef.current = sessionState.results.length
  }, [sessionState.results])


  // Use consolidated utility for multi-set label formatting
  function getMultiSetLabel(): string {
    return formatMultiSetLabel(sessionState.selectedSets)
  }


  const onDrawingComplete = (nextPos: number, total: number) => {
    if (nextPos >= total) {
      // Drawing session complete
      actions.setInDrawingMode(false)
      // Set completion results
      // setResults([{ /* completion data */ }])
    } else {
      actions.setDrawingPosition(nextPos)
    }
  }

  return (
    <SessionProvider sessionState={sessionState} actions={actions} speak={speak}>
      <div className={`container ${sessionState.isHighIntensityMode ? 'high-intensity' : ''}`}>
        {/* Auto TTS for Chinese characters */}
        <AutoTTS
          text={sessionState.question}
          enabled={hasChinese(sessionState.question)}
          speak={speak}
        />

        {/* Keyboard shortcuts handler */}
        <KeyboardHandler sessionState={sessionState} actions={actions} speak={speak} />

      {!sessionState.isHighIntensityMode && (
        <div className="main-panel" role="main">
          <DomainSelector
            selectedDomain={selectedDomain}
            onDomainChange={setSelectedDomain}
          />
          
          <TraditionalModes
            sessionState={sessionState}
            actions={actions}
            canStartByDifficulty={canStartByDifficulty}
            difficultyCounts={difficultyCounts}
            getMultiSetLabel={getMultiSetLabel}
          />

          <div className="section summary" ref={summaryRef}>
            {sessionState.results.length > 0 && (
              <div>
                <h3>Session Summary</h3>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Question</th>
                      <th>Pinyin</th>
                      <th>Your Answer</th>
                      <th>Answer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionState.results.map((r, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{r.question}</td>
                        <td className="muted">{r.pinyin || ''}</td>
                        <td className={String(r.correct)}>
                          {r.correct ? '✓' : '✗'} {r.user_answer || '—'}
                        </td>
                        <td title="Correct answer">{r.correct_answer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {sessionState.isHighIntensityMode && !sessionState.sessionId && (
        <HighIntensityMode
          sessionState={sessionState}
          actions={actions}
          humanizeSetLabel={humanizeSetLabel}
          getMultiSetLabel={getMultiSetLabel}
          selectedDomain={selectedDomain}
          onDomainChange={setSelectedDomain}
        />
      )}

      <div className="right" role="region" aria-label="Session">
        <StatsOverview
          sessionState={sessionState}
          getMultiSetLabel={getMultiSetLabel}
          speak={speak}
          exitBrowse={actions.exitBrowse}
          nextBrowse={actions.nextBrowse}
          prevBrowse={actions.prevBrowse}
          setInDrawingMode={actions.setInDrawingMode}
          setDrawingProgress={actions.setDrawingProgress}
          onDrawingComplete={onDrawingComplete}
        />

        {sessionComplete ? (
          <SessionComplete
            sessionState={sessionState}
            actions={actions}
            canStartByDifficulty={canStartByDifficulty}
            getMultiSetLabel={getMultiSetLabel}
          />
        ) : (
          <PracticeSession
            sessionState={sessionState}
            actions={actions}
            canAnswer={canAnswer}
            speak={speak}
          />
        )}
        </div>
      </div>
    </SessionProvider>
  )
}

export default App
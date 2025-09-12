import { useMemo, useRef, useEffect } from 'react'
import './styles/index.css'
import { useSessionManager } from './components/SessionManager'
import PracticeSession from './components/PracticeSession'
import SessionComplete from './components/SessionComplete'
import HighIntensityMode from './components/HighIntensityMode'
import TraditionalModes from './components/TraditionalModes'
import StatsOverview from './components/StatsOverview'
import KeyboardHandler from './components/KeyboardHandler'
import { useAudioControls } from './hooks/useAudioControls'
import { AutoTTS } from './components/AudioControls'
import { getPinyinForText, hasChinese } from './utils/pinyin'

function App() {
  const [sessionState, actions] = useSessionManager()
  const { speak } = useAudioControls()
  const summaryRef = useRef<HTMLDivElement | null>(null)
  const previousResultsLengthRef = useRef<number>(0)

  // Computed values
  const canAnswer = useMemo(() => (
    (!!sessionState.sessionId || sessionState.inReviewMode) && !!sessionState.question
  ), [sessionState.sessionId, sessionState.inReviewMode, sessionState.question])


  const isSessionComplete = useMemo(() => (
    sessionState.progress.total > 0 && 
    sessionState.progress.current >= sessionState.progress.total && 
    sessionState.results.length > 0
  ), [sessionState.progress, sessionState.results])

  const selectedDifficulties = useMemo(() => {
    const vals: Array<'easy' | 'medium' | 'hard'> = []
    if (sessionState.diffEasy) vals.push('easy')
    if (sessionState.diffMedium) vals.push('medium')
    if (sessionState.diffHard) vals.push('hard')
    return vals
  }, [sessionState.diffEasy, sessionState.diffMedium, sessionState.diffHard])

  const canStartByDifficulty = selectedDifficulties.length > 0

  // Difficulty classification and counts  
  function classifyDifficulty(row: { total: number; accuracy: number }): 'easy' | 'medium' | 'hard' {
    const attempts = row.total || 0
    const accuracy = row.accuracy || 0
    if (attempts <= 10) return 'hard'
    if (accuracy > 90) return 'easy'
    if (accuracy > 80) return 'medium'
    return 'hard'
  }

  const difficultyCounts = useMemo(() => {
    const counts: Record<'easy' | 'medium' | 'hard', number> = { easy: 0, medium: 0, hard: 0 }
    if (!sessionState.difficultyRows || sessionState.difficultyRows.length === 0) return counts
    for (const r of sessionState.difficultyRows) {
      const d = classifyDifficulty({ total: r.total, accuracy: r.accuracy })
      counts[d]++
    }
    return counts
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

  // Fetch pinyin for browse mode question (client-side)
  useEffect(() => {
    if (!sessionState.inBrowseMode) return
    const q = sessionState.browseRows[sessionState.browseIndex]?.question
    if (!q || !hasChinese(q)) {
      // setBrowsePinyin("") - would need to add this to actions
      return
    }
    getPinyinForText(q).then(() => {
      // setBrowsePinyin(py) - would need to add this to actions
    }).catch(() => {
      // setBrowsePinyin('') - would need to add this to actions
    })
  }, [sessionState.inBrowseMode, sessionState.browseIndex, sessionState.browseRows])

  // Helper functions for display labels
  function humanizeSetLabel(raw: string): string {
    const trimmed = raw.replace('Recognition_Practice/', '')
    const parts = trimmed.split('/')
    if (parts.length === 2) {
      const [level, name] = parts
      const levelPretty = level
        .replace(/_/g, ' ')
        .replace(/HSK_Level_(\d+)/i, (_m, d) => `HSK ${d}`)
      const namePretty = name
        .replace(/HSK(\d+)_Set_0?(\d+)/i, (_m, _h, n) => `Set ${Number(n)}`)
        .replace(/_/g, ' ')
      return `${levelPretty} — ${namePretty}`
    }
    return trimmed.replace(/_/g, ' ')
  }

  function humanizeCategoryLabel(raw: string): string {
    return raw
      .replace(/_/g, ' ')
      .replace(/\b(hsk)\s*level\s*(\d+)/i, (_m, _h, d) => `HSK Level ${d}`)
      .replace(/\b(hsk)\s*(\d+)/i, (_m, _h, d) => `HSK ${d}`)
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  function getMultiSetLabel(): string {
    if (sessionState.selectedSets.length === 0) return 'No sets selected'
    if (sessionState.selectedSets.length === 1) return humanizeSetLabel(sessionState.selectedSets[0])
    
    // Parse sets and group by HSK level
    const setsByLevel: { [level: number]: number[] } = {}
    
    sessionState.selectedSets.forEach(setName => {
      // Extract HSK level and set number from raw set name
      const trimmed = setName.replace('Recognition_Practice/', '')
      const parts = trimmed.split('/')
      if (parts.length === 2) {
        const [level, name] = parts
        const levelMatch = level.match(/HSK_Level_(\d+)/i)
        const setMatch = name.match(/HSK\d+_Set_0?(\d+)/i)
        
        if (levelMatch && setMatch) {
          const hskLevel = parseInt(levelMatch[1])
          const setNumber = parseInt(setMatch[1])
          
          if (!setsByLevel[hskLevel]) {
            setsByLevel[hskLevel] = []
          }
          setsByLevel[hskLevel].push(setNumber)
        }
      }
    })
    
    // Format each level's sets
    const levelGroups: string[] = []
    
    Object.keys(setsByLevel)
      .map(k => parseInt(k))
      .sort((a, b) => a - b)
      .forEach(level => {
        const sets = setsByLevel[level].sort((a, b) => a - b)
        const ranges: string[] = []
        
        let start = sets[0]
        let end = sets[0]
        
        for (let i = 1; i < sets.length; i++) {
          if (sets[i] === end + 1) {
            end = sets[i]
          } else {
            // Add the current range
            if (start === end) {
              ranges.push(`S${start}`)
            } else {
              ranges.push(`S${start} - S${end}`)
            }
            start = sets[i]
            end = sets[i]
          }
        }
        
        // Add the final range
        if (start === end) {
          ranges.push(`S${start}`)
        } else {
          ranges.push(`S${start} - S${end}`)
        }
        
        levelGroups.push(`HSK L${level} ${ranges.join(', ')}`)
      })
    
    return levelGroups.join('; ')
  }

  // Additional handlers for StatsOverview
  const exitBrowse = () => {
    actions.setInDrawingMode(false)
    // Additional browse exit logic would go here
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
        <div className="main-panel" role="main" style={{ display: sessionState.oldFocusMode && (sessionState.sessionId || sessionState.inReviewMode) ? 'none' : 'block' }}>
          <h1>🇨🇳 HSK Flashcards</h1>
          
          <TraditionalModes
            sessionState={sessionState}
            actions={actions}
            canStartByDifficulty={canStartByDifficulty}
            difficultyCounts={difficultyCounts}
            humanizeSetLabel={humanizeSetLabel}
            humanizeCategoryLabel={humanizeCategoryLabel}
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

      {sessionState.isHighIntensityMode && !sessionState.sessionId && !sessionState.inReviewMode && (
        <HighIntensityMode
          sessionState={sessionState}
          actions={actions}
          humanizeSetLabel={humanizeSetLabel}
          getMultiSetLabel={getMultiSetLabel}
        />
      )}

      <div className="right" role="region" aria-label="Session">
        <StatsOverview
          sessionState={sessionState}
          humanizeSetLabel={humanizeSetLabel}
          humanizeCategoryLabel={humanizeCategoryLabel}
          getMultiSetLabel={getMultiSetLabel}
          speak={speak}
          exitBrowse={exitBrowse}
          nextBrowse={actions.nextBrowse}
          prevBrowse={actions.prevBrowse}
          setInDrawingMode={actions.setInDrawingMode}
          setDrawingProgress={actions.setDrawingProgress}
          onDrawingComplete={onDrawingComplete}
        />

        {isSessionComplete ? (
          <SessionComplete
            sessionState={sessionState}
            actions={actions}
            canStartByDifficulty={canStartByDifficulty}
            humanizeSetLabel={humanizeSetLabel}
            humanizeCategoryLabel={humanizeCategoryLabel}
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
  )
}

export default App
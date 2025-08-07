import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import type { SrsRow, StatsPayload } from './api'
import { answer, getSrsForCategory, getSrsForSet, getStatsForCategory, getStatsForSet, listCategories, listSets, startSession } from './api'
import SrsTable from './components/SrsTable'
import StatsTable from './components/StatsTable'

function App() {
  const [sets, setSets] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedSet, setSelectedSet] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [mode, setMode] = useState<'set' | 'category'>('set')
  const [sessionId, setSessionId] = useState<string>("")
  const [showSrs, setShowSrs] = useState<boolean>(false)
  const [srsRows, setSrsRows] = useState<SrsRow[]>([])
  const [showStats, setShowStats] = useState<boolean>(false)
  const [stats, setStats] = useState<StatsPayload | null>(null)
  const [question, setQuestion] = useState<string>("")
  const [pinyin, setPinyin] = useState<string>("")
  const [progress, setProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 })
  const [input, setInput] = useState<string>("")
  const [lastEval, setLastEval] = useState<{ correct: boolean; correct_answer: string } | null>(null)
  const [results, setResults] = useState<Array<{ question: string; user_answer: string; correct_answer: string; correct: boolean }>>([])
  const [streak, setStreak] = useState<number>(0)
  const [bestStreak, setBestStreak] = useState<number>(0)
  // Removed per request: previous answers panel
  const canAnswer = useMemo(() => !!sessionId && !!question, [sessionId, question])
  const progressPercent = useMemo(() => (
    progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
  ), [progress])
  const isSessionComplete = useMemo(() => (
    progress.total > 0 && progress.current >= progress.total && results.length > 0
  ), [progress, results])
  const summaryStats = useMemo(() => {
    const total = results.length
    const correct = results.filter(r => r.correct).length
    const incorrect = total - correct
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
    return { total, correct, incorrect, accuracy }
  }, [results])

  // Helpers for SRS due count
  function parseSrsDate(raw: string): Date | null {
    try {
      if (!raw || typeof raw !== 'string') return null
      if (raw.includes(' ')) {
        const [datePart, timePart] = raw.split(' ')
        const [y, m, d] = datePart.split('-').map((n) => parseInt(n, 10))
        const [hh = '0', mm = '0', ss = '0'] = timePart.split(':')
        if (isNaN(y) || isNaN(m) || isNaN(d)) return null
        return new Date(y, (m || 1) - 1, d || 1, parseInt(hh, 10) || 0, parseInt(mm, 10) || 0, parseInt(ss, 10) || 0)
      }
      const [y, m, d] = raw.split('-').map((n) => parseInt(n, 10))
      if (isNaN(y) || isNaN(m) || isNaN(d)) return null
      return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0)
    } catch {
      return null
    }
  }
  function isRowDueNow(row: SrsRow): boolean {
    if (!row.next_review_date) return false
    const t = parseSrsDate(row.next_review_date)
    if (!t) return false
    return t.getTime() <= Date.now()
  }
  const dueNowCount = useMemo(() => {
    if (!srsRows || srsRows.length === 0) return 0
    let count = 0
    for (const r of srsRows) if (isRowDueNow(r)) count++
    return count
  }, [srsRows])

  const voicesRef = useRef<SpeechSynthesisVoice[] | null>(null)
  const summaryRef = useRef<HTMLDivElement | null>(null)
  const previousResultsLengthRef = useRef<number>(0)
  const lastSpokenRef = useRef<{ text: string; ts: number } | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  useEffect(() => {
    function loadVoices() {
      const v = window.speechSynthesis.getVoices()
      voicesRef.current = v
    }
    loadVoices()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])

  function hasChinese(text: string) {
    return /[\u4e00-\u9fff]/.test(text)
  }

  function speak(text: string) {
    if (!text || !('speechSynthesis' in window)) return
    const utter = new SpeechSynthesisUtterance(text)
    const voices = voicesRef.current || window.speechSynthesis.getVoices()
    const zhVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('zh'))
    if (zhVoice) utter.voice = zhVoice
    utter.rate = 0.9
    utter.pitch = 1
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utter)
  }

  // Lightweight notification sound for correct answers
  function playCorrectChime() {
    try {
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!AC) return
      if (!audioCtxRef.current) audioCtxRef.current = new AC()
      const ctx = audioCtxRef.current!
      if (ctx.state === 'suspended') {
        // Resume on user gesture contexts (Safari/iOS)
        ctx.resume().catch(() => { /* noop */ })
      }

      const now = ctx.currentTime
      const gain = ctx.createGain()
      // Main gain should be audible; individual tones handle their own envelopes
      gain.gain.setValueAtTime(1, now)
      gain.connect(ctx.destination)

      // Simple two-tone chime
      const tone = (freq: number, start: number, dur: number) => {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + start)
        const g = ctx.createGain()
        g.gain.setValueAtTime(0, now + start)
        g.gain.linearRampToValueAtTime(0.2, now + start + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur)
        osc.connect(g)
        g.connect(gain)
        osc.start(now + start)
        osc.stop(now + start + dur)
        osc.onended = () => {
          osc.disconnect()
          g.disconnect()
        }
      }

      tone(660, 0, 0.15)
      tone(880, 0.12, 0.18)

      // Cleanup main gain shortly after
      const endAt = now + 0.12 + 0.18
      gain.gain.setValueAtTime(0, endAt)
      setTimeout(() => {
        try { gain.disconnect() } catch { /* noop */ }
      }, Math.ceil((endAt - ctx.currentTime) * 1000) + 50)
    } catch {
      // No audio available; ignore
    }
  }

  useEffect(() => {
    if (!question || !hasChinese(question)) return
    const now = Date.now()
    const last = lastSpokenRef.current
    // Guard to avoid duplicate TTS under React StrictMode double-invocation
    if (last && last.text === question && now - last.ts < 1000) return
    speak(question)
    lastSpokenRef.current = { text: question, ts: now }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'r' || e.key === 'R') {
        if (question && hasChinese(question)) speak(question)
      } else if (e.key === '1') {
        if (selectedSet) beginSetSession()
      } else if (e.key === '2') {
        if (selectedSet) beginDifficultSet()
      } else if (e.key === '3') {
        if (selectedSet) beginSrsSets()
      } else if (e.key === '4') {
        if (selectedCategory) beginCategorySession()
      } else if (e.key === '5') {
        if (selectedCategory) beginDifficultCategory()
      } else if (e.key === '6') {
        if (selectedCategory) beginSrsCategories()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [question, selectedSet, selectedCategory])

  // Auto-scroll session summary when new rows are added
  useEffect(() => {
    const container = summaryRef.current
    if (!container) return
    if (results.length > previousResultsLengthRef.current) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
    }
    previousResultsLengthRef.current = results.length
  }, [results])

  // Auto-hide feedback after 1 second
  useEffect(() => {
    if (!lastEval) return
    const id = window.setTimeout(() => setLastEval(null), 1000)
    return () => window.clearTimeout(id)
  }, [lastEval])

  // Keep SRS view in sync when mode or selection changes
  useEffect(() => {
    if (!showSrs) return
      ; (async () => {
        try {
          if (mode === 'set') {
            if (!selectedSet) return
            const rows = await getSrsForSet(selectedSet)
            setSrsRows(rows)
          } else {
            if (!selectedCategory) return
            const rows = await getSrsForCategory(selectedCategory)
            setSrsRows(rows)
          }
        } catch {
          setSrsRows([])
        }
      })()
  }, [showSrs, mode, selectedSet, selectedCategory])

  // Keep Stats view in sync when mode or selection changes
  useEffect(() => {
    if (!showStats) return
      ; (async () => {
        try {
          if (mode === 'set') {
            if (!selectedSet) return
            const res = await getStatsForSet(selectedSet)
            setStats(res)
          } else {
            if (!selectedCategory) return
            const res = await getStatsForCategory(selectedCategory)
            setStats(res)
          }
        } catch {
          setStats({
            summary: {
              correct: 0,
              incorrect: 0,
              total: 0,
              accuracy: 0,
              total_cards: 0,
              attempted_cards: 0,
              difficult_count: 0,
            },
            rows: [],
          })
        }
      })()
  }, [showStats, mode, selectedSet, selectedCategory])

  useEffect(() => {
    (async () => {
      const [s, c] = await Promise.all([listSets(), listCategories()])
      setSets(s)
      setCategories(c)
      if (s.length) setSelectedSet(s[0])
      if (c.length) setSelectedCategory(c[0])
    })()
  }, [])

  function resetSessionUI() {
    setSessionId("")
    setQuestion("")
    setProgress({ current: 0, total: 0 })
    setInput("")
    setLastEval(null)
    setResults([])
    setStreak(0)
    setBestStreak(0)
    // previous answers state removed
    setShowSrs(false)
    setSrsRows([])
    setShowStats(false)
    setStats(null)
  }

  async function beginSetSession() {
    resetSessionUI()
    const res = await startSession({ mode: 'set_all', set_name: selectedSet })
    setSessionId(res.session_id)
    setQuestion(res.card?.question || "")
    setPinyin(res.card?.pinyin || "")
    setProgress(res.progress)
  }

  async function beginCategorySession() {
    resetSessionUI()
    const res = await startSession({ mode: 'category_all', category: selectedCategory })
    setSessionId(res.session_id)
    setQuestion(res.card?.question || "")
    setPinyin(res.card?.pinyin || "")
    setProgress(res.progress)
  }

  async function beginDifficultSet() {
    resetSessionUI()
    const res = await startSession({ mode: 'difficult_set', set_name: selectedSet })
    setSessionId(res.session_id)
    setQuestion(res.card?.question || "")
    setPinyin(res.card?.pinyin || "")
    setProgress(res.progress)
  }

  async function beginDifficultCategory() {
    resetSessionUI()
    const res = await startSession({ mode: 'difficult_category', category: selectedCategory })
    setSessionId(res.session_id)
    setQuestion(res.card?.question || "")
    setPinyin(res.card?.pinyin || "")
    setProgress(res.progress)
  }

  async function beginSrsSets() {
    // Practice SRS: start a review session using due cards for the selected set
    resetSessionUI()
    const res = await startSession({ mode: 'srs_sets', selected_sets: [selectedSet] })
    setSessionId(res.session_id)
    setQuestion(res.card?.question || "")
    setPinyin(res.card?.pinyin || "")
    setProgress(res.progress)
  }

  async function beginSrsCategories() {
    // Practice SRS: start a review session using due cards for the selected category
    resetSessionUI()
    const res = await startSession({ mode: 'srs_categories', selected_categories: [selectedCategory] })
    setSessionId(res.session_id)
    setQuestion(res.card?.question || "")
    setPinyin(res.card?.pinyin || "")
    setProgress(res.progress)
  }

  async function viewSrs() {
    setSessionId("")
    setQuestion("")
    setProgress({ current: 0, total: 0 })
    setInput("")
    setLastEval(null)
    setResults([])
    setStreak(0)
    setBestStreak(0)
    try {
      const rows = mode === 'set' ? await getSrsForSet(selectedSet) : await getSrsForCategory(selectedCategory)
      setSrsRows(rows)
      setShowSrs(true)
      setShowStats(false)
    } catch {
      setSrsRows([])
      setShowSrs(true)
      setShowStats(false)
    }
  }

  async function viewStats() {
    setSessionId("")
    setQuestion("")
    setProgress({ current: 0, total: 0 })
    setInput("")
    setLastEval(null)
    setResults([])
    setStreak(0)
    setBestStreak(0)
    try {
      const res = mode === 'set' ? await getStatsForSet(selectedSet) : await getStatsForCategory(selectedCategory)
      setStats(res)
      setShowStats(true)
      setShowSrs(false)
    } catch {
      setStats({ summary: { correct: 0, incorrect: 0, total: 0, accuracy: 0, total_cards: 0, attempted_cards: 0, difficult_count: 0 }, rows: [] })
      setShowStats(true)
      setShowSrs(false)
    }
  }

  async function submitAnswer() {
    if (!canAnswer) return
    const res = await answer(sessionId, input)
    setInput("")
    if (res.done) {
      setQuestion("")
      setProgress(res.progress)
      setResults(res.results || [])
      // Keep streak values as-is at session end
    } else {
      setQuestion(res.card?.question || "")
      setPinyin(res.card?.pinyin || "")
      setProgress(res.progress)
      setLastEval(res.evaluation ? { correct: res.evaluation.correct, correct_answer: res.evaluation.correct_answer } : null)
      if (res.results) setResults(res.results)
      if (res.evaluation) {
        if (res.evaluation.correct) {
          // Play chime on correct answer (user-initiated event)
          playCorrectChime()
          setStreak(s => {
            const next = s + 1
            setBestStreak(b => Math.max(b, next))
            return next
          })
        } else {
          setStreak(0)
        }
      }
    }
  }

  function restartPractice() {
    if (mode === 'set') return beginSetSession()
    return beginCategorySession()
  }

  function practiceDifficultNow() {
    if (mode === 'set') return beginDifficultSet()
    return beginDifficultCategory()
  }

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

  return (
    <div className="container">
      <div className="left" role="region" aria-label="Setup">
        <h1>Flashcards</h1>
        <div className="section">
          <fieldset className="group">
            <legend>Mode</legend>
            <div className="row">
              <label className="radio">
                <input type="radio" name="mode" value="set" checked={mode === 'set'} onChange={() => setMode('set')} />
                <span>Set</span>
              </label>
              <label className="radio">
                <input type="radio" name="mode" value="category" checked={mode === 'category'} onChange={() => setMode('category')} />
                <span>Category</span>
              </label>
            </div>
          </fieldset>

          {mode === 'set' ? (
            <div className="group">
              <label htmlFor="set-select">Set</label>
              <select id="set-select" value={selectedSet} onChange={(e) => setSelectedSet(e.target.value)} aria-describedby="set-help">
                {sets.map((s) => (
                  <option key={s} value={s}>{humanizeSetLabel(s)}</option>
                ))}
              </select>
              <div id="set-help" className="muted" style={{ marginTop: 4 }}>Choose the set to practice</div>
            </div>
          ) : (
            <div className="group">
              <label htmlFor="category-select">Category</label>
              <select id="category-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} aria-describedby="category-help">
                {categories.map((c) => (
                  <option key={c} value={c}>{humanizeCategoryLabel(c)}</option>
                ))}
              </select>
              <div id="category-help" className="muted" style={{ marginTop: 4 }}>Choose the category to practice</div>
            </div>
          )}

          <div className="row">
            <button className="btn-primary" onClick={mode === 'set' ? beginSetSession : beginCategorySession} disabled={mode === 'set' ? !selectedSet : !selectedCategory}>Start Practice</button>
            <button className="btn-secondary" onClick={mode === 'set' ? beginDifficultSet : beginDifficultCategory} disabled={mode === 'set' ? !selectedSet : !selectedCategory}>Practice Difficult</button>
            <button className="btn-secondary" title="Spaced Repetition System" onClick={mode === 'set' ? beginSrsSets : beginSrsCategories} disabled={mode === 'set' ? !selectedSet : !selectedCategory}>Practice SRS</button>
            <button className="btn-tertiary" title="View SRS schedule" onClick={viewSrs} disabled={mode === 'set' ? !selectedSet : !selectedCategory}>View SRS</button>
            <button className="btn-tertiary" title="View performance stats" onClick={viewStats} disabled={mode === 'set' ? !selectedSet : !selectedCategory}>View Stats</button>
          </div>
        </div>

        <div className="section summary" ref={summaryRef}>
          {results.length > 0 && (
            <div>
              <h3>Session Summary</h3>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Question</th>
                    <th>Your Answer</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{r.question}</td>
                      <td className={String(r.correct)}>
                        {r.correct ? '✓' : `✗`} {r.correct_answer}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SRS view moved to right panel */}

        </div>
      </div>

      <div className="right" role="region" aria-label="Session">
        {showStats ? (
          <div className="statsPanel" style={{ marginTop: 8 }}>
            <div className="metaRow">
              <h3>Stats {mode === 'set' ? `— ${humanizeSetLabel(selectedSet)}` : `— ${humanizeCategoryLabel(selectedCategory)}`}</h3>
              {stats && <div className="muted">{stats.summary.accuracy}% accuracy</div>}
            </div>
            {stats && (
              <div className="panelSubtext muted">
                <div>
                  Accuracy: <strong>{stats.summary.accuracy}%</strong> · Correct: {stats.summary.correct} · Incorrect: {stats.summary.incorrect} · Attempts: {stats.summary.total}
                </div>
                <div>
                  Cards: {stats.summary.total_cards} · Attempted: {stats.summary.attempted_cards} · Difficult (&lt;80%): {stats.summary.difficult_count}
                </div>
              </div>
            )}
            <StatsTable rows={stats?.rows || []} />
          </div>
        ) : showSrs ? (
          <div className="statsPanel" style={{ marginTop: 8 }}>
            <div className="metaRow">
              <h3>SRS Schedule {mode === 'set' ? `— ${humanizeSetLabel(selectedSet)}` : `— ${humanizeCategoryLabel(selectedCategory)}`}</h3>
              <div className="muted">{dueNowCount} due now</div>
            </div>
            <div className="panelSubtext muted">Items: {srsRows.length}</div>
            <SrsTable rows={srsRows} />
          </div>
        ) : (
          <>
            {isSessionComplete ? (
              <div className="completePanel" role="region" aria-label="Session complete">
                <h3 className="completeTitle">Session Complete {mode === 'set' ? `— ${humanizeSetLabel(selectedSet)}` : `— ${humanizeCategoryLabel(selectedCategory)}`}</h3>
                <div className="progress" aria-label={`Progress ${progress.current} of ${progress.total}`}>Progress: {progress.current}/{progress.total}</div>
                <div className="progressBar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
                  <div className="progressFill" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="kpis">
                  <div className="kpi"><div className="value">{summaryStats.accuracy}%</div><div className="label">Accuracy</div></div>
                  <div className="kpi"><div className="value ok">{summaryStats.correct}</div><div className="label">Correct</div></div>
                  <div className="kpi"><div className="value bad">{summaryStats.incorrect}</div><div className="label">Incorrect</div></div>
                  <div className="kpi"><div className="value">{summaryStats.total}</div><div className="label">Total</div></div>
                </div>

                {results.some(r => !r.correct) ? (
                  <div className="incorrectBlock">
                    <h4>Review Incorrect</h4>
                    <table className="statsTable">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Question</th>
                          <th>Meaning (Correct)</th>
                          <th>Your Answer</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r, i) => !r.correct ? (
                          <tr key={`inc-${i}`}>
                            <td>{i + 1}</td>
                            <td>{r.question}</td>
                            <td className="bad" title="Correct answer">{r.correct_answer}</td>
                            <td title="Your answer">{r.user_answer || '—'}</td>
                          </tr>
                        ) : null)}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="muted" style={{ marginTop: 12 }}>Perfect run — no incorrect answers 🎉</div>
                )}

                <div className="row" style={{ marginTop: 12 }}>
                  <button className="btn-primary" onClick={restartPractice}>Restart</button>
                  <button className="btn-secondary" onClick={practiceDifficultNow} disabled={mode === 'set' ? !selectedSet : !selectedCategory}>Practice Difficult</button>
                  <button className="btn-tertiary" onClick={viewStats}>View Stats</button>
                  <button className="btn-tertiary" onClick={viewSrs}>View SRS</button>
                </div>
              </div>
            ) : (
              <>
                <div className="progress" aria-label={`Progress ${progress.current} of ${progress.total}`}>Progress: {progress.current}/{progress.total}</div>
                <div className="progressBar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
                  <div className="progressFill" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="metaRow">
                  <div className="streak">🔥 Streak: {streak} <span className="muted">(Best {bestStreak})</span></div>
                </div>
                <div className="questionWrap">
                  <div className={`question ${hasChinese(question) ? 'zh' : ''}`} lang={hasChinese(question) ? 'zh' : undefined}>
                    {question || 'No active question'}
                  </div>
                  {pinyin && (<div className="pinyin" style={{ color: '#9da7b3', marginTop: 8 }}>{pinyin}</div>)}
                </div>
                {canAnswer && (
                  <div className="row">
                    <input
                      placeholder="Your answer"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') submitAnswer() }}
                      type="text"
                      aria-label="Your answer"
                    />
                    <button onClick={submitAnswer} disabled={!input.trim()}>Submit</button>
                    {hasChinese(question) && (
                      <button aria-label="Play audio (R)" title="Play audio (R)" onClick={() => speak(question)}>🔊</button>
                    )}
                    {lastEval && (
                      <div className={`feedback ${lastEval.correct ? 'ok' : 'bad'}`} aria-live="polite">
                        {lastEval.correct ? 'Correct!' : `Incorrect. Correct: ${lastEval.correct_answer}`}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default App

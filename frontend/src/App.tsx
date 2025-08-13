import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import type { SrsRow, StatRow, StatsPayload } from './api'
import { answer, getSrsForCategory, getSrsForSet, getStatsForCategory, getStatsForSet, listCategories, listSets, startSession } from './api'
import SrsTable from './components/SrsTable'
import StatsTable from './components/StatsTable'
import { getPinyinForText, hasChinese } from './utils/pinyin'

function App() {
  const [sets, setSets] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedSet, setSelectedSet] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [mode, setMode] = useState<'set' | 'category'>('set')
  const [sessionId, setSessionId] = useState<string>("")
  const [showSrs, setShowSrs] = useState<boolean>(false)
  const [srsRows, setSrsRows] = useState<SrsRow[]>([])
  const [showStats, setShowStats] = useState<boolean>(true)
  const [stats, setStats] = useState<StatsPayload | null>(null)
  const [difficultyRows, setDifficultyRows] = useState<StatRow[] | null>(null)
  const [question, setQuestion] = useState<string>("")
  const [pinyin, setPinyin] = useState<string>("")
  const [progress, setProgress] = useState<{ current: number, total: number }>({ current: 0, total: 0 })
  const [input, setInput] = useState<string>("")
  const [lastEval, setLastEval] = useState<{ correct: boolean; correct_answer: string } | null>(null)
  const [results, setResults] = useState<Array<{ question: string; pinyin?: string; user_answer: string; correct_answer: string; correct: boolean }>>([])
  const [streak, setStreak] = useState<number>(0)
  const [bestStreak, setBestStreak] = useState<number>(0)
  // Browse/Review mode (navigate all symbols)
  const [inBrowseMode, setInBrowseMode] = useState<boolean>(false)
  const [browseRows, setBrowseRows] = useState<Array<{ question: string; answer: string }>>([])
  const [browseIndex, setBrowseIndex] = useState<number>(0)
  const [browsePinyin, setBrowsePinyin] = useState<string>("")
  // Local review mode (replay incorrect from last session)
  const [inReviewMode, setInReviewMode] = useState<boolean>(false)
  const [reviewCards, setReviewCards] = useState<Array<{ question: string; pinyin?: string; correct_answer: string }>>([])
  const [reviewPosition, setReviewPosition] = useState<number>(0)
  // Difficulty filters for practice-by-difficulty
  const [diffEasy, setDiffEasy] = useState<boolean>(false)
  const [diffMedium, setDiffMedium] = useState<boolean>(false)
  const [diffHard, setDiffHard] = useState<boolean>(true)
  // Removed per request: previous answers panel
  const canAnswer = useMemo(() => (!!sessionId || inReviewMode) && !!question, [sessionId, inReviewMode, question])
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

  const selectedDifficulties = useMemo(() => {
    const vals: Array<'easy' | 'medium' | 'hard'> = []
    if (diffEasy) vals.push('easy')
    if (diffMedium) vals.push('medium')
    if (diffHard) vals.push('hard')
    return vals
  }, [diffEasy, diffMedium, diffHard])
  const canStartByDifficulty = selectedDifficulties.length > 0

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
  const isRowDueNow = useCallback((row: SrsRow): boolean => {
    if (!row.next_review_date) return false
    const t = parseSrsDate(row.next_review_date)
    if (!t) return false
    return t.getTime() <= Date.now()
  }, [])
  const dueNowCount = useMemo(() => {
    if (!srsRows || srsRows.length === 0) return 0
    let count = 0
    for (const r of srsRows) if (isRowDueNow(r)) count++
    return count
  }, [srsRows, isRowDueNow])

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
      const AC = (window as typeof window & {
        AudioContext?: typeof AudioContext
        webkitAudioContext?: typeof AudioContext
      }).AudioContext || (window as typeof window & {
        webkitAudioContext?: typeof AudioContext
      }).webkitAudioContext
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

  // Compute pinyin client-side for the active question
  useEffect(() => {
    const q = question
    if (!q || !hasChinese(q)) { 
      setPinyin('')
      return 
    }
    
    getPinyinForText(q).then(py => setPinyin(py)).catch(() => setPinyin(''))
  }, [question])

  useEffect(() => {
    if (!question || !hasChinese(question)) return
    const now = Date.now()
    const last = lastSpokenRef.current
    // Guard to avoid duplicate TTS under React StrictMode double-invocation
    if (last && last.text === question && now - last.ts < 1000) return
    speak(question)
    lastSpokenRef.current = { text: question, ts: now }
  }, [question])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore shortcuts while the user is typing in an input/textarea/contentEditable
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = (target.tagName || '').toLowerCase()
        const isTyping = tag === 'input' || tag === 'textarea' || (target as HTMLElement).isContentEditable
        if (isTyping) return
      }
      if (e.key === 'r' || e.key === 'R') {
        if (question && hasChinese(question)) speak(question)
        if (inBrowseMode) {
          const q = browseRows[browseIndex]?.question
          if (q && hasChinese(q)) speak(q)
        }
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
      } else if (inBrowseMode && (e.key === 'ArrowRight' || e.key === 'PageDown')) {
        e.preventDefault()
        nextBrowse()
      } else if (inBrowseMode && (e.key === 'ArrowLeft' || e.key === 'PageUp')) {
        e.preventDefault()
        prevBrowse()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, selectedSet, selectedCategory, inBrowseMode, browseIndex, browseRows])

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

  // Preload stats rows for the current scope so we can show difficulty counts even when Stats view is hidden
  useEffect(() => {
    (async () => {
      try {
        if (mode === 'set') {
          if (!selectedSet) { setDifficultyRows(null); return }
          const res = await getStatsForSet(selectedSet)
          setDifficultyRows(res.rows || [])
        } else {
          if (!selectedCategory) { setDifficultyRows(null); return }
          const res = await getStatsForCategory(selectedCategory)
          setDifficultyRows(res.rows || [])
        }
      } catch {
        setDifficultyRows([])
      }
    })()
  }, [mode, selectedSet, selectedCategory])

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
    if (!difficultyRows || difficultyRows.length === 0) return counts
    for (const r of difficultyRows) {
      const d = classifyDifficulty({ total: r.total, accuracy: r.accuracy })
      counts[d]++
    }
    return counts
  }, [difficultyRows])

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
    setInBrowseMode(false)
    setBrowseRows([])
    setBrowseIndex(0)
    setBrowsePinyin("")
    setInReviewMode(false)
    setReviewCards([])
    setReviewPosition(0)
    // previous answers state removed
    setShowSrs(false)
    setSrsRows([])
    setShowStats(false)
    setStats(null)
  }

  async function beginBrowse() {
    resetSessionUI()
    try {
      if (mode === 'set') {
        if (!selectedSet) return
        const res = await getStatsForSet(selectedSet)
        const rows = (res.rows || []).map(r => ({ question: r.question, answer: r.answer }))
        setBrowseRows(rows)
      } else {
        if (!selectedCategory) return
        const res = await getStatsForCategory(selectedCategory)
        const rows = (res.rows || []).map(r => ({ question: r.question, answer: r.answer }))
        setBrowseRows(rows)
      }
      setInBrowseMode(true)
      setBrowseIndex(0)
    } catch {
      setInBrowseMode(false)
      setBrowseRows([])
      setBrowseIndex(0)
    }
  }

  function exitBrowse() {
    setInBrowseMode(false)
    setBrowseRows([])
    setBrowseIndex(0)
    setBrowsePinyin("")
  }

  function nextBrowse() {
    if (!inBrowseMode) return
    setBrowseIndex((i) => Math.min(i + 1, Math.max(0, browseRows.length - 1)))
  }

  function prevBrowse() {
    if (!inBrowseMode) return
    setBrowseIndex((i) => Math.max(i - 1, 0))
  }

  // Auto TTS in browse mode for Chinese symbols
  useEffect(() => {
    if (!inBrowseMode) return
    const q = browseRows[browseIndex]?.question
    if (!q || !hasChinese(q)) return
    const now = Date.now()
    const last = lastSpokenRef.current
    if (last && last.text === q && now - last.ts < 1000) return
    speak(q)
    lastSpokenRef.current = { text: q, ts: now }
  }, [inBrowseMode, browseIndex, browseRows])

  // Fetch pinyin for browse mode question (client-side)
  useEffect(() => {
    if (!inBrowseMode) return
    const q = browseRows[browseIndex]?.question
    if (!q || !hasChinese(q)) { 
      setBrowsePinyin("")
      return 
    }
    
    getPinyinForText(q).then(py => setBrowsePinyin(py)).catch(() => setBrowsePinyin(''))
  }, [inBrowseMode, browseIndex, browseRows])

  const beginSetSession = useCallback(async () => {
    resetSessionUI()
    const res = await startSession({ mode: 'set_all', set_name: selectedSet })
    setSessionId(res.session_id)
    setQuestion(res.card?.question || "")
    setPinyin(res.card?.pinyin || "")
    setProgress(res.progress)
  }, [selectedSet])

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
    const res = await startSession({ mode: 'difficulty_set', set_name: selectedSet, difficulty_levels: selectedDifficulties })
    setSessionId(res.session_id)
    setQuestion(res.card?.question || "")
    setPinyin(res.card?.pinyin || "")
    setProgress(res.progress)
  }

  async function beginDifficultCategory() {
    resetSessionUI()
    const res = await startSession({ mode: 'difficulty_category', category: selectedCategory, difficulty_levels: selectedDifficulties })
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

  function validateUserAnswer(userAnswer: string, answer: string): boolean {
    const ua = userAnswer.toLowerCase().trim()
    const ans = answer.toLowerCase().trim()
    if (ans.includes(';') || ans.includes(' or ')) {
      const correctParts = ans.split(/;|\s+or\s+/).map(p => p.trim()).filter(Boolean)
      const userParts = ua.split(/\s+or\s+/).map(p => p.trim()).filter(Boolean)
      return userParts.some(p => correctParts.includes(p))
    }
    return ua === ans
  }

  async function submitAnswer() {
    if (!canAnswer) return
    // Local review mode branch
    if (inReviewMode) {
      const current = reviewCards[reviewPosition]
      const isCorrect = validateUserAnswer(input, current?.correct_answer || '')
      setInput("")
      setLastEval({ correct: isCorrect, correct_answer: current?.correct_answer || '' })
      if (isCorrect) {
        playCorrectChime()
        setStreak(s => {
          const next = s + 1
          setBestStreak(b => Math.max(b, next))
          return next
        })
      } else {
        setStreak(0)
      }
      // Append to session results
      setResults(prev => ([
        ...prev,
        {
          question: current?.question || '',
          pinyin: current?.pinyin || '',
          user_answer: input,
          correct_answer: current?.correct_answer || '',
          correct: isCorrect,
        }
      ]))

      const nextPos = reviewPosition + 1
      if (nextPos >= reviewCards.length) {
        // complete
        setQuestion("")
        setPinyin("")
        setProgress({ current: reviewCards.length, total: reviewCards.length })
        setInReviewMode(false) // end review mode but keep results visible
      } else {
        setReviewPosition(nextPos)
        const next = reviewCards[nextPos]
        setQuestion(next.question)
        setPinyin(next.pinyin || '')
        setProgress({ current: nextPos, total: reviewCards.length })
      }
      return
    }

    // Normal server-backed session
    const res = await answer(sessionId, input)
    setInput("")
    if (res.done) {
      if (res.results && res.results.length > 0) {
        const last = res.results[res.results.length - 1]
        if (last && last.correct) {
          playCorrectChime()
        }
      }
      setQuestion("")
      setProgress(res.progress)
      // Compute pinyin for results that have Chinese characters
      const resultsWithPinyin = await Promise.all(
        (res.results || []).map(async (result) => ({
          ...result,
          pinyin: hasChinese(result.question) ? await getPinyinForText(result.question).catch(() => '') : ''
        }))
      )
      setResults(resultsWithPinyin)
      // Keep streak values as-is at session end
      // Refresh tables and difficulty cache after session completes
      try {
        if (mode === 'set') {
          if (selectedSet) {
            const [statsRes, srsRes] = await Promise.all([
              getStatsForSet(selectedSet),
              getSrsForSet(selectedSet),
            ])
            setDifficultyRows(statsRes.rows || [])
            if (showStats) setStats(statsRes)
            if (showSrs) setSrsRows(srsRes)
          }
        } else {
          if (selectedCategory) {
            const [statsRes, srsRes] = await Promise.all([
              getStatsForCategory(selectedCategory),
              getSrsForCategory(selectedCategory),
            ])
            setDifficultyRows(statsRes.rows || [])
            if (showStats) setStats(statsRes)
            if (showSrs) setSrsRows(srsRes)
          }
        }
      } catch {
        // ignore
      }
    } else {
      setQuestion(res.card?.question || "")
      setPinyin(res.card?.pinyin || "")
      setProgress(res.progress)
      setLastEval(res.evaluation ? { correct: res.evaluation.correct, correct_answer: res.evaluation.correct_answer } : null)
      if (res.results) {
        // Compute pinyin for results that have Chinese characters
        Promise.all(
          res.results.map(async (result) => ({
            ...result,
            pinyin: hasChinese(result.question) ? await getPinyinForText(result.question).catch(() => '') : ''
          }))
        ).then(resultsWithPinyin => setResults(resultsWithPinyin))
      }
      if (res.evaluation) {
        if (res.evaluation.correct) {
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

  async function beginReviewIncorrect() {
    const wrong = results.filter(r => !r.correct)
    if (wrong.length === 0) return

    // Prepare backend payload; include set_name only in set mode to enable SRS persistence
    const reviewItems = wrong.map(r => ({
      question: r.question,
      answer: r.correct_answer,
      ...(mode === 'set' && selectedSet ? { set_name: selectedSet } : {})
    }))

    try {
      const res = await startSession({ mode: 'review_incorrect', review_items: reviewItems })
      if (!res.done) {
        resetSessionUI()
        setSessionId(res.session_id)
        setQuestion(res.card?.question || "")
        setPinyin(res.card?.pinyin || "")
        setProgress(res.progress)
        return
      }
      // If backend returns done (empty), fall through to local
    } catch {
      // Fall back to local-only review if backend unavailable
    }

    // Local review fallback
    resetSessionUI()
    setInReviewMode(true)
    setReviewCards(wrong.map(r => ({ question: r.question, pinyin: r.pinyin, correct_answer: r.correct_answer })))
    setReviewPosition(0)
    setResults([])
    setStreak(0)
    setBestStreak(0)
    const first = wrong[0]
    setQuestion(first.question)
    setPinyin(first.pinyin || '')
    setProgress({ current: 0, total: wrong.length })
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
        <h1>🇨🇳 HSK Flashcards</h1>
        <div className="section">
          {mode === 'set' ? (
            <div className="group">
              <select id="set-select" value={selectedSet} onChange={(e) => setSelectedSet(e.target.value)} aria-describedby="set-help">
                {sets.map((s) => (
                  <option key={s} value={s}>{humanizeSetLabel(s)}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="group">
              <select id="category-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} aria-describedby="category-help">
                {categories.map((c) => (
                  <option key={c} value={c}>{humanizeCategoryLabel(c)}</option>
                ))}
              </select>
            </div>
          )}
          <fieldset className="group">
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

          {/* Difficulty selection */}
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
            <button className="btn-primary" onClick={beginBrowse} disabled={mode === 'set' ? !selectedSet : !selectedCategory}>Start Review</button>
            <button className="btn-primary" onClick={mode === 'set' ? beginSetSession : beginCategorySession} disabled={mode === 'set' ? !selectedSet : !selectedCategory}>Start Practice</button>
            <button className="btn-secondary" onClick={mode === 'set' ? beginDifficultSet : beginDifficultCategory} disabled={(mode === 'set' ? !selectedSet : !selectedCategory) || !canStartByDifficulty}>Practice by Difficulty</button>
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
                    <th>Pinyin</th>
                    <th>Your Answer</th>
                    <th>Answer</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
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

          {/* SRS view moved to right panel */}

        </div>
      </div>

      <div className="right" role="region" aria-label="Session">
        {inBrowseMode ? (
          (() => {
            const total = browseRows.length
            const i = Math.min(Math.max(browseIndex, 0), Math.max(0, total - 1))
            const current = total > 0 ? browseRows[i] : null
            return (
              <div className="statsPanel" style={{ marginTop: 8 }}>
                <div className="metaRow">
                  <h3>Review {mode === 'set' ? `— ${humanizeSetLabel(selectedSet)}` : `— ${humanizeCategoryLabel(selectedCategory)}`}</h3>
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
          })()
        ) : showStats ? (
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
                  <div className="muted" style={{ marginTop: 12 }}>Perfect run — no incorrect answers 🎉</div>
                )}

                <div className="row" style={{ marginTop: 12 }}>
                  <button className="btn-primary" onClick={restartPractice}>Restart</button>
                  <button className="btn-secondary" onClick={beginReviewIncorrect} disabled={!results.some(r => !r.correct)}>Review Incorrect</button>
                  <button className="btn-secondary" onClick={practiceDifficultNow} disabled={(mode === 'set' ? !selectedSet : !selectedCategory) || !canStartByDifficulty}>Practice by Difficulty</button>
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

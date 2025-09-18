import { useCallback, useEffect, useState } from 'react'
import type { SrsRow, StatRow, StatsPayload, PerformancePayload, AutoStartPayload } from '../api'
import { listCategories, listSets, startSession, startAutoSession, getStatsForSet, getStatsForCategory, getSrsForSet, getSrsForCategory, answerWithTiming } from '../api'
import { getPinyinForText, hasChinese } from '../utils/pinyin'

export interface SessionState {
  // Core session data
  sessionId: string
  question: string
  pinyin: string
  progress: { current: number; total: number }
  input: string
  lastEval: { correct: boolean; correct_answer: string } | null
  results: Array<{ question: string; pinyin?: string; user_answer: string; correct_answer: string; correct: boolean }>
  streak: number
  bestStreak: number
  
  // High-intensity mode
  isHighIntensityMode: boolean
  userLevel: 'beginner' | 'intermediate' | 'advanced'
  focusMode: 'review' | 'challenge'
  adaptiveFeedbackDuration: number
  questionStartTime: number
  
  // Special modes
  inBrowseMode: boolean
  browseRows: Array<{ question: string; answer: string }>
  browseIndex: number
  browsePinyin: string
  
  inReviewMode: boolean
  reviewCards: Array<{ question: string; pinyin?: string; correct_answer: string }>
  reviewPosition: number
  
  inDrawingMode: boolean
  drawingCards: Array<{ question: string; answer: string }>
  drawingPosition: number
  drawingProgress: { current: number; total: number }
  
  // Sprint mode
  sprintMode: boolean
  sprintStartTime: number
  sprintTimeLeft: number
  
  // Focus mode  
  oldFocusMode: boolean
  
  // Data and settings
  sets: string[]
  categories: string[]
  selectedSet: string
  selectedCategory: string
  selectedSets: string[]
  mode: 'set' | 'category' | 'multi-set'
  
  // Difficulty settings
  diffEasy: boolean
  diffMedium: boolean
  diffHard: boolean
  
  // Views
  showSrs: boolean
  srsRows: SrsRow[]
  showStats: boolean
  stats: StatsPayload | null
  showPerformance: boolean
  performance: PerformancePayload | null
  difficultyRows: StatRow[] | null
}

export interface SessionActions {
  // Core session actions
  resetSessionUI: () => void
  beginAutoSession: () => Promise<void>
  beginSetSession: () => Promise<void>
  beginCategorySession: () => Promise<void>
  beginMultiSetSession: () => Promise<void>
  beginDifficultSet: () => Promise<void>
  beginDifficultCategory: () => Promise<void>
  beginMultiSetDifficult: () => Promise<void>
  beginSrsSets: () => Promise<void>
  beginSrsCategories: () => Promise<void>
  beginMultiSetSrs: () => Promise<void>
  beginSprintMode: () => Promise<void>
  beginDrawingMode: () => Promise<void>
  submitAnswer: () => Promise<void>
  
  // Browse mode
  beginBrowse: () => Promise<void>
  exitBrowse: () => void
  nextBrowse: () => void
  prevBrowse: () => void
  
  // Review mode
  beginReviewIncorrect: () => Promise<void>
  
  // Data views
  viewSrs: () => Promise<void>
  viewStats: () => Promise<void>
  viewPerformance: () => Promise<void>
  
  // Setters
  setInput: (input: string) => void
  setSelectedSet: (set: string) => void
  setSelectedCategory: (category: string) => void
  setSelectedSets: (sets: string[]) => void
  setMode: (mode: 'set' | 'category' | 'multi-set') => void
  setUserLevel: (level: 'beginner' | 'intermediate' | 'advanced') => void
  setFocusMode: (mode: 'review' | 'challenge') => void
  setIsHighIntensityMode: (enabled: boolean) => void
  setOldFocusMode: (enabled: boolean) => void
  setDiffEasy: (enabled: boolean) => void
  setDiffMedium: (enabled: boolean) => void
  setDiffHard: (enabled: boolean) => void
  setDrawingPosition: (position: number) => void
  setDrawingProgress: (progress: { current: number; total: number }) => void
  setInDrawingMode: (enabled: boolean) => void
  
  // Multi-set helpers
  addSetToSelection: (setName: string) => void
  removeSetFromSelection: (setName: string) => void
}

export function useSessionManager(): [SessionState, SessionActions] {
  // Core session state
  const [sessionId, setSessionId] = useState<string>("")
  const [question, setQuestion] = useState<string>("")
  const [pinyin, setPinyin] = useState<string>("")
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 })
  const [input, setInput] = useState<string>("")
  const [lastEval, setLastEval] = useState<{ correct: boolean; correct_answer: string } | null>(null)
  const [results, setResults] = useState<Array<{ question: string; pinyin?: string; user_answer: string; correct_answer: string; correct: boolean }>>([])
  const [streak, setStreak] = useState<number>(0)
  const [bestStreak, setBestStreak] = useState<number>(0)
  
  // High-intensity mode
  const [isHighIntensityMode, setIsHighIntensityMode] = useState<boolean>(true)
  const [userLevel, setUserLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner')
  const [focusMode, setFocusMode] = useState<'review' | 'challenge'>('challenge')
  const [adaptiveFeedbackDuration] = useState<number>(2000)
  const [questionStartTime, setQuestionStartTime] = useState<number>(0)
  
  // Special modes
  const [inBrowseMode, setInBrowseMode] = useState<boolean>(false)
  const [browseRows, setBrowseRows] = useState<Array<{ question: string; answer: string }>>([])
  const [browseIndex, setBrowseIndex] = useState<number>(0)
  const [browsePinyin, setBrowsePinyin] = useState<string>("")
  
  const [inReviewMode, setInReviewMode] = useState<boolean>(false)
  const [reviewCards, setReviewCards] = useState<Array<{ question: string; pinyin?: string; correct_answer: string }>>([])
  const [reviewPosition, setReviewPosition] = useState<number>(0)
  
  const [inDrawingMode, setInDrawingMode] = useState<boolean>(false)
  const [drawingCards, setDrawingCards] = useState<Array<{ question: string; answer: string }>>([])
  const [drawingPosition, setDrawingPosition] = useState<number>(0)
  const [drawingProgress, setDrawingProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 })
  
  // Sprint mode
  const [sprintMode, setSprintMode] = useState<boolean>(false)
  const [sprintStartTime] = useState<number>(0)
  const [sprintTimeLeft, setSprintTimeLeft] = useState<number>(300)
  
  // Focus mode
  const [oldFocusMode, setOldFocusMode] = useState<boolean>(false)
  
  // Data and settings
  const [sets, setSets] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedSet, setSelectedSet] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedSets, setSelectedSets] = useState<string[]>([])
  const [mode, setMode] = useState<'set' | 'category' | 'multi-set'>('set')
  
  // Difficulty settings
  const [diffEasy, setDiffEasy] = useState<boolean>(false)
  const [diffMedium, setDiffMedium] = useState<boolean>(false)
  const [diffHard, setDiffHard] = useState<boolean>(true)
  
  // Views
  const [showSrs, setShowSrs] = useState<boolean>(true)
  const [srsRows, setSrsRows] = useState<SrsRow[]>([])
  const [showStats, setShowStats] = useState<boolean>(true)
  const [stats, setStats] = useState<StatsPayload | null>(null)
  const [showPerformance, setShowPerformance] = useState<boolean>(false)
  const [performance, setPerformance] = useState<PerformancePayload | null>(null)
  const [difficultyRows] = useState<StatRow[] | null>(null)

  // Load initial data
  useEffect(() => {
    (async () => {
      try {
        const [s, c] = await Promise.all([listSets(), listCategories()])
        setSets(Array.isArray(s) ? s : [])
        setCategories(Array.isArray(c) ? c : [])
        if (Array.isArray(s) && s.length) setSelectedSet(s[0])
        if (Array.isArray(c) && c.length) setSelectedCategory(c[0])
      } catch (error) {
        console.error('Failed to load sets/categories:', error)
        setSets([])
        setCategories([])
      }
    })()
  }, [])

  // Keep Stats & SRS view in sync when mode or selection changes
  useEffect(() => {
    if (!showStats && !showSrs) return
    ;(async () => {
      try {
        if (mode === 'set') {
          if (!selectedSet) return
          
          // Fetch both stats and SRS data in parallel
          const [statsRes, srsRes] = await Promise.all([
            showStats ? getStatsForSet(selectedSet) : Promise.resolve(null),
            showSrs ? getSrsForSet(selectedSet) : Promise.resolve([])
          ])
          
          if (statsRes) setStats(statsRes)
          setSrsRows(srsRes || [])
        } else if (mode === 'category') {
          if (!selectedCategory) return
          
          // Fetch both stats and SRS data in parallel
          const [statsRes, srsRes] = await Promise.all([
            showStats ? getStatsForCategory(selectedCategory) : Promise.resolve(null),
            showSrs ? getSrsForCategory(selectedCategory) : Promise.resolve([])
          ])
          
          if (statsRes) setStats(statsRes)
          setSrsRows(srsRes || [])
        } else if (mode === 'multi-set') {
          if (selectedSets.length === 0) return
          
          // Aggregate stats and SRS data from all selected sets
          const allStatsRows: StatRow[] = []
          const allSrsRows: SrsRow[] = []
          let totalCorrect = 0
          let totalIncorrect = 0
          let totalCards = 0
          let attemptedCards = 0
          let difficultCount = 0

          for (const setName of selectedSets) {
            try {
              // Fetch both stats and SRS data in parallel
              const [setStats, setSrs] = await Promise.all([
                showStats ? getStatsForSet(setName) : Promise.resolve(null),
                showSrs ? getSrsForSet(setName) : Promise.resolve([])
              ])
              
              if (setStats) {
                allStatsRows.push(...setStats.rows)
                totalCorrect += setStats.summary.correct
                totalIncorrect += setStats.summary.incorrect
                totalCards += setStats.summary.total_cards
                attemptedCards += setStats.summary.attempted_cards
                difficultCount += setStats.summary.difficult_count
              }
              
              if (setSrs) {
                allSrsRows.push(...setSrs)
              }
            } catch {
              // Skip sets that fail to load
            }
          }

          const totalAttempts = totalCorrect + totalIncorrect
          const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 1000) / 10 : 0

          const res = {
            summary: {
              correct: totalCorrect,
              incorrect: totalIncorrect,
              total: totalAttempts,
              accuracy,
              total_cards: totalCards,
              attempted_cards: attemptedCards,
              difficult_count: difficultCount,
            },
            rows: allStatsRows,
          }
          setStats(res)
          setSrsRows(allSrsRows)
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
  }, [showStats, showSrs, mode, selectedSet, selectedCategory, selectedSets])

  // Actions
  const resetSessionUI = useCallback(() => {
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
    setInDrawingMode(false)
    setDrawingCards([])
    setDrawingPosition(0)
    setDrawingProgress({ current: 0, total: 0 })
    setSprintMode(false)
    setSprintTimeLeft(300)
    setShowSrs(false)
    setSrsRows([])
    setShowStats(false)
    setStats(null)
    setShowPerformance(false)
    setPerformance(null)
  }, [])

  const beginAutoSession = useCallback(async () => {
    resetSessionUI()
    setIsHighIntensityMode(true)
    const payload: AutoStartPayload = {
      user_level: userLevel,
      focus_mode: focusMode
    }
    const res = await startAutoSession(payload)
    setSessionId(res.session_id)
    setQuestion(res.card?.question || "")
    setPinyin(res.card?.pinyin || "")
    setProgress(res.progress)
  }, [userLevel, focusMode, resetSessionUI])

  const beginSetSession = useCallback(async () => {
    resetSessionUI()
    const res = await startSession({ mode: 'set_all', set_name: selectedSet })
    setSessionId(res.session_id)
    setQuestion(res.card?.question || "")
    setPinyin(res.card?.pinyin || "")
    setProgress(res.progress)
  }, [selectedSet, resetSessionUI])

  const beginCategorySession = useCallback(async () => {
    resetSessionUI()
    const res = await startSession({ mode: 'category_all', category: selectedCategory })
    setSessionId(res.session_id)
    setQuestion(res.card?.question || "")
    setPinyin(res.card?.pinyin || "")
    setProgress(res.progress)
  }, [selectedCategory, resetSessionUI])

  const beginMultiSetSession = useCallback(async () => {
    resetSessionUI()
    const res = await startSession({ mode: 'multi_set_all', selected_sets: selectedSets })
    setSessionId(res.session_id)
    setQuestion(res.card?.question || "")
    setPinyin(res.card?.pinyin || "")
    setProgress(res.progress)
  }, [selectedSets, resetSessionUI])

  // Additional session start methods would go here...
  
  // Helper function for answer validation
  const validateUserAnswer = useCallback((userAnswer: string, answer: string): boolean => {
    const ua = userAnswer.toLowerCase().trim()
    const ans = answer.toLowerCase().trim()
    if (ans.includes(';') || ans.includes(' or ')) {
      const correctParts = ans.split(/;|\s+or\s+/).map(p => p.trim()).filter(Boolean)
      const userParts = ua.split(/\s+or\s+/).map(p => p.trim()).filter(Boolean)
      return userParts.some(p => correctParts.includes(p))
    }
    return ua === ans
  }, [])
  
  const submitAnswer = useCallback(async () => {
    if (!input.trim()) return
    
    // Local review mode branch
    if (inReviewMode) {
      const current = reviewCards[reviewPosition]
      const isCorrect = validateUserAnswer(input, current?.correct_answer || '')
      setInput("")
      setLastEval({ correct: isCorrect, correct_answer: current?.correct_answer || '' })
      
      if (isCorrect) {
        // playCorrectChime() - would need to be passed in
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

    // Normal server-backed session with timing
    if (!sessionId) return
    const responseTime = Date.now() - questionStartTime
    
    try {
      const res = await answerWithTiming(sessionId, input, responseTime)
      setInput("")
      
      if (res.done) {
        if (res.results && res.results.length > 0) {
          const last = res.results[res.results.length - 1]
          if (last && last.correct) {
            // playCorrectChime() - would need to be passed in
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
        
        // TODO: Refresh tables and difficulty cache after session completes
        // This would need to be implemented based on the selected mode/sets
      } else {
        // Continue with next question
        if (res.card) {
          setQuestion(res.card.question)
          setPinyin(res.card.pinyin || '')
        }
        if (res.evaluation) {
          setLastEval({ 
            correct: res.evaluation.correct, 
            correct_answer: res.evaluation.correct_answer 
          })
          
          if (res.evaluation.correct) {
            // playCorrectChime() - would need to be passed in
            setStreak(s => {
              const next = s + 1
              setBestStreak(b => Math.max(b, next))
              return next
            })
          } else {
            setStreak(0)
          }
        }
        setProgress(res.progress)
        setQuestionStartTime(Date.now())
      }
    } catch (error) {
      console.error('Failed to submit answer:', error)
      // Could set an error state here
    }
  }, [input, inReviewMode, reviewCards, reviewPosition, sessionId, questionStartTime])

  // Multi-set helpers
  const addSetToSelection = useCallback((setName: string) => {
    if (!selectedSets.includes(setName)) {
      setSelectedSets([...selectedSets, setName])
    }
  }, [selectedSets])

  const removeSetFromSelection = useCallback((setName: string) => {
    setSelectedSets(selectedSets.filter(s => s !== setName))
  }, [selectedSets])

  const viewStats = useCallback(async () => {
    setShowStats(true)
    setShowSrs(true)  // Also show SRS data in unified table
    setShowPerformance(false)
  }, [])

  const viewSrs = useCallback(async () => {
    setShowStats(true)  // Also show Stats data in unified table
    setShowSrs(true)
    setShowPerformance(false)
  }, [])

  const state: SessionState = {
    sessionId,
    question,
    pinyin,
    progress,
    input,
    lastEval,
    results,
    streak,
    bestStreak,
    isHighIntensityMode,
    userLevel,
    focusMode,
    adaptiveFeedbackDuration,
    questionStartTime,
    inBrowseMode,
    browseRows,
    browseIndex,
    browsePinyin,
    inReviewMode,
    reviewCards,
    reviewPosition,
    inDrawingMode,
    drawingCards,
    drawingPosition,
    drawingProgress,
    sprintMode,
    sprintStartTime,
    sprintTimeLeft,
    oldFocusMode,
    sets,
    categories,
    selectedSet,
    selectedCategory,
    selectedSets,
    mode,
    diffEasy,
    diffMedium,
    diffHard,
    showSrs,
    srsRows,
    showStats,
    stats,
    showPerformance,
    performance,
    difficultyRows
  }

  const actions: SessionActions = {
    resetSessionUI,
    beginAutoSession,
    beginSetSession,
    beginCategorySession,
    beginMultiSetSession,
    beginDifficultSet: beginSetSession, // Placeholder
    beginDifficultCategory: beginCategorySession, // Placeholder
    beginMultiSetDifficult: beginMultiSetSession, // Placeholder
    beginSrsSets: beginSetSession, // Placeholder
    beginSrsCategories: beginCategorySession, // Placeholder
    beginMultiSetSrs: beginMultiSetSession, // Placeholder
    beginSprintMode: beginSetSession, // Placeholder
    beginDrawingMode: beginSetSession, // Placeholder
    submitAnswer,
    beginBrowse: beginSetSession, // Placeholder
    exitBrowse: () => setInBrowseMode(false),
    nextBrowse: () => setBrowseIndex(i => Math.min(i + 1, Math.max(0, browseRows.length - 1))),
    prevBrowse: () => setBrowseIndex(i => Math.max(i - 1, 0)),
    beginReviewIncorrect: beginSetSession, // Placeholder
    viewSrs,
    viewStats,
    viewPerformance: beginSetSession, // Placeholder
    setInput,
    setSelectedSet,
    setSelectedCategory,
    setSelectedSets,
    setMode,
    setUserLevel,
    setFocusMode,
    setIsHighIntensityMode,
    setOldFocusMode,
    setDiffEasy,
    setDiffMedium,
    setDiffHard,
    setDrawingPosition,
    setDrawingProgress,
    setInDrawingMode,
    addSetToSelection,
    removeSetFromSelection
  }

  return [state, actions]
}
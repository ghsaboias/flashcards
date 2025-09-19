// Consolidated session management hook to replace 40+ useState calls

import { useCallback, useEffect, useState } from 'react'
import type { SessionState, SessionActions } from '../types/session-types'
import type { SessionResponse } from '../types/api-types'
import { apiClient } from '../utils/api-client'
import { aggregateMultiSetStats, createEmptyStatsSummary } from '../utils/stats-aggregation'
import { getPinyinForText, hasChinese } from '../utils/pinyin'
import { validateUserAnswer } from '../utils/text-utils'
import {
  createEmptySessionState,
  createCoreSessionReset,
  createSpecialModesReset,
  createViewStatesReset,
  updateSessionFromResponse,
  addSetToSelection,
  removeSetFromSelection
} from '../utils/session-utils'

export function useSessionManager(): [SessionState, SessionActions] {
  // Single state object instead of 40+ useState calls
  const [state, setState] = useState<SessionState>(createEmptySessionState)

  // Load initial data
  useEffect(() => {
    (async () => {
      try {
        const [sets, categories] = await Promise.all([
          apiClient.listSets(),
          apiClient.listCategories()
        ])

        setState(prev => ({
          ...prev,
          sets: Array.isArray(sets) ? sets : [],
          categories: Array.isArray(categories) ? categories : [],
          selectedSet: Array.isArray(sets) && sets.length > 0 ? sets[0] : "",
          selectedCategory: Array.isArray(categories) && categories.length > 0 ? categories[0] : ""
        }))
      } catch (error) {
        console.error('Failed to load sets/categories:', error)
        setState(prev => ({
          ...prev,
          sets: [],
          categories: []
        }))
      }
    })()
  }, [])

  // Keep Stats & SRS view in sync when mode or selection changes
  useEffect(() => {
    if (!state.showStats && !state.showSrs) return

    ;(async () => {
      try {
        if (state.mode === 'set' && state.selectedSet) {
          const [statsRes, srsRes] = await Promise.all([
            state.showStats ? apiClient.getStatsForSet(state.selectedSet) : Promise.resolve(null),
            state.showSrs ? apiClient.getSrsForSet(state.selectedSet) : Promise.resolve([])
          ])

          setState(prev => ({
            ...prev,
            stats: statsRes || prev.stats,
            srsRows: srsRes || []
          }))
        } else if (state.mode === 'category' && state.selectedCategory) {
          const [statsRes, srsRes] = await Promise.all([
            state.showStats ? apiClient.getStatsForCategory(state.selectedCategory) : Promise.resolve(null),
            state.showSrs ? apiClient.getSrsForCategory(state.selectedCategory) : Promise.resolve([])
          ])

          setState(prev => ({
            ...prev,
            stats: statsRes || prev.stats,
            srsRows: srsRes || []
          }))
        } else if (state.mode === 'multi-set' && state.selectedSets.length > 0) {
          if (state.showStats) {
            const statsResult = await aggregateMultiSetStats(state.selectedSets)
            setState(prev => ({ ...prev, stats: statsResult }))
          }

          if (state.showSrs) {
            const allSrsRows = await apiClient.getMultiSetSrs(state.selectedSets)
            setState(prev => ({ ...prev, srsRows: allSrsRows }))
          }
        }
      } catch {
        setState(prev => ({
          ...prev,
          stats: {
            summary: createEmptyStatsSummary(),
            rows: [],
          }
        }))
      }
    })()
  }, [state.showStats, state.showSrs, state.mode, state.selectedSet, state.selectedCategory, state.selectedSets])

  // Consolidated reset function
  const resetSessionUI = useCallback(() => {
    setState(prev => ({
      ...prev,
      ...createCoreSessionReset(),
      ...createSpecialModesReset(),
      ...createViewStatesReset()
    }))
  }, [])

  // Generic session initialization
  const initializeSession = useCallback(async (
    sessionStarter: () => Promise<SessionResponse>,
    options: {
      setHighIntensity?: boolean
      trackStartTime?: boolean
      resetType?: 'all' | 'core' | 'modes' | 'views'
    } = {}
  ) => {
    const { setHighIntensity = false, trackStartTime = false, resetType = 'all' } = options

    // Reset appropriate state
    setState(prev => {
      let resetData = {}
      if (resetType === 'all') {
        resetData = { ...createCoreSessionReset(), ...createSpecialModesReset(), ...createViewStatesReset() }
      } else if (resetType === 'core') {
        resetData = createCoreSessionReset()
      } else if (resetType === 'modes') {
        resetData = createSpecialModesReset()
      } else if (resetType === 'views') {
        resetData = createViewStatesReset()
      }

      return {
        ...prev,
        ...resetData,
        ...(setHighIntensity && { isHighIntensityMode: true })
      }
    })

    // Start session and populate state
    const res = await sessionStarter()
    setState(prev => {
      const updates = updateSessionFromResponse(prev, res)
      return {
        ...prev,
        ...updates,
        ...(trackStartTime && {
          questionStartTime: Date.now(),
          sessionStartTime: Date.now()
        })
      }
    })

    return res
  }, [])

  // Session start methods
  const beginAutoSession = useCallback(async (domainId?: string) => {
    await initializeSession(
      () => apiClient.startAutoSession({ domain_id: domainId }),
      { setHighIntensity: true, trackStartTime: true }
    )
  }, [initializeSession])

  const beginSetSession = useCallback(async () => {
    await initializeSession(
      () => apiClient.startSession({ mode: 'set_all', set_name: state.selectedSet })
    )
  }, [state.selectedSet, initializeSession])

  const beginCategorySession = useCallback(async () => {
    await initializeSession(
      () => apiClient.startSession({ mode: 'category_all', category: state.selectedCategory })
    )
  }, [state.selectedCategory, initializeSession])

  const beginMultiSetSession = useCallback(async () => {
    await initializeSession(
      () => apiClient.startSession({ mode: 'multi_set_all', selected_sets: state.selectedSets }),
      { trackStartTime: true }
    )
  }, [state.selectedSets, initializeSession])

  const beginReviewIncorrect = useCallback(async () => {
    const wrong = state.results.filter(r => !r.correct)
    if (wrong.length === 0) return

    const reviewItems = wrong.map(r => ({
      question: r.question,
      answer: r.correct_answer,
      set_name: r.set_name || state.selectedSet || ''
    }))

    try {
      const res = await apiClient.startSession({ mode: 'review_incorrect', review_items: reviewItems })
      if (!res.done) {
        await initializeSession(() => Promise.resolve(res), { trackStartTime: true })
        return
      }
    } catch (error) {
      console.warn('Falling back to local review mode:', error)
    }

    // Fallback to local review mode
    setState(prev => ({
      ...prev,
      ...createCoreSessionReset(),
      inReviewMode: true,
      reviewCards: wrong.map(r => ({
        question: r.question,
        pinyin: r.pinyin,
        correct_answer: r.correct_answer,
        answer: r.correct_answer,
        set_name: r.set_name
      })),
      reviewPosition: 0,
      question: wrong[0]?.question || "",
      pinyin: wrong[0]?.pinyin || '',
      progress: { current: 0, total: wrong.length },
      questionStartTime: Date.now()
    }))
  }, [state.results, state.mode, state.selectedSet, initializeSession])

  const submitAnswer = useCallback(async () => {
    if (!state.input.trim()) return

    // Local review mode branch
    if (state.inReviewMode) {
      const current = state.reviewCards[state.reviewPosition]
      const isCorrect = validateUserAnswer(state.input, current?.correct_answer || '')

      setState(prev => {
        const newStreak = isCorrect ? prev.streak + 1 : 0
        const newResults = [
          ...prev.results,
          {
            question: current?.question || '',
            pinyin: current?.pinyin || '',
            user_answer: prev.input,
            correct_answer: current?.correct_answer || '',
            correct: isCorrect,
            answer: current?.correct_answer || '',
            set_name: current?.set_name
          }
        ]

        const nextPos = prev.reviewPosition + 1
        const isComplete = nextPos >= prev.reviewCards.length

        return {
          ...prev,
          input: "",
          lastEval: { correct: isCorrect, correct_answer: current?.correct_answer || '' },
          streak: newStreak,
          bestStreak: Math.max(prev.bestStreak, newStreak),
          results: newResults,
          reviewPosition: nextPos,
          question: isComplete ? "" : prev.reviewCards[nextPos]?.question || "",
          pinyin: isComplete ? "" : prev.reviewCards[nextPos]?.pinyin || '',
          progress: { current: nextPos, total: prev.reviewCards.length },
          inReviewMode: !isComplete
        }
      })
      return
    }

    // Normal server-backed session with timing
    if (!state.sessionId) return
    const responseTime = Date.now() - state.questionStartTime

    try {
      const res = await apiClient.answerQuestionWithTiming(state.sessionId, state.input, responseTime)
      const updates = updateSessionFromResponse(state, res)

      setState(prev => ({
        ...prev,
        input: "",
        ...updates,
        questionStartTime: res.done ? 0 : Date.now()
      }))

      // Compute pinyin for results if session is complete
      if (res.done && res.results) {
        const resultsWithPinyin = await Promise.all(
          res.results.map(async (result) => ({
            ...result,
            pinyin: hasChinese(result.question) ? await getPinyinForText(result.question).catch(() => '') : ''
          }))
        )
        setState(prev => ({ ...prev, results: resultsWithPinyin }))
      }
    } catch (error) {
      console.error('Failed to submit answer:', error)
    }
  }, [state])

  // View actions
  const viewStats = useCallback(async () => {
    setState(prev => ({
      ...prev,
      showStats: true,
      showSrs: true,
      showPerformance: false
    }))
  }, [])

  const viewSrs = useCallback(async () => {
    setState(prev => ({
      ...prev,
      showStats: true,
      showSrs: true,
      showPerformance: false
    }))
  }, [])

  // Simple setters
  const setInput = useCallback((value: string) => {
    setState(prev => ({ ...prev, input: value }))
  }, [])

  const setSelectedSet = useCallback((value: string) => {
    setState(prev => ({ ...prev, selectedSet: value }))
  }, [])

  const setSelectedCategory = useCallback((value: string) => {
    setState(prev => ({ ...prev, selectedCategory: value }))
  }, [])

  const setSelectedSets = useCallback((value: string[]) => {
    setState(prev => ({ ...prev, selectedSets: value }))
  }, [])

  const setMode = useCallback((value: 'set' | 'category' | 'multi-set') => {
    setState(prev => ({ ...prev, mode: value }))
  }, [])


  const setIsHighIntensityMode = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, isHighIntensityMode: value }))
  }, [])

  const setOldFocusMode = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, oldFocusMode: value }))
  }, [])

  const setDiffEasy = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, diffEasy: value }))
  }, [])

  const setDiffMedium = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, diffMedium: value }))
  }, [])

  const setDiffHard = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, diffHard: value }))
  }, [])

  const setDrawingPosition = useCallback((value: number) => {
    setState(prev => ({ ...prev, drawingPosition: value }))
  }, [])

  const setDrawingProgress = useCallback((value: { current: number; total: number }) => {
    setState(prev => ({ ...prev, drawingProgress: value }))
  }, [])

  const setInDrawingMode = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, inDrawingMode: value }))
  }, [])

  // Multi-set helpers
  const addSetToSelectionAction = useCallback((setName: string) => {
    setState(prev => ({
      ...prev,
      selectedSets: addSetToSelection(prev.selectedSets, setName)
    }))
  }, [])

  const removeSetFromSelectionAction = useCallback((setName: string) => {
    setState(prev => ({
      ...prev,
      selectedSets: removeSetFromSelection(prev.selectedSets, setName)
    }))
  }, [])

  // Create actions object
  const actions: SessionActions = {
    resetSessionUI,
    beginAutoSession,
    beginSetSession,
    beginCategorySession,
    beginMultiSetSession,
    beginDifficultSet: async () => {
      await apiClient.startSession({ mode: 'set_difficult', set_name: state.selectedSet })
        .then(res => initializeSession(() => Promise.resolve(res)))
        .catch(() => beginSetSession()) // Fallback
    },
    beginDifficultCategory: async () => {
      await apiClient.startSession({ mode: 'category_difficult', category: state.selectedCategory })
        .then(res => initializeSession(() => Promise.resolve(res)))
        .catch(() => beginCategorySession()) // Fallback
    },
    beginMultiSetDifficult: async () => {
      await apiClient.startSession({ mode: 'multi_set_difficult', selected_sets: state.selectedSets })
        .then(res => initializeSession(() => Promise.resolve(res)))
        .catch(() => beginMultiSetSession()) // Fallback
    },
    beginSrsSets: async () => {
      await apiClient.startSession({ mode: 'set_srs', set_name: state.selectedSet })
        .then(res => initializeSession(() => Promise.resolve(res)))
        .catch(() => beginSetSession()) // Fallback
    },
    beginSrsCategories: async () => {
      await apiClient.startSession({ mode: 'category_srs', category: state.selectedCategory })
        .then(res => initializeSession(() => Promise.resolve(res)))
        .catch(() => beginCategorySession()) // Fallback
    },
    beginMultiSetSrs: async () => {
      await apiClient.startSession({ mode: 'multi_set_srs', selected_sets: state.selectedSets })
        .then(res => initializeSession(() => Promise.resolve(res)))
        .catch(() => beginMultiSetSession()) // Fallback
    },
    beginDrawingMode: async () => {
      setState(prev => ({ ...prev, inDrawingMode: true }))
      await beginSetSession()
    },
    submitAnswer,
    beginBrowse: async () => {
      setState(prev => ({ ...prev, inBrowseMode: true }))
      // Implement browse mode logic here
    },
    exitBrowse: () => setState(prev => ({ ...prev, inBrowseMode: false })),
    nextBrowse: () => setState(prev => ({ ...prev, browseIndex: Math.min(prev.browseIndex + 1, Math.max(0, prev.browseRows.length - 1)) })),
    prevBrowse: () => setState(prev => ({ ...prev, browseIndex: Math.max(prev.browseIndex - 1, 0) })),
    beginReviewIncorrect,
    viewSrs,
    viewStats,
    viewPerformance: async () => {
      setState(prev => ({
        ...prev,
        showPerformance: true,
        showStats: false,
        showSrs: false
      }))

      try {
        const performanceData = await apiClient.getPerformanceData()
        setState(prev => ({ ...prev, performance: performanceData }))
      } catch (error) {
        console.error('Failed to fetch performance data:', error)
      }
    },
    setInput,
    setSelectedSet,
    setSelectedCategory,
    setSelectedSets,
    setMode,
    setIsHighIntensityMode,
    setOldFocusMode,
    setDiffEasy,
    setDiffMedium,
    setDiffHard,
    setDrawingPosition,
    setDrawingProgress,
    setInDrawingMode,
    addSetToSelection: addSetToSelectionAction,
    removeSetFromSelection: removeSetFromSelectionAction
  }

  return [state, actions]
}
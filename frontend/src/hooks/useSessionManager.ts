// Consolidated session management hook to replace 40+ useState calls

import { useCallback, useEffect, useState } from 'react'
import type { SessionState, SessionActions } from '../types/session-types'
import type { SessionResponse, Domain } from '../types/api-types'
import { apiClient } from '../utils/api-client'
import { aggregateMultiSetStats, createEmptyStatsSummary } from '../utils/stats-aggregation'
import { getPinyinForText, hasChinese } from '../utils/pinyin'
import {
  createEmptySessionState,
  createCoreSessionReset,
  createSpecialModesReset,
  createViewStatesReset,
  updateSessionFromResponse,
  addSetToSelection,
  removeSetFromSelection
} from '../utils/session-utils'

export function useSessionManager(selectedDomain?: Domain | null): [SessionState, SessionActions] {
  // Single state object instead of 40+ useState calls
  const [state, setState] = useState<SessionState>(createEmptySessionState)

  // Load sets and categories (domain-aware)
  useEffect(() => {
    (async () => {
      try {
        const sets = await apiClient.listSets(selectedDomain?.id)

        setState(prev => ({
          ...prev,
          sets: Array.isArray(sets) ? sets : []
        }))
      } catch (error) {
        console.error('Failed to load sets:', error)
        setState(prev => ({
          ...prev,
          sets: []
        }))
      }
    })()
  }, [selectedDomain?.id])

  // Keep stats view in sync when selection changes
  useEffect(() => {
    if (!state.statsMode) return

    ;(async () => {
      try {
        if (state.selectedSets.length > 0) {
          switch (state.statsMode) {
            case 'accuracy': {
              const statsResult = await aggregateMultiSetStats(state.selectedSets, selectedDomain?.id)
              setState(prev => ({ ...prev, stats: statsResult }))
              // Also load SRS data for unified view
              const allSrsRows = await apiClient.getMultiSetSrs(state.selectedSets, selectedDomain?.id)
              setState(prev => ({ ...prev, srsRows: allSrsRows }))
              break
            }
            case 'srs': {
              const srsRows = await apiClient.getMultiSetSrs(state.selectedSets, selectedDomain?.id)
              setState(prev => ({ ...prev, srsRows: srsRows }))
              break
            }
            case 'performance': {
              const performanceData = await apiClient.getPerformanceData()
              setState(prev => ({ ...prev, performance: performanceData }))
              break
            }
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
  }, [state.statsMode, state.selectedSets, selectedDomain?.id])

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
      set_name: r.set_name || state.selectedSets[0] || ''
    }))

    try {
      const res = await apiClient.startSession({ mode: 'review_incorrect', review_items: reviewItems })
      if (!res.done) {
        await initializeSession(() => Promise.resolve(res), { trackStartTime: true })
        return
      }
    } catch (error) {
      console.error('Failed to start review session:', error)
    }
  }, [state.results, state.selectedSets, initializeSession])

  const submitAnswer = useCallback(async () => {
    if (!state.input.trim()) return


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
  const setStatsMode = useCallback((mode: 'srs' | 'accuracy' | 'performance' | null) => {
    setState(prev => ({
      ...prev,
      statsMode: mode
    }))
  }, [])

  // Simple setters
  const setInput = useCallback((value: string) => {
    setState(prev => ({ ...prev, input: value }))
  }, [])



  const setSelectedSets = useCallback((value: string[]) => {
    setState(prev => ({ ...prev, selectedSets: value }))
  }, [])



  const setIsHighIntensityMode = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, isHighIntensityMode: value }))
  }, [])

  const setShowPinyin = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, showPinyin: value }))
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
    beginMultiSetSession,
    beginMultiSetDifficult: async () => {
      await apiClient.startSession({ mode: 'multi_set_difficult', selected_sets: state.selectedSets })
        .then(res => initializeSession(() => Promise.resolve(res)))
        .catch(() => beginMultiSetSession()) // Fallback
    },
    beginMultiSetSrs: async () => {
      await apiClient.startSession({ mode: 'multi_set_srs', selected_sets: state.selectedSets })
        .then(res => initializeSession(() => Promise.resolve(res)))
        .catch(() => beginMultiSetSession()) // Fallback
    },
    beginDrawingMode: async () => {
      setState(prev => ({ ...prev, inDrawingMode: true }))
      await beginMultiSetSession()
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
    setStatsMode,
    setInput,
    setSelectedSets,
    setIsHighIntensityMode,
    setShowPinyin,
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
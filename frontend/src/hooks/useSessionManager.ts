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
        if (state.statsMode === 'performance') {
          const performanceData = await apiClient.getPerformanceData(selectedDomain?.id)
          setState(prev => ({ ...prev, performance: performanceData }))
          return
        }

        if (state.selectedSets.length === 0) {
          if (state.statsMode === 'accuracy') {
            setState(prev => ({
              ...prev,
              stats: {
                summary: createEmptyStatsSummary(),
                rows: [],
              }
            }))
          }

          if (state.statsMode === 'srs') {
            setState(prev => ({
              ...prev,
              srsRows: []
            }))
          }
          return
        }

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
            setState(prev => ({ ...prev, srsRows }))
            break
          }
        }
      } catch (error) {
        console.error('Failed to load stats data:', error)
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

  const clearNewCardsDetection = useCallback(() => {
    setState(prev => ({
      ...prev,
      newCardsDetection: null
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
  const beginAutoSession = useCallback(async (domainId?: string, skipNewCardCheck?: boolean, excludeNewCards?: boolean) => {
    try {
      const response = await apiClient.startAutoSession({
        domain_id: domainId,
        skip_new_card_check: skipNewCardCheck,
        exclude_new_cards: excludeNewCards
      })

      // Check if this is a new cards detection response
      if ('type' in response && response.type === 'new_cards_detected') {
        // Store the detection response in state for UI to handle
        setState(prev => ({
          ...prev,
          newCardsDetection: response
        }))
        return response
      }

      // Normal session response - initialize as usual
      return initializeSession(
        () => Promise.resolve(response as SessionResponse),
        { setHighIntensity: true, trackStartTime: true }
      )
    } catch (error) {
      console.error('Failed to start auto session:', error)
      throw error
    }
  }, [initializeSession, setState])



  const beginMultiSetSession = useCallback(async () => {
    return initializeSession(
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
        return initializeSession(() => Promise.resolve(res), { trackStartTime: true })
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
    clearNewCardsDetection,
    beginAutoSession,
    beginMultiSetSession,
    beginMultiSetDifficult: async () => {
      try {
        const res = await apiClient.startSession({ mode: 'multi_set_difficult', selected_sets: state.selectedSets })
        return initializeSession(() => Promise.resolve(res))
      } catch (error) {
        console.error('Failed to start difficult session, falling back to multi-set:', error)
        return beginMultiSetSession()
      }
    },
    beginMultiSetSrs: async () => {
      try {
        const res = await apiClient.startSession({ mode: 'multi_set_srs', selected_sets: state.selectedSets })
        return initializeSession(() => Promise.resolve(res))
      } catch (error) {
        console.error('Failed to start SRS session, falling back to multi-set:', error)
        return beginMultiSetSession()
      }
    },
    submitAnswer,
    beginReviewIncorrect,
    setStatsMode,
    setInput,
    setSelectedSets,
    setIsHighIntensityMode,
    setShowPinyin,
    setDiffEasy,
    setDiffMedium,
    setDiffHard,
    addSetToSelection: addSetToSelectionAction,
    removeSetFromSelection: removeSetFromSelectionAction,
    restoreSessionFromBackend: async (sessionId: string, sessionData: SessionResponse) => {
      setState(prev => ({
        ...prev,
        sessionId,
        done: sessionData.done,
        progress: sessionData.progress,
        question: sessionData.current_question || '',
        results: sessionData.results || []
      }))
    }
  }

  return [state, actions]
}

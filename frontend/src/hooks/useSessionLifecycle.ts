import { useCallback } from 'react'
import type { SessionState } from '../types/session-types'
import type { SessionResponse, NewCardsDetectionResponse } from '../types/api-types'
import { apiClient } from '../utils/api-client'
import {
  createCoreSessionReset,
  createSpecialModesReset,
  createViewStatesReset,
  updateSessionFromResponse
} from '../utils/session-utils'
import { getPinyinForText, hasChinese } from '../utils/pinyin'

interface UseSessionLifecycleParams {
  state: SessionState
  setState: React.Dispatch<React.SetStateAction<SessionState>>
}

interface InitializeSessionOptions {
  setHighIntensity?: boolean
  trackStartTime?: boolean
  resetType?: 'all' | 'core' | 'modes' | 'views'
}

export interface SessionLifecycleActions {
  initializeSession: (
    sessionStarter: () => Promise<SessionResponse>,
    options?: InitializeSessionOptions
  ) => Promise<SessionResponse>
  beginAutoSession: (
    domainId?: string,
    skipNewCardCheck?: boolean,
    excludeNewCards?: boolean,
    connectionAware?: boolean
  ) => Promise<SessionResponse | NewCardsDetectionResponse | undefined>
  beginMultiSetSession: () => Promise<SessionResponse | undefined>
  beginMultiSetDifficult: () => Promise<SessionResponse | undefined>
  beginMultiSetSrs: () => Promise<SessionResponse | undefined>
  beginReviewIncorrect: () => Promise<SessionResponse | undefined>
  submitAnswer: () => Promise<void>
  playAgain: (sessionId: string) => Promise<SessionResponse | undefined>
  restoreSessionFromBackend: (sessionId: string, sessionData: SessionResponse) => Promise<void>
}

export function useSessionLifecycle({ state, setState }: UseSessionLifecycleParams): SessionLifecycleActions {
  const initializeSession = useCallback(async (
    sessionStarter: () => Promise<SessionResponse>,
    options: InitializeSessionOptions = {}
  ) => {
    const { setHighIntensity = false, trackStartTime = false, resetType = 'all' } = options

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
  }, [setState])

  const beginAutoSession = useCallback(async (
    domainId?: string,
    skipNewCardCheck?: boolean,
    excludeNewCards?: boolean,
    connectionAware?: boolean
  ) => {
    try {
      const response = await apiClient.startAutoSession({
        domain_id: domainId,
        skip_new_card_check: skipNewCardCheck,
        exclude_new_cards: excludeNewCards,
        connection_aware: connectionAware
      })

      if ('type' in response && response.type === 'new_cards_detected') {
        setState(prev => ({
          ...prev,
          newCardsDetection: response
        }))
        return response
      }

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
    try {
      const response = await apiClient.startSession({
        mode: 'multi_set_all',
        selected_sets: state.selectedSets
      })
      return initializeSession(() => Promise.resolve(response), { trackStartTime: true })
    } catch (error) {
      console.error('Failed to start multi-set session:', error)
      return undefined
    }
  }, [initializeSession, state.selectedSets])

  const beginMultiSetDifficult = useCallback(async () => {
    try {
      const response = await apiClient.startSession({
        mode: 'multi_set_difficult',
        selected_sets: state.selectedSets
      })
      return initializeSession(() => Promise.resolve(response))
    } catch (error) {
      console.error('Failed to start difficult session, falling back to multi-set:', error)
      return beginMultiSetSession()
    }
  }, [beginMultiSetSession, initializeSession, state.selectedSets])

  const beginMultiSetSrs = useCallback(async () => {
    try {
      const response = await apiClient.startSession({
        mode: 'multi_set_srs',
        selected_sets: state.selectedSets
      })
      return initializeSession(() => Promise.resolve(response))
    } catch (error) {
      console.error('Failed to start SRS session, falling back to multi-set:', error)
      return beginMultiSetSession()
    }
  }, [beginMultiSetSession, initializeSession, state.selectedSets])

  const beginReviewIncorrect = useCallback(async () => {
    const wrong = state.results.filter(r => !r.correct)
    if (wrong.length === 0) return undefined

    const reviewItems = wrong.map(r => ({
      question: r.question,
      answer: r.correct_answer,
      set_name: r.set_name || state.selectedSets[0] || ''
    }))

    try {
      const response = await apiClient.startSession({
        mode: 'review_incorrect',
        review_items: reviewItems
      })

      if (response.done) {
        return response
      }

      return initializeSession(() => Promise.resolve(response), { trackStartTime: true })
    } catch (error) {
      console.error('Failed to start review session:', error)
      return undefined
    }
  }, [initializeSession, state.results, state.selectedSets])

  const submitAnswer = useCallback(async () => {
    if (!state.input.trim()) return
    if (!state.sessionId) return

    const responseTime = Date.now() - state.questionStartTime

    try {
      const res = await apiClient.answerQuestionWithTiming(state.sessionId, state.input, responseTime)
      const updates = updateSessionFromResponse(state, res)

      setState(prev => ({
        ...prev,
        input: '',
        ...updates,
        questionStartTime: res.done ? 0 : Date.now()
      }))

      if (res.done && res.results) {
        const resultsWithPinyin = await Promise.all(
          res.results.map(async (result) => ({
            ...result,
            pinyin: hasChinese(result.question)
              ? await getPinyinForText(result.question).catch(() => '')
              : ''
          }))
        )

        setState(prev => ({
          ...prev,
          results: resultsWithPinyin
        }))
      }
    } catch (error) {
      console.error('Failed to submit answer:', error)
    }
  }, [setState, state])

  const playAgain = useCallback(async (sessionId: string) => {
    try {
      const response = await apiClient.playAgain(sessionId)
      return initializeSession(() => Promise.resolve(response))
    } catch (error) {
      console.error('Failed to start play again session:', error)
      return undefined
    }
  }, [initializeSession])

  const restoreSessionFromBackend = useCallback(async (sessionId: string, sessionData: SessionResponse) => {
    setState(prev => ({
      ...prev,
      sessionId,
      done: sessionData.done,
      progress: sessionData.progress,
      question: sessionData.current_question || '',
      results: sessionData.results || []
    }))
  }, [setState])

  return {
    initializeSession,
    beginAutoSession,
    beginMultiSetSession,
    beginMultiSetDifficult,
    beginMultiSetSrs,
    beginReviewIncorrect,
    submitAnswer,
    playAgain,
    restoreSessionFromBackend
  }
}

import { useMemo } from 'react'
import type { Domain } from '../types/api-types'
import type { SessionActions, SessionState } from '../types/session-types'
import { useSessionStateStore } from './useSessionStateStore'
import { useSessionData } from './useSessionData'
import { useSessionLifecycle } from './useSessionLifecycle'
import { useConnectionAwareSession } from './useConnectionAwareSession'

export function useSessionManager(selectedDomain?: Domain | null): [SessionState, SessionActions] {
  const { state, setState, actions: stateActions } = useSessionStateStore()

  useSessionData({ state, setState, selectedDomainId: selectedDomain?.id })

  const lifecycle = useSessionLifecycle({ state, setState })
  const {
    initializeSession,
    beginAutoSession,
    beginMultiSetSession,
    beginMultiSetDifficult,
    beginMultiSetSrs,
    beginReviewIncorrect,
    submitAnswer,
    playAgain,
    restoreSessionFromBackend
  } = lifecycle

  const { beginConnectionAwareSession } = useConnectionAwareSession({
    state,
    setState,
    selectedDomain,
    initializeSession
  })

  const {
    resetSessionUI,
    clearNewCardsDetection,
    setStatsMode,
    setInput,
    setSelectedSets,
    setIsHighIntensityMode,
    setShowPinyin,
    setDiffEasy,
    setDiffMedium,
    setDiffHard,
    addSetToSelection,
    removeSetFromSelection,
    setLearningMode,
    setSelectedCluster,
  } = stateActions

  const actions: SessionActions = useMemo(() => ({
    resetSessionUI,
    clearNewCardsDetection,
    beginAutoSession,
    beginConnectionAwareSession,
    beginMultiSetSession,
    beginMultiSetDifficult,
    beginMultiSetSrs,
    submitAnswer,
    beginReviewIncorrect,
    playAgain,
    setStatsMode,
    setInput,
    setSelectedSets,
    setIsHighIntensityMode,
    setShowPinyin,
    setDiffEasy,
    setDiffMedium,
    setDiffHard,
    addSetToSelection,
    removeSetFromSelection,
    setLearningMode,
    setSelectedCluster,
    restoreSessionFromBackend
  }), [
    resetSessionUI,
    clearNewCardsDetection,
    beginAutoSession,
    beginConnectionAwareSession,
    beginMultiSetSession,
    beginMultiSetDifficult,
    beginMultiSetSrs,
    submitAnswer,
    beginReviewIncorrect,
    playAgain,
    setStatsMode,
    setInput,
    setSelectedSets,
    setIsHighIntensityMode,
    setShowPinyin,
    setDiffEasy,
    setDiffMedium,
    setDiffHard,
    addSetToSelection,
    removeSetFromSelection,
    setLearningMode,
    setSelectedCluster,
    restoreSessionFromBackend
  ])

  return [state, actions]
}

import { useCallback, useState } from 'react'
import type { SessionState } from '../types/session-types'
import type { LearningMode } from '../types/session-types'
import {
  addSetToSelection,
  createCoreSessionReset,
  createEmptySessionState,
  createSpecialModesReset,
  createViewStatesReset,
  removeSetFromSelection
} from '../utils/session-utils'

export interface SessionStateStoreActions {
  resetSessionUI: () => void
  clearNewCardsDetection: () => void
  setStatsMode: (mode: 'srs' | 'accuracy' | 'performance' | null) => void
  setInput: (value: string) => void
  setSelectedSets: (value: string[]) => void
  setIsHighIntensityMode: (value: boolean) => void
  setShowPinyin: (value: boolean) => void
  setDiffEasy: (value: boolean) => void
  setDiffMedium: (value: boolean) => void
  setDiffHard: (value: boolean) => void
  addSetToSelection: (setName: string) => void
  removeSetFromSelection: (setName: string) => void
  setLearningMode: (mode: LearningMode) => void
  setSelectedCluster: (clusterId: string | null) => void
}

export interface SessionStateStore {
  state: SessionState
  setState: React.Dispatch<React.SetStateAction<SessionState>>
  actions: SessionStateStoreActions
}

export function useSessionStateStore(): SessionStateStore {
  const [state, setState] = useState<SessionState>(createEmptySessionState)

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

  const setStatsMode = useCallback((mode: 'srs' | 'accuracy' | 'performance' | null) => {
    setState(prev => ({
      ...prev,
      statsMode: mode
    }))
  }, [])

  const setInput = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      input: value
    }))
  }, [])

  const setSelectedSets = useCallback((value: string[]) => {
    setState(prev => ({
      ...prev,
      selectedSets: value
    }))
  }, [])

  const setIsHighIntensityMode = useCallback((value: boolean) => {
    setState(prev => ({
      ...prev,
      isHighIntensityMode: value
    }))
  }, [])

  const setShowPinyin = useCallback((value: boolean) => {
    setState(prev => ({
      ...prev,
      showPinyin: value
    }))
  }, [])

  const setDiffEasy = useCallback((value: boolean) => {
    setState(prev => ({
      ...prev,
      diffEasy: value
    }))
  }, [])

  const setDiffMedium = useCallback((value: boolean) => {
    setState(prev => ({
      ...prev,
      diffMedium: value
    }))
  }, [])

  const setDiffHard = useCallback((value: boolean) => {
    setState(prev => ({
      ...prev,
      diffHard: value
    }))
  }, [])

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

  const setLearningMode = useCallback((mode: LearningMode) => {
    setState(prev => (prev.learningMode === mode ? prev : { ...prev, learningMode: mode }))
  }, [])

  const setSelectedCluster = useCallback((clusterId: string | null) => {
    setState(prev => ({
      ...prev,
      selectedCluster: clusterId
    }))
  }, [])


  return {
    state,
    setState,
    actions: {
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
      addSetToSelection: addSetToSelectionAction,
      removeSetFromSelection: removeSetFromSelectionAction,
      setLearningMode,
      setSelectedCluster,
    }
  }
}

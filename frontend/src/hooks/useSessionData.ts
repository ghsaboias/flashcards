import { useEffect } from 'react'
import type { SessionState } from '../types/session-types'
import { apiClient } from '../utils/api-client'
import { aggregateMultiSetStats, createEmptyStatsSummary } from '../utils/stats-aggregation'

interface UseSessionDataParams {
  state: SessionState
  setState: React.Dispatch<React.SetStateAction<SessionState>>
  selectedDomainId?: string
}

export function useSessionData({ state, setState, selectedDomainId }: UseSessionDataParams) {
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const sets = await apiClient.listSets(selectedDomainId)
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            sets: Array.isArray(sets) ? sets : []
          }))
        }
      } catch (error) {
        console.error('Failed to load sets:', error)
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            sets: []
          }))
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedDomainId, setState])

  useEffect(() => {
    if (!state.statsMode) return

    let cancelled = false

    ;(async () => {
      try {
        if (state.statsMode === 'performance') {
          const performanceData = await apiClient.getPerformanceData(selectedDomainId)
          if (!cancelled) {
            setState(prev => ({ ...prev, performance: performanceData }))
          }
          return
        }

        if (state.selectedSets.length === 0) {
          if (!cancelled) {
            if (state.statsMode === 'accuracy') {
              setState(prev => ({
                ...prev,
                stats: {
                  summary: createEmptyStatsSummary(),
                  rows: []
                }
              }))
            }

            if (state.statsMode === 'srs') {
              setState(prev => ({
                ...prev,
                srsRows: []
              }))
            }
          }
          return
        }

        switch (state.statsMode) {
          case 'accuracy': {
            const statsResult = await aggregateMultiSetStats(state.selectedSets, selectedDomainId)
            const allSrsRows = await apiClient.getMultiSetSrs(state.selectedSets, selectedDomainId)
            if (!cancelled) {
              setState(prev => ({
                ...prev,
                stats: statsResult,
                srsRows: allSrsRows
              }))
            }
            break
          }
          case 'srs': {
            const srsRows = await apiClient.getMultiSetSrs(state.selectedSets, selectedDomainId)
            if (!cancelled) {
              setState(prev => ({
                ...prev,
                srsRows
              }))
            }
            break
          }
        }
      } catch (error) {
        console.error('Failed to load stats data:', error)
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            stats: {
              summary: createEmptyStatsSummary(),
              rows: []
            }
          }))
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [state.statsMode, state.selectedSets, selectedDomainId, setState])
}

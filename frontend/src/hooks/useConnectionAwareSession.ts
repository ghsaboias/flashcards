import { useCallback, useEffect, useState } from 'react'
import type { SessionState } from '../types/session-types'
import type { Domain, SessionResponse } from '../types/api-types'
import { KnowledgeGraphSession } from '../utils/knowledgeGraphSession'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'
const API_TOKEN = import.meta.env.VITE_API_TOKEN

interface UseConnectionAwareSessionParams {
  state: SessionState
  setState: React.Dispatch<React.SetStateAction<SessionState>>
  selectedDomain?: Domain | null
  initializeSession: (
    sessionStarter: () => Promise<SessionResponse>,
    options?: {
      setHighIntensity?: boolean
      trackStartTime?: boolean
      resetType?: 'all' | 'core' | 'modes' | 'views'
    }
  ) => Promise<SessionResponse>
}

export interface ConnectionAwareActions {
  beginConnectionAwareSession: (clusterId?: string, phase?: string) => Promise<SessionResponse | undefined>
}

export function useConnectionAwareSession({
  state,
  setState,
  selectedDomain,
  initializeSession
}: UseConnectionAwareSessionParams): ConnectionAwareActions {
  const [sessionGenerator, setSessionGenerator] = useState<KnowledgeGraphSession | null>(null)

  const normalizeClusters = useCallback((clusters: any[] = []) =>
    clusters.map((cluster: any) => {
      const anchors = cluster.anchors || cluster.anchor_characters || []
      const completionValue = cluster.completion_percentage ?? cluster.completion ?? 0
      const completion = typeof completionValue === 'number' && completionValue > 1
        ? completionValue / 100
        : completionValue || 0

      return {
        ...cluster,
        anchors,
        completion
      }
    }), [])

  useEffect(() => {
    setState(prev => {
      if (selectedDomain?.id === 'chinese') {
        return prev
      }

      if (
        prev.learningMode === 'random' &&
        prev.selectedCluster === null
      ) {
        return prev
      }

      return {
        ...prev,
        learningMode: 'random',
        selectedCluster: null,
        availableClusters: []
      }
    })
  }, [selectedDomain?.id, setState])

  useEffect(() => {
    if (!selectedDomain?.id || state.learningMode !== 'connected') return

    let cancelled = false

    ;(async () => {
      try {
        const [networkData, userProgress] = await Promise.all([
          fetch(`/api/network-data/${selectedDomain.id}`).then(r => r.json()),
          fetch(`/api/user-progress/${selectedDomain.id}`).then(r => r.json())
        ])

        if (cancelled) return

        const generator = new KnowledgeGraphSession(networkData, userProgress)
        setSessionGenerator(generator)

        const clusters = normalizeClusters(generator.getAvailableClusters())
        setState(prev => ({
          ...prev,
          availableClusters: clusters
        }))

        console.log('Connection-aware learning initialized:', { clusters: clusters.length })
      } catch (error) {
        console.error('Failed to initialize connection-aware learning:', error)
        if (!cancelled) {
          setState(prev => (
            prev.learningMode === 'random'
              ? prev
              : {
                ...prev,
                learningMode: 'random',
                availableClusters: [],
              }
          ))
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedDomain?.id, state.learningMode, normalizeClusters, setState])

  const beginConnectionAwareSession = useCallback(async (clusterId?: string, phase?: string): Promise<SessionResponse | undefined> => {
    if (!sessionGenerator) {
      console.warn('Session generator not initialized, skipping connection-aware start')
      return undefined
    }

    try {
      const sessionPhase = (phase as 'anchor' | 'discovery' | 'expansion' | 'integration' | 'mastery') || 'anchor'
      const activeCluster = clusterId || state.selectedCluster || undefined
      const session = sessionGenerator.generateSession(sessionPhase, activeCluster, {
        maxCharacters: 8,
        practiceMode: 'mixed'
      })

      if (session.type === 'cluster_selection') {
        setState(prev => ({
          ...prev,
          availableClusters: normalizeClusters(session.clusters || []),
          selectedCluster: null
        }))
        return undefined
      }

      if (session.type === 'practice_session' && session.characters && session.characters.length > 0) {
        const autoStartPayload = {
          user_level: 'intermediate',
          focus_mode: 'challenge',
          domain_id: selectedDomain?.id || 'chinese',
          connection_aware: true,
          cluster_id: session.clusterId,
          phase: session.phase
        }

        setState(prev => ({
          ...prev,
          selectedCluster: session.clusterId || prev.selectedCluster,
        }))

        const result = await initializeSession(
          async () => {
            const response = await fetch(`${API_BASE}/sessions/auto-start`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(API_TOKEN && { 'Authorization': `Bearer ${API_TOKEN}` })
              },
              body: JSON.stringify(autoStartPayload)
            })

            if (!response.ok) {
              throw new Error(`Failed to start connection-aware session: ${response.statusText}`)
            }

            const sessionData = await response.json()
            sessionData.connection_session = {
              phase: session.phase,
              cluster_id: session.clusterId,
              connections: session.connections || []
            }

            return sessionData
          },
          { setHighIntensity: true, trackStartTime: true }
        )

        return result as SessionResponse
      }

      console.warn('No characters selected for session, keeping discovery view')
      setState(prev => ({
        ...prev,
      }))
      return undefined
    } catch (error) {
      console.error('Failed to start connection-aware session:', error)
      throw error
    }
  }, [initializeSession, normalizeClusters, selectedDomain?.id, sessionGenerator, setState, state.selectedCluster])

  return {
    beginConnectionAwareSession
  }
}

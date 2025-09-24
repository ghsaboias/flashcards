/**
 * Knowledge Graph Quest - Session Generator (TypeScript)
 * Replaces random card selection with connection-aware learning
 */

import type { Cluster } from '../types/session-types'

// Types for network data
interface NetworkNode {
  id: string
  char: string
  pinyin: string
  semantic_domain: string
  hub_score: number
  cluster_role: 'anchor' | 'branch' | 'leaf'
  type: 'character'
}

interface NetworkLink {
  source: string
  target: string
  type: 'semantic' | 'radical' | 'compound' | 'phonetic'
  strength: number
  domain?: string
  compound_word?: string
}

// Internal cluster interface for the knowledge graph data
interface InternalCluster {
  id: string
  name: string
  description: string
  anchor_characters: string[]
  members: string[]
  unlock_prerequisites: string[]
}

interface CompoundWord {
  id: string
  word: string
  characters: string[]
  pinyin: string
}

interface NetworkData {
  nodes: NetworkNode[]
  links: NetworkLink[]
  clusters: InternalCluster[]
  compounds?: CompoundWord[]
}

interface ClusterProgress {
  cluster_id: string
  current_phase: 'discovery' | 'anchor' | 'expansion' | 'integration' | 'mastery'
  completion_percentage: number
  anchors_mastered: number
  total_anchors: number
  last_practiced?: string
}

interface ConnectionPractice {
  source_char: string
  target_char: string
  connection_type: string
  times_practiced: number
  success_rate: number
  last_practiced?: string
}

interface UserProgress {
  cluster_progress: ClusterProgress[]
  connection_practice: ConnectionPractice[]
}

interface SessionOptions {
  maxCharacters?: number
  practiceMode?: 'mixed' | 'recognition' | 'production'
  targetTime?: number // minutes
}

interface GeneratedSession {
  type: 'cluster_selection' | 'practice_session'
  phase?: string
  clusterId?: string
  characters?: NetworkNode[]
  clusters?: Cluster[]
  practiceMode?: string
  estimatedTime?: number
  connections?: NetworkLink[]
  message?: string
}

export class KnowledgeGraphSession {
  private network: NetworkData
  private progress: UserProgress
  private nodeMap: Map<string, NetworkNode>
  private clusterMap: Map<string, InternalCluster>
  private linksByNode: Map<string, NetworkLink[]>

  constructor(networkData: NetworkData, userProgress: UserProgress = { cluster_progress: [], connection_practice: [] }) {
    this.network = networkData
    this.progress = userProgress

    // Quick lookup maps for performance
    this.nodeMap = new Map(this.network.nodes.map(n => [n.id, n]))
    this.clusterMap = new Map(this.network.clusters.map(c => [c.id, c]))
    this.linksByNode = this.buildLinkIndex()
  }

  private buildLinkIndex(): Map<string, NetworkLink[]> {
    const linksByNode = new Map<string, NetworkLink[]>()

    this.network.links.forEach(link => {
      if (!linksByNode.has(link.source)) linksByNode.set(link.source, [])
      if (!linksByNode.has(link.target)) linksByNode.set(link.target, [])

      linksByNode.get(link.source)!.push(link)
      linksByNode.get(link.target)!.push(link)
    })

    return linksByNode
  }

  // PHASE 1: DISCOVERY - Explore available clusters
  getAvailableClusters(): Cluster[] {
    return this.network.clusters.map((cluster: any) => ({
      id: cluster.id,
      name: cluster.name,
      description: cluster.description || '',
      anchors: cluster.anchor_characters || [],
      size: cluster.members?.length || 0,
      unlocked: this.isClusterUnlocked(cluster.id),
      completion: this.getClusterCompletion(cluster.id),
      recommended: this.isClusterRecommended(cluster)
    } as Cluster))
  }

  private isClusterRecommended(cluster: InternalCluster): boolean {
    // Recommend clusters with some mastered anchors but not fully complete
    const masteredAnchors = cluster.anchor_characters.filter((a: string) =>
      this.isMastered(a)
    ).length

    return masteredAnchors > 0 && masteredAnchors < cluster.anchor_characters.length
  }

  private isClusterUnlocked(clusterId: string): boolean {
    // First few clusters always unlocked, others require prerequisites
    const alwaysUnlocked = ['emotions', 'numbers', 'family']
    return alwaysUnlocked.includes(clusterId) || this.getClusterCompletion(clusterId) > 0
  }

  private getClusterCompletion(clusterId: string): number {
    const progress = this.progress.cluster_progress.find(p => p.cluster_id === clusterId)
    return progress?.completion_percentage || 0
  }

  private isMastered(charId: string): boolean {
    // A character is mastered if it appears in connection practice with high success rate
    // or if we have good accuracy data for it
    const connections = this.progress.connection_practice.filter(
      cp => cp.source_char === charId || cp.target_char === charId
    )

    if (connections.length === 0) return false

    const avgSuccessRate = connections.reduce((sum, cp) => sum + cp.success_rate, 0) / connections.length
    return avgSuccessRate >= 80 && connections.every(cp => cp.times_practiced >= 3)
  }

  // PHASE 2: ANCHOR - Master hub characters in selected cluster
  selectAnchorCharacters(clusterId: string, maxChars: number = 5): NetworkNode[] {
    const cluster = this.clusterMap.get(clusterId)
    if (!cluster) throw new Error(`Cluster ${clusterId} not found`)

    // Get anchor characters that aren't mastered yet
    const availableAnchors = cluster.anchor_characters
      .map((charId: string) => this.nodeMap.get(charId))
      .filter((char): char is NetworkNode => char !== undefined && !this.isMastered(char.id))
      .sort((a: NetworkNode, b: NetworkNode) => b.hub_score - a.hub_score) // Highest hub score first

    return availableAnchors.slice(0, maxChars)
  }

  // PHASE 3: EXPANSION - Unlock connected characters
  selectExpansionCharacters(clusterId: string, maxChars: number = 8): NetworkNode[] {
    const masteredInCluster = this.getMasteredInCluster(clusterId)

    if (masteredInCluster.length === 0) {
      // No mastered chars yet, return anchors instead
      return this.selectAnchorCharacters(clusterId, maxChars)
    }

    // Find characters connected to mastered ones
    const connectedChars = new Set<string>()

    masteredInCluster.forEach(masteredChar => {
      const connections = this.getConnectedCharacters(masteredChar)
      connections.forEach(connectedChar => {
        // Only include if:
        // 1. Not already mastered
        // 2. In same cluster OR forms compounds with mastered char
        const charNode = this.nodeMap.get(connectedChar)
        if (charNode &&
            !this.isMastered(connectedChar) &&
            (charNode.semantic_domain === this.nodeMap.get(masteredChar)?.semantic_domain ||
             this.formsCompound(masteredChar, connectedChar))) {
          connectedChars.add(connectedChar)
        }
      })
    })

    // Convert to nodes and sort by hub score
    const connectedNodes = Array.from(connectedChars)
      .map((charId: string) => this.nodeMap.get(charId))
      .filter((node): node is NetworkNode => node !== undefined)
      .sort((a, b) => b.hub_score - a.hub_score)

    return connectedNodes.slice(0, maxChars)
  }

  // PHASE 4: INTEGRATION - Cross-cluster challenges
  selectIntegrationCharacters(maxChars: number = 6): NetworkNode[] {
    const masteredClusters = this.getMasteredClusters()

    if (masteredClusters.length < 2) {
      // Need at least 2 clusters mastered for integration
      return []
    }

    // Select chars that form cross-cluster relationships
    const integrationChars: NetworkNode[] = []

    masteredClusters.forEach(cluster1 => {
      masteredClusters.forEach(cluster2 => {
        if (cluster1 !== cluster2) {
          // Find characters that bridge these clusters
          const bridgeChars = this.findBridgeCharacters(cluster1, cluster2)
          integrationChars.push(...bridgeChars)
        }
      })
    })

    return integrationChars
      .filter((char, index, self) =>
        self.findIndex(c => c.id === char.id) === index) // Remove duplicates
      .sort((a, b) => b.hub_score - a.hub_score)
      .slice(0, maxChars)
  }

  // PHASE 5: MASTERY - Context and speed challenges
  selectMasteryCharacters(maxChars: number = 10): NetworkNode[] {
    // Use all mastered characters for varied practice
    const masteredChars = this.getAllMastered()
      .map((charId: string) => this.nodeMap.get(charId))
      .filter((node): node is NetworkNode => node !== undefined)

    // Prioritize characters that haven't been practiced recently
    return masteredChars
      .sort((a, b) => {
        const aLastSeen = this.getLastSeen(a.id)
        const bLastSeen = this.getLastSeen(b.id)
        return aLastSeen - bLastSeen // Oldest first
      })
      .slice(0, maxChars)
  }

  // HELPER METHODS

  private getConnectedCharacters(charId: string): string[] {
    const links = this.linksByNode.get(charId) || []
    return links.map(link =>
      link.source === charId ? link.target : link.source
    )
  }

  private formsCompound(char1: string, char2: string): boolean {
    return this.network.links.some(link =>
      link.type === 'compound' &&
      ((link.source === char1 && link.target === char2) ||
       (link.source === char2 && link.target === char1))
    )
  }

  private findBridgeCharacters(cluster1: string, cluster2: string): NetworkNode[] {
    const bridges: NetworkNode[] = []

    // Find characters that form compounds across clusters
    this.network.links.forEach(link => {
      if (link.type === 'compound') {
        const sourceNode = this.nodeMap.get(link.source)
        const targetNode = this.nodeMap.get(link.target)

        if (sourceNode && targetNode &&
            sourceNode.semantic_domain !== targetNode.semantic_domain &&
            (sourceNode.semantic_domain === cluster1 || sourceNode.semantic_domain === cluster2) &&
            (targetNode.semantic_domain === cluster1 || targetNode.semantic_domain === cluster2)) {

          if (this.isMastered(sourceNode.id)) bridges.push(sourceNode)
          if (this.isMastered(targetNode.id)) bridges.push(targetNode)
        }
      }
    })

    return bridges
  }

  private getMasteredInCluster(clusterId: string): string[] {
    const cluster = this.clusterMap.get(clusterId)
    if (!cluster) return []

    return this.network.nodes
      .filter(node => node.semantic_domain === cluster.name && this.isMastered(node.id))
      .map(node => node.id)
  }

  private getMasteredClusters(): string[] {
    // Return clusters with >70% completion
    return this.progress.cluster_progress
      .filter(cp => cp.completion_percentage > 70)
      .map(cp => cp.cluster_id)
  }

  private getAllMastered(): string[] {
    return this.network.nodes
      .filter(node => this.isMastered(node.id))
      .map(node => node.id)
  }

  private getLastSeen(charId: string): number {
    const connections = this.progress.connection_practice.filter(
      cp => cp.source_char === charId || cp.target_char === charId
    )

    if (connections.length === 0) return 0

    const dates = connections
      .map(cp => cp.last_practiced ? new Date(cp.last_practiced).getTime() : 0)
      .filter(date => date > 0)

    return dates.length > 0 ? Math.max(...dates) : 0
  }

  // MAIN SESSION GENERATION

  generateSession(
    phase: 'discovery' | 'anchor' | 'expansion' | 'integration' | 'mastery',
    clusterId?: string,
    options: SessionOptions = {}
  ): GeneratedSession {
    const {
      maxCharacters = 8,
      practiceMode = 'mixed'
    } = options

    let selectedChars: NetworkNode[] = []

    switch (phase) {
      case 'discovery':
        return {
          type: 'cluster_selection',
          clusters: this.getAvailableClusters(),
          message: 'Choose a semantic domain to explore'
        }

      case 'anchor':
        if (!clusterId) throw new Error('clusterId required for anchor phase')
        selectedChars = this.selectAnchorCharacters(clusterId, maxCharacters)
        break

      case 'expansion':
        if (!clusterId) throw new Error('clusterId required for expansion phase')
        selectedChars = this.selectExpansionCharacters(clusterId, maxCharacters)
        break

      case 'integration':
        selectedChars = this.selectIntegrationCharacters(maxCharacters)
        break

      case 'mastery':
        selectedChars = this.selectMasteryCharacters(maxCharacters)
        break

      default:
        throw new Error(`Unknown phase: ${phase}`)
    }

    return {
      type: 'practice_session',
      phase,
      clusterId,
      characters: selectedChars,
      practiceMode,
      estimatedTime: this.estimateSessionTime(selectedChars, practiceMode),
      connections: this.getSessionConnections(selectedChars)
    }
  }

  private getSessionConnections(characters: NetworkNode[]): NetworkLink[] {
    const charIds = characters.map(c => c.id)
    return this.network.links.filter(link =>
      charIds.includes(link.source) && charIds.includes(link.target)
    )
  }

  private estimateSessionTime(characters: NetworkNode[], practiceMode: string): number {
    // Rough estimation: 2-4 seconds per character per mode
    const modesCount = practiceMode === 'mixed' ? 3 : 1
    return characters.length * modesCount * 3 // seconds
  }
}

export default KnowledgeGraphSession
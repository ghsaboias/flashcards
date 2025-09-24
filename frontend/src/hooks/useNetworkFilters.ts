import { useState, useMemo } from 'react'
import { extractTone } from '../utils/network-helpers'

interface NetworkNode {
  id: string
  char: string
  traditional?: string
  pinyin: string
  pos?: string
  tone?: number
  semantic_domain: string
  radical?: string | null
  frequency?: number
  hub_score: number
  cluster_role: 'anchor' | 'branch' | 'leaf'
  type: 'character'
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface NetworkLink {
  source: string | NetworkNode
  target: string | NetworkNode
  type: 'semantic' | 'radical' | 'compound' | 'phonetic'
  strength: number
}

interface NetworkData {
  nodes: NetworkNode[]
  links: NetworkLink[]
}

export function useNetworkFilters(networkData: NetworkData | null) {
  // Filter states
  const [domainFilter, setDomainFilter] = useState('all')
  const [radicalFilter, setRadicalFilter] = useState('all')
  const [toneFilter, setToneFilter] = useState('all')
  const [frequencyFilter, setFrequencyFilter] = useState(1)

  // Available filter options
  const [availableDomains, setAvailableDomains] = useState<string[]>([])
  const [availableRadicals, setAvailableRadicals] = useState<string[]>([])

  // Apply filters callback
  const filteredData = useMemo(() => {
    if (!networkData) return null

    let filteredNodes = [...networkData.nodes]
    let filteredLinks = [...networkData.links]

    // Domain filter
    if (domainFilter !== 'all') {
      filteredNodes = filteredNodes.filter(n => n.semantic_domain === domainFilter)
    }

    // Tone filter (extract from pinyin or tone field)
    if (toneFilter !== 'all') {
      const targetTone = parseInt(toneFilter)
      filteredNodes = filteredNodes.filter(n => {
        const tone = extractTone(n.pinyin, n.tone)
        return tone === targetTone
      })
    }

    // Frequency filter - use actual frequency field if available, fallback to hub_score
    filteredNodes = filteredNodes.filter(n => {
      const frequency = n.frequency || n.hub_score * 10
      return frequency >= frequencyFilter
    })

    // Filter links to only include connections between visible nodes
    const nodeIds = new Set(filteredNodes.map(n => n.id))
    filteredLinks = filteredLinks.filter(l =>
      nodeIds.has(typeof l.source === 'string' ? l.source : l.source.id) &&
      nodeIds.has(typeof l.target === 'string' ? l.target : l.target.id)
    )

    return { nodes: filteredNodes, links: filteredLinks }
  }, [networkData, domainFilter, toneFilter, frequencyFilter])

  return {
    // Filter states
    filters: {
      domainFilter,
      radicalFilter,
      toneFilter,
      frequencyFilter
    },
    // Setters
    setters: {
      setDomainFilter,
      setRadicalFilter,
      setToneFilter,
      setFrequencyFilter
    },
    // Available options
    availableDomains,
    availableRadicals,
    setAvailableDomains,
    setAvailableRadicals,
    // Processed data
    filteredData
  }
}
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../hooks/useAppContext'
import { domainColors } from '../constants/network-colors'
import { extractTone, getToneArrow, getPosDisplay } from '../utils/network-helpers'
import { useNetworkFilters } from '../hooks/useNetworkFilters'
import { useNetworkVisualization } from '../hooks/useNetworkVisualization'
import '../styles/NetworkPage.css'

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

interface TooltipData {
  x: number
  y: number
  node: NetworkNode
}

const NetworkPage: React.FC = () => {
  const navigate = useNavigate()
  const { selectedDomain } = useAppContext()

  // Network data state
  const [networkData, setNetworkData] = useState<NetworkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Tooltip state
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)

  // Use extracted hooks
  const {
    filters,
    setters,
    availableDomains,
    availableRadicals,
    setAvailableDomains,
    setAvailableRadicals,
    filteredData
  } = useNetworkFilters(networkData)

  const { svgRef } = useNetworkVisualization(filteredData, containerRef, setTooltip)

  // Load network data
  useEffect(() => {
    const loadNetworkData = async () => {
      try {
        setLoading(true)
        // Use the proper original JSON file
        const response = await fetch('/hsk_network_data.json')

        if (!response.ok) {
          throw new Error(`Failed to load network data: ${response.statusText}`)
        }

        const data = await response.json()

        // Extract nodes and links from the JSON file (same structure as HTML)
        const nodes: NetworkNode[] = data.nodes || []
        const links: NetworkLink[] = data.links || []

        setNetworkData({ nodes, links })

        // Extract available filter options
        const domains = [...new Set(nodes.map(n => n.semantic_domain))].filter(Boolean).sort()
        setAvailableDomains(domains)

        // Extract radical families (simplified - could be enhanced)
        // Extract available radicals from metadata if available
        const radicals = data.metadata?.radical_families || ['人', '口', '心', '手', '水', '木', '日', '月', '土', '女', '子', '车', '门', '走']
        setAvailableRadicals(radicals)

      } catch (err) {
        console.error('Failed to load network data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load network data')
      } finally {
        setLoading(false)
      }
    }

    loadNetworkData()
  }, [selectedDomain, setAvailableDomains, setAvailableRadicals])

  if (loading) {
    return (
      <div className="network-page loading">
        <div className="loading-spinner">Loading Network...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="network-page error">
        <div className="error-message">
          <h3>Failed to Load Network</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="network-page">
      <div ref={containerRef} className="network-container">
        <svg ref={svgRef} className="network-svg" />
      </div>

      {/* Controls Panel */}
      <div className="controls">
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(79, 195, 247, 0.1)',
            border: '1px solid rgba(79, 195, 247, 0.3)',
            borderRadius: '4px',
            color: '#4fc3f7',
            fontSize: '11px',
            padding: '3px 6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '10px',
            width: 'fit-content',
            alignSelf: 'flex-start'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(79, 195, 247, 0.2)'
            e.currentTarget.style.borderColor = '#4fc3f7'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(79, 195, 247, 0.1)'
            e.currentTarget.style.borderColor = 'rgba(79, 195, 247, 0.3)'
          }}
          title="Return to Home"
        >
          🏠 Home
        </button>
        <h3>Filters & Controls</h3>

        <div className="filter-group">
          <label htmlFor="domain-filter">Semantic Domain:</label>
          <select
            id="domain-filter"
            value={filters.domainFilter}
            onChange={(e) => setters.setDomainFilter(e.target.value)}
          >
            <option value="all">All Domains</option>
            {availableDomains.map(domain => (
              <option key={domain} value={domain}>{domain}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="radical-filter">Radical Family:</label>
          <select
            id="radical-filter"
            value={filters.radicalFilter}
            onChange={(e) => setters.setRadicalFilter(e.target.value)}
          >
            <option value="all">All Radicals</option>
            {availableRadicals.map(radical => (
              <option key={radical} value={radical}>{radical}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="tone-filter">Tone:</label>
          <select
            id="tone-filter"
            value={filters.toneFilter}
            onChange={(e) => setters.setToneFilter(e.target.value)}
          >
            <option value="all">All Tones</option>
            <option value="1">Tone 1 (ā)</option>
            <option value="2">Tone 2 (á)</option>
            <option value="3">Tone 3 (ǎ)</option>
            <option value="4">Tone 4 (à)</option>
            <option value="0">Neutral</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="frequency-filter">Min Frequency:</label>
          <input
            type="range"
            id="frequency-filter"
            min="1"
            max="10"
            value={filters.frequencyFilter}
            onChange={(e) => setters.setFrequencyFilter(parseInt(e.target.value))}
          />
          <span className="frequency-value">{filters.frequencyFilter}+</span>
        </div>

        <div className="stats">
          <div>Characters: <span>{filteredData?.nodes.length || 0}</span></div>
          <div>Links: <span>{filteredData?.links.length || 0}</span></div>
          <div>Domains: <span>{availableDomains.length}</span></div>
        </div>
      </div>

      {/* Legend */}
      <div className="legend">
        <h3 style={{ margin: '0 0 10px 0', fontSize: '12px' }}>Semantic Domains</h3>
        <div className="legend-content">
          {Object.entries(domainColors).filter(([domain]) => availableDomains.includes(domain)).map(([domain, color]) => (
            <div key={domain} className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: color }}
              />
              <span>{domain}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Info Panel */}
      <div className="info">
        <h3>HSK Level 1 Character Network</h3>
        <p><strong>Hover</strong> over characters to see details<br/>
        <strong>Click</strong> to highlight connections<br/>
        <strong>Drag</strong> to explore the network<br/>
        <strong>Zoom</strong> with mouse wheel</p>

        <p style={{ color: '#888', fontSize: '11px', marginTop: '15px' }}>
        This visualization reveals the hidden relationships between Chinese characters that traditional flashcard drilling obscures. Each cluster represents semantic domains or radical families.
        </p>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            position: 'fixed',
            zIndex: 2000
          }}
        >
          <div className="char">{tooltip.node.char}</div>
          <div className="pinyin">
            {tooltip.node.pinyin || 'N/A'} {getToneArrow(extractTone(tooltip.node.pinyin || '', tooltip.node.tone))}
          </div>
          <div className="domain">{tooltip.node.semantic_domain}</div>
          <div>{getPosDisplay(tooltip.node.pos)}</div>
          <div>Frequency: {tooltip.node.frequency || Math.round(tooltip.node.hub_score * 10)}</div>
        </div>
      )}
    </div>
  )
}

export default NetworkPage
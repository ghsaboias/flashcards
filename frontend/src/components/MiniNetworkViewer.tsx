import React, { useEffect, useRef, useState } from 'react'

interface Connection {
  source: string
  target: string
  type: 'semantic' | 'compound' | 'radical'
  strength: number
}

interface NetworkNode {
  id: string
  char: string
  group: string
  level: number
  x?: number
  y?: number
}

interface MiniNetworkViewerProps {
  currentCharacter: string
  connections?: Connection[]
  onCharacterClick?: (character: string) => void
  className?: string
}

const MiniNetworkViewer: React.FC<MiniNetworkViewerProps> = ({
  currentCharacter,
  connections = [],
  onCharacterClick,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Create network data from connections
  const networkData = React.useMemo(() => {
    const nodes = new Map<string, NetworkNode>()

    // Add current character as center node
    nodes.set(currentCharacter, {
      id: currentCharacter,
      char: currentCharacter,
      group: 'current',
      level: 0
    })

    // Add connected characters
    connections.forEach(conn => {
      if (conn.source === currentCharacter && !nodes.has(conn.target)) {
        nodes.set(conn.target, {
          id: conn.target,
          char: conn.target,
          group: conn.type,
          level: 1
        })
      }
      if (conn.target === currentCharacter && !nodes.has(conn.source)) {
        nodes.set(conn.source, {
          id: conn.source,
          char: conn.source,
          group: conn.type,
          level: 1
        })
      }
    })

    return {
      nodes: Array.from(nodes.values()),
      links: connections.filter(conn =>
        nodes.has(conn.source) && nodes.has(conn.target)
      )
    }
  }, [currentCharacter, connections])

  // Position nodes in a circle around the center
  useEffect(() => {
    if (!svgRef.current || networkData.nodes.length === 0) return

    const svg = svgRef.current
    const rect = svg.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const radius = Math.min(rect.width, rect.height) * 0.3

    networkData.nodes.forEach((node, index) => {
      if (node.level === 0) {
        // Center node
        node.x = centerX
        node.y = centerY
      } else {
        // Outer nodes in circle
        const angle = (index - 1) * (2 * Math.PI) / (networkData.nodes.length - 1)
        node.x = centerX + radius * Math.cos(angle)
        node.y = centerY + radius * Math.sin(angle)
      }
    })
  }, [networkData])

  const getConnectionColor = (type: string): string => {
    switch (type) {
      case 'semantic': return '#60a5fa' // blue
      case 'compound': return '#34d399' // green
      case 'radical': return '#fbbf24' // yellow
      default: return '#6b7280' // gray
    }
  }

  const getNodeColor = (node: NetworkNode): string => {
    if (node.group === 'current') return '#ef4444' // red for current
    return getConnectionColor(node.group)
  }

  if (networkData.nodes.length <= 1) {
    return (
      <div className={`mini-network-empty ${className}`}>
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
          🔗 No connections found
        </div>
      </div>
    )
  }

  return (
    <div className={`mini-network-viewer ${className}`}>
      <div style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--muted)' }}>
        🧠 Character Network ({networkData.links.length} connections)
      </div>

      <svg
        ref={svgRef}
        width="200"
        height="150"
        style={{
          background: 'var(--panel)',
          borderRadius: '8px',
          border: '1px solid var(--border)'
        }}
      >
        {/* Connection lines */}
        {networkData.links.map((link, index) => {
          const sourceNode = networkData.nodes.find(n => n.id === link.source)
          const targetNode = networkData.nodes.find(n => n.id === link.target)

          if (!sourceNode || !targetNode || !sourceNode.x || !targetNode.x) return null

          return (
            <line
              key={index}
              x1={sourceNode.x}
              y1={sourceNode.y}
              x2={targetNode.x}
              y2={targetNode.y}
              stroke={getConnectionColor(link.type)}
              strokeWidth={Math.max(1, link.strength * 3)}
              strokeOpacity={0.6}
            />
          )
        })}

        {/* Character nodes */}
        {networkData.nodes.map(node => {
          if (!node.x || !node.y) return null

          const isHovered = hoveredNode === node.id
          const isCurrent = node.group === 'current'

          return (
            <g key={node.id}>
              {/* Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={isCurrent ? 20 : 16}
                fill={getNodeColor(node)}
                stroke={isHovered ? '#fff' : 'transparent'}
                strokeWidth={2}
                style={{
                  cursor: onCharacterClick ? 'pointer' : 'default',
                  filter: isHovered ? 'brightness(1.2)' : 'none'
                }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onCharacterClick?.(node.char)}
              />

              {/* Character text */}
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={isCurrent ? "16" : "14"}
                fontWeight="bold"
                style={{ pointerEvents: 'none' }}
              >
                {node.char}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div style={{ marginTop: '8px', display: 'flex', gap: '12px', fontSize: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '8px', height: '8px', background: '#60a5fa', borderRadius: '50%' }}></div>
          <span>Semantic</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '8px', height: '8px', background: '#34d399', borderRadius: '50%' }}></div>
          <span>Compound</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '8px', height: '8px', background: '#fbbf24', borderRadius: '50%' }}></div>
          <span>Radical</span>
        </div>
      </div>
    </div>
  )
}

export default MiniNetworkViewer
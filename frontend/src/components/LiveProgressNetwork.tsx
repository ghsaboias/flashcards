import React, { useEffect, useRef, useState, useCallback } from 'react'

interface ProgressNode {
  id: string
  char: string
  cluster: string
  mastered: boolean
  accuracy: number
  connections: string[]
  x?: number
  y?: number
}

interface ProgressConnection {
  source: string
  target: string
  type: 'semantic' | 'compound' | 'radical'
  active: boolean // Both endpoints mastered
  strength: number
}

interface LiveProgressNetworkProps {
  currentCharacter?: string
  progressData: ProgressNode[]
  connections: ProgressConnection[]
  onCharacterSelect?: (character: string) => void
  className?: string
}

const LiveProgressNetwork: React.FC<LiveProgressNetworkProps> = ({
  currentCharacter,
  progressData,
  connections,
  onCharacterSelect,
  className = ''
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [animatingNodes, setAnimatingNodes] = useState<Set<string>>(new Set())

  // Animate newly mastered characters
  const animateProgress = useCallback((nodeId: string) => {
    setAnimatingNodes(prev => new Set(prev).add(nodeId))
    setTimeout(() => {
      setAnimatingNodes(prev => {
        const next = new Set(prev)
        next.delete(nodeId)
        return next
      })
    }, 2000)
  }, [])

  // Watch for progress changes and trigger animations
  useEffect(() => {
    progressData.forEach(node => {
      if (node.mastered && node.accuracy >= 90) {
        // Trigger celebration animation for newly mastered nodes
        if (!animatingNodes.has(node.id)) {
          animateProgress(node.id)
        }
      }
    })
  }, [progressData, animatingNodes, animateProgress])

  // Position nodes in clusters
  useEffect(() => {
    if (!svgRef.current) return

    const svg = svgRef.current
    const rect = svg.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    // Group nodes by cluster
    const clusters = new Map<string, ProgressNode[]>()
    progressData.forEach(node => {
      if (!clusters.has(node.cluster)) {
        clusters.set(node.cluster, [])
      }
      clusters.get(node.cluster)!.push(node)
    })

    // Position clusters in a circle
    const clusterNames = Array.from(clusters.keys())
    const clusterRadius = Math.min(rect.width, rect.height) * 0.35

    clusterNames.forEach((clusterName, clusterIndex) => {
      const clusterAngle = (clusterIndex * 2 * Math.PI) / clusterNames.length
      const clusterX = centerX + clusterRadius * Math.cos(clusterAngle)
      const clusterY = centerY + clusterRadius * Math.sin(clusterAngle)

      // Position nodes within each cluster
      const clusterNodes = clusters.get(clusterName)!
      const nodeRadius = 40

      clusterNodes.forEach((node, nodeIndex) => {
        if (clusterNodes.length === 1) {
          node.x = clusterX
          node.y = clusterY
        } else {
          const nodeAngle = (nodeIndex * 2 * Math.PI) / clusterNodes.length
          node.x = clusterX + nodeRadius * Math.cos(nodeAngle)
          node.y = clusterY + nodeRadius * Math.sin(nodeAngle)
        }
      })
    })
  }, [progressData])

  const getNodeColor = (node: ProgressNode): string => {
    if (node.id === currentCharacter) return '#ef4444' // red for current
    if (node.mastered) return '#10b981' // green for mastered
    if (node.accuracy > 70) return '#f59e0b' // yellow for in progress
    return '#6b7280' // gray for not started
  }

  const getConnectionColor = (conn: ProgressConnection): string => {
    if (conn.active) return '#10b981' // green for active connections
    switch (conn.type) {
      case 'semantic': return '#60a5fa'
      case 'compound': return '#34d399'
      case 'radical': return '#fbbf24'
      default: return '#6b7280'
    }
  }

  if (progressData.length === 0) {
    return (
      <div className={`live-progress-network-empty ${className}`}>
        <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
          📊 No progress data available
        </div>
      </div>
    )
  }

  return (
    <div className={`live-progress-network ${className}`}>
      <div style={{ marginBottom: '12px', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>🧠 Learning Progress Network</h3>
        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
          {progressData.filter(n => n.mastered).length} of {progressData.length} mastered
        </div>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="400"
        style={{
          background: 'var(--panel)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          minWidth: '500px'
        }}
      >
        {/* Connection lines */}
        {connections.map((conn, index) => {
          const sourceNode = progressData.find(n => n.id === conn.source)
          const targetNode = progressData.find(n => n.id === conn.target)

          if (!sourceNode || !targetNode || !sourceNode.x || !targetNode.x) return null

          return (
            <line
              key={index}
              x1={sourceNode.x}
              y1={sourceNode.y}
              x2={targetNode.x}
              y2={targetNode.y}
              stroke={getConnectionColor(conn)}
              strokeWidth={conn.active ? 3 : 1}
              strokeOpacity={conn.active ? 0.9 : 0.4}
              strokeDasharray={conn.active ? "none" : "4 4"}
            >
              {conn.active && (
                <animate
                  attributeName="stroke-opacity"
                  values="0.9;0.5;0.9"
                  dur="2s"
                  repeatCount="indefinite"
                />
              )}
            </line>
          )
        })}

        {/* Character nodes */}
        {progressData.map(node => {
          if (!node.x || !node.y) return null

          const isHovered = hoveredNode === node.id
          const isCurrent = node.id === currentCharacter
          const isAnimating = animatingNodes.has(node.id)

          return (
            <g key={node.id}>
              {/* Mastery celebration ring */}
              {isAnimating && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="25"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  opacity="0"
                >
                  <animate
                    attributeName="r"
                    values="15;35;45"
                    dur="2s"
                    repeatCount="1"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.8;0.3;0"
                    dur="2s"
                    repeatCount="1"
                  />
                </circle>
              )}

              {/* Progress ring */}
              <circle
                cx={node.x}
                cy={node.y}
                r="18"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              <circle
                cx={node.x}
                cy={node.y}
                r="18"
                fill="none"
                stroke={getNodeColor(node)}
                strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 18 * (node.accuracy / 100)} ${2 * Math.PI * 18}`}
                strokeDashoffset={-2 * Math.PI * 18 * 0.25}
                transform={`rotate(-90 ${node.x} ${node.y})`}
              />

              {/* Node circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={isCurrent ? 16 : 14}
                fill={getNodeColor(node)}
                stroke={isHovered ? '#fff' : isCurrent ? '#fff' : 'transparent'}
                strokeWidth={isHovered || isCurrent ? 2 : 0}
                style={{
                  cursor: onCharacterSelect ? 'pointer' : 'default',
                  filter: isHovered ? 'brightness(1.2)' : 'none'
                }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => onCharacterSelect?.(node.char)}
              >
                {node.mastered && (
                  <animate
                    attributeName="r"
                    values={`${isCurrent ? 16 : 14};${isCurrent ? 18 : 16};${isCurrent ? 16 : 14}`}
                    dur="3s"
                    repeatCount="indefinite"
                  />
                )}
              </circle>

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

              {/* Mastery checkmark */}
              {node.mastered && (
                <text
                  x={node.x + 12}
                  y={node.y - 12}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#10b981"
                  fontSize="12"
                  style={{ pointerEvents: 'none' }}
                >
                  ✓
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Live stats */}
      <div style={{
        marginTop: '12px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '8px',
        fontSize: '12px'
      }}>
        <div style={{ textAlign: 'center', padding: '8px', background: 'var(--panel)', borderRadius: '6px' }}>
          <div style={{ color: '#10b981', fontWeight: 'bold' }}>
            {progressData.filter(n => n.mastered).length}
          </div>
          <div style={{ color: 'var(--muted)' }}>Mastered</div>
        </div>
        <div style={{ textAlign: 'center', padding: '8px', background: 'var(--panel)', borderRadius: '6px' }}>
          <div style={{ color: '#f59e0b', fontWeight: 'bold' }}>
            {progressData.filter(n => n.accuracy > 70 && !n.mastered).length}
          </div>
          <div style={{ color: 'var(--muted)' }}>Learning</div>
        </div>
        <div style={{ textAlign: 'center', padding: '8px', background: 'var(--panel)', borderRadius: '6px' }}>
          <div style={{ color: '#10b981', fontWeight: 'bold' }}>
            {connections.filter(c => c.active).length}
          </div>
          <div style={{ color: 'var(--muted)' }}>Active Links</div>
        </div>
        <div style={{ textAlign: 'center', padding: '8px', background: 'var(--panel)', borderRadius: '6px' }}>
          <div style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
            {Math.round((progressData.filter(n => n.mastered).length / progressData.length) * 100)}%
          </div>
          <div style={{ color: 'var(--muted)' }}>Complete</div>
        </div>
      </div>
    </div>
  )
}

export default LiveProgressNetwork
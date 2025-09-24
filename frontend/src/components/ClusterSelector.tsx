import { memo, useState } from 'react'

interface Cluster {
  id: string
  name: string
  description?: string
  anchors: string[]
  size: number
  unlocked: boolean
  completion: number
  recommended: boolean
  difficulty_estimate?: number
  current_phase?: string
  anchors_mastered?: number
}

interface ClusterSelectorProps {
  availableClusters: Cluster[]
  onClusterSelect: (clusterId: string) => void
  onExploreNetwork?: () => void
  selectedCluster?: string | null
  className?: string
}

interface ClusterCardProps {
  cluster: Cluster
  isSelected: boolean
  onSelect: () => void
}


const ClusterCard = memo(function ClusterCard({ cluster, isSelected, onSelect }: ClusterCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const getClusterStatus = () => {
    if (!cluster.unlocked) return { class: 'locked', label: 'Locked' }
    if (cluster.completion >= 0.9) return { class: 'mastered', label: 'Mastered' }
    if (cluster.completion > 0) return { class: 'progress', label: 'In Progress' }
    return { class: 'available', label: 'Available' }
  }

  const getDifficultyLevel = () => {
    const difficulty = cluster.difficulty_estimate || 0
    if (difficulty < 0.3) return { class: 'easy', label: 'Easy' }
    if (difficulty < 0.7) return { class: 'medium', label: 'Medium' }
    return { class: 'hard', label: 'Hard' }
  }

  const status = getClusterStatus()
  const difficulty = getDifficultyLevel()
  const completion = Math.round(cluster.completion * 100)

  return (
    <div
      className={`cluster-card ${isSelected ? 'selected' : ''} ${!cluster.unlocked ? 'locked' : ''}`}
      onClick={cluster.unlocked ? onSelect : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        cursor: cluster.unlocked ? 'pointer' : 'not-allowed',
        transform: isHovered && cluster.unlocked ? 'translateY(-8px)' : 'translateY(0)',
        transition: 'all 0.3s ease'
      }}
    >
      <div className={`status-badge status-${status.class}`}>
        {status.label}
      </div>

      <div className="cluster-header">
        <h2 className="cluster-title">{cluster.name}</h2>
      </div>

      <div className="cluster-stats">
        <div className="stat">
          <div className="stat-value">{cluster.size}</div>
          <div className="stat-label">Characters</div>
        </div>
        <div className="stat">
          <div className="stat-value">{cluster.anchors.length}</div>
          <div className="stat-label">Anchors</div>
        </div>
      </div>

      <div className="anchor-preview">
        <h4>Key Characters</h4>
        <div className="anchor-chars">
          {cluster.anchors.slice(0, 3).map((anchor, idx) => (
            <span key={idx} className="anchor-char">{anchor}</span>
          ))}
          {cluster.anchors.length > 3 && (
            <span className="anchor-char">+{cluster.anchors.length - 3}</span>
          )}
        </div>
      </div>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${completion}%`,
            background: 'linear-gradient(90deg, #4caf50, #81c784)',
            transition: 'width 0.3s ease'
          }}
        />
      </div>

      <div className="cluster-meta">
        <span>{completion}% complete</span>
        <span className={`difficulty-badge difficulty-${difficulty.class}`}>
          {difficulty.label}
        </span>
      </div>
    </div>
  )
})

const ClusterSelector = memo(function ClusterSelector({
  availableClusters,
  onClusterSelect,
  onExploreNetwork,
  selectedCluster,
  className = ''
}: ClusterSelectorProps) {
  const [showRecommendations, setShowRecommendations] = useState(true)

  if (!availableClusters || availableClusters.length === 0) {
    return (
      <div className={`cluster-selector empty ${className}`}>
        <div className="empty-state">
          <h3>Cannot Load Clusters</h3>
          <p>Connection-aware learning data is being loaded...</p>
        </div>
      </div>
    )
  }

  // Sort clusters: recommended first, then by size (high impact)
  const sortedClusters = [...availableClusters].sort((a, b) => {
    if (a.recommended !== b.recommended) return b.recommended ? 1 : -1
    return b.size - a.size
  })

  const recommendedClusters = sortedClusters.filter(c => c.recommended)

  const handleRandomCluster = () => {
    const availableClusters = sortedClusters.filter(c => c.unlocked)
    if (availableClusters.length > 0) {
      const randomCluster = availableClusters[Math.floor(Math.random() * availableClusters.length)]
      onClusterSelect(randomCluster.id)
    }
  }

  return (
    <div className={`cluster-selector ${className}`}>
      <div className="cluster-selector-header">
        <div className="phase-indicator">Discovery Phase</div>
        <h1>Choose Your Learning Path</h1>
        <p>Select a semantic domain to begin your Chinese character journey</p>
      </div>

      {showRecommendations && recommendedClusters.length > 0 && (
        <div className="recommendations">
          <h3>Recommended for You</h3>
          <p>Continue with {recommendedClusters[0].name} domain - you've made progress here!</p>
          <button
            className="recommendation-close"
            onClick={() => setShowRecommendations(false)}
          >
            ×
          </button>
        </div>
      )}

      <div className="clusters-grid">
        {sortedClusters.map(cluster => (
          <ClusterCard
            key={cluster.id}
            cluster={cluster}
            isSelected={selectedCluster === cluster.id}
            onSelect={() => onClusterSelect(cluster.id)}
          />
        ))}
      </div>

      <div className="action-buttons">
        <button
          className="btn btn-secondary"
          onClick={onExploreNetwork}
          disabled={!onExploreNetwork}
        >
Explore Network Visualization
        </button>
        <button
          className="btn btn-primary"
          onClick={handleRandomCluster}
        >
Surprise Me!
        </button>
      </div>

      <div className="cluster-selector-footer">
        <div className="learning-tip">
          <strong>Knowledge Graph Learning:</strong> This visualization reveals the hidden
          relationships between Chinese characters that traditional flashcard drilling obscures.
          Each cluster represents semantic domains that unlock naturally connected characters.
        </div>
      </div>
    </div>
  )
})

export default ClusterSelector
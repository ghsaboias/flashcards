import { memo } from 'react'

interface PhaseProgressBarProps {
  currentPhase: 'discovery' | 'anchor' | 'expansion' | 'integration' | 'mastery'
  clusterProgress?: number
  clusterName?: string
  anchorsCompleted?: number
  totalAnchors?: number
  className?: string
}

interface PhaseStepProps {
  phase: string
  emoji: string
  label: string
  description: string
  completed: boolean
  active: boolean
  progress?: number
}

const PhaseStep = memo(function PhaseStep({
  emoji,
  label,
  description,
  completed,
  active,
  progress = 0
}: PhaseStepProps) {
  return (
    <div className={`phase-step ${completed ? 'completed' : ''} ${active ? 'active' : ''}`}>
      <div className="phase-icon">
        <span className="phase-emoji">{emoji}</span>
        {completed && <span className="check-mark">✓</span>}
        {active && progress > 0 && (
          <div className="progress-ring">
            <svg viewBox="0 0 36 36" className="circular-chart">
              <path
                className="circle-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="circle"
                strokeDasharray={`${progress}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="phase-content">
        <h4 className="phase-label">{label}</h4>
        <p className="phase-description">{description}</p>
        {active && progress > 0 && (
          <div className="progress-text">{Math.round(progress)}% Complete</div>
        )}
      </div>

      <div className="phase-connector"></div>
    </div>
  )
})

const PhaseProgressBar = memo(function PhaseProgressBar({
  currentPhase,
  clusterProgress = 0,
  clusterName,
  anchorsCompleted = 0,
  totalAnchors = 0,
  className = ''
}: PhaseProgressBarProps) {
  const phases = [
    {
      id: 'discovery',
      emoji: '1',
      label: 'Discovery',
      description: 'Explore character networks and choose your learning path'
    },
    {
      id: 'anchor',
      emoji: '2',
      label: 'Anchor',
      description: 'Master hub characters that unlock related vocabulary'
    },
    {
      id: 'expansion',
      emoji: '3',
      label: 'Expansion',
      description: 'Learn connected characters through semantic relationships'
    },
    {
      id: 'integration',
      emoji: '4',
      label: 'Integration',
      description: 'Practice cross-cluster connections and compound words'
    },
    {
      id: 'mastery',
      emoji: '5',
      label: 'Mastery',
      description: 'Achieve fluent recall with speed and context challenges'
    }
  ]

  const currentIndex = phases.findIndex(phase => phase.id === currentPhase)

  const getPhaseProgress = (phaseIndex: number) => {
    if (phaseIndex < currentIndex) return 100 // Completed phases
    if (phaseIndex === currentIndex) return clusterProgress // Current phase
    return 0 // Future phases
  }

  return (
    <div className={`phase-progress-bar ${className}`}>
      <div className="progress-header">
        <h3 className="progress-title">
          Learning Progress
          {clusterName && <span className="cluster-name"> - {clusterName}</span>}
        </h3>

        {totalAnchors > 0 && (
          <div className="anchor-progress">
            <span className="anchor-count">
              Anchors: {anchorsCompleted}/{totalAnchors}
            </span>
            <div className="anchor-bar">
              <div
                className="anchor-fill"
                style={{ width: `${(anchorsCompleted / totalAnchors) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      <div className="phases-container">
        {phases.map((phase, index) => (
          <PhaseStep
            key={phase.id}
            phase={phase.id}
            emoji={phase.emoji}
            label={phase.label}
            description={phase.description}
            completed={index < currentIndex}
            active={index === currentIndex}
            progress={getPhaseProgress(index)}
          />
        ))}
      </div>

      <div className="progress-footer">
        <div className="current-phase-details">
          <strong>Current Phase:</strong> {phases[currentIndex]?.label || 'Unknown'}
          {clusterProgress > 0 && (
            <span className="phase-completion"> ({Math.round(clusterProgress)}% complete)</span>
          )}
        </div>

        <div className="progress-tips">
          {currentPhase === 'discovery' && (
            <div className="tip">Choose a cluster that interests you or matches your current level</div>
          )}
          {currentPhase === 'anchor' && (
            <div className="tip">Focus on mastering hub characters - they unlock many connections</div>
          )}
          {currentPhase === 'expansion' && (
            <div className="tip">Practice related characters together to build stronger memories</div>
          )}
          {currentPhase === 'integration' && (
            <div className="tip">Learn how different concepts connect across domains</div>
          )}
          {currentPhase === 'mastery' && (
            <div className="tip">Challenge yourself with speed and context exercises</div>
          )}
        </div>
      </div>
    </div>
  )
})

export default PhaseProgressBar
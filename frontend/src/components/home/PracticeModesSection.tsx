import type { SessionState, SessionActions } from '../../types/session-types'
import type { TraditionalModesProps } from '../../types/component-props'
import TraditionalModes from '../TraditionalModes'

interface PracticeModesSectionProps {
  sessionState: SessionState
  actions: SessionActions
  canStartByDifficulty: boolean
  difficultyCounts: TraditionalModesProps['difficultyCounts']
  getMultiSetLabel: () => string
  onBackToSimple: () => void
  backLabel?: string
}

export function PracticeModesSection({
  sessionState,
  actions,
  canStartByDifficulty,
  difficultyCounts,
  getMultiSetLabel,
  onBackToSimple,
  backLabel
}: PracticeModesSectionProps) {
  return (
    <section className="home-practice-modes">
      <header className="home-section-header">
        <h2 className="home-section-title">Practice Modes</h2>
        <p className="home-section-description">
          Launch multi-set drills, filtered sessions, spaced repetition, or switch to review tools.
        </p>
      </header>

      <TraditionalModes
        sessionState={sessionState}
        actions={actions}
        canStartByDifficulty={canStartByDifficulty}
        difficultyCounts={difficultyCounts}
        getMultiSetLabel={getMultiSetLabel}
        onBackToSimple={onBackToSimple}
        backLabel={backLabel}
      />
    </section>
  )
}

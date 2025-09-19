import type { TraditionalModesProps } from '../types/component-props'

export default function TraditionalModes({
  sessionState,
  actions,
  canStartByDifficulty,
  difficultyCounts,
  getMultiSetLabel
}: TraditionalModesProps) {
  const {
    sets,
    selectedSets,
    diffEasy,
    diffMedium,
    diffHard
  } = sessionState

  const {
    setDiffEasy,
    setDiffMedium,
    setDiffHard,
    addSetToSelection,
    removeSetFromSelection,
    beginBrowse,
    beginMultiSetSession,
    beginMultiSetDifficult,
    beginMultiSetSrs,
    beginDrawingMode,
    setStatsMode,
    setIsHighIntensityMode
  } = actions

  return (
    <div className="section">
      <button
        className="btn-tertiary"
        onClick={() => setIsHighIntensityMode(true)}
        style={{ marginBottom: '16px' }}
      >
        ← Back to Simple
      </button>
      <div className="group">
        <div className="multi-set-selection">
          <div className="selected-sets">
            <strong>Selected Sets:</strong> {getMultiSetLabel()}
          </div>
          <div className="set-list">
            {Array.isArray(sets) && sets.map((s) => (
              <label key={s} className="checkbox">
                <input
                  type="checkbox"
                  checked={selectedSets.includes(s)}
                  onChange={(e) => e.target.checked ? addSetToSelection(s) : removeSetFromSelection(s)}
                />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </div>
      </div>


      {/* Difficulty selection */}
      <fieldset className="group">
        <legend>Difficulty</legend>
        <div className="row" role="group" aria-label="Select difficulties">
          <label className="radio">
            <input type="checkbox" checked={diffHard} onChange={(e) => setDiffHard(e.target.checked)} />
            <span className="statusPill hard"><span className="dot" />Hard</span>
          </label>
          <label className="radio">
            <input type="checkbox" checked={diffMedium} onChange={(e) => setDiffMedium(e.target.checked)} />
            <span className="statusPill medium"><span className="dot" />Medium</span>
          </label>
          <label className="radio">
            <input type="checkbox" checked={diffEasy} onChange={(e) => setDiffEasy(e.target.checked)} />
            <span className="statusPill easy"><span className="dot" />Easy</span>
          </label>
        </div>
        <div className="muted" style={{ marginTop: 4 }}>
          {(() => {
            const parts: string[] = []
            if (diffHard) parts.push(`${difficultyCounts.hard} hard`)
            if (diffMedium) parts.push(`${difficultyCounts.medium} medium`)
            if (diffEasy) parts.push(`${difficultyCounts.easy} easy`)
            const text = parts.length > 0 ? parts.join('; ') : 'None selected'
            return <>Selected questions: {text}</>
          })()}
        </div>
      </fieldset>

      <div className="row">
        <button
          className="btn-primary"
          onClick={beginBrowse}
          disabled={selectedSets.length === 0}
        >
          Start Review
        </button>
        <button
          className="btn-primary"
          onClick={beginMultiSetSession}
          disabled={selectedSets.length === 0}
        >
          Start Practice
        </button>
        <button
          className="btn-secondary"
          onClick={beginMultiSetDifficult}
          disabled={selectedSets.length === 0 || !canStartByDifficulty}
        >
          Practice by Difficulty
        </button>
        <button
          className="btn-secondary"
          title="Spaced Repetition System"
          onClick={beginMultiSetSrs}
          disabled={selectedSets.length === 0}
        >
          Practice SRS
        </button>
        <button
          className="btn-secondary"
          title="Draw characters within their outlines"
          onClick={beginDrawingMode}
          disabled={selectedSets.length === 0}
        >
          Practice Drawing
        </button>
        <button
          className="btn-tertiary"
          title="View performance analytics"
          onClick={() => setStatsMode('performance')}
        >
          View Performance
        </button>
      </div>
    </div>
  )
}
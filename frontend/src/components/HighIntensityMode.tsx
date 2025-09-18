import type { HighIntensityModeProps } from '../types/component-props'

export default function HighIntensityMode({ 
  sessionState, 
  actions, 
  humanizeSetLabel, 
  getMultiSetLabel 
}: HighIntensityModeProps) {
  const {
    sets,
    mode,
    selectedSet,
    selectedSets,
    userLevel,
    focusMode,
  } = sessionState

  const {
    setUserLevel,
    setFocusMode,
    setMode,
    setSelectedSet,
    addSetToSelection,
    removeSetFromSelection,
    beginAutoSession,
    setIsHighIntensityMode
  } = actions

  return (
    <div className="streamlined-start">
      <h1>🇨🇳 HSK Practice</h1>
      
      <div className="quick-settings">
        <select 
          value={userLevel} 
          onChange={(e) => setUserLevel(e.target.value as 'beginner' | 'intermediate' | 'advanced')}
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <select 
          value={focusMode} 
          onChange={(e) => setFocusMode(e.target.value as 'review' | 'challenge')}
        >
          <option value="challenge">Challenge Mode</option>
          <option value="review">Review Mode</option>
        </select>
      </div>

      {/* Mode selection */}
      <fieldset className="group">
        <div className="row">
          <label className="radio">
            <input 
              type="radio" 
              name="mode" 
              value="set" 
              checked={mode === 'set'} 
              onChange={() => setMode('set')} 
            />
            <span>Single Set</span>
          </label>
          <label className="radio">
            <input 
              type="radio" 
              name="mode" 
              value="multi-set" 
              checked={mode === 'multi-set'} 
              onChange={() => setMode('multi-set')} 
            />
            <span>Multi-Set</span>
          </label>
        </div>
      </fieldset>

      {/* Set selection based on mode */}
      {mode === 'set' ? (
        <div className="group">
          <select 
            id="set-select" 
            value={selectedSet} 
            onChange={(e) => setSelectedSet(e.target.value)} 
            aria-describedby="set-help"
          >
            {Array.isArray(sets) && sets.map((s) => (
              <option key={s} value={s}>{humanizeSetLabel(s)}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="group">
          <div className="multi-set-selection">
            <div className="selected-sets">
              <strong>Selected Sets:</strong> {getMultiSetLabel()}
            </div>
            <div className="set-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {Array.isArray(sets) && sets.map((s) => (
                <label key={s} className="checkbox">
                  <input
                    type="checkbox"
                    checked={selectedSets.includes(s)}
                    onChange={(e) => e.target.checked ? addSetToSelection(s) : removeSetFromSelection(s)}
                  />
                  <span>{humanizeSetLabel(s)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <button className="btn-primary start-practice" onClick={beginAutoSession}>
        🚀 Start Practice
      </button>
      <button className="btn-tertiary" onClick={() => setIsHighIntensityMode(false)}>
        Advanced Options
      </button>

    </div>
  )
}
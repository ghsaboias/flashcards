import type { TraditionalModesProps } from '../types/component-props'

export default function TraditionalModes({ 
  sessionState, 
  actions, 
  canStartByDifficulty, 
  difficultyCounts,
  humanizeSetLabel,
  humanizeCategoryLabel,
  getMultiSetLabel
}: TraditionalModesProps) {
  const {
    sets,
    categories,
    selectedSet,
    selectedCategory,
    selectedSets,
    mode,
    diffEasy,
    diffMedium,
    diffHard
  } = sessionState

  const {
    setSelectedSet,
    setSelectedCategory,
    setMode,
    setDiffEasy,
    setDiffMedium,
    setDiffHard,
    addSetToSelection,
    removeSetFromSelection,
    beginBrowse,
    beginSetSession,
    beginCategorySession,
    beginMultiSetSession,
    beginDifficultSet,
    beginDifficultCategory,
    beginMultiSetDifficult,
    beginSrsSets,
    beginSrsCategories,
    beginMultiSetSrs,
    beginDrawingMode,
    viewPerformance
  } = actions

  return (
    <div className="section">
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
      ) : mode === 'category' ? (
        <div className="group">
          <select 
            id="category-select" 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)} 
            aria-describedby="category-help"
          >
            {Array.isArray(categories) && categories.map((c) => (
              <option key={c} value={c}>{humanizeCategoryLabel(c)}</option>
            ))}
          </select>
        </div>
      ) : (
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
                  <span>{humanizeSetLabel(s)}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <fieldset className="group">
        <div className="row">
          <label className="radio">
            <input type="radio" name="mode" value="set" checked={mode === 'set'} onChange={() => setMode('set')} />
            <span>Set</span>
          </label>
          <label className="radio">
            <input type="radio" name="mode" value="category" checked={mode === 'category'} onChange={() => setMode('category')} />
            <span>Category</span>
          </label>
          <label className="radio">
            <input type="radio" name="mode" value="multi-set" checked={mode === 'multi-set'} onChange={() => setMode('multi-set')} />
            <span>Multi-Set</span>
          </label>
        </div>
      </fieldset>

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
          disabled={
            mode === 'set' ? !selectedSet :
            mode === 'category' ? !selectedCategory :
            selectedSets.length === 0
          }
        >
          Start Review
        </button>
        <button
          className="btn-primary"
          onClick={
            mode === 'set' ? beginSetSession :
            mode === 'category' ? beginCategorySession :
            beginMultiSetSession
          }
          disabled={
            mode === 'set' ? !selectedSet :
            mode === 'category' ? !selectedCategory :
            selectedSets.length === 0
          }
        >
          Start Practice
        </button>
        <button
          className="btn-secondary"
          onClick={
            mode === 'set' ? beginDifficultSet :
            mode === 'category' ? beginDifficultCategory :
            beginMultiSetDifficult
          }
          disabled={
            (mode === 'set' ? !selectedSet :
             mode === 'category' ? !selectedCategory :
             selectedSets.length === 0) || !canStartByDifficulty
          }
        >
          Practice by Difficulty
        </button>
        <button
          className="btn-secondary"
          title="Spaced Repetition System"
          onClick={
            mode === 'set' ? beginSrsSets :
            mode === 'category' ? beginSrsCategories :
            beginMultiSetSrs
          }
          disabled={
            mode === 'set' ? !selectedSet :
            mode === 'category' ? !selectedCategory :
            selectedSets.length === 0
          }
        >
          Practice SRS
        </button>
        <button
          className="btn-secondary"
          title="Draw characters within their outlines"
          onClick={beginDrawingMode}
          disabled={
            mode === 'set' ? !selectedSet :
            mode === 'category' ? !selectedCategory :
            selectedSets.length === 0
          }
        >
          Practice Drawing
        </button>
        <button
          className="btn-tertiary"
          title="View performance analytics"
          onClick={viewPerformance}
        >
          View Performance
        </button>
      </div>
    </div>
  )
}
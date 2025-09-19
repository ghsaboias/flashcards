import type { HighIntensityModeProps } from '../types/component-props'

export default function HighIntensityMode({
  actions
}: HighIntensityModeProps) {
  const { beginAutoSession, setIsHighIntensityMode } = actions

  return (
    <div className="streamlined-start">
      <h1>🇨🇳 HSK Practice</h1>

      <div className="single-button-hero" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <button className="btn-primary start-practice" onClick={beginAutoSession}>
          Start
        </button>

        <button className="btn-tertiary" onClick={() => setIsHighIntensityMode(false)}>
          Advanced Options
        </button>
      </div>
    </div>
  )
}
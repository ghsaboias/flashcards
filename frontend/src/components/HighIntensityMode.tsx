import type { HighIntensityModeProps } from '../types/component-props'
import type { Domain } from '../types/api-types'
import DomainSelector from './DomainSelector'

interface Props extends HighIntensityModeProps {
  selectedDomain: Domain | null
  onDomainChange: (domain: Domain) => void
}

export default function HighIntensityMode({
  actions,
  selectedDomain,
  onDomainChange
}: Props) {
  const { beginAutoSession, setIsHighIntensityMode } = actions

  return (
    <div className="streamlined-start">
      <DomainSelector
        selectedDomain={selectedDomain}
        onDomainChange={onDomainChange}
      />

      <div className="single-button-hero" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <button className="btn-primary start-practice" onClick={() => beginAutoSession(selectedDomain?.id)}>
          Start
        </button>

        <button className="btn-tertiary" onClick={() => setIsHighIntensityMode(false)}>
          Advanced Options
        </button>
      </div>
    </div>
  )
}
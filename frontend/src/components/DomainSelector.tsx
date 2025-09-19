import { useState, useEffect } from 'react'
import type { Domain } from '../types/api-types'
import { apiClient } from '../utils/api-client'

interface DomainSelectorProps {
  selectedDomain: Domain | null
  onDomainChange: (domain: Domain) => void
}

export default function DomainSelector({ selectedDomain, onDomainChange }: DomainSelectorProps) {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDomains = async () => {
      try {
        const domainsData = await apiClient.listDomains()
        setDomains(domainsData)

        // Auto-select first domain if none selected
        if (!selectedDomain && domainsData.length > 0) {
          onDomainChange(domainsData[0])
        }
      } catch (err) {
        setError('Failed to load domains')
        console.error('Error loading domains:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDomains()
  }, [selectedDomain, onDomainChange])

  if (loading) return <div>Loading domains...</div>
  if (error) return <div>Error: {error}</div>
  if (domains.length === 0) return <div>No domains available</div>

  return (
    <div className="domain-selector">
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {selectedDomain?.icon} {selectedDomain?.name || 'Flashcards'}

        {domains.length > 1 && (
          <select
            value={selectedDomain?.id || ''}
            onChange={(e) => {
              const domain = domains.find(d => d.id === e.target.value)
              if (domain) onDomainChange(domain)
            }}
            style={{
              marginLeft: '15px',
              padding: '5px 10px',
              fontSize: '14px',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          >
            {domains.map(domain => (
              <option key={domain.id} value={domain.id}>
                {domain.icon} {domain.name}
              </option>
            ))}
          </select>
        )}
      </h1>
    </div>
  )
}
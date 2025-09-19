import { useState, useEffect, useMemo, memo } from 'react'
import UnifiedTable from '../components/UnifiedTable'
import MainLayout from '../layouts/MainLayout'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { apiClient } from '../utils/api-client'
import { useAppContext } from '../hooks/useAppContext'
import { formatMultiSetLabel, humanizeSetLabel } from '../utils/hsk-label-utils'
import type { DomainStatsPayload, DomainSrsPayload, PerformancePayload } from '../types/api-types'

const StatsPage = memo(function StatsPage() {
  const [currentView, setCurrentView] = useState<'performance' | 'srs' | 'accuracy'>('performance')
  const { selectedDomain } = useAppContext()

  const [availableSets, setAvailableSets] = useState<string[]>([])
  const [selectedSets, setSelectedSets] = useState<string[]>([])

  const [loadingSets, setLoadingSets] = useState<boolean>(false)
  const [loadingData, setLoadingData] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const [domainStats, setDomainStats] = useState<DomainStatsPayload | null>(null)
  const [domainSrs, setDomainSrs] = useState<DomainSrsPayload | null>(null)
  const [performance, setPerformance] = useState<PerformancePayload | null>(null)

  // Keep set list in sync with selected domain
  useEffect(() => {
    if (!selectedDomain?.id) {
      setAvailableSets([])
      setSelectedSets([])
      return
    }

    let cancelled = false
    setLoadingSets(true)

    apiClient.listSets(selectedDomain.id)
      .then(sets => {
        if (cancelled) return
        setAvailableSets(sets)
        setSelectedSets(prev => prev.filter(set => sets.includes(set)))
      })
      .catch(err => {
        if (cancelled) return
        console.error('Failed to load sets for stats dashboard', err)
        setError('Unable to load sets. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoadingSets(false)
      })

    return () => { cancelled = true }
  }, [selectedDomain?.id])

  // Fetch domain-level stats/SRS data whenever scope changes
  useEffect(() => {
    if (!selectedDomain?.id) {
      setDomainStats(null)
      setDomainSrs(null)
      return
    }

    let cancelled = false
    setLoadingData(true)
    setError(null)

    const setFilter = selectedSets
    Promise.all([
      apiClient.getDomainStats(selectedDomain.id, setFilter),
      apiClient.getDomainSrs(selectedDomain.id, setFilter)
    ])
      .then(([statsRes, srsRes]) => {
        if (cancelled) return
        setDomainStats(statsRes)
        setDomainSrs(srsRes)
      })
      .catch(err => {
        if (cancelled) return
        console.error('Failed to load domain stats', err)
        setError('Unable to load statistics. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoadingData(false)
      })

    return () => { cancelled = true }
  }, [selectedDomain?.id, selectedSets])

  // Domain-specific performance data
  useEffect(() => {
    if (!selectedDomain?.id) {
      setPerformance(null)
      return
    }

    let cancelled = false
    setPerformance(null)

    apiClient.getPerformanceData(selectedDomain.id)
      .then(data => {
        if (!cancelled) setPerformance(data)
      })
      .catch(err => {
        if (!cancelled) console.error('Failed to load performance data', err)
      })

    return () => { cancelled = true }
  }, [selectedDomain?.id])

  const toggleSet = (setName: string) => {
    setSelectedSets(prev => (
      prev.includes(setName)
        ? prev.filter(s => s !== setName)
        : [...prev, setName]
    ))
  }

  const applyAllSets = () => {
    setSelectedSets(availableSets)
  }

  const clearSelection = () => {
    setSelectedSets([])
  }

  const scopeLabel = useMemo(() => {
    if (selectedSets.length === 0) return 'All sets'
    if (selectedSets.length <= 3) {
      return selectedSets.map(humanizeSetLabel).join(', ')
    }
    return formatMultiSetLabel(selectedSets)
  }, [selectedSets])

  const renderPerformanceView = () => (
    <div className="stats-content">
      <div className="stats-header">
        <h2>📊 Performance Analytics</h2>
        {performance && (
          <div className="muted">
            {selectedDomain?.name} · {performance.summary.overall_accuracy}% overall accuracy
          </div>
        )}
      </div>

      {!performance ? (
        <div>
          <LoadingSkeleton variant="stats" />
          <div style={{ marginTop: '24px' }}>
            <LoadingSkeleton variant="table" rows={5} />
          </div>
        </div>
      ) : (
        <>
          <div className="stats-summary">
            <div className="summary-row">
              Sessions: <strong>{performance.summary.total_sessions}</strong> ·
              Questions: <strong>{performance.summary.total_questions}</strong> ·
              Study Days: <strong>{performance.summary.study_days}</strong>
            </div>
            <div className="summary-row">
              Avg Questions/Session: <strong>{performance.summary.avg_questions_per_session}</strong> ·
              Overall Accuracy: <strong>{performance.summary.overall_accuracy}%</strong>
            </div>
          </div>

          {performance.daily.length > 0 && (
            <div className="daily-performance">
              <h3>Daily Performance</h3>
              <div className="table-container">
                <table className="statsTable">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Sessions</th>
                      <th>Questions</th>
                      <th>Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performance.daily.slice(-20).map((day, i) => (
                      <tr key={`${day.date}-${i}`}>
                        <td>{day.date}</td>
                        <td>{day.sessions}</td>
                        <td>{day.questions}</td>
                        <td className={day.accuracy >= 90 ? 'ok' : day.accuracy >= 80 ? '' : 'bad'}>
                          {day.accuracy.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )

  const renderSrsView = () => (
    <div className="stats-content">
      <div className="stats-header">
        <h2>🗓️ SRS Schedule</h2>
        <div className="muted">{scopeLabel}</div>
      </div>

      {loadingData && (
        <div>
          <LoadingSkeleton variant="table" rows={6} />
        </div>
      )}

      {!loadingData && domainSrs && (
        <UnifiedTable
          srsRows={domainSrs.rows}
        />
      )}
    </div>
  )

  const renderAccuracyView = () => (
    <div className="stats-content">
      <div className="stats-header">
        <h2>🎯 Accuracy Statistics</h2>
        <div className="muted">{scopeLabel}</div>
      </div>

      {domainStats && (
        <div className="stats-summary">
          <div className="summary-row">
            <strong>{domainStats.summary.accuracy}% accuracy</strong> · Correct: {domainStats.summary.correct} · Incorrect: {domainStats.summary.incorrect} · Attempts: {domainStats.summary.total}
          </div>
          <div className="summary-row">
            Cards: {domainStats.summary.total_cards} · Attempted: {domainStats.summary.attempted_cards} · Difficult (&lt;80%): {domainStats.summary.difficult_count}
          </div>
        </div>
      )}

      {loadingData && (
        <div>
          <LoadingSkeleton variant="table" rows={6} />
        </div>
      )}

      {!loadingData && domainStats && (
        <UnifiedTable
          statsRows={domainStats.rows}
        />
      )}
    </div>
  )

  if (!selectedDomain) {
    return (
      <MainLayout>
        <div className="stats-page">
          <LoadingSkeleton variant="stats" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="stats-page">
        <div className="view-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button
            className={`btn-${currentView === 'performance' ? 'primary' : 'tertiary'}`}
            onClick={() => setCurrentView('performance')}
          >
            Performance
          </button>
          <button
            className={`btn-${currentView === 'srs' ? 'primary' : 'tertiary'}`}
            onClick={() => setCurrentView('srs')}
          >
            SRS Schedule
          </button>
          <button
            className={`btn-${currentView === 'accuracy' ? 'primary' : 'tertiary'}`}
            onClick={() => setCurrentView('accuracy')}
          >
            Accuracy Stats
          </button>
        </div>

        <div className="panel" style={{ padding: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Domain</div>
              <div style={{ fontWeight: 600 }}>{selectedDomain.icon} {selectedDomain.name}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 12 }}>Scope</div>
              <div>{scopeLabel}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-tertiary" onClick={clearSelection} disabled={selectedSets.length === 0}>Clear</button>
              <button className="btn-tertiary" onClick={applyAllSets} disabled={availableSets.length === 0}>Select All</button>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            {loadingSets ? (
              <LoadingSkeleton variant="table" rows={3} />
            ) : (
              <div className="set-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {availableSets.map(set => (
                  <label key={set} className="checkbox" style={{ minWidth: '220px' }}>
                    <input
                      type="checkbox"
                      checked={selectedSets.includes(set)}
                      onChange={() => toggleSet(set)}
                    />
                    <span>{humanizeSetLabel(set)}</span>
                  </label>
                ))}
                {availableSets.length === 0 && (
                  <div className="muted">No sets available for this domain.</div>
                )}
              </div>
            )}
          </div>

          {selectedSets.length === 0 && (
            <div className="muted" style={{ marginTop: '12px', fontSize: 12 }}>
              Showing aggregated statistics for every set in this domain.
            </div>
          )}
        </div>

        {error && (
          <div className="alert" style={{ marginBottom: '24px', color: 'var(--bad)' }}>
            {error}
          </div>
        )}

        {currentView === 'performance' && renderPerformanceView()}
        {currentView === 'srs' && renderSrsView()}
        {currentView === 'accuracy' && renderAccuracyView()}
      </div>
    </MainLayout>
  )
})

export default StatsPage

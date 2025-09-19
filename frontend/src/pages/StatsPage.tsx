import { useState, useEffect } from 'react'
import { useSessionManager } from '../hooks/useSessionManager'
import { useAppContext } from '../hooks/useAppContext'
import UnifiedTable from '../components/UnifiedTable'
import MainLayout from '../layouts/MainLayout'

export default function StatsPage() {
  const { selectedDomain } = useAppContext()
  const [sessionState, actions] = useSessionManager(selectedDomain)
  const [currentView, setCurrentView] = useState<'performance' | 'srs' | 'accuracy'>('performance')

  const {
    performance
  } = sessionState

  const { setStatsMode } = actions

  // Load the appropriate data when view changes
  useEffect(() => {
    setStatsMode(currentView)
  }, [currentView, setStatsMode])

  const renderPerformanceView = () => (
    <div className="stats-content">
      <div className="stats-header">
        <h2>📊 Performance Analytics</h2>
        {performance && <div className="muted">{performance.summary.overall_accuracy}% overall accuracy</div>}
      </div>

      {performance && (
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
      )}

      {performance && performance.daily.length > 0 && (
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
                  <tr key={i}>
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
    </div>
  )

  const renderSrsView = () => (
    <div className="stats-content">
      <div className="stats-header">
        <h2>🗓️ SRS Schedule</h2>
        <div className="muted">Spaced repetition review schedule</div>
      </div>
      <UnifiedTable
        srsRows={sessionState.srsRows}
      />
    </div>
  )

  const renderAccuracyView = () => (
    <div className="stats-content">
      <div className="stats-header">
        <h2>🎯 Accuracy Statistics</h2>
        <div className="muted">Per-card performance analysis</div>
      </div>
      <UnifiedTable
        statsRows={sessionState.stats?.rows}
      />
    </div>
  )

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

        {currentView === 'performance' && renderPerformanceView()}
        {currentView === 'srs' && renderSrsView()}
        {currentView === 'accuracy' && renderAccuracyView()}
      </div>
    </MainLayout>
  )
}
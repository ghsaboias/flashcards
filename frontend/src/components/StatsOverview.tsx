import type { SessionState } from '../types/session-types'
import UnifiedTable from './UnifiedTable'

interface StatsOverviewProps {
  sessionState: SessionState
  getMultiSetLabel: () => string
}

export default function StatsOverview({
  sessionState,
  getMultiSetLabel
}: StatsOverviewProps) {
  const {
    statsMode,
    performance,
    srsRows,
    stats
  } = sessionState

  // Get due count for SRS  
  // const dueNowCount = 0 // Placeholder - would need to implement SRS due logic


  // Handle different stats modes
  if (statsMode) {
    switch (statsMode) {
      case 'performance':
        return (
          <div className="statsPanel" style={{ marginTop: 8 }}>
            <div className="metaRow">
              <h3>📊 Performance Analytics</h3>
            </div>

            {performance && (
              <div className="panelSubtext muted">
                <div>
                  Sessions: <strong>{performance.summary.total_sessions}</strong> · Questions: <strong>{performance.summary.total_questions}</strong> · Study Days: <strong>{performance.summary.study_days}</strong>
                </div>
                <div>
                  Avg Questions/Session: <strong>{performance.summary.avg_questions_per_session}</strong> · Overall Accuracy: <strong>{performance.summary.overall_accuracy}%</strong>
                </div>
              </div>
            )}

            {performance && performance.daily.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ fontSize: 14, marginBottom: 8 }}>Daily Performance</h4>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
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

      case 'srs':
        return (
          <div className="statsPanel" style={{ marginTop: 8 }}>
            <div className="metaRow">
              <h3>📅 SRS Schedule — {getMultiSetLabel()}</h3>
              <div className="muted">{srsRows.length} items</div>
            </div>

            <UnifiedTable
              srsRows={srsRows.length > 0 ? srsRows : undefined}
              statsRows={undefined}
            />
          </div>
        )

      case 'accuracy':
      default:
        // Unified stats & SRS view (existing default behavior)
        if (stats || srsRows.length > 0) {
          const title = 'SRS & Stats'
          const subtitle = stats ? `${stats.summary.accuracy}% accuracy` : srsRows.length > 0 ? `${srsRows.length} items` : ''

          return (
            <div className="statsPanel" style={{ marginTop: 8 }}>
              <div className="metaRow">
                <h3>{title} — {getMultiSetLabel()}</h3>
                <div className="muted">{subtitle}</div>
              </div>

              {stats && (
                <div className="panelSubtext muted" style={{ marginBottom: 16 }}>
                  <div>
                    <strong>{stats.summary.accuracy}% accuracy</strong> · Correct: {stats.summary.correct} · Incorrect: {stats.summary.incorrect} · Attempts: {stats.summary.total}
                  </div>
                  <div>
                    Cards: {stats.summary.total_cards} · Attempted: {stats.summary.attempted_cards} · Difficult (&lt;80%): {stats.summary.difficult_count}
                  </div>
                </div>
              )}

              {/* Due cards preview */}
              <div style={{
                padding: '12px 16px',
                margin: '0 0 16px 0',
                background: 'var(--panel)',
                borderRadius: '6px',
                textAlign: 'center',
                fontSize: '14px',
                color: 'var(--muted)'
              }}>
                450 cards due now
              </div>

              <UnifiedTable
                srsRows={srsRows.length > 0 ? srsRows : undefined}
                statsRows={stats ? stats.rows || [] : undefined}
              />
            </div>
          )
        }
        break
    }
  }

  return null
}

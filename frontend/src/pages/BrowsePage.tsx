import { useState, useEffect, memo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAudioControls } from '../hooks/useAudioControls'
import { hasChinese } from '../utils/pinyin'
import { useAppContext } from '../hooks/useAppContext'
import { useSessionContext } from '../hooks/useSessionContext'
import { apiClient } from '../utils/api-client'
import MainLayout from '../layouts/MainLayout'
import type { BrowseCard } from '../types/api-types'

const BrowsePage = memo(function BrowsePage() {
  const { set } = useParams<{ set: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { selectedDomain } = useAppContext()
  const { actions } = useSessionContext()
  const { speak } = useAudioControls()

  const [browseRows, setBrowseRows] = useState<BrowseCard[]>([])
  const [browseIndex, setBrowseIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startingSession, setStartingSession] = useState(false)

  // Check if we came from new cards prompt
  const autoStart = searchParams.get('autoStart')
  const domainIdParam = searchParams.get('domainId')
  const shouldAutoStart = autoStart === 'withNew'

  // Load browse data for the specified set
  useEffect(() => {
    if (!set) return

    const loadBrowseData = async () => {
      try {
        setLoading(true)
        setError(null)

        const browseData = await apiClient.getBrowseCards(set, selectedDomain?.id)
        setBrowseRows(browseData)
        setBrowseIndex(0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load browse data')
        console.error('Failed to load browse data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadBrowseData()
  }, [set, selectedDomain?.id])

  const total = browseRows.length
  const i = Math.min(Math.max(browseIndex, 0), Math.max(0, total - 1))
  const current = total > 0 ? browseRows[i] : null

  const handlePrev = () => {
    setBrowseIndex(Math.max(browseIndex - 1, 0))
  }

  const handleNext = () => {
    setBrowseIndex(Math.min(browseIndex + 1, total - 1))
  }

  const handleExit = async () => {
    if (shouldAutoStart && !startingSession) {
      setStartingSession(true)
      try {
        const targetDomainId = domainIdParam || selectedDomain?.id
        const response = await actions.beginAutoSession(targetDomainId, true, false)
        if (response && 'session_id' in response && response.session_id) {
          navigate(`/session/${response.session_id}`)
        } else {
          navigate('/practice')
        }
      } catch (error) {
        console.error('Failed to start session after browsing:', error)
        navigate('/practice')
      } finally {
        setStartingSession(false)
      }
    } else {
      navigate('/practice')
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Loading browse data...</p>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p style={{ color: 'red' }}>{error}</p>
          <button onClick={() => navigate('/practice')} className="btn-primary">
            Back to Practice
          </button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout showNavigation={false}>
      <div className="browse-page">
        <div className="browse-header">
          <h2>Review — {set || 'Unknown Set'}</h2>
          <div className="browse-position">
            {total > 0 ? `${i + 1}/${total}` : '0/0'}
          </div>
        </div>

        {current ? (
          <div className="browse-content">
            <div className={`question ${hasChinese(current.question) ? 'zh' : ''}`}
                 lang={hasChinese(current.question) ? 'zh' : undefined}
                 style={{ fontSize: '32px', marginBottom: '24px', textAlign: 'center' }}>
              {current.question}
            </div>
            <div className="answer" style={{ fontSize: '24px', textAlign: 'center', color: '#666' }}>
              {current.answer}
            </div>
          </div>
        ) : (
          <div className="browse-content" style={{ textAlign: 'center' }}>
            <div className="muted">No items to browse</div>
          </div>
        )}

        <div className="browse-controls" style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          marginTop: '32px'
        }}>
          <button
            onClick={handlePrev}
            disabled={i <= 0}
            className="btn-secondary"
          >
            ← Prev
          </button>
          <button
            onClick={handleNext}
            disabled={i >= total - 1}
            className="btn-secondary"
          >
            Next →
          </button>
          {current && hasChinese(current.question) && (
            <button
              aria-label="Play audio (R)"
              title="Play audio (R)"
              onClick={() => speak(current.question)}
              className="btn-tertiary"
            >
              🔊
            </button>
          )}
          <button
            className="btn-tertiary"
            onClick={handleExit}
            disabled={startingSession}
          >
            {startingSession ? 'Starting Session...' : shouldAutoStart ? 'Start Practice' : 'Exit Review'}
          </button>
        </div>
      </div>
    </MainLayout>
  )
})

export default BrowsePage
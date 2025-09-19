import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAudioControls } from '../hooks/useAudioControls'
import { hasChinese } from '../utils/pinyin'
import { useAppContext } from '../hooks/useAppContext'
import MainLayout from '../layouts/MainLayout'
import type { BrowseCard } from '../types/api-types'

export default function BrowsePage() {
  const { set } = useParams<{ set: string }>()
  const navigate = useNavigate()
  const { selectedDomain } = useAppContext()
  const { speak } = useAudioControls()

  const [browseRows, setBrowseRows] = useState<BrowseCard[]>([])
  const [browseIndex, setBrowseIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load browse data for the specified set
  useEffect(() => {
    if (!set) return

    const loadBrowseData = async () => {
      try {
        setLoading(true)
        setError(null)
        // TODO: Implement browse data loading from API
        // For now, use placeholder data
        const sampleData: BrowseCard[] = [
          { question: 'hello', answer: 'world' },
          { question: 'test', answer: 'data' }
        ]
        setBrowseRows(sampleData)
        setBrowseIndex(0)
      } catch (err) {
        setError('Failed to load browse data')
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

  const handleExit = () => {
    navigate('/practice')
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
          >
            Exit Review
          </button>
        </div>
      </div>
    </MainLayout>
  )
}
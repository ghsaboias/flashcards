import { useState, useEffect, memo, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppContext } from '../hooks/useAppContext'
import { apiClient } from '../utils/api-client'
import MainLayout from '../layouts/MainLayout'
import { formatMultiSetLabel } from '../utils/hsk-label-utils'
import type { DrawingCard } from '../types/api-types'

// Lazy load the heavy DrawingCanvas component
const DrawingCanvas = lazy(() => import('../components/DrawingCanvas'))

const DrawingPage = memo(function DrawingPage() {
  const { set } = useParams<{ set: string }>()
  const navigate = useNavigate()
  const { selectedDomain } = useAppContext()

  const [drawingCards, setDrawingCards] = useState<DrawingCard[]>([])
  const [drawingPosition, setDrawingPosition] = useState(0)
  const [drawingProgress, setDrawingProgress] = useState({ current: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load drawing data for the specified set
  useEffect(() => {
    if (!set) return

    const loadDrawingData = async () => {
      try {
        setLoading(true)
        setError(null)

        const drawingData = await apiClient.getDrawingCards(set, selectedDomain?.id)
        setDrawingCards(drawingData)
        setDrawingPosition(0)
        setDrawingProgress({ current: 0, total: drawingData.length })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load drawing data')
        console.error('Failed to load drawing data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDrawingData()
  }, [set, selectedDomain?.id])

  const total = drawingCards.length
  const current = total > 0 ? drawingCards[drawingPosition] : null

  const handleProgressUpdate = () => {
    // Canvas drawing percentage update - internal to canvas
  }

  const handleComplete = () => {
    const nextPos = drawingPosition + 1
    setDrawingProgress({ current: nextPos, total })

    if (nextPos >= total) {
      // Drawing session complete
      navigate('/practice')
    } else {
      setDrawingPosition(nextPos)
    }
  }

  const handleExit = () => {
    navigate('/practice')
  }

  if (loading) {
    return (
      <MainLayout>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Loading drawing data...</p>
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
      <div className="drawing-page">
        <div className="drawing-header">
          <h2>Practice Drawing — {formatMultiSetLabel([set || ''])}</h2>
          <div className="drawing-position">
            {total > 0 ? `${drawingPosition + 1}/${total}` : '0/0'}
          </div>
        </div>

        {/* Session progress */}
        <div className="session-progress" style={{ marginBottom: '24px' }}>
          <div className="progress-label">
            Session Progress: {drawingProgress.current}/{drawingProgress.total}
          </div>
          <div className="progressBar" role="progressbar"
               aria-valuemin={0}
               aria-valuemax={100}
               aria-valuenow={drawingProgress.total > 0 ? Math.round((drawingProgress.current / drawingProgress.total) * 100) : 0}>
            <div className="progressFill" style={{
              width: `${drawingProgress.total > 0 ? Math.round((drawingProgress.current / drawingProgress.total) * 100) : 0}%`
            }} />
          </div>
        </div>

        {current ? (
          <div className="drawing-content">
            <div className="character-info" style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>
                Draw: <strong>{current.question}</strong>
              </div>
              <div style={{ fontSize: '18px', color: '#666' }}>
                Meaning: {current.answer}
              </div>
            </div>

            <Suspense fallback={
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                fontSize: '16px',
                color: '#666'
              }}>
                Loading drawing canvas...
              </div>
            }>
              <DrawingCanvas
                character={current.question}
                onProgressUpdate={handleProgressUpdate}
                onComplete={handleComplete}
              />
            </Suspense>
          </div>
        ) : (
          <div className="drawing-content" style={{ textAlign: 'center' }}>
            <div className="muted">No Chinese characters found for drawing practice</div>
          </div>
        )}

        <div className="drawing-controls" style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          marginTop: '24px'
        }}>
          <button
            className="btn-tertiary"
            onClick={handleExit}
          >
            Exit Drawing
          </button>
        </div>
      </div>
    </MainLayout>
  )
})

export default DrawingPage
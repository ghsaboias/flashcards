import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppContext } from '../hooks/useAppContext'
import DrawingCanvas from '../components/DrawingCanvas'
import MainLayout from '../layouts/MainLayout'
import { formatMultiSetLabel } from '../utils/hsk-label-utils'
import type { DrawingCard } from '../types/api-types'

export default function DrawingPage() {
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
        // TODO: Implement drawing data loading from API
        // For now, use placeholder data with Chinese characters
        const sampleData: DrawingCard[] = [
          { question: '我', answer: 'I, me' },
          { question: '你', answer: 'you' },
          { question: '他', answer: 'he, him' }
        ]
        setDrawingCards(sampleData)
        setDrawingPosition(0)
        setDrawingProgress({ current: 0, total: sampleData.length })
      } catch (err) {
        setError('Failed to load drawing data')
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

            <DrawingCanvas
              character={current.question}
              onProgressUpdate={handleProgressUpdate}
              onComplete={handleComplete}
            />
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
}
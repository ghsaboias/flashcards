import { useNavigate } from 'react-router-dom'
import { useSessionManager } from '../hooks/useSessionManager'
import { useAppContext } from '../hooks/useAppContext'
import MainLayout from '../layouts/MainLayout'

export default function HomePage() {
  const { selectedDomain } = useAppContext()
  const [sessionState, actions] = useSessionManager(selectedDomain)
  const navigate = useNavigate()

  const handleStartSession = async () => {
    try {
      await actions.beginAutoSession(selectedDomain?.id)
      if (sessionState.sessionId) {
        navigate(`/session/${sessionState.sessionId}`)
      }
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  const handleAdvancedOptions = () => {
    navigate('/practice')
  }

  return (
    <MainLayout>
      <div className="streamlined-start">
        <div className="single-button-hero" style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <button className="btn-primary start-practice" onClick={handleStartSession}>
            Start
          </button>

          <button className="btn-tertiary" onClick={handleAdvancedOptions}>
            Advanced Options
          </button>
        </div>
      </div>
    </MainLayout>
  )
}
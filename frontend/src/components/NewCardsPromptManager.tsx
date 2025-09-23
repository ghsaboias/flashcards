import { memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import NewCardsPrompt from './NewCardsPrompt'
import { useSessionStateAndActions } from '../hooks/useSessionContext'
import { useAppContext } from '../hooks/useAppContext'

const NewCardsPromptManager = memo(function NewCardsPromptManager() {
  const navigate = useNavigate()
  const { selectedDomain } = useAppContext()
  const [state, actions] = useSessionStateAndActions()

  const detection = state.newCardsDetection
  const domainId = selectedDomain?.id

  const navigateToSession = useCallback((sessionId?: string) => {
    if (sessionId) {
      navigate(`/session/${sessionId}`)
    }
  }, [navigate])

  const handleContinueWithNew = useCallback(async () => {
    try {
      const response = await actions.beginAutoSession(domainId, true, false)
      if (response && 'session_id' in response && response.session_id) {
        actions.clearNewCardsDetection()
        navigateToSession(response.session_id)
      }
    } catch (error) {
      console.error('Failed to start session with new cards:', error)
    }
  }, [actions, domainId, navigateToSession])

  const handlePracticeOnly = useCallback(async () => {
    try {
      const response = await actions.beginAutoSession(domainId, true, true)
      if (response && 'session_id' in response && response.session_id) {
        actions.clearNewCardsDetection()
        navigateToSession(response.session_id)
      }
    } catch (error) {
      console.error('Failed to start practice-only session:', error)
    }
  }, [actions, domainId, navigateToSession])

  const handleBrowseFirst = useCallback(() => {
    const firstSet = detection?.options.browse_first.sets_to_browse?.[0]
    if (firstSet) {
      actions.clearNewCardsDetection()
      navigate(`/browse/${encodeURIComponent(firstSet)}?autoStart=withNew&domainId=${domainId}`)
    }
  }, [actions, detection, navigate, domainId])

  const handleCancel = useCallback(() => {
    actions.clearNewCardsDetection()
  }, [actions])

  if (!detection) {
    return null
  }

  return (
    <NewCardsPrompt
      detection={detection}
      onContinueWithNew={handleContinueWithNew}
      onPracticeOnly={handlePracticeOnly}
      onBrowseFirst={handleBrowseFirst}
      onCancel={handleCancel}
    />
  )
})

export default NewCardsPromptManager

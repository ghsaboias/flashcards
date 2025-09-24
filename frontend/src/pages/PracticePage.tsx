import { useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionStateAndActions } from '../hooks/useSessionContext'
import { countByDifficulty } from '../utils/session-utils'
import { formatMultiSetLabel } from '../utils/hsk-label-utils'
import MainLayout from '../layouts/MainLayout'
import { PracticeModesSection } from '../components/home/PracticeModesSection'

const PracticePage = memo(function PracticePage() {
  const [sessionState, actions] = useSessionStateAndActions()
  const navigate = useNavigate()

  const { diffEasy, diffMedium, diffHard, difficultyRows, selectedSets } = sessionState

  const selectedDifficulties = useMemo(() => {
    const vals: Array<'easy' | 'medium' | 'hard'> = []
    if (diffEasy) vals.push('easy')
    if (diffMedium) vals.push('medium')
    if (diffHard) vals.push('hard')
    return vals
  }, [diffEasy, diffMedium, diffHard])

  const canStartByDifficulty = selectedDifficulties.length > 0

  const difficultyCounts = useMemo(() => {
    if (!difficultyRows || difficultyRows.length === 0) {
      return { easy: 0, medium: 0, hard: 0 }
    }
    return countByDifficulty(difficultyRows)
  }, [difficultyRows])

  const getMultiSetLabel = () => formatMultiSetLabel(selectedSets)

  return (
    <MainLayout>
      <PracticeModesSection
        sessionState={sessionState}
        actions={actions}
        canStartByDifficulty={canStartByDifficulty}
        difficultyCounts={difficultyCounts}
        getMultiSetLabel={getMultiSetLabel}
        onBackToSimple={() => navigate('/')}
        backLabel="← Home"
      />
    </MainLayout>
  )
})

export default PracticePage

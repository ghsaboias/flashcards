export function assessResponseDifficulty(responseTimeMs: number, isCorrect: boolean): 'easy' | 'medium' | 'hard' {
  // Base difficulty on response time: 2s = easy, 4s = medium, 6s+ = hard
  const durationSec = responseTimeMs / 1000
  let timeDifficulty: 'easy' | 'medium' | 'hard'
  if (durationSec <= 2) timeDifficulty = 'easy'
  else if (durationSec <= 4) timeDifficulty = 'medium'
  else timeDifficulty = 'hard'

  // If incorrect, bump up difficulty by one level
  if (!isCorrect) {
    if (timeDifficulty === 'easy') timeDifficulty = 'medium'
    else if (timeDifficulty === 'medium') timeDifficulty = 'hard'
    // hard stays hard
  }

  return timeDifficulty
}

export function calculateFeedbackDuration(
  responseTimeMs: number,
  difficulty: 'easy' | 'medium' | 'hard',
  isCorrect: boolean
): number {
  const baseTime = 2000 // 2 seconds base
  const responseContribution = responseTimeMs * 0.3 // 30% of response time

  const difficultyMultiplier = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3
  const difficultyTime = difficultyMultiplier * 1000 // 1s, 2s, or 3s

  // Incorrect answers get extra time for consolidation
  const correctnessBonus = isCorrect ? 0 : 1500 // +1.5s for incorrect

  const totalTime = Math.max(
    baseTime + responseContribution + correctnessBonus,
    difficultyTime
  )

  return Math.min(totalTime, 6000) // Cap at 6 seconds
}

export function calculateAdaptiveFeedbackDuration(
  responseTimeMs: number,
  responseDifficulty: 'easy' | 'medium' | 'hard',
  cardDifficulty: 'easy' | 'medium' | 'hard',
  isCorrect: boolean
): number {
  const baseTime = 1500 // Base feedback time
  const responseContribution = Math.min(responseTimeMs * 0.25, 2000) // Cap response contribution

  // Combine response difficulty with historical card difficulty
  const combinedDifficulty = responseDifficulty === 'hard' || cardDifficulty === 'hard' ? 'hard' :
                            responseDifficulty === 'medium' || cardDifficulty === 'medium' ? 'medium' : 'easy'

  const difficultyMultiplier = combinedDifficulty === 'easy' ? 1 : combinedDifficulty === 'medium' ? 1.5 : 2.5
  const difficultyTime = difficultyMultiplier * 1000

  // Incorrect answers on hard cards get more time for consolidation
  const correctnessBonus = isCorrect ? 0 : (cardDifficulty === 'hard' ? 2000 : 1500)

  const totalTime = Math.max(
    baseTime + responseContribution + correctnessBonus,
    difficultyTime
  )

  return Math.min(totalTime, 6000) // Cap at 6 seconds
}
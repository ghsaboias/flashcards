export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export function classifyDifficulty(accuracy: number, attempts?: number): DifficultyLevel {
  // Cards with no attempts are considered hard for practice purposes
  if (attempts !== undefined && attempts === 0) return 'hard'

  if (accuracy >= 90) return 'easy'
  if (accuracy >= 80) return 'medium'
  return 'hard'
}

export function isDifficult(accuracy: number, attempts: number): boolean {
  return attempts > 0 && accuracy < 80
}

export function getDifficultyThresholds() {
  return {
    easy: 90,
    medium: 80,
    hard: 0
  } as const
}
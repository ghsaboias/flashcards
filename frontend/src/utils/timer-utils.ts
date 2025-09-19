// Timer utility functions for session duration tracking

export function formatSessionDuration(startTime: number | null): string {
  if (!startTime) return "0:00"

  const elapsed = Date.now() - startTime
  const seconds = Math.floor(elapsed / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function getSessionDurationMinutes(startTime: number | null): number {
  if (!startTime) return 0

  const elapsed = Date.now() - startTime
  return Math.floor(elapsed / (1000 * 60))
}
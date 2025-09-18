// SRS Date Processing Utilities
// Consolidates duplicated UTC date parsing logic from SrsTable.tsx and UnifiedTable.tsx

/**
 * Parse SRS date string with UTC timezone handling
 * Handles both "YYYY-MM-DD HH:MM:SS" and "YYYY-MM-DD" formats
 * Returns UTC Date object to match backend database logic
 */
export function parseSrsDateUTC(raw: string): Date | null {
  try {
    if (!raw || typeof raw !== 'string') return null

    if (raw.includes(' ')) {
      // Format: "YYYY-MM-DD HH:MM:SS"
      const [datePart, timePart] = raw.split(' ')
      const [y, m, d] = datePart.split('-').map((n) => parseInt(n, 10))
      const [hh = '0', mm = '0', ss = '0'] = timePart.split(':')

      if (isNaN(y) || isNaN(m) || isNaN(d)) return null

      // Create UTC date to match database CURRENT_TIMESTAMP
      return new Date(Date.UTC(
        y,
        (m || 1) - 1,
        d || 1,
        parseInt(hh, 10) || 0,
        parseInt(mm, 10) || 0,
        parseInt(ss, 10) || 0
      ))
    }

    // Format: "YYYY-MM-DD"
    const [y, m, d] = raw.split('-').map((n) => parseInt(n, 10))
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null

    return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0))
  } catch (e) {
    console.warn('parseSrsDateUTC failed:', e, 'raw:', raw)
    return null
  }
}

/**
 * Get current UTC timestamp as number
 * Used for SRS due date comparisons
 */
export function getCurrentUTCTime(): number {
  return Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
    new Date().getUTCHours(),
    new Date().getUTCMinutes(),
    new Date().getUTCSeconds()
  )
}

/**
 * Check if an SRS card is due for review now
 * Compares next review date against current UTC time
 */
export function isSrsDue(nextReviewDate?: string): boolean {
  if (!nextReviewDate) return false

  const reviewDate = parseSrsDateUTC(nextReviewDate)
  if (!reviewDate) return false

  return reviewDate.getTime() <= getCurrentUTCTime()
}

/**
 * Format Date object to SRS string format
 * Returns "YYYY-MM-DD HH:MM:SS" format
 */
export function formatSrsDate(date: Date): string {
  return date.getUTCFullYear() + '-' +
    String(date.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(date.getUTCDate()).padStart(2, '0') + ' ' +
    String(date.getUTCHours()).padStart(2, '0') + ':' +
    String(date.getUTCMinutes()).padStart(2, '0') + ':' +
    String(date.getUTCSeconds()).padStart(2, '0')
}

/**
 * Get relative time string for SRS display
 * Example: "Due now", "Due in 2 hours", "Overdue by 1 day"
 */
export function getRelativeTimeString(nextReviewDate?: string): string {
  if (!nextReviewDate) return 'No review scheduled'

  const reviewDate = parseSrsDateUTC(nextReviewDate)
  if (!reviewDate) return 'Invalid date'

  const nowUTC = getCurrentUTCTime()
  const reviewTime = reviewDate.getTime()
  const diffMs = reviewTime - nowUTC

  if (Math.abs(diffMs) < 60000) { // Less than 1 minute
    return 'Due now'
  }

  const diffHours = Math.round(diffMs / (1000 * 60 * 60))

  if (diffMs < 0) {
    // Overdue
    const absDiffHours = Math.abs(diffHours)
    if (absDiffHours < 24) {
      return `Overdue by ${absDiffHours}h`
    } else {
      const days = Math.round(absDiffHours / 24)
      return `Overdue by ${days}d`
    }
  } else {
    // Future
    if (diffHours < 24) {
      return `Due in ${diffHours}h`
    } else {
      const days = Math.round(diffHours / 24)
      return `Due in ${days}d`
    }
  }
}
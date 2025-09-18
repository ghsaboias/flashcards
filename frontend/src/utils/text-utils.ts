// Text Processing Utilities
// Consolidates duplicated text validation and processing logic

/**
 * Validate user answer against correct answer
 * Handles multiple correct answers separated by ';' or ' or '
 * Case-insensitive comparison with trimming
 */
export function validateUserAnswer(userAnswer: string, correctAnswer: string): boolean {
  const ua = userAnswer.toLowerCase().trim()
  const ans = correctAnswer.toLowerCase().trim()

  // Handle multiple correct answers
  if (ans.includes(';') || ans.includes(' or ')) {
    const correctParts = ans.split(/;|\s+or\s+/).map(p => p.trim()).filter(Boolean)
    const userParts = ua.split(/\s+or\s+/).map(p => p.trim()).filter(Boolean)

    // Check if any user part matches any correct part
    return userParts.some(userPart =>
      correctParts.some(correctPart => userPart === correctPart)
    )
  }

  // Simple single answer comparison
  return ua === ans
}

/**
 * Normalize text for case-insensitive comparison
 * Removes extra whitespace and converts to lowercase
 */
export function normalizeForComparison(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Parse multiple answers from a string
 * Splits on ';' or ' or ' and returns cleaned array
 */
export function parseMultipleAnswers(text: string): string[] {
  return text
    .split(/;|\s+or\s+/)
    .map(part => part.trim())
    .filter(Boolean)
}

/**
 * Capitalize the first letter of each word
 * Used for display formatting
 */
export function capitalizeWords(text: string): string {
  return text.replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Replace underscores with spaces
 * Common formatting operation for labels
 */
export function replaceUnderscores(text: string): string {
  return text.replace(/_/g, ' ')
}

/**
 * Clean and format text for display
 * Combines underscore replacement and word capitalization
 */
export function formatDisplayText(text: string): string {
  return capitalizeWords(replaceUnderscores(text))
}

/**
 * Extract numbers from text using regex
 * Returns array of numbers found in the text
 */
export function extractNumbers(text: string): number[] {
  const matches = text.match(/\d+/g)
  return matches ? matches.map(num => parseInt(num, 10)) : []
}

/**
 * Check if text contains Chinese characters
 * Useful for determining if pinyin processing is needed
 */
export function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text)
}

/**
 * Truncate text to specified length with ellipsis
 * Useful for display in tables or cards
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Remove HTML tags from text
 * Safety utility for text display
 */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '')
}

/**
 * Convert text to URL-friendly slug
 * Replaces spaces and special characters
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
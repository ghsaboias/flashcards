// HSK Label Processing Utilities
// Consolidates duplicated label formatting logic from App.tsx

export interface HSKLabelParts {
  level: number
  setNumber: number
  isValid: boolean
}

// Regex patterns for HSK processing
export const HSK_PATTERNS = {
  HSK_LEVEL: /HSK_Level_(\d+)/i,
  HSK_SET: /HSK(\d+)_Set_0?(\d+)/i,
  HSK_LEVEL_NORMALIZE: /\b(hsk)\s*level\s*(\d+)/i,
  HSK_NUMBER_NORMALIZE: /\b(hsk)\s*(\d+)/i,
  WORD_BOUNDARY: /\b\w/g,
  UNDERSCORE: /_/g
} as const

/**
 * Parse HSK label components from raw string
 */
export function parseHSKLabel(raw: string): HSKLabelParts {
  const trimmed = raw.replace('Recognition_Practice/', '')
  const parts = trimmed.split('/')

  if (parts.length === 2) {
    const [level, name] = parts
    const levelMatch = level.match(HSK_PATTERNS.HSK_LEVEL)
    const setMatch = name.match(HSK_PATTERNS.HSK_SET)

    if (levelMatch && setMatch) {
      return {
        level: parseInt(levelMatch[1]),
        setNumber: parseInt(setMatch[1]),
        isValid: true
      }
    }
  }

  return { level: 0, setNumber: 0, isValid: false }
}

/**
 * Extract HSK level number from text
 */
export function extractHSKLevel(text: string): number | null {
  const match = text.match(HSK_PATTERNS.HSK_LEVEL)
  return match ? parseInt(match[1]) : null
}

/**
 * Extract set number from text
 */
export function extractSetNumber(text: string): number | null {
  const match = text.match(HSK_PATTERNS.HSK_SET)
  return match ? parseInt(match[1]) : null
}

/**
 * Convert raw set name to human-readable format
 * Example: "Recognition_Practice/HSK_Level_1/HSK1_Set_01" → "HSK 1 — Set 1"
 */
export function humanizeSetLabel(raw: string): string {
  const trimmed = raw.replace('Recognition_Practice/', '')
  const parts = trimmed.split('/')

  if (parts.length === 2) {
    const [level, name] = parts
    const levelPretty = level
      .replace(HSK_PATTERNS.UNDERSCORE, ' ')
      .replace(HSK_PATTERNS.HSK_LEVEL, (_m, d) => `HSK ${d}`)
    const namePretty = name
      .replace(HSK_PATTERNS.HSK_SET, (_m, _h, n) => `Set ${Number(n)}`)
      .replace(HSK_PATTERNS.UNDERSCORE, ' ')
    return `${levelPretty} — ${namePretty}`
  }

  return trimmed.replace(HSK_PATTERNS.UNDERSCORE, ' ')
}

/**
 * Convert raw category name to human-readable format
 * Example: "hsk_level_1" → "HSK Level 1"
 */
export function humanizeCategoryLabel(raw: string): string {
  return raw
    .replace(HSK_PATTERNS.UNDERSCORE, ' ')
    .replace(HSK_PATTERNS.HSK_LEVEL_NORMALIZE, (_m, _h, d) => `HSK Level ${d}`)
    .replace(HSK_PATTERNS.HSK_NUMBER_NORMALIZE, (_m, _h, d) => `HSK ${d}`)
    .replace(HSK_PATTERNS.WORD_BOUNDARY, (c) => c.toUpperCase())
}

/**
 * Format multiple sets into a compact label with ranges
 * Example: ["HSK1_Set_01", "HSK1_Set_02", "HSK1_Set_03"] → "HSK L1 S1 - S3"
 */
export function formatMultiSetLabel(setNames: string[]): string {
  if (setNames.length === 0) return 'No sets selected'
  if (setNames.length === 1) return humanizeSetLabel(setNames[0])

  // Parse sets and group by HSK level
  const setsByLevel: { [level: number]: number[] } = {}

  setNames.forEach(setName => {
    const parts = parseHSKLabel(setName)
    if (parts.isValid) {
      if (!setsByLevel[parts.level]) {
        setsByLevel[parts.level] = []
      }
      setsByLevel[parts.level].push(parts.setNumber)
    }
  })

  // Format each level's sets with ranges
  const levelGroups: string[] = []

  Object.keys(setsByLevel)
    .map(k => parseInt(k))
    .sort((a, b) => a - b)
    .forEach(level => {
      const sets = setsByLevel[level].sort((a, b) => a - b)
      const ranges: string[] = []

      let start = sets[0]
      let end = sets[0]

      for (let i = 1; i < sets.length; i++) {
        if (sets[i] === end + 1) {
          end = sets[i]
        } else {
          // Add the current range
          if (start === end) {
            ranges.push(`S${start}`)
          } else {
            ranges.push(`S${start} - S${end}`)
          }
          start = sets[i]
          end = sets[i]
        }
      }

      // Add the final range
      if (start === end) {
        ranges.push(`S${start}`)
      } else {
        ranges.push(`S${start} - S${end}`)
      }

      levelGroups.push(`HSK L${level} ${ranges.join(', ')}`)
    })

  return levelGroups.join('; ')
}
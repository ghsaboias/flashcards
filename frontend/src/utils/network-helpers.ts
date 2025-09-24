// Extract tone from pinyin or tone field
export function extractTone(pinyin: string, toneField?: number): number {
  if (toneField !== undefined) return toneField
  if (pinyin.includes('ā') || pinyin.includes('ē') || pinyin.includes('ī') || pinyin.includes('ō') || pinyin.includes('ū')) return 1
  if (pinyin.includes('á') || pinyin.includes('é') || pinyin.includes('í') || pinyin.includes('ó') || pinyin.includes('ú')) return 2
  if (pinyin.includes('ǎ') || pinyin.includes('ě') || pinyin.includes('ǐ') || pinyin.includes('ǒ') || pinyin.includes('ǔ')) return 3
  if (pinyin.includes('à') || pinyin.includes('è') || pinyin.includes('ì') || pinyin.includes('ò') || pinyin.includes('ù')) return 4
  return 0 // neutral
}

// Tone arrows like in HTML
export function getToneArrow(tone: number): string {
  const toneArrows = {
    1: '→',  // high flat
    2: '↗',  // rising
    3: '↘↗', // falling-rising
    4: '↘',  // falling
    0: '·'   // neutral
  }
  return toneArrows[tone as keyof typeof toneArrows] || ''
}

// Map POS abbreviations to full words - match HTML
export function getPosDisplay(pos?: string): string {
  if (!pos) return 'Unknown'
  const posFullNames = {
    'V': 'Verb',
    'N': 'Noun',
    'Adj': 'Adjective',
    'Num': 'Number',
    'Adv': 'Adverb',
    'M': 'Measure',
    'Prep': 'Preposition',
    'Pron': 'Pronoun',
    'Aux': 'Auxiliary',
    'Conj': 'Conjunction'
  }
  // Handle multiple POS separated by /
  return pos.split('/').map(p => posFullNames[p as keyof typeof posFullNames] || p).join('/')
}
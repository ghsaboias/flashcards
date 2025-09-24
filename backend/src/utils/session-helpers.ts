export function matchesDifficulty(
  r: any,
  requested: Set<'easy' | 'medium' | 'hard'>
): boolean {
  const c = Number(r.correct_count || 0)
  const ic = Number(r.incorrect_count || 0)
  const rv = Number(r.reviewed_count || 0)
  const attempts = rv > 0 ? rv : (c + ic)
  let status: 'easy' | 'medium' | 'hard'
  if (attempts <= 10) status = 'hard'
  else {
    const accuracy = (c / attempts) * 100
    if (accuracy > 90) status = 'easy'
    else if (accuracy > 80) status = 'medium'
    else status = 'hard'
  }
  return requested.has(status)
}

export function nowUtc(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

export function computeSessionType(mode: string): string {
  switch (mode) {
    case 'multi_set_all': return 'Multi-Set Review'
    case 'multi_set_difficult': return 'Multi-Set Practice by Difficulty'
    case 'multi_set_srs': return 'SRS Review'
    case 'review_incorrect': return 'Review Incorrect'
    default: return mode
  }
}
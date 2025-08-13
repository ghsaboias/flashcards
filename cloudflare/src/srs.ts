export type SrsState = {
  easiness_factor: number
  interval_hours: number
  repetitions: number
}

export function updateSrs(state: SrsState, isCorrect: boolean): SrsState & { next_review_date: string } {
  let { easiness_factor: ef, interval_hours: ivl, repetitions: reps } = state

  if (isCorrect) {
    if (reps === 0) ivl = 1
    else if (reps === 1) ivl = 4
    else if (reps === 2) ivl = 12
    else if (reps === 3) ivl = 24
    else if (reps === 4) ivl = 72
    else if (reps === 5) ivl = 168
    else ivl = Math.round(ivl * ef)
    reps += 1
  } else {
    reps = 0
    ivl = 1
  }

  const quality = isCorrect ? 5 : 0
  ef = ef + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  if (ef < 1.3) ef = 1.3
  if (ivl > 168) ivl = 168

  // Return UTC formatted date string
  const now = new Date()
  const next = new Date(now.getTime() + ivl * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())} ${pad(next.getUTCHours())}:${pad(next.getUTCMinutes())}:${pad(next.getUTCSeconds())}`

  return { easiness_factor: Math.round(ef * 100) / 100, interval_hours: ivl, repetitions: reps, next_review_date: fmt }
}



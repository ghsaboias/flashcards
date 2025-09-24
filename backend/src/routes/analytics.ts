import { Context } from 'hono'

type Env = {
  DB: D1Database
  ASSETS: { fetch: typeof fetch }
  SESSIONS: DurableObjectNamespace
  API_TOKEN?: string
}

// Performance analytics handler (global or domain-specific)
export async function handlePerformanceAnalytics(c: Context<{ Bindings: Env }>) {
  const domainId = c.req.query('domain_id') || ''

  if (domainId) {
    const { results } = await c.env.DB.prepare(
      `WITH domain_sessions AS (
         SELECT
           s.id AS session_id,
           DATE(s.started_at) AS date,
           SUM(CASE WHEN c.domain_id = ? THEN 1 ELSE 0 END) AS questions,
           SUM(CASE WHEN c.domain_id = ? AND se.correct = 1 THEN 1 ELSE 0 END) AS correct,
           SUM(CASE WHEN c.domain_id = ? THEN COALESCE(se.duration_seconds, 0) ELSE 0 END) AS duration_seconds
         FROM sessions s
         LEFT JOIN session_events se ON se.session_id = s.id
         LEFT JOIN cards c ON c.id = se.card_id
         GROUP BY s.id, DATE(s.started_at)
         HAVING questions > 0
       )
       SELECT session_id, date, questions, correct, duration_seconds
       FROM domain_sessions`
    ).bind(domainId, domainId, domainId).all()

    const domainRows = (results || []).map((r: any) => ({
      sessionId: r.session_id,
      date: r.date,
      questions: Number(r.questions) || 0,
      correct: Number(r.correct) || 0,
      durationSeconds: Number(r.duration_seconds) || 0,
    }))

    const dailyMap = new Map<string, { sessions: number; questions: number; correct: number; durationSeconds: number }>()

    for (const row of domainRows) {
      if (!dailyMap.has(row.date)) {
        dailyMap.set(row.date, { sessions: 0, questions: 0, correct: 0, durationSeconds: 0 })
      }
      const day = dailyMap.get(row.date)!
      day.sessions += 1
      day.questions += row.questions
      day.correct += row.correct
      day.durationSeconds += row.durationSeconds
    }

    const daily = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        sessions: data.sessions,
        questions: data.questions,
        accuracy: data.questions > 0 ? Math.round(((data.correct / data.questions) * 100) * 10) / 10 : 0,
        duration_minutes: data.durationSeconds > 0 ? Math.round(((data.durationSeconds / 60) * 10)) / 10 : undefined,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const totalSessions = domainRows.length
    const totalQuestions = domainRows.reduce((sum, row) => sum + row.questions, 0)
    const totalCorrect = domainRows.reduce((sum, row) => sum + row.correct, 0)
    const avgQuestionsPerSession = totalSessions > 0 ? Math.round(((totalQuestions / totalSessions) * 10)) / 10 : 0
    const overallAccuracy = totalQuestions > 0 ? Math.round(((totalCorrect / totalQuestions) * 100) * 10) / 10 : 0
    const studyDays = daily.length

    return c.json({
      summary: {
        total_sessions: totalSessions,
        total_questions: totalQuestions,
        overall_accuracy: overallAccuracy,
        study_days: studyDays,
        avg_questions_per_session: avgQuestionsPerSession,
      },
      daily,
    })
  }

  const { results: sessionResults } = await c.env.DB.prepare(
    `SELECT DATE(started_at) AS date,
            COUNT(*) AS sessions,
            SUM(CASE WHEN total IS NOT NULL THEN total ELSE 0 END) AS questions,
            AVG(CASE WHEN total > 0 THEN CAST(correct_count AS REAL) / total * 100 ELSE 0 END) AS accuracy,
            AVG(duration_seconds) / 60 AS duration_minutes
     FROM sessions
     GROUP BY DATE(started_at)
     ORDER BY date DESC`
  ).all()

  const dailyData = (sessionResults || []).map((r: any) => ({
    date: r.date,
    sessions: r.sessions || 0,
    questions: r.questions || 0,
    accuracy: Math.round((r.accuracy || 0) * 10) / 10,
    duration_minutes: r.duration_minutes ? Math.round(r.duration_minutes * 10) / 10 : undefined,
  }))

  const totalSessions = dailyData.reduce((a, b) => a + b.sessions, 0)
  const totalQuestions = dailyData.reduce((a, b) => a + b.questions, 0)
  const studyDays = dailyData.filter(d => d.sessions > 0).length
  const avgQuestionsPerSession = totalSessions > 0 ? Math.round((totalQuestions / totalSessions) * 10) / 10 : 0
  const totalQuestionsWithAccuracy = dailyData.reduce((sum, d) => sum + (d.questions > 0 ? d.questions : 0), 0)
  const overallAccuracy = totalQuestionsWithAccuracy > 0 ?
    Math.round((dailyData.reduce((sum, d) => sum + d.accuracy * d.questions, 0) / totalQuestionsWithAccuracy) * 10) / 10 : 0

  return c.json({
    summary: {
      total_sessions: totalSessions,
      total_questions: totalQuestions,
      overall_accuracy: overallAccuracy,
      study_days: studyDays,
      avg_questions_per_session: avgQuestionsPerSession,
    },
    daily: dailyData.reverse(),
  })
}
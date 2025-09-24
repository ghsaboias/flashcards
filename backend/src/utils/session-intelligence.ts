// Smart set selection based on learning state
export async function selectOptimalSets(db: D1Database, unlockedSets: string[], domainId: string): Promise<string[]> {
  if (unlockedSets.length === 0) return []

  // Get learning state for all unlocked sets
  const placeholders = unlockedSets.map(() => '?').join(',')
  const { results } = await db.prepare(
    `SELECT
      set_key,
      COUNT(*) as total_cards,
      SUM(correct_count) as total_correct,
      SUM(incorrect_count) as total_incorrect,
      SUM(CASE WHEN reviewed_count > 0 THEN reviewed_count ELSE correct_count + incorrect_count END) as total_attempts,
      SUM(CASE WHEN datetime(next_review_date) <= CURRENT_TIMESTAMP THEN 1 ELSE 0 END) as due_cards
     FROM cards
     WHERE set_key IN (${placeholders}) AND domain_id = ?
     GROUP BY set_key
     ORDER BY set_key`
  ).bind(...unlockedSets, domainId).all()

  // Score each set based on learning priority
  const setScores = (results || []).map((row: any) => {
    const setName = row.set_key
    const attempts = row.total_attempts || 0
    const correct = row.total_correct || 0
    const dueCards = row.due_cards || 0

    const accuracy = attempts > 0 ? (correct / attempts) * 100 : 0

    let score = 0

    // Priority 1: Sets with SRS due cards (memory maintenance)
    if (dueCards > 0) score += 100

    // Priority 2: Struggling sets (accuracy < 80% with attempts > 10)
    if (attempts > 10 && accuracy < 80) score += 80

    // Priority 3: Active learning sets (moderate attempts, room for improvement)
    if (attempts >= 10 && attempts <= 100 && accuracy >= 80 && accuracy < 90) score += 60

    // Priority 4: New sets (few attempts)
    if (attempts > 0 && attempts <= 10) score += 40

    // Deprioritize mastered sets (accuracy > 90% with many attempts)
    if (attempts > 100 && accuracy > 90) score -= 50

    return { setName, score, accuracy, attempts, dueCards }
  })

  // Sort by score (highest first) and select top 2 sets
  const sortedSets = setScores
    .filter(s => s.score > 0) // Only include sets with positive scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 2) // Limit to 2 sets to avoid context switching
    .map(s => s.setName)

  // Fallback: if no sets scored positively, take first unlocked set
  return sortedSets.length > 0 ? sortedSets : [unlockedSets[0]]
}

// Helper function to analyze cards and detect new vs practiced
export async function analyzeSessionCards(db: D1Database, selectedSets: string[], domainId: string, difficultyLevels: string[]) {
  const placeholders = selectedSets.map(() => '?').join(',')

  // Get all relevant cards with their practice status
  const { results } = await db.prepare(
    `SELECT
      question, answer, set_key,
      correct_count, incorrect_count, reviewed_count,
      CASE WHEN
        -- Truly new cards
        (reviewed_count = 0 AND correct_count = 0 AND incorrect_count = 0) OR
        -- Struggling cards: < 10 attempts AND <= 50% accuracy
        (reviewed_count < 10 AND reviewed_count > 0 AND
         (correct_count * 100.0 / reviewed_count) <= 50)
        THEN 1 ELSE 0 END as is_new
     FROM cards
     WHERE set_key IN (${placeholders}) AND domain_id = ?
     ORDER BY set_key, question`
  ).bind(...selectedSets, domainId).all()

  const allCards = results || []
  const newCards = allCards.filter((card: any) => card.is_new === 1)
  const practicedCards = allCards.filter((card: any) => card.is_new === 0)

  return {
    totalCards: allCards.length,
    newCards: newCards.length,
    practicedCards: practicedCards.length,
    selectedSets,
    newCardExamples: newCards.slice(0, 3).map((card: any) => ({
      question: card.question,
      answer: card.answer,
      set: card.set_key
    }))
  }
}
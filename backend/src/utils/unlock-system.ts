// Progressive unlock criteria
export const UNLOCK_CRITERIA = {
  'Recognition_Practice/HSK_Level_1/HSK1_Set_02': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_01', minAccuracy: 85, minAttempts: 20 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_03': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_02', minAccuracy: 80, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_04': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_03', minAccuracy: 80, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_05': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_04', minAccuracy: 75, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_06': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_05', minAccuracy: 75, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_07': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_06', minAccuracy: 75, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_08': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_07', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_09': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_08', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_10': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_09', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_11': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_10', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_12': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_11', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_13': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_12', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_14': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_13', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_15': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_14', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_16': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_15', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_17': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_16', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_18': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_17', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_19': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_18', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_20': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_19', minAccuracy: 70, minAttempts: 15 },
  'Recognition_Practice/HSK_Level_1/HSK1_Set_21': { requires: 'Recognition_Practice/HSK_Level_1/HSK1_Set_20', minAccuracy: 70, minAttempts: 15 }
}

export async function checkUnlockStatus(db: D1Database, setName: string): Promise<boolean> {
  const criteria = UNLOCK_CRITERIA[setName as keyof typeof UNLOCK_CRITERIA]
  if (!criteria) return true // No restrictions

  const { results } = await db.prepare(
    `SELECT
      SUM(correct_count) as total_correct,
      SUM(incorrect_count) as total_incorrect,
      SUM(CASE WHEN reviewed_count > 0 THEN reviewed_count ELSE correct_count + incorrect_count END) as total_attempts
     FROM cards WHERE set_key = ?`
  ).bind(criteria.requires).all()

  if (!results || results.length === 0) return false

  const row = results[0] as any
  const totalAttempts = row.total_attempts || 0
  const totalCorrect = row.total_correct || 0

  if (totalAttempts < criteria.minAttempts) return false

  const accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0
  return accuracy >= criteria.minAccuracy
}

export async function getUnlockedSets(db: D1Database, domainId?: string): Promise<string[]> {
  // Optimized single-query approach for getting all unlocked sets
  const optimizedQuery = `
    WITH set_stats AS (
      SELECT
        set_key,
        SUM(correct_count) as total_correct,
        SUM(CASE WHEN reviewed_count > 0 THEN reviewed_count ELSE correct_count + incorrect_count END) as total_attempts
      FROM cards
      WHERE domain_id = ?
      GROUP BY set_key
    )
    SELECT
      s.set_key,
      s.total_correct,
      s.total_attempts,
      CASE WHEN s.total_attempts > 0 THEN (s.total_correct * 100.0 / s.total_attempts) ELSE 0 END as accuracy,
      -- Check unlock status based on HSK progression rules
      CASE
        WHEN s.set_key = 'HSK1_Set_01' OR s.set_key = 'Recognition_Practice/HSK_Level_1/HSK1_Set_01' THEN 1  -- First set always unlocked
        WHEN s.set_key LIKE '%HSK1_Set_%' THEN
          CASE WHEN (
            SELECT total_attempts >= 10 AND
                   (total_correct * 100.0 / total_attempts) >= 70
            FROM set_stats
            WHERE set_key = SUBSTR(s.set_key, 1, LENGTH(s.set_key) - 2) || PRINTF('%02d', CAST(SUBSTR(s.set_key, -2) AS INTEGER) - 1)
          ) THEN 1 ELSE 0 END
        ELSE 1  -- Non-HSK sets default to unlocked
      END as is_unlocked
    FROM set_stats s
    WHERE is_unlocked = 1
    ORDER BY s.set_key
  `

  const { results } = await db.prepare(optimizedQuery).bind(domainId || 'chinese').all()
  if (!results) return []

  return (results as any[]).map(row => row.set_key)
}
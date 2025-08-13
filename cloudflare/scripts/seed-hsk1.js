/*
  Seed HSK Level 1 CSVs into D1 `cards`.
  Usage:
    node ./scripts/seed-hsk1.js

  It will print SQL you can pipe to wrangler, or directly call wrangler via child_process if preferred.
*/

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd(), '..')
const BASE_DIR = path.join(ROOT, 'Recognition_Practice', 'HSK_Level_1')

function toCategoryKey() {
  return 'hsk_level_1'
}

function inferSetKey(filePath) {
  // Return path without trailing _flashcards.csv
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/')
  const noExt = rel.replace(/_flashcards\.csv$/i, '')
  return noExt
}

function parseCsv(content) {
  const rows = []
  const lines = content.split(/\r?\n/)
  for (const line of lines) {
    if (!line.trim()) continue
    // naive CSV split; our data has no embedded commas in Q/A
    const cols = line.split(',')
    rows.push(cols)
  }
  return rows
}

function asSqlValue(s) {
  const v = (s ?? '').replaceAll("'", "''")
  return `'${v}'`
}

function main() {
  if (!fs.existsSync(BASE_DIR)) {
    console.error('Not found:', BASE_DIR)
    process.exit(1)
  }

  const files = fs.readdirSync(BASE_DIR).filter(f => f.endsWith('_flashcards.csv'))
  const statements = []

  for (const file of files) {
    const fp = path.join(BASE_DIR, file)
    const setKey = inferSetKey(fp)
    const categoryKey = toCategoryKey()
    const content = fs.readFileSync(fp, 'utf-8')
    const rows = parseCsv(content)
    for (const row of rows) {
      if (row.length < 2) continue
      const [question, answer] = row
      const correct = Number(row[2] || 0) || 0
      const incorrect = Number(row[3] || 0) || 0
      const reviewed = Number(row[4] || 0) || 0
      const ef = row[5] ? Number(row[5]) : 2.5
      const interval = row[6] ? Number(row[6]) : 0
      const reps = row[7] ? Number(row[7]) : 0
      const nextReview = row[8] || '1970-01-01 00:00:00'
      const sql = `INSERT OR IGNORE INTO cards (category_key,set_key,question,answer,correct_count,incorrect_count,reviewed_count,easiness_factor,interval_hours,repetitions,next_review_date) VALUES (${asSqlValue(categoryKey)}, ${asSqlValue(setKey)}, ${asSqlValue(question)}, ${asSqlValue(answer)}, ${correct}, ${incorrect}, ${reviewed}, ${ef}, ${interval}, ${reps}, ${asSqlValue(nextReview)});`
      statements.push(sql)
    }
  }

  // Output SQL to stdout. Pipe into wrangler:
  //   node ./scripts/seed-hsk1.js | wrangler d1 execute flashcards --remote --file -
  console.log(statements.join('\n'))
}

main()



import { pinyin as pinyinPro } from 'pinyin-pro'
import { useMemo, useState } from 'react'
import type { SrsRow, StatRow } from '../types/api-types'
import { isSrsDue, parseSrsDateUTC, getCurrentUTCTime } from '../utils/srs-date-utils'
import { humanizeSetLabel } from '../utils/hsk-label-utils'

// Unified row type combining both SRS and Stats data
type UnifiedRow = {
    question: string
    answer: string
    set_name?: string
    // Stats data
    correct?: number
    incorrect?: number
    total?: number
    accuracy?: number
    // SRS data
    easiness_factor?: number
    interval_hours?: number
    repetitions?: number
    next_review_date?: string
    // Computed fields
    status: 'easy' | 'medium' | 'hard'
    isDue: boolean
}

type SortKey = keyof UnifiedRow | 'pinyin'
type SortDir = 'asc' | 'desc'

type Props = {
    srsRows?: SrsRow[]
    statsRows?: StatRow[]
}

function classifyStatus(total: number = 0, accuracy: number = 0): 'easy' | 'medium' | 'hard' {
    const attempts = total || 0
    const acc = accuracy || 0
    if (attempts <= 10) return 'hard'
    if (acc > 90) return 'easy'
    if (acc > 80) return 'medium'
    return 'hard'
}

function isDueNow(nextReviewDate?: string): boolean {
    return isSrsDue(nextReviewDate)
}

function formatNextReview(raw?: string): string {
    if (!raw) return '-'
    const dt = parseSrsDateUTC(raw)
    if (!dt) return raw
    const diffMs = dt.getTime() - getCurrentUTCTime()
    if (diffMs <= 0) return 'Now'
    const totalMinutes = Math.floor(diffMs / 60000)
    const days = Math.floor(totalMinutes / (60 * 24))
    const remAfterDays = totalMinutes % (60 * 24)
    const hours = Math.floor(remAfterDays / 60)
    const minutes = remAfterDays % 60
    if (days > 0) return `${days}d${hours > 0 ? ` ${hours}h` : ''}`
    if (hours > 0) return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`
    if (minutes > 0) return `${minutes}m`
    return '<1m'
}

function hasChinese(text: string): boolean {
    return /[\u4e00-\u9fff]/.test(text)
}

function compareValues(a: unknown, b: unknown, dir: SortDir) {
    const factor = dir === 'asc' ? 1 : -1
    
    if (a == null && b == null) return 0
    if (a == null) return 1 * factor
    if (b == null) return -1 * factor
    
    if (typeof a === 'number' && typeof b === 'number') {
        return (a - b) * factor
    }
    
    if (typeof a === 'boolean' && typeof b === 'boolean') {
        return (a === b ? 0 : a ? 1 : -1) * factor
    }
    
    const aStr = String(a).toLowerCase()
    const bStr = String(b).toLowerCase()
    if (aStr < bStr) return -1 * factor
    if (aStr > bStr) return 1 * factor
    return 0
}

export default function UnifiedTable({ srsRows = [], statsRows = [] }: Props) {
    const [sortKey, setSortKey] = useState<SortKey | null>(null)
    const [sortDir, setSortDir] = useState<SortDir>('asc')

    // Merge SRS and Stats data
    const unifiedRows = useMemo((): UnifiedRow[] => {
        const rowMap = new Map<string, UnifiedRow>()
        
        // Add stats data
        statsRows.forEach(stat => {
            const key = `${stat.set_name || ''}|${stat.question}|${stat.answer}`
            rowMap.set(key, {
                question: stat.question,
                answer: stat.answer,
                set_name: stat.set_name,
                correct: stat.correct,
                incorrect: stat.incorrect,
                total: stat.total,
                accuracy: stat.accuracy,
                status: classifyStatus(stat.total, stat.accuracy),
                isDue: false
            })
        })

        // Add/merge SRS data
        srsRows.forEach(srs => {
            const key = `${srs.set_name || ''}|${srs.question}|${srs.answer}`
            const existing = rowMap.get(key)
            const due = isDueNow(srs.next_review_date)

            if (existing) {
                // Merge SRS data into existing stats row
                existing.easiness_factor = srs.easiness_factor
                existing.interval_hours = srs.interval_hours
                existing.repetitions = srs.repetitions
                existing.next_review_date = srs.next_review_date
                existing.isDue = due
                existing.set_name = existing.set_name || srs.set_name
            } else {
                // Create new row with only SRS data
                rowMap.set(key, {
                    question: srs.question,
                    answer: srs.answer,
                    set_name: srs.set_name,
                    easiness_factor: srs.easiness_factor,
                    interval_hours: srs.interval_hours,
                    repetitions: srs.repetitions,
                    next_review_date: srs.next_review_date,
                    status: 'medium', // Default for SRS-only rows
                    isDue: due
                })
            }
        })
        
        return Array.from(rowMap.values())
    }, [srsRows, statsRows])

    const sortedRows = useMemo(() => {
        if (!sortKey) return unifiedRows
        
        const copy = unifiedRows.slice()
        if (sortKey === 'pinyin') {
            copy.sort((a, b) => {
                const aPinyin = hasChinese(a.question) ? pinyinPro(a.question, { toneType: 'symbol' }) : ''
                const bPinyin = hasChinese(b.question) ? pinyinPro(b.question, { toneType: 'symbol' }) : ''
                return compareValues(aPinyin, bPinyin, sortDir)
            })
        } else if (sortKey === 'status') {
            const rank: Record<'easy' | 'medium' | 'hard', number> = { easy: 0, medium: 1, hard: 2 }
            copy.sort((a, b) => compareValues(rank[a.status], rank[b.status], sortDir))
        } else {
            copy.sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir))
        }
        return copy
    }, [unifiedRows, sortKey, sortDir])

    function onSort(nextKey: SortKey) {
        if (sortKey === nextKey) {
            if (sortDir === 'asc') {
                setSortDir('desc')
            } else if (sortDir === 'desc') {
                setSortKey(null)
                setSortDir('asc')
            }
        } else {
            setSortKey(nextKey)
            setSortDir('asc')
        }
    }

    function header(label: string, key: SortKey) {
        const isActive = sortKey === key
        const ariaSort: 'none' | 'ascending' | 'descending' = !isActive ? 'none' : sortDir === 'asc' ? 'ascending' : 'descending'
        const arrow = !isActive ? '' : sortDir === 'asc' ? ' ▲' : ' ▼'
        return (
            <th scope="col" aria-sort={ariaSort}>
                <button
                    type="button"
                    onClick={() => onSort(key)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'inherit',
                        padding: 0,
                        cursor: 'pointer',
                        font: 'inherit',
                    }}
                    aria-label={`Sort by ${label}${isActive ? (sortDir === 'asc' ? ' ascending' : ' descending') : ''}`}
                >
                    {label}{arrow}
                </button>
            </th>
        )
    }

    const hasStatsData = statsRows.length > 0
    const hasSrsData = srsRows.length > 0
    const showSetColumn = unifiedRows.some(row => row.set_name)

    return (
        <table className="statsTable unifiedTable">
            <thead>
                <tr>
                    {showSetColumn && header('Set', 'set_name')}
                    {header('Question', 'question')}
                    {header('Pinyin', 'pinyin')}
                    {header('Answer', 'answer')}
                    {hasStatsData && (
                        <>
                            {header('✓', 'correct')}
                            {header('✗', 'incorrect')}
                            {header('Accuracy', 'accuracy')}
                            {header('Status', 'status')}
                        </>
                    )}
                    {hasSrsData && (
                        <>
                            {header('EF', 'easiness_factor')}
                            {header('Interval', 'interval_hours')}
                            {header('Reps', 'repetitions')}
                            {header('Review', 'next_review_date')}
                            {header('Due', 'isDue')}
                        </>
                    )}
                </tr>
            </thead>
            <tbody>
                {sortedRows.map((row, i) => {
                    const pinyin = hasChinese(row.question) ? pinyinPro(row.question, { toneType: 'symbol' }) : ''
                    return (
                        <tr key={i}>
                            {showSetColumn && (
                                <td className="muted">{row.set_name ? humanizeSetLabel(row.set_name) : '-'}</td>
                            )}
                            <td>{row.question}</td>
                            <td className="muted">{pinyin}</td>
                            <td>{row.answer}</td>
                            {hasStatsData && (
                                <>
                                    <td>{row.correct ?? '-'}</td>
                                    <td>{row.incorrect ?? '-'}</td>
                                    <td>{row.accuracy ? `${row.accuracy}%` : '-'}</td>
                                    <td>
                                        <span className={`statusPill ${row.status}`} aria-label={`Status ${row.status}`}>
                                            <span className="dot" aria-hidden="true" />
                                            {row.status}
                                        </span>
                                    </td>
                                </>
                            )}
                            {hasSrsData && (
                                <>
                                    <td>{row.easiness_factor ? row.easiness_factor.toFixed(2) : '-'}</td>
                                    <td>{row.interval_hours ? `${row.interval_hours}h` : '-'}</td>
                                    <td>{row.repetitions ?? '-'}</td>
                                    <td title={row.next_review_date}>{formatNextReview(row.next_review_date)}</td>
                                    <td className={row.isDue ? 'bad' : 'ok'} aria-label={row.isDue ? 'Overdue' : 'On schedule'}>
                                        {row.next_review_date ? (row.isDue ? '✗' : '✓') : '-'}
                                    </td>
                                </>
                            )}
                        </tr>
                    )
                })}
            </tbody>
        </table>
    )
}

import { pinyin as pinyinPro } from 'pinyin-pro'
import { useMemo, useState } from 'react'
import type { StatRow } from '../types/api-types'

type SortKey =
    | keyof Pick<StatRow, 'question' | 'answer' | 'correct' | 'incorrect' | 'total' | 'accuracy'>
    | 'status'
type SortDir = 'asc' | 'desc'

type Props = {
    rows: StatRow[]
}

function compareValues(a: unknown, b: unknown, dir: SortDir) {
    const factor = dir === 'asc' ? 1 : -1

    // Handle null/undefined values
    if (a == null && b == null) return 0
    if (a == null) return 1 * factor  // null values go to end
    if (b == null) return -1 * factor

    // If both are numbers, compare numerically
    if (typeof a === 'number' && typeof b === 'number') {
        return (a - b) * factor
    }

    // Convert to numbers if they look like numbers (including percentages)
    const aStr = String(a)
    const bStr = String(b)
    const aNum = parseFloat(aStr.replace('%', ''))
    const bNum = parseFloat(bStr.replace('%', ''))

    if (!isNaN(aNum) && !isNaN(bNum)) {
        return (aNum - bNum) * factor
    }

    // Fall back to string comparison
    const as = aStr.toLowerCase()
    const bs = bStr.toLowerCase()
    if (as < bs) return -1 * factor
    if (as > bs) return 1 * factor
    return 0
}

export default function StatsTable({ rows }: Props) {
    const [sortKey, setSortKey] = useState<SortKey | null>(null)
    const [sortDir, setSortDir] = useState<SortDir>('asc')

    function classifyStatus(row: StatRow): 'easy' | 'medium' | 'hard' {
        const attempts = row.total || 0
        const accuracy = row.accuracy || 0
        if (attempts <= 10) return 'hard'
        if (accuracy > 90) return 'easy'
        if (accuracy > 80) return 'medium'
        return 'hard'
    }

    function onSort(nextKey: SortKey) {
        if (sortKey === nextKey) {
            // Same column clicked - cycle through asc -> desc -> null (unsorted)
            if (sortDir === 'asc') {
                setSortDir('desc')
            } else if (sortDir === 'desc') {
                setSortKey(null)  // Clear sorting
                setSortDir('asc') // Reset direction for next time
            }
        } else {
            // Different column clicked - start with ascending
            setSortKey(nextKey)
            setSortDir('asc')
        }
    }

    function hasChinese(text: string): boolean {
        return /[\u4e00-\u9fff]/.test(text)
    }

    const sortedRows = useMemo(() => {
        if (!sortKey) return rows
        const copy = rows.slice()
        if (sortKey === 'status') {
            const rank: Record<'easy' | 'medium' | 'hard', number> = { easy: 0, medium: 1, hard: 2 }
            copy.sort((a, b) => {
                const av = rank[classifyStatus(a)]
                const bv = rank[classifyStatus(b)]
                return sortDir === 'asc' ? av - bv : bv - av
            })
        } else {
            copy.sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir))
        }
        return copy
    }, [rows, sortKey, sortDir])

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

    return (
        <table className="statsTable">
            <thead>
                <tr>
                    {header('Question', 'question')}
                    <th scope="col">Pinyin</th>
                    {header('Answer', 'answer')}
                    {header('✓', 'correct')}
                    {header('✗', 'incorrect')}
                    {header('Attempts', 'total')}
                    {header('Accuracy', 'accuracy')}
                    {header('Status', 'status')}
                </tr>
            </thead>
            <tbody>
                {sortedRows.map((r, i) => (
                    <tr key={i}>
                        <td>{r.question}</td>
                        <td className="muted">{hasChinese(r.question) ? (pinyinPro(r.question, { toneType: 'symbol' }) || '') : ''}</td>
                        <td>{r.answer}</td>
                        <td>{r.correct}</td>
                        <td>{r.incorrect}</td>
                        <td>{r.total}</td>
                        <td>{r.accuracy}%</td>
                        <td>
                            {(() => {
                                const s = classifyStatus(r)
                                return (
                                    <span className={`statusPill ${s}`} aria-label={`Status ${s}`}>
                                        <span className="dot" aria-hidden="true" />
                                        {s}
                                    </span>
                                )
                            })()}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}



import { pinyin as pinyinPro } from 'pinyin-pro'
import { useMemo, useState } from 'react'
import type { SrsRow } from '../api'

type Props = {
    rows: SrsRow[]
}

export default function SrsTable({ rows }: Props) {
    type SortKey = 'question' | 'answer' | 'easiness_factor' | 'interval_hours' | 'repetitions' | 'next_review_date' | 'on_schedule'
    type SortDir = 'asc' | 'desc'

    const [sortKey, setSortKey] = useState<SortKey | null>(null)
    const [sortDir, setSortDir] = useState<SortDir>('asc')

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

    function isDueNow(row: SrsRow): boolean {
        if (!row.next_review_date) return false
        const t = parseSrsDate(row.next_review_date)
        if (!t) return false
        return t.getTime() <= Date.now()
    }

    function parseSrsDate(raw: string): Date | null {
        try {
            if (!raw || typeof raw !== 'string') return null
            if (raw.includes(' ')) {
                const [datePart, timePart] = raw.split(' ')
                const [y, m, d] = datePart.split('-').map((n) => parseInt(n, 10))
                const [hh = '0', mm = '0', ss = '0'] = timePart.split(':')
                // Validate parsed numbers
                if (isNaN(y) || isNaN(m) || isNaN(d)) return null
                return new Date(y, (m || 1) - 1, d || 1, parseInt(hh, 10) || 0, parseInt(mm, 10) || 0, parseInt(ss, 10) || 0)
            }
            // Legacy date-only format (treat as local midnight)
            const [y, m, d] = raw.split('-').map((n) => parseInt(n, 10))
            // Validate parsed numbers
            if (isNaN(y) || isNaN(m) || isNaN(d)) return null
            return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0)
        } catch {
            return null
        }
    }

    function getSortValue(row: SrsRow, key: SortKey): number | string {
        switch (key) {
            case 'question':
                return row.question || ''
            case 'answer':
                return row.answer || ''
            case 'easiness_factor':
                return row.easiness_factor != null ? Number(row.easiness_factor) : 0
            case 'interval_hours':
                return row.interval_hours != null ? Number(row.interval_hours) : 0
            case 'repetitions':
                return row.repetitions != null ? Number(row.repetitions) : 0
            case 'next_review_date': {
                const dt = parseSrsDate(row.next_review_date)
                return dt ? dt.getTime() : Number.POSITIVE_INFINITY
            }
            case 'on_schedule':
                return isDueNow(row) ? 1 : 0
            default:
                return 0
        }
    }

    function hasChinese(text: string): boolean {
        return /[\u4e00-\u9fff]/.test(text)
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

        // Convert to numbers if they look like numbers
        const aStr = String(a)
        const bStr = String(b)
        const aNum = parseFloat(aStr)
        const bNum = parseFloat(bStr)

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

    const sortedRows = useMemo(() => {
        if (!sortKey) return rows
        const copy = rows.slice()
        copy.sort((a, b) => {
            const va = getSortValue(a, sortKey)
            const vb = getSortValue(b, sortKey)
            return compareValues(va, vb, sortDir)
        })
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

    function formatNextReview(raw: string): string {
        const dt = parseSrsDate(raw)
        if (!dt) return raw || ''
        const diffMs = dt.getTime() - Date.now()
        if (diffMs <= 0) return 'Now'
        const totalMinutes = Math.floor(diffMs / 60000)
        const days = Math.floor(totalMinutes / (60 * 24))
        const remAfterDays = totalMinutes % (60 * 24)
        const hours = Math.floor(remAfterDays / 60)
        const minutes = remAfterDays % 60
        if (days > 0) return `In ${days}d${hours > 0 ? `${hours}h` : ''}${minutes > 0 ? `${minutes}min` : ''}`
        if (hours > 0) return `In ${hours}h${minutes > 0 ? `${minutes}min` : ''}`
        if (minutes > 0) return `In ${minutes}min`
        return 'In <1min'
    }

    return (
        <table className="statsTable srsTable">
            <thead>
                <tr>
                    {header('Question', 'question')}
                    <th scope="col">Pinyin</th>
                    {header('Answer', 'answer')}
                    {header('EF', 'easiness_factor')}
                    {header('Interval', 'interval_hours')}
                    {header('Reps', 'repetitions')}
                    {header('Review', 'next_review_date')}
                    {header('On Schedule', 'on_schedule')}
                </tr>
            </thead>
            <tbody>
                {sortedRows.map((r) => {
                    const due = isDueNow(r)
                    const onSchedule = !due
                    const py = hasChinese(r.question) ? (pinyinPro(r.question, { toneType: 'symbol' }) || '') : ''
                    return (
                        <tr key={`${r.set_name}|${r.question}|${r.answer}|${r.next_review_date}`}>
                            <td>{r.question}</td>
                            <td className="muted">{py}</td>
                            <td>{r.answer}</td>
                            <td>{Number(r.easiness_factor).toFixed(2)}</td>
                            <td>{r.interval_hours}h</td>
                            <td>{r.repetitions}</td>
                            <td title={r.next_review_date}>{formatNextReview(r.next_review_date)}</td>
                            <td className={onSchedule ? 'ok' : 'bad'} aria-label={onSchedule ? 'On schedule' : 'Overdue'} title={onSchedule ? 'On schedule' : 'Overdue'}>
                                {onSchedule ? '✓' : '✗'}
                            </td>
                        </tr>
                    )
                })}
            </tbody>
        </table>
    )
}



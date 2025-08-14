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
        const t = parseSrsDateUTC(row.next_review_date) // Use UTC parsing
        if (!t) return false
        return t.getTime() <= getCurrentUTCTime() // Use UTC comparison
    }

    // UTC-aware date parsing for SRS calculations (to match backend logic)
    function parseSrsDateUTC(raw: string): Date | null {
        try {
            if (!raw || typeof raw !== 'string') return null
            if (raw.includes(' ')) {
                const [datePart, timePart] = raw.split(' ')
                const [y, m, d] = datePart.split('-').map((n) => parseInt(n, 10))
                const [hh = '0', mm = '0', ss = '0'] = timePart.split(':')
                if (isNaN(y) || isNaN(m) || isNaN(d)) return null
                // Create UTC date to match database CURRENT_TIMESTAMP
                return new Date(Date.UTC(y, (m || 1) - 1, d || 1, parseInt(hh, 10) || 0, parseInt(mm, 10) || 0, parseInt(ss, 10) || 0))
            }
            const [y, m, d] = raw.split('-').map((n) => parseInt(n, 10))
            if (isNaN(y) || isNaN(m) || isNaN(d)) return null
            return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0))
        } catch {
            return null
        }
    }

    // Get current UTC time (to match database CURRENT_TIMESTAMP)
    function getCurrentUTCTime(): number {
        return Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            new Date().getUTCDate(),
            new Date().getUTCHours(),
            new Date().getUTCMinutes(),
            new Date().getUTCSeconds()
        )
    }

    function hasChinese(text: string): boolean {
        return /[\u4e00-\u9fff]/.test(text)
    }


    const sortedRows = useMemo(() => {
        if (!sortKey) return rows

        function getSortValueMemo(row: SrsRow, key: SortKey): string | number {
            switch (key) {
                case 'question': return row.question
                case 'answer': return row.answer
                case 'easiness_factor': return row.easiness_factor
                case 'interval_hours': return row.interval_hours
                case 'repetitions': return row.repetitions
                case 'next_review_date': return row.next_review_date || ''
                default: return ''
            }
        }

        function compareValuesMemo(a: string | number, b: string | number, dir: SortDir): number {
            if (typeof a === 'number' && typeof b === 'number') {
                return dir === 'asc' ? a - b : b - a
            }
            const aStr = String(a || '').toLowerCase()
            const bStr = String(b || '').toLowerCase()
            if (aStr < bStr) return dir === 'asc' ? -1 : 1
            if (aStr > bStr) return dir === 'asc' ? 1 : -1
            return 0
        }

        const copy = rows.slice()
        copy.sort((a, b) => {
            const va = getSortValueMemo(a, sortKey)
            const vb = getSortValueMemo(b, sortKey)
            return compareValuesMemo(va, vb, sortDir)
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
        const dt = parseSrsDateUTC(raw) // Use UTC parsing
        if (!dt) return raw || ''
        const diffMs = dt.getTime() - getCurrentUTCTime() // Use UTC comparison
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



import { useEffect, useState } from 'react'
import { getSignedUrls } from '../lib/entries'
import './ContactSheet.css'

const FOCUS_LABELS = ['', 'Scattered', 'Distracted', 'Steady', 'Focused', 'Locked in']

/**
 * Signature visual: a strip of recent days rendered like a contact sheet
 * of film negatives. Filled frames show the day's photo; empty frames
 * are unexposed (no entry); frozen frames show a frost pattern.
 */
export default function ContactSheet({ entries, freezeDates, days = 14, onSelectDate }) {
  const [urls, setUrls] = useState({})

  const cells = buildCells(entries, freezeDates, days)
  const paths = cells.filter((c) => c.entry).map((c) => c.entry.photo_path)

  useEffect(() => {
    if (paths.length === 0) return
    let cancelled = false
    getSignedUrls(paths).then((map) => {
      if (!cancelled) setUrls(map)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paths.join(',')])

  return (
    <div className="contact-sheet">
      <div className="contact-sheet__sprockets" aria-hidden="true">
        {Array.from({ length: 24 }).map((_, i) => <span key={i} />)}
      </div>
      <div className="contact-sheet__strip">
        {cells.map((cell) => (
          <button
            key={cell.date}
            className={`frame frame--${cell.state}`}
            style={cell.entry ? { '--focus-tint': focusTint(cell.entry.focus_score) } : undefined}
            onClick={() => onSelectDate?.(cell.date)}
            title={frameTitle(cell)}
          >
            {cell.entry && urls[cell.entry.photo_path] ? (
              <img src={urls[cell.entry.photo_path]} alt="" loading="lazy" />
            ) : cell.state === 'frozen' ? (
              <span className="frame__freeze" aria-hidden="true">❄</span>
            ) : (
              <span className="frame__empty" aria-hidden="true" />
            )}
            <span className="frame__daylabel">{cell.label}</span>
          </button>
        ))}
      </div>
      <div className="contact-sheet__sprockets" aria-hidden="true">
        {Array.from({ length: 24 }).map((_, i) => <span key={i} />)}
      </div>
    </div>
  )
}

function buildCells(entries, freezeDates, days) {
  const byDate = new Map(entries.map((e) => [e.study_date, e]))
  const freezeSet = new Set(freezeDates)
  const cells = []
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(cursor)
    d.setDate(d.getDate() - i)
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    const entry = byDate.get(iso) || null
    let state = 'empty'
    if (entry) state = 'filled'
    else if (freezeSet.has(iso)) state = 'frozen'
    else if (i === 0) state = 'today'

    cells.push({
      date: iso,
      entry,
      state,
      label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    })
  }
  return cells
}

function focusTint(score) {
  const tints = ['', '#C2613D', '#D1815F', '#E8A33D', '#7FBFAC', '#5FA893']
  return tints[score] || tints[3]
}

function frameTitle(cell) {
  if (cell.entry) {
    return `${cell.label} — ${FOCUS_LABELS[cell.entry.focus_score]}, ${cell.entry.hours_studied}h`
  }
  if (cell.state === 'frozen') return `${cell.label} — streak freeze used`
  if (cell.state === 'today') return `${cell.label} — today, not logged yet`
  return `${cell.label} — no entry`
}

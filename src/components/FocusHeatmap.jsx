import './FocusHeatmap.css'

const FOCUS_LABELS = ['No entry', 'Scattered', 'Distracted', 'Steady', 'Focused', 'Locked in']

/**
 * GitHub-style heatmap, but cells are colored by self-rated focus quality
 * (1-5) rather than mere presence/absence — answers "was I actually
 * focused that day", not just "did I show up".
 */
export default function FocusHeatmap({ entries, weeks = 18, onSelectDate }) {
  const byDate = new Map(entries.map((e) => [e.study_date, e]))
  const columns = buildColumns(weeks)

  return (
    <div className="heatmap">
      <div className="heatmap__grid" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
        {columns.map((col, ci) => (
          <div className="heatmap__col" key={ci}>
            {col.map((cell) => {
              const entry = cell ? byDate.get(cell.iso) : null
              return (
                <button
                  key={cell ? cell.iso : Math.random()}
                  className={`heatmap__cell ${entry ? `heatmap__cell--${entry.focus_score}` : ''} ${!cell ? 'heatmap__cell--blank' : ''}`}
                  disabled={!cell}
                  onClick={() => cell && onSelectDate?.(cell.iso)}
                  title={cell ? `${cell.iso} — ${FOCUS_LABELS[entry?.focus_score || 0]}` : undefined}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="heatmap__legend">
        <span>Less focused</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`heatmap__cell heatmap__cell--${n} heatmap__legend-swatch`} />
        ))}
        <span>More focused</span>
      </div>
    </div>
  )
}

function buildColumns(weeks) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // align end-of-grid to the upcoming Saturday for a clean weekly grid
  const end = new Date(today)
  end.setDate(end.getDate() + (6 - end.getDay()))
  const start = new Date(end)
  start.setDate(start.getDate() - weeks * 7 + 1)

  const cols = []
  let cursor = new Date(start)
  for (let w = 0; w < weeks; w++) {
    const col = []
    for (let d = 0; d < 7; d++) {
      if (cursor > today) {
        col.push(null)
      } else {
        const iso = new Date(cursor.getTime() - cursor.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 10)
        col.push({ iso })
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    cols.push(col)
  }
  return cols
}

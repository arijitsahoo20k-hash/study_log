import './StatsPanel.css'

export default function StatsPanel({ entries, streak }) {
  const week = lastNDays(entries, 7)
  const retro = buildRetro(week)

  return (
    <div className="stats-grid">
      <div className="stat-card stat-card--streak">
        <span className="stat-card__label">Current streak</span>
        <span className="stat-card__value">
          {streak.current}
          <span className="stat-card__unit">{streak.current === 1 ? 'day' : 'days'}</span>
        </span>
        <span className="stat-card__sub">Best ever: {streak.longest} days</span>
      </div>

      <div className="stat-card">
        <span className="stat-card__label">This week</span>
        <span className="stat-card__value">
          {retro.totalHours.toFixed(1)}
          <span className="stat-card__unit">hrs</span>
        </span>
        <span className="stat-card__sub">{retro.count} of 7 days logged</span>
      </div>

      <div className="stat-card">
        <span className="stat-card__label">Avg. focus</span>
        <span className="stat-card__value">
          {retro.avgFocus ? retro.avgFocus.toFixed(1) : '—'}
          <span className="stat-card__unit">/ 5</span>
        </span>
        <span className="stat-card__sub">{retro.trendLabel}</span>
      </div>

      <div className="stat-card stat-card--wide">
        <span className="stat-card__label">Retrospective</span>
        <p className="stat-card__retro">{retro.summary}</p>
      </div>
    </div>
  )
}

function lastNDays(entries, n) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - n)
  return entries.filter((e) => new Date(e.study_date) > cutoff)
}

function buildRetro(week) {
  const count = week.length
  const totalHours = week.reduce((s, e) => s + Number(e.hours_studied), 0)
  const avgFocus = count ? week.reduce((s, e) => s + e.focus_score, 0) / count : 0

  if (count === 0) {
    return {
      count,
      totalHours,
      avgFocus,
      trendLabel: 'No data yet',
      summary: "No entries this week yet. Take today's photo to start the week's log.",
    }
  }

  const best = [...week].sort((a, b) => b.focus_score - a.focus_score)[0]
  const worst = [...week].sort((a, b) => a.focus_score - b.focus_score)[0]
  const sorted = [...week].sort((a, b) => a.study_date.localeCompare(b.study_date))
  const firstHalf = sorted.slice(0, Math.ceil(sorted.length / 2))
  const secondHalf = sorted.slice(Math.ceil(sorted.length / 2))
  const firstAvg = avgOf(firstHalf)
  const secondAvg = avgOf(secondHalf)
  const trend = secondAvg - firstAvg
  const trendLabel = trend > 0.3 ? 'Trending up ↑' : trend < -0.3 ? 'Trending down ↓' : 'Holding steady'

  const bestDay = weekdayName(best.study_date)
  const worstDay = weekdayName(worst.study_date)

  let summary = `${count} ${count === 1 ? 'session' : 'sessions'} logged, ${totalHours.toFixed(1)} hours total. `
  summary += best.id !== worst.id
    ? `${bestDay} was your sharpest day, ${worstDay} your foggiest. `
    : `Focus was consistent across the week. `
  summary += trend > 0.3
    ? 'Your focus climbed as the week went on.'
    : trend < -0.3
    ? 'Focus dipped later in the week — worth a lighter day soon.'
    : 'A steady rhythm — no big swings.'

  return { count, totalHours, avgFocus, trendLabel, summary }
}

function avgOf(list) {
  if (!list.length) return 0
  return list.reduce((s, e) => s + e.focus_score, 0) / list.length
}

function weekdayName(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long' })
}

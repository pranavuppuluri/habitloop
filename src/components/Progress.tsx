import { dayRange, fromKey, monthName, todayKey } from '../lib/date'
import { completionSeries, habitStats } from '../lib/stats'
import { colorVar, type AppData } from '../lib/types'

interface ProgressProps {
  data: AppData
}

const WINDOW = 30

export function Progress({ data }: ProgressProps) {
  const active = data.habits.filter((h) => !h.archived)
  const dates = dayRange(todayKey(), WINDOW)
  const series = completionSeries(data, dates)
  const rows = active
    .map((habit) => ({ habit, stats: habitStats(data, habit) }))
    .sort((a, b) => b.stats.streak - a.stats.streak)

  const totalDone = rows.reduce((n, r) => n + r.stats.doneDays, 0)
  const bestStreak = rows.reduce((n, r) => Math.max(n, r.stats.best), 0)
  const liveStreaks = rows.filter((r) => r.stats.streak > 0).length
  const avgRate = rows.length === 0 ? 0 : rows.reduce((n, r) => n + r.stats.rate, 0) / rows.length

  if (active.length === 0) {
    return (
      <div className="empty">
        <h2>Nothing to chart yet</h2>
        <p>Add a habit and check it off for a few days. Your trend shows up here.</p>
      </div>
    )
  }

  return (
    <>
      <div className="stat-grid">
        <div className="stat">
          <div className="stat-key">Check-ins</div>
          <div className="stat-val">{totalDone}</div>
        </div>
        <div className="stat">
          <div className="stat-key">Live streaks</div>
          <div className="stat-val">
            {liveStreaks}
            <small> / {rows.length}</small>
          </div>
        </div>
        <div className="stat">
          <div className="stat-key">Best run</div>
          <div className="stat-val">
            {bestStreak}
            <small> days</small>
          </div>
        </div>
        <div className="stat">
          <div className="stat-key">Average rate</div>
          <div className="stat-val">
            {Math.round(avgRate * 100)}
            <small>%</small>
          </div>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <span className="panel-title">Last {WINDOW} days</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            share of each day finished
          </span>
        </div>
        <Bars dates={dates} series={series} />
      </section>

      <section className="panel">
        <div className="panel-head">
          <span className="panel-title">Every habit</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Habit</th>
              <th>Streak</th>
              <th>Best</th>
              <th>Rate</th>
              <th>Days</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ habit, stats }) => (
              <tr key={habit.id}>
                <td>
                  <span className="name">
                    <span className="nav-dot" style={{ background: colorVar(habit.color) }} />
                    {habit.icon} {habit.name}
                  </span>
                </td>
                <td className="mono">{stats.streak}</td>
                <td className="mono">{stats.best}</td>
                <td className="mono">{Math.round(stats.rate * 100)}%</td>
                <td className="mono">
                  {stats.doneDays}/{stats.scheduledDays}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}

/** Bar per day. Height is the share of that day's habits finished. */
function Bars({ dates, series }: { dates: string[]; series: number[] }) {
  const W = 100
  const H = 30
  const gap = 0.5
  const barW = W / dates.length - gap

  return (
    <>
      <svg className="trend" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
        aria-label={`Daily completion over the last ${dates.length} days`}>
        <line x1="0" y1={H} x2={W} y2={H} stroke="var(--line)" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--line)" strokeWidth="0.3" strokeDasharray="1 1"
          vectorEffect="non-scaling-stroke" />
        {series.map((share, i) => {
          const h = Math.max(share > 0 ? 0.8 : 0.3, share * H)
          return (
            <rect
              key={dates[i]}
              x={i * (barW + gap)}
              y={H - h}
              width={barW}
              height={h}
              rx="0.6"
              fill={share > 0 ? 'var(--ink)' : 'var(--miss)'}
              opacity={share > 0 ? 0.35 + share * 0.65 : 1}
            >
              <title>{`${dates[i]}: ${Math.round(share * 100)}%`}</title>
            </rect>
          )
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
          {fromKey(dates[0]).getDate()} {monthName(fromKey(dates[0]).getMonth())}
        </span>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
          Today
        </span>
      </div>
    </>
  )
}

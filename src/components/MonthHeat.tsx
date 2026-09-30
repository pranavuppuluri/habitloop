import { fromKey, monthName, todayKey, WEEKDAY_SHORT } from '../lib/date'
import { dayState, monthGrid } from '../lib/stats'
import { HABIT_COLORS, type AppData, type Habit } from '../lib/types'
import { Left, Right } from './icons'

interface MonthHeatProps {
  data: AppData
  habit: Habit
  year: number
  month: number
  onShift: (delta: number) => void
  onPick?: (date: string) => void
}

export function MonthHeat({ data, habit, year, month, onShift, onPick }: MonthHeatProps) {
  const cells = monthGrid(year, month)
  const today = todayKey()
  const atCurrentMonth =
    year === fromKey(today).getFullYear() && month === fromKey(today).getMonth()

  return (
    <section className="panel" style={{ ['--habit' as string]: HABIT_COLORS[habit.color] }}>
      <div className="panel-head">
        <span className="panel-title">
          {monthName(month)} {year}
        </span>
        <div style={{ display: 'flex', gap: 2 }}>
          <button className="icon-btn" onClick={() => onShift(-1)} aria-label="Previous month">
            <Left />
          </button>
          <button className="icon-btn" onClick={() => onShift(1)} disabled={atCurrentMonth} aria-label="Next month">
            <Right />
          </button>
        </div>
      </div>

      <div className="cal">
        {WEEKDAY_SHORT.map((d, i) => (
          <span className="cal-dow" key={i}>
            {d}
          </span>
        ))}
        {cells.map((day, i) =>
          day === null ? (
            <span className="cal-cell is-blank" key={`blank-${i}`} />
          ) : (
            <button
              key={day}
              className={day === today ? 'cal-cell is-today' : 'cal-cell'}
              data-state={dayState(data, habit, day)}
              title={`${fromKey(day).getDate()} ${monthName(month)} — ${dayState(data, habit, day)}`}
              onClick={() => onPick?.(day)}
              disabled={!onPick}
            >
              <span className="sr-only">{day}</span>
            </button>
          ),
        )}
      </div>

      <div className="legend">
        <span>
          <i style={{ background: HABIT_COLORS[habit.color] }} /> Done
        </span>
        <span>
          <i style={{ background: `color-mix(in srgb, ${HABIT_COLORS[habit.color]} 42%, var(--surface-2))` }} /> Partial
        </span>
        <span>
          <i style={{ background: 'var(--miss)' }} /> Missed
        </span>
        <span>
          <i style={{ background: 'var(--surface-3)' }} /> Skipped
        </span>
        <span>
          <i style={{ boxShadow: 'inset 0 0 0 1px var(--line)' }} /> Not scheduled
        </span>
      </div>
    </section>
  )
}

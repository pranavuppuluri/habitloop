import { addDays, dayRange, fromKey, isFuture, todayKey, WEEKDAY_SHORT } from '../lib/date'
import { dayProgress } from '../lib/stats'
import type { AppData } from '../lib/types'
import { Left, Right } from './icons'

interface DateRailProps {
  data: AppData
  selected: string
  onSelect: (date: string) => void
}

const VISIBLE = 7

/**
 * Seven days ending at the selected one, each carrying a meter of that day's
 * completion. Future days are visible but not selectable - you can see what is
 * coming without pretending to check it off early.
 */
export function DateRail({ data, selected, onSelect }: DateRailProps) {
  const days = dayRange(selected, VISIBLE)
  const canGoForward = !isFuture(addDays(selected, 1))

  return (
    <nav className="rail" aria-label="Pick a day">
      <button className="rail-step" onClick={() => onSelect(addDays(selected, -VISIBLE))} aria-label="Previous week">
        <Left />
      </button>

      <div className="rail-days">
        {days.map((day) => {
          const d = fromKey(day)
          const { done, total } = dayProgress(data, day)
          const share = total === 0 ? 0 : done / total
          const future = isFuture(day)
          return (
            <button
              key={day}
              className="rail-day"
              aria-current={day === selected ? 'date' : undefined}
              disabled={future}
              onClick={() => onSelect(day)}
            >
              <span className="dow">{WEEKDAY_SHORT[d.getDay()]}</span>
              <span className="num">{d.getDate()}</span>
              <span className="rail-meter">
                <span style={{ width: `${share * 100}%` }} />
              </span>
              <span className="sr-only">
                {total === 0 ? 'nothing scheduled' : `${done} of ${total} done`}
              </span>
            </button>
          )
        })}
      </div>

      <button
        className="rail-step"
        onClick={() => onSelect(addDays(selected, VISIBLE))}
        disabled={!canGoForward}
        aria-label="Next week"
      >
        <Right />
      </button>

      {selected !== todayKey() && (
        <button className="rail-today" onClick={() => onSelect(todayKey())}>
          Today
        </button>
      )}
    </nav>
  )
}

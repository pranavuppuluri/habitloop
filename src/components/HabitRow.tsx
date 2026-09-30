import { dayRange, friendlyDate } from '../lib/date'
import { currentStreak, dayState, getEntry, valueOn } from '../lib/stats'
import { colorVar, type AppData, type Habit } from '../lib/types'
import { Dots } from './icons'
import { Tick } from './Tick'

interface HabitRowProps {
  habit: Habit
  data: AppData
  date: string
  onTick: () => void
  onOpen: () => void
}

const THREAD_DAYS = 12

export function HabitRow({ habit, data, date, onTick, onOpen }: HabitRowProps) {
  const value = valueOn(data, habit.id, date)
  const entry = getEntry(data, habit.id, date)
  const skipped = entry?.skipped ?? false
  const done = value >= habit.target
  const streak = currentStreak(data, habit)
  const color = colorVar(habit.color)
  const thread = dayRange(date, THREAD_DAYS)

  const classes = ['habit', done && !skipped ? 'is-done' : '', skipped ? 'is-skipped' : ''].filter(Boolean).join(' ')

  return (
    <article className={classes}>
      <Tick habit={habit} value={value} skipped={skipped} onClick={onTick} />

      <button className="habit-body" onClick={onOpen}>
        <span className="habit-name">
          {habit.icon} {habit.name}
        </span>
        <span className="habit-meta">
          {skipped ? (
            <span>Skipped</span>
          ) : habit.target > 1 ? (
            <span className="mono">
              {value}/{habit.target} {habit.unit}
            </span>
          ) : (
            <span>{done ? 'Done' : 'Not yet'}</span>
          )}
          {habit.reminder && (
            <>
              <span className="sep">&middot;</span>
              <span className="mono">{habit.reminder}</span>
            </>
          )}
          {entry?.note && (
            <>
              <span className="sep">&middot;</span>
              <span>note</span>
            </>
          )}
        </span>
      </button>

      <div
        className="thread"
        role="img"
        aria-label={`Last ${THREAD_DAYS} days ending ${friendlyDate(date)}`}
        title={`Last ${THREAD_DAYS} days`}
      >
        {thread.map((day) => {
          const state = dayState(data, habit, day)
          return (
            <i
              key={day}
              data-state={state}
              style={state === 'done' || state === 'partial' ? { background: color } : undefined}
            />
          )
        })}
      </div>

      <div className={streak > 0 ? 'streak' : 'streak is-zero'} title={`${streak}-day streak`}>
        {streak}
        <span>d</span>
      </div>

      <button className="row-more" onClick={onOpen} aria-label={`Open ${habit.name}`}>
        <Dots />
      </button>
    </article>
  )
}

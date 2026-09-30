import { useEffect, useState } from 'react'
import { friendlyDate, fromKey } from '../lib/date'
import { getEntry, habitStats } from '../lib/stats'
import { colorVar, type AppData, type Habit } from '../lib/types'
import { MonthHeat } from './MonthHeat'
import { Sheet } from './Sheet'
import { Pencil, Trash } from './icons'

interface HabitDetailProps {
  habit: Habit
  data: AppData
  date: string
  onSetValue: (value: number) => void
  onSkip: () => void
  onNote: (note: string) => void
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

export function HabitDetail({
  habit,
  data,
  date,
  onSetValue,
  onSkip,
  onNote,
  onEdit,
  onDelete,
  onClose,
}: HabitDetailProps) {
  const entry = getEntry(data, habit.id, date)
  const value = entry?.value ?? 0
  const skipped = entry?.skipped ?? false
  const stats = habitStats(data, habit)
  const color = colorVar(habit.color)

  const [note, setNote] = useState(entry?.note ?? '')
  const [cursor, setCursor] = useState(() => {
    const d = fromKey(date)
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  // The note field is free text; save it when focus leaves rather than per keystroke.
  useEffect(() => {
    setNote(entry?.note ?? '')
  }, [entry?.note, habit.id, date])

  function shiftMonth(delta: number) {
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  return (
    <Sheet
      title={`${habit.icon} ${habit.name}`}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn-danger" onClick={onDelete}>
            <Trash /> Delete
          </button>
          <span className="spacer" />
          <button className="btn btn-quiet" onClick={onEdit}>
            <Pencil /> Edit
          </button>
          <button className="btn" onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      <div className="field">
        <span className="field-label">{friendlyDate(date)}</span>
        <div className="row">
          <div className="stepper">
            <button onClick={() => onSetValue(Math.max(0, value - 1))} disabled={value === 0} aria-label="One fewer">
              &minus;
            </button>
            <span className="stepper-val">
              {value}
              <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>
                {' '}
                / {habit.target} {habit.unit}
              </span>
            </span>
            <button onClick={() => onSetValue(value + 1)} aria-label="One more">
              +
            </button>
          </div>
          <button
            className="btn btn-quiet"
            style={{ flex: '0 0 auto' }}
            onClick={onSkip}
            aria-pressed={skipped}
          >
            {skipped ? 'Un-skip day' : 'Skip day'}
          </button>
        </div>
        <p className="help">A skipped day keeps the streak alive without counting toward it.</p>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat-key">Streak</div>
          <div className="stat-val" style={{ color }}>
            {stats.streak}
            <small> days</small>
          </div>
        </div>
        <div className="stat">
          <div className="stat-key">Best run</div>
          <div className="stat-val">
            {stats.best}
            <small> days</small>
          </div>
        </div>
        <div className="stat">
          <div className="stat-key">Finished</div>
          <div className="stat-val">
            {Math.round(stats.rate * 100)}
            <small>%</small>
          </div>
        </div>
        <div className="stat">
          <div className="stat-key">Total {habit.unit}</div>
          <div className="stat-val">{stats.total}</div>
        </div>
      </div>

      <MonthHeat data={data} habit={habit} year={cursor.year} month={cursor.month} onShift={shiftMonth} />

      <div className="field" style={{ marginTop: 18, marginBottom: 0 }}>
        <label htmlFor="habit-note">Note for {friendlyDate(date).toLowerCase()}</label>
        <textarea
          id="habit-note"
          className="note-area"
          value={note}
          placeholder="What made it easy or hard today?"
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== (entry?.note ?? '') && onNote(note)}
        />
      </div>
    </Sheet>
  )
}

import { useState } from 'react'
import { WEEKDAY_SHORT } from '../lib/date'
import {
  COLOR_KEYS,
  COLOR_LABELS,
  HABIT_COLORS,
  TIMES_OF_DAY,
  type Area,
  type ColorKey,
  type Habit,
  type HabitDraft,
  type TimeOfDay,
} from '../lib/types'
import { Sheet } from './Sheet'

const ICONS = [
  '💧', '🏃', '📖', '🧘', '🥗', '💪', '😴', '🦷', '✍️', '🎸',
  '🧹', '💊', '☀️', '🚶', '🧴', '📵', '🙏', '🎯', '🌱', '💸',
  '🗣️', '🧠', '🍎', '🚭', '📝', '🎨', '🛏️', '☕', '🐕', '📞',
]

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]

interface HabitFormProps {
  habit: Habit | null
  areas: Area[]
  presetName?: string
  presetIcon?: string
  onSave: (draft: HabitDraft) => Promise<void>
  onClose: () => void
}

function initial(habit: Habit | null, presetName?: string, presetIcon?: string): HabitDraft {
  if (habit) {
    return {
      name: habit.name,
      icon: habit.icon,
      color: habit.color,
      target: habit.target,
      unit: habit.unit,
      timeOfDay: habit.timeOfDay,
      areaId: habit.areaId,
      days: habit.days,
      reminder: habit.reminder,
    }
  }
  return {
    name: presetName ?? '',
    icon: presetIcon ?? '🎯',
    color: COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)],
    target: 1,
    unit: 'times',
    timeOfDay: 'anytime',
    areaId: null,
    days: EVERY_DAY,
    reminder: null,
  }
}

export function HabitForm({ habit, areas, presetName, presetIcon, onSave, onClose }: HabitFormProps) {
  const [draft, setDraft] = useState<HabitDraft>(() => initial(habit, presetName, presetIcon))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof HabitDraft>(key: K, value: HabitDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const toggleDay = (day: number) => {
    const next = draft.days.includes(day) ? draft.days.filter((d) => d !== day) : [...draft.days, day].sort()
    set('days', next)
  }

  async function submit() {
    if (!draft.name.trim()) {
      setError('Give the habit a name.')
      return
    }
    if (draft.days.length === 0) {
      setError('Pick at least one day to do this on.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ ...draft, name: draft.name.trim(), target: Math.max(1, draft.target) })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the habit.')
      setSaving(false)
    }
  }

  return (
    <Sheet
      title={habit ? 'Edit habit' : 'New habit'}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : habit ? 'Save changes' : 'Add habit'}
          </button>
        </>
      }
    >
      {error && <p className="alert">{error}</p>}

      <div className="field">
        <label htmlFor="habit-name">Habit</label>
        <input
          id="habit-name"
          className="input"
          value={draft.name}
          placeholder="Drink water"
          onChange={(e) => set('name', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>

      <div className="field">
        <span className="field-label">Icon</span>
        <div className="icon-grid">
          {ICONS.map((icon) => (
            <button
              key={icon}
              className="icon-pick"
              aria-pressed={draft.icon === icon}
              onClick={() => set('icon', icon)}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">Colour</span>
        <div className="swatches">
          {COLOR_KEYS.map((key) => (
            <button
              key={key}
              className="swatch"
              style={{ background: HABIT_COLORS[key as ColorKey] }}
              aria-pressed={draft.color === key}
              aria-label={COLOR_LABELS[key]}
              onClick={() => set('color', key)}
            />
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">Counts as done at</span>
        <div className="row">
          <input
            className="input mono"
            type="number"
            min={1}
            max={999}
            value={draft.target}
            aria-label="Target amount"
            onChange={(e) => set('target', Number(e.target.value) || 1)}
          />
          <input
            className="input"
            value={draft.unit}
            aria-label="Unit"
            placeholder="glasses"
            onChange={(e) => set('unit', e.target.value)}
          />
        </div>
        <p className="help">
          {draft.target > 1
            ? `You will tap once per unit until ${draft.target} ${draft.unit || 'units'} are in.`
            : 'One tap finishes the day.'}
        </p>
      </div>

      <div className="field">
        <span className="field-label">Days</span>
        <div className="day-toggles">
          {WEEKDAY_SHORT.map((label, day) => (
            <button
              key={day}
              className="day-toggle"
              aria-pressed={draft.days.includes(day)}
              aria-label={`Day ${day}`}
              onClick={() => toggleDay(day)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">Time of day</span>
        <div className="chips">
          {TIMES_OF_DAY.map((t) => (
            <button
              key={t.key}
              className="chip"
              aria-pressed={draft.timeOfDay === t.key}
              onClick={() => set('timeOfDay', t.key as TimeOfDay)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="row">
        <div className="field">
          <label htmlFor="habit-reminder">Reminder</label>
          <input
            id="habit-reminder"
            className="input mono"
            type="time"
            value={draft.reminder ?? ''}
            onChange={(e) => set('reminder', e.target.value || null)}
          />
        </div>
        <div className="field">
          <label htmlFor="habit-area">Area</label>
          <select
            id="habit-area"
            className="input"
            value={draft.areaId ?? ''}
            onChange={(e) => set('areaId', e.target.value || null)}
          >
            <option value="">No area</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {draft.reminder && (
        <p className="help" style={{ marginTop: -6 }}>
          Reminders arrive while HabitNow is open, including in a background tab or
          the installed app. They cannot reach you once it is fully closed — that needs
          a server to send them.
        </p>
      )}
      {areas.length === 0 && (
        <p className="help" style={{ marginTop: -6 }}>
          Areas are created on the Areas screen in the sidebar.
        </p>
      )}
    </Sheet>
  )
}

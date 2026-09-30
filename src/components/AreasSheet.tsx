import { useState } from 'react'
import type { Area, Habit } from '../lib/types'
import { Sheet } from './Sheet'
import { Plus, Trash } from './icons'

interface AreasSheetProps {
  areas: Area[]
  habits: Habit[]
  onCreate: (name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}

/**
 * Areas group habits into parts of a life - Health, Work, Home. The habit form
 * could already point at one, but nothing could create one, so the dropdown was
 * permanently empty. This is the missing half.
 */
export function AreasSheet({ areas, habits, onCreate, onDelete, onClose }: AreasSheetProps) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function create() {
    const trimmed = name.trim()
    if (!trimmed) return
    if (areas.some((a) => a.name.toLowerCase() === trimmed.toLowerCase())) {
      setError('There is already an area with that name.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onCreate(trimmed)
      setName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the area.')
    }
    setBusy(false)
  }

  async function remove(area: Area) {
    const count = habits.filter((h) => h.areaId === area.id).length
    const message = count
      ? `Delete "${area.name}"? Its ${count} habit${count === 1 ? '' : 's'} stay, but lose the grouping.`
      : `Delete "${area.name}"?`
    if (!confirm(message)) return
    await onDelete(area.id)
  }

  return (
    <Sheet
      title="Areas"
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>
            Done
          </button>
        </>
      }
    >
      {error && <p className="alert">{error}</p>}

      <div className="field">
        <label htmlFor="area-name">New area</label>
        <div className="row">
          <input
            id="area-name"
            className="input"
            value={name}
            placeholder="Health"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <button
            className="btn"
            style={{ flex: '0 0 auto' }}
            onClick={create}
            disabled={busy || !name.trim()}
          >
            <Plus size={16} /> Add
          </button>
        </div>
        <p className="help">Group habits into parts of your life, then filter the list by one.</p>
      </div>

      {areas.length === 0 ? (
        <p className="help" style={{ marginTop: 18 }}>
          No areas yet. Habits work fine without them.
        </p>
      ) : (
        <div className="card-list" style={{ marginTop: 18 }}>
          {areas.map((area) => {
            const count = habits.filter((h) => h.areaId === area.id && !h.archived).length
            return (
              <div className="habit" key={area.id}>
                <span className="habit-body">
                  <span className="habit-name">{area.name}</span>
                  <span className="habit-meta">
                    <span className="mono">
                      {count} habit{count === 1 ? '' : 's'}
                    </span>
                  </span>
                </span>
                <button
                  className="row-more"
                  onClick={() => remove(area)}
                  aria-label={`Delete ${area.name}`}
                  title={`Delete ${area.name}`}
                >
                  <Trash />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </Sheet>
  )
}

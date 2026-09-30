import { useCallback, useEffect, useMemo, useState } from 'react'
import { backend, cloudConfigured } from './backend'
import { currentBucket, friendlyDate, todayKey } from './lib/date'
import { dayProgress, getEntry, habitsOn, valueOn } from './lib/stats'
import {
  EMPTY_DATA,
  HABIT_COLORS,
  TIMES_OF_DAY,
  type AppData,
  type Habit,
  type HabitDraft,
  type User,
} from './lib/types'
import { Auth } from './components/Auth'
import { DateRail } from './components/DateRail'
import { HabitDetail } from './components/HabitDetail'
import { HabitForm } from './components/HabitForm'
import { HabitRow } from './components/HabitRow'
import { Progress } from './components/Progress'
import { Archive, Chart, Exit, Logo, Moon, Plus, Sun, Today } from './components/icons'

type View = 'today' | 'progress' | 'archive'
type Theme = 'light' | 'dark'

const STARTERS = [
  { icon: '💧', name: 'Drink water', target: 8, unit: 'glasses', timeOfDay: 'anytime' as const },
  { icon: '🏃', name: 'Move for 30 minutes', target: 1, unit: 'times', timeOfDay: 'morning' as const },
  { icon: '📖', name: 'Read', target: 10, unit: 'pages', timeOfDay: 'evening' as const },
  { icon: '🧘', name: 'Meditate', target: 1, unit: 'times', timeOfDay: 'morning' as const },
  { icon: '😴', name: 'Lights out by 11', target: 1, unit: 'times', timeOfDay: 'evening' as const },
  { icon: '📵', name: 'No phone at dinner', target: 1, unit: 'times', timeOfDay: 'evening' as const },
]

function readTheme(): Theme {
  const saved = localStorage.getItem('habitloop.theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

interface Toast {
  message: string
  undo?: () => void
}

export default function App() {
  const [booting, setBooting] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [data, setData] = useState<AppData>(EMPTY_DATA)
  const [view, setView] = useState<View>('today')
  const [date, setDate] = useState(todayKey())
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [toast, setToast] = useState<Toast | null>(null)

  const [formFor, setFormFor] = useState<{ habit: Habit | null; preset?: (typeof STARTERS)[number] } | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('habitloop.theme', theme)
  }, [theme])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  const refresh = useCallback(async (u: User) => {
    try {
      setData(await backend.load(u))
      setLoadError('')
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load your habits.')
    }
  }, [])

  // Restore the session on first paint so a reload doesn't bounce to sign-in.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const existing = await backend.currentUser().catch(() => null)
      if (cancelled) return
      if (existing) {
        setUser(existing)
        await refresh(existing)
      }
      setBooting(false)
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

  async function signedIn(u: User) {
    setUser(u)
    await refresh(u)
  }

  async function signOut() {
    await backend.signOut()
    setUser(null)
    setData(EMPTY_DATA)
    setView('today')
  }

  const mutate = useCallback(
    async (job: (u: User) => Promise<void>) => {
      if (!user) return
      try {
        await job(user)
        await refresh(user)
      } catch (e) {
        setToast({ message: e instanceof Error ? e.message : 'That did not save.' })
      }
    },
    [user, refresh],
  )

  /** One tap: adds a unit, or clears the day once the target is met. */
  const tick = useCallback(
    (habit: Habit) => {
      const before = valueOn(data, habit.id, date)
      const skipped = getEntry(data, habit.id, date)?.skipped ?? false
      const next = skipped ? 1 : before >= habit.target ? 0 : before + 1

      mutate((u) => backend.setEntry(u, habit.id, date, { value: next, skipped: false }))

      if (next >= habit.target && before < habit.target) {
        setToast({
          message: `${habit.name} done for ${friendlyDate(date).toLowerCase()}`,
          undo: () => {
            mutate((u) => backend.setEntry(u, habit.id, date, { value: before, skipped }))
            setToast(null)
          },
        })
      }
    },
    [data, date, mutate],
  )

  const active = useMemo(() => data.habits.filter((h) => !h.archived), [data.habits])
  const archived = useMemo(() => data.habits.filter((h) => h.archived), [data.habits])
  const scheduled = useMemo(() => habitsOn(data, date), [data, date])
  const progress = dayProgress(data, date)
  const detail = detailId ? data.habits.find((h) => h.id === detailId) ?? null : null
  const bucket = currentBucket()

  if (booting) {
    return <div className="booting">Loading…</div>
  }

  if (!user) {
    return <Auth onSignedIn={signedIn} />
  }

  async function saveHabit(draft: HabitDraft) {
    const editing = formFor?.habit
    if (editing) {
      await mutate((u) => backend.updateHabit(u, editing.id, draft))
    } else {
      const position = data.habits.length
      await mutate((u) => backend.createHabit(u, draft, position).then(() => undefined))
    }
    setFormFor(null)
  }

  async function addStarter(starter: (typeof STARTERS)[number]) {
    const colors = Object.keys(HABIT_COLORS) as (keyof typeof HABIT_COLORS)[]
    await mutate((u) =>
      backend
        .createHabit(
          u,
          {
            name: starter.name,
            icon: starter.icon,
            color: colors[data.habits.length % colors.length],
            target: starter.target,
            unit: starter.unit,
            timeOfDay: starter.timeOfDay,
            areaId: null,
            days: [0, 1, 2, 3, 4, 5, 6],
            reminder: null,
          },
          data.habits.length,
        )
        .then(() => undefined),
    )
  }

  async function deleteHabit(habit: Habit) {
    if (!confirm(`Delete "${habit.name}" and all of its check-ins? This cannot be undone.`)) return
    setDetailId(null)
    await mutate((u) => backend.deleteHabit(u, habit.id))
    setToast({ message: `${habit.name} deleted` })
  }

  const initials = (user.name || user.email).slice(0, 1).toUpperCase()

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <Logo size={24} />
          <span className="brand-name">Habitloop</span>
        </div>

        <button className="nav-item" aria-current={view === 'today'} onClick={() => setView('today')}>
          <Today /> Today
          <span className="count">
            {progress.done}/{progress.total}
          </span>
        </button>
        <button className="nav-item" aria-current={view === 'progress'} onClick={() => setView('progress')}>
          <Chart /> Progress
        </button>
        {archived.length > 0 && (
          <button className="nav-item" aria-current={view === 'archive'} onClick={() => setView('archive')}>
            <Archive /> Archive
            <span className="count">{archived.length}</span>
          </button>
        )}

        {active.length > 0 && (
          <>
            <div className="nav-label">Habits</div>
            {active.map((habit) => (
              <button
                key={habit.id}
                className="nav-item"
                onClick={() => {
                  setView('today')
                  setDetailId(habit.id)
                }}
              >
                <span className="nav-dot" style={{ background: HABIT_COLORS[habit.color] }} />
                {habit.name}
              </button>
            ))}
          </>
        )}

        <div className="sidebar-foot">
          <button
            className="nav-item"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? <Sun /> : <Moon />} {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button className="nav-item" onClick={signOut}>
            <Exit /> Sign out
          </button>
          <div className="who">
            <span className="avatar">{initials}</span>
            <span className="who-text">
              <span className="who-name">{user.name || user.email}</span>
              <span className="who-mode">{cloudConfigured ? 'synced' : 'this device'}</span>
            </span>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="main-inner">
          {loadError && <p className="alert">{loadError}</p>}

          {view === 'today' && (
            <>
              <header className="page-head">
                <div>
                  <h1>{friendlyDate(date)}</h1>
                  <p className="page-sub">
                    {progress.total === 0
                      ? 'Nothing scheduled for this day.'
                      : `${progress.done} of ${progress.total} finished.`}
                  </p>
                </div>
                <button className="btn btn-quiet" onClick={() => setFormFor({ habit: null })}>
                  <Plus size={16} /> New habit
                </button>
              </header>

              <DateRail data={data} selected={date} onSelect={setDate} />

              {active.length === 0 ? (
                <div className="empty">
                  <h2>Pick your first habit</h2>
                  <p>Start with one or two. Tap a suggestion to add it, or build your own.</p>
                  <div className="starter-grid">
                    {STARTERS.map((s) => (
                      <button key={s.name} className="starter" onClick={() => addStarter(s)}>
                        <span aria-hidden="true">{s.icon}</span> {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : scheduled.length === 0 ? (
                <div className="empty">
                  <h2>A clear day</h2>
                  <p>None of your habits are scheduled for this weekday. Enjoy it, or add one.</p>
                  <button className="btn btn-quiet" onClick={() => setFormFor({ habit: null })}>
                    <Plus size={16} /> New habit
                  </button>
                </div>
              ) : (
                <>
                  {progress.total > 0 && (
                    <div className="summary">
                      <span className="summary-figure">
                        {progress.done}
                        <small>/{progress.total}</small>
                      </span>
                      <span className="summary-text">
                        <span className="summary-label">
                          {progress.done === progress.total
                            ? 'Every habit checked off'
                            : progress.done === 0
                              ? 'Nothing checked off yet'
                              : `${progress.total - progress.done} to go`}
                        </span>
                        <br />
                        <span className="summary-hint">
                          {progress.done === progress.total
                            ? 'Come back tomorrow and keep the run going.'
                            : 'Tap a ring to check one off.'}
                        </span>
                      </span>
                    </div>
                  )}

                  {TIMES_OF_DAY.map((slot) => {
                    const inSlot = scheduled.filter((h) => h.timeOfDay === slot.key)
                    if (inSlot.length === 0) return null
                    const doneInSlot = inSlot.filter(
                      (h) =>
                        valueOn(data, h.id, date) >= h.target ||
                        getEntry(data, h.id, date)?.skipped,
                    ).length
                    return (
                      <section
                        className={slot.key === bucket ? 'group is-now' : 'group'}
                        key={slot.key}
                      >
                        <div className="group-head">
                          <span className="group-title">{slot.label}</span>
                          <span className="group-rule" />
                          <span className="group-count">
                            {doneInSlot}/{inSlot.length}
                          </span>
                        </div>
                        <div className="card-list">
                          {inSlot.map((habit) => (
                            <HabitRow
                              key={habit.id}
                              habit={habit}
                              data={data}
                              date={date}
                              onTick={() => tick(habit)}
                              onOpen={() => setDetailId(habit.id)}
                            />
                          ))}
                        </div>
                      </section>
                    )
                  })}
                </>
              )}
            </>
          )}

          {view === 'progress' && (
            <>
              <header className="page-head">
                <div>
                  <h1>Progress</h1>
                  <p className="page-sub">How every habit has held up so far.</p>
                </div>
              </header>
              <Progress data={data} />
            </>
          )}

          {view === 'archive' && (
            <>
              <header className="page-head">
                <div>
                  <h1>Archive</h1>
                  <p className="page-sub">Paused habits keep their history. Restore one any time.</p>
                </div>
              </header>
              <div className="card-list">
                {archived.map((habit) => (
                  <article className="habit" key={habit.id}>
                    <span className="nav-dot" style={{ background: HABIT_COLORS[habit.color], marginLeft: 12 }} />
                    <span className="habit-body">
                      <span className="habit-name">
                        {habit.icon} {habit.name}
                      </span>
                    </span>
                    <button
                      className="btn btn-quiet"
                      onClick={() => mutate((u) => backend.updateHabit(u, habit.id, { archived: false }))}
                    >
                      Restore
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <button className="fab" onClick={() => setFormFor({ habit: null })} aria-label="New habit">
        <Plus />
      </button>

      {formFor && (
        <HabitForm
          habit={formFor.habit}
          areas={data.areas}
          presetName={formFor.preset?.name}
          presetIcon={formFor.preset?.icon}
          onSave={saveHabit}
          onClose={() => setFormFor(null)}
        />
      )}

      {detail && (
        <HabitDetail
          habit={detail}
          data={data}
          date={date}
          onSetValue={(value) => mutate((u) => backend.setEntry(u, detail.id, date, { value, skipped: false }))}
          onSkip={() => {
            const skipped = getEntry(data, detail.id, date)?.skipped ?? false
            mutate((u) => backend.setEntry(u, detail.id, date, { skipped: !skipped, value: 0 }))
          }}
          onNote={(note) => mutate((u) => backend.setEntry(u, detail.id, date, { note }))}
          onEdit={() => {
            setDetailId(null)
            setFormFor({ habit: detail })
          }}
          onDelete={() => deleteHabit(detail)}
          onClose={() => setDetailId(null)}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          <span>{toast.message}</span>
          {toast.undo && <button onClick={toast.undo}>Undo</button>}
        </div>
      )}
    </div>
  )
}

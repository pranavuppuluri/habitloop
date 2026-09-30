import type { AppData, Entry, Habit } from './types'
import { addDays, diffDays, isFuture, toKey, todayKey, weekdayOf } from './date'

export function entryKey(habitId: string, date: string): string {
  return `${habitId}:${date}`
}

export function getEntry(data: AppData, habitId: string, date: string): Entry | undefined {
  return data.entries[entryKey(habitId, date)]
}

export function valueOn(data: AppData, habitId: string, date: string): number {
  return data.entries[entryKey(habitId, date)]?.value ?? 0
}

export function isScheduled(habit: Habit, date: string): boolean {
  return habit.days.includes(weekdayOf(date))
}

export type DayState = 'done' | 'partial' | 'missed' | 'skipped' | 'off' | 'upcoming'

export function dayState(data: AppData, habit: Habit, date: string): DayState {
  if (!isScheduled(habit, date)) return 'off'
  const entry = getEntry(data, habit.id, date)
  if (entry?.skipped) return 'skipped'
  const value = entry?.value ?? 0
  if (value >= habit.target) return 'done'
  if (isFuture(date) || date === todayKey()) return value > 0 ? 'partial' : 'upcoming'
  if (date < habit.createdAt.slice(0, 10)) return 'off'
  return value > 0 ? 'partial' : 'missed'
}

/** Consecutive scheduled days finished, counting back from today. Skips are neutral. */
export function currentStreak(data: AppData, habit: Habit): number {
  let streak = 0
  let cursor = todayKey()
  const floor = habit.createdAt.slice(0, 10)

  // An unfinished today doesn't break a streak that is still alive from yesterday.
  if (isScheduled(habit, cursor)) {
    const state = dayState(data, habit, cursor)
    if (state === 'done') streak = 1
  }
  cursor = addDays(cursor, -1)

  while (cursor >= floor) {
    if (isScheduled(habit, cursor)) {
      const state = dayState(data, habit, cursor)
      if (state === 'done') streak++
      else if (state !== 'skipped') break
    }
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function bestStreak(data: AppData, habit: Habit): number {
  let best = 0
  let run = 0
  let cursor = habit.createdAt.slice(0, 10)
  const end = todayKey()
  while (cursor <= end) {
    if (isScheduled(habit, cursor)) {
      const state = dayState(data, habit, cursor)
      if (state === 'done') {
        run++
        best = Math.max(best, run)
      } else if (state !== 'skipped' && state !== 'upcoming') {
        run = 0
      }
    }
    cursor = addDays(cursor, 1)
  }
  return Math.max(best, run)
}

export interface HabitStats {
  streak: number
  best: number
  /** Finished scheduled days as a share of scheduled days so far, 0–1. */
  rate: number
  doneDays: number
  scheduledDays: number
  total: number
}

export function habitStats(data: AppData, habit: Habit): HabitStats {
  let doneDays = 0
  let scheduledDays = 0
  let total = 0
  let cursor = habit.createdAt.slice(0, 10)
  const end = todayKey()
  while (cursor <= end) {
    const entry = getEntry(data, habit.id, cursor)
    total += entry?.value ?? 0
    if (isScheduled(habit, cursor) && !entry?.skipped) {
      scheduledDays++
      if ((entry?.value ?? 0) >= habit.target) doneDays++
    }
    cursor = addDays(cursor, 1)
  }
  return {
    streak: currentStreak(data, habit),
    best: bestStreak(data, habit),
    rate: scheduledDays === 0 ? 0 : doneDays / scheduledDays,
    doneDays,
    scheduledDays,
    total,
  }
}

/** Habits scheduled on `date`, in display order. */
export function habitsOn(data: AppData, date: string): Habit[] {
  return data.habits
    .filter((h) => !h.archived && isScheduled(h, date) && h.createdAt.slice(0, 10) <= date)
    .sort((a, b) => a.position - b.position)
}

export function dayProgress(data: AppData, date: string): { done: number; total: number } {
  const habits = habitsOn(data, date)
  const active = habits.filter((h) => !getEntry(data, h.id, date)?.skipped)
  const done = active.filter((h) => valueOn(data, h.id, date) >= h.target).length
  return { done, total: active.length }
}

/** Per-day completion share across all habits, for the trend chart. */
export function completionSeries(data: AppData, dates: string[]): number[] {
  return dates.map((date) => {
    const { done, total } = dayProgress(data, date)
    return total === 0 ? 0 : done / total
  })
}

/** Calendar grid for a month: leading blanks, then every day key. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1)
  const lead = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = Array(lead).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(toKey(new Date(year, month, d)))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function daysSince(dateKey: string): number {
  return Math.max(0, diffDays(todayKey(), dateKey))
}

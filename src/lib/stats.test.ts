/**
 * Streak maths, checked against hand-worked cases.
 * Run with: npm test
 */

import { expect, test } from 'vitest'
import { addDays, todayKey } from './date'
import { bestStreak, currentStreak, dayProgress, habitStats } from './stats'
import type { AppData, Entry, Habit } from './types'

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Test',
    icon: '🎯',
    color: 'indigo',
    target: 1,
    unit: 'times',
    timeOfDay: 'anytime',
    areaId: null,
    days: EVERY_DAY,
    reminder: null,
    archived: false,
    position: 0,
    createdAt: `${addDays(todayKey(), -120)}T00:00:00.000Z`,
    ...over,
  }
}

/** `marks` maps an offset from today (0 = today, -1 = yesterday) to a day's state. */
function build(h: Habit, marks: Record<number, number | 'skip'>): AppData {
  const entries: Record<string, Entry> = {}
  for (const [offset, mark] of Object.entries(marks)) {
    const date = addDays(todayKey(), Number(offset))
    const id = `${h.id}:${date}`
    entries[id] = {
      id,
      habitId: h.id,
      date,
      value: mark === 'skip' ? 0 : mark,
      skipped: mark === 'skip',
      note: '',
    }
  }
  return { habits: [h], areas: [], entries }
}

test('an unchecked today does not break a run that is alive from yesterday', () => {
  const h = habit()
  const data = build(h, { [-1]: 1, [-2]: 1, [-3]: 1 })
  expect(currentStreak(data, h)).toBe(3)
})

test('checking today extends the run', () => {
  const h = habit()
  const data = build(h, { 0: 1, [-1]: 1, [-2]: 1 })
  expect(currentStreak(data, h)).toBe(3)
})

test('a missed day ends the run', () => {
  const h = habit()
  const data = build(h, { 0: 1, [-1]: 1, [-3]: 1, [-4]: 1 })
  expect(currentStreak(data, h)).toBe(2)
})

test('a skipped day bridges the run without counting toward it', () => {
  const h = habit()
  const data = build(h, { [-1]: 1, [-2]: 'skip', [-3]: 1, [-4]: 1 })
  expect(currentStreak(data, h)).toBe(3)
})

test('a counted habit only finishes the day at its target', () => {
  const h = habit({ target: 8, unit: 'glasses' })
  expect(currentStreak(build(h, { [-1]: 7 }), h)).toBe(0)
  expect(currentStreak(build(h, { [-1]: 8 }), h)).toBe(1)
  expect(currentStreak(build(h, { [-1]: 9 }), h)).toBe(1)
})

test('unscheduled weekdays are stepped over, not counted as misses', () => {
  // Scheduled only on the weekday that today falls on: one day per week.
  const weekday = new Date().getDay()
  const h = habit({ days: [weekday] })
  const data = build(h, { [-7]: 1, [-14]: 1, [-21]: 1 })
  expect(currentStreak(data, h)).toBe(3)
})

test('best run reports the longest historical stretch, not the current one', () => {
  const h = habit()
  const data = build(h, {
    [-1]: 1,
    [-2]: 1,
    [-6]: 1,
    [-7]: 1,
    [-8]: 1,
    [-9]: 1,
    [-10]: 1,
  })
  expect(currentStreak(data, h)).toBe(2)
  expect(bestStreak(data, h)).toBe(5)
})

test('a run still going today counts toward best', () => {
  const h = habit()
  const data = build(h, { 0: 1, [-1]: 1, [-2]: 1, [-3]: 1 })
  expect(bestStreak(data, h)).toBe(4)
})

test('completion rate excludes skipped days from the denominator', () => {
  const h = habit({ createdAt: `${addDays(todayKey(), -3)}T00:00:00.000Z` })
  // 4 scheduled days (-3..0); one skipped, two done, one missed -> 2 of 3.
  const data = build(h, { [-3]: 1, [-2]: 1, [-1]: 'skip', 0: 0 })
  const stats = habitStats(data, h)
  expect(stats.scheduledDays).toBe(3)
  expect(stats.doneDays).toBe(2)
  expect(Math.round(stats.rate * 100)).toBe(67)
})

test('totals sum every unit logged, finished days or not', () => {
  const h = habit({ target: 8, createdAt: `${addDays(todayKey(), -2)}T00:00:00.000Z` })
  const data = build(h, { [-2]: 8, [-1]: 3, 0: 1 })
  expect(habitStats(data, h).total).toBe(12)
})

test('a habit created today has no history behind it', () => {
  const h = habit({ createdAt: `${todayKey()}T09:00:00.000Z` })
  const data = build(h, {})
  expect(currentStreak(data, h)).toBe(0)
  expect(habitStats(data, h).scheduledDays).toBe(1)
})

test('day progress counts only scheduled, unskipped habits', () => {
  const weekday = new Date().getDay()
  const a = habit({ id: 'a' })
  const b = habit({ id: 'b' })
  const c = habit({ id: 'c', days: [(weekday + 3) % 7] })
  const today = todayKey()
  const data: AppData = {
    habits: [a, b, c],
    areas: [],
    entries: {
      [`a:${today}`]: { id: `a:${today}`, habitId: 'a', date: today, value: 1, skipped: false, note: '' },
      [`b:${today}`]: { id: `b:${today}`, habitId: 'b', date: today, value: 0, skipped: true, note: '' },
    },
  }
  // c is not scheduled today and b is skipped, so the day is 1 of 1.
  expect(dayProgress(data, today)).toEqual({ done: 1, total: 1 })
})

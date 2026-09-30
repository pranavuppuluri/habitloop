export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime'

export const TIMES_OF_DAY: { key: TimeOfDay; label: string; hint: string }[] = [
  { key: 'morning', label: 'Morning', hint: 'Before noon' },
  { key: 'afternoon', label: 'Afternoon', hint: 'Noon to 6pm' },
  { key: 'evening', label: 'Evening', hint: 'After 6pm' },
  { key: 'anytime', label: 'Any time', hint: 'Whenever it fits' },
]

/** Chrome stays monochrome; all colour in the app comes from the user's habits. */
export const HABIT_COLORS = {
  indigo: '#5B6CFF',
  teal: '#0E9E9E',
  lime: '#69A833',
  amber: '#D9922B',
  clay: '#C4704E',
  rose: '#DD5C77',
  violet: '#8E5FE0',
  sky: '#3390DB',
} as const

export type ColorKey = keyof typeof HABIT_COLORS
export const COLOR_KEYS = Object.keys(HABIT_COLORS) as ColorKey[]

export interface Habit {
  id: string
  name: string
  icon: string
  color: ColorKey
  /** How many units count as a finished day. 1 for a plain yes/no habit. */
  target: number
  /** Plural noun for the unit, e.g. "times", "glasses", "pages". */
  unit: string
  timeOfDay: TimeOfDay
  areaId: string | null
  /** Weekdays the habit is scheduled on. 0 = Sunday. */
  days: number[]
  /** "HH:MM" local time, or null for no reminder. */
  reminder: string | null
  archived: boolean
  position: number
  createdAt: string
}

export interface Area {
  id: string
  name: string
  position: number
}

export interface Entry {
  /** `${habitId}:${date}` */
  id: string
  habitId: string
  /** Local calendar date, YYYY-MM-DD. */
  date: string
  value: number
  skipped: boolean
  note: string
}

export interface HabitDraft {
  name: string
  icon: string
  color: ColorKey
  target: number
  unit: string
  timeOfDay: TimeOfDay
  areaId: string | null
  days: number[]
  reminder: string | null
}

export interface AppData {
  habits: Habit[]
  areas: Area[]
  entries: Record<string, Entry>
}

export interface User {
  id: string
  email: string
  name: string
}

export const EMPTY_DATA: AppData = { habits: [], areas: [], entries: {} }

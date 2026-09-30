/** All dates are handled as local-calendar YYYY-MM-DD strings, never UTC instants. */

export function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): string {
  return toKey(new Date())
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

export function weekdayOf(key: string): number {
  return fromKey(key).getDay()
}

export function diffDays(a: string, b: string): number {
  const ms = fromKey(a).getTime() - fromKey(b).getTime()
  return Math.round(ms / 86400000)
}

export const WEEKDAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
export const WEEKDAY_NAME = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAME = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function monthName(monthIndex: number): string {
  return MONTH_NAME[monthIndex]
}

/** "Today", "Yesterday", or "Wed, 12 Mar". */
export function friendlyDate(key: string): string {
  const delta = diffDays(key, todayKey())
  if (delta === 0) return 'Today'
  if (delta === -1) return 'Yesterday'
  if (delta === 1) return 'Tomorrow'
  const d = fromKey(key)
  return `${WEEKDAY_NAME[d.getDay()]}, ${d.getDate()} ${MONTH_NAME[d.getMonth()]}`
}

export function isFuture(key: string): boolean {
  return diffDays(key, todayKey()) > 0
}

/** The N days ending at `end`, oldest first. */
export function dayRange(end: string, n: number): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i))
  return out
}

/** Time-of-day bucket the current hour falls into. */
export function currentBucket(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

/**
 * The habit palette.
 *
 * Five colours, not the eight this app started with. That is a deliberate
 * reduction, and `scripts/pick-palette.mjs` has the search that forced it: the
 * original eight failed all-pairs separation badly (rose vs clay sat at ΔE 9.0
 * for normal vision, amber vs lime at ΔE 1.4 under protanopia - two swatches that
 * looked the same to everyone, and two more that were identical to a red-green
 * colourblind reader).
 *
 * Any two habits can sit side by side in a list, so every pair has to hold up,
 * not just neighbours in a fixed series order. Under that test:
 *
 *   n=8, n=7, n=6  cannot reach the ΔE 6 colourblind floor at all
 *   n=5            normal-vision ΔE 18.3, colourblind ΔE 6.0
 *
 * ΔE 6-8 is a floor that is only legal alongside a second, non-colour channel.
 * This app has one everywhere by construction: a habit's colour never appears
 * without its name and emoji beside it, in the sidebar, the table, the calendar
 * heading and the detail sheet. No view asks anyone to identify a habit by colour
 * alone, so the colour is always confirmation rather than the sole signal.
 *
 * Values live in CSS so the theme switch picks the right step for each surface -
 * dark is its own validated set, not an automatic flip of the light one.
 */

export const HABIT_COLORS = {
  orange: 'var(--habit-orange)',
  green: 'var(--habit-green)',
  cyan: 'var(--habit-cyan)',
  indigo: 'var(--habit-indigo)',
  pink: 'var(--habit-pink)',
} as const

export type ColorKey = keyof typeof HABIT_COLORS

export const COLOR_KEYS = Object.keys(HABIT_COLORS) as ColorKey[]

export const COLOR_LABELS: Record<ColorKey, string> = {
  orange: 'Orange',
  green: 'Green',
  cyan: 'Cyan',
  indigo: 'Indigo',
  pink: 'Pink',
}

/**
 * Ink that reads on top of each habit colour, picked by measured contrast rather
 * than assumed. A white tick on orange is only 3.34:1; the dark ink is 5.31:1.
 */
export const HABIT_INKS: Record<ColorKey, string> = {
  orange: 'var(--habit-orange-ink)',
  green: 'var(--habit-green-ink)',
  cyan: 'var(--habit-cyan-ink)',
  indigo: 'var(--habit-indigo-ink)',
  pink: 'var(--habit-pink-ink)',
}

/** Colours that existed before the palette was cut to five. */
const LEGACY: Record<string, ColorKey> = {
  indigo: 'indigo',
  violet: 'indigo',
  blue: 'indigo',
  sky: 'cyan',
  teal: 'cyan',
  aqua: 'cyan',
  lime: 'green',
  moss: 'green',
  amber: 'orange',
  gold: 'orange',
  clay: 'orange',
  red: 'orange',
  rose: 'pink',
  magenta: 'pink',
}

/** Normalises whatever is stored - including the retired keys - to a live one. */
export function colorKey(raw: string | null | undefined): ColorKey {
  if (raw && raw in HABIT_COLORS) return raw as ColorKey
  if (raw && raw in LEGACY) return LEGACY[raw]
  return 'indigo'
}

/** The habit's colour, as a value usable in `style` or an SVG paint attribute. */
export function colorVar(raw: string | null | undefined): string {
  return HABIT_COLORS[colorKey(raw)]
}

/** Ink that stays legible on top of that colour. */
export function inkVar(raw: string | null | undefined): string {
  return HABIT_INKS[colorKey(raw)]
}

/** A colour for a habit that has none yet, spread across the palette. */
export function nextColor(index: number): ColorKey {
  return COLOR_KEYS[index % COLOR_KEYS.length]
}

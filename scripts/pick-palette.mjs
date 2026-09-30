/**
 * Chooses the habit palette.
 *
 * Four passes got here, and each one taught something worth keeping:
 *
 *  1. The 8 hand-picked colours the app shipped with FAIL all-pairs separation:
 *     rose vs clay sat at ΔE 9.0 for normal vision, indigo vs violet at 8.9.
 *  2. Pure max-min search passes, but spends the spread on two blues and a brown.
 *  3. Muting the set for looks drops separation to ~7 - looks and separation pull
 *     against each other, so one of them has to be a constraint, not a goal.
 *  4. Deriving the dark palette from the chosen light one FAILS: the dark band is
 *     narrower, so hues that were distinct on white collapse on the dark surface.
 *     Both modes have to be chosen together.
 *
 * So the decision variable is a set of HUES. Each hue contributes one light step
 * and one dark step, and a hue set is only admissible when both resulting
 * palettes clear their checks against the app's real surfaces.
 *
 * Two checks are treated differently, because they mean different things here:
 *   - Normal-vision floor (ΔE >= 15) is HARD. Two swatches that look identical in
 *     the picker is a plain defect, and the skill says secondary encoding does not
 *     excuse this one.
 *   - CVD separation in the 6-8 band is legal WITH secondary encoding, which this
 *     app has by construction: a habit colour never appears without the habit's
 *     name and emoji beside it. No view asks anyone to identify a habit by colour
 *     alone.
 *
 * Run: node scripts/pick-palette.mjs
 */
import { validate } from '../../AppData/Local/Temp/claude/bundled-skills/2.1.252/eb96976f3a671e10a1d86966dbd0128a/dataviz/scripts/validate_palette.js'

const LIGHT_SURFACE = '#ffffff'
const DARK_SURFACE = '#171a21'
const NORMAL_FLOOR = 15
const MIN_HUE_GAP = 26
const SIZES = [6, 5]

const s2lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const lin2s = (c) => {
  c = Math.max(0, Math.min(1, c))
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
}

function oklabFromLin([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function linFromOklab(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

const linOf = (hex) => [1, 3, 5].map((i) => s2lin(parseInt(hex.slice(i, i + 2), 16) / 255))
const oklchOf = (hex) => {
  const [L, a, b] = oklabFromLin(linOf(hex))
  return { L, C: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 }
}

function oklchToHex(L, C, hueDeg) {
  const h = (hueDeg * Math.PI) / 180
  const rgb = linFromOklab(L, C * Math.cos(h), C * Math.sin(h))
  if (rgb.some((v) => v < -0.0005 || v > 1.0005)) return null
  return `#${rgb.map((v) => Math.round(lin2s(v) * 255).toString(16).padStart(2, '0')).join('')}`
}

const relLum = (hex) => {
  const [r, g, b] = linOf(hex)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Normal-vision and worst-CVD separation, read out of the validator's report. */
function metric(a, b, mode, surface) {
  const { report } = validate([a, b], { mode, surface, pairs: 'all' })
  let normal = Infinity
  let cvd = Infinity
  for (const [name, , message] of report) {
    const text = String(message).replace(/#[0-9a-fA-F]{6}/g, '')
    const nums = [...text.matchAll(/(?:ΔE|tritan)\s*([0-9]+(?:\.[0-9]+)?)/g)].map((m) => Number(m[1]))
    if (!nums.length) continue
    if (/Normal-vision floor/.test(name)) normal = Math.min(normal, ...nums)
    if (/CVD separation/.test(name)) cvd = Math.min(cvd, ...nums)
  }
  return { normal: Number.isFinite(normal) ? normal : 0, cvd: Number.isFinite(cvd) ? cvd : 0 }
}

const cacheL = new Map()
const cacheD = new Map()
function pairOf(a, b, mode) {
  const cache = mode === 'light' ? cacheL : cacheD
  const key = a < b ? `${a}|${b}` : `${b}|${a}`
  if (!cache.has(key)) {
    cache.set(key, metric(a, b, mode, mode === 'light' ? LIGHT_SURFACE : DARK_SURFACE))
  }
  return cache.get(key)
}

/**
 * One slot per hue: the most chromatic step at that hue that sits in the mode's
 * lightness band and clears 3:1 on that mode's surface. Chroma is capped so the
 * set reads as a calm tracker rather than a set of highlighters.
 */
function stepFor(hue, { band, surface, maxChroma }) {
  for (let C = maxChroma; C >= 0.1; C -= 0.005) {
    // Mid-band first, then outward, so the step stays away from the band edges.
    const mid = (band[0] + band[1]) / 2
    for (let d = 0; d <= (band[1] - band[0]) / 2 + 1e-9; d += 0.01) {
      for (const L of d === 0 ? [mid] : [mid - d, mid + d]) {
        if (L < band[0] || L > band[1]) continue
        const hex = oklchToHex(L, C, hue)
        if (!hex) continue
        if (contrast(hex, surface) < 3) continue
        return hex
      }
    }
  }
  return null
}

const slots = []
for (let hue = 0; hue < 360; hue += 4) {
  const light = stepFor(hue, { band: [0.44, 0.76], surface: LIGHT_SURFACE, maxChroma: 0.19 })
  const dark = stepFor(hue, { band: [0.49, 0.66], surface: DARK_SURFACE, maxChroma: 0.19 })
  if (light && dark) slots.push({ hue, light, dark })
}
console.log(`${slots.length} hues have a usable step in BOTH modes\n`)

const hueGap = (a, b) => {
  const d = Math.abs(a - b) % 360
  return Math.min(d, 360 - d)
}

/** Greedy max-min on the worse of the two modes, with the hard floors enforced in both. */
function grow(seedIndex, size) {
  const chosen = [slots[seedIndex]]
  while (chosen.length < size) {
    let best = null
    let bestScore = -Infinity
    for (const cand of slots) {
      if (chosen.some((c) => c.hue === cand.hue)) continue
      if (chosen.some((c) => hueGap(c.hue, cand.hue) < MIN_HUE_GAP)) continue

      let worstCvd = Infinity
      let ok = true
      for (const picked of chosen) {
        const l = pairOf(cand.light, picked.light, 'light')
        const d = pairOf(cand.dark, picked.dark, 'dark')
        if (l.normal < NORMAL_FLOOR || d.normal < NORMAL_FLOOR) {
          ok = false
          break
        }
        worstCvd = Math.min(worstCvd, l.cvd, d.cvd)
      }
      if (ok && worstCvd > bestScore) {
        bestScore = worstCvd
        best = cand
      }
    }
    if (!best) return null
    chosen.push(best)
  }

  let normal = Infinity
  let cvd = Infinity
  for (let i = 0; i < chosen.length; i++) {
    for (let j = i + 1; j < chosen.length; j++) {
      const l = pairOf(chosen[i].light, chosen[j].light, 'light')
      const d = pairOf(chosen[i].dark, chosen[j].dark, 'dark')
      normal = Math.min(normal, l.normal, d.normal)
      cvd = Math.min(cvd, l.cvd, d.cvd)
    }
  }
  return { chosen, normal, cvd }
}

for (const size of SIZES) {
  let best = null
  for (let i = 0; i < slots.length; i++) {
    const r = grow(i, size)
    if (!r) continue
    if (!best || r.cvd > best.cvd || (r.cvd === best.cvd && r.normal > best.normal)) best = r
  }

  if (!best) {
    console.log(`n=${size}: no hue set clears the floors in both modes\n`)
    continue
  }

  // Order the slots around the hue wheel so the picker reads as a spectrum.
  best.chosen.sort((a, b) => a.hue - b.hue)
  const light = best.chosen.map((s) => s.light)
  const dark = best.chosen.map((s) => s.dark)
  const lv = validate(light, { mode: 'light', surface: LIGHT_SURFACE, pairs: 'all' })
  const dv = validate(dark, { mode: 'dark', surface: DARK_SURFACE, pairs: 'all' })

  console.log(`===== n=${size} — worst normal ΔE ${best.normal.toFixed(1)}, worst CVD ΔE ${best.cvd.toFixed(1)} =====`)
  console.log(`hues:  ${best.chosen.map((s) => s.hue).join(', ')}`)
  console.log(`light: ${light.join(',')}`)
  console.log(`dark:  ${dark.join(',')}`)
  console.log(`  LIGHT ${lv.ok ? 'PASS' : 'FAIL'}   DARK ${dv.ok ? 'PASS' : 'FAIL'}`)
  for (const [name, status, message] of lv.report) {
    if (status === true || status === 'pass') continue
    console.log(`    light [${String(status).toUpperCase()}] ${name} — ${message}`)
  }
  for (const [name, status, message] of dv.report) {
    if (status === true || status === 'pass') continue
    console.log(`    dark  [${String(status).toUpperCase()}] ${name} — ${message}`)
  }
  console.log()
}

/**
 * Searches for a habit palette that survives all-pairs CVD separation.
 *
 * The habit colours are identity labels the user picks, and any two of them can
 * end up side by side in a list, so "adjacent pairs" is the wrong test - every
 * pair has to hold up. This sweeps OKLCH, keeps the colours that sit in the
 * validator's lightness band and clear contrast on the real card surface, then
 * greedily picks the set with the largest worst-case separation.
 *
 * Run: node scripts/find-palette.mjs
 */
import { validate } from '../../AppData/Local/Temp/claude/bundled-skills/2.1.252/eb96976f3a671e10a1d86966dbd0128a/dataviz/scripts/validate_palette.js'

const LIGHT_SURFACE = '#ffffff'
const DARK_SURFACE = '#171a21'

// --- colour maths (inverse of the validator's forward transform) ------------

const lin2s = (c) => {
  c = Math.max(0, Math.min(1, c))
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
}
const s2lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

function linFromOklab(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

/** OKLCH -> hex, or null when the colour falls outside the sRGB gamut. */
function oklchToHex(L, C, hueDeg) {
  const h = (hueDeg * Math.PI) / 180
  const rgbLin = linFromOklab(L, C * Math.cos(h), C * Math.sin(h))
  if (rgbLin.some((v) => v < -0.0005 || v > 1.0005)) return null
  const hex = rgbLin
    .map((v) => Math.round(lin2s(v) * 255).toString(16).padStart(2, '0'))
    .join('')
  return `#${hex}`
}

const relLum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => s2lin(parseInt(hex.slice(i, i + 2), 16) / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const contrast = (a, b) => {
  const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// --- separation, measured the way the validator measures it ----------------

/**
 * Worst-case separation of a pair across normal vision and the three CVD types.
 * validate() reports rows as [name, status, message] with the figures in the
 * message text, so the numbers come back out of the string.
 */
function pairScore(a, b, mode, surface) {
  const { report } = validate([a, b], { mode, surface, pairs: 'all' })
  let worst = Infinity
  for (const [name, , message] of report) {
    if (!/CVD separation|Normal-vision floor/.test(name)) continue
    // Strip the hex swatches first - their digits would otherwise read as figures.
    const text = String(message).replace(/#[0-9a-fA-F]{6}/g, '')
    for (const m of text.matchAll(/(?:ΔE|tritan)\s*([0-9]+(?:\.[0-9]+)?)/g)) {
      worst = Math.min(worst, Number(m[1]))
    }
  }
  return Number.isFinite(worst) ? worst : 0
}

/** The validator's own verdict on a whole set. */
function verdict(palette, mode, surface) {
  const r = validate(palette, { mode, surface, pairs: 'all' })
  return { ok: r.ok, report: r.report }
}

function buildPool({ lBand, surface, minContrast }) {
  const pool = []
  for (let hue = 0; hue < 360; hue += 4) {
    for (let L = lBand[0]; L <= lBand[1] + 1e-9; L += 0.025) {
      for (let C = 0.26; C >= 0.09; C -= 0.01) {
        const hex = oklchToHex(L, C, hue)
        if (!hex) continue
        if (contrast(hex, surface) < minContrast) continue
        pool.push({ hex, hue, L, C })
        break // highest in-gamut chroma at this hue+L is the most separable
      }
    }
  }
  return pool
}

/** Greedy max-min: repeatedly add whichever candidate is furthest from the set. */
function greedy(pool, size, mode, surface, seedHex) {
  const cache = new Map()
  const dist = (a, b) => {
    const key = a < b ? `${a}|${b}` : `${b}|${a}`
    if (!cache.has(key)) cache.set(key, pairScore(a, b, mode, surface))
    return cache.get(key)
  }

  const chosen = [seedHex]
  while (chosen.length < size) {
    let best = null
    let bestScore = -Infinity
    for (const c of pool) {
      if (chosen.includes(c.hex)) continue
      let worst = Infinity
      for (const picked of chosen) worst = Math.min(worst, dist(c.hex, picked))
      if (worst > bestScore) {
        bestScore = worst
        best = c.hex
      }
    }
    if (!best) break
    chosen.push(best)
  }

  let worst = Infinity
  for (let i = 0; i < chosen.length; i++)
    for (let j = i + 1; j < chosen.length; j++) worst = Math.min(worst, dist(chosen[i], chosen[j]))

  return { palette: chosen, worst }
}

// --- run -------------------------------------------------------------------

// Blue anchors the set: it reads as the calm default for a first habit, and
// seeding keeps the search deterministic.
const lightPool = buildPool({ lBand: [0.44, 0.76], surface: LIGHT_SURFACE, minContrast: 3 })
const seed = lightPool.reduce((best, c) => {
  const target = 255 // blue-ish hue in OKLCH degrees
  return Math.abs(c.hue - target) < Math.abs(best.hue - target) ? c : best
}, lightPool[0])

console.log(`pool: ${lightPool.length} candidates, seed ${seed.hex} (hue ${seed.hue})\n`)

for (const size of [5, 6, 7, 8]) {
  const { palette, worst } = greedy(lightPool, size, 'light', LIGHT_SURFACE, seed.hex)
  const v = verdict(palette, 'light', LIGHT_SURFACE)
  console.log(`n=${size}  worst all-pairs ΔE ${worst.toFixed(1)}  ${v.ok ? 'PASS' : 'FAIL'}`)
  console.log(`        ${palette.join(',')}`)
}

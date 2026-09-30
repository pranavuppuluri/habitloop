/**
 * Rasterises the streak-calendar geometry so it can actually be looked at.
 * The validator checks colour; nothing checks whether a run joins correctly
 * across a week boundary except rendering it.
 *
 * Run: node scripts/preview-calendar.mjs && open /tmp/calendar.png
 */
import { writeFile } from 'node:fs/promises'
import sharp from 'sharp'

// Mirrors the component's constants.
const CELL = 38, GAP = 5, COLS = 7, HEAD = 16
const W = COLS * CELL + (COLS - 1) * GAP

// Inlined from the component so the preview exercises the same path maths.
function roundedSides(x, y, w, h, r, roundLeft, roundRight) {
  const rl = roundLeft ? Math.min(r, w / 2, h / 2) : 0
  const rr = roundRight ? Math.min(r, w / 2, h / 2) : 0
  return [
    `M ${x + rl} ${y}`, `H ${x + w - rr}`,
    rr ? `A ${rr} ${rr} 0 0 1 ${x + w} ${y + rr}` : '', `V ${y + h - rr}`,
    rr ? `A ${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h}` : '', `H ${x + rl}`,
    rl ? `A ${rl} ${rl} 0 0 1 ${x} ${y + h - rl}` : '', `V ${y + rl}`,
    rl ? `A ${rl} ${rl} 0 0 1 ${x + rl} ${y}` : '', 'Z',
  ].filter(Boolean).join(' ')
}

// A month with: a short run, a run crossing the week boundary, a missed gap,
// a skipped day, and a partial day.
const DONE = new Set([2,3,4, 8,9,10,11,12,13,14,15,16, 20,21, 25,26,27,28])
const MISSED = new Set([5,6,17,18,22,23])
const SKIPPED = new Set([19])
const PARTIAL = new Set([24])
const LEAD = 3, DAYS = 30
const weeks = Math.ceil((LEAD + DAYS) / COLS)
const H = HEAD + weeks * CELL + (weeks - 1) * GAP
const cells = [...Array(LEAD).fill(null), ...Array.from({length: DAYS}, (_,i)=>i+1)]
while (cells.length % COLS) cells.push(null)

const x = c => c * (CELL + GAP), y = r => HEAD + r * (CELL + GAP)
const isDone = d => d !== null && DONE.has(d)

const runs = []
for (let row = 0; row < weeks; row++) {
  let col = 0
  while (col < COLS) {
    const i = row*COLS+col, d = cells[i]
    if (!isDone(d)) { col++; continue }
    let end = col
    while (end+1 < COLS && isDone(cells[row*COLS+end+1])) end++
    runs.push({ row, from: col, to: end,
      openStart: col === 0 && isDone(cells[i-1]),
      openEnd: end === COLS-1 && isDone(cells[row*COLS+end+1]) })
    col = end+1
  }
}

const HUE = '#7769eb', ONHUE = '#15181f'
let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W*2}" height="${H*2}">`
svg += `<rect width="${W}" height="${H}" fill="#ffffff"/>`
for (let c=0;c<COLS;c++) svg += `<text x="${x(c)+CELL/2}" y="10" text-anchor="middle" font-family="monospace" font-size="9" fill="#8b94a5">${'SMTWTFS'[c]}</text>`
cells.forEach((d,i)=>{ if(d===null) return
  const c=i%COLS, r=Math.floor(i/COLS)
  const fill = MISSED.has(d) ? '#d6dae4' : '#f6f7fb'
  svg += `<rect x="${x(c)}" y="${y(r)}" width="${CELL}" height="${CELL}" rx="10" fill="${fill}"/>`})
cells.forEach((d,i)=>{ if(d===null||!PARTIAL.has(d)) return
  const c=i%COLS, r=Math.floor(i/COLS)
  svg += `<rect x="${x(c)}" y="${y(r)}" width="${CELL}" height="${CELL}" rx="10" fill="#c9c2f7"/>`})
for (const run of runs) {
  const left=x(run.from), width=x(run.to)+CELL-left
  svg += `<path d="${roundedSides(left,y(run.row),width,CELL,10,!run.openStart,!run.openEnd)}" fill="${HUE}"/>`
}
cells.forEach((d,i)=>{ if(d===null||!SKIPPED.has(d)) return
  const c=i%COLS, r=Math.floor(i/COLS)
  svg += `<rect x="${x(c)+1}" y="${y(r)+1}" width="${CELL-2}" height="${CELL-2}" rx="9" fill="none" stroke="#cdd3e0" stroke-width="2" stroke-dasharray="3 3"/>`})
cells.forEach((d,i)=>{ if(d===null) return
  const c=i%COLS, r=Math.floor(i/COLS)
  svg += `<text x="${x(c)+CELL/2}" y="${y(r)+CELL/2+4}" text-anchor="middle" font-family="monospace" font-size="12" fill="${isDone(d)?ONHUE:'#57606f'}">${d}</text>`})
svg += `</svg>`

await writeFile('./calendar-preview.svg', svg)
await sharp(Buffer.from(svg)).png().toFile('./calendar-preview.png')
console.log(`runs found: ${runs.length}`)
for (const r of runs) console.log(`  row ${r.row} cols ${r.from}-${r.to} openStart=${r.openStart} openEnd=${r.openEnd}`)

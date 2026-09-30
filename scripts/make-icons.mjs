/**
 * Renders the app icon to the PNG sizes installers actually ask for.
 *
 * The mark is the same one in the header: a ring with a gap, drawn open because
 * a habit is never finished, only kept. The maskable variant carries extra
 * padding so Android can crop it to a circle or squircle without clipping.
 *
 * Run: npm run icons
 */
import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const OUT = 'public/icons'

/** @param {{ bg: string, ring: string, track: string, inset: number }} opts */
const svg = ({ bg, ring, track, inset }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="0" fill="${bg}"/>
  <g transform="translate(256 256) scale(${1 - inset}) translate(-256 -256)">
    <circle cx="256" cy="256" r="150" fill="none" stroke="${track}" stroke-width="58"/>
    <circle cx="256" cy="256" r="150" fill="none" stroke="${ring}" stroke-width="58"
            stroke-linecap="round" stroke-dasharray="707 236"
            transform="rotate(-90 256 256)"/>
  </g>
</svg>`

const THEME = {
  bg: '#15181f',
  ring: '#7769eb',
  track: '#2b3140',
}

// 192 and 512 are the two every installer wants; 180 is what iOS uses for the
// home screen; maskable is Android's adaptive shape.
const TARGETS = [
  { name: 'icon-192.png', size: 192, inset: 0.12 },
  { name: 'icon-512.png', size: 512, inset: 0.12 },
  { name: 'icon-180.png', size: 180, inset: 0.1 },
  { name: 'maskable-512.png', size: 512, inset: 0.26 },
]

await mkdir(OUT, { recursive: true })

for (const { name, size, inset } of TARGETS) {
  const buffer = await sharp(Buffer.from(svg({ ...THEME, inset })))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer()
  await writeFile(`${OUT}/${name}`, buffer)
  console.log(`${OUT}/${name}  ${size}x${size}  ${(buffer.length / 1024).toFixed(1)} kB`)
}

// A vector favicon for browsers that prefer one; crisp at any tab size.
await writeFile(
  `${OUT}/icon.svg`,
  svg({ ...THEME, inset: 0.12 }).trim().replace('rx="0"', 'rx="96"'),
)
console.log(`${OUT}/icon.svg`)

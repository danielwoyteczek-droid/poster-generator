/**
 * Verarbeitet ein flach gerendertes Mockup-PNG mit Magenta-Smart-Object-Marker:
 *  1. Liest die Quelldatei (RGBA)
 *  2. Findet die Bounding-Box aller Magenta-Pixel (#FF00FF Toleranz ±8)
 *  3. Schreibt ein transparentes PNG (Magenta → Alpha 0) nach public/mockups/
 *  4. Schreibt frame-config.json mit Canvas-Größe + Slot-Rect
 *
 * Aufruf:  npx tsx scripts/build-frame-mockup.ts <orientation>
 *          orientation = "portrait" | "landscape"
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(__dirname, '..')
const SOURCE_CANDIDATES = (orientation: string) => [
  path.join(ROOT, 'assets', 'mockups', `frame-${orientation}.png`),
  path.join(ROOT, 'assets', 'mockups', `frame-${orientation.replace('portrait', 'portait')}.png`),
  path.join(ROOT, 'assets', `frame-${orientation}.png`),
  path.join(ROOT, 'assets', `frame-${orientation.replace('portrait', 'portait')}.png`),
]
const OUT_DIR = path.join(ROOT, 'public', 'mockups')
const CONFIG_PATH = path.join(ROOT, 'src', 'lib', 'frame-mockup-config.json')

// Relative G-Dominanz statt fester Grenzwerte:
// Pure Magenta = (255, 13, 255), aber antialiased Kanten gegen den dunklen
// Rahmen ergeben blasses Magenta wie (140, 8, 140). Wir akzeptieren alles,
// wo R und B deutlich höher sind als G — und schließen reines Dunkelgrau
// per R+B-Untergrenze aus.
const MAGENTA_MIN_BRIGHTNESS = 80   // r + b ≥ 80 → echtes Schwarz/Schatten raus
const MAGENTA_GREEN_RATIO = 0.45    // g muss < ratio * min(r, b) sein

async function findSource(orientation: string): Promise<string> {
  for (const candidate of SOURCE_CANDIDATES(orientation)) {
    try {
      await fs.access(candidate)
      return candidate
    } catch {
      // try next
    }
  }
  throw new Error(`Keine Quelldatei gefunden für ${orientation}. Probiert: \n${SOURCE_CANDIDATES(orientation).join('\n')}`)
}

interface SlotRect {
  x: number
  y: number
  width: number
  height: number
}

interface FrameConfig {
  [orientation: string]: {
    file: string
    canvasWidth: number
    canvasHeight: number
    slot: SlotRect
  }
}

function isMagenta(r: number, g: number, b: number): boolean {
  if (r + b < MAGENTA_MIN_BRIGHTNESS) return false
  const minRB = Math.min(r, b)
  return g < minRB * MAGENTA_GREEN_RATIO
}

const DILATION_RADIUS = 2 // Pixel um jeden Magenta-Treffer zusätzlich freistellen

async function processOrientation(orientation: string): Promise<FrameConfig[string]> {
  const sourcePath = await findSource(orientation)
  console.log(`[${orientation}] source: ${sourcePath}`)

  const image = sharp(sourcePath).ensureAlpha()
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  if (channels !== 4) throw new Error(`erwarte 4 Kanäle (RGBA), bekam ${channels}`)

  // 1. Pass: alle "magenta-ish" Pixel markieren
  const magentaMask = new Uint8Array(width * height)
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  let magentaCount = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (isMagenta(data[i], data[i + 1], data[i + 2])) {
        magentaMask[y * width + x] = 1
        magentaCount++
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  if (magentaCount === 0) {
    throw new Error('Keine Magenta-Pixel gefunden (relative G-Dominanz-Heuristik)')
  }

  // 2. Pass: Dilation — alle Pixel innerhalb DILATION_RADIUS um einen Treffer
  // mitnehmen. Fängt antialiased Restkanten ab, die unter der Threshold liegen.
  const clearMask = new Uint8Array(magentaMask)
  let dilatedCount = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (magentaMask[y * width + x]) continue
      let found = false
      for (let dy = -DILATION_RADIUS; dy <= DILATION_RADIUS && !found; dy++) {
        const ny = y + dy
        if (ny < 0 || ny >= height) continue
        for (let dx = -DILATION_RADIUS; dx <= DILATION_RADIUS && !found; dx++) {
          const nx = x + dx
          if (nx < 0 || nx >= width) continue
          if (magentaMask[ny * width + nx]) found = true
        }
      }
      if (found) {
        clearMask[y * width + x] = 1
        dilatedCount++
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  // 3. Pass: clearMask → Pixel transparent setzen
  for (let p = 0; p < clearMask.length; p++) {
    if (!clearMask[p]) continue
    const i = p * 4
    data[i] = 0
    data[i + 1] = 0
    data[i + 2] = 0
    data[i + 3] = 0
  }

  const slot: SlotRect = {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
  console.log(`[${orientation}] canvas: ${width}×${height}, magenta pixels: ${magentaCount.toLocaleString()} + dilation: ${dilatedCount.toLocaleString()}`)
  console.log(`[${orientation}] slot: x=${slot.x} y=${slot.y} w=${slot.width} h=${slot.height} (ratio ${(slot.width / slot.height).toFixed(4)})`)

  await fs.mkdir(OUT_DIR, { recursive: true })
  const outPath = path.join(OUT_DIR, `frame-${orientation}.png`)
  await sharp(data, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(outPath)
  const outSize = (await fs.stat(outPath)).size
  console.log(`[${orientation}] wrote ${outPath} (${(outSize / 1024 / 1024).toFixed(2)} MB)`)

  return {
    file: `/mockups/frame-${orientation}.png`,
    canvasWidth: width,
    canvasHeight: height,
    slot,
  }
}

async function main() {
  const orientations = process.argv.slice(2)
  if (orientations.length === 0) orientations.push('portrait')

  let existingConfig: FrameConfig = {}
  try {
    existingConfig = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf-8'))
  } catch {
    // first run
  }

  const updated: FrameConfig = { ...existingConfig }
  for (const o of orientations) {
    updated[o] = await processOrientation(o)
  }

  await fs.writeFile(CONFIG_PATH, JSON.stringify(updated, null, 2) + '\n')
  console.log(`\nwrote ${CONFIG_PATH}`)
  console.log(JSON.stringify(updated, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

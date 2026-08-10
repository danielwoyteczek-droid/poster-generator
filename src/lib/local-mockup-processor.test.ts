import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import {
  validateOverlayBuffer,
  detectMagentaSlotAndStrip,
  applyManualSlot,
  composeLocalMockup,
  OverlayValidationError,
  MAX_OVERLAY_BYTES,
  MIN_OVERLAY_DIM,
  MAX_OVERLAY_DIM,
} from './local-mockup-processor'

// ─── Helpers: synthetische PNGs bauen ─────────────────────────────────────

interface TestOverlayOptions {
  width: number
  height: number
  /** Magenta-Rechteck-Position; weglassen für kein Magenta */
  magenta?: { x: number; y: number; w: number; h: number }
  /** Hintergrundfarbe außerhalb des Magenta-Rechtecks */
  background?: { r: number; g: number; b: number }
}

async function buildTestOverlay(opts: TestOverlayOptions): Promise<Buffer> {
  const { width, height, magenta, background } = opts
  const bg = background ?? { r: 240, g: 240, b: 240 }
  const raw = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const inMagenta = magenta &&
        x >= magenta.x && x < magenta.x + magenta.w &&
        y >= magenta.y && y < magenta.y + magenta.h
      if (inMagenta) {
        raw[i] = 255
        raw[i + 1] = 13   // Photoshop-Export typischerweise G=13, nicht 0
        raw[i + 2] = 255
      } else {
        raw[i] = bg.r
        raw[i + 1] = bg.g
        raw[i + 2] = bg.b
      }
      raw[i + 3] = 255
    }
  }
  return sharp(raw, { raw: { width, height, channels: 4 } }).png().toBuffer()
}

async function buildTestPoster(width: number, height: number, color = { r: 30, g: 60, b: 100 }): Promise<Buffer> {
  const raw = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    raw[i * 4]     = color.r
    raw[i * 4 + 1] = color.g
    raw[i * 4 + 2] = color.b
    raw[i * 4 + 3] = 255
  }
  return sharp(raw, { raw: { width, height, channels: 4 } }).png().toBuffer()
}

// ─── validateOverlayBuffer ────────────────────────────────────────────────

describe('validateOverlayBuffer', () => {
  it('akzeptiert ein gültiges PNG der Mindestgröße', async () => {
    const buf = await buildTestOverlay({ width: MIN_OVERLAY_DIM, height: MIN_OVERLAY_DIM })
    const meta = await validateOverlayBuffer(buf)
    expect(meta.width).toBe(MIN_OVERLAY_DIM)
    expect(meta.height).toBe(MIN_OVERLAY_DIM)
  })

  it('lehnt Nicht-PNG-Buffer ab (falsche Magic Number)', async () => {
    // JPEG-Magic 0xFF 0xD8 0xFF
    const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
    await expect(validateOverlayBuffer(fakeJpeg)).rejects.toMatchObject({
      code: 'not_png',
    })
  })

  it('lehnt zu kleine PNGs ab', async () => {
    const tiny = await buildTestOverlay({ width: 400, height: 400 })
    await expect(validateOverlayBuffer(tiny)).rejects.toMatchObject({
      code: 'too_small',
    })
  })

  it('lehnt zu große Files ab (Bytes)', async () => {
    // Buffer mit gültigem PNG-Header aber riesiger Größe (Bytes-Check zuerst)
    const huge = Buffer.alloc(MAX_OVERLAY_BYTES + 1)
    huge[0] = 0x89; huge[1] = 0x50; huge[2] = 0x4e; huge[3] = 0x47
    await expect(validateOverlayBuffer(huge)).rejects.toMatchObject({
      code: 'too_large',
    })
  })

  it('lehnt unlesbares PNG ab (gültiger Header, kaputtes IDAT)', async () => {
    const broken = Buffer.alloc(200)
    broken[0] = 0x89; broken[1] = 0x50; broken[2] = 0x4e; broken[3] = 0x47
    broken[4] = 0x0d; broken[5] = 0x0a; broken[6] = 0x1a; broken[7] = 0x0a
    await expect(validateOverlayBuffer(broken)).rejects.toMatchObject({
      code: 'unreadable',
    })
  })
})

// ─── detectMagentaSlotAndStrip ────────────────────────────────────────────

describe('detectMagentaSlotAndStrip', () => {
  it('findet das Magenta-Rechteck und liefert die korrekte Bounding-Box', async () => {
    const buf = await buildTestOverlay({
      width: 1000, height: 1000,
      magenta: { x: 200, y: 300, w: 400, h: 500 },
    })
    const result = await detectMagentaSlotAndStrip(buf)

    // Dilation erweitert die Bounding-Box um 2 Pixel in alle Richtungen
    expect(result.slot.x).toBeGreaterThanOrEqual(198)
    expect(result.slot.x).toBeLessThanOrEqual(200)
    expect(result.slot.y).toBeGreaterThanOrEqual(298)
    expect(result.slot.y).toBeLessThanOrEqual(300)
    expect(result.slot.width).toBeGreaterThanOrEqual(400)
    expect(result.slot.width).toBeLessThanOrEqual(404)
    expect(result.slot.height).toBeGreaterThanOrEqual(500)
    expect(result.slot.height).toBeLessThanOrEqual(504)
    expect(result.slot.canvasWidth).toBe(1000)
    expect(result.slot.canvasHeight).toBe(1000)
    expect(result.magentaPixelCount).toBeGreaterThan(199_000)  // ~400*500
  })

  it('ersetzt Magenta-Pixel durch vollständige Transparenz', async () => {
    const buf = await buildTestOverlay({
      width: 800, height: 800,
      magenta: { x: 100, y: 100, w: 600, h: 600 },
    })
    const result = await detectMagentaSlotAndStrip(buf)

    // Mitte des ehemaligen Magenta-Bereichs muss jetzt Alpha=0 haben
    const { data, info } = await sharp(result.processedPng).raw().toBuffer({ resolveWithObject: true })
    const cx = 400, cy = 400
    const idx = (cy * info.width + cx) * 4
    expect(data[idx + 3]).toBe(0)
  })

  it('wirft, wenn kein Magenta-Marker gefunden wird', async () => {
    const buf = await buildTestOverlay({ width: 1000, height: 1000 })  // kein Magenta
    await expect(detectMagentaSlotAndStrip(buf)).rejects.toMatchObject({
      code: 'no_magenta',
    })
  })

  it('toleriert leicht abweichende Magenta-Werte (Photoshop G=13)', async () => {
    // buildTestOverlay nutzt bereits (255,13,255) — die Heuristik muss das fangen
    const buf = await buildTestOverlay({
      width: 900, height: 900,
      magenta: { x: 100, y: 100, w: 300, h: 300 },
    })
    const result = await detectMagentaSlotAndStrip(buf)
    expect(result.magentaPixelCount).toBeGreaterThan(85_000)
  })
})

// ─── applyManualSlot ──────────────────────────────────────────────────────

describe('applyManualSlot', () => {
  it('liefert die angegebenen Koordinaten mit Canvas-Größe zurück', async () => {
    const buf = await buildTestOverlay({ width: 1500, height: 1500 })
    const result = await applyManualSlot(buf, { x: 200, y: 300, width: 600, height: 800 })
    expect(result.slot).toEqual({
      x: 200, y: 300, width: 600, height: 800,
      canvasWidth: 1500, canvasHeight: 1500,
    })
    expect(result.processedPng).toBe(buf)  // unverändert durchgereicht
  })

  it('lehnt Slots ab, die außerhalb der Canvas-Grenzen liegen', async () => {
    const buf = await buildTestOverlay({ width: 1000, height: 1000 })
    await expect(applyManualSlot(buf, { x: 900, y: 0, width: 200, height: 500 })).rejects.toMatchObject({
      code: 'slot_out_of_bounds',
    })
  })

  it('lehnt Slots mit Breite/Höhe ≤ 0 ab', async () => {
    const buf = await buildTestOverlay({ width: 1000, height: 1000 })
    await expect(applyManualSlot(buf, { x: 0, y: 0, width: 0, height: 100 })).rejects.toMatchObject({
      code: 'slot_invalid_dimensions',
    })
  })
})

// ─── composeLocalMockup ───────────────────────────────────────────────────

describe('composeLocalMockup', () => {
  it('produziert ein Composite in der Canvas-Größe des Overlays', async () => {
    const overlay = await buildTestOverlay({
      width: 1200, height: 1200,
      magenta: { x: 300, y: 200, w: 600, h: 800 },
    })
    const stripped = await detectMagentaSlotAndStrip(overlay)
    const poster = await buildTestPoster(600, 800)

    const composite = await composeLocalMockup({
      posterBuffer: poster,
      overlayBuffer: stripped.processedPng,
      slot: stripped.slot,
    })

    const meta = await sharp(composite).metadata()
    expect(meta.width).toBe(1200)
    expect(meta.height).toBe(1200)
    expect(meta.format).toBe('jpeg')
  })

  it('lässt das Poster im Slot durchscheinen', async () => {
    // Roter Poster, schwarzer Overlay-Hintergrund, Slot mittig
    const overlay = await buildTestOverlay({
      width: 1000, height: 1000,
      magenta: { x: 250, y: 250, w: 500, h: 500 },
      background: { r: 0, g: 0, b: 0 },
    })
    const stripped = await detectMagentaSlotAndStrip(overlay)
    const redPoster = await buildTestPoster(500, 500, { r: 200, g: 30, b: 30 })

    const composite = await composeLocalMockup({
      posterBuffer: redPoster,
      overlayBuffer: stripped.processedPng,
      slot: stripped.slot,
    })

    // Mitte (500/500) muss rötlich sein, Ecke (50/50) muss schwarz sein
    const { data, info } = await sharp(composite).raw().toBuffer({ resolveWithObject: true })
    const centerIdx = (500 * info.width + 500) * info.channels
    const cornerIdx = (50 * info.width + 50) * info.channels
    expect(data[centerIdx]).toBeGreaterThan(150)       // R high
    expect(data[centerIdx + 1]).toBeLessThan(80)       // G low
    expect(data[cornerIdx]).toBeLessThan(30)           // R low (schwarzer Rahmen)
    expect(data[cornerIdx + 1]).toBeLessThan(30)
  })
})

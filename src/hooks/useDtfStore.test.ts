import { describe, expect, it } from 'vitest'
import {
  clampElementToSheet,
  boundingBoxMm,
  elementHeightMm,
  elementDpi,
  type DtfImageElement,
} from './useDtfStore'
import { DTF_SHEET_FORMATS, DTF_SHEET_MARGIN_MM } from '@/lib/dtf-constants'

/**
 * `clampElementToSheet` ist die Zusicherung, dass ein Motiv den
 * bedruckbaren Bereich nicht verlassen kann. Da der Kunde die Vorschau
 * verbindlich freigibt, ist ein Fehler hier direkt ein Fehldruck — reine
 * Rechenlogik, entsprechend gut testbar.
 */

const A4 = DTF_SHEET_FORMATS.a4 // 210 × 297 mm
const M = DTF_SHEET_MARGIN_MM // 10 mm

function el(patch: Partial<DtfImageElement> = {}): DtfImageElement {
  return {
    id: 'e1',
    kind: 'image' as const,
    uploadId: 'u1',
    previewUrl: 'blob:x',
    sourceWidthPx: 1000,
    sourceHeightPx: 1000,
    xMm: 50,
    yMm: 50,
    widthMm: 50,
    rotationDeg: 0,
    z: 1,
    ...patch,
  }
}

describe('clampElementToSheet — Position', () => {
  it('lässt ein Motiv innerhalb des Rands unverändert', () => {
    const input = el({ xMm: 50, yMm: 50, widthMm: 50 })
    expect(clampElementToSheet(input, 'a4')).toEqual(input)
  })

  it('zieht ein nach links herausgeschobenes Motiv auf den Rand zurück', () => {
    const out = clampElementToSheet(el({ xMm: -40 }), 'a4')
    expect(out.xMm).toBeCloseTo(M, 5)
  })

  it('zieht ein nach oben herausgeschobenes Motiv auf den Rand zurück', () => {
    const out = clampElementToSheet(el({ yMm: -80 }), 'a4')
    expect(out.yMm).toBeCloseTo(M, 5)
  })

  it('begrenzt an der rechten Kante', () => {
    const out = clampElementToSheet(el({ xMm: 500, widthMm: 50 }), 'a4')
    expect(out.xMm + 50).toBeCloseTo(A4.widthMm - M, 5)
  })

  it('begrenzt an der unteren Kante', () => {
    const out = clampElementToSheet(el({ yMm: 900, widthMm: 50 }), 'a4')
    expect(out.yMm + elementHeightMm(out)).toBeCloseTo(A4.heightMm - M, 5)
  })
})

describe('clampElementToSheet — Größe', () => {
  it('deckelt ein Motiv, das breiter als die nutzbare Fläche wäre', () => {
    const out = clampElementToSheet(el({ widthMm: 400, xMm: 0, yMm: 0 }), 'a4')
    expect(out.widthMm).toBeCloseTo(A4.widthMm - 2 * M, 5) // 190 mm
  })

  it('deckelt über die Höhe, wenn das Motiv hochkant ist', () => {
    // 1:3-Motiv — die Höhe begrenzt, nicht die Breite.
    const out = clampElementToSheet(
      el({ sourceWidthPx: 1000, sourceHeightPx: 3000, widthMm: 190, xMm: 0, yMm: 0 }),
      'a4',
    )
    expect(elementHeightMm(out)).toBeLessThanOrEqual(A4.heightMm - 2 * M + 0.001)
  })

  it('verkleinert ein gedrehtes Motiv so weit, dass die Hüllbox passt', () => {
    // Ein um 45° gedrehtes Quadrat braucht das 1,41-fache seiner Kante.
    const out = clampElementToSheet(
      el({ widthMm: 190, rotationDeg: 45, xMm: 0, yMm: 0 }),
      'a4',
    )
    const box = boundingBoxMm(out)
    expect(box.width).toBeLessThanOrEqual(A4.widthMm - 2 * M + 0.001)
    expect(out.widthMm).toBeLessThan(190)
  })
})

describe('clampElementToSheet — gedrehte Motive bleiben drin', () => {
  const cases = [0, 15, 30, 45, 60, 90, 137, 180, 271, 359]

  it.each(cases)('bei %i° liegt die Hüllbox vollständig im Rand', (deg) => {
    // Bewusst weit außerhalb starten, damit die Begrenzung arbeiten muss.
    const out = clampElementToSheet(
      el({ rotationDeg: deg, xMm: -100, yMm: -100, widthMm: 80 }),
      'a4',
    )
    const box = boundingBoxMm(out)
    const cx = out.xMm + out.widthMm / 2
    const cy = out.yMm + elementHeightMm(out) / 2

    expect(cx - box.width / 2).toBeGreaterThanOrEqual(M - 0.001)
    expect(cy - box.height / 2).toBeGreaterThanOrEqual(M - 0.001)
    expect(cx + box.width / 2).toBeLessThanOrEqual(A4.widthMm - M + 0.001)
    expect(cy + box.height / 2).toBeLessThanOrEqual(A4.heightMm - M + 0.001)
  })
})

describe('clampElementToSheet — Formatwechsel', () => {
  it('holt ein Motiv beim Verkleinern von 40x50 auf A4 herein', () => {
    // Auf 40 × 50 legal platziert, auf A4 weit außerhalb.
    const big = el({ xMm: 300, yMm: 400, widthMm: 80 })
    const out = clampElementToSheet(big, 'a4')
    expect(out.xMm + out.widthMm).toBeLessThanOrEqual(A4.widthMm - M + 0.001)
    expect(out.yMm + elementHeightMm(out)).toBeLessThanOrEqual(A4.heightMm - M + 0.001)
  })

  it('lässt Position beim Vergrößern auf 40x50 unangetastet', () => {
    const input = el({ xMm: 50, yMm: 50, widthMm: 50 })
    expect(clampElementToSheet(input, '40x50')).toEqual(input)
  })
})

describe('elementDpi', () => {
  it('rechnet Pixel und Druckbreite in dpi um', () => {
    // 1000 px auf 84,67 mm = 1000 px auf 3,333 Zoll = 300 dpi
    expect(elementDpi(el({ sourceWidthPx: 1000, widthMm: 84.667 }))).toBe(300)
  })

  it('halbiert sich bei doppelter Druckbreite', () => {
    const a = elementDpi(el({ sourceWidthPx: 2000, widthMm: 100 }))!
    const b = elementDpi(el({ sourceWidthPx: 2000, widthMm: 200 }))!
    expect(b).toBeCloseTo(a / 2, 0)
  })
})

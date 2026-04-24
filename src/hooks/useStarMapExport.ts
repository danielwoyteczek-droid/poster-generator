'use client'

import { useState } from 'react'
import { useStarMapStore } from './useStarMapStore'
import { useEditorStore, type TextBlock } from './useEditorStore'
import { PRINT_FORMATS, type PrintFormat } from '@/lib/print-formats'
import { renderStarMap, type StarEntry, type GeoFeature } from '@/lib/star-map-renderer'
import { getCoordinatesText } from '@/components/editor/TextBlockOverlay'

// ─── Text helpers (mirror of useMapExport) ─────────────────────────────────

async function ensureFontsLoaded(textBlocks: TextBlock[]) {
  await document.fonts.ready
  const families = [...new Set(textBlocks.map((b) => b.fontFamily))]
  await Promise.all(families.flatMap((f) => [
    document.fonts.load(`normal 16px "${f}"`),
    document.fonts.load(`bold 16px "${f}"`),
  ]))
}

function drawTextBlocks(
  ctx: CanvasRenderingContext2D,
  textBlocks: TextBlock[],
  displayTexts: Record<string, string>,
  W: number,
  H: number,
  previewW: number,
  fontScale = 1,
) {
  const scaleX = W / previewW
  for (const block of textBlocks) {
    const raw = displayTexts[block.id] ?? block.text
    const text = block.uppercase ? raw.toUpperCase() : raw
    if (!text.trim()) continue

    const scaledFontSize = Math.max(8, Math.round(block.fontSize * scaleX * fontScale))
    const weight = block.bold ? 'bold' : 'normal'
    ctx.font = `${weight} ${scaledFontSize}px "${block.fontFamily}", sans-serif`
    ctx.fillStyle = block.color
    ctx.textAlign = block.align
    ctx.textBaseline = 'alphabetic'

    const blockLeft = block.x * W
    const blockTop = block.y * H
    const blockW = block.width * W
    const lineH = Math.round(scaledFontSize * 1.2)

    const m = ctx.measureText('Hg')
    const ascent = m.fontBoundingBoxAscent > 0 ? m.fontBoundingBoxAscent : scaledFontSize * 0.8
    const descent = m.fontBoundingBoxDescent > 0 ? m.fontBoundingBoxDescent : scaledFontSize * 0.2
    const halfLeading = (lineH - ascent - descent) / 2
    const firstBaselineY = blockTop + halfLeading + ascent

    const anchorX =
      block.align === 'center' ? blockLeft + blockW / 2
      : block.align === 'right' ? blockLeft + blockW
      : blockLeft

    for (const [i, line] of text.split('\n').entries()) {
      ctx.fillText(line, anchorX, firstBaselineY + i * lineH)
    }
  }
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    || 'sternkarte'
  )
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))), 'image/png'),
  )
}

async function fetchJSON<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Failed to fetch ${url}`)
  return r.json()
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useStarMapExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    lat, lng, datetime, locationName,
    posterBgColor, skyBgColor, starColor,
    showConstellations, showMilkyWay, showSun, showMoon, showPlanets,
    frameConfig,
    previewWidth,
  } = useStarMapStore()

  const { textBlocks } = useEditorStore()

  const buildCanvas = async (
    format: PrintFormat,
    options: { fontScale?: number } = {},
  ): Promise<HTMLCanvasElement> => {
    const fmt = PRINT_FORMATS[format]
    const W = fmt.widthPx
    const H = fmt.heightPx

    const [starDataRaw, constellationRaw, milkyWayRaw] = await Promise.all([
      fetchJSON<StarEntry[]>('/bright-stars.json'),
      showConstellations ? fetchJSON<{ features: GeoFeature[] }>('/constellations.json').then(d => d.features) : Promise.resolve([] as GeoFeature[]),
      showMilkyWay ? fetchJSON<{ features: GeoFeature[] }>('/milky-way.json').then(d => d.features) : Promise.resolve([] as GeoFeature[]),
    ])

    await ensureFontsLoaded(textBlocks)

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    renderStarMap(ctx, {
      width: W, height: H, lat, lng, date: new Date(datetime),
      posterBgColor, skyBgColor, starColor,
      starData: starDataRaw, constellationData: constellationRaw, milkyWayData: milkyWayRaw,
      showConstellations, showMilkyWay, showSun, showMoon, showPlanets,
      frameConfig,
    })

    const displayTexts: Record<string, string> = {}
    for (const block of textBlocks) {
      displayTexts[block.id] = block.isCoordinates
        ? getCoordinatesText(lat, lng, locationName)
        : block.text
    }
    drawTextBlocks(ctx, textBlocks, displayTexts, W, H, previewWidth, options.fontScale)
    return canvas
  }

  const run = async (format: PrintFormat, type: 'png' | 'pdf') => {
    setIsExporting(true)
    setError(null)
    try {
      const fmt = PRINT_FORMATS[format]
      const canvas = await buildCanvas(format)
      const pngBlob = await canvasToBlob(canvas)
      const filename = `${slugify(locationName)}-sternkarte`

      if (type === 'png') {
        const url = URL.createObjectURL(pngBlob)
        const a = document.createElement('a')
        a.href = url; a.download = `${filename}.png`; a.click()
        URL.revokeObjectURL(url)
      } else {
        const { PDFDocument } = await import('pdf-lib')
        const MM_TO_PT = 72 / 25.4
        const pdfDoc = await PDFDocument.create()
        const page = pdfDoc.addPage([fmt.widthMm * MM_TO_PT, fmt.heightMm * MM_TO_PT])
        const pngImage = await pdfDoc.embedPng(new Uint8Array(await pngBlob.arrayBuffer()))
        page.drawImage(pngImage, { x: 0, y: 0, width: fmt.widthMm * MM_TO_PT, height: fmt.heightMm * MM_TO_PT })
        const pdfBytes = await pdfDoc.save()
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `${filename}.pdf`; a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export fehlgeschlagen')
    } finally {
      setIsExporting(false)
    }
  }

  const renderPreview = async (format: PrintFormat): Promise<string> => {
    // Match PosterCanvas mobile font-scale so Zimmeransicht lines up with the
    // live preview. Desktop (previewWidth ≥ 400) clamps to 1 — unchanged.
    const fontScale = Math.min(1, previewWidth / 400)
    const canvas = await buildCanvas(format, { fontScale })
    return canvas.toDataURL('image/png')
  }

  return {
    exportPNG: (format: PrintFormat) => run(format, 'png'),
    exportPDF: (format: PrintFormat) => run(format, 'pdf'),
    renderPreview,
    isExporting,
    error,
  }
}

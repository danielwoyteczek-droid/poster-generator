import { PRINT_FORMATS, type PrintFormat } from './print-formats'
import { renderStarMap, type StarEntry, type GeoFeature } from './star-map-renderer'
import { buildPosterCanvas, type ExportSnapshot } from '@/hooks/useMapExport'
import { getCoordinatesText } from '@/components/editor/TextBlockOverlay'
import { computeFontScale } from './font-scale'
import type { TextBlock } from '@/hooks/useEditorStore'

export type PosterType = 'map' | 'star-map'

async function fetchJSON<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Failed to fetch ${url}`)
  return r.json()
}

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
) {
  const scaleX = W / previewW
  // Same font-scale used in PosterCanvas so preview / Zimmeransicht /
  // server-rendered snapshots all agree on the text-to-poster ratio.
  const fontScale = computeFontScale(previewW)
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

async function renderStarMapCanvas(format: PrintFormat, snapshot: Record<string, unknown>): Promise<HTMLCanvasElement> {
  const fmt = PRINT_FORMATS[format]
  const W = fmt.widthPx
  const H = fmt.heightPx

  const s = snapshot as {
    lat: number; lng: number; datetime: string; locationName: string
    posterBgColor: string; skyBgColor: string; starColor: string
    showConstellations: boolean; showMilkyWay: boolean; showSun: boolean; showMoon: boolean; showPlanets: boolean
    frameConfig?: import('@/hooks/useStarMapStore').StarMapFrameConfig
    textBlocks: TextBlock[]
  }

  const [starData, constellationData, milkyWayData] = await Promise.all([
    fetchJSON<StarEntry[]>('/bright-stars.json'),
    s.showConstellations
      ? fetchJSON<{ features: GeoFeature[] }>('/constellations.json').then((d) => d.features)
      : Promise.resolve([] as GeoFeature[]),
    s.showMilkyWay
      ? fetchJSON<{ features: GeoFeature[] }>('/milky-way.json').then((d) => d.features)
      : Promise.resolve([] as GeoFeature[]),
  ])

  await ensureFontsLoaded(s.textBlocks)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  renderStarMap(ctx, {
    width: W, height: H, lat: s.lat, lng: s.lng, date: new Date(s.datetime),
    posterBgColor: s.posterBgColor, skyBgColor: s.skyBgColor, starColor: s.starColor,
    starData, constellationData, milkyWayData,
    showConstellations: s.showConstellations, showMilkyWay: s.showMilkyWay,
    showSun: s.showSun, showMoon: s.showMoon, showPlanets: s.showPlanets,
    frameConfig: s.frameConfig,
  })

  // Approximate preview width — same heuristic as useStarMapExport default
  const previewW = 500
  const displayTexts: Record<string, string> = {}
  for (const block of s.textBlocks) {
    displayTexts[block.id] = block.isCoordinates
      ? getCoordinatesText(s.lat, s.lng, s.locationName)
      : block.text
  }
  drawTextBlocks(ctx, s.textBlocks, displayTexts, W, H, previewW)
  return canvas
}

export async function renderPosterFromSnapshot(
  posterType: PosterType,
  format: PrintFormat,
  snapshot: Record<string, unknown>,
): Promise<HTMLCanvasElement> {
  if (posterType === 'star-map') {
    return renderStarMapCanvas(format, snapshot)
  }
  return buildPosterCanvas(format, snapshot as unknown as ExportSnapshot)
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG failed'))), 'image/png'),
  )
}

export async function pngBlobToPdfBlob(pngBlob: Blob, format: PrintFormat): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib')
  const fmt = PRINT_FORMATS[format]
  const MM_TO_PT = 72 / 25.4
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([fmt.widthMm * MM_TO_PT, fmt.heightMm * MM_TO_PT])
  const pngImage = await pdfDoc.embedPng(new Uint8Array(await pngBlob.arrayBuffer()))
  page.drawImage(pngImage, { x: 0, y: 0, width: fmt.widthMm * MM_TO_PT, height: fmt.heightMm * MM_TO_PT })
  const bytes = await pdfDoc.save()
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
}

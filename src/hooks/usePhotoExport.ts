'use client'

import { useState } from 'react'
import { useEditorStore, type TextBlock } from '@/hooks/useEditorStore'
import { usePhotoEditorStore } from '@/hooks/usePhotoEditorStore'
import {
  PRINT_FORMATS,
  effectiveDimensions,
  type PrintFormat,
  type PosterOrientation,
} from '@/lib/print-formats'
import { MASK_FONTS } from '@/lib/letter-mask'
import { computeFontScale } from '@/lib/font-scale'
import { drawLetterMask, resolveFontFamily, ensureMaskFontLoaded } from '@/lib/photo-mask-render'

// ─── Helpers ──────────────────────────────────────────────────────────────

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))), 'image/png'),
  )
}

function slugify(name: string): string {
  return (
    name
      .toLocaleLowerCase('de-DE')
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    || 'foto-poster'
  )
}

async function ensureTextFontsLoaded(textBlocks: TextBlock[]) {
  const families = [...new Set(textBlocks.map((b) => b.fontFamily))]
  await Promise.all(
    families.flatMap((f) => [
      document.fonts.load(`normal 16px "${f}"`),
      document.fonts.load(`bold 16px "${f}"`),
    ]),
  )
}

// ─── Text-block drawing (mirror of useStarMapExport / useMapExport) ───────

function drawTextBlocks(
  ctx: CanvasRenderingContext2D,
  textBlocks: TextBlock[],
  W: number,
  H: number,
  previewW: number,
) {
  const scaleX = W / previewW
  const fontScale = computeFontScale(previewW)
  for (const block of textBlocks) {
    if (block.isCoordinates) continue // photo posters never carry coords
    const text = block.uppercase ? block.text.toUpperCase() : block.text
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

// ─── Hook ─────────────────────────────────────────────────────────────────

export function usePhotoExport() {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    word,
    slots,
    wordWidth,
    wordX,
    wordY,
    orientation,
    maskFontKey,
    defaultSlotColor,
  } = usePhotoEditorStore()

  const { textBlocks } = useEditorStore()

  const buildCanvas = async (format: PrintFormat): Promise<HTMLCanvasElement> => {
    const baseFmt = PRINT_FORMATS[format]
    const fmt = effectiveDimensions(baseFmt, orientation as PosterOrientation)
    const W = fmt.widthPx
    const H = fmt.heightPx

    const font = MASK_FONTS[maskFontKey]
    const maskFontFamily = resolveFontFamily(font.cssFamily)
    await ensureMaskFontLoaded(maskFontFamily)
    await ensureTextFontsLoaded(textBlocks)

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context unavailable')

    // White poster background. (V1: not customizable. Letter colors carry
    // the brand, the paper itself stays white like a print.)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)

    await drawLetterMask(ctx, W, H, {
      word,
      slots,
      wordWidth,
      wordX,
      wordY,
      defaultSlotColor,
      maskFontKey,
      maskFontFamily,
    })

    // Use the poster's actual width as the previewW reference for the text
    // scale — same convention as the other editors. computeFontScale picks
    // a sensible scale relative to a 660 px reference inside.
    drawTextBlocks(ctx, textBlocks, W, H, W)

    return canvas
  }

  const renderPreview = async (format: PrintFormat): Promise<string> => {
    const canvas = await buildCanvas(format)
    return canvas.toDataURL('image/png')
  }

  const run = async (format: PrintFormat, type: 'png' | 'pdf') => {
    setIsExporting(true)
    setError(null)
    try {
      const baseFmt = PRINT_FORMATS[format]
      const fmt = effectiveDimensions(baseFmt, orientation as PosterOrientation)
      const canvas = await buildCanvas(format)
      const pngBlob = await canvasToBlob(canvas)
      const filename = `${slugify(word || 'foto-poster')}-foto-poster`

      if (type === 'png') {
        const url = URL.createObjectURL(pngBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.png`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const { PDFDocument } = await import('pdf-lib')
        const MM_TO_PT = 72 / 25.4
        const pdfDoc = await PDFDocument.create()
        const page = pdfDoc.addPage([fmt.widthMm * MM_TO_PT, fmt.heightMm * MM_TO_PT])
        const pngImage = await pdfDoc.embedPng(new Uint8Array(await pngBlob.arrayBuffer()))
        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: fmt.widthMm * MM_TO_PT,
          height: fmt.heightMm * MM_TO_PT,
        })
        const pdfBytes = await pdfDoc.save()
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export fehlgeschlagen')
    } finally {
      setIsExporting(false)
    }
  }

  return {
    exportPNG: (format: PrintFormat) => run(format, 'png'),
    exportPDF: (format: PrintFormat) => run(format, 'pdf'),
    renderPreview,
    isExporting,
    error,
  }
}

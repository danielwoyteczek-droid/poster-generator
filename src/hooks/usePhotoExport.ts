'use client'

import { useState } from 'react'
import { useEditorStore, type TextBlock } from '@/hooks/useEditorStore'
import { usePhotoEditorStore, type LetterSlot } from '@/hooks/usePhotoEditorStore'
import {
  PRINT_FORMATS,
  effectiveDimensions,
  type PrintFormat,
  type PosterOrientation,
} from '@/lib/print-formats'
import { MASK_FONTS, type MaskFontKey } from '@/lib/letter-mask'
import { computeFontScale } from '@/lib/font-scale'

// ─── Helpers ──────────────────────────────────────────────────────────────

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))), 'image/png'),
  )
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
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

/**
 * The mask font is loaded by next/font with a CSS variable. The variable
 * only resolves inside CSS, not in canvas' `ctx.font` string. We need the
 * actual resolved family name (e.g. `__Anton_4e93a8`) — measure it once
 * via a hidden probe element.
 */
function resolveFontFamily(cssFamily: string): string {
  const probe = document.createElement('span')
  probe.style.fontFamily = cssFamily
  probe.style.position = 'absolute'
  probe.style.visibility = 'hidden'
  probe.style.left = '-9999px'
  probe.style.top = '0'
  document.body.appendChild(probe)
  const resolved = window.getComputedStyle(probe).fontFamily
  document.body.removeChild(probe)
  return resolved
}

async function ensureFontsLoaded(maskFontFamily: string, textBlocks: TextBlock[]) {
  await document.fonts.ready
  // Mask font must be loaded for the letter-shape masking to work.
  await document.fonts.load(`400 100px ${maskFontFamily}`)
  // Text-block fonts (regular + bold) — same approach as the map/star-map
  // exporters so all editors share font-handling behavior.
  const families = [...new Set(textBlocks.map((b) => b.fontFamily))]
  await Promise.all(
    families.flatMap((f) => [
      document.fonts.load(`normal 16px "${f}"`),
      document.fonts.load(`bold 16px "${f}"`),
    ]),
  )
}

// ─── Letter-Mask drawing ──────────────────────────────────────────────────

interface LetterMaskRenderArgs {
  word: string
  slots: LetterSlot[]
  wordWidth: number
  wordX: number
  wordY: number
  defaultSlotColor: string
  maskFontKey: MaskFontKey
  /** Resolved canvas-compatible font family (already passed through
   *  resolveFontFamily()). */
  maskFontFamily: string
}

async function drawLetterMask(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  args: LetterMaskRenderArgs,
) {
  const { word, slots, wordWidth, wordX, wordY, defaultSlotColor, maskFontKey, maskFontFamily } = args
  if (word.length === 0) return

  const font = MASK_FONTS[maskFontKey]
  const containerW = wordWidth * W
  const slotW = containerW / word.length
  const slotH = slotW * font.heightOverWidth
  const fontSize = slotW * font.fontSizeOverSlotWidth
  const containerLeft = (wordX - wordWidth / 2) * W
  const containerTop = wordY * H

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    const slotX = containerLeft + i * slotW
    const slotY = containerTop
    const cx = slotX + slotW / 2
    const cy = slotY + slotH / 2

    if (slot.photo) {
      // Mask the photo with the letter shape via a temporary canvas:
      // 1. Draw the photo (cover-sized + cropX/cropY pan applied)
      // 2. globalCompositeOperation = 'destination-in' + fillText keeps
      //    only the pixels under the glyph
      // 3. Blit the temp canvas onto the main canvas at the slot rect
      const photo = slot.photo
      const tmp = document.createElement('canvas')
      tmp.width = Math.ceil(slotW)
      tmp.height = Math.ceil(slotH)
      const tctx = tmp.getContext('2d')
      if (!tctx) continue

      try {
        const img = await loadImage(photo.publicUrl)
        const sx = tmp.width / photo.width
        const sy = tmp.height / photo.height
        const coverScale = Math.max(sx, sy) * photo.scale
        const drawW = photo.width * coverScale
        const drawH = photo.height * coverScale
        // Center, then shift by cropX/cropY (pan offsets, -0.5..0.5 of
        // slot dimension — same convention as LetterMaskOverlay)
        const drawX = (tmp.width - drawW) / 2 - photo.cropX * tmp.width
        const drawY = (tmp.height - drawH) / 2 - photo.cropY * tmp.height
        tctx.drawImage(img, drawX, drawY, drawW, drawH)
      } catch (err) {
        // If the photo fails to load, fall back to the slot color so the
        // export still produces a usable poster instead of throwing.
        console.warn('[usePhotoExport] photo load failed, falling back to color:', err)
        tctx.fillStyle = slot.color ?? defaultSlotColor
        tctx.fillRect(0, 0, tmp.width, tmp.height)
      }

      tctx.globalCompositeOperation = 'destination-in'
      tctx.fillStyle = '#000'
      tctx.font = `400 ${fontSize}px ${maskFontFamily}`
      tctx.textAlign = 'center'
      tctx.textBaseline = 'middle'
      tctx.fillText(slot.char, tmp.width / 2, tmp.height / 2)

      ctx.drawImage(tmp, slotX, slotY)
    } else {
      // No photo — fill the glyph directly in the slot color
      ctx.fillStyle = slot.color ?? defaultSlotColor
      ctx.font = `400 ${fontSize}px ${maskFontFamily}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(slot.char, cx, cy)
    }
  }
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
    await ensureFontsLoaded(maskFontFamily, textBlocks)

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

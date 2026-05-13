'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  useWeddingEditorStore,
  type SlotIndex,
  type WeddingSlot,
} from '@/hooks/useWeddingEditorStore'
import { useEditorStore } from '@/hooks/useEditorStore'
import { effectiveDimensions, effectiveLogicalCanvas, PRINT_FORMATS } from '@/lib/print-formats'
import { slotLayoutFromOrientation } from '@/lib/wedding-layout'
import { WeddingSlotMap } from './WeddingSlotMap'

/**
 * Heart-Maske als CSS-Mask-Image. Pfad-Daten aus `MAP_MASKS['heart-single']`
 * (siehe `src/lib/map-masks.ts`), aber mit engerer viewBox (38 70 520 480
 * statt 0 0 595.3 841.9), damit `maskSize: contain` das Herz die volle
 * Fläche eines aspect-[520/480]-Containers ausfüllt. Pfad selbst unverändert
 * — gleicher Herz-Pfad wie der Single-Map- und Star-Map-Editor.
 */
const HEART_SVG_DATA = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='38 70 520 480'><path d='M298 543 C 298 543, 48 375, 48 228 C 48 108, 198 60, 298 178 C 398 60, 548 108, 548 228 C 548 375, 298 543, 298 543 Z' fill='black'/></svg>`
const HEART_MASK_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(HEART_SVG_DATA)}")`
const HEART_ASPECT_CLASS = 'aspect-[520/480]'

const HEART_MASK_STYLE: React.CSSProperties = {
  maskImage: HEART_MASK_URL,
  maskRepeat: 'no-repeat',
  maskPosition: 'center',
  maskSize: '100% 100%',
  WebkitMaskImage: HEART_MASK_URL,
  WebkitMaskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  WebkitMaskSize: '100% 100%',
}

/**
 * Eine Slot-Kachel innerhalb des Posters. Lebt im LOGICAL-Pixel-Raum
 * (PROJ-37) — alle Größen sind in logischen Pixeln, die der äußere Wrapper
 * via CSS-Transform-Scale auf den Bildschirm fittet. Labels + Datum stehen
 * UNTER dem Herz (Etsy-Bestseller-Pattern, vom User bestätigt).
 */
function SlotTile({
  index,
  slot,
  active,
  onClick,
  fontScale,
}: {
  index: SlotIndex
  slot: WeddingSlot
  active: boolean
  onClick: () => void
  /** Multiplier für Typografie — relativ zu A4 (=1.0). A3 ≈ 1.41, A2 ≈ 2.0. */
  fontScale: number
}) {
  const t = useTranslations('wedding')
  const formattedDate = slot.date
    ? new Date(slot.date).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  // Inline-Skalierung statt Tailwind-Klassen, weil Tailwind keine
  // dynamisch berechneten font-sizes generiert.
  const labelStyle: React.CSSProperties = { fontSize: `${18 * fontScale}px`, lineHeight: 1.25 }
  const dateStyle: React.CSSProperties = { fontSize: `${12 * fontScale}px`, lineHeight: 1.3 }
  const placeholderStyle: React.CSSProperties = { fontSize: `${12 * fontScale}px` }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-full w-full flex-col items-center justify-center text-center transition-colors rounded-md',
        active ? 'bg-primary/5' : 'hover:bg-muted/30',
      )}
      aria-label={t(`tabSlot${index + 1}` as 'tabSlot1' | 'tabSlot2' | 'tabSlot3')}
      style={{ gap: 8 * fontScale, padding: 8 * fontScale }}
    >
      {/* Map area — natural heart aspect (~1.08:1), centered, maximum size
          that fits within the slot. Heart-Maske clippt die MapTiler-Karte. */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center">
        <div
          className={cn('relative max-h-full max-w-full', HEART_ASPECT_CLASS)}
          style={{ height: '100%', ...HEART_MASK_STYLE }}
        >
          <WeddingSlotMap index={index} />
          {!slot.locationName && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-muted/30 pointer-events-none"
              style={placeholderStyle}
            >
              <span className="text-muted-foreground px-2 text-center">
                {t('emptySlotPlaceholder')}
              </span>
            </div>
          )}
        </div>
      </div>

      {slot.label && (
        <div
          className="font-serif text-foreground/90 line-clamp-2 px-2"
          style={labelStyle}
        >
          {slot.label}
        </div>
      )}

      {formattedDate && (
        <div
          className="text-muted-foreground tracking-wide"
          style={dateStyle}
        >
          {formattedDate}
        </div>
      )}
    </button>
  )
}

export function WeddingCanvas() {
  const slots = useWeddingEditorStore((s) => s.slots)
  const activeSlotIndex = useWeddingEditorStore((s) => s.activeSlotIndex)
  const setActiveSlotIndex = useWeddingEditorStore((s) => s.setActiveSlotIndex)
  const coupleNames = useWeddingEditorStore((s) => s.coupleNames)
  const weddingDate = useWeddingEditorStore((s) => s.weddingDate)
  const printFormat = useEditorStore((s) => s.printFormat)
  const orientation = useEditorStore((s) => s.orientation)
  const t = useTranslations('wedding')

  const wrapperRef = useRef<HTMLDivElement>(null)
  const [visualSize, setVisualSize] = useState({ width: 0, height: 0 })

  // PROJ-37: LOGICAL Canvas — die virtuelle Pixel-Fläche, auf der MapTiler
  // rendert. A4 = 800×1131, A3 = 1131×1600, A2 = 1600×2263. Größeres Format
  // → mehr Geografie sichtbar bei gleichem Zoom.
  const logicalCanvas = effectiveLogicalCanvas(printFormat, orientation)
  const visualScale = visualSize.width > 0 ? visualSize.width / logicalCanvas.width : 1
  const dims = effectiveDimensions(PRINT_FORMATS[printFormat], orientation)
  const ratio = dims.widthMm / dims.heightMm

  const isHorizontal = slotLayoutFromOrientation(orientation) === 'horizontal-3'

  // Typografie-Scale relativ zu A4 (logical width 800 oder 1131 je nach
  // orientation). 1.0 für A4 portrait, größer für A3/A2.
  const fontScale = logicalCanvas.width / (orientation === 'landscape' ? 1131 : 800)

  // ResizeObserver auf den Wrapper — wenn sich das Editor-Layout ändert
  // (Sidebar auf-/zugeklappt, Browser resize, Tab-Sheet auf Mobile), passt
  // sich visualSize an, sodass das Poster maximal in den verfügbaren Platz
  // skaliert mit korrektem Seitenverhältnis.
  useEffect(() => {
    if (!wrapperRef.current) return
    const padding = 32 // bg-muted padding around the poster card
    const compute = (width: number, height: number) => {
      const availW = width - padding
      const availH = height - padding
      if (availW <= 0 || availH <= 0) return
      if (availW / ratio <= availH) {
        setVisualSize({ width: availW, height: availW / ratio })
      } else {
        setVisualSize({ width: availH * ratio, height: availH })
      }
    }
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      compute(width, height)
    })
    observer.observe(wrapperRef.current)
    compute(wrapperRef.current.clientWidth, wrapperRef.current.clientHeight)
    return () => observer.disconnect()
  }, [ratio])

  const formattedWeddingDate = weddingDate
    ? new Date(weddingDate).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  // Logical-Pixel-Sizen für den Inhalt:
  const outerPad = 48 * fontScale
  const footerHeight = 180 * fontScale
  const slotGap = 24 * fontScale

  return (
    <div
      ref={wrapperRef}
      className="flex-1 min-h-0 bg-muted/30 flex items-center justify-center p-4 md:p-8 overflow-hidden"
    >
      {visualSize.width > 0 && (
        // Visual Wrapper — die Größe, die der Customer am Bildschirm sieht.
        // Die Layout-Engine reserviert diese Fläche; der Inhalt wird per
        // transform-scale aus der Logical Canvas reingerechnet.
        <div
          className="flex-none relative"
          style={{ width: visualSize.width, height: visualSize.height }}
        >
          <div
            className="absolute top-0 left-0 bg-white shadow-md flex flex-col overflow-hidden"
            style={{
              width: logicalCanvas.width,
              height: logicalCanvas.height,
              transform: `scale(${visualScale})`,
              transformOrigin: 'top left',
            }}
          >
            {/* Slot stack — flex-1 fills space above the footer */}
            <div
              className={cn(
                'flex-1 min-h-0 flex',
                isHorizontal ? 'flex-row' : 'flex-col',
              )}
              style={{
                gap: slotGap,
                paddingLeft: outerPad,
                paddingRight: outerPad,
                paddingTop: outerPad,
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={cn(isHorizontal ? 'flex-1 min-w-0' : 'flex-1 min-h-0 w-full')}
                >
                  <SlotTile
                    index={i as SlotIndex}
                    slot={slots[i]}
                    active={activeSlotIndex === i}
                    onClick={() => setActiveSlotIndex(i as SlotIndex)}
                    fontScale={fontScale}
                  />
                </div>
              ))}
            </div>

            {/* Globaler Footer: Paarnamen + Hochzeitsdatum, unten zentriert */}
            <div
              className="flex flex-col items-center justify-center text-center"
              style={{
                height: footerHeight,
                paddingLeft: outerPad,
                paddingRight: outerPad,
                paddingBottom: outerPad,
                gap: 6 * fontScale,
              }}
            >
              {coupleNames ? (
                <div
                  className="font-serif text-foreground/90 tracking-wide"
                  style={{ fontSize: `${48 * fontScale}px`, lineHeight: 1.1 }}
                >
                  {coupleNames}
                </div>
              ) : (
                <div
                  className="font-serif text-muted-foreground/40 italic"
                  style={{ fontSize: `${48 * fontScale}px`, lineHeight: 1.1 }}
                >
                  {t('coupleNamesPlaceholder')}
                </div>
              )}
              {formattedWeddingDate && (
                <div
                  className="text-muted-foreground tracking-wide"
                  style={{ fontSize: `${20 * fontScale}px`, lineHeight: 1.3 }}
                >
                  {formattedWeddingDate}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

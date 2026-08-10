'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  DTF_MIN_DPI_WARNING,
  DTF_MIN_ELEMENT_WIDTH_MM,
  DTF_SHEET_FORMATS,
  DTF_SHEET_MARGIN_MM,
} from '@/lib/dtf-constants'
import {
  useDtfStore,
  activeSheetOf,
  boundingBoxMm,
  elementDpi,
  elementHeightMm,
  isOutsideSheet,
  type DtfElement,
} from '@/hooks/useDtfStore'
import { cn } from '@/lib/utils'

/**
 * PROJ-55: Der Transferbogen als Arbeitsfläche.
 *
 * Der Bogen wird maßstabsgetreu dargestellt: Ein Faktor `pxPerMm` bildet
 * Millimeter auf Bildschirmpixel ab, alles andere rechnet ausschließlich in
 * Millimetern. Das hält Vorschau und spätere Druckdatei zwangsläufig
 * deckungsgleich — bei einem Produkt, bei dem der Kunde auf Basis der
 * Vorschau eine verbindliche Druckfreigabe erteilt, ist das keine
 * Fleißaufgabe, sondern die Kernanforderung.
 *
 * Zeigt das Karomuster für Transparenz: Der Bogen ist Folie, kein Papier.
 * Weiße Flächen im Motiv werden gedruckt und müssen deshalb von
 * „nichts" unterscheidbar sein.
 *
 * Interaktion über Pointer-Events, damit Maus und Touch denselben Pfad
 * nehmen. Kein zusätzliches Paket.
 */

/** Breite der Linealstreifen an Ober- und linker Kante, in Bildschirmpixeln. */
const RULER_PX = 22

/**
 * Beschriftungsschritt in Zentimetern. Bei kleinem Maßstab würde alle 5 cm
 * eine unlesbare Zahlenkolonne entstehen, dann wird auf 10 cm ausgedünnt.
 */
function labelStepCm(cmPx: number): number {
  return cmPx * 5 >= 28 ? 5 : 10
}

type DragMode =
  | { kind: 'move'; id: string; startX: number; startY: number; origX: number; origY: number }
  | {
      kind: 'resize'
      id: string
      startX: number
      startY: number
      origWidthMm: number
      centerX: number
      centerY: number
      startDist: number
    }
  | {
      kind: 'rotate'
      id: string
      centerX: number
      centerY: number
      startAngle: number
      origRotation: number
    }

export function DtfSheetCanvas() {
  const t = useTranslations('dtfEditor')
  const locale = useLocale()
  const containerRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const [pxPerMm, setPxPerMm] = useState(1)
  const dragRef = useRef<DragMode | null>(null)

  const activeSheet = useDtfStore(activeSheetOf)
  const showGrid = useDtfStore((s) => s.showGrid)
  const selectedId = useDtfStore((s) => s.selectedId)
  const select = useDtfStore((s) => s.select)
  const updateElement = useDtfStore((s) => s.updateElement)
  const bringToFront = useDtfStore((s) => s.bringToFront)

  const sheetFormat = activeSheet.format
  const elements = activeSheet.elements
  const sheet = DTF_SHEET_FORMATS[sheetFormat]
  /** Bildschirmpixel je Zentimeter — Taktmaß des Rasters. */
  const cmPx = pxPerMm * 10

  // Bogen in den verfügbaren Platz einpassen. Neu berechnet bei
  // Größenänderung des Fensters und bei Formatwechsel.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const fit = () => {
      const padding = 32
      // Platz für die Lineale abziehen, sonst würde der Bogen sie aus dem
      // sichtbaren Bereich schieben.
      const availableW = el.clientWidth - padding * 2 - RULER_PX
      const availableH = el.clientHeight - padding * 2 - RULER_PX
      if (availableW <= 0 || availableH <= 0) return
      setPxPerMm(Math.min(availableW / sheet.widthMm, availableH / sheet.heightMm))
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    return () => observer.disconnect()
  }, [sheet.widthMm, sheet.heightMm])

  const mmFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const rect = sheetRef.current?.getBoundingClientRect()
      if (!rect) return { xMm: 0, yMm: 0 }
      return {
        xMm: (clientX - rect.left) / pxPerMm,
        yMm: (clientY - rect.top) / pxPerMm,
      }
    },
    [pxPerMm],
  )

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      e.preventDefault()

      if (drag.kind === 'move') {
        const dxMm = (e.clientX - drag.startX) / pxPerMm
        const dyMm = (e.clientY - drag.startY) / pxPerMm
        updateElement(drag.id, { xMm: drag.origX + dxMm, yMm: drag.origY + dyMm })
        return
      }

      if (drag.kind === 'resize') {
        // Skalierung über den Abstand zum Mittelpunkt: funktioniert auch
        // bei gedrehten Elementen intuitiv, weil die Griff-Richtung
        // mitdreht.
        const dist = Math.hypot(e.clientX - drag.centerX, e.clientY - drag.centerY)
        const factor = dist / Math.max(1, drag.startDist)
        updateElement(drag.id, {
          widthMm: Math.max(DTF_MIN_ELEMENT_WIDTH_MM, drag.origWidthMm * factor),
        })
        return
      }

      const angle = Math.atan2(e.clientY - drag.centerY, e.clientX - drag.centerX)
      let deg = drag.origRotation + ((angle - drag.startAngle) * 180) / Math.PI
      // Bei gedrückter Shift-Taste in 15°-Schritten — hilft, ein Motiv
      // exakt gerade oder auf 90° zu stellen.
      if (e.shiftKey) deg = Math.round(deg / 15) * 15
      updateElement(drag.id, { rotationDeg: ((deg % 360) + 360) % 360 })
    },
    [pxPerMm, updateElement],
  )

  const endDrag = useCallback(() => {
    dragRef.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', endDrag)
    window.removeEventListener('pointercancel', endDrag)
  }, [onPointerMove])

  const beginDrag = useCallback(
    (mode: DragMode) => {
      dragRef.current = mode
      window.addEventListener('pointermove', onPointerMove, { passive: false })
      window.addEventListener('pointerup', endDrag)
      window.addEventListener('pointercancel', endDrag)
    },
    [onPointerMove, endDrag],
  )

  useEffect(() => endDrag, [endDrag])

  function elementCenterClient(el: DtfElement) {
    const rect = sheetRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: rect.left + (el.xMm + el.widthMm / 2) * pxPerMm,
      y: rect.top + (el.yMm + elementHeightMm(el) / 2) * pxPerMm,
    }
  }

  const sorted = [...elements].sort((a, b) => a.z - b.z)

  // Eine Nachkommastelle reicht: Der Kunde soll die Druckgröße abschätzen,
  // nicht auf Zehntelmillimeter planen. Locale-formatiert, damit im
  // Deutschen ein Komma steht.
  const cm = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 flex items-center justify-center bg-muted/40 overflow-hidden"
      onPointerDown={(e) => {
        // Klick auf den Hintergrund hebt die Auswahl auf.
        if (e.target === e.currentTarget) select(null)
      }}
    >
      {/* Lineale rahmen den Bogen ein, statt in ihm zu liegen: Zahlen auf
          der Arbeitsfläche würden mit den Motiven kollidieren, gerade dann,
          wenn der Bogen voll ist. Raster im Bogen und Lineale außen hängen
          am selben Schalter — beides gehört zusammen. */}
      <div
        style={{
          display: 'grid',
          // Der Linealstreifen ist IMMER reserviert, auch wenn er leer
          // bleibt. Würde die Breite mit umgeschaltet, spränge der Bogen
          // beim Ein- und Ausschalten um die Linealbreite nach links oben —
          // das Raster ist eine Anzeigehilfe und darf das Layout nicht
          // bewegen.
          gridTemplateColumns: `${RULER_PX}px auto`,
          gridTemplateRows: `${RULER_PX}px auto`,
        }}
      >
        {/* Alle vier Zellen bekommen ihre Position ausdrücklich zugewiesen.
            Ohne das landet der Bogen bei ausgeschaltetem Raster per
            Auto-Platzierung in Zeile 1 — die dann 0 px hoch ist — und
            rutscht um seine eigene Höhe nach unten aus der Zentrierung. */}
        <div style={{ gridArea: '1 / 1' }} />

        <div
          className="relative select-none"
          style={{ gridArea: '1 / 2', width: sheet.widthMm * pxPerMm, height: RULER_PX }}
        >
          {showGrid && (
            <>
              {Array.from(
                { length: Math.floor(sheet.widthMm / 10 / labelStepCm(cmPx)) },
                (_, i) => (i + 1) * labelStepCm(cmPx),
              ).map((valueCm) => (
                <div
                  key={`rt-${valueCm}`}
                  className="absolute bottom-0 flex flex-col items-center"
                  style={{ left: valueCm * cmPx, transform: 'translateX(-50%)' }}
                >
                  <span className="text-[10px] leading-none text-muted-foreground tabular-nums">
                    {valueCm}
                  </span>
                  <span className="mt-0.5 block h-1.5 w-px bg-muted-foreground/50" />
                </div>
              ))}
              <span className="absolute right-0 bottom-0 text-[10px] leading-none text-muted-foreground/70">
                cm
              </span>
            </>
          )}
        </div>

        <div
          className="relative select-none"
          style={{ gridArea: '2 / 1', width: RULER_PX, height: sheet.heightMm * pxPerMm }}
        >
          {showGrid &&
            Array.from(
              { length: Math.floor(sheet.heightMm / 10 / labelStepCm(cmPx)) },
              (_, i) => (i + 1) * labelStepCm(cmPx),
            ).map((valueCm) => (
              <div
                key={`rl-${valueCm}`}
                className="absolute right-0 flex items-center"
                style={{ top: valueCm * cmPx, transform: 'translateY(-50%)' }}
              >
                <span className="text-[10px] leading-none text-muted-foreground tabular-nums">
                  {valueCm}
                </span>
                <span className="ml-0.5 block w-1.5 h-px bg-muted-foreground/50" />
              </div>
            ))}
        </div>

      <div
        ref={sheetRef}
        className="relative shadow-lg ring-1 ring-border"
        style={{
          gridArea: '2 / 2',
          width: sheet.widthMm * pxPerMm,
          height: sheet.heightMm * pxPerMm,
          // Karomuster = Transparenz. Der Bogen ist Folie; was hier
          // durchscheint, wird nicht gedruckt.
          backgroundColor: '#fff',
          backgroundImage:
            'linear-gradient(45deg, #e8e8e8 25%, transparent 25%), linear-gradient(-45deg, #e8e8e8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e8e8e8 75%), linear-gradient(-45deg, transparent 75%, #e8e8e8 75%)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
        }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) select(null)
        }}
      >
        {/* Zentimeterraster. Liegt über dem Karomuster und unter den
            Motiven, damit es die Motive nicht überzeichnet.

            Zwei Dichten: dünne Linien im Zentimetertakt, kräftigere alle
            5 cm zur groben Orientierung. Unterhalb von 8 Bildschirmpixeln
            je Zentimeter werden die feinen Linien ausgeblendet — bei einem
            40x50-Bogen auf einem kleinen Fenster wären sie sonst ein
            grauer Schleier statt einer Hilfe. */}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              zIndex: 0,
              backgroundImage: [
                cmPx >= 8
                  ? 'repeating-linear-gradient(to right, rgba(0,0,0,0.10) 0 1px, transparent 1px var(--dtf-cm))'
                  : null,
                cmPx >= 8
                  ? 'repeating-linear-gradient(to bottom, rgba(0,0,0,0.10) 0 1px, transparent 1px var(--dtf-cm))'
                  : null,
                'repeating-linear-gradient(to right, rgba(0,0,0,0.22) 0 1px, transparent 1px var(--dtf-5cm))',
                'repeating-linear-gradient(to bottom, rgba(0,0,0,0.22) 0 1px, transparent 1px var(--dtf-5cm))',
              ]
                .filter(Boolean)
                .join(', '),
              ['--dtf-cm' as string]: `${cmPx}px`,
              ['--dtf-5cm' as string]: `${cmPx * 5}px`,
            }}
          />
        )}

        {/* Sicherheitsabstand als Hilfslinie. Nicht bedruckbarer Rand des
            Druckers plus Puffer zum Zuschneiden. */}
        <div
          className="absolute border border-dashed border-primary/40 pointer-events-none"
          style={{
            left: DTF_SHEET_MARGIN_MM * pxPerMm,
            top: DTF_SHEET_MARGIN_MM * pxPerMm,
            right: DTF_SHEET_MARGIN_MM * pxPerMm,
            bottom: DTF_SHEET_MARGIN_MM * pxPerMm,
          }}
        />

        {sorted.map((el) => {
          const heightMm = elementHeightMm(el)
          const outside = isOutsideSheet(el, sheetFormat)
          const isSelected = el.id === selectedId

          return (
            <div
              key={el.id}
              className={cn(
                'absolute touch-none select-none',
                isSelected ? 'cursor-grabbing' : 'cursor-grab',
              )}
              style={{
                left: el.xMm * pxPerMm,
                top: el.yMm * pxPerMm,
                width: el.widthMm * pxPerMm,
                height: heightMm * pxPerMm,
                transform: `rotate(${el.rotationDeg}deg)`,
                zIndex: el.z,
              }}
              onPointerDown={(e) => {
                e.stopPropagation()
                select(el.id)
                bringToFront(el.id)
                beginDrag({
                  kind: 'move',
                  id: el.id,
                  startX: e.clientX,
                  startY: e.clientY,
                  origX: el.xMm,
                  origY: el.yMm,
                })
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={el.previewUrl}
                alt=""
                draggable={false}
                className="w-full h-full object-fill pointer-events-none"
              />

              <div
                className={cn(
                  'absolute inset-0 pointer-events-none border-2',
                  outside
                    ? 'border-destructive'
                    : isSelected
                      ? 'border-primary'
                      : 'border-transparent',
                )}
              />

              {isSelected && (
                <>
                  {/* Skalieren — unten rechts, der vertraute Ort. */}
                  <button
                    type="button"
                    aria-label={t('handleResize')}
                    className="absolute -right-2 -bottom-2 h-5 w-5 rounded-full bg-primary border-2 border-white shadow touch-none cursor-nwse-resize"
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      const center = elementCenterClient(el)
                      beginDrag({
                        kind: 'resize',
                        id: el.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        origWidthMm: el.widthMm,
                        centerX: center.x,
                        centerY: center.y,
                        startDist: Math.hypot(e.clientX - center.x, e.clientY - center.y),
                      })
                    }}
                  />
                  {/* Drehen — oben mittig, abgesetzt vom Motiv. */}
                  <button
                    type="button"
                    aria-label={t('handleRotate')}
                    className="absolute left-1/2 -translate-x-1/2 -top-7 h-5 w-5 rounded-full bg-white border-2 border-primary shadow touch-none cursor-grab"
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      const center = elementCenterClient(el)
                      beginDrag({
                        kind: 'rotate',
                        id: el.id,
                        centerX: center.x,
                        centerY: center.y,
                        startAngle: Math.atan2(e.clientY - center.y, e.clientX - center.x),
                        origRotation: el.rotationDeg,
                      })
                    }}
                  />
                </>
              )}
            </div>
          )
        })}

        {/* Größenangaben in einer eigenen, NICHT gedrehten Ebene.
            Innerhalb des Motiv-Containers würde die Schrift mitdrehen und
            bei 180° auf dem Kopf stehen. Positioniert wird unterhalb der
            gedrehten Hüllbox, damit die Angabe auch bei schräg gestellten
            Motiven nicht im Bild liegt.

            Die gedruckte Größe ist bei diesem Produkt die zentrale
            Information — der Kunde kauft keinen Bildschirmentwurf, sondern
            Zentimeter auf Folie. Deshalb an JEDEM Motiv, nicht nur am
            ausgewählten. */}
        {sorted.map((el) => {
          const box = boundingBoxMm(el)
          const cx = el.xMm + el.widthMm / 2
          const cy = el.yMm + elementHeightMm(el) / 2
          const dpi = elementDpi(el)
          const lowDpi = dpi < DTF_MIN_DPI_WARNING
          const isSelected = el.id === selectedId

          return (
            <div
              key={`label-${el.id}`}
              className={cn(
                'absolute pointer-events-none whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight shadow-sm',
                lowDpi
                  ? 'bg-destructive text-destructive-foreground'
                  : isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/90 text-foreground ring-1 ring-border',
              )}
              style={{
                left: cx * pxPerMm,
                top: (cy + box.height / 2) * pxPerMm + 6,
                transform: 'translateX(-50%)',
                zIndex: 1000 + el.z,
              }}
            >
              {cm.format(el.widthMm / 10)} × {cm.format(elementHeightMm(el) / 10)} cm
              {lowDpi && <span className="ml-1 opacity-90">· {dpi} dpi</span>}
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}

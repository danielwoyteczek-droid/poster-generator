'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  DTF_MIN_ELEMENT_WIDTH_MM,
  DTF_SHEET_FORMATS,
  DTF_SHEET_MARGIN_MM,
} from '@/lib/dtf-constants'
import {
  useDtfStore,
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
  const containerRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const [pxPerMm, setPxPerMm] = useState(1)
  const dragRef = useRef<DragMode | null>(null)

  const sheetFormat = useDtfStore((s) => s.sheetFormat)
  const elements = useDtfStore((s) => s.elements)
  const selectedId = useDtfStore((s) => s.selectedId)
  const select = useDtfStore((s) => s.select)
  const updateElement = useDtfStore((s) => s.updateElement)
  const bringToFront = useDtfStore((s) => s.bringToFront)

  const sheet = DTF_SHEET_FORMATS[sheetFormat]

  // Bogen in den verfügbaren Platz einpassen. Neu berechnet bei
  // Größenänderung des Fensters und bei Formatwechsel.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const fit = () => {
      const padding = 32
      const availableW = el.clientWidth - padding * 2
      const availableH = el.clientHeight - padding * 2
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

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 flex items-center justify-center bg-muted/40 overflow-hidden"
      onPointerDown={(e) => {
        // Klick auf den Hintergrund hebt die Auswahl auf.
        if (e.target === e.currentTarget) select(null)
      }}
    >
      <div
        ref={sheetRef}
        className="relative shadow-lg ring-1 ring-border"
        style={{
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
      </div>
    </div>
  )
}

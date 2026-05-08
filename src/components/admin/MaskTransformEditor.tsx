'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { invalidateCustomMasksCache } from '@/hooks/useCustomMasks'

interface MaskRow {
  id: string
  label: string
  mask_svg_url: string
  shape_viewbox: string | null
  transform_x: number
  transform_y: number
  transform_scale: number
  decoration_svg_url?: string | null
  decoration_transform_x?: number
  decoration_transform_y?: number
  decoration_transform_scale?: number
}

interface Props {
  mask: MaskRow | null
  /** Which transform we're editing — the mask silhouette itself or the
   *  decoration overlay (only valid when mask has decoration_svg_url). */
  target?: 'mask' | 'decoration'
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (updated: MaskRow) => void
}

const PREVIEW_W = 320
const PREVIEW_H = 453 // A4 portrait ratio
const SCALE_MIN = 0.2
const SCALE_MAX = 3
const SCALE_STEP = 0.01

// Decoration SVGs are designed against the A4 canvas the composer renders into.
const DECO_VIEWBOX_W = 595.3
const DECO_VIEWBOX_H = 841.9

/**
 * PROJ-38: Visual transform editor for a custom mask or its decoration.
 * Admin drags the silhouette inside an A4-shaped preview to reposition it,
 * uses the slider to resize. Translate/scale values persist as DB columns
 * applied by the composer at render time — no SVG re-export needed.
 *
 * `target='decoration'` switches the editor to operate on the decoration
 * overlay; the mask silhouette is rendered behind it as a positioning
 * reference (faded) so the admin can line them up.
 */
export function MaskTransformEditor({ mask, target = 'mask', open, onOpenChange, onSaved }: Props) {
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [scale, setScale] = useState(1)
  const [saving, setSaving] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const isDecoration = target === 'decoration'

  // viewBox dimensions — needed to map between preview pixels and storage units.
  // Mask uses its uploaded shape viewBox; decoration always lives in the A4
  // canvas coords the composer uses.
  const vb = isDecoration
    ? { w: DECO_VIEWBOX_W, h: DECO_VIEWBOX_H }
    : parseViewBox(mask?.shape_viewbox)

  // Reset state when opening with a different mask or target.
  useEffect(() => {
    if (!mask) return
    if (isDecoration) {
      setTx(mask.decoration_transform_x ?? 0)
      setTy(mask.decoration_transform_y ?? 0)
      setScale(mask.decoration_transform_scale ?? 1)
    } else {
      setTx(mask.transform_x ?? 0)
      setTy(mask.transform_y ?? 0)
      setScale(mask.transform_scale ?? 1)
    }
  }, [mask, isDecoration])

  if (!mask || !vb) return null
  if (isDecoration && !mask.decoration_svg_url) return null

  // Uniform px-per-storage-unit, matching the composer's uniform-fit. The
  // preview displays the SVG with object-fit: contain so the shape sits at
  // the same proportional position as on the actual poster (no anisotropic
  // stretch). Drag math uses this same uniform factor.
  const pxPerUnit = Math.min(PREVIEW_W / vb.w, PREVIEW_H / vb.h)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const startTx = tx
    const startTy = ty
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / pxPerUnit
      const dy = (ev.clientY - startY) / pxPerUnit
      setTx(startTx + dx)
      setTy(startTy + dy)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const handleReset = () => {
    setTx(0)
    setTy(0)
    setScale(1)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = isDecoration
        ? {
            decoration_transform_x: round2(tx),
            decoration_transform_y: round2(ty),
            decoration_transform_scale: round3(scale),
          }
        : {
            transform_x: round2(tx),
            transform_y: round2(ty),
            transform_scale: round3(scale),
          }
      const res = await fetch(`/api/admin/masks/${mask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Speichern fehlgeschlagen')
      invalidateCustomMasksCache()
      onSaved(data.mask)
      toast.success('Position gespeichert')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  const transformStyle = {
    transform: `translate(${tx * pxPerUnit}px, ${ty * pxPerUnit}px) scale(${scale})`,
    transformOrigin: '0 0' as const,
  }

  // Mask reference: when editing the decoration, render the mask underneath
  // (faded) with its saved transform applied so the admin sees the alignment
  // target. When editing the mask, no underlay needed.
  const maskVb = parseViewBox(mask.shape_viewbox)
  const maskUnderlayPxPerUnit = maskVb ? Math.min(PREVIEW_W / maskVb.w, PREVIEW_H / maskVb.h) : 0
  const maskUnderlayStyle = maskVb
    ? {
        transform: `translate(${(mask.transform_x ?? 0) * maskUnderlayPxPerUnit}px, ${(mask.transform_y ?? 0) * maskUnderlayPxPerUnit}px) scale(${mask.transform_scale ?? 1})`,
        transformOrigin: '0 0' as const,
      }
    : {}

  const dialogTitle = isDecoration
    ? `Decoration — ${mask.label}`
    : `Position & Größe — ${mask.label}`
  const dialogDescription = isDecoration
    ? 'Ziehe die Decoration über die (gedimmte) Maske, um sie auszurichten. Slider zum Skalieren.'
    : 'Ziehe die Maske im Vorschau-Rahmen, um sie zu verschieben. Slider darunter zum Skalieren.'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
          <div
            ref={previewRef}
            className="relative bg-muted/30 border border-dashed border-border overflow-hidden"
            style={{ width: PREVIEW_W, height: PREVIEW_H }}
          >
            {/* Mask underlay (only when editing decoration) — gives the admin
                a positioning reference. Rendered faded so the decoration on
                top stays the visual focus. */}
            {isDecoration && maskVb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mask.mask_svg_url}
                alt=""
                draggable={false}
                className="absolute top-0 left-0 pointer-events-none opacity-30"
                style={{
                  width: PREVIEW_W,
                  height: PREVIEW_H,
                  objectFit: 'contain',
                  objectPosition: 'top center',
                  ...maskUnderlayStyle,
                }}
              />
            )}

            {/* Draggable target — mask silhouette OR decoration overlay. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={isDecoration ? mask.decoration_svg_url ?? '' : mask.mask_svg_url}
              alt={mask.label}
              draggable={false}
              onPointerDown={handlePointerDown}
              className="absolute top-0 left-0 cursor-move select-none touch-none"
              style={{
                width: PREVIEW_W,
                height: PREVIEW_H,
                objectFit: isDecoration ? 'fill' : 'contain',
                objectPosition: 'top center',
                ...transformStyle,
              }}
            />
            {/* Centered cross-hair guide */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 w-px h-full bg-foreground/10" />
              <div className="absolute left-0 top-1/2 h-px w-full bg-foreground/10" />
            </div>
          </div>

          <div className="w-full space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Skalierung: {scale.toFixed(2)}×</Label>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px]"
                onClick={handleReset}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            </div>
            <Slider
              value={[scale]}
              min={SCALE_MIN}
              max={SCALE_MAX}
              step={SCALE_STEP}
              onValueChange={([v]) => setScale(v)}
            />
            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <span>x: {round2(tx)}</span>
              <span>y: {round2(ty)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function parseViewBox(vb: string | null | undefined): { w: number; h: number } | null {
  if (!vb) return null
  const parts = vb.split(/\s+/)
  const w = parseFloat(parts[2] ?? '0')
  const h = parseFloat(parts[3] ?? '0')
  return w > 0 && h > 0 ? { w, h } : null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

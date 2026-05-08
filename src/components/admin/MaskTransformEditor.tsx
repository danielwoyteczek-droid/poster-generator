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
}

interface Props {
  mask: MaskRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (updated: MaskRow) => void
}

const PREVIEW_W = 320
const PREVIEW_H = 453 // A4 portrait ratio
const SCALE_MIN = 0.2
const SCALE_MAX = 3
const SCALE_STEP = 0.01

/**
 * PROJ-38: Visual transform editor for a custom mask.
 * Admin drags the silhouette inside an A4-shaped preview to reposition it,
 * uses the slider to resize. Translate/scale values persist as DB columns
 * applied by the composer at render time — no SVG re-export needed.
 */
export function MaskTransformEditor({ mask, open, onOpenChange, onSaved }: Props) {
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [scale, setScale] = useState(1)
  const [saving, setSaving] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  // viewBox dimensions — needed to map between preview pixels and viewBox units.
  const vb = parseViewBox(mask?.shape_viewbox)

  // Reset state when opening with a different mask.
  useEffect(() => {
    if (!mask) return
    setTx(mask.transform_x ?? 0)
    setTy(mask.transform_y ?? 0)
    setScale(mask.transform_scale ?? 1)
  }, [mask])

  if (!mask || !vb) return null

  // px ↔ viewBox unit conversion. Preview height = PREVIEW_H px = vb.h * (PREVIEW_W/vb.w) px in viewBox units.
  // We anchor the preview to the viewBox aspect via mask-image render: the
  // viewBox is stretched to fit the A4-shaped preview, so 1 viewBox-x-unit
  // = PREVIEW_W/vb.w px and 1 viewBox-y-unit = PREVIEW_H/vb.h px.
  const pxPerUnitX = PREVIEW_W / vb.w
  const pxPerUnitY = PREVIEW_H / vb.h

  // Drag handler — converts pointer-pixel deltas into viewBox-unit deltas.
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const startTx = tx
    const startTy = ty
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / pxPerUnitX
      const dy = (ev.clientY - startY) / pxPerUnitY
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
      const res = await fetch(`/api/admin/masks/${mask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transform_x: round2(tx),
          transform_y: round2(ty),
          transform_scale: round3(scale),
        }),
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

  // Live-preview: render the mask SVG inside an A4-shaped box, with the
  // transform applied via CSS so it tracks the slider/drag without re-fetching.
  // The mask file's intrinsic viewBox is stretched to PREVIEW_W × PREVIEW_H
  // (matches how it's used as a CSS mask in the editor), so admins see exactly
  // what customers will see relative to the poster aspect.
  const transformStyle = {
    // CSS transform-origin defaults to center, but our DB values are SVG-style
    // (origin at top-left of viewBox), so we apply translate first then scale
    // around the SVG's top-left corner — mimicking the composer's behaviour.
    transform: `translate(${tx * pxPerUnitX}px, ${ty * pxPerUnitY}px) scale(${scale})`,
    transformOrigin: '0 0',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Position & Größe — {mask.label}</DialogTitle>
          <DialogDescription>
            Ziehe die Maske im Vorschau-Rahmen, um sie zu verschieben. Slider darunter zum Skalieren.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
          <div
            ref={previewRef}
            className="relative bg-muted/30 border border-dashed border-border overflow-hidden"
            style={{ width: PREVIEW_W, height: PREVIEW_H }}
          >
            {/* Draggable mask silhouette */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mask.mask_svg_url}
              alt={mask.label}
              draggable={false}
              onPointerDown={handlePointerDown}
              className="absolute top-0 left-0 cursor-move select-none touch-none"
              style={{
                width: PREVIEW_W,
                height: PREVIEW_H,
                ...transformStyle,
              }}
            />
            {/* Centered cross-hair guide for visual reference */}
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

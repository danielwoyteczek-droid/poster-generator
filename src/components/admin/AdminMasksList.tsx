'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Upload, Trash2, Info, ImagePlus, ImageOff, Move } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { invalidateCustomMasksCache } from '@/hooks/useCustomMasks'
import { MaskTransformEditor } from './MaskTransformEditor'
import {
  ALL_POSTER_TYPES,
  DEFAULT_APPLICABLE_POSTER_TYPES,
  POSTER_TYPE_LABELS,
  type PosterType,
} from '@/lib/poster-types'

interface CustomMaskRow {
  id: string
  mask_key: string
  label: string
  mask_svg_url: string
  shape_viewbox: string | null
  shape_markup: string | null
  is_public: boolean
  decoration_svg_url: string | null
  created_at: string
  // PROJ-38: visual transform editor — admin-set translate/scale offsets.
  transform_x: number
  transform_y: number
  transform_scale: number
  // PROJ-38 follow-up: per-mask decoration overlay offsets.
  decoration_transform_x: number
  decoration_transform_y: number
  decoration_transform_scale: number
  // PROJ-40: per-mask editor-variant gating.
  applicable_poster_types: PosterType[]
}

interface ReferencingPreset {
  id: string
  name: string
  status: string
}

export function AdminMasksList() {
  const [masks, setMasks] = useState<CustomMaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [label, setLabel] = useState('')
  const [maskFile, setMaskFile] = useState<File | null>(null)
  // PROJ-40: which editor variants the new mask is allowed in. Default = map
  // only, mirroring the historical assumption (the admin opts star-map/photo
  // in explicitly).
  const [uploadPosterTypes, setUploadPosterTypes] = useState<PosterType[]>(DEFAULT_APPLICABLE_POSTER_TYPES)

  // Per-mask in-flight flags so a row's spinner is independent.
  const [busyId, setBusyId] = useState<string | null>(null)

  // Delete-confirm state — populated when DELETE returned 409 with the
  // referencing presets list. The user then chooses to force-delete or cancel.
  const [deleteConfirm, setDeleteConfirm] = useState<{
    mask: CustomMaskRow
    refs: ReferencingPreset[]
  } | null>(null)

  // Hidden file input for decoration upload, focused per mask via ref.
  const decorationInputRef = useRef<HTMLInputElement>(null)
  const [decorationTargetId, setDecorationTargetId] = useState<string | null>(null)

  // PROJ-38: transform-editor modal state.
  const [transformTarget, setTransformTarget] = useState<CustomMaskRow | null>(null)
  const [transformMode, setTransformMode] = useState<'mask' | 'decoration'>('mask')

  const fetchMasks = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/masks')
    const data = await res.json()
    if (res.ok) setMasks(data.masks ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchMasks() }, [fetchMasks])

  const handleUpload = async () => {
    if (!label.trim() || !maskFile) {
      toast.error('Name und Masken-SVG erforderlich')
      return
    }
    if (uploadPosterTypes.length === 0) {
      toast.error('Mindestens ein Editor muss ausgewählt sein')
      return
    }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('label', label.trim())
      form.append('mask_svg', maskFile)
      // Send each selected poster-type as its own field; the API parses
      // formData.getAll('applicable_poster_types') so multiple values work.
      uploadPosterTypes.forEach((t) => form.append('applicable_poster_types', t))
      const res = await fetch('/api/admin/masks', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload fehlgeschlagen')
      invalidateCustomMasksCache()
      await fetchMasks()
      toast.success('Maske hinzugefügt')
      setUploadOpen(false)
      setLabel('')
      setMaskFile(null)
      setUploadPosterTypes(DEFAULT_APPLICABLE_POSTER_TYPES)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  // PROJ-40: toggle a single poster-type on a mask. Optimistic, with rollback
  // on error — same pattern as togglePublic. The CHECK constraint requires
  // ≥ 1 selected type, so we block the last toggle-off.
  const togglePosterType = async (mask: CustomMaskRow, type: PosterType, enabled: boolean) => {
    const next = enabled
      ? Array.from(new Set([...mask.applicable_poster_types, type]))
      : mask.applicable_poster_types.filter((t) => t !== type)
    if (next.length === 0) {
      toast.error('Mindestens ein Editor muss ausgewählt bleiben')
      return
    }
    setBusyId(mask.id)
    setMasks((prev) => prev.map((m) => (m.id === mask.id ? { ...m, applicable_poster_types: next } : m)))
    try {
      const res = await fetch(`/api/admin/masks/${mask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicable_poster_types: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Update fehlgeschlagen')
      }
      invalidateCustomMasksCache()
    } catch (err) {
      setMasks((prev) =>
        prev.map((m) => (m.id === mask.id ? { ...m, applicable_poster_types: mask.applicable_poster_types } : m)),
      )
      toast.error(err instanceof Error ? err.message : 'Update fehlgeschlagen')
    } finally {
      setBusyId(null)
    }
  }

  const togglePublic = async (mask: CustomMaskRow, next: boolean) => {
    setBusyId(mask.id)
    // Optimistic UI — flip immediately, revert on error.
    setMasks((prev) => prev.map((m) => (m.id === mask.id ? { ...m, is_public: next } : m)))
    try {
      const res = await fetch(`/api/admin/masks/${mask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: next }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Update fehlgeschlagen')
      }
      invalidateCustomMasksCache()
      toast.success(next ? 'Für Kunden sichtbar' : 'Für Kunden ausgeblendet')
    } catch (err) {
      setMasks((prev) => prev.map((m) => (m.id === mask.id ? { ...m, is_public: !next } : m)))
      toast.error(err instanceof Error ? err.message : 'Update fehlgeschlagen')
    } finally {
      setBusyId(null)
    }
  }

  const startDecorationUpload = (id: string) => {
    setDecorationTargetId(id)
    decorationInputRef.current?.click()
  }

  const handleDecorationFile = async (file: File) => {
    if (!decorationTargetId) return
    const targetId = decorationTargetId
    setDecorationTargetId(null)
    setBusyId(targetId)
    try {
      const form = new FormData()
      form.append('decoration_svg', file)
      const res = await fetch(`/api/admin/masks/${targetId}/decoration`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload fehlgeschlagen')
      invalidateCustomMasksCache()
      setMasks((prev) =>
        prev.map((m) =>
          m.id === targetId ? { ...m, decoration_svg_url: data.mask?.decoration_svg_url ?? null } : m,
        ),
      )
      toast.success('Decoration hochgeladen')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
    } finally {
      setBusyId(null)
    }
  }

  const removeDecoration = async (mask: CustomMaskRow) => {
    setBusyId(mask.id)
    try {
      const res = await fetch(`/api/admin/masks/${mask.id}/decoration`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Entfernen fehlgeschlagen')
      }
      invalidateCustomMasksCache()
      setMasks((prev) =>
        prev.map((m) => (m.id === mask.id ? { ...m, decoration_svg_url: null } : m)),
      )
      toast.success('Decoration entfernt')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Entfernen fehlgeschlagen')
    } finally {
      setBusyId(null)
    }
  }

  const tryDelete = async (mask: CustomMaskRow, force = false) => {
    setBusyId(mask.id)
    try {
      const url = force ? `/api/admin/masks/${mask.id}?force=true` : `/api/admin/masks/${mask.id}`
      const res = await fetch(url, { method: 'DELETE' })
      if (res.status === 409) {
        const data = await res.json()
        setDeleteConfirm({ mask, refs: data.referencingPresets ?? [] })
        return
      }
      if (!res.ok) throw new Error('Löschen fehlgeschlagen')
      invalidateCustomMasksCache()
      setMasks((prev) => prev.filter((m) => m.id !== mask.id))
      setDeleteConfirm(null)
      toast.success('Maske gelöscht')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Löschen fehlgeschlagen')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={decorationInputRef}
        type="file"
        accept=".svg,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleDecorationFile(file)
          e.target.value = ''
        }}
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5" />
          Lade reine Form-SVGs hoch. Decoration kannst du pro Maske separat hinzufügen — wird beim Auswählen der Maske automatisch über die Karte gelegt.
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Upload className="w-4 h-4 mr-1.5" />
              Neue Maske
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Neue Form hochladen</DialogTitle>
              <DialogDescription>
                Lade eine reine Form-SVG hoch. Außenbereich, Rahmen und Opacity werden im Editor gesteuert — nicht in der SVG selbst.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="mask-label">Name</Label>
                <Input
                  id="mask-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="z.B. Stern, Oval, Wellen-Form"
                  disabled={uploading}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mask-svg">Form-SVG</Label>
                <Input
                  id="mask-svg"
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={(e) => setMaskFile(e.target.files?.[0] ?? null)}
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground/70 leading-snug">
                  viewBox muss gesetzt sein (z.B. 0 0 595.3 841.9 für A4-Proportion).
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Verfügbar in</Label>
                <div className="flex flex-col gap-1.5 rounded-md border border-border bg-muted/30 p-2.5">
                  {ALL_POSTER_TYPES.map((type) => {
                    const checked = uploadPosterTypes.includes(type)
                    return (
                      <label key={type} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={uploading}
                          onChange={(e) => {
                            const enabled = e.target.checked
                            setUploadPosterTypes((prev) =>
                              enabled
                                ? Array.from(new Set([...prev, type]))
                                : prev.filter((t) => t !== type),
                            )
                          }}
                          className="w-4 h-4"
                        />
                        <span>{POSTER_TYPE_LABELS[type]}</span>
                      </label>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground/70 leading-snug">
                  Wählt aus, in welchen Editor-Varianten die Maske angeboten wird. Mindestens einer muss aktiv sein.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>
                Abbrechen
              </Button>
              <Button onClick={handleUpload} disabled={uploading || !label.trim() || !maskFile}>
                {uploading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                Hochladen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white border border-border p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground/70" />
        </div>
      ) : masks.length === 0 ? (
        <div className="rounded-xl bg-white border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
          Noch keine eigenen Masken. Lade deine erste hoch.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {masks.map((mask) => {
            const isBusy = busyId === mask.id
            return (
              <div key={mask.id} className="rounded-xl bg-white border border-border overflow-hidden">
                <MaskThumbnail mask={mask} />
                <div className="p-3 space-y-2.5">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground truncate">{mask.label}</h3>
                    <p className="text-[10px] text-muted-foreground/70 font-mono truncate">{mask.mask_key}</p>
                    {mask.shape_markup && (
                      <span className="inline-block mt-1 text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                        ready
                      </span>
                    )}
                  </div>

                  {/* PROJ-35: Customer-visibility toggle */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-foreground/70 cursor-pointer" htmlFor={`pub-${mask.id}`}>
                      Sichtbar für Kunden
                    </Label>
                    <Switch
                      id={`pub-${mask.id}`}
                      checked={mask.is_public}
                      disabled={isBusy}
                      onCheckedChange={(v) => togglePublic(mask, v)}
                    />
                  </div>

                  {/* PROJ-40: per-editor applicability — admin picks which
                      editor variants offer this mask in their picker. */}
                  <div className="space-y-1">
                    <span className="text-xs text-foreground/70">Verfügbar in</span>
                    <div className="flex flex-col gap-1">
                      {ALL_POSTER_TYPES.map((type) => {
                        const checked = mask.applicable_poster_types.includes(type)
                        return (
                          <label
                            key={type}
                            className="flex items-center gap-1.5 cursor-pointer text-[11px] text-foreground/80"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isBusy}
                              onChange={(e) => togglePosterType(mask, type, e.target.checked)}
                              className="w-3 h-3"
                            />
                            <span>{POSTER_TYPE_LABELS[type]}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* PROJ-35: Decoration controls */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-foreground/70">Decoration</span>
                    {mask.decoration_svg_url ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          disabled={isBusy}
                          onClick={() => startDecorationUpload(mask.id)}
                        >
                          <ImagePlus className="w-3 h-3 mr-1" />
                          Ersetzen
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-muted-foreground/70 hover:text-red-600"
                          disabled={isBusy}
                          onClick={() => removeDecoration(mask)}
                        >
                          <ImageOff className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        disabled={isBusy}
                        onClick={() => startDecorationUpload(mask.id)}
                      >
                        <ImagePlus className="w-3 h-3 mr-1" />
                        Hinzufügen
                      </Button>
                    )}
                  </div>

                  {/* PROJ-38: visual transform editor — drag + scale within an A4 preview. */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs"
                    disabled={isBusy}
                    onClick={() => { setTransformMode('mask'); setTransformTarget(mask) }}
                  >
                    <Move className="w-3.5 h-3.5 mr-1" />
                    Position & Größe
                  </Button>
                  {mask.decoration_svg_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-7 text-xs"
                      disabled={isBusy}
                      onClick={() => { setTransformMode('decoration'); setTransformTarget(mask) }}
                    >
                      <Move className="w-3.5 h-3.5 mr-1" />
                      Decoration ausrichten
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs text-muted-foreground/70 hover:text-red-600"
                    disabled={isBusy}
                    onClick={() => tryDelete(mask)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Löschen
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* PROJ-38: drag/scale editor modal — for mask silhouette OR decoration overlay. */}
      <MaskTransformEditor
        mask={transformTarget}
        target={transformMode}
        open={transformTarget !== null}
        onOpenChange={(open) => !open && setTransformTarget(null)}
        onSaved={(updated) => {
          setMasks((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)))
        }}
      />

      {/* PROJ-35: shown when DELETE returned 409 (mask is referenced by ≥ 1 preset). */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Maske wird in Presets verwendet</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm && (
                <>
                  „{deleteConfirm.mask.label}" wird in {deleteConfirm.refs.length}{' '}
                  {deleteConfirm.refs.length === 1 ? 'Preset' : 'Presets'} verwendet.
                  Beim Löschen fallen die betroffenen Presets bei Kunden auf eine leere Form zurück.
                  <ul className="mt-3 space-y-1 text-xs font-mono">
                    {deleteConfirm.refs.map((p) => (
                      <li key={p.id} className="flex items-center gap-2">
                        <span className="inline-block w-14 px-1.5 py-px rounded text-[10px] uppercase bg-muted text-muted-foreground">
                          {p.status}
                        </span>
                        {p.name}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && tryDelete(deleteConfirm.mask, true)}
              className="bg-red-600 hover:bg-red-700"
            >
              Trotzdem löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/**
 * PROJ-38: live-rendered mask thumbnail. Mirrors the composer's portrait
 * branch (uniform-fit into A4-portrait + admin transform on top), so the
 * thumbnail in the admin grid stays in sync with what the customer sees on
 * the actual poster after a transform-editor save.
 */
function MaskThumbnail({ mask }: { mask: CustomMaskRow }) {
  const vb = parseViewBoxDims(mask.shape_viewbox)
  if (!vb) {
    return (
      <div className="aspect-square bg-muted flex items-center justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mask.mask_svg_url} alt={mask.label} className="max-w-full max-h-full object-contain" />
      </div>
    )
  }
  // Container is A4-portrait so admin sees the figure at the same proportional
  // position as on the actual poster.
  const containerW = 200
  const containerH = Math.round(containerW * 841.9 / 595.3)
  const pxPerUnit = Math.min(containerW / vb.w, containerH / vb.h)
  const transform = `translate(${(mask.transform_x ?? 0) * pxPerUnit}px, ${(mask.transform_y ?? 0) * pxPerUnit}px) scale(${mask.transform_scale ?? 1})`
  return (
    <div
      className="bg-muted/30 mx-auto my-2 relative overflow-hidden"
      style={{ width: containerW, height: containerH }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mask.mask_svg_url}
        alt={mask.label}
        className="absolute top-0 left-0 select-none"
        style={{
          width: containerW,
          height: containerH,
          objectFit: 'contain',
          objectPosition: 'top center',
          transform,
          transformOrigin: '0 0',
        }}
      />
      {mask.decoration_svg_url && (() => {
        // Decoration SVGs are designed against the composer's A4 canvas,
        // so the px-per-unit factor maps decoration_transform values
        // (canvas units) to thumbnail pixels.
        const decoPxPerUnit = containerW / 595.3
        const dt = {
          x: mask.decoration_transform_x ?? 0,
          y: mask.decoration_transform_y ?? 0,
          scale: mask.decoration_transform_scale ?? 1,
        }
        const hasDt = dt.x !== 0 || dt.y !== 0 || dt.scale !== 1
        const decoStyle = hasDt
          ? {
              width: containerW,
              height: containerH,
              objectFit: 'fill' as const,
              transform: `translate(${dt.x * decoPxPerUnit}px, ${dt.y * decoPxPerUnit}px) scale(${dt.scale})`,
              transformOrigin: '0 0' as const,
            }
          : { width: containerW, height: containerH, objectFit: 'fill' as const }
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mask.decoration_svg_url}
            alt=""
            className="absolute top-0 left-0 pointer-events-none"
            style={decoStyle}
          />
        )
      })()}
    </div>
  )
}

function parseViewBoxDims(vb: string | null | undefined): { w: number; h: number } | null {
  if (!vb) return null
  const parts = vb.split(/\s+/)
  const w = parseFloat(parts[2] ?? '0')
  const h = parseFloat(parts[3] ?? '0')
  return w > 0 && h > 0 ? { w, h } : null
}

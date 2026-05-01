'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Upload, Trash2, Info, ImagePlus, ImageOff } from 'lucide-react'
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
    setUploading(true)
    try {
      const form = new FormData()
      form.append('label', label.trim())
      form.append('mask_svg', maskFile)
      const res = await fetch('/api/admin/masks', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload fehlgeschlagen')
      invalidateCustomMasksCache()
      await fetchMasks()
      toast.success('Maske hinzugefügt')
      setUploadOpen(false)
      setLabel('')
      setMaskFile(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
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
                <div className="aspect-square bg-muted flex items-center justify-center p-4 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mask.mask_svg_url} alt={mask.label} className="max-w-full max-h-full object-contain" />
                  {mask.decoration_svg_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mask.decoration_svg_url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain p-4 pointer-events-none"
                    />
                  )}
                </div>
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

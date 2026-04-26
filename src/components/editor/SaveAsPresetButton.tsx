'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { LayoutTemplate, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { useEditorStore } from '@/hooks/useEditorStore'
import { useStarMapStore } from '@/hooks/useStarMapStore'
import { useMapExport } from '@/hooks/useMapExport'
import { useStarMapExport } from '@/hooks/useStarMapExport'
import { downsizeDataURL } from '@/lib/image-utils'

function dataURLtoBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',')
  const mimeMatch = parts[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const bstr = atob(parts[1])
  const arr = new Uint8Array(bstr.length)
  for (let i = 0; i < bstr.length; i++) arr[i] = bstr.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

export function SaveAsPresetButton() {
  const { isAdmin } = useAuth()
  const pathname = usePathname()
  const posterType: 'map' | 'star-map' = pathname === '/star-map' ? 'star-map' : 'map'

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const mapExport = useMapExport()
  const starMapExport = useStarMapExport()
  const editor = useEditorStore()
  const starMap = useStarMapStore()
  const editingPreset = useEditorStore((s) => s.editingPreset)
  const setEditingPreset = useEditorStore((s) => s.setEditingPreset)

  if (!isAdmin) return null

  const canUpdate = editingPreset !== null && editingPreset.posterType === posterType

  const buildConfigJson = (): Record<string, unknown> => {
    if (posterType === 'star-map') {
      return {
        posterBgColor: starMap.posterBgColor,
        skyBgColor: starMap.skyBgColor,
        starColor: starMap.starColor,
        showConstellations: starMap.showConstellations,
        showMilkyWay: starMap.showMilkyWay,
        showSun: starMap.showSun,
        showMoon: starMap.showMoon,
        showPlanets: starMap.showPlanets,
        showCompass: starMap.showCompass,
        showGrid: starMap.showGrid,
        gridOpacity: starMap.gridOpacity,
        starDensity: starMap.starDensity,
        frameConfig: starMap.frameConfig,
        textBlocks: editor.textBlocks,
      }
    }
    return {
      styleId: editor.styleId,
      paletteId: editor.paletteId,
      customPaletteBase: editor.customPaletteBase,
      customPalette: editor.customPalette,
      streetLabelsVisible: editor.streetLabelsVisible,
      maskKey: editor.maskKey,
      marker: editor.marker,
      secondMarker: editor.secondMarker,
      secondMap: editor.secondMap,
      shapeConfig: editor.shapeConfig,
      textBlocks: editor.textBlocks,
      splitMode: editor.splitMode,
      splitPhotoZone: editor.splitPhotoZone,
      splitPhoto: editor.splitPhoto,
      layoutId: editor.layoutId,
      innerMarginMm: editor.innerMarginMm,
      zoom: editor.viewState.zoom,
      secondMapZoom: editor.secondMap.viewState.zoom,
    }
  }

  const PREVIEW_RENDER_TIMEOUT_MS = 15_000

  /**
   * Attempts to render + upload a fresh preview. Returns null when the render
   * times out or fails (typically Map.setStyle problems with custom palettes).
   * Caller falls back to the existing preview_image_url so the save itself
   * still goes through — losing work because the preview hangs is the worst
   * possible outcome.
   */
  const tryRenderAndUploadPreview = async (): Promise<string | null> => {
    try {
      const renderer = posterType === 'star-map' ? starMapExport.renderPreview : mapExport.renderPreview
      const renderPromise = renderer(editor.printFormat)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('PREVIEW_RENDER_TIMEOUT')),
          PREVIEW_RENDER_TIMEOUT_MS,
        ),
      )
      const fullDataUrl = await Promise.race([renderPromise, timeoutPromise])
      const smallDataUrl = await downsizeDataURL(fullDataUrl, 600, 0.85)
      const blob = dataURLtoBlob(smallDataUrl)
      const form = new FormData()
      form.append('file', blob, 'preview.jpg')
      const uploadRes = await fetch('/api/admin/presets/upload-preview', { method: 'POST', body: form })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload fehlgeschlagen')
      return uploadData.url as string
    } catch (err) {
      console.warn('[SaveAsPresetButton] preview render/upload failed:', err)
      return null
    }
  }

  const handleSaveAsNew = async () => {
    if (!name.trim()) {
      toast.error('Name ist erforderlich')
      return
    }
    setSaving(true)
    try {
      const previewUrl = await tryRenderAndUploadPreview()
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        poster_type: posterType,
        config_json: buildConfigJson(),
      }
      if (previewUrl) body.preview_image_url = previewUrl

      const createRes = await fetch('/api/admin/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const createData = await createRes.json()
      if (!createRes.ok) throw new Error(createData.error || 'Erstellen fehlgeschlagen')

      if (previewUrl) {
        toast.success('Preset als Draft gespeichert')
      } else {
        toast.success('Preset als Draft gespeichert', {
          description: 'Vorschaubild konnte nicht erzeugt werden — Preset wurde ohne neues Bild angelegt.',
        })
      }
      setEditingPreset(null)
      setOpen(false)
      setName('')
      setDescription('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingPreset) return
    setSaving(true)
    try {
      const previewUrl = await tryRenderAndUploadPreview()
      // Update only the config (and optionally the preview). Name + description
      // were set when the preset was created and stay as-is — admin renames
      // happen in the admin list, not via this toolbar button.
      const body: Record<string, unknown> = {
        config_json: buildConfigJson(),
      }
      if (previewUrl) body.preview_image_url = previewUrl

      const patchRes = await fetch(`/api/admin/presets/${editingPreset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const patchData = await patchRes.json()
      if (!patchRes.ok) throw new Error(patchData.error || 'Aktualisieren fehlgeschlagen')

      if (previewUrl) {
        toast.success(`Preset „${editingPreset.name}" aktualisiert`)
      } else {
        toast.success(`Preset „${editingPreset.name}" aktualisiert`, {
          description: 'Vorschaubild konnte nicht erneuert werden — altes Bild bleibt erhalten.',
        })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  // Edit mode: clicking the toolbar button saves directly. The dialog only
  // pops up for fresh designs that need a name. Renames or "save as new copy"
  // happen through the admin list (PROJ-9 tooling), not the editor toolbar.
  const handleToolbarClick = () => {
    if (canUpdate) {
      handleUpdate()
    } else {
      setOpen(true)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        onClick={handleToolbarClick}
        disabled={canUpdate && saving}
        title={canUpdate ? `Änderungen an „${editingPreset!.name}" speichern` : 'Als Design-Preset speichern (Admin)'}
      >
        {canUpdate && saving ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : canUpdate ? (
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
        ) : (
          <LayoutTemplate className="w-3.5 h-3.5 mr-1.5" />
        )}
        {canUpdate ? (saving ? 'Speichere…' : 'Preset speichern') : 'Als Preset'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Als Preset speichern</DialogTitle>
            <DialogDescription>
              Aktuelles Design als wiederverwendbare Vorlage speichern. Wird zunächst als <strong>Draft</strong> angelegt — erst nach Veröffentlichung sichtbar für Kunden.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="preset-name">Name</Label>
              <Input
                id="preset-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Klassisch Schwarz-Weiß"
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preset-description">Beschreibung (optional)</Label>
              <Textarea
                id="preset-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kurze Beschreibung, z.B. für welchen Anlass geeignet"
                rows={3}
                disabled={saving}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleSaveAsNew} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              Als Draft speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

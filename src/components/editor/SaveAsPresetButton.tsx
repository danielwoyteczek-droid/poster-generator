'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { LayoutTemplate, Loader2 } from 'lucide-react'
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

  if (!isAdmin) return null

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name ist erforderlich')
      return
    }
    setSaving(true)
    try {
      // 1) Build the preset's config_json from current editor state
      let configJson: Record<string, unknown>
      if (posterType === 'star-map') {
        configJson = {
          posterBgColor: starMap.posterBgColor,
          skyBgColor: starMap.skyBgColor,
          starColor: starMap.starColor,
          showConstellations: starMap.showConstellations,
          showMilkyWay: starMap.showMilkyWay,
          showSun: starMap.showSun,
          showMoon: starMap.showMoon,
          showPlanets: starMap.showPlanets,
          frameConfig: starMap.frameConfig,
          textBlocks: editor.textBlocks,
        }
      } else {
        configJson = {
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

      // 2) Render a preview at print resolution, downsize for storage
      const renderer = posterType === 'star-map' ? starMapExport.renderPreview : mapExport.renderPreview
      const fullDataUrl = await renderer(editor.printFormat)
      const smallDataUrl = await downsizeDataURL(fullDataUrl, 600, 0.85)
      const blob = dataURLtoBlob(smallDataUrl)

      // 3) Upload preview
      const form = new FormData()
      form.append('file', blob, 'preview.jpg')
      const uploadRes = await fetch('/api/admin/presets/upload-preview', { method: 'POST', body: form })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload fehlgeschlagen')

      // 4) Create preset row
      const createRes = await fetch('/api/admin/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          poster_type: posterType,
          config_json: configJson,
          preview_image_url: uploadData.url,
        }),
      })
      const createData = await createRes.json()
      if (!createRes.ok) throw new Error(createData.error || 'Erstellen fehlgeschlagen')

      toast.success('Preset als Draft gespeichert')
      setOpen(false)
      setName('')
      setDescription('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        onClick={() => setOpen(true)}
        title="Als Design-Preset speichern (Admin)"
      >
        <LayoutTemplate className="w-3.5 h-3.5 mr-1.5" />
        Als Preset
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Als Preset speichern</DialogTitle>
            <DialogDescription>
              Aktuelles Design als wiederverwendbare Vorlage speichern.
              Wird zunächst als <strong>Draft</strong> angelegt — erst nach Veröffentlichung sichtbar für Kunden.
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
            <Button onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              {saving ? 'Speichern…' : 'Als Draft speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

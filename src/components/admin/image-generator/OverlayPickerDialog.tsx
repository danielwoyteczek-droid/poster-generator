'use client'

import { useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { imageGeneratorApi } from '@/lib/image-generator/api'
import type { Orientation, OverlayAsset } from '@/lib/image-generator/types'
import { ORIENTATION_LABELS } from './labels'

interface OverlayPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orientation: Orientation
  overlays: OverlayAsset[]
  onSelect: (overlay: OverlayAsset) => void
  /** Neues Overlay ist in der Bibliothek gelandet. */
  onUploaded: (overlay: OverlayAsset) => void
}

export function OverlayPickerDialog({ open, onOpenChange, orientation, overlays, onSelect, onUploaded }: OverlayPickerDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [uploading, setUploading] = useState(false)

  const matching = overlays.filter((o) => o.orientation === orientation)

  const reset = () => { setFile(null); setName('') }

  const upload = async () => {
    if (!file || !name.trim()) return
    setUploading(true)
    try {
      const overlay = await imageGeneratorApi.uploadOverlay(file, name.trim(), orientation)
      onUploaded(overlay)
      onSelect(overlay)
      toast.success(`Overlay „${overlay.name}" gespeichert`)
      reset()
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Overlay wählen</DialogTitle>
          <DialogDescription>
            Pfeile oder Erklärtexte, die über das Mockup gelegt werden ({ORIENTATION_LABELS[orientation]}).
            Das Overlay wird auf die Größe des Mockups skaliert.
          </DialogDescription>
        </DialogHeader>

        {matching.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Noch keine Overlays im {ORIENTATION_LABELS[orientation]}. Lade unten das erste hoch.
          </p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {matching.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => { onSelect(o); onOpenChange(false) }}
                  className="w-full rounded-lg border bg-background hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden text-left"
                >
                  {/* Karomuster macht Transparenz sichtbar */}
                  <div className="aspect-[3/4] bg-[repeating-conic-gradient(#e5e5e5_0%_25%,#fff_0%_50%)] bg-[length:16px_16px] flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.image_url} alt="" loading="lazy" className="w-full h-full object-contain" />
                  </div>
                  <div className="p-2 text-sm truncate border-t">{o.name}</div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-md border p-3 space-y-3">
          <div className="text-sm font-medium">Neues Overlay hochladen</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="overlay-file">PNG mit Transparenz</Label>
              <Input
                id="overlay-file"
                type="file"
                accept="image/png"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  setFile(f)
                  if (f && !name) setName(f.name.replace(/\.png$/i, ''))
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="overlay-name">Name</Label>
              <Input id="overlay-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Pfeil Deine Karte" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={upload} disabled={!file || !name.trim() || uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Hochladen und verwenden
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

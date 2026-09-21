'use client'

import { useState } from 'react'
import { AlertCircle, Clock, Download, ImageOff, Loader2, RotateCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { imageGeneratorApi } from '@/lib/image-generator/api'
import { buildImageFileName, groupImagesByColor, isImageStale } from '@/lib/image-generator/helpers'
import type {
  GeneratorImage, GeneratorPreset, MockupSetOption, OverlayAsset, PaletteOption,
} from '@/lib/image-generator/types'
import { STATUS_LABELS } from './labels'

interface GeneratorGalleryProps {
  preset: GeneratorPreset
  images: GeneratorImage[]
  mockups: MockupSetOption[]
  overlays: OverlayAsset[]
  palettes: PaletteOption[]
  onImagesChange: (images: GeneratorImage[]) => void
  onRefresh: () => Promise<void>
}

export function GeneratorGallery({ preset, images, mockups, overlays, palettes, onImagesChange, onRefresh }: GeneratorGalleryProps) {
  const [lightbox, setLightbox] = useState<GeneratorImage | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GeneratorImage | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const mockupName = (id: string) => mockups.find((m) => m.id === id)?.name ?? 'Mockup'
  const overlayName = (id: string | null) => (id ? overlays.find((o) => o.id === id)?.name ?? 'Overlay' : null)
  const paletteName = (id: string | null) => (id ? palettes.find((p) => p.id === id)?.name ?? id : null)

  const title = (img: GeneratorImage) => {
    const ov = overlayName(img.overlay_id)
    return ov ? `${mockupName(img.mockup_set_id)} + ${ov}` : mockupName(img.mockup_set_id)
  }

  const fileName = (img: GeneratorImage) =>
    buildImageFileName({
      position: img.position,
      mockupName: mockupName(img.mockup_set_id),
      overlayName: overlayName(img.overlay_id),
      paletteName: paletteName(img.palette_id),
    })

  const retry = async (img: GeneratorImage) => {
    setBusyId(img.id)
    try {
      const { image } = await imageGeneratorApi.retryImage(img.id)
      onImagesChange(images.map((i) => (i.id === image.id ? image : i)))
      await onRefresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erneut versuchen fehlgeschlagen')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (img: GeneratorImage) => {
    setBusyId(img.id)
    try {
      await imageGeneratorApi.deleteImage(img.id)
      onImagesChange(images.filter((i) => i.id !== img.id))
      setDeleteTarget(null)
      toast.success('Bild gelöscht')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Löschen fehlgeschlagen')
    } finally {
      setBusyId(null)
    }
  }

  const doneCount = images.filter((i) => i.status === 'done').length
  const groups = groupImagesByColor(images)

  return (
    <section aria-labelledby="gallery-heading" className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 id="gallery-heading" className="text-lg font-semibold">Galerie</h2>
          <p className="text-sm text-muted-foreground">
            {images.length === 0 ? 'Noch keine Bilder.' : `${doneCount} von ${images.length} Bildern fertig`}
          </p>
        </div>
        {doneCount > 0 && (
          <Button variant="outline" asChild>
            <a href={imageGeneratorApi.zipUrl(preset.id)} download>
              <Download className="w-4 h-4 mr-2" /> ZIP herunterladen
            </a>
          </Button>
        )}
      </div>

      {images.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-background p-8 text-center text-sm text-muted-foreground">
          Wähle Mockups und klicke auf „Erstellen".
        </div>
      ) : (
        groups.map((group) => (
          <div key={group.palette_id ?? 'base'} className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              {group.palette_id ? paletteName(group.palette_id) : 'Grundfarbe'}
            </h3>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {group.images.map((img) => {
                const stale = isImageStale(img)
                const busy = busyId === img.id
                return (
                  <li key={img.id} className="rounded-lg border bg-background overflow-hidden flex flex-col">
                    <div className="relative aspect-square bg-muted">
                      {img.status === 'done' && img.image_url ? (
                        <button
                          type="button"
                          onClick={() => setLightbox(img)}
                          className="block w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label={`${title(img)} groß anzeigen`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                        </button>
                      ) : img.status === 'failed' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-3 text-center">
                          <AlertCircle className="w-5 h-5 text-destructive" aria-hidden />
                          <span className="text-xs text-destructive line-clamp-4">{img.error ?? 'Unbekannter Fehler'}</span>
                        </div>
                      ) : (
                        <div className="w-full h-full relative">
                          <Skeleton className="absolute inset-0 rounded-none" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 text-center text-xs text-muted-foreground">
                            {img.status === 'rendering'
                              ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                              : img.status === 'pending'
                                ? <Clock className="w-5 h-5" aria-hidden />
                                : <ImageOff className="w-5 h-5" aria-hidden />}
                            <span>
                              {img.status === 'pending' && img.waiting_for === 'poster_render' && 'Wartet auf Poster-Render'}
                              {img.status === 'pending' && img.waiting_for === 'worker' && 'Wartet auf Render-Worker (Start dauert 2–3 Min.)'}
                              {(img.status === 'rendering' || !img.waiting_for) && STATUS_LABELS[img.status]}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="absolute top-1.5 left-1.5 flex gap-1">
                        <Badge variant="secondary" className="text-[10px] tabular-nums">{img.position}</Badge>
                        {stale && <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-800 text-[10px]">veraltet</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 p-2 border-t">
                      <span className="flex-1 min-w-0 text-xs truncate" title={title(img)}>{title(img)}</span>
                      {(img.status === 'failed' || stale) && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busy} onClick={() => retry(img)}
                          aria-label={stale ? 'Neu erzeugen' : 'Erneut versuchen'} title={stale ? 'Neu erzeugen' : 'Erneut versuchen'}>
                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" disabled={busy || img.status === 'rendering'}
                        onClick={() => setDeleteTarget(img)} aria-label="Bild löschen" title="Bild löschen">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))
      )}

      <Dialog open={lightbox !== null} onOpenChange={(o) => { if (!o) setLightbox(null) }}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{lightbox ? title(lightbox) : ''}</DialogTitle>
            <DialogDescription>
              {lightbox && `${paletteName(lightbox.palette_id) ?? 'Grundfarbe'} · ${fileName(lightbox)}`}
              {lightbox?.width && lightbox.height ? ` · ${lightbox.width} × ${lightbox.height} px` : ''}
            </DialogDescription>
          </DialogHeader>
          {lightbox?.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lightbox.image_url} alt={title(lightbox)} className="w-full max-h-[70vh] object-contain bg-muted rounded" />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bild löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `„${title(deleteTarget)}" (${paletteName(deleteTarget.palette_id) ?? 'Grundfarbe'}) wird aus der Galerie dieses Presets entfernt.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && remove(deleteTarget)}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

'use client'

import { useRef, useState } from 'react'
import { Upload, Trash2, Loader2, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useEditorStore } from '@/hooks/useEditorStore'
import { useAuth } from '@/hooks/useAuth'
import { uploadPhoto, deletePhoto } from '@/lib/photo-upload'
import { getOrCreateGuestSessionId } from '@/lib/guest-session'
import { PHOTO_MASK_OPTIONS, type PhotoMaskKey } from '@/lib/photo-masks'
import { PHOTO_FILTERS } from '@/lib/photo-filters'
import type { PhotoFilter } from '@/hooks/useEditorStore'
import { cn } from '@/lib/utils'

export function PhotoTab() {
  const { user } = useAuth()
  const { photos, addPhoto, updatePhoto, removePhoto } = useEditorStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFile = async (file: File) => {
    setIsUploading(true)
    setProgress(0)
    try {
      const uploaded = await uploadPhoto(file, {
        userId: user?.id,
        guestSessionId: user ? undefined : getOrCreateGuestSessionId(),
        onProgress: setProgress,
      })
      addPhoto({
        storagePath: uploaded.storagePath,
        publicUrl: uploaded.publicUrl,
        width: uploaded.width,
        height: uploaded.height,
        maskKey: 'circle',
        x: 0.2,
        y: 0.2,
        scale: 0.5,
        cropX: 0,
        cropY: 0,
        filter: 'none',
      })
      toast.success('Foto hinzugefügt')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
    } finally {
      setIsUploading(false)
      setProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = async (photoId: string, storagePath: string) => {
    removePhoto(photoId)
    try { await deletePhoto(storagePath) } catch { /* silently; background */ }
  }

  const handleMaskChange = (photoId: string, maskKey: PhotoMaskKey) => {
    updatePhoto(photoId, { maskKey })
  }

  const handleFilterChange = (photoId: string, filter: PhotoFilter) => {
    updatePhoto(photoId, { filter })
  }

  return (
    <div className="space-y-5 p-4">
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          Foto hochladen
        </Label>
        {!user && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Du kannst auch ohne Konto hochladen. Fotos ohne Bestellung werden nach 7 Tagen automatisch gelöscht.
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          variant="outline"
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="ml-2">Hochladen… {progress}%</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span className="ml-2">Foto auswählen</span>
            </>
          )}
        </Button>
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          JPG, PNG oder HEIC. Maximal 10 MB. Wird automatisch komprimiert.
        </p>
      </div>

      {photos.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Deine Fotos
            </Label>
            {photos.map((photo) => (
              <div key={photo.id} className="space-y-2 rounded-md border border-border p-2">
                <div className="flex items-start gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.publicUrl}
                    alt=""
                    className="w-12 h-12 object-cover rounded-sm border border-border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground/70 truncate">
                      {photo.width} × {photo.height}px
                    </p>
                    <p className="text-[10px] text-muted-foreground/70">Maske: {photo.maskKey}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(photo.id, photo.storagePath)}
                    className="w-7 h-7 flex items-center justify-center rounded-sm hover:bg-muted text-muted-foreground hover:text-destructive"
                    aria-label="Foto entfernen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {PHOTO_MASK_OPTIONS.map((mask) => (
                    <button
                      key={mask.key}
                      type="button"
                      onClick={() => handleMaskChange(photo.id, mask.key)}
                      className={cn(
                        'rounded-sm border px-1.5 py-1 text-[10px] transition-colors',
                        photo.maskKey === mask.key
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:border-muted-foreground',
                      )}
                    >
                      {mask.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1">
                  {PHOTO_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleFilterChange(photo.id, f.id)}
                      className={cn(
                        'rounded-sm border px-1.5 py-1 text-[10px] transition-colors',
                        photo.filter === f.id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:border-muted-foreground',
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {photos.length === 0 && user && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <ImagePlus className="w-8 h-8 mx-auto text-muted-foreground/50" />
          <p className="mt-2 text-xs text-muted-foreground">
            Noch keine Fotos. Lade ein Bild hoch, um es neben der Karte zu platzieren.
          </p>
        </div>
      )}
    </div>
  )
}

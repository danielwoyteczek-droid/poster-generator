'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Upload, Trash2, Loader2, ZoomIn } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useAuth } from '@/hooks/useAuth'
import { uploadPhoto, deletePhoto } from '@/lib/photo-upload'
import { getOrCreateGuestSessionId } from '@/lib/guest-session'
import { usePhotoEditorStore } from '@/hooks/usePhotoEditorStore'
import { useTranslatedLabel } from '@/lib/i18n-catalog'
import { PHOTO_MASK_OPTIONS } from '@/lib/photo-masks'
import { PHOTO_FILTERS } from '@/lib/photo-filters'
import type { PhotoFilter } from '@/hooks/useEditorStore'
import { cn } from '@/lib/utils'

/**
 * Sidebar-Tab for the single-photo layout: upload one photo, pick a mask
 * (full / circle / heart / square / portrait / landscape), zoom + filter.
 * Re-uses `uploadPhoto` from PROJ-19 — no new storage logic.
 */
export function SinglePhotoTab() {
  const t = useTranslations('photoEditor')
  const { user } = useAuth()
  const photoMaskLabel = useTranslatedLabel('photoMasks')
  const filterLabel = useTranslatedLabel('photoFilters')
  const {
    singlePhoto,
    singlePhotoMaskKey,
    setSinglePhoto,
    updateSinglePhotoCrop,
    setSinglePhotoMaskKey,
  } = usePhotoEditorStore()

  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFile = async (file: File) => {
    setUploading(true)
    setProgress(0)
    try {
      const uploaded = await uploadPhoto(file, {
        userId: user?.id,
        guestSessionId: user ? undefined : getOrCreateGuestSessionId(),
        onProgress: setProgress,
      })
      setSinglePhoto({
        storagePath: uploaded.storagePath,
        publicUrl: uploaded.publicUrl,
        width: uploaded.width,
        height: uploaded.height,
        cropX: 0,
        cropY: 0,
        scale: 1.0,
        filter: 'none',
        uploadedAt: new Date().toISOString(),
      })
      toast.success(t('singlePhotoUploaded'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('uploadFailed'))
    } finally {
      setUploading(false)
      setProgress(0)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    if (!singlePhoto) return
    const path = singlePhoto.storagePath
    setSinglePhoto(null)
    try {
      await deletePhoto(path)
    } catch {
      /* best-effort cleanup */
    }
  }

  const handleFilterChange = (filter: PhotoFilter) => {
    if (!singlePhoto) return
    updateSinglePhotoCrop({ filter })
  }

  return (
    <div className="space-y-5 p-4">
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('singlePhotoSectionLabel')}
        </Label>
        <p className="mt-1 text-[11px] text-muted-foreground/70 leading-relaxed">
          {t('singlePhotoSectionHint')}
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {!singlePhoto ? (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {t('uploadProgress', { progress })}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {t('singlePhotoUploadButton')}
              </>
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
            {t('singlePhotoFormatHint')}
          </p>
        </div>
      ) : (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="flex items-start gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={singlePhoto.publicUrl}
              alt=""
              className="w-12 h-12 object-cover rounded-sm border border-border"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground/70 truncate">
                {singlePhoto.width} × {singlePhoto.height}px
              </p>
              <p className="text-[10px] text-muted-foreground/70">
                {t('slotHasPhoto')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="w-7 h-7 flex items-center justify-center rounded-sm hover:bg-muted text-muted-foreground hover:text-destructive"
              aria-label={t('removePhoto')}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-3 h-3 mr-1.5" />
            {t('slotReplaceButton')}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('singlePhotoMaskLabel')}
        </Label>
        <div className="grid grid-cols-3 gap-1">
          {PHOTO_MASK_OPTIONS.map((mask) => (
            <button
              key={mask.key}
              type="button"
              onClick={() => setSinglePhotoMaskKey(mask.key)}
              aria-pressed={singlePhotoMaskKey === mask.key}
              className={cn(
                'rounded-sm border px-1.5 py-1.5 text-[11px] transition-colors',
                singlePhotoMaskKey === mask.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-muted-foreground',
              )}
            >
              {photoMaskLabel(mask.key, mask.label)}
            </button>
          ))}
        </div>
      </div>

      {singlePhoto && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {t('singlePhotoZoomLabel')}
            </Label>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {Math.round(singlePhoto.scale * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ZoomIn className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Slider
              value={[singlePhoto.scale * 100]}
              min={100}
              max={400}
              step={5}
              onValueChange={(v) => updateSinglePhotoCrop({ scale: v[0] / 100 })}
              className="flex-1"
            />
          </div>
          <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
            {t('singlePhotoCropHint')}
          </p>
        </div>
      )}

      {singlePhoto && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            {t('singlePhotoFilterLabel')}
          </Label>
          <div className="grid grid-cols-3 gap-1">
            {PHOTO_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => handleFilterChange(f.id)}
                aria-pressed={singlePhoto.filter === f.id}
                className={cn(
                  'rounded-sm border px-1.5 py-1.5 text-[11px] transition-colors',
                  singlePhoto.filter === f.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:border-muted-foreground',
                )}
              >
                {filterLabel(f.id, f.label)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

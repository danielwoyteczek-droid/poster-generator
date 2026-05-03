'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Upload, Trash2, Loader2, ZoomIn } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useAuth } from '@/hooks/useAuth'
import { uploadPhoto, deletePhoto } from '@/lib/photo-upload'
import { getOrCreateGuestSessionId } from '@/lib/guest-session'
import {
  usePhotoEditorStore,
  type GridSlotState,
  type SlotPhoto,
} from '@/hooks/usePhotoEditorStore'
import type { GridSlotDefinition } from '@/lib/grid-layout'
import { cn } from '@/lib/utils'

/**
 * Sidebar-Tab listet alle Foto-Grid-Slots des aktiven Presets, jeder mit
 * Upload, Zoom-Slider und Color-Picker (für leere Slots). Re-Use von
 * `uploadPhoto` aus PROJ-19 — keine neue Storage-Logik. Spiegelt Layout
 * + Pattern aus `PhotoSlotsTab` (Letter-Mask) für vertraute UX.
 */
export function PhotoGridTab() {
  const t = useTranslations('photoEditor')
  const { user } = useAuth()
  const {
    gridLayout,
    gridSlots,
    defaultSlotColor,
    selectedGridSlotIndex,
    setSelectedGridSlotIndex,
    setGridSlotPhoto,
    updateGridSlotCrop,
    setGridSlotColor,
    setDefaultSlotColor,
  } = usePhotoEditorStore()

  if (gridLayout.length === 0) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">{t('gridEmptyTitle')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('gridSectionLabel')}
        </Label>
        <p className="mt-1 text-[11px] text-muted-foreground/70 leading-relaxed">
          {t('gridSectionHint')}
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('gridDefaultColorLabel')}
        </Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={defaultSlotColor}
            onChange={(e) => setDefaultSlotColor(e.target.value)}
            className="h-8 w-10 rounded border border-border cursor-pointer shrink-0"
            aria-label={t('gridDefaultColorLabel')}
          />
          <Input
            value={defaultSlotColor}
            onChange={(e) => setDefaultSlotColor(e.target.value)}
            className="h-8 font-mono text-[11px] flex-1"
          />
        </div>
      </div>

      <div className="space-y-3">
        {gridLayout.map((def, i) => (
          <GridSlotCard
            key={def.id}
            index={i}
            definition={def}
            state={gridSlots[i]}
            color={gridSlots[i]?.color ?? defaultSlotColor}
            colorOverridden={(gridSlots[i]?.color ?? null) !== null}
            isSelected={selectedGridSlotIndex === i}
            userId={user?.id}
            onSelect={() => setSelectedGridSlotIndex(i)}
            onPhotoSet={(photo) => setGridSlotPhoto(i, photo)}
            onCropUpdate={(updates) => updateGridSlotCrop(i, updates)}
            onColorChange={(color) => setGridSlotColor(i, color)}
          />
        ))}
      </div>
    </div>
  )
}

interface GridSlotCardProps {
  index: number
  definition: GridSlotDefinition
  state: GridSlotState | undefined
  color: string
  colorOverridden: boolean
  isSelected: boolean
  userId: string | undefined
  onSelect: () => void
  onPhotoSet: (photo: SlotPhoto | null) => void
  onCropUpdate: (updates: Partial<Pick<SlotPhoto, 'cropX' | 'cropY' | 'scale'>>) => void
  onColorChange: (color: string | null) => void
}

function GridSlotCard({
  index,
  definition,
  state,
  color,
  colorOverridden,
  isSelected,
  userId,
  onSelect,
  onPhotoSet,
  onCropUpdate,
  onColorChange,
}: GridSlotCardProps) {
  const t = useTranslations('photoEditor')
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const photo = state?.photo ?? null

  const handleFile = async (file: File) => {
    setUploading(true)
    setProgress(0)
    try {
      const uploaded = await uploadPhoto(file, {
        userId,
        guestSessionId: userId ? undefined : getOrCreateGuestSessionId(),
        onProgress: setProgress,
      })
      onPhotoSet({
        storagePath: uploaded.storagePath,
        publicUrl: uploaded.publicUrl,
        width: uploaded.width,
        height: uploaded.height,
        cropX: 0,
        cropY: 0,
        scale: 1.0,
        uploadedAt: new Date().toISOString(),
      })
      onSelect()
      toast.success(t('gridPhotoAdded', { index: index + 1 }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('uploadFailed'))
    } finally {
      setUploading(false)
      setProgress(0)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    if (!photo) return
    const path = photo.storagePath
    onPhotoSet(null)
    try {
      await deletePhoto(path)
    } catch {
      /* best-effort cleanup */
    }
  }

  return (
    <div
      className={cn(
        'rounded-md border border-border p-3 space-y-2',
        isSelected && 'ring-2 ring-blue-500/50',
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <div
          className="w-12 h-12 shrink-0 rounded-sm border border-border flex items-center justify-center text-xs font-semibold leading-none overflow-hidden bg-white"
          style={{ backgroundColor: photo ? undefined : color }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.publicUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-foreground/60">{index + 1}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">
            {t('gridSlotLabel', { n: index + 1 })}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {photo ? t('slotHasPhoto') : t('slotEmpty')}
            {' · '}
            {Math.round(definition.width * 100)}×{Math.round(definition.height * 100)}%
          </p>
        </div>

        {photo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleRemove()
            }}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label={t('removePhoto')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
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

      {!photo ? (
        <div className="space-y-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs"
            disabled={uploading}
            onClick={(e) => {
              e.stopPropagation()
              fileRef.current?.click()
            }}
          >
            {uploading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                {t('uploadProgress', { progress })}
              </>
            ) : (
              <>
                <Upload className="w-3 h-3 mr-1.5" />
                {t('gridUploadButton')}
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="h-7 w-9 rounded border border-border cursor-pointer shrink-0"
              aria-label={t('gridColorLabel')}
            />
            <Input
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="h-7 font-mono text-[11px] flex-1"
            />
            {colorOverridden && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px]"
                onClick={(e) => {
                  e.stopPropagation()
                  onColorChange(null)
                }}
              >
                {t('slotColorReset')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs"
            disabled={uploading}
            onClick={(e) => {
              e.stopPropagation()
              fileRef.current?.click()
            }}
          >
            <Upload className="w-3 h-3 mr-1.5" />
            {t('slotReplaceButton')}
          </Button>
          <div className="flex items-center gap-2">
            <ZoomIn className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Slider
              value={[photo.scale * 100]}
              min={100}
              max={400}
              step={5}
              onValueChange={(v) => onCropUpdate({ scale: v[0] / 100 })}
              onClick={(e) => e.stopPropagation()}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
              {Math.round(photo.scale * 100)}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
            {t('slotCropHint')}
          </p>
        </div>
      )}
    </div>
  )
}

'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useTranslatedLabel } from '@/lib/i18n-catalog'
import { Loader2, Upload, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { LocationSearch } from '@/components/editor/LocationSearch'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { PresetPicker } from '@/components/editor/PresetPicker'
import { useEditorStore } from '@/hooks/useEditorStore'
import { useAuth } from '@/hooks/useAuth'
import { useCustomMasks } from '@/hooks/useCustomMasks'
import { MAP_MASKS } from '@/lib/map-masks'
import { MAP_LAYOUTS } from '@/lib/map-layouts'
import { MAP_PALETTES, type MapPaletteColors } from '@/lib/map-palettes'
import { useMapPalettes } from '@/hooks/useMapPalettes'
import { uploadPhoto, deletePhoto } from '@/lib/photo-upload'
import { getOrCreateGuestSessionId } from '@/lib/guest-session'
import { PHOTO_FILTERS } from '@/lib/photo-filters'
import { cn } from '@/lib/utils'

const ZONE_COUNT_BY_MASK: Record<string, number> = {
  'split-circles': 2,
  'split-hearts': 2,
  'split-halves': 2,
}

export function MobileMapTab() {
  const t = useTranslations('editor')
  const layoutLabel = useTranslatedLabel('mapLayouts')
  const filterLabel = useTranslatedLabel('photoFilters')
  const ZONE_LABELS = [t('mapZoneLeft'), t('mapZoneRight'), t('mapZoneTop'), t('mapZoneBottom'), t('mapZoneCenter')]

  const {
    maskKey, paletteId, customPaletteBase, customPalette, streetLabelsVisible,
    setMaskKey,
    setPaletteId, setCustomPaletteBase, setCustomPalette, updateCustomPaletteColor, setStreetLabelsVisible,
    setStyleId, styleId,
    flyToLocation, setLocationName,
    secondMap, setSecondMapStyleId, setSecondMapPaletteId, setSecondMapCustomPaletteBase, setSecondMapCustomPalette, updateSecondMapCustomPaletteColor, flyToSecondLocation,
    splitMode, setSplitMode,
    splitPhoto, splitPhotoZone, setSplitPhoto, updateSplitPhoto, setSplitPhotoZone,
  } = useEditorStore()
  const { palettes: availablePalettes } = useMapPalettes()
  const defaultColors = availablePalettes[0]?.colors ?? MAP_PALETTES[0].colors
  const { user } = useAuth()
  const { masks: customMasks } = useCustomMasks()

  const splitPhotoInputRef = useRef<HTMLInputElement>(null)
  const [splitUploading, setSplitUploading] = useState(false)
  const [splitProgress, setSplitProgress] = useState(0)

  type SplitMode = 'none' | 'second-map' | 'photo'

  const currentMask =
    (MAP_MASKS as Record<string, typeof MAP_MASKS['none']>)[maskKey] ??
    customMasks.find((m) => m.key === maskKey) ??
    MAP_MASKS.none

  const handleSplitModeChange = (mode: SplitMode) => {
    setSplitMode(mode)
    if (mode === 'none' && currentMask.isSplit) {
      setMaskKey('circle')
    } else if (mode !== 'none' && !currentMask.isSplit) {
      setMaskKey('split-circles')
    }
  }

  const zoneCount = ZONE_COUNT_BY_MASK[maskKey] ?? 2
  const cycleZone = (dir: 1 | -1) => {
    const next = (splitPhotoZone + dir + zoneCount) % zoneCount
    setSplitPhotoZone(next)
  }
  const zoneLabel = ZONE_LABELS[splitPhotoZone] ?? t('mapZoneFallback', { n: splitPhotoZone + 1 })

  const handleSplitPhotoFile = async (file: File) => {
    setSplitUploading(true)
    setSplitProgress(0)
    try {
      const uploaded = await uploadPhoto(file, {
        userId: user?.id,
        guestSessionId: user ? undefined : getOrCreateGuestSessionId(),
        onProgress: setSplitProgress,
      })
      setSplitPhoto({
        storagePath: uploaded.storagePath,
        publicUrl: uploaded.publicUrl,
        width: uploaded.width,
        height: uploaded.height,
        filter: 'none',
        cropX: 0,
        cropY: 0,
        cropScale: 1,
        uploadedAt: new Date().toISOString(),
      })
      toast.success(t('mapPhotoInserted'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('uploadFailed'))
    } finally {
      setSplitUploading(false)
      setSplitProgress(0)
      if (splitPhotoInputRef.current) splitPhotoInputRef.current.value = ''
    }
  }

  const handleRemoveSplitPhoto = async () => {
    const toDelete = splitPhoto?.storagePath
    setSplitPhoto(null)
    if (toDelete) {
      try { await deletePhoto(toDelete) } catch { /* ignore */ }
    }
  }

  return (
    <div className="space-y-5 p-4">
      {/* Primary location search */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t('mapLocationSearch')}</Label>
        <LocationSearch onSelect={(lng, lat, name) => { flyToLocation(lng, lat); setLocationName(name) }} />
      </div>

      {/* Split mode */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('mapSecondViewLabel')}
        </Label>
        <div className="grid grid-cols-3 gap-1">
          {(['none', 'second-map', 'photo'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleSplitModeChange(m)}
              className={cn(
                'h-10 rounded-md text-xs font-medium transition-colors',
                splitMode === m
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white text-foreground/70 border border-border hover:border-muted-foreground',
              )}
            >
              {m === 'none' ? t('mapSecondViewNone') : m === 'second-map' ? t('mapSecondViewMap') : t('mapSecondViewPhoto')}
            </button>
          ))}
        </div>

        {splitMode === 'photo' && (
          <div className="space-y-2 pl-1">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground flex-1">{t('mapZonePosition')}</Label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => cycleZone(-1)}
                  disabled={zoneCount < 2}
                  className="w-9 h-9 flex items-center justify-center rounded-sm border border-border bg-white text-muted-foreground hover:border-muted-foreground disabled:opacity-40"
                  aria-label={t('mapZonePrev')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-foreground/70 min-w-[56px] text-center tabular-nums">
                  {zoneLabel}
                </span>
                <button
                  type="button"
                  onClick={() => cycleZone(1)}
                  disabled={zoneCount < 2}
                  className="w-9 h-9 flex items-center justify-center rounded-sm border border-border bg-white text-muted-foreground hover:border-muted-foreground disabled:opacity-40"
                  aria-label={t('mapZoneNext')}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <input
              ref={splitPhotoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleSplitPhotoFile(file)
              }}
            />
            {!splitPhoto ? (
              <Button
                type="button"
                onClick={() => splitPhotoInputRef.current?.click()}
                disabled={splitUploading}
                variant="outline"
                className="w-full h-11"
              >
                {splitUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="ml-2">{t('uploadProgress', { progress: splitProgress })}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span className="ml-2">{t('mapPhotoUpload')}</span>
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-md border border-border p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={splitPhoto.publicUrl} alt="" className="w-12 h-12 object-cover rounded-sm" />
                  <p className="flex-1 text-xs text-muted-foreground truncate">
                    {splitPhoto.width} × {splitPhoto.height}px
                  </p>
                  <button
                    type="button"
                    onClick={handleRemoveSplitPhoto}
                    className="w-9 h-9 flex items-center justify-center rounded-sm hover:bg-muted text-muted-foreground hover:text-red-600"
                    aria-label={t('mapPhotoRemoveAria')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {PHOTO_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => updateSplitPhoto({ filter: f.id })}
                      className={cn(
                        'rounded-sm border px-1.5 py-2 text-[11px] transition-colors',
                        splitPhoto.filter === f.id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:border-muted-foreground',
                      )}
                    >
                      {filterLabel(f.id, f.label)}
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t('mapPhotoZoom')}</span>
                    <span className="text-xs text-muted-foreground/70 tabular-nums">
                      {splitPhoto.cropScale.toFixed(1)}×
                    </span>
                  </div>
                  <Slider
                    min={1} max={4} step={0.1}
                    value={[splitPhoto.cropScale]}
                    onValueChange={([v]) => updateSplitPhoto({ cropScale: v })}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {splitMode === 'second-map' && (
          <div className="space-y-3 pl-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('mapSecondLocation')}</Label>
              <LocationSearch onSelect={(lng, lat) => flyToSecondLocation(lng, lat)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('mapSecondStyle')}</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {MAP_LAYOUTS.map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => setSecondMapStyleId(layout.id)}
                    title={layoutLabel(`${layout.id}Description`, layout.description)}
                    className={cn(
                      'rounded-md border-2 px-2 py-3 text-left text-xs font-medium transition-all',
                      secondMap.styleId === layout.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-foreground/70 hover:border-muted-foreground'
                    )}
                  >
                    {layoutLabel(`${layout.id}Label`, layout.label)}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 pt-2">
                <Label className="text-xs text-muted-foreground">{t('mapSecondPalette')}</Label>
                <div className="flex gap-1.5 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button
                    onClick={() => setSecondMapPaletteId('original')}
                    className={cn(
                      'shrink-0 w-20 snap-start rounded-md border-2 p-2 text-left flex flex-col gap-1 transition-all',
                      secondMap.paletteId === 'original'
                        ? 'border-primary'
                        : 'border-border',
                    )}
                    title={t('mapPaletteOriginalTitle')}
                  >
                    <div className="w-4 h-4 rounded-full border border-black/10 bg-gradient-to-br from-gray-200 via-gray-400 to-gray-600" />
                    <span className="text-[11px] leading-tight text-foreground/70">{t('mapPaletteOriginal')}</span>
                  </button>
                  {availablePalettes.map((p) => {
                    const c = p.colors
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSecondMapPaletteId(p.id)}
                        className={cn(
                          'shrink-0 w-20 snap-start rounded-md border-2 p-2 text-left flex flex-col gap-1 transition-all',
                          secondMap.paletteId === p.id
                            ? 'border-primary'
                            : 'border-border',
                        )}
                      >
                        <div className="flex gap-0.5">
                          <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.land }} />
                          <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.water }} />
                          <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.road }} />
                          <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.label }} />
                        </div>
                        <span className="text-[11px] leading-tight text-foreground/70">{p.label}</span>
                      </button>
                    )
                  })}
                  <button
                    onClick={() => {
                      setSecondMapPaletteId('custom')
                      if (!secondMap.customPalette) {
                        const seed = (availablePalettes.find((p) => p.id === secondMap.paletteId) ?? availablePalettes[0] ?? MAP_PALETTES[0]).colors
                        setSecondMapCustomPalette({ ...seed })
                        if (!secondMap.customPaletteBase) setSecondMapCustomPaletteBase(seed.water)
                      }
                    }}
                    className={cn(
                      'shrink-0 w-20 snap-start rounded-md border-2 p-2 text-left flex flex-col gap-1 transition-all',
                      secondMap.paletteId === 'custom'
                        ? 'border-primary'
                        : 'border-border',
                    )}
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-black/10"
                      style={{ background: secondMap.customPalette?.water ?? secondMap.customPaletteBase ?? '#84c5a6' }}
                    />
                    <span className="text-[11px] leading-tight text-foreground/70">{t('mapPaletteCustom')}</span>
                  </button>
                </div>
                {secondMap.paletteId === 'custom' && (
                  <MobileCustomPaletteEditor
                    colors={secondMap.customPalette}
                    onColorChange={updateSecondMapCustomPaletteColor}
                    onReset={() => setSecondMapCustomPalette({ ...defaultColors })}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Separator />

      <PresetPicker posterType="map" />

      <Separator />

      {/* Kartenstil */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t('mapStyleLabel')}</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {MAP_LAYOUTS.map((layout) => (
            <button
              key={layout.id}
              onClick={() => setStyleId(layout.id)}
              title={layoutLabel(`${layout.id}Description`, layout.description)}
              className={cn(
                'rounded-md border-2 px-2 py-3 text-left text-sm font-medium transition-all',
                styleId === layout.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-foreground/70 hover:border-muted-foreground'
              )}
            >
              {layoutLabel(`${layout.id}Label`, layout.label)}
            </button>
          ))}
        </div>
      </div>

      {/* Farbpalette — horizontal scroll on Mobile so the user can swipe
          through every palette without an "expand" toggle and immediately
          sees a peek of the next item via the bleed-edge negative margin. */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t('mapPalette')}</Label>
        <div className="flex gap-1.5 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setPaletteId('original')}
            className={cn(
              'shrink-0 w-20 snap-start rounded-md border-2 p-2 text-left flex flex-col gap-1 transition-all',
              paletteId === 'original'
                ? 'border-primary'
                : 'border-border',
            )}
            title={t('mapPaletteOriginalTitle')}
          >
            <div className="w-4 h-4 rounded-full border border-black/10 bg-gradient-to-br from-gray-200 via-gray-400 to-gray-600" />
            <span className="text-[11px] leading-tight text-foreground/70">{t('mapPaletteOriginal')}</span>
          </button>
          {availablePalettes.map((p) => {
            const c = p.colors
            return (
              <button
                key={p.id}
                onClick={() => setPaletteId(p.id)}
                className={cn(
                  'shrink-0 w-20 snap-start rounded-md border-2 p-2 text-left flex flex-col gap-1 transition-all',
                  paletteId === p.id
                    ? 'border-primary'
                    : 'border-border',
                )}
              >
                <div className="flex gap-0.5">
                  <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.land }} />
                  <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.water }} />
                  <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.road }} />
                  <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.label }} />
                </div>
                <span className="text-[11px] leading-tight text-foreground/70">{p.label}</span>
              </button>
            )
          })}
          <button
            onClick={() => {
              setPaletteId('custom')
              if (!customPalette) {
                const seed = (availablePalettes.find((p) => p.id === paletteId) ?? availablePalettes[0] ?? MAP_PALETTES[0]).colors
                setCustomPalette({ ...seed })
                if (!customPaletteBase) setCustomPaletteBase(seed.water)
              }
            }}
            className={cn(
              'shrink-0 w-20 snap-start rounded-md border-2 p-2 text-left flex flex-col gap-1 transition-all',
              paletteId === 'custom'
                ? 'border-primary'
                : 'border-border',
            )}
          >
            <div
              className="w-4 h-4 rounded-full border border-black/10"
              style={{ background: customPalette?.water ?? customPaletteBase ?? '#84c5a6' }}
            />
            <span className="text-[11px] leading-tight text-foreground/70">{t('mapPaletteCustom')}</span>
          </button>
        </div>
        {paletteId === 'custom' && (
          <MobileCustomPaletteEditor
            colors={customPalette}
            onColorChange={updateCustomPaletteColor}
            onReset={() => setCustomPalette({ ...defaultColors })}
          />
        )}
      </div>

      {/* Straßennamen */}
      <div className="flex items-center justify-between">
        <Label className="text-sm text-foreground/70">{t('mapShowStreets')}</Label>
        <Switch
          checked={streetLabelsVisible}
          onCheckedChange={setStreetLabelsVisible}
        />
      </div>
    </div>
  )
}

function MobileCustomPaletteEditor({
  colors,
  onColorChange,
  onReset,
}: {
  colors: MapPaletteColors | null
  onColorChange: (key: keyof MapPaletteColors, hex: string) => void
  onReset: () => void
}) {
  const t = useTranslations('editor')
  const PALETTE_FIELD_LABELS: Array<{ key: keyof MapPaletteColors; label: string; description: string }> = [
    { key: 'background', label: t('paletteFieldBackground'), description: t('paletteFieldBackgroundDesc') },
    { key: 'land', label: t('paletteFieldLand'), description: t('paletteFieldLandDesc') },
    { key: 'water', label: t('paletteFieldWater'), description: t('paletteFieldWaterDesc') },
    { key: 'road', label: t('paletteFieldRoad'), description: t('paletteFieldRoadDesc') },
    { key: 'building', label: t('paletteFieldBuilding'), description: t('paletteFieldBuildingDesc') },
    { key: 'border', label: t('paletteFieldBorder'), description: t('paletteFieldBorderDesc') },
    { key: 'label', label: t('paletteFieldLabel'), description: t('paletteFieldLabelDesc') },
    { key: 'labelHalo', label: t('paletteFieldLabelHalo'), description: t('paletteFieldLabelHaloDesc') },
  ]
  const effective = colors ?? MAP_PALETTES[0].colors
  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{t('paletteAllColors')}</span>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-muted-foreground/70 hover:text-foreground/70"
        >
          {t('paletteReset')}
        </button>
      </div>
      {PALETTE_FIELD_LABELS.map((field) => (
        <div key={field.key} className="flex items-center gap-2">
          <input
            type="color"
            value={effective[field.key]}
            onChange={(e) => onColorChange(field.key, e.target.value)}
            className="w-11 h-11 rounded-md border border-border cursor-pointer shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground/70 leading-tight">{field.label}</p>
            <p className="text-[11px] text-muted-foreground/70 leading-tight">{field.description}</p>
          </div>
          <span className="text-[11px] text-muted-foreground/70 font-mono tabular-nums uppercase">
            {effective[field.key]}
          </span>
        </div>
      ))}
    </div>
  )
}

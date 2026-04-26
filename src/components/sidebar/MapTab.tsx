'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useTranslatedLabel } from '@/lib/i18n-catalog'
import { ChevronDown, ChevronUp, Loader2, Upload, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { LocationSearch } from '@/components/editor/LocationSearch'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PresetPicker } from '@/components/editor/PresetPicker'
import { useEditorStore } from '@/hooks/useEditorStore'
import { useAuth } from '@/hooks/useAuth'
import { useCustomMasks } from '@/hooks/useCustomMasks'
import { MAP_MASK_OPTIONS, MAP_MASKS } from '@/lib/map-masks'
import { MAP_LAYOUTS } from '@/lib/map-layouts'
import { MAP_PALETTES, type MapPaletteColors } from '@/lib/map-palettes'
import { useMapPalettes } from '@/hooks/useMapPalettes'
import { uploadPhoto, deletePhoto } from '@/lib/photo-upload'
import { getOrCreateGuestSessionId } from '@/lib/guest-session'
import { PHOTO_FILTERS } from '@/lib/photo-filters'
import { cn } from '@/lib/utils'

const MASK_INITIAL_VISIBLE = 3


const SPLIT_MASK_OPTIONS = MAP_MASK_OPTIONS.filter((m) => m.isSplit)
// 'text-below' moved to the Layout section (PROJ-21). Hide from the
// Kartenform picker but keep the mask definition so legacy presets render
// until apply-preset migration runs.
const SINGLE_MASK_OPTIONS = MAP_MASK_OPTIONS.filter(
  (m) => !m.isSplit && m.key !== 'text-below',
)

// Zones per split mask — later multi-part masks can declare 3+ zones here
const ZONE_COUNT_BY_MASK: Record<string, number> = {
  'split-circles': 2,
  'split-hearts': 2,
  'split-halves': 2,
}

export function MapTab() {
  const t = useTranslations('editor')
  const layoutLabel = useTranslatedLabel('mapLayouts')
  const maskLabel = useTranslatedLabel('mapMasks')
  const filterLabel = useTranslatedLabel('photoFilters')

  const LAYOUT_OPTIONS: { id: 'full' | 'text-30' | 'text-15'; label: string; description: string }[] = [
    { id: 'full', label: t('mapLayoutFull'), description: t('mapLayoutFullDesc') },
    { id: 'text-30', label: t('mapLayoutText30'), description: t('mapLayoutText30Desc') },
    { id: 'text-15', label: t('mapLayoutText15'), description: t('mapLayoutText15Desc') },
  ]

  const ZONE_LABELS = [t('mapZoneLeft'), t('mapZoneRight'), t('mapZoneTop'), t('mapZoneBottom'), t('mapZoneCenter')]

  const {
    styleId, maskKey, marker, secondMarker, shapeConfig,
    paletteId, customPaletteBase, customPalette, streetLabelsVisible, posterDarkMode,
    layoutId,
    setStyleId, setMaskKey, setMarker, setSecondMarker,
    setShapeOuter, setInnerFrame, setOuterFrame,
    setLayoutId,
    setPaletteId, setCustomPaletteBase, setCustomPalette, updateCustomPaletteColor, setStreetLabelsVisible, setPosterDarkMode,
    flyToLocation, setLocationName,
    secondMap, setSecondMapStyleId, setSecondMapPaletteId, setSecondMapCustomPaletteBase, setSecondMapCustomPalette, updateSecondMapCustomPaletteColor, flyToSecondLocation,
    splitMode, setSplitMode,
    splitPhoto, splitPhotoZone, setSplitPhoto, updateSplitPhoto, setSplitPhotoZone,
  } = useEditorStore()
  const { palettes: availablePalettes } = useMapPalettes()
  const defaultColors = availablePalettes[0]?.colors ?? MAP_PALETTES[0].colors
  const { user, isAdmin } = useAuth()
  const { masks: customMasks } = useCustomMasks()

  const splitPhotoInputRef = useRef<HTMLInputElement>(null)
  const [splitUploading, setSplitUploading] = useState(false)
  const [splitProgress, setSplitProgress] = useState(0)

  // Save-as-palette dialog state (admin-only, triggered from CustomPaletteEditor)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveDialogColors, setSaveDialogColors] = useState<MapPaletteColors | null>(null)
  const [savePaletteName, setSavePaletteName] = useState('')
  const [savePaletteId, setSavePaletteId] = useState('')
  const [savePaletteSlugTouched, setSavePaletteSlugTouched] = useState(false)
  const [savePaletteSaving, setSavePaletteSaving] = useState(false)

  const openSavePaletteDialog = (colors: MapPaletteColors) => {
    setSaveDialogColors(colors)
    setSavePaletteName('')
    setSavePaletteId('')
    setSavePaletteSlugTouched(false)
    setSaveDialogOpen(true)
  }

  const submitSavePalette = async () => {
    if (!saveDialogColors) return
    if (!savePaletteName.trim()) {
      toast.error('Name ist erforderlich')
      return
    }
    if (savePaletteId.length < 2 || !/^[a-z][a-z0-9-]*$/.test(savePaletteId)) {
      toast.error('ID braucht mindestens 2 Zeichen, nur a-z, 0-9, Bindestriche (Start mit Buchstabe)')
      return
    }
    // Check all 8 colours are valid hex before the server round-trip so the
    // error points at the specific offending field.
    const HEX = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/
    for (const key of Object.keys(saveDialogColors) as (keyof MapPaletteColors)[]) {
      if (!HEX.test(saveDialogColors[key])) {
        toast.error(`${key}: ungültiger Hex-Wert (${saveDialogColors[key]})`)
        return
      }
    }
    setSavePaletteSaving(true)
    try {
      const res = await fetch('/api/admin/palettes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: savePaletteId,
          name: savePaletteName.trim(),
          colors: saveDialogColors,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        // Surface the Zod flatten() field errors so we can see what the server rejected
        const detail = data.details?.fieldErrors
          ? Object.entries(data.details.fieldErrors)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
              .join(' | ')
          : null
        throw new Error(detail ? `${data.error} — ${detail}` : data.error ?? 'Speichern fehlgeschlagen')
      }
      const { invalidateMapPalettesCache } = await import('@/hooks/useMapPalettes')
      invalidateMapPalettesCache()
      toast.success('Palette als Draft gespeichert — im Admin veröffentlichen')
      setSaveDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setSavePaletteSaving(false)
    }
  }

  type SplitMode = 'none' | 'second-map' | 'photo'

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

  // Admin sees built-in + uploaded; customer only sees built-in
  const adminMasks = isAdmin ? customMasks : []
  const currentMask =
    (MAP_MASKS as Record<string, typeof MAP_MASKS['none']>)[maskKey] ??
    customMasks.find((m) => m.key === maskKey) ??
    MAP_MASKS.none
  const shapeSupported = !!currentMask.shape
  const [masksExpanded, setMasksExpanded] = useState(false)

  const isSplitActive = splitMode === 'second-map' || splitMode === 'photo'
  const visibleMasks = isSplitActive
    ? SPLIT_MASK_OPTIONS
    : [...SINGLE_MASK_OPTIONS, ...adminMasks]

  return (
    <div className="space-y-5 p-4">
      {/* Location Search — primary map */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t('mapLocationSearch')}</Label>
        <LocationSearch onSelect={(lng, lat, name) => { flyToLocation(lng, lat); setLocationName(name) }} />
      </div>

      {/* Split-Modus: None / zweite Karte / Foto */}
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
                'h-8 rounded-md text-[11px] font-medium transition-colors',
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
                  className="w-7 h-7 flex items-center justify-center rounded-sm border border-border bg-white text-muted-foreground hover:border-muted-foreground disabled:opacity-40"
                  aria-label={t('mapZonePrev')}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] text-foreground/70 min-w-[48px] text-center tabular-nums">
                  {zoneLabel}
                </span>
                <button
                  type="button"
                  onClick={() => cycleZone(1)}
                  disabled={zoneCount < 2}
                  className="w-7 h-7 flex items-center justify-center rounded-sm border border-border bg-white text-muted-foreground hover:border-muted-foreground disabled:opacity-40"
                  aria-label={t('mapZoneNext')}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
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
                className="w-full"
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
                    className="w-7 h-7 flex items-center justify-center rounded-sm hover:bg-muted text-muted-foreground hover:text-red-600"
                    aria-label={t('mapPhotoRemoveAria')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {PHOTO_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => updateSplitPhoto({ filter: f.id })}
                      className={cn(
                        'rounded-sm border px-1.5 py-1 text-[10px] transition-colors',
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
                    <span className="text-[11px] text-muted-foreground">{t('mapPhotoZoom')}</span>
                    <span className="text-[11px] text-muted-foreground/70 tabular-nums">
                      {splitPhoto.cropScale.toFixed(1)}×
                    </span>
                  </div>
                  <Slider
                    min={1} max={4} step={0.1}
                    value={[splitPhoto.cropScale]}
                    onValueChange={([v]) => updateSplitPhoto({ cropScale: v })}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                  {t('mapPhotoCropHint')}
                </p>
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
                      'rounded-md border-2 px-2 py-2 text-left text-xs font-medium transition-all',
                      secondMap.styleId === layout.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-foreground/70 hover:border-muted-foreground'
                    )}
                  >
                    {layoutLabel(`${layout.id}Label`, layout.label)}
                  </button>
                ))}
              </div>
              {true && (
                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs text-muted-foreground">{t('mapSecondPalette')}</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => setSecondMapPaletteId('original')}
                      className={cn(
                        'rounded-md border-2 p-2 text-left flex flex-col gap-1 transition-all',
                        secondMap.paletteId === 'original'
                          ? 'border-primary'
                          : 'border-border hover:border-muted-foreground',
                      )}
                      title={t('mapPaletteOriginalTitle')}
                    >
                      <div className="w-3 h-3 rounded-full border border-black/10 bg-gradient-to-br from-gray-200 via-gray-400 to-gray-600" />
                      <span className="text-[10px] leading-tight text-foreground/70">{t('mapPaletteOriginal')}</span>
                    </button>
                    {availablePalettes.map((p) => {
                      const c = p.colors
                      return (
                        <button
                          key={p.id}
                          onClick={() => setSecondMapPaletteId(p.id)}
                          className={cn(
                            'rounded-md border-2 p-2 text-left flex flex-col gap-1 transition-all',
                            secondMap.paletteId === p.id
                              ? 'border-primary'
                              : 'border-border hover:border-muted-foreground',
                          )}
                          title={p.description}
                        >
                          <div className="flex gap-0.5">
                            <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.land }} />
                            <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.water }} />
                            <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.road }} />
                            <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.label }} />
                          </div>
                          <span className="text-[10px] leading-tight text-foreground/70">{p.label}</span>
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
                        'rounded-md border-2 p-2 text-left flex flex-col gap-1 transition-all',
                        secondMap.paletteId === 'custom'
                          ? 'border-primary'
                          : 'border-border hover:border-muted-foreground',
                      )}
                    >
                      <div
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ background: secondMap.customPalette?.water ?? secondMap.customPaletteBase ?? '#84c5a6' }}
                      />
                      <span className="text-[10px] leading-tight text-foreground/70">{t('mapPaletteCustom')}</span>
                    </button>
                  </div>
                  {secondMap.paletteId === 'custom' && (
                    <CustomPaletteEditor
                      colors={secondMap.customPalette}
                      onColorChange={updateSecondMapCustomPaletteColor}
                      onReset={() => setSecondMapCustomPalette({ ...defaultColors })}
                      onSaveAsPalette={isAdmin ? openSavePaletteDialog : undefined}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Second marker pin */}
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">{t('mapSecondMarker')}</Label>
              <Switch
                checked={secondMarker.enabled}
                onCheckedChange={(enabled) =>
                  enabled && !secondMarker.enabled
                    ? setSecondMarker({ enabled: true, lat: null, lng: null })
                    : setSecondMarker({ enabled })
                }
              />
            </div>
            {secondMarker.enabled && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground w-12 shrink-0">{t('mapMarkerType')}</Label>
                  <Select
                    value={secondMarker.type}
                    onValueChange={(type: 'classic' | 'heart') => setSecondMarker({ type })}
                  >
                    <SelectTrigger className="flex-1 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">{t('mapMarkerClassic')}</SelectItem>
                      <SelectItem value="heart">{t('mapMarkerHeart')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground w-12 shrink-0">{t('mapMarkerColor')}</Label>
                  <input
                    type="color"
                    value={secondMarker.color}
                    onChange={(e) => setSecondMarker({ color: e.target.value })}
                    className="flex-1 h-8 rounded-md border border-border cursor-pointer px-1"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Separator />


      {/* Preset picker — shows published map designs, collapsible */}
      <PresetPicker posterType="map" />

      <Separator />

      {/* Map layout — choose detail level / what's shown at which zoom */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t('mapStyleLabel')}</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {MAP_LAYOUTS.map((layout) => (
            <button
              key={layout.id}
              onClick={() => setStyleId(layout.id)}
              title={layoutLabel(`${layout.id}Description`, layout.description)}
              className={cn(
                'rounded-md border-2 px-2 py-2 text-left text-xs font-medium transition-all',
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

      {true && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t('mapPalette')}</Label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() => setPaletteId('original')}
              className={cn(
                'rounded-md border-2 p-2 text-left flex flex-col gap-1 transition-all',
                paletteId === 'original'
                  ? 'border-primary'
                  : 'border-border hover:border-muted-foreground',
              )}
              title={t('mapPaletteOriginalTitle')}
            >
              <div className="w-3 h-3 rounded-full border border-black/10 bg-gradient-to-br from-gray-200 via-gray-400 to-gray-600" />
              <span className="text-[10px] leading-tight text-foreground/70">{t('mapPaletteOriginal')}</span>
            </button>
            {availablePalettes.map((p) => {
              const c = p.colors
              return (
                <button
                  key={p.id}
                  onClick={() => setPaletteId(p.id)}
                  className={cn(
                    'rounded-md border-2 p-2 text-left flex flex-col gap-1 transition-all',
                    paletteId === p.id
                      ? 'border-primary'
                      : 'border-border hover:border-muted-foreground',
                  )}
                  title={p.description}
                >
                  <div className="flex gap-0.5">
                    <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.land }} />
                    <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.water }} />
                    <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.road }} />
                    <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.label }} />
                  </div>
                  <span className="text-[10px] leading-tight text-foreground/70">{p.label}</span>
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
                'rounded-md border-2 p-2 text-left flex flex-col gap-1 transition-all',
                paletteId === 'custom'
                  ? 'border-primary'
                  : 'border-border hover:border-muted-foreground',
              )}
            >
              <div
                className="w-3 h-3 rounded-full border border-black/10"
                style={{ background: customPalette?.water ?? customPaletteBase ?? '#84c5a6' }}
              />
              <span className="text-[10px] leading-tight text-foreground/70">{t('mapPaletteCustom')}</span>
            </button>
          </div>
          {paletteId === 'custom' && (
            <CustomPaletteEditor
              colors={customPalette}
              onColorChange={updateCustomPaletteColor}
              onReset={() => setCustomPalette({ ...defaultColors })}
              onSaveAsPalette={isAdmin ? openSavePaletteDialog : undefined}
            />
          )}
        </div>
      )}

      {/* Street labels — always available, works on any map style */}
      <div className="flex items-center justify-between">
        <Label className="text-xs text-foreground/70">{t('mapShowStreets')}</Label>
        <Switch
          checked={streetLabelsVisible}
          onCheckedChange={setStreetLabelsVisible}
        />
      </div>

      <Separator />

      {/* Mask / Shape — filtered to split-only when second map is active */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t('mapShape')}</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {(masksExpanded ? visibleMasks : visibleMasks.slice(0, MASK_INITIAL_VISIBLE)).map((mask) => (
            <button
              key={mask.key}
              onClick={() => setMaskKey(mask.key)}
              className={cn(
                'rounded-md border-2 py-2 px-1 transition-all flex flex-col items-center gap-1',
                maskKey === mask.key
                  ? 'border-primary bg-muted'
                  : 'border-border hover:border-muted-foreground'
              )}
            >
              <div className="w-8 h-8 flex items-center justify-center">
                {mask.svgPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mask.svgPath} alt={maskLabel(mask.key, mask.label)} className="w-7 h-7 object-contain" />
                ) : (
                  <div className="w-7 h-7 rounded-sm bg-muted" />
                )}
              </div>
              <span className="text-[9px] leading-tight text-center text-muted-foreground">{maskLabel(mask.key, mask.label)}</span>
            </button>
          ))}
        </div>
        {visibleMasks.length > MASK_INITIAL_VISIBLE && (
          <button
            type="button"
            onClick={() => setMasksExpanded((v) => !v)}
            className="w-full text-[11px] text-muted-foreground hover:text-foreground flex items-center justify-center gap-0.5 py-1"
          >
            {masksExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {masksExpanded ? t('mapShowLess') : t('mapShowMore', { n: visibleMasks.length - MASK_INITIAL_VISIBLE })}
          </button>
        )}
      </div>

      <Separator />

      {/* Layout — where the text sits on the poster */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t('mapLayout')}</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setLayoutId(opt.id)}
              title={opt.description}
              className={cn(
                'rounded-md border-2 py-2 px-1 transition-all flex flex-col items-center gap-1',
                layoutId === opt.id
                  ? 'border-primary bg-muted'
                  : 'border-border hover:border-muted-foreground',
              )}
            >
              {/* Miniature: grey block = map area, white band = text area */}
              <div className="w-8 h-10 rounded-sm border border-border bg-white flex flex-col overflow-hidden">
                <div
                  className="bg-muted-foreground"
                  style={{ height: opt.id === 'full' ? '100%' : opt.id === 'text-30' ? '70%' : '85%' }}
                />
              </div>
              <span className="text-[9px] leading-tight text-center text-muted-foreground">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Customer-facing Design controls: Formkontur (line around the shape)
          and Äußerer Rahmen (rectangular frame at poster edge). The
          innerMarginMm slider was previously labelled 'Formkontur' here but
          actually controls inner padding — moved into the admin block below
          and renamed 'Innenabstand' to remove that confusion. */}
      {(shapeSupported || isSplitActive) && (
        <>
          <Separator />
          <div className="space-y-4">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {t('designSectionLabel')}
            </Label>

            {/* Formkontur (shape-only — hugs the silhouette) */}
            {shapeSupported && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground/70">{t('mapShapeContour')}</span>
                <Switch
                  checked={shapeConfig.innerFrame.enabled}
                  onCheckedChange={(enabled) => setInnerFrame({ enabled })}
                />
              </div>
              {shapeConfig.innerFrame.enabled && (
                <div className="space-y-2 pl-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{t('frameColor')}</span>
                    <input
                      type="color"
                      value={shapeConfig.innerFrame.color}
                      onChange={(e) => setInnerFrame({ color: e.target.value })}
                      className="w-6 h-6 rounded-full border border-border cursor-pointer p-0 overflow-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{t('frameThickness')}</span>
                      <span className="text-[11px] text-muted-foreground/70 tabular-nums">{shapeConfig.innerFrame.thickness} mm</span>
                    </div>
                    <Slider
                      min={0.3} max={2} step={0.1}
                      value={[shapeConfig.innerFrame.thickness]}
                      onValueChange={([v]) => setInnerFrame({ thickness: v })}
                    />
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Äußerer Rahmen — Rechteck am Poster-Rand. Auch in Split/Dual
                Modi verfügbar; dort wird er über ein synthetisches Poster-
                Rechteck gerendert. */}
            {(shapeConfig.outer.mode !== 'none' || isSplitActive) && (
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground/70">{t('mapOuterFrame')}</span>
                  <Switch
                    checked={shapeConfig.outerFrame.enabled}
                    onCheckedChange={(enabled) => setOuterFrame({ enabled })}
                  />
                </div>
                {shapeConfig.outerFrame.enabled && (
                  <div className="space-y-2 pl-1">
                    <div className="grid grid-cols-2 gap-1">
                      {(['single', 'double'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setOuterFrame({ style: s })}
                          className={cn(
                            'h-7 text-[11px] rounded border',
                            shapeConfig.outerFrame.style === s
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-white text-muted-foreground border-border hover:border-muted-foreground',
                          )}
                        >
                          {s === 'single' ? t('frameStyleSingle') : t('frameStyleDouble')}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{t('frameColor')}</span>
                      <input
                        type="color"
                        value={shapeConfig.outerFrame.color}
                        onChange={(e) => setOuterFrame({ color: e.target.value })}
                        className="w-6 h-6 rounded-full border border-border cursor-pointer p-0 overflow-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">{t('frameThickness')}</span>
                        <span className="text-[11px] text-muted-foreground/70 tabular-nums">{shapeConfig.outerFrame.thickness} mm</span>
                      </div>
                      <Slider
                        min={0.3} max={2} step={0.1}
                        value={[shapeConfig.outerFrame.thickness]}
                        onValueChange={([v]) => setOuterFrame({ thickness: v })}
                      />
                    </div>
                    {shapeConfig.outerFrame.style === 'double' && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-muted-foreground">{t('frameLineGap')}</span>
                          <span className="text-[11px] text-muted-foreground/70 tabular-nums">{shapeConfig.outerFrame.gap} mm</span>
                        </div>
                        <Slider
                          min={0.5} max={3} step={0.1}
                          value={[shapeConfig.outerFrame.gap]}
                          onValueChange={([v]) => setOuterFrame({ gap: v })}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Außenbereich — Leer/Faded/Voll + Abstand zum Poster-Rand.
                Replaces the old top-level innerMarginMm slider, which was
                redundant with this margin control. */}
            {shapeSupported && (
            <div className="space-y-2 pt-2 border-t border-border">
              <span className="text-xs font-medium text-foreground/70">{t('outerAreaLabel')}</span>
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground">{t('outerDarkMode')}</Label>
                <Switch
                  checked={posterDarkMode}
                  onCheckedChange={setPosterDarkMode}
                />
              </div>
              <div className="grid grid-cols-2 gap-1">
                {([
                  { key: 'none', label: t('outerModeNone') },
                  { key: 'opacity', label: t('outerModeFaded') },
                  { key: 'glow', label: t('outerModeGlow') },
                  { key: 'full', label: t('outerModeFull') },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setShapeOuter({ mode: opt.key })}
                    className={cn(
                      'h-7 text-[11px] rounded border',
                      shapeConfig.outer.mode === opt.key
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-white text-muted-foreground border-border hover:border-muted-foreground',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {shapeConfig.outer.mode === 'opacity' && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{t('outerOpacity')}</span>
                    <span className="text-[11px] text-muted-foreground/70 tabular-nums">{Math.round(shapeConfig.outer.opacity * 100)}%</span>
                  </div>
                  <Slider
                    min={0.1} max={1} step={0.05}
                    value={[shapeConfig.outer.opacity]}
                    onValueChange={([v]) => setShapeOuter({ opacity: v })}
                  />
                </div>
              )}
              {shapeConfig.outer.mode === 'glow' && (
                <div className="space-y-2 pt-1">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{t('outerGlowRadius')}</span>
                      <span className="text-[11px] text-muted-foreground/70 tabular-nums">{shapeConfig.outer.glowRadius ?? 250} mm</span>
                    </div>
                    <Slider
                      min={150} max={500} step={10}
                      value={[shapeConfig.outer.glowRadius ?? 250]}
                      onValueChange={([v]) => setShapeOuter({ glowRadius: v })}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{t('outerGlowIntensity')}</span>
                      <span className="text-[11px] text-muted-foreground/70 tabular-nums">{Math.round((shapeConfig.outer.glowIntensity ?? 0.5) * 100)}%</span>
                    </div>
                    <Slider
                      min={0.05} max={1} step={0.05}
                      value={[shapeConfig.outer.glowIntensity ?? 0.5]}
                      onValueChange={([v]) => setShapeOuter({ glowIntensity: v })}
                    />
                  </div>
                </div>
              )}
              {shapeConfig.outer.mode !== 'none' && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{t('outerMarginLabel')}</span>
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shapeConfig.outer.marginLocked !== false}
                        onChange={(e) =>
                          setShapeOuter({
                            marginLocked: e.target.checked,
                            ...(e.target.checked
                              ? {
                                  marginTop: shapeConfig.outer.margin,
                                  marginRight: shapeConfig.outer.margin,
                                  marginBottom: shapeConfig.outer.margin,
                                  marginLeft: shapeConfig.outer.margin,
                                }
                              : {
                                  marginTop: shapeConfig.outer.marginTop ?? shapeConfig.outer.margin,
                                  marginRight: shapeConfig.outer.marginRight ?? shapeConfig.outer.margin,
                                  marginBottom: shapeConfig.outer.marginBottom ?? shapeConfig.outer.margin,
                                  marginLeft: shapeConfig.outer.marginLeft ?? shapeConfig.outer.margin,
                                }),
                          })
                        }
                        className="w-3 h-3"
                      />
                      <span>{t('outerMarginAllSides')}</span>
                    </label>
                  </div>

                  {shapeConfig.outer.marginLocked !== false ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">{t('outerMarginAll')}</span>
                        <span className="text-[11px] text-muted-foreground/70 tabular-nums">{shapeConfig.outer.margin} mm</span>
                      </div>
                      <Slider
                        min={0} max={30} step={1}
                        value={[shapeConfig.outer.margin]}
                        onValueChange={([v]) =>
                          setShapeOuter({
                            margin: v,
                            marginTop: v,
                            marginRight: v,
                            marginBottom: v,
                            marginLeft: v,
                          })
                        }
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {([
                        { labelKey: 'outerMarginTop', field: 'marginTop' as const },
                        { labelKey: 'outerMarginRight', field: 'marginRight' as const },
                        { labelKey: 'outerMarginBottom', field: 'marginBottom' as const },
                        { labelKey: 'outerMarginLeft', field: 'marginLeft' as const },
                      ] as const).map((side) => {
                        const v = shapeConfig.outer[side.field] ?? shapeConfig.outer.margin
                        return (
                          <div key={side.field} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-muted-foreground">{t(side.labelKey)}</span>
                              <span className="text-[11px] text-muted-foreground/70 tabular-nums">{v} mm</span>
                            </div>
                            <Slider
                              min={0} max={30} step={1}
                              value={[v]}
                              onValueChange={([nv]) => setShapeOuter({ [side.field]: nv })}
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            )}
          </div>
        </>
      )}

      <Separator />

      {/* Marker Pin */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t('mapMarkerLabel')}</Label>
        <div className="flex items-center justify-between">
          <Label htmlFor="marker-switch" className="text-sm text-foreground/70 cursor-pointer">
            {t('mapMarkerShow')}
          </Label>
          <Switch
            id="marker-switch"
            checked={marker.enabled}
            onCheckedChange={(enabled) =>
              enabled && !marker.enabled
                ? // Re-activating: reset lat/lng so the pin lands at the
                  // default center again, guarding against a prior
                  // map pan/zoom pushing it off-canvas.
                  setMarker({ enabled: true, lat: null, lng: null })
                : setMarker({ enabled })
            }
          />
        </div>
        {marker.enabled && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Label className="text-sm text-muted-foreground w-12 shrink-0">{t('mapMarkerType')}</Label>
              <Select
                value={marker.type}
                onValueChange={(type: 'classic' | 'heart') => setMarker({ type })}
              >
                <SelectTrigger className="flex-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">{t('mapMarkerClassic')}</SelectItem>
                  <SelectItem value="heart">{t('mapMarkerHeart')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm text-muted-foreground w-12 shrink-0">{t('mapMarkerColor')}</Label>
              <input
                type="color"
                value={marker.color}
                onChange={(e) => setMarker({ color: e.target.value })}
                className="flex-1 h-8 rounded-md border border-border cursor-pointer px-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Admin: save the current custom palette to the DB as a new Draft. */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Palette speichern</DialogTitle>
            <DialogDescription>
              Die aktuelle Farbkombination wird als Draft in der Paletten-Bibliothek angelegt.
              Du kannst sie anschließend im Admin unter &quot;Farbpaletten&quot; veröffentlichen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="save-pal-name">Name</Label>
              <Input
                id="save-pal-name"
                value={savePaletteName}
                onChange={(e) => {
                  const v = e.target.value
                  setSavePaletteName(v)
                  // Keep slug in sync with name until the user manually edits the slug
                  if (!savePaletteSlugTouched) {
                    setSavePaletteId(
                      v.toLowerCase()
                        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
                        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                    )
                  }
                }}
                placeholder="z.B. Herbstrot"
                disabled={savePaletteSaving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="save-pal-id">ID (Slug)</Label>
              <Input
                id="save-pal-id"
                value={savePaletteId}
                onChange={(e) => {
                  setSavePaletteId(e.target.value)
                  setSavePaletteSlugTouched(true)
                }}
                placeholder="z.B. herbstrot"
                disabled={savePaletteSaving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)} disabled={savePaletteSaving}>
              Abbrechen
            </Button>
            <Button onClick={submitSavePalette} disabled={savePaletteSaving}>
              {savePaletteSaving ? 'Speichere…' : 'Als Draft speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Custom palette editor ─────────────────────────────────────────────────────

function CustomPaletteEditor({
  colors,
  onColorChange,
  onReset,
  onSaveAsPalette,
}: {
  colors: MapPaletteColors | null
  onColorChange: (key: keyof MapPaletteColors, hex: string) => void
  onReset: () => void
  onSaveAsPalette?: (colors: MapPaletteColors) => void
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
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{t('paletteAllColors')}</span>
        <button
          type="button"
          onClick={onReset}
          className="text-[10px] text-muted-foreground/70 hover:text-foreground/70"
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
            className="w-8 h-8 rounded-md border border-border cursor-pointer shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-foreground/70 leading-tight">{field.label}</p>
            <p className="text-[10px] text-muted-foreground/70 leading-tight">{field.description}</p>
          </div>
          <span className="text-[10px] text-muted-foreground/70 font-mono tabular-nums uppercase">
            {effective[field.key]}
          </span>
        </div>
      ))}
      {onSaveAsPalette && (
        <button
          type="button"
          onClick={() => onSaveAsPalette(effective)}
          className="w-full mt-2 h-8 rounded-md border border-dashed border-amber-400 text-[11px] text-amber-700 hover:bg-amber-50 transition-colors"
        >
          Als Palette speichern <span className="text-amber-500">(Admin)</span>
        </button>
      )}
    </div>
  )
}

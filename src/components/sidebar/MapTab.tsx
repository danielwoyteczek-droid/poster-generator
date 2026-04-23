'use client'

import { useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, Upload, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { LocationSearch } from '@/components/editor/LocationSearch'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { PresetPicker } from '@/components/editor/PresetPicker'
import { useEditorStore } from '@/hooks/useEditorStore'
import { useAuth } from '@/hooks/useAuth'
import { useCustomMasks } from '@/hooks/useCustomMasks'
import { MAP_MASK_OPTIONS, MAP_MASKS } from '@/lib/map-masks'
import { STYLE_OPTIONS } from '@/lib/map-style-options'
import { MAP_PALETTES } from '@/lib/map-palettes'
import { PETITE_BASE_STYLE_ID } from '@/lib/petite-style-loader'
import { uploadPhoto, deletePhoto } from '@/lib/photo-upload'
import { PHOTO_FILTERS } from '@/lib/photo-filters'
import { cn } from '@/lib/utils'

const MASK_INITIAL_VISIBLE = 3


const SPLIT_MASK_OPTIONS = MAP_MASK_OPTIONS.filter((m) => m.isSplit)
const SINGLE_MASK_OPTIONS = MAP_MASK_OPTIONS.filter((m) => !m.isSplit)

// Zones per split mask — later multi-part masks can declare 3+ zones here
const ZONE_COUNT_BY_MASK: Record<string, number> = {
  'split-circles': 2,
  'split-hearts': 2,
  'split-halves': 2,
}
const ZONE_LABELS = ['Links', 'Rechts', 'Oben', 'Unten', 'Mitte']

export function MapTab() {
  const {
    styleId, maskKey, marker, secondMarker, shapeConfig,
    paletteId, customPaletteBase, streetLabelsVisible,
    setStyleId, setMaskKey, setMarker, setSecondMarker,
    setShapeOuter, setInnerFrame, setOuterFrame,
    setPaletteId, setCustomPaletteBase, setStreetLabelsVisible,
    flyToLocation, setLocationName,
    secondMap, setSecondMapStyleId, flyToSecondLocation,
    splitMode, setSplitMode,
    splitPhoto, splitPhotoZone, setSplitPhoto, updateSplitPhoto, setSplitPhotoZone,
  } = useEditorStore()
  const { user, isAdmin } = useAuth()
  const { masks: customMasks } = useCustomMasks()

  const splitPhotoInputRef = useRef<HTMLInputElement>(null)
  const [splitUploading, setSplitUploading] = useState(false)
  const [splitProgress, setSplitProgress] = useState(0)

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
  const zoneLabel = ZONE_LABELS[splitPhotoZone] ?? `Zone ${splitPhotoZone + 1}`

  const handleSplitPhotoFile = async (file: File) => {
    if (!user) { toast.error('Bitte melde dich an, um Fotos hochzuladen.'); return }
    setSplitUploading(true)
    setSplitProgress(0)
    try {
      const uploaded = await uploadPhoto(file, {
        userId: user.id,
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
      toast.success('Foto eingefügt')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
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
        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Ort suchen</Label>
        <LocationSearch onSelect={(lng, lat, name) => { flyToLocation(lng, lat); setLocationName(name) }} />
      </div>

      {/* Split-Modus: None / zweite Karte / Foto */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Zweite Ansicht
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
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-400',
              )}
            >
              {m === 'none' ? 'Keine' : m === 'second-map' ? 'Zweite Karte' : 'Foto'}
            </button>
          ))}
        </div>

        {splitMode === 'photo' && (
          <div className="space-y-2 pl-1">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-500 flex-1">Position</Label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => cycleZone(-1)}
                  disabled={zoneCount < 2}
                  className="w-7 h-7 flex items-center justify-center rounded-sm border border-gray-200 bg-white text-gray-600 hover:border-gray-400 disabled:opacity-40"
                  aria-label="Vorherige Zone"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] text-gray-700 min-w-[48px] text-center tabular-nums">
                  {zoneLabel}
                </span>
                <button
                  type="button"
                  onClick={() => cycleZone(1)}
                  disabled={zoneCount < 2}
                  className="w-7 h-7 flex items-center justify-center rounded-sm border border-gray-200 bg-white text-gray-600 hover:border-gray-400 disabled:opacity-40"
                  aria-label="Nächste Zone"
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
                disabled={!user || splitUploading}
                variant="outline"
                className="w-full"
              >
                {splitUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="ml-2">Hochladen… {splitProgress}%</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span className="ml-2">Foto hochladen</span>
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-md border border-gray-200 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={splitPhoto.publicUrl} alt="" className="w-12 h-12 object-cover rounded-sm" />
                  <p className="flex-1 text-xs text-gray-600 truncate">
                    {splitPhoto.width} × {splitPhoto.height}px
                  </p>
                  <button
                    type="button"
                    onClick={handleRemoveSplitPhoto}
                    className="w-7 h-7 flex items-center justify-center rounded-sm hover:bg-gray-100 text-gray-500 hover:text-red-600"
                    aria-label="Foto entfernen"
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
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400',
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-600">Zoom</span>
                    <span className="text-[11px] text-gray-400 tabular-nums">
                      {splitPhoto.cropScale.toFixed(1)}×
                    </span>
                  </div>
                  <Slider
                    min={1} max={4} step={0.1}
                    value={[splitPhoto.cropScale]}
                    onValueChange={([v]) => updateSplitPhoto({ cropScale: v })}
                  />
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Ziehe das Foto auf dem Poster, um den Ausschnitt anzupassen.
                </p>
              </div>
            )}
          </div>
        )}

        {splitMode === 'second-map' && (
          <div className="space-y-3 pl-1">
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Ort (rechts)</Label>
              <LocationSearch onSelect={(lng, lat) => flyToSecondLocation(lng, lat)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-gray-500">Karten-Stil (rechts)</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {STYLE_OPTIONS.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSecondMapStyleId(style.mapId)}
                    className={cn(
                      'rounded-md border-2 px-2 py-2 text-left text-xs font-medium transition-all',
                      secondMap.styleId === style.mapId
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 text-gray-700 hover:border-gray-400'
                    )}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Second marker pin */}
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-500">Marker-Pin (rechts)</Label>
              <Switch
                checked={secondMarker.enabled}
                onCheckedChange={(enabled) => setSecondMarker({ enabled })}
              />
            </div>
            {secondMarker.enabled && (
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-gray-500 w-12 shrink-0">Typ</Label>
                  <Select
                    value={secondMarker.type}
                    onValueChange={(type: 'classic' | 'heart') => setSecondMarker({ type })}
                  >
                    <SelectTrigger className="flex-1 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">Klassisch</SelectItem>
                      <SelectItem value="heart">Herz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="text-xs text-gray-500 w-12 shrink-0">Farbe</Label>
                  <input
                    type="color"
                    value={secondMarker.color}
                    onChange={(e) => setSecondMarker({ color: e.target.value })}
                    className="flex-1 h-8 rounded-md border border-gray-200 cursor-pointer px-1"
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

      {/* Map Style — primary map */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Karten-Stil</Label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setStyleId(PETITE_BASE_STYLE_ID)}
            className={cn(
              'rounded-md border-2 px-2 py-2 text-left text-xs font-medium transition-all',
              styleId === PETITE_BASE_STYLE_ID
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-200 text-gray-700 hover:border-gray-400'
            )}
          >
            petite-moment
          </button>
          {STYLE_OPTIONS.map((style) => (
            <button
              key={style.id}
              onClick={() => setStyleId(style.mapId)}
              className={cn(
                'rounded-md border-2 px-2 py-2 text-left text-xs font-medium transition-all',
                styleId === style.mapId
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 text-gray-700 hover:border-gray-400'
              )}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Palette — only when petite-base is active (only petite-base is recolourable) */}
      {styleId === PETITE_BASE_STYLE_ID && (
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Farbpalette</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {MAP_PALETTES.map((p) => {
              const c = p.colors
              return (
                <button
                  key={p.id}
                  onClick={() => setPaletteId(p.id)}
                  className={cn(
                    'rounded-md border-2 p-2 text-left flex flex-col gap-1 transition-all',
                    paletteId === p.id
                      ? 'border-gray-900'
                      : 'border-gray-200 hover:border-gray-400',
                  )}
                  title={p.description}
                >
                  <div className="flex gap-0.5">
                    <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.land }} />
                    <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.water }} />
                    <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.road }} />
                    <span className="w-3 h-3 rounded-full border border-black/10" style={{ background: c.label }} />
                  </div>
                  <span className="text-[10px] leading-tight text-gray-700">{p.label}</span>
                </button>
              )
            })}
            <button
              onClick={() => setPaletteId('custom')}
              className={cn(
                'rounded-md border-2 p-2 text-left flex flex-col gap-1 transition-all',
                paletteId === 'custom'
                  ? 'border-gray-900'
                  : 'border-gray-200 hover:border-gray-400',
              )}
            >
              <div
                className="w-3 h-3 rounded-full border border-black/10"
                style={{ background: customPaletteBase ?? '#84c5a6' }}
              />
              <span className="text-[10px] leading-tight text-gray-700">Eigene</span>
            </button>
          </div>
          {paletteId === 'custom' && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-gray-500">Grundton</span>
              <input
                type="color"
                value={customPaletteBase ?? '#84c5a6'}
                onChange={(e) => setCustomPaletteBase(e.target.value)}
                className="flex-1 h-8 rounded-md border border-gray-200 cursor-pointer px-1"
              />
            </div>
          )}
        </div>
      )}

      {/* Street labels — always available, works on any map style */}
      <div className="flex items-center justify-between">
        <Label className="text-xs text-gray-700">Straßennamen anzeigen</Label>
        <Switch
          checked={streetLabelsVisible}
          onCheckedChange={setStreetLabelsVisible}
        />
      </div>

      <Separator />

      {/* Mask / Shape — filtered to split-only when second map is active */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Form</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {(masksExpanded ? visibleMasks : visibleMasks.slice(0, MASK_INITIAL_VISIBLE)).map((mask) => (
            <button
              key={mask.key}
              onClick={() => setMaskKey(mask.key)}
              className={cn(
                'rounded-md border-2 py-2 px-1 transition-all flex flex-col items-center gap-1',
                maskKey === mask.key
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-400'
              )}
            >
              <div className="w-8 h-8 flex items-center justify-center">
                {mask.svgPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mask.svgPath} alt={mask.label} className="w-7 h-7 object-contain" />
                ) : (
                  <div className="w-7 h-7 rounded-sm bg-gray-200" />
                )}
              </div>
              <span className="text-[9px] leading-tight text-center text-gray-600">{mask.label}</span>
            </button>
          ))}
        </div>
        {visibleMasks.length > MASK_INITIAL_VISIBLE && (
          <button
            type="button"
            onClick={() => setMasksExpanded((v) => !v)}
            className="w-full text-[11px] text-gray-500 hover:text-gray-900 flex items-center justify-center gap-0.5 py-1"
          >
            {masksExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {masksExpanded ? 'Weniger anzeigen' : `Mehr anzeigen (${visibleMasks.length - MASK_INITIAL_VISIBLE})`}
          </button>
        )}
      </div>

      {/* Design composition — Admin only */}
      {isAdmin && shapeSupported && (
        <>
          <Separator />
          <div className="space-y-4">
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Design <span className="text-[9px] normal-case text-amber-600 ml-1">Admin</span>
            </Label>

            {/* Außenbereich */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-gray-700">Außenbereich</span>
              <div className="grid grid-cols-3 gap-1">
                {([
                  { key: 'none', label: 'Leer' },
                  { key: 'opacity', label: 'Faded' },
                  { key: 'full', label: 'Voll' },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setShapeOuter({ mode: opt.key })}
                    className={cn(
                      'h-7 text-[11px] rounded border',
                      shapeConfig.outer.mode === opt.key
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {shapeConfig.outer.mode === 'opacity' && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-600">Transparenz</span>
                    <span className="text-[11px] text-gray-400 tabular-nums">{Math.round(shapeConfig.outer.opacity * 100)}%</span>
                  </div>
                  <Slider
                    min={0.1} max={1} step={0.05}
                    value={[shapeConfig.outer.opacity]}
                    onValueChange={([v]) => setShapeOuter({ opacity: v })}
                  />
                </div>
              )}
              {shapeConfig.outer.mode !== 'none' && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-600">Abstand zum Poster-Rand</span>
                    <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
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
                      <span>Alle Seiten gleich</span>
                    </label>
                  </div>

                  {shapeConfig.outer.marginLocked !== false ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-500">Alle Seiten</span>
                        <span className="text-[11px] text-gray-400 tabular-nums">{shapeConfig.outer.margin} mm</span>
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
                        { label: 'Oben', field: 'marginTop' as const },
                        { label: 'Rechts', field: 'marginRight' as const },
                        { label: 'Unten', field: 'marginBottom' as const },
                        { label: 'Links', field: 'marginLeft' as const },
                      ]).map((side) => {
                        const v = shapeConfig.outer[side.field] ?? shapeConfig.outer.margin
                        return (
                          <div key={side.field} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-gray-500">{side.label}</span>
                              <span className="text-[11px] text-gray-400 tabular-nums">{v} mm</span>
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

            {/* Innerer Rahmen (um die Form) */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">Innerer Rahmen</span>
                <Switch
                  checked={shapeConfig.innerFrame.enabled}
                  onCheckedChange={(enabled) => setInnerFrame({ enabled })}
                />
              </div>
              {shapeConfig.innerFrame.enabled && (
                <div className="space-y-2 pl-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-600">Farbe</span>
                    <input
                      type="color"
                      value={shapeConfig.innerFrame.color}
                      onChange={(e) => setInnerFrame({ color: e.target.value })}
                      className="w-6 h-6 rounded-full border border-gray-300 cursor-pointer p-0 overflow-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-600">Dicke</span>
                      <span className="text-[11px] text-gray-400 tabular-nums">{shapeConfig.innerFrame.thickness} mm</span>
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

            {/* Äußerer Rahmen (um das Rechteck) */}
            {shapeConfig.outer.mode !== 'none' && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">Äußerer Rahmen</span>
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
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400',
                          )}
                        >
                          {s === 'single' ? 'Einfach' : 'Doppelt'}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-600">Farbe</span>
                      <input
                        type="color"
                        value={shapeConfig.outerFrame.color}
                        onChange={(e) => setOuterFrame({ color: e.target.value })}
                        className="w-6 h-6 rounded-full border border-gray-300 cursor-pointer p-0 overflow-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-600">Dicke</span>
                        <span className="text-[11px] text-gray-400 tabular-nums">{shapeConfig.outerFrame.thickness} mm</span>
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
                          <span className="text-[11px] text-gray-600">Abstand der Linien</span>
                          <span className="text-[11px] text-gray-400 tabular-nums">{shapeConfig.outerFrame.gap} mm</span>
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
          </div>
        </>
      )}

      <Separator />

      {/* Marker Pin */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Marker-Pin</Label>
        <div className="flex items-center justify-between">
          <Label htmlFor="marker-switch" className="text-sm text-gray-700 cursor-pointer">
            Marker anzeigen
          </Label>
          <Switch
            id="marker-switch"
            checked={marker.enabled}
            onCheckedChange={(enabled) => setMarker({ enabled })}
          />
        </div>
        {marker.enabled && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Label className="text-sm text-gray-600 w-12 shrink-0">Typ</Label>
              <Select
                value={marker.type}
                onValueChange={(type: 'classic' | 'heart') => setMarker({ type })}
              >
                <SelectTrigger className="flex-1 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Klassisch</SelectItem>
                  <SelectItem value="heart">Herz</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm text-gray-600 w-12 shrink-0">Farbe</Label>
              <input
                type="color"
                value={marker.color}
                onChange={(e) => setMarker({ color: e.target.value })}
                className="flex-1 h-8 rounded-md border border-gray-200 cursor-pointer px-1"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

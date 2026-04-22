'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { LocationSearch } from '@/components/editor/LocationSearch'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { PresetPicker } from '@/components/editor/PresetPicker'
import { useEditorStore } from '@/hooks/useEditorStore'
import { useAuth } from '@/hooks/useAuth'
import { useCustomMasks } from '@/hooks/useCustomMasks'
import { MAP_MASK_OPTIONS, MAP_MASKS } from '@/lib/map-masks'
import { STYLE_OPTIONS } from '@/lib/map-style-options'
import { MAP_PALETTES } from '@/lib/map-palettes'
import { PETITE_BASE_STYLE_ID } from '@/lib/petite-style-loader'
import { cn } from '@/lib/utils'

const MASK_INITIAL_VISIBLE = 3


const SPLIT_MASK_OPTIONS = MAP_MASK_OPTIONS.filter((m) => m.isSplit)
const SINGLE_MASK_OPTIONS = MAP_MASK_OPTIONS.filter((m) => !m.isSplit)

export function MapTab() {
  const {
    styleId, maskKey, marker, secondMarker, shapeConfig,
    paletteId, customPaletteBase, streetLabelsVisible,
    setStyleId, setMaskKey, setMarker, setSecondMarker,
    setShapeOuter, setInnerFrame, setOuterFrame,
    setPaletteId, setCustomPaletteBase, setStreetLabelsVisible,
    flyToLocation, setLocationName,
    secondMap, setSecondMapEnabled, setSecondMapStyleId, flyToSecondLocation,
  } = useEditorStore()
  const { isAdmin } = useAuth()
  const { masks: customMasks } = useCustomMasks()

  // Admin sees built-in + uploaded; customer only sees built-in
  const adminMasks = isAdmin ? customMasks : []
  const currentMask =
    (MAP_MASKS as Record<string, typeof MAP_MASKS['none']>)[maskKey] ??
    customMasks.find((m) => m.key === maskKey) ??
    MAP_MASKS.none
  const shapeSupported = !!currentMask.shape
  const [masksExpanded, setMasksExpanded] = useState(false)

  const visibleMasks = secondMap.enabled
    ? SPLIT_MASK_OPTIONS
    : [...SINGLE_MASK_OPTIONS, ...adminMasks]

  const handleToggleSecondMap = (enabled: boolean) => {
    setSecondMapEnabled(enabled)
    if (enabled && !currentMask.isSplit) {
      setMaskKey('split-circles')
    } else if (!enabled && currentMask.isSplit) {
      setMaskKey('circle')
    }
  }

  return (
    <div className="space-y-5 p-4">
      {/* Location Search — primary map */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Ort suchen</Label>
        <LocationSearch onSelect={(lng, lat, name) => { flyToLocation(lng, lat); setLocationName(name) }} />
      </div>

      {/* Second map toggle — always visible */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Zweite Karte
          </Label>
          <Switch
            checked={secondMap.enabled}
            onCheckedChange={handleToggleSecondMap}
          />
        </div>

        {secondMap.enabled && (
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
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-600">Abstand zum Poster-Rand</span>
                    <span className="text-[11px] text-gray-400 tabular-nums">{shapeConfig.outer.margin} mm</span>
                  </div>
                  <Slider
                    min={0} max={30} step={1}
                    value={[shapeConfig.outer.margin]}
                    onValueChange={([v]) => setShapeOuter({ margin: v })}
                  />
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

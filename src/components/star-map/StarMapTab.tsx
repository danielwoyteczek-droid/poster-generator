'use client'

import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { LocationSearch } from '@/components/editor/LocationSearch'
import { PresetPicker } from '@/components/editor/PresetPicker'
import { useStarMapStore } from '@/hooks/useStarMapStore'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export function StarMapTab() {
  const {
    locationName, datetime,
    posterBgColor, skyBgColor, starColor, frameConfig,
    setLocation, setDatetime, setPosterBgColor, setSkyBgColor, setStarColor,
    setOuter, setInnerFrame, setOuterFrame,
  } = useStarMapStore()
  const { isAdmin } = useAuth()

  return (
    <div className="space-y-5 p-4">
      {/* Location */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Ort</Label>
        <LocationSearch onSelect={(lng, lat, name) => setLocation(lat, lng, name)} />
        {locationName && <p className="text-xs text-muted-foreground truncate">{locationName}</p>}
      </div>

      <Separator />

      {/* Date & Time */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          Datum & Uhrzeit
        </Label>
        <input
          type="datetime-local"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <Separator />

      {/* Designs (admin-managed presets from DB) */}
      <PresetPicker posterType="star-map" />

      <Separator />

      {/* Colors */}
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Farben</Label>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Poster-Hintergrund</span>
          <input
            type="color"
            value={posterBgColor}
            onChange={(e) => setPosterBgColor(e.target.value)}
            className="w-7 h-7 rounded-full border border-border cursor-pointer p-0 overflow-hidden"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Himmel</span>
          <input
            type="color"
            value={skyBgColor}
            onChange={(e) => setSkyBgColor(e.target.value)}
            className="w-7 h-7 rounded-full border border-border cursor-pointer p-0 overflow-hidden"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Sterne</span>
          <input
            type="color"
            value={starColor}
            onChange={(e) => setStarColor(e.target.value)}
            className="w-7 h-7 rounded-full border border-border cursor-pointer p-0 overflow-hidden"
          />
        </div>
      </div>

      <Separator />

      {/* Formkontur (Stroke um den Sky-Kreis) — customer-facing. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Formkontur</Label>
          <Switch
            checked={frameConfig.innerFrame.enabled}
            onCheckedChange={(enabled) => setInnerFrame({ enabled })}
          />
        </div>
        {frameConfig.innerFrame.enabled && (
          <div className="space-y-2 pl-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Farbe</span>
              <input
                type="color"
                value={frameConfig.innerFrame.color}
                onChange={(e) => setInnerFrame({ color: e.target.value })}
                className="w-6 h-6 rounded-full border border-border cursor-pointer p-0 overflow-hidden"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Dicke</span>
                <span className="text-[11px] text-muted-foreground/70 tabular-nums">{frameConfig.innerFrame.thickness} mm</span>
              </div>
              <Slider
                min={0.3} max={2} step={0.1}
                value={[frameConfig.innerFrame.thickness]}
                onValueChange={([v]) => setInnerFrame({ thickness: v })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Design composition — Admin only */}
      {isAdmin && (
        <>
          <Separator />
          <div className="space-y-4">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Design <span className="text-[9px] normal-case text-amber-600 ml-1">Admin</span>
            </Label>

            {/* Außenbereich */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-foreground/70">Außenbereich</span>
              <div className="grid grid-cols-3 gap-1">
                {([
                  { key: 'none', label: 'Leer' },
                  { key: 'opacity', label: 'Faded' },
                  { key: 'full', label: 'Voll' },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setOuter({ mode: opt.key })}
                    className={cn(
                      'h-7 text-[11px] rounded border',
                      frameConfig.outer.mode === opt.key
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-white text-muted-foreground border-border hover:border-muted-foreground',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {frameConfig.outer.mode === 'opacity' && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Transparenz</span>
                    <span className="text-[11px] text-muted-foreground/70 tabular-nums">{Math.round(frameConfig.outer.opacity * 100)}%</span>
                  </div>
                  <Slider
                    min={0} max={1} step={0.05}
                    value={[frameConfig.outer.opacity]}
                    onValueChange={([v]) => setOuter({ opacity: v })}
                  />
                </div>
              )}
              {(frameConfig.outer.mode !== 'none' || frameConfig.outerFrame.enabled) && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Abstand zum Poster-Rand</span>
                    <span className="text-[11px] text-muted-foreground/70 tabular-nums">{frameConfig.outer.margin} mm</span>
                  </div>
                  <Slider
                    min={0} max={30} step={1}
                    value={[frameConfig.outer.margin]}
                    onValueChange={([v]) => setOuter({ margin: v })}
                  />
                </div>
              )}
            </div>

            {/* Äußerer Rahmen (um das Rechteck) */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground/70">Äußerer Rahmen</span>
                <Switch
                  checked={frameConfig.outerFrame.enabled}
                  onCheckedChange={(enabled) => setOuterFrame({ enabled })}
                />
              </div>
              {frameConfig.outerFrame.enabled && (
                <div className="space-y-2 pl-1">
                  <div className="grid grid-cols-2 gap-1">
                    {(['single', 'double'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setOuterFrame({ style: s })}
                        className={cn(
                          'h-7 text-[11px] rounded border',
                          frameConfig.outerFrame.style === s
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-white text-muted-foreground border-border hover:border-muted-foreground',
                        )}
                      >
                        {s === 'single' ? 'Einfach' : 'Doppelt'}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Farbe</span>
                    <input
                      type="color"
                      value={frameConfig.outerFrame.color}
                      onChange={(e) => setOuterFrame({ color: e.target.value })}
                      className="w-6 h-6 rounded-full border border-border cursor-pointer p-0 overflow-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Dicke</span>
                      <span className="text-[11px] text-muted-foreground/70 tabular-nums">{frameConfig.outerFrame.thickness} mm</span>
                    </div>
                    <Slider
                      min={0.3} max={2} step={0.1}
                      value={[frameConfig.outerFrame.thickness]}
                      onValueChange={([v]) => setOuterFrame({ thickness: v })}
                    />
                  </div>
                  {frameConfig.outerFrame.style === 'double' && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Abstand der Linien</span>
                        <span className="text-[11px] text-muted-foreground/70 tabular-nums">{frameConfig.outerFrame.gap} mm</span>
                      </div>
                      <Slider
                        min={0.5} max={3} step={0.1}
                        value={[frameConfig.outerFrame.gap]}
                        onValueChange={([v]) => setOuterFrame({ gap: v })}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

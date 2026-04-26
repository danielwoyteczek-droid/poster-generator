'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { useStarMapStore } from '@/hooks/useStarMapStore'

export function HimmelTab() {
  const {
    showMilkyWay, showSun, showMoon, showPlanets, showConstellations, showCompass, showGrid, gridOpacity, starDensity,
    setShowMilkyWay, setShowSun, setShowMoon, setShowPlanets, setShowConstellations, setShowCompass, setShowGrid, setGridOpacity, setStarDensity,
  } = useStarMapStore()

  return (
    <div className="space-y-0 p-4">
      <div className="py-3 space-y-2">
        <div>
          <Label className="text-sm font-medium">Sterndichte</Label>
          <p className="text-xs text-muted-foreground/70 mt-0.5">Wie viele Sterne sichtbar sind (heller → mehr)</p>
        </div>
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Anteil</span>
            <span className="text-[11px] text-muted-foreground/70 tabular-nums">
              {Math.round(starDensity * 100)}%
            </span>
          </div>
          <Slider
            min={0.05}
            max={1}
            step={0.05}
            value={[starDensity]}
            onValueChange={([v]) => setStarDensity(v)}
          />
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify-between py-3">
        <div>
          <Label className="text-sm font-medium">Milchstraße</Label>
          <p className="text-xs text-muted-foreground/70 mt-0.5">Milchstraßenband einblenden</p>
        </div>
        <Switch checked={showMilkyWay} onCheckedChange={setShowMilkyWay} />
      </div>

      <Separator />

      <div className="flex items-center justify-between py-3">
        <div>
          <Label className="text-sm font-medium">Sternbilder</Label>
          <p className="text-xs text-muted-foreground/70 mt-0.5">Verbindungslinien der Sternbilder</p>
        </div>
        <Switch checked={showConstellations} onCheckedChange={setShowConstellations} />
      </div>

      <Separator />

      <div className="flex items-center justify-between py-3">
        <div>
          <Label className="text-sm font-medium">Sonne</Label>
          <p className="text-xs text-muted-foreground/70 mt-0.5">Position der Sonne anzeigen</p>
        </div>
        <Switch checked={showSun} onCheckedChange={setShowSun} />
      </div>

      <Separator />

      <div className="flex items-center justify-between py-3">
        <div>
          <Label className="text-sm font-medium">Mond</Label>
          <p className="text-xs text-muted-foreground/70 mt-0.5">Position des Mondes anzeigen</p>
        </div>
        <Switch checked={showMoon} onCheckedChange={setShowMoon} />
      </div>

      <Separator />

      <div className="flex items-center justify-between py-3">
        <div>
          <Label className="text-sm font-medium">Planeten</Label>
          <p className="text-xs text-muted-foreground/70 mt-0.5">Merkur, Venus, Mars, Jupiter, Saturn</p>
        </div>
        <Switch checked={showPlanets} onCheckedChange={setShowPlanets} />
      </div>

      <Separator />

      <div className="flex items-center justify-between py-3">
        <div>
          <Label className="text-sm font-medium">Himmelsrichtungen</Label>
          <p className="text-xs text-muted-foreground/70 mt-0.5">N, O, S, W am Rand des Sternenkreises</p>
        </div>
        <Switch checked={showCompass} onCheckedChange={setShowCompass} />
      </div>

      <Separator />

      <div className="py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Längen- &amp; Breitengrade</Label>
            <p className="text-xs text-muted-foreground/70 mt-0.5">Himmelsgitter im 15°-Raster</p>
          </div>
          <Switch checked={showGrid} onCheckedChange={setShowGrid} />
        </div>
        {showGrid && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Sichtbarkeit</span>
              <span className="text-[11px] text-muted-foreground/70 tabular-nums">
                {Math.round(gridOpacity * 100)}%
              </span>
            </div>
            <Slider
              min={0.05}
              max={1}
              step={0.05}
              value={[gridOpacity]}
              onValueChange={([v]) => setGridOpacity(v)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useStarMapStore } from '@/hooks/useStarMapStore'

export function HimmelTab() {
  const {
    showMilkyWay, showSun, showMoon, showPlanets, showConstellations,
    setShowMilkyWay, setShowSun, setShowMoon, setShowPlanets, setShowConstellations,
  } = useStarMapStore()

  return (
    <div className="space-y-0 p-4">
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
    </div>
  )
}

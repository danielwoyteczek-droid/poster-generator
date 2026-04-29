'use client'

import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { useStarMapStore } from '@/hooks/useStarMapStore'

export function HimmelTab() {
  const t = useTranslations('starMapEditor')
  const {
    showMilkyWay, showSun, showMoon, showPlanets, showConstellations, showCompass, showGrid, gridOpacity, starDensity,
    setShowMilkyWay, setShowSun, setShowMoon, setShowPlanets, setShowConstellations, setShowCompass, setShowGrid, setGridOpacity, setStarDensity,
  } = useStarMapStore()

  return (
    <div className="space-y-0 p-4">
      <div className="py-3 space-y-2">
        <div>
          <Label className="text-sm font-medium">{t('starDensityLabel')}</Label>
          <p className="text-xs text-muted-foreground/70 mt-0.5">{t('starDensityHint')}</p>
        </div>
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{t('starDensityValueLabel')}</span>
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
          <Label className="text-sm font-medium">{t('milkyWayLabel')}</Label>
          <p className="text-xs text-muted-foreground/70 mt-0.5">{t('milkyWayHint')}</p>
        </div>
        <Switch checked={showMilkyWay} onCheckedChange={setShowMilkyWay} />
      </div>

      <Separator />

      <div className="flex items-center justify-between py-3">
        <div>
          <Label className="text-sm font-medium">{t('constellationsLabel')}</Label>
          <p className="text-xs text-muted-foreground/70 mt-0.5">{t('constellationsHint')}</p>
        </div>
        <Switch checked={showConstellations} onCheckedChange={setShowConstellations} />
      </div>

      <Separator />

      <div className="flex items-center justify-between py-3">
        <div>
          <Label className="text-sm font-medium">{t('sunLabel')}</Label>
          <p className="text-xs text-muted-foreground/70 mt-0.5">{t('sunHint')}</p>
        </div>
        <Switch checked={showSun} onCheckedChange={setShowSun} />
      </div>

      <Separator />

      <div className="flex items-center justify-between py-3">
        <div>
          <Label className="text-sm font-medium">{t('moonLabel')}</Label>
          <p className="text-xs text-muted-foreground/70 mt-0.5">{t('moonHint')}</p>
        </div>
        <Switch checked={showMoon} onCheckedChange={setShowMoon} />
      </div>

      <Separator />

      <div className="flex items-center justify-between py-3">
        <div>
          <Label className="text-sm font-medium">{t('planetsLabel')}</Label>
          <p className="text-xs text-muted-foreground/70 mt-0.5">{t('planetsHint')}</p>
        </div>
        <Switch checked={showPlanets} onCheckedChange={setShowPlanets} />
      </div>

      <Separator />

      <div className="flex items-center justify-between py-3">
        <div>
          <Label className="text-sm font-medium">{t('compassLabel')}</Label>
          <p className="text-xs text-muted-foreground/70 mt-0.5">{t('compassHint')}</p>
        </div>
        <Switch checked={showCompass} onCheckedChange={setShowCompass} />
      </div>

      <Separator />

      <div className="py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">{t('gridLabel')}</Label>
            <p className="text-xs text-muted-foreground/70 mt-0.5">{t('gridHint')}</p>
          </div>
          <Switch checked={showGrid} onCheckedChange={setShowGrid} />
        </div>
        {showGrid && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{t('gridOpacityLabel')}</span>
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

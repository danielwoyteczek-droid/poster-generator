'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { useEditorStore } from '@/hooks/useEditorStore'
import { useAuth } from '@/hooks/useAuth'
import { useCustomMasks } from '@/hooks/useCustomMasks'
import { MAP_MASK_OPTIONS, MAP_MASKS } from '@/lib/map-masks'
import { cn } from '@/lib/utils'

const MASK_INITIAL_VISIBLE = 6

const SPLIT_MASK_OPTIONS = MAP_MASK_OPTIONS.filter((m) => m.isSplit)
const SINGLE_MASK_OPTIONS = MAP_MASK_OPTIONS.filter(
  (m) => !m.isSplit && m.key !== 'text-below',
)

export function MobileLayoutTab() {
  const t = useTranslations('editor')

  const LAYOUT_OPTIONS: { id: 'full' | 'text-30' | 'text-15'; label: string; description: string }[] = [
    { id: 'full', label: t('mapLayoutFull'), description: t('mapLayoutFullDesc') },
    { id: 'text-30', label: t('mapLayoutText30'), description: t('mapLayoutText30Desc') },
    { id: 'text-15', label: t('mapLayoutText15'), description: t('mapLayoutText15Desc') },
  ]

  const {
    maskKey, shapeConfig,
    setMaskKey,
    setShapeOuter, setInnerFrame, setOuterFrame,
    layoutId, innerMarginMm,
    setLayoutId, setInnerMarginMm,
    splitMode,
  } = useEditorStore()
  const { isAdmin } = useAuth()
  const { masks: customMasks } = useCustomMasks()

  const adminMasks = isAdmin ? customMasks : []
  const currentMask =
    (MAP_MASKS as Record<string, typeof MAP_MASKS['none']>)[maskKey] ??
    customMasks.find((m) => m.key === maskKey) ??
    MAP_MASKS.none
  const shapeSupported = !!currentMask.shape

  const isSplitActive = splitMode === 'second-map' || splitMode === 'photo'
  const visibleMasks = isSplitActive
    ? SPLIT_MASK_OPTIONS
    : [...SINGLE_MASK_OPTIONS, ...adminMasks]

  const [masksExpanded, setMasksExpanded] = useState(false)

  return (
    <div className="space-y-5 p-4">
      {/* Kartenform */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t('mapShape')}</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {(masksExpanded ? visibleMasks : visibleMasks.slice(0, MASK_INITIAL_VISIBLE)).map((mask) => (
            <button
              key={mask.key}
              onClick={() => setMaskKey(mask.key)}
              className={cn(
                'rounded-md border-2 py-3 px-1 transition-all flex flex-col items-center gap-1',
                maskKey === mask.key
                  ? 'border-primary bg-muted'
                  : 'border-border hover:border-muted-foreground'
              )}
            >
              <div className="w-10 h-10 flex items-center justify-center">
                {mask.svgPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mask.svgPath} alt={mask.label} className="w-9 h-9 object-contain" />
                ) : (
                  <div className="w-9 h-9 rounded-sm bg-muted" />
                )}
              </div>
              <span className="text-[11px] leading-tight text-center text-muted-foreground">{mask.label}</span>
            </button>
          ))}
        </div>
        {visibleMasks.length > MASK_INITIAL_VISIBLE && (
          <button
            type="button"
            onClick={() => setMasksExpanded((v) => !v)}
            className="w-full h-9 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
          >
            {masksExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {masksExpanded ? t('mapShowLess') : t('mapShowMore', { n: visibleMasks.length - MASK_INITIAL_VISIBLE })}
          </button>
        )}
      </div>

      <Separator />

      {/* Layout */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t('mapLayout')}</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setLayoutId(opt.id)}
              className={cn(
                'rounded-md border-2 py-3 px-1 transition-all flex flex-col items-center gap-1',
                layoutId === opt.id
                  ? 'border-primary bg-muted'
                  : 'border-border hover:border-muted-foreground',
              )}
            >
              <div className="w-9 h-12 rounded-sm border border-border bg-white flex flex-col overflow-hidden">
                <div
                  className="bg-muted-foreground"
                  style={{ height: opt.id === 'full' ? '100%' : opt.id === 'text-30' ? '70%' : '85%' }}
                />
              </div>
              <span className="text-[11px] leading-tight text-center text-muted-foreground">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Formkontur */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t('mapShapeContour')}</Label>
          <span className="text-xs text-muted-foreground/70 tabular-nums">{innerMarginMm} mm</span>
        </div>
        <Slider
          min={0}
          max={10}
          step={1}
          value={[innerMarginMm]}
          onValueChange={([v]) => setInnerMarginMm(v)}
        />
      </div>

      {/* Admin-only Design composition */}
      {isAdmin && shapeSupported && (
        <>
          <Separator />
          <div className="space-y-4">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Design <span className="text-[10px] normal-case text-amber-600 ml-1">Admin</span>
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
                    onClick={() => setShapeOuter({ mode: opt.key })}
                    className={cn(
                      'h-9 text-xs rounded border',
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
                    <span className="text-xs text-muted-foreground">Transparenz</span>
                    <span className="text-xs text-muted-foreground/70 tabular-nums">{Math.round(shapeConfig.outer.opacity * 100)}%</span>
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
                    <span className="text-xs text-muted-foreground">Abstand zum Poster-Rand</span>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
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
                        className="w-3.5 h-3.5"
                      />
                      <span>Alle Seiten gleich</span>
                    </label>
                  </div>

                  {shapeConfig.outer.marginLocked !== false ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Alle Seiten</span>
                        <span className="text-xs text-muted-foreground/70 tabular-nums">{shapeConfig.outer.margin} mm</span>
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
                              <span className="text-xs text-muted-foreground">{side.label}</span>
                              <span className="text-xs text-muted-foreground/70 tabular-nums">{v} mm</span>
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

            {/* Rand (Inner Frame) */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground/70">Rand</span>
                <Switch
                  checked={shapeConfig.innerFrame.enabled}
                  onCheckedChange={(enabled) => setInnerFrame({ enabled })}
                />
              </div>
              {shapeConfig.innerFrame.enabled && (
                <div className="space-y-2 pl-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Farbe</span>
                    <input
                      type="color"
                      value={shapeConfig.innerFrame.color}
                      onChange={(e) => setInnerFrame({ color: e.target.value })}
                      className="w-8 h-8 rounded-full border border-border cursor-pointer p-0 overflow-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Dicke</span>
                      <span className="text-xs text-muted-foreground/70 tabular-nums">{shapeConfig.innerFrame.thickness} mm</span>
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

            {/* Äußerer Rahmen */}
            {shapeConfig.outer.mode !== 'none' && (
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground/70">Äußerer Rahmen</span>
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
                            'h-9 text-xs rounded border',
                            shapeConfig.outerFrame.style === s
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-white text-muted-foreground border-border hover:border-muted-foreground',
                          )}
                        >
                          {s === 'single' ? 'Einfach' : 'Doppelt'}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Farbe</span>
                      <input
                        type="color"
                        value={shapeConfig.outerFrame.color}
                        onChange={(e) => setOuterFrame({ color: e.target.value })}
                        className="w-8 h-8 rounded-full border border-border cursor-pointer p-0 overflow-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Dicke</span>
                        <span className="text-xs text-muted-foreground/70 tabular-nums">{shapeConfig.outerFrame.thickness} mm</span>
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
                          <span className="text-xs text-muted-foreground">Abstand der Linien</span>
                          <span className="text-xs text-muted-foreground/70 tabular-nums">{shapeConfig.outerFrame.gap} mm</span>
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
    </div>
  )
}

'use client'

import { useTranslations } from 'next-intl'
import { useTranslatedLabel } from '@/lib/i18n-catalog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { useEditorStore } from '@/hooks/useEditorStore'
import { useAuth } from '@/hooks/useAuth'
import { useCustomMasks } from '@/hooks/useCustomMasks'
import { MAP_MASK_OPTIONS, MAP_MASKS } from '@/lib/map-masks'
import { cn } from '@/lib/utils'

const SPLIT_MASK_OPTIONS = MAP_MASK_OPTIONS.filter((m) => m.isSplit)
const SINGLE_MASK_OPTIONS = MAP_MASK_OPTIONS.filter(
  (m) => !m.isSplit && m.key !== 'text-below',
)

export function MobileLayoutTab() {
  const t = useTranslations('editor')
  const maskLabel = useTranslatedLabel('mapMasks')

  const LAYOUT_OPTIONS: { id: 'full' | 'text-30' | 'text-15'; label: string; description: string }[] = [
    { id: 'full', label: t('mapLayoutFull'), description: t('mapLayoutFullDesc') },
    { id: 'text-30', label: t('mapLayoutText30'), description: t('mapLayoutText30Desc') },
    { id: 'text-15', label: t('mapLayoutText15'), description: t('mapLayoutText15Desc') },
  ]

  const {
    maskKey, shapeConfig,
    setMaskKey,
    setShapeOuter, setInnerFrame, setOuterFrame,
    layoutId,
    setLayoutId,
    splitMode,
    posterDarkMode, setPosterDarkMode,
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

  return (
    <div className="space-y-5 p-4">
      {/* Kartenform — horizontal scroll on Mobile so the user can swipe
          through every mask. Bleed-edge -mx-4 lets a peek of the next
          item show, signalling that more options are available. */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t('mapShape')}</Label>
        <div className="flex gap-1.5 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleMasks.map((mask) => (
            <button
              key={mask.key}
              onClick={() => setMaskKey(mask.key)}
              className={cn(
                'shrink-0 w-20 snap-start rounded-md border-2 py-3 px-1 transition-all flex flex-col items-center gap-1',
                maskKey === mask.key
                  ? 'border-primary bg-muted'
                  : 'border-border'
              )}
            >
              <div className="w-10 h-10 flex items-center justify-center">
                {mask.svgPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mask.svgPath} alt={maskLabel(mask.key, mask.label)} className="w-9 h-9 object-contain" />
                ) : (
                  <div className="w-9 h-9 rounded-sm bg-muted" />
                )}
              </div>
              <span className="text-[11px] leading-tight text-center text-muted-foreground">{maskLabel(mask.key, mask.label)}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Layout — horizontal scroll matches the Kartenform pattern. */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{t('mapLayout')}</Label>
        <div className="flex gap-1.5 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setLayoutId(opt.id)}
              className={cn(
                'shrink-0 w-20 snap-start rounded-md border-2 py-3 px-1 transition-all flex flex-col items-center gap-1',
                layoutId === opt.id
                  ? 'border-primary bg-muted'
                  : 'border-border',
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

      {/* Customer-facing Design controls: Formkontur + Äußerer Rahmen.
          The innerMarginMm slider was previously labelled 'Formkontur' here
          but actually controls inner padding — moved into the admin block
          below as 'Innenabstand'. */}
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
                    <span className="text-xs text-muted-foreground">{t('frameColor')}</span>
                    <input
                      type="color"
                      value={shapeConfig.innerFrame.color}
                      onChange={(e) => setInnerFrame({ color: e.target.value })}
                      className="w-8 h-8 rounded-full border border-border cursor-pointer p-0 overflow-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t('frameThickness')}</span>
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
                            'h-9 text-xs rounded border',
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
                      <span className="text-xs text-muted-foreground">{t('frameColor')}</span>
                      <input
                        type="color"
                        value={shapeConfig.outerFrame.color}
                        onChange={(e) => setOuterFrame({ color: e.target.value })}
                        className="w-8 h-8 rounded-full border border-border cursor-pointer p-0 overflow-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{t('frameThickness')}</span>
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
                          <span className="text-xs text-muted-foreground">{t('frameLineGap')}</span>
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

            {/* Außenbereich — Leer/Faded/Voll + Abstand zum Poster-Rand. */}
            {shapeSupported && (
            <div className="space-y-2 pt-2 border-t border-border">
              <span className="text-xs font-medium text-foreground/70">{t('outerAreaLabel')}</span>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">{t('outerDarkMode')}</Label>
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
                    <span className="text-xs text-muted-foreground">{t('outerOpacity')}</span>
                    <span className="text-xs text-muted-foreground/70 tabular-nums">{Math.round(shapeConfig.outer.opacity * 100)}%</span>
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
                      <span className="text-xs text-muted-foreground">{t('outerGlowRadius')}</span>
                      <span className="text-xs text-muted-foreground/70 tabular-nums">{shapeConfig.outer.glowRadius ?? 250} mm</span>
                    </div>
                    <Slider
                      min={150} max={500} step={10}
                      value={[shapeConfig.outer.glowRadius ?? 250]}
                      onValueChange={([v]) => setShapeOuter({ glowRadius: v })}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t('outerGlowIntensity')}</span>
                      <span className="text-xs text-muted-foreground/70 tabular-nums">{Math.round((shapeConfig.outer.glowIntensity ?? 0.5) * 100)}%</span>
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
                    <span className="text-xs text-muted-foreground">{t('outerMarginLabel')}</span>
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
                      <span>{t('outerMarginAllSides')}</span>
                    </label>
                  </div>

                  {shapeConfig.outer.marginLocked !== false ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{t('outerMarginAll')}</span>
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
                        { labelKey: 'outerMarginTop', field: 'marginTop' as const },
                        { labelKey: 'outerMarginRight', field: 'marginRight' as const },
                        { labelKey: 'outerMarginBottom', field: 'marginBottom' as const },
                        { labelKey: 'outerMarginLeft', field: 'marginLeft' as const },
                      ] as const).map((side) => {
                        const v = shapeConfig.outer[side.field] ?? shapeConfig.outer.margin
                        return (
                          <div key={side.field} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">{t(side.labelKey)}</span>
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
            )}
          </div>
        </>
      )}
    </div>
  )
}

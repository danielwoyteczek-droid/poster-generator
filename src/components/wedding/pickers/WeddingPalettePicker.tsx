'use client'

import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useMapPalettes } from '@/hooks/useMapPalettes'
import { MAP_PALETTES } from '@/lib/map-palettes'
import {
  useWeddingEditorStore,
  type SlotIndex,
} from '@/hooks/useWeddingEditorStore'

/**
 * Slot-aware Paletten-Picker. Zeigt eine 3-Spalten-Grid mit Farb-Swatches
 * (Hintergrund / Land / Wasser / Straße) — der Customer sieht das
 * Look-and-Feel sofort, ohne den Style-Namen lesen zu müssen.
 *
 * Custom-Palette-Editor (eigene Farben mischen) ist hier noch nicht
 * implementiert — kommt mit der Style-Reduction-Pass von PROJ-36, sobald
 * Wedding mit dem Customer-Min-View ausgerichtet ist.
 */
export function WeddingPalettePicker({ index }: { index: SlotIndex }) {
  const t = useTranslations('editor')
  const { palettes: dbPalettes } = useMapPalettes()
  const palettes = dbPalettes.length > 0 ? dbPalettes : MAP_PALETTES
  const paletteId = useWeddingEditorStore((s) => s.slots[index].paletteId)
  const updateSlot = useWeddingEditorStore((s) => s.updateSlot)

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{t('mapPalette')}</Label>
      <div className="grid grid-cols-3 gap-2">
        {palettes.map((palette) => {
          const active = palette.id === paletteId
          return (
            <button
              key={palette.id}
              type="button"
              onClick={() =>
                updateSlot(index, {
                  paletteId: palette.id,
                  customPaletteBase: null,
                  customPalette: null,
                })
              }
              className={cn(
                'group flex flex-col items-stretch gap-1 p-1.5 rounded-md border transition-colors',
                'hover:border-foreground/30',
                active ? 'border-primary ring-1 ring-primary/30' : 'border-border',
              )}
              title={palette.label}
              aria-label={palette.label}
              aria-pressed={active}
            >
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border/30">
                <div
                  className="aspect-square"
                  style={{ backgroundColor: palette.colors.land }}
                  aria-hidden
                />
                <div
                  className="aspect-square"
                  style={{ backgroundColor: palette.colors.water }}
                  aria-hidden
                />
                <div
                  className="aspect-square"
                  style={{ backgroundColor: palette.colors.road }}
                  aria-hidden
                />
                <div
                  className="aspect-square"
                  style={{ backgroundColor: palette.colors.background }}
                  aria-hidden
                />
              </div>
              <span className="text-[10px] leading-tight truncate text-foreground/80">
                {palette.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import { useTranslations } from 'next-intl'
import { useTranslatedLabel } from '@/lib/i18n-catalog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MAP_LAYOUTS } from '@/lib/map-layouts'
import {
  useWeddingEditorStore,
  type SlotIndex,
} from '@/hooks/useWeddingEditorStore'

/**
 * Slot-aware Karten-Stil-Picker. Liest aus dem aktiven Slot, schreibt via
 * `updateSlot(index, { styleId })`. Locale-Labels werden über
 * `useTranslatedLabel('mapLayouts')` aufgelöst — die ID-basierten Keys (z. B.
 * `klassischLabel`, `minimalLabel`) sind dieselben, die der Single-Map-Editor
 * nutzt, damit Übersetzungen einmal gepflegt werden müssen.
 */
export function WeddingStylePicker({ index }: { index: SlotIndex }) {
  const t = useTranslations('editor')
  const layoutLabel = useTranslatedLabel('mapLayouts')
  const styleId = useWeddingEditorStore((s) => s.slots[index].styleId)
  const updateSlot = useWeddingEditorStore((s) => s.updateSlot)

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{t('mapStyleLabel')}</Label>
      <Select value={styleId} onValueChange={(v) => updateSlot(index, { styleId: v })}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MAP_LAYOUTS.map((layout) => (
            <SelectItem key={layout.id} value={layout.id}>
              {layoutLabel(`${layout.id}Label`, layout.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

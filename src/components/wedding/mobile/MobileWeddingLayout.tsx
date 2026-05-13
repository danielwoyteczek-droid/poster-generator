'use client'

import { useTranslations } from 'next-intl'
import { RectangleVertical, RectangleHorizontal } from 'lucide-react'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { WeddingCanvas } from '../WeddingCanvas'
import { SlotTabSwitcher } from '../SlotTabSwitcher'
import { useWeddingEditorStore, type SlotIndex } from '@/hooks/useWeddingEditorStore'
import { useEditorStore } from '@/hooks/useEditorStore'
import {
  PRINT_FORMAT_OPTIONS,
  type PrintFormat,
  type PosterOrientation,
} from '@/lib/print-formats'
import { cn } from '@/lib/utils'
import { LocationSearch } from '@/components/editor/LocationSearch'
import { WeddingStylePicker } from '../pickers/WeddingStylePicker'
import { WeddingPalettePicker } from '../pickers/WeddingPalettePicker'

/**
 * Mobile-Variante (< 1024 px) — Chunk-2-Provisorium: Canvas oben, darunter
 * Slot-Tabs + Felder. Funktional + 375-px-tauglich, aber NICHT die finale
 * Apple-Maps-Tap-Sheet-UX aus PROJ-43. Die kommt in Chunk 5 (eigenständige
 * MobileWeddingSheet-Komponente mit Snap-Points).
 */
function MobileSlotFields({ index }: { index: SlotIndex }) {
  const t = useTranslations('wedding')
  const slot = useWeddingEditorStore((s) => s.slots[index])
  const setSlotLabel = useWeddingEditorStore((s) => s.setSlotLabel)
  const setSlotDate = useWeddingEditorStore((s) => s.setSlotDate)
  const setSlotLocation = useWeddingEditorStore((s) => s.setSlotLocation)

  return (
    <div className="space-y-3 p-4">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('placeholderLocation')}</Label>
        <LocationSearch
          placeholder={t('placeholderLocation')}
          onSelect={(lng, lat, name) => setSlotLocation(index, lat, lng, name)}
        />
        {slot.locationName && (
          <div className="text-xs text-muted-foreground truncate">{slot.locationName}</div>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`m-slot-label-${index}`} className="text-xs">
          {t('slotLabelLabel')}
        </Label>
        <Input
          id={`m-slot-label-${index}`}
          value={slot.label}
          onChange={(e) => setSlotLabel(index, e.target.value)}
          placeholder={t('slotLabelPlaceholder')}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`m-slot-date-${index}`} className="text-xs">
          {t('slotDateLabel')}
        </Label>
        <Input
          id={`m-slot-date-${index}`}
          type="date"
          value={slot.date}
          onChange={(e) => setSlotDate(index, e.target.value)}
        />
      </div>

      <Separator className="my-1" />

      <WeddingStylePicker index={index} />
      <WeddingPalettePicker index={index} />
    </div>
  )
}

function MobilePaperFormatAndOrientation() {
  const t = useTranslations('editor')
  const printFormat = useEditorStore((s) => s.printFormat)
  const orientation = useEditorStore((s) => s.orientation)
  const setPrintFormat = useEditorStore((s) => s.setPrintFormat)
  const setOrientation = useEditorStore((s) => s.setOrientation)

  const orientationOptions: {
    value: PosterOrientation
    label: string
    Icon: typeof RectangleVertical
  }[] = [
    { value: 'portrait', label: t('orientationPortrait'), Icon: RectangleVertical },
    { value: 'landscape', label: t('orientationLandscape'), Icon: RectangleHorizontal },
  ]

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('paperFormat')}
        </Label>
        <div className="grid grid-cols-3 gap-1.5">
          {PRINT_FORMAT_OPTIONS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setPrintFormat(f.id as PrintFormat)}
              className={cn(
                'h-9 rounded-md border-2 text-sm font-medium transition-colors',
                printFormat === f.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-foreground/70 hover:border-muted-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {t('orientationLabel')}
        </Label>
        <div className="grid grid-cols-2 gap-1.5">
          {orientationOptions.map(({ value, label, Icon }) => {
            const active = orientation === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setOrientation(value)}
                aria-pressed={active}
                className={cn(
                  'flex items-center justify-center gap-1.5 h-9 rounded-md border-2 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-foreground/70 hover:border-muted-foreground',
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MobileGlobalFields() {
  const t = useTranslations('wedding')
  const coupleNames = useWeddingEditorStore((s) => s.coupleNames)
  const weddingDate = useWeddingEditorStore((s) => s.weddingDate)
  const setCoupleNames = useWeddingEditorStore((s) => s.setCoupleNames)
  const setWeddingDate = useWeddingEditorStore((s) => s.setWeddingDate)

  return (
    <div className="space-y-3 p-4">
      <MobilePaperFormatAndOrientation />

      <Separator />

      <div className="space-y-1.5">
        <Label htmlFor="m-couple-names" className="text-xs">
          {t('coupleNamesLabel')}
        </Label>
        <Input
          id="m-couple-names"
          value={coupleNames}
          onChange={(e) => setCoupleNames(e.target.value)}
          placeholder={t('coupleNamesPlaceholder')}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-wedding-date" className="text-xs">
          {t('weddingDateLabel')}
        </Label>
        <Input
          id="m-wedding-date"
          type="date"
          value={weddingDate}
          onChange={(e) => setWeddingDate(e.target.value)}
        />
      </div>
    </div>
  )
}

export function MobileWeddingLayout() {
  const activeSlotIndex = useWeddingEditorStore((s) => s.activeSlotIndex)
  const setActiveSlotIndex = useWeddingEditorStore((s) => s.setActiveSlotIndex)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Canvas top — fixed at half-ish so the form stays reachable */}
      <div className="basis-1/2 min-h-0 overflow-hidden">
        <WeddingCanvas />
      </div>

      {/* Form bottom — scrollable */}
      <div className="basis-1/2 min-h-0 border-t border-border bg-white overflow-y-auto">
        <Tabs
          value={String(activeSlotIndex)}
          onValueChange={(v) => setActiveSlotIndex(Number(v) as SlotIndex)}
          className="flex flex-col"
        >
          <SlotTabSwitcher />
          <TabsContent value="0" className="mt-0">
            <MobileSlotFields index={0} />
          </TabsContent>
          <TabsContent value="1" className="mt-0">
            <MobileSlotFields index={1} />
          </TabsContent>
          <TabsContent value="2" className="mt-0">
            <MobileSlotFields index={2} />
          </TabsContent>
        </Tabs>
        <Separator />
        <MobileGlobalFields />
      </div>
    </div>
  )
}

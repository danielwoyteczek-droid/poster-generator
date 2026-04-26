'use client'

import { useTranslations } from 'next-intl'
import {
  Plus,
  Lock,
  Unlock,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useEditorStore, type TextBlock } from '@/hooks/useEditorStore'
import { getCoordinatesText } from '@/components/editor/TextBlockOverlay'
import { cn } from '@/lib/utils'

const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond' },
  { value: 'Amsterdam', label: 'Amsterdam' },
  { value: 'Cathalia', label: 'Cathalia' },
  { value: 'CaviarDreams', label: 'Caviar Dreams' },
  { value: 'Arial', label: 'Arial' },
]

interface TextTabProps {
  /** When set, overrides the coordinates source used to display the
   *  isCoordinates block. The star-map editor passes its own store's
   *  lat/lng/locationName here so changing the city in the star-map
   *  search updates the panel preview text. Map editor leaves this
   *  undefined and the map store values are used. */
  coordinatesSource?: { lat: number; lng: number; locationName: string }
}

export function TextTab({ coordinatesSource }: TextTabProps = {}) {
  const t = useTranslations('editor')
  const {
    textBlocks,
    selectedBlockId,
    addTextBlock,
    updateTextBlock,
    deleteTextBlock,
    setSelectedBlockId,
    viewState,
    locationName,
  } = useEditorStore()

  const coords = coordinatesSource ?? { lat: viewState.lat, lng: viewState.lng, locationName }
  const coordsText = getCoordinatesText(coords.lat, coords.lng, coords.locationName)

  const titleIdeas = [
    t('textIdea1'),
    t('textIdea2'),
    t('textIdea3'),
    t('textIdea4'),
    t('textIdea5'),
    t('textIdea6'),
  ]

  const getBlockLabel = (block: TextBlock): string => {
    if (block.label) return block.label
    if (block.isCoordinates) return coordsText ?? t('textLabelCoordinates')
    if (!block.text.trim()) return t('textLabelEmpty')
    return block.text.length > 20 ? `${block.text.slice(0, 20)}…` : block.text
  }

  const selectedBlock = textBlocks.find((b) => b.id === selectedBlockId) ?? null

  return (
    <div className="space-y-4 p-4">
      {/* Add block button */}
      <button
        type="button"
        onClick={addTextBlock}
        className="w-full h-9 flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        {t('textAddBlock')}
      </button>

      {/* Block list */}
      <div className="space-y-1">
        {textBlocks.map((block) => {
          const isSelected = block.id === selectedBlockId
          return (
            <div
              key={block.id}
              onClick={() => setSelectedBlockId(block.id)}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer',
                isSelected ? 'bg-muted' : 'hover:bg-muted/50'
              )}
            >
              <span className="flex-1 text-sm text-foreground/70 truncate">
                {getBlockLabel(block)}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  updateTextBlock(block.id, { locked: !block.locked })
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label={block.locked ? t('textUnlock') : t('textLock')}
                title={block.locked ? t('textUnlock') : t('textLock')}
              >
                {block.locked ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <Unlock className="w-3.5 h-3.5" />
                )}
              </button>
              {!block.locked && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteTextBlock(block.id)
                  }}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={t('textDelete')}
                  title={t('textDelete')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {selectedBlock && (
        <>
          <Separator />

          {/* Text content */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                {t('textLabel')}
              </Label>
              {!selectedBlock.isCoordinates && (
                <Select
                  value=""
                  onValueChange={(val) =>
                    updateTextBlock(selectedBlock.id, { text: val })
                  }
                >
                  <SelectTrigger className="h-6 w-auto text-xs border-0 shadow-none text-muted-foreground/70 hover:text-foreground px-1 gap-1 focus:ring-0">
                    <SelectValue placeholder={t('textIdeas')} />
                  </SelectTrigger>
                  <SelectContent>
                    {titleIdeas.map((idea) => (
                      <SelectItem key={idea} value={idea} className="text-sm">
                        {idea}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Textarea
              value={selectedBlock.isCoordinates ? coordsText : selectedBlock.text}
              onChange={(e) =>
                updateTextBlock(selectedBlock.id, {
                  text: e.target.value,
                  isCoordinates: false,
                })
              }
              className="min-h-[64px] text-sm"
            />
          </div>

          {/* Font family */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {t('textFontFamily')}
            </Label>
            <Select
              value={selectedBlock.fontFamily}
              onValueChange={(val) =>
                updateTextBlock(selectedBlock.id, { fontFamily: val })
              }
            >
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font size */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {t('textSize')}
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={8}
                max={220}
                value={selectedBlock.fontSize}
                onChange={(e) =>
                  updateTextBlock(selectedBlock.id, {
                    fontSize: Number(e.target.value),
                  })
                }
                className="flex-1"
              />
              <Input
                type="number"
                min={8}
                max={220}
                value={selectedBlock.fontSize}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  if (!Number.isNaN(val)) {
                    updateTextBlock(selectedBlock.id, {
                      fontSize: Math.max(8, Math.min(220, val)),
                    })
                  }
                }}
                className="w-14 h-8 text-sm"
              />
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {t('textColor')}
            </Label>
            <input
              type="color"
              value={selectedBlock.color}
              onChange={(e) =>
                updateTextBlock(selectedBlock.id, { color: e.target.value })
              }
              className="w-full h-8 rounded-md border border-border cursor-pointer px-1"
            />
          </div>

          {/* Alignment */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {t('textAlignment')}
            </Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { value: 'left', Icon: AlignLeft, label: t('textAlignLeft') },
                  { value: 'center', Icon: AlignCenter, label: t('textAlignCenter') },
                  { value: 'right', Icon: AlignRight, label: t('textAlignRight') },
                ] as const
              ).map(({ value, Icon, label }) => {
                const active = selectedBlock.align === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      updateTextBlock(selectedBlock.id, { align: value })
                    }
                    aria-label={label}
                    title={label}
                    className={cn(
                      'h-8 flex items-center justify-center rounded-md text-xs transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border text-foreground/70 hover:border-muted-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Style */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              {t('textStyle')}
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() =>
                  updateTextBlock(selectedBlock.id, { bold: !selectedBlock.bold })
                }
                aria-label={t('textBold')}
                title={t('textBold')}
                className={cn(
                  'h-8 flex items-center justify-center rounded-md text-sm font-bold transition-colors',
                  selectedBlock.bold
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border text-foreground/70 hover:border-muted-foreground'
                )}
              >
                B
              </button>
              <button
                type="button"
                onClick={() =>
                  updateTextBlock(selectedBlock.id, {
                    uppercase: !selectedBlock.uppercase,
                  })
                }
                aria-label={t('textUppercase')}
                title={t('textUppercase')}
                className={cn(
                  'h-8 flex items-center justify-center rounded-md text-sm transition-colors',
                  selectedBlock.uppercase
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border text-foreground/70 hover:border-muted-foreground'
                )}
              >
                AA
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

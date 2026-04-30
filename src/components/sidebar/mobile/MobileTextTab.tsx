'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Plus,
  Lock,
  Unlock,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronRight,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useEditorStore, type TextBlock } from '@/hooks/useEditorStore'
import { getCoordinatesText } from '@/components/editor/TextBlockOverlay'
import { cn } from '@/lib/utils'

const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond' },
  { value: 'Amsterdam', label: 'Amsterdam' },
  { value: 'Cathalia', label: 'Cathalia' },
  { value: 'Lindsey Signature', label: 'Lindsey Signature' },
  { value: 'CaviarDreams', label: 'Caviar Dreams' },
  { value: 'Arial', label: 'Arial' },
]

interface MobileTextTabProps {
  /** Optional override for the isCoordinates-block preview text. Star-map
   *  passes its own store coords here. See TextTab for details. */
  coordinatesSource?: { lat: number; lng: number; locationName: string }
  /** Photo-Poster-Editor passes true to hide coordinate blocks (a photo
   *  product has no map location). See TextTab for details. */
  hideCoordinates?: boolean
}

export function MobileTextTab({ coordinatesSource, hideCoordinates = false }: MobileTextTabProps = {}) {
  const t = useTranslations('editor')
  const {
    textBlocks,
    addTextBlock,
    updateTextBlock,
    deleteTextBlock,
    setSelectedBlockId,
    viewState,
    locationName,
  } = useEditorStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const coords = coordinatesSource ?? { lat: viewState.lat, lng: viewState.lng, locationName }
  const coordsText = getCoordinatesText(coords.lat, coords.lng, coords.locationName)
  const visibleBlocks = hideCoordinates
    ? textBlocks.filter((b) => !b.isCoordinates)
    : textBlocks
  const editingBlock = visibleBlocks.find((b) => b.id === editingId) ?? null

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
    return block.text.length > 24 ? `${block.text.slice(0, 24)}…` : block.text
  }

  const openEditor = (id: string) => {
    setSelectedBlockId(id)
    setEditingId(id)
  }

  const closeEditor = () => {
    setEditingId(null)
  }

  return (
    <div className="space-y-4 p-4">
      <button
        type="button"
        onClick={addTextBlock}
        className="w-full h-11 flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        {t('textAddBlock')}
      </button>

      <div className="space-y-1">
        {visibleBlocks.map((block) => (
          <div
            key={block.id}
            onClick={() => openEditor(block.id)}
            className="flex items-center gap-2 px-3 py-3 rounded-md cursor-pointer hover:bg-muted active:bg-muted min-h-[44px]"
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
              className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label={block.locked ? t('textUnlock') : t('textLock')}
            >
              {block.locked ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
            </button>
            <ChevronRight className="w-4 h-4 text-muted-foreground/70" />
          </div>
        ))}
      </div>

      {textBlocks.length === 0 && (
        <p className="text-[11px] text-muted-foreground/70 leading-relaxed text-center pt-4">
          {t('textNoBlocksHint')}
        </p>
      )}

      <Sheet open={editingBlock !== null} onOpenChange={(open) => !open && closeEditor()}>
        <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col">
          {editingBlock && (
            <>
              <SheetHeader className="shrink-0 px-4 pt-4 pb-2 border-b border-border">
                <SheetTitle className="text-left text-sm font-semibold">
                  {t('textEditBlock')}
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {t('textLabel')}
                    </Label>
                    {!editingBlock.isCoordinates && (
                      <Select
                        value=""
                        onValueChange={(val) =>
                          updateTextBlock(editingBlock.id, { text: val })
                        }
                      >
                        <SelectTrigger className="h-6 w-auto text-xs border-0 shadow-none text-muted-foreground/70 hover:text-foreground/70 px-1 gap-1 focus:ring-0">
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
                    value={editingBlock.isCoordinates ? coordsText : editingBlock.text}
                    onChange={(e) =>
                      updateTextBlock(editingBlock.id, {
                        text: e.target.value,
                        isCoordinates: false,
                      })
                    }
                    className="min-h-[88px] text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t('textFontFamily')}
                  </Label>
                  <Select
                    value={editingBlock.fontFamily}
                    onValueChange={(val) =>
                      updateTextBlock(editingBlock.id, { fontFamily: val })
                    }
                  >
                    <SelectTrigger className="w-full h-11 text-sm">
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

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t('textSize')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={8}
                      max={220}
                      value={editingBlock.fontSize}
                      onChange={(e) =>
                        updateTextBlock(editingBlock.id, {
                          fontSize: Number(e.target.value),
                        })
                      }
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      min={8}
                      max={220}
                      value={editingBlock.fontSize}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        if (!Number.isNaN(val)) {
                          updateTextBlock(editingBlock.id, {
                            fontSize: Math.max(8, Math.min(220, val)),
                          })
                        }
                      }}
                      className="w-16 h-10 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t('textColor')}
                  </Label>
                  <input
                    type="color"
                    value={editingBlock.color}
                    onChange={(e) =>
                      updateTextBlock(editingBlock.id, { color: e.target.value })
                    }
                    className="w-full h-11 rounded-md border border-border cursor-pointer px-1"
                  />
                </div>

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
                      const active = editingBlock.align === value
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            updateTextBlock(editingBlock.id, { align: value })
                          }
                          aria-label={label}
                          className={cn(
                            'h-11 flex items-center justify-center rounded-md text-xs transition-colors',
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

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {t('textStyle')}
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateTextBlock(editingBlock.id, { bold: !editingBlock.bold })
                      }
                      aria-label={t('textBold')}
                      className={cn(
                        'h-11 flex items-center justify-center rounded-md text-sm font-bold transition-colors',
                        editingBlock.bold
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border text-foreground/70 hover:border-muted-foreground'
                      )}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateTextBlock(editingBlock.id, {
                          uppercase: !editingBlock.uppercase,
                        })
                      }
                      aria-label={t('textUppercase')}
                      className={cn(
                        'h-11 flex items-center justify-center rounded-md text-sm transition-colors',
                        editingBlock.uppercase
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border text-foreground/70 hover:border-muted-foreground'
                      )}
                    >
                      AA
                    </button>
                  </div>
                </div>

                {!editingBlock.locked && (
                  <>
                    <Separator />
                    <button
                      type="button"
                      onClick={() => {
                        deleteTextBlock(editingBlock.id)
                        closeEditor()
                      }}
                      className="w-full h-11 flex items-center justify-center gap-2 rounded-md border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('textDeleteBlock')}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

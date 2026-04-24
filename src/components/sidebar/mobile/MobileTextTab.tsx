'use client'

import { useState } from 'react'
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

const TITLE_IDEAS = [
  'Wo alles begann...',
  'Home sweet home',
  'Du und ich',
  'Zu Hause',
  'Just married',
  'Unser erster Kuss',
]

const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond' },
  { value: 'Amsterdam', label: 'Amsterdam' },
  { value: 'Cathalia', label: 'Cathalia' },
  { value: 'CaviarDreams', label: 'Caviar Dreams' },
  { value: 'Arial', label: 'Arial' },
]

function getBlockLabel(block: TextBlock, coordsText?: string): string {
  if (block.label) return block.label
  if (block.isCoordinates) return coordsText ?? 'Ort & Koordinaten'
  if (!block.text.trim()) return 'Leer'
  return block.text.length > 24 ? `${block.text.slice(0, 24)}…` : block.text
}

export function MobileTextTab() {
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
  const coordsText = getCoordinatesText(viewState.lat, viewState.lng, locationName)
  const editingBlock = textBlocks.find((b) => b.id === editingId) ?? null

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
        className="w-full h-11 flex items-center justify-center gap-2 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Textblock hinzufügen
      </button>

      <div className="space-y-1">
        {textBlocks.map((block) => (
          <div
            key={block.id}
            onClick={() => openEditor(block.id)}
            className="flex items-center gap-2 px-3 py-3 rounded-md cursor-pointer hover:bg-gray-50 active:bg-gray-100 min-h-[44px]"
          >
            <span className="flex-1 text-sm text-gray-700 truncate">
              {getBlockLabel(block, coordsText)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                updateTextBlock(block.id, { locked: !block.locked })
              }}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-900"
              aria-label={block.locked ? 'Entsperren' : 'Sperren'}
            >
              {block.locked ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        ))}
      </div>

      {textBlocks.length === 0 && (
        <p className="text-[11px] text-gray-400 leading-relaxed text-center pt-4">
          Noch keine Textblöcke. Tipp auf „Textblock hinzufügen", um loszulegen.
        </p>
      )}

      <Sheet open={editingBlock !== null} onOpenChange={(open) => !open && closeEditor()}>
        <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col">
          {editingBlock && (
            <>
              <SheetHeader className="shrink-0 px-4 pt-4 pb-2 border-b border-gray-200">
                <SheetTitle className="text-left text-sm font-semibold">
                  Textblock bearbeiten
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Text
                    </Label>
                    {!editingBlock.isCoordinates && (
                      <Select
                        value=""
                        onValueChange={(val) =>
                          updateTextBlock(editingBlock.id, { text: val })
                        }
                      >
                        <SelectTrigger className="h-6 w-auto text-xs border-0 shadow-none text-gray-400 hover:text-gray-700 px-1 gap-1 focus:ring-0">
                          <SelectValue placeholder="Ideen" />
                        </SelectTrigger>
                        <SelectContent>
                          {TITLE_IDEAS.map((idea) => (
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
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Schriftart
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
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Größe
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
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Farbe
                  </Label>
                  <input
                    type="color"
                    value={editingBlock.color}
                    onChange={(e) =>
                      updateTextBlock(editingBlock.id, { color: e.target.value })
                    }
                    className="w-full h-11 rounded-md border border-gray-200 cursor-pointer px-1"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Ausrichtung
                  </Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { value: 'left', Icon: AlignLeft, label: 'Links' },
                        { value: 'center', Icon: AlignCenter, label: 'Zentriert' },
                        { value: 'right', Icon: AlignRight, label: 'Rechts' },
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
                              ? 'bg-gray-900 text-white'
                              : 'border border-gray-200 text-gray-700 hover:border-gray-400'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Stil
                  </Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateTextBlock(editingBlock.id, { bold: !editingBlock.bold })
                      }
                      aria-label="Fett"
                      className={cn(
                        'h-11 flex items-center justify-center rounded-md text-sm font-bold transition-colors',
                        editingBlock.bold
                          ? 'bg-gray-900 text-white'
                          : 'border border-gray-200 text-gray-700 hover:border-gray-400'
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
                      aria-label="Großbuchstaben"
                      className={cn(
                        'h-11 flex items-center justify-center rounded-md text-sm transition-colors',
                        editingBlock.uppercase
                          ? 'bg-gray-900 text-white'
                          : 'border border-gray-200 text-gray-700 hover:border-gray-400'
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
                      Textblock löschen
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

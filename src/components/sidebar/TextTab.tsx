'use client'

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
  return block.text.length > 20 ? `${block.text.slice(0, 20)}…` : block.text
}

export function TextTab() {
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

  const coordsText = getCoordinatesText(viewState.lat, viewState.lng, locationName)

  const selectedBlock = textBlocks.find((b) => b.id === selectedBlockId) ?? null

  return (
    <div className="space-y-4 p-4">
      {/* Add block button */}
      <button
        type="button"
        onClick={addTextBlock}
        className="w-full h-9 flex items-center justify-center gap-2 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Textblock hinzufügen
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
                isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
              )}
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
                className="text-gray-500 hover:text-gray-900"
                aria-label={block.locked ? 'Entsperren' : 'Sperren'}
                title={block.locked ? 'Entsperren' : 'Sperren'}
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
                  className="text-gray-500 hover:text-red-600"
                  aria-label="Löschen"
                  title="Löschen"
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
              <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Text
              </Label>
              {!selectedBlock.isCoordinates && (
                <Select
                  value=""
                  onValueChange={(val) =>
                    updateTextBlock(selectedBlock.id, { text: val })
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
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Schriftart
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
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Größe
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
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Farbe
            </Label>
            <input
              type="color"
              value={selectedBlock.color}
              onChange={(e) =>
                updateTextBlock(selectedBlock.id, { color: e.target.value })
              }
              className="w-full h-8 rounded-md border border-gray-200 cursor-pointer px-1"
            />
          </div>

          {/* Alignment */}
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

          {/* Style */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Stil
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() =>
                  updateTextBlock(selectedBlock.id, { bold: !selectedBlock.bold })
                }
                aria-label="Fett"
                title="Fett"
                className={cn(
                  'h-8 flex items-center justify-center rounded-md text-sm font-bold transition-colors',
                  selectedBlock.bold
                    ? 'bg-gray-900 text-white'
                    : 'border border-gray-200 text-gray-700 hover:border-gray-400'
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
                aria-label="Großbuchstaben"
                title="Großbuchstaben"
                className={cn(
                  'h-8 flex items-center justify-center rounded-md text-sm transition-colors',
                  selectedBlock.uppercase
                    ? 'bg-gray-900 text-white'
                    : 'border border-gray-200 text-gray-700 hover:border-gray-400'
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

'use client'

import { ChevronDown, ChevronUp, Copy, Layers, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { findDuplicateEntries, isMockupCompatible, mockupThumbnail } from '@/lib/image-generator/helpers'
import type { MockupSetOption, Orientation, OverlayAsset, SelectionItem } from '@/lib/image-generator/types'
import { ORIENTATION_LABELS } from './labels'

export function newSelectionKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Ist ein Eintrag (z. B. aus einer Vorlage) für dieses Preset nutzbar? */
export function entryProblem(
  item: SelectionItem,
  mockupsById: Map<string, MockupSetOption>,
  overlaysById: Map<string, OverlayAsset>,
  orientation: Orientation,
): string | null {
  const m = mockupsById.get(item.mockup_set_id)
  if (!m || !m.is_active) return 'Mockup nicht mehr verfügbar'
  if (!isMockupCompatible(m, orientation)) return `Mockup hat kein ${ORIENTATION_LABELS[orientation]}`
  if (item.overlay_id) {
    const o = overlaysById.get(item.overlay_id)
    if (!o) return 'Overlay nicht mehr verfügbar'
    if (o.orientation !== orientation) return `Overlay ist ${ORIENTATION_LABELS[o.orientation]}`
  }
  return null
}

interface MockupSelectionProps {
  orientation: Orientation
  mockups: MockupSetOption[]
  overlays: OverlayAsset[]
  items: SelectionItem[]
  onChange: (items: SelectionItem[]) => void
  onPickOverlay: (itemKey: string) => void
}

export function MockupSelection({ orientation, mockups, overlays, items, onChange, onPickOverlay }: MockupSelectionProps) {
  const mockupsById = new Map(mockups.map((m) => [m.id, m]))
  const overlaysById = new Map(overlays.map((o) => [o.id, o]))
  const duplicateKeys = new Set(findDuplicateEntries(items).map((i) => i.key))
  const activeMockups = mockups.filter((m) => m.is_active)
  const usable = activeMockups.filter((m) => isMockupCompatible(m, orientation))
  const unusable = activeMockups.filter((m) => !isMockupCompatible(m, orientation))

  const positionsOf = (mockupId: string) =>
    items.flatMap((it, idx) => (it.mockup_set_id === mockupId ? [idx + 1] : []))

  const toggleMockup = (mockupId: string) => {
    const existing = items.filter((i) => i.mockup_set_id === mockupId)
    if (existing.length === 0) {
      onChange([...items, { key: newSelectionKey(), mockup_set_id: mockupId, overlay_id: null }])
    } else if (existing.length === 1) {
      onChange(items.filter((i) => i.mockup_set_id !== mockupId))
    }
    // Mehrfach gewählt: Abwählen nur gezielt in der Liste, damit kein Overlay-Eintrag verloren geht.
  }

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onChange(next)
  }

  const update = (key: string, patch: Partial<SelectionItem>) =>
    onChange(items.map((i) => (i.key === key ? { ...i, ...patch } : i)))

  const duplicate = (idx: number) => {
    const next = [...items]
    next.splice(idx + 1, 0, { key: newSelectionKey(), mockup_set_id: items[idx].mockup_set_id, overlay_id: null })
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {/* Gewählte Mockups in Bild-Reihenfolge */}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground rounded-md border border-dashed p-4 text-center">
          Noch keine Mockups gewählt. Klicke unten auf die Mockups, die du haben willst.
        </p>
      ) : (
        <ol className="space-y-2" aria-label="Gewählte Mockups">
          {items.map((item, idx) => {
            const m = mockupsById.get(item.mockup_set_id)
            const overlay = item.overlay_id ? overlaysById.get(item.overlay_id) : undefined
            const problem = entryProblem(item, mockupsById, overlaysById, orientation)
            const thumb = m ? mockupThumbnail(m, orientation) : null
            return (
              <li
                key={item.key}
                className={cn(
                  'flex items-center gap-2 sm:gap-3 rounded-md border bg-background p-2',
                  (problem || duplicateKeys.has(item.key)) && 'border-amber-400 bg-amber-50/60',
                )}
              >
                <span className="w-6 text-center text-sm font-semibold tabular-nums shrink-0">{idx + 1}</span>
                <div className="w-12 h-12 rounded bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Layers className="w-4 h-4 text-muted-foreground" aria-hidden />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m?.name ?? 'Unbekanntes Mockup'}</div>
                  {problem ? (
                    <div className="text-xs text-amber-700">{problem} – wird übersprungen</div>
                  ) : duplicateKeys.has(item.key) ? (
                    <div className="text-xs text-amber-700">Doppelt – gleiche Kombination steht schon weiter oben</div>
                  ) : overlay ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={overlay.image_url} alt="" className="w-5 h-5 object-contain rounded border bg-white shrink-0" />
                      <span className="truncate">Overlay: {overlay.name}</span>
                      <button
                        type="button"
                        onClick={() => update(item.key, { overlay_id: null })}
                        className="shrink-0 rounded p-0.5 hover:bg-muted hover:text-foreground"
                        aria-label={`Overlay von ${m?.name ?? 'Mockup'} entfernen`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onPickOverlay(item.key)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="w-3 h-3" /> Overlay
                    </button>
                  )}
                </div>
                <div className="flex items-center shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={idx === 0} onClick={() => move(idx, -1)} aria-label="Nach oben">
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={idx === items.length - 1} onClick={() => move(idx, 1)} aria-label="Nach unten">
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex" onClick={() => duplicate(idx)} aria-label="Mockup nochmal hinzufügen (z. B. mit anderem Overlay)" title="Nochmal hinzufügen, z. B. mit anderem Overlay">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => onChange(items.filter((i) => i.key !== item.key))} aria-label="Aus Auswahl entfernen">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {/* Alle Mockups als Kacheln */}
      {activeMockups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Es gibt noch keine aktiven Mockups. Lege sie unter Admin → Mockup-Sets an.
        </p>
      ) : (
        <TooltipProvider>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3" aria-label="Verfügbare Mockups">
            {[...usable, ...unusable].map((m) => {
              const compatible = isMockupCompatible(m, orientation)
              const positions = positionsOf(m.id)
              const selected = positions.length > 0
              const thumb = mockupThumbnail(m, orientation)
              const tile = (
                <button
                  type="button"
                  disabled={!compatible}
                  onClick={() => toggleMockup(m.id)}
                  aria-pressed={selected}
                  className={cn(
                    'relative w-full text-left rounded-lg border-2 bg-background overflow-hidden transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected ? 'border-primary' : 'border-transparent hover:border-foreground/30',
                    !compatible && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <span className="px-2 text-center text-[11px] text-muted-foreground">
                        Kein Vorschaubild – Test-Render in Mockup-Sets ausführen
                      </span>
                    )}
                  </div>
                  {selected && (
                    <span className="absolute top-1.5 left-1.5 min-w-6 h-6 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                      {positions.join(' · ')}
                    </span>
                  )}
                  <div className="p-2 text-sm font-medium truncate border-t">{m.name}</div>
                  {!compatible && (
                    <Badge variant="outline" className="absolute top-1.5 right-1.5 bg-background text-[10px]">
                      kein {ORIENTATION_LABELS[orientation]}
                    </Badge>
                  )}
                </button>
              )
              return (
                <li key={m.id}>
                  {positions.length > 1 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{tile}</TooltipTrigger>
                      <TooltipContent>Mehrfach gewählt – einzeln oben in der Liste entfernen</TooltipContent>
                    </Tooltip>
                  ) : tile}
                </li>
              )
            })}
          </ul>
        </TooltipProvider>
      )}
    </div>
  )
}

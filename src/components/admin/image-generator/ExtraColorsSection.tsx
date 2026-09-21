'use client'

import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { PaletteOption } from '@/lib/image-generator/types'

const SWATCH_KEYS = ['background', 'land', 'water', 'road'] as const

interface ExtraColorsSectionProps {
  palettes: PaletteOption[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
  mockupCount: number
}

export function ExtraColorsSection({ palettes, selectedIds, onChange, mockupCount }: ExtraColorsSectionProps) {
  const [open, setOpen] = useState(selectedIds.length > 0)

  const toggle = (id: string) =>
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id])

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span>
          <span className="font-medium">Weitere Farben</span>
          <span className="ml-2 text-sm text-muted-foreground">
            {selectedIds.length === 0
              ? 'optional'
              : `${selectedIds.length} gewählt · je ${mockupCount} Bild${mockupCount === 1 ? '' : 'er'}`}
          </span>
        </span>
        <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <p className="text-xs text-muted-foreground mb-3">
          Für jede gewählte Farbe entstehen alle Mockups zusätzlich. Das Preset selbst bleibt unverändert.
        </p>
        {palettes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Keine veröffentlichten Paletten vorhanden.</p>
        ) : (
          <ul className="flex flex-wrap gap-2" aria-label="Zusatzfarben">
            {palettes.map((p) => {
              const active = selectedIds.includes(p.id)
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    aria-pressed={active}
                    className={cn(
                      'flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active ? 'border-primary bg-primary/5' : 'hover:border-foreground/40',
                    )}
                  >
                    <span className="flex h-6 w-6 overflow-hidden rounded-full border" aria-hidden>
                      {SWATCH_KEYS.map((k) => (
                        // Palettenfarben sind Daten, nicht Design-Tokens → dynamischer Hintergrund nötig
                        <span key={k} className="flex-1" style={{ backgroundColor: p.colors?.[k] ?? 'transparent' }} />
                      ))}
                    </span>
                    {p.name}
                    {active && <Check className="w-3.5 h-3.5" aria-hidden />}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

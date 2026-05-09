'use client'

import { cn } from '@/lib/utils'
import type { PrintFormat } from '@/lib/print-formats'

interface Props {
  formats: PrintFormat[]
  active: PrintFormat
  onChange: (format: PrintFormat) => void
  /** Tailwind responsive utility — by default the switcher is hidden below
   *  the lg: breakpoint (1024 px) per PROJ-39 spec ("Mobile zeigt Pills nur
   *  im Detail-Modal, nicht auf der Grid-Karte"). Pass an empty string to
   *  always show. */
  responsiveDisplay?: string
}

const LABELS: Record<PrintFormat, string> = {
  a4: 'A4',
  a3: 'A3',
  a2: 'A2',
}

/**
 * PROJ-39: Three-pill format selector under a preset card. Customer clicks
 * to flip the displayed bare-poster image between A4/A3/A2. Only formats
 * passed in `formats` are shown — the parent filters out non-`done` formats
 * via `getAvailableFormats(preset)`.
 *
 * Wrapper is button-like so a parent `<Link>` doesn't accidentally
 * navigate when the customer clicks a pill (we stop propagation).
 */
export function PresetFormatSwitcher({
  formats,
  active,
  onChange,
  responsiveDisplay = 'hidden lg:flex',
}: Props) {
  if (formats.length <= 1) return null
  return (
    <div className={cn(responsiveDisplay, 'gap-1 justify-center')}>
      {formats.map((f) => (
        <button
          key={f}
          type="button"
          aria-pressed={active === f}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onChange(f)
          }}
          className={cn(
            'px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide transition-colors min-w-[36px]',
            active === f
              ? 'bg-foreground text-background'
              : 'bg-muted/60 text-muted-foreground/80 hover:bg-muted hover:text-foreground/80',
          )}
        >
          {LABELS[f]}
        </button>
      ))}
    </div>
  )
}

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export interface GalleryFilterChip {
  /** Occasion-Code oder `null` für "Alle". */
  tag: string | null
  label: string
  href: string
  isActive: boolean
}

interface Props {
  chips: GalleryFilterChip[]
  ariaLabel: string
}

/**
 * Filter-Chip-Strip oberhalb der Sektionen. Server-Komponente — Aktiv-Status
 * kommt aus der URL (`?anlass=...`), Klick auf einen Chip ist eine echte
 * Navigation. Damit funktioniert die Seite ohne JS und indexierbar bleibt
 * nur `/gallery` (siehe Canonical in `gallery/page.tsx`).
 *
 * Wrap statt Horizontal-Scroll, weil die 8 Anlass-Labels kurz sind und in
 * 2 Zeilen sauber passen — Scroll-Container hatten Vertical-Clipping mit
 * Umlauten und brauchten zusätzliches Scrollbar-Hiding.
 */
export function GalleryFilterChips({ chips, ariaLabel }: Props) {
  if (chips.length <= 1) return null

  return (
    <nav
      aria-label={ariaLabel}
      className="border-b border-border bg-background"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
        <ul className="flex flex-wrap justify-center gap-2">
          {chips.map((chip) => (
            <li key={chip.tag ?? 'all'}>
              <Button
                asChild
                size="sm"
                variant={chip.isActive ? 'default' : 'outline'}
              >
                <Link
                  href={chip.href}
                  aria-current={chip.isActive ? 'page' : undefined}
                >
                  {chip.label}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

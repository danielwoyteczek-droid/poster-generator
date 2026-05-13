'use client'

import { TypographyCanvas } from '../TypographyCanvas'
import { TypographySidebar } from '../TypographySidebar'

/**
 * Mobile-Variante (< 1024 px) — vorerst 50/50-Stacked-Provisorium wie bei
 * PROJ-45 Wedding-Editor Chunk 2: Canvas oben, Edit-Felder darunter scrollbar.
 *
 * Volles Tap-Sheet-Pattern (PROJ-43, Apple-Maps-Style) kommt in einem späteren
 * Chunk — erst sobald Conversion-Daten zeigen, dass dieser Editor genug
 * Volumen sieht. Bis dahin ist Stacked-Layout simpel und funktional.
 */
export function MobileTypographyLayout() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="h-[55%] min-h-0 bg-muted">
        <TypographyCanvas />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto border-t bg-background">
        <TypographySidebar />
      </div>
    </div>
  )
}

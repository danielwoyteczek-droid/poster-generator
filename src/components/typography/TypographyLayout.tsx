'use client'

import { TypographySidebar } from './TypographySidebar'
import { TypographyCanvas } from './TypographyCanvas'

/**
 * Desktop-Layout (≥ 1024 px) für den Typografie-Editor: Sidebar links,
 * Canvas rechts. Spiegelt WeddingLayout / EditorLayout.
 */
export function TypographyLayout() {
  return (
    <div className="flex h-full overflow-hidden">
      <TypographySidebar />
      <div className="flex-1 min-w-0 bg-muted">
        <TypographyCanvas />
      </div>
    </div>
  )
}

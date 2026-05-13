'use client'

import { WeddingSidebar } from './WeddingSidebar'
import { WeddingCanvas } from './WeddingCanvas'

/**
 * Desktop-Layout (≥ 1024 px): Sidebar links (w-72) + Canvas rechts.
 * Spiegelt EditorLayout (Single-Map) und StarMapLayout — gleicher
 * Editor-Frame, anderer Inhalt. Mobile (< 1024 px) wird über
 * MobileWeddingLayout bedient (Chunk 5).
 */
export function WeddingLayout() {
  return (
    <div className="flex h-full overflow-hidden">
      <WeddingSidebar />
      <WeddingCanvas />
    </div>
  )
}

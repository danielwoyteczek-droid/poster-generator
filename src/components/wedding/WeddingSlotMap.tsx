'use client'

import dynamic from 'next/dynamic'
import type { SlotIndex } from '@/hooks/useWeddingEditorStore'

// SSR-disabled wrapper — MapLibre touches `window` on import. Mirrors the
// MapPreview / MapPreviewInner split from the single-map editor.
const WeddingSlotMapInner = dynamic(() => import('./WeddingSlotMapInner'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted animate-pulse" />,
})

export function WeddingSlotMap({ index }: { index: SlotIndex }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <WeddingSlotMapInner index={index} />
    </div>
  )
}

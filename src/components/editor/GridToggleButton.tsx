'use client'

import { Grid3x3 } from 'lucide-react'
import { useEditorStore } from '@/hooks/useEditorStore'
import { cn } from '@/lib/utils'

/**
 * Floating toggle for the editor's design-aid grid (centre-cross + rule-
 * of-thirds). Sits in the top-right corner of the canvas wrapper,
 * mirroring PreviewTriggerButton's top-left placement.
 */
export function GridToggleButton({ className }: { className?: string }) {
  const { gridVisible, setGridVisible } = useEditorStore()
  return (
    <button
      type="button"
      onClick={() => setGridVisible(!gridVisible)}
      aria-label={gridVisible ? 'Hilfsraster ausblenden' : 'Hilfsraster einblenden'}
      title={gridVisible ? 'Hilfsraster ausblenden' : 'Hilfsraster einblenden'}
      aria-pressed={gridVisible}
      className={
        className ??
        cn(
          'absolute top-3 right-3 w-10 h-10 rounded-full shadow-lg border flex items-center justify-center z-50 touch-manipulation transition-colors',
          gridVisible
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-white text-foreground hover:bg-muted active:bg-muted border-border',
        )
      }
    >
      <Grid3x3 className="w-5 h-5" />
    </button>
  )
}

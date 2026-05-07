'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

type Props = ComponentPropsWithoutRef<'div'>

/**
 * PROJ-36: Visual drag-handle between the mobile editor canvas and the
 * sidebar tab-bar. Pure markup — wire it up by spreading the props from
 * `useCanvasResize().handleProps`.
 */
export function CanvasResizeHandle({ className, ...rest }: Props) {
  return (
    <div
      {...rest}
      aria-label="Vorschau-Bereich anpassen"
      className={cn(
        'h-5 shrink-0 flex items-center justify-center cursor-ns-resize touch-none bg-white border-b border-border',
        className,
      )}
    >
      <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
    </div>
  )
}

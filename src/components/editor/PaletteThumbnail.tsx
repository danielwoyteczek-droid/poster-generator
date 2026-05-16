'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'
import type { MapPaletteColors } from '@/lib/map-palettes'

/**
 * Round, abstract "mini-map" preview of a colour palette. The motif — a land
 * disc inside a background rim, with a water cove and three crossing roads —
 * is fixed; only the colours change. That lets palette tiles read as little
 * maps instead of a row of colour dots. Used in the editor palette pickers
 * (desktop + mobile) and the admin palette list.
 */
export function PaletteThumbnail({
  colors,
  className,
}: {
  colors: MapPaletteColors
  className?: string
}) {
  // Unique, URL-safe id so multiple thumbnails on the page don't share a clip.
  const clipId = `pt${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <svg viewBox="0 0 64 64" className={cn('w-9 h-9', className)} aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <circle cx="32" cy="32" r="27" />
        </clipPath>
      </defs>

      {/* Background rim — the poster colour around the map */}
      <circle cx="32" cy="32" r="32" fill={colors.background} />

      <g clipPath={`url(#${clipId})`}>
        {/* Land fills the inner disc */}
        <rect x="0" y="0" width="64" height="64" fill={colors.land} />
        {/* Water cove in the bottom-right */}
        <path d="M64 64 L64 30 C 52 34 46 48 43 64 Z" fill={colors.water} />
        {/* Three crossing roads */}
        <g fill="none" stroke={colors.road} strokeLinecap="round">
          <path d="M1 24 C 22 15 34 32 64 25" strokeWidth="5" />
          <path d="M22 1 C 26 24 36 34 42 64" strokeWidth="3.5" />
          <path d="M1 45 C 24 40 38 46 64 41" strokeWidth="2" />
        </g>
      </g>

      {/* Border ring between rim and land */}
      <circle cx="32" cy="32" r="27" fill="none" stroke={colors.border} strokeWidth="1.5" />
    </svg>
  )
}

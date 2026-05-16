'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'
import type { MapPaletteColors } from '@/lib/map-palettes'

/**
 * Round "mini-map" preview of a colour palette. The motif is a fixed,
 * deterministic diagonal stack — only the colours change:
 *   - top:    the land area (`land`) with a few crossing roads (`road`)
 *   - middle: a diagonal water stripe (`water`)
 *   - bottom: the poster/canvas background (`background`)
 *   - rim:    a thin ring in the palette `border` colour
 * That mirrors how the colours sit on a real poster, so the tile depicts the
 * palette composition. Used in the editor palette pickers and the admin list.
 */
export function PaletteThumbnail({
  colors,
  className,
}: {
  colors: MapPaletteColors
  className?: string
}) {
  // Unique, URL-safe ids so multiple thumbnails don't share their clip paths.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const circleClip = `ptc${uid}`
  const landClip = `ptl${uid}`

  // Land occupies the top; its lower edge is a gentle diagonal coastline.
  const landShape = 'M0 0 L64 0 L64 40 L0 32 Z'

  return (
    <svg viewBox="0 0 64 64" className={cn('w-9 h-9', className)} aria-hidden="true">
      <defs>
        <clipPath id={circleClip}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
        <clipPath id={landClip}>
          <path d={landShape} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${circleClip})`}>
        {/* Canvas background — shows through in the bottom area */}
        <rect x="0" y="0" width="64" height="64" fill={colors.background} />

        {/* Land area on top */}
        <path d={landShape} fill={colors.land} />

        {/* Roads — crossing lines, clipped to the land so they stop at the coast */}
        <g clipPath={`url(#${landClip})`} stroke={colors.road} strokeLinecap="round" fill="none">
          <path d="M-6 7 L70 31" strokeWidth="3" />
          <path d="M11 -6 L46 45" strokeWidth="2.4" />
          <path d="M-6 23 L70 8" strokeWidth="2" />
        </g>

        {/* Water stripe between land and background */}
        <path d="M0 32 L64 40 L64 49 L0 41 Z" fill={colors.water} />
      </g>

      {/* Border ring */}
      <circle cx="32" cy="32" r="31" fill="none" stroke={colors.border} strokeWidth="1.5" />
    </svg>
  )
}

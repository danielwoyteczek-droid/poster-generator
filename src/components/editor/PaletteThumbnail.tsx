'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'
import type { MapPaletteColors } from '@/lib/map-palettes'

// Evenly spaced street grid (viewBox units). A regular grid reads as a
// deliberate city map rather than a handful of random lines.
const GRID = [13, 26, 39, 52]

// Building blocks dropped into grid cells (11×11, inset 1 from the streets).
const BUILDINGS = [
  { x: 27, y: 14 },
  { x: 40, y: 27 },
  { x: 14, y: 40 },
]

/**
 * Round "mini-map" preview of a colour palette. The motif — a land disc with
 * a street grid, building blocks, a diagonal main road, a water cove and a
 * place marker — is fixed and deterministic; only the colours change. Every
 * one of the eight palette colours is used (background, land, road, building,
 * water, label, labelHalo, border) so the tile genuinely depicts the palette
 * composition. Used in the editor palette pickers and the admin palette list.
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

        {/* Building blocks */}
        {BUILDINGS.map((b) => (
          <rect key={`${b.x}-${b.y}`} x={b.x} y={b.y} width="11" height="11" rx="1" fill={colors.building} />
        ))}

        {/* Regular street grid — minor roads */}
        <g stroke={colors.road} strokeWidth="2">
          {GRID.map((p) => (
            <line key={`v${p}`} x1={p} y1="0" x2={p} y2="64" />
          ))}
          {GRID.map((p) => (
            <line key={`h${p}`} x1="0" y1={p} x2="64" y2={p} />
          ))}
        </g>

        {/* Diagonal main road */}
        <line
          x1="4" y1="12" x2="60" y2="56"
          stroke={colors.road} strokeWidth="4.5" strokeLinecap="round"
        />

        {/* Water cove in the bottom-right — drawn last so the city meets it */}
        <path d="M64 64 L64 34 C 55 37 49 49 47 64 Z" fill={colors.water} />

        {/* Place marker — label colour with its halo */}
        <circle cx="20" cy="20" r="4.6" fill={colors.labelHalo} />
        <circle cx="20" cy="20" r="2.6" fill={colors.label} />
      </g>

      {/* Border ring between rim and land */}
      <circle cx="32" cy="32" r="27" fill="none" stroke={colors.border} strokeWidth="1.5" />
    </svg>
  )
}

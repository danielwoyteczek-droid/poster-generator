'use client'

import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

/**
 * Outside-the-canvas attribution chip for OSM + MapTiler.
 *
 * Why outside: the in-map attribution-control overlapped the rendered
 * poster, which looked unprofessional in the editor preview. Hiding it
 * inside the map (`attributionControl: false`) only solves half the
 * problem — OSM data is licensed under the ODbL, which requires that
 * attribution is given somewhere visible in the same context as the map.
 * This component is that "somewhere".
 *
 * Placed by callers as an absolute overlay on the editor canvas wrapper,
 * not on the poster card itself — so the visible canvas stays clean,
 * but the page still credits the data sources.
 */
export function MapAttribution({ className }: Props) {
  return (
    <div
      className={cn(
        'pointer-events-auto select-none text-[10px] leading-tight text-muted-foreground/70',
        className,
      )}
      aria-label="Karten-Datenquellen"
    >
      ©{' '}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground hover:underline"
      >
        OpenStreetMap
      </a>
      {' '}·{' '}
      <a
        href="https://www.maptiler.com/copyright/"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground hover:underline"
      >
        MapTiler
      </a>
    </div>
  )
}

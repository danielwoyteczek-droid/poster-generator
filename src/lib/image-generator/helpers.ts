// PROJ-56: reine Hilfsfunktionen des Image Generators (ohne I/O, testbar).

import type {
  GeneratorImage,
  MockupSetOption,
  Orientation,
  PosterType,
  SelectionEntry,
} from './types'

/** Ab dieser Bildanzahl fragt „Erstellen" nach. */
export const LARGE_RUN_THRESHOLD = 40

/**
 * Passt ein Mockup zur Ausrichtung des Presets?
 * Lokale Mockups: nur wenn ein Overlay für diese Ausrichtung existiert.
 * Dynamic Mockups haben keine Ausrichtung und gelten immer als passend.
 */
export function isMockupCompatible(mockup: MockupSetOption, orientation: Orientation): boolean {
  if (mockup.provider === 'dynamic_mockups') return true
  return orientation === 'portrait'
    ? Boolean(mockup.local_portrait_overlay_url)
    : Boolean(mockup.local_landscape_overlay_url)
}

/**
 * Vorschaubild eines Mockups. Beim lokalen Test-Render liegt Hochformat in
 * desktop_thumbnail_url und Querformat in mobile_thumbnail_url.
 */
export function mockupThumbnail(mockup: MockupSetOption, orientation: Orientation): string | null {
  if (mockup.provider === 'local' && orientation === 'landscape') {
    return mockup.mobile_thumbnail_url ?? mockup.desktop_thumbnail_url
  }
  return mockup.desktop_thumbnail_url ?? mockup.mobile_thumbnail_url
}

/** Zusatzfarben gibt es in V1 nur für Karten-Presets. */
export function supportsExtraColors(posterType: PosterType): boolean {
  return posterType === 'map'
}

/** Gesamtzahl der Bilder: Mockups × (Grundfarbe + Zusatzfarben). */
export function countImages(entryCount: number, extraColorCount: number): number {
  return entryCount * (1 + extraColorCount)
}

function comboKey(e: SelectionEntry): string {
  return `${e.mockup_set_id}::${e.overlay_id ?? ''}`
}

/** Einträge, die dieselbe Kombination (Mockup + Overlay) doppelt enthalten. */
export function findDuplicateEntries<T extends SelectionEntry>(entries: T[]): T[] {
  const seen = new Set<string>()
  const dupes: T[] = []
  for (const e of entries) {
    const k = comboKey(e)
    if (seen.has(k)) dupes.push(e)
    else seen.add(k)
  }
  return dupes
}

/** Fertiges Bild, dessen Preset-Design sich seitdem geändert hat (vom Server ermittelt). */
export function isImageStale(image: GeneratorImage): boolean {
  return image.status === 'done' && image.stale
}

export function hasOpenImages(images: GeneratorImage[]): boolean {
  return images.some((i) => i.status === 'pending' || i.status === 'rendering')
}

export interface ImageGroup {
  palette_id: string | null
  images: GeneratorImage[]
}

/** Galerie nach Farbe gruppieren: Grundfarbe zuerst, dann Zusatzfarben in Reihenfolge des ersten Auftauchens. */
export function groupImagesByColor(images: GeneratorImage[]): ImageGroup[] {
  const sorted = [...images].sort((a, b) => a.position - b.position)
  const groups = new Map<string | null, GeneratorImage[]>()
  groups.set(null, [])
  for (const img of sorted) {
    const list = groups.get(img.palette_id)
    if (list) list.push(img)
    else groups.set(img.palette_id, [img])
  }
  return Array.from(groups.entries())
    .filter(([, list]) => list.length > 0)
    .map(([palette_id, list]) => ({ palette_id, images: list }))
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/**
 * Sprechender Dateiname eines Galerie-Bilds (ohne Endung), z. B.
 * „01-wand-rahmen", „02-wand-rahmen-pfeil", „salbei-01-wand-rahmen".
 */
export function buildImageFileName(params: {
  position: number
  mockupName: string
  overlayName?: string | null
  paletteName?: string | null
}): string {
  const nr = String(params.position).padStart(2, '0')
  const parts = [nr, slugify(params.mockupName)]
  if (params.overlayName) parts.push(slugify(params.overlayName))
  const base = parts.filter(Boolean).join('-')
  return params.paletteName ? `${slugify(params.paletteName)}-${base}` : base
}

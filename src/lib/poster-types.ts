/**
 * The three editor variants that share the mask catalogue. A mask may be
 * applicable to one, two, or all three depending on whether its silhouette
 * fits the editor's geometry (e.g. split masks only make sense in the map
 * editor where two map slices live).
 */
export type PosterType = 'map' | 'star-map' | 'photo'

export const ALL_POSTER_TYPES: PosterType[] = ['map', 'star-map', 'photo']

export const POSTER_TYPE_LABELS: Record<PosterType, string> = {
  'map': 'Karten-Editor',
  'star-map': 'Sternenposter',
  'photo': 'Foto-Poster',
}

/**
 * Default applicability for masks created before PROJ-40 — they were
 * authored against the map editor, so we keep them gated to that editor
 * unless the admin explicitly opts a mask into another editor.
 */
export const DEFAULT_APPLICABLE_POSTER_TYPES: PosterType[] = ['map']

/**
 * The four editor variants that share the mask catalogue. A mask may be
 * applicable to any subset depending on whether its silhouette fits the
 * editor's geometry (e.g. split masks only make sense in the map editor
 * where two map slices live; wedding-multi-slot reuses single-map mask
 * geometry per slot).
 */
export type PosterType = 'map' | 'star-map' | 'photo' | 'wedding' | 'typography'

export const ALL_POSTER_TYPES: PosterType[] = ['map', 'star-map', 'photo', 'wedding', 'typography']

/**
 * Labels are fallbacks only — production UI translates them via
 * `editorTabs.*` / `wedding.posterTypeLabel` in the locale catalogue.
 * Keep the German label here so legacy hardcoded surfaces still render
 * something sensible.
 */
export const POSTER_TYPE_LABELS: Record<PosterType, string> = {
  'map': 'Karten-Editor',
  'star-map': 'Sternenposter',
  'photo': 'Foto-Poster',
  'wedding': 'Hochzeitsposter',
  'typography': 'Liebespapier',
}

/**
 * Default applicability for masks created before PROJ-40 — they were
 * authored against the map editor, so we keep them gated to that editor
 * unless the admin explicitly opts a mask into another editor.
 */
export const DEFAULT_APPLICABLE_POSTER_TYPES: PosterType[] = ['map']

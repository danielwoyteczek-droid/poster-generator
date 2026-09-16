import type { GeneratorImageStatus, Orientation, PosterType } from '@/lib/image-generator/types'

export const POSTER_TYPE_LABELS: Record<PosterType, string> = {
  map: 'Karte',
  'star-map': 'Sternenkarte',
  photo: 'Foto',
}

export const ORIENTATION_LABELS: Record<Orientation, string> = {
  portrait: 'Hochformat',
  landscape: 'Querformat',
}

export const STATUS_LABELS: Record<GeneratorImageStatus, string> = {
  pending: 'Wartet',
  rendering: 'Wird erstellt',
  done: 'Fertig',
  failed: 'Fehlgeschlagen',
}

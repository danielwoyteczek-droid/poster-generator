// PROJ-56: Image Generator — gemeinsame Typen für Oberfläche und Endpunkte.
// Die Endpunkte unter /api/admin/image-generator/* entstehen mit /backend;
// die Formen hier sind der Vertrag zwischen beiden Seiten.

export type PosterType = 'map' | 'star-map' | 'photo'
export type Orientation = 'portrait' | 'landscape'
export type GeneratorImageStatus = 'pending' | 'rendering' | 'done' | 'failed'

/** Preset, wie der Generator es braucht. */
export interface GeneratorPreset {
  id: string
  name: string
  poster_type: PosterType
  orientation: Orientation
  preview_image_url: string | null
  updated_at: string
}

/** Ein Galerie-Bild. Gleichzeitig der Auftrag, es zu erzeugen. */
export interface GeneratorImage {
  id: string
  preset_id: string
  /** null = Grundfarbe des Presets */
  palette_id: string | null
  mockup_set_id: string
  overlay_id: string | null
  position: number
  status: GeneratorImageStatus
  error: string | null
  image_url: string | null
  width: number | null
  height: number | null
  rendered_at: string | null
  /** Status des zugrunde liegenden Poster-Renders; erklärt „wartet". */
  waiting_for: 'poster_render' | 'worker' | null
  /** Fertig, aber das Preset-Design wurde seitdem geändert. */
  stale: boolean
}

/** Antwort von GET /api/admin/image-generator/presets/[presetId] */
export interface GeneratorState {
  preset: GeneratorPreset
  images: GeneratorImage[]
}

/** Auszug aus GET /api/admin/mockup-sets */
export interface MockupSetOption {
  id: string
  slug: string
  name: string
  provider: 'dynamic_mockups' | 'local'
  is_active: boolean
  desktop_thumbnail_url: string | null
  mobile_thumbnail_url: string | null
  local_portrait_overlay_url: string | null
  local_landscape_overlay_url: string | null
}

/** Auszug aus GET /api/admin/palettes?status=published */
export interface PaletteOption {
  id: string
  name: string
  colors: Record<string, string> | null
}

export interface OverlayAsset {
  id: string
  name: string
  orientation: Orientation
  image_url: string
  width: number
  height: number
  created_at: string
}

/** Ein Eintrag der Mockup-Auswahl (auch Baustein einer Vorlage). */
export interface SelectionEntry {
  mockup_set_id: string
  overlay_id: string | null
}

/** Auswahl-Eintrag im Client, mit stabilem Schlüssel für React-Listen. */
export interface SelectionItem extends SelectionEntry {
  key: string
}

export interface GeneratorTemplate {
  id: string
  name: string
  entries: SelectionEntry[]
  updated_at: string
}

/** Body von POST /api/admin/image-generator/presets/[presetId]/generate */
export interface GenerateRequest {
  entries: SelectionEntry[]
  palette_ids: string[]
}

export interface GenerateResponse {
  images: GeneratorImage[]
  /** Anzahl Bilder, die sofort (Schnellweg) fertig wurden */
  completed_now: number
  worker_triggered: boolean
  /** Worker konnte nicht gestartet werden (z. B. fehlende GitHub-Konfiguration) */
  worker_error: string | null
}

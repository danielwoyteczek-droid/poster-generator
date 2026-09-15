/**
 * PROJ-31: Feld-Schema je Amazon-SKU.
 *
 * Es hat dieselbe Form wie das Etsy-Schema, damit beide Kanäle durch
 * dieselbe Prüfstufe laufen. Der Unterschied liegt nur darin, woher die
 * Beschriftungen kommen: bei Etsy aus einer Freitextzeile, die der Käufer
 * getippt hat, bei Amazon direkt aus den Anpassungsfeldern.
 *
 * `label` ist die Kundenansicht bei Amazon, `fallbacks` enthält Amazons
 * internen Feldnamen. Abgeglichen wird der interne Name zuerst — er ist
 * kurz, vom Verkäufer vergeben und überlebt eine Überarbeitung des
 * Listing-Textes.
 *
 * Belegt sind diese Beschriftungen bislang nur für `LQ-30001-09`, die
 * einzige SKU, von der eine echte Bestellung vorliegt. Für die übrigen
 * neun ist dieses Schema eine begründete Annahme: die LabelQueen-Listings
 * sind Varianten desselben Produkts. Weicht eine ab, meldet der Abgleich
 * das fehlende Pflichtfeld und die Position landet in der Prüfung — sie
 * verschwindet nicht still. Das Schema ist je SKU überschreibbar.
 */

import {
  type PersonalizationSchema,
  PersonalizationSchemaSchema,
} from '@/lib/etsy/personalization-parser'

/**
 * Die internen Schlüssel, auf die eine Amazon-Bestellung abgebildet wird.
 * Sie entsprechen der Zuordnungstabelle aus der Übergabe.
 */
export const LQ_FIELD_KEYS = {
  location: 'Kartenort — wird über die Ortssuche in eine Kartenmitte aufgelöst',
  coords: 'Koordinaten, falls der Käufer sie angegeben hat — schlagen den Ortsfund',
  title: 'Überschrift',
  names: 'Namenszeile',
  subline: 'Freitext darunter',
  format: 'Postergröße',
  frame: 'Bilderrahmen',
} as const

export type LqFieldKey = keyof typeof LQ_FIELD_KEYS

export const LQ_DEFAULT_SCHEMA: PersonalizationSchema = [
  {
    key: 'location',
    label: 'Adresse für die Karte',
    fallbacks: ['Adressse', 'Adresse', 'Ort'],
    required: true,
    positional: false,
  },
  {
    key: 'coords',
    label: 'Koordinaten (Falls die Adresse nicht eindeutig erkennbar ist) (Optional)',
    fallbacks: ['Koordinaten'],
    required: false,
    positional: false,
    // Erlaubt "(52.52, 13.405)" ebenso wie "52.5200°N, 13.4050°E".
    regex: '^\\s*\\(?\\s*-?\\d{1,3}(?:[.,]\\d+)?\\s*°?\\s*[NSns]?\\s*[,;]\\s*-?\\d{1,3}(?:[.,]\\d+)?\\s*°?\\s*[EWOewo]?\\s*\\)?\\s*$',
  },
  {
    key: 'title',
    label: 'Titel',
    fallbacks: ['Text  "Wo alles begann"', 'Text "Wo alles begann"', 'Texteingabe 3', 'Überschrift'],
    required: false,
    positional: false,
  },
  {
    key: 'names',
    label: 'Namen',
    fallbacks: ['Texteingabe 1', 'Name'],
    required: false,
    positional: false,
  },
  {
    key: 'subline',
    label: 'Stadt und Koordinaten',
    fallbacks: ['Texteingabe 2', 'Untertitel'],
    required: false,
    positional: false,
  },
  {
    key: 'format',
    label: 'Größe des Posters',
    fallbacks: ['Größe A3/A4', 'Größe', 'Format'],
    required: false,
    positional: false,
  },
  {
    key: 'frame',
    label: 'Bilderrahmen A4',
    fallbacks: ['Drop-down-Option 2', 'Bilderrahmen', 'Rahmen'],
    required: false,
    positional: false,
  },
].map((f) => PersonalizationSchemaSchema.parse([f])[0])

/**
 * Liest ein je SKU hinterlegtes Schema. Ist keines gepflegt oder ist es
 * unbrauchbar, greift das Standard-Schema — eine Bestellung soll nicht an
 * einem Tippfehler in der Konfiguration scheitern.
 */
export function schemaOrDefault(raw: unknown): PersonalizationSchema {
  if (!raw) return LQ_DEFAULT_SCHEMA
  const parsed = PersonalizationSchemaSchema.safeParse(raw)
  if (!parsed.success || parsed.data.length === 0) return LQ_DEFAULT_SCHEMA
  return parsed.data
}

// ─── Auswertung der Auswahlfelder ──────────────────────────────────────────

export type PrintFormatKey = 'a4' | 'a3' | 'a2'

/** „DIN A4" → 'a4'. Gibt null zurück, wenn sich nichts Sicheres ableiten lässt. */
export function parseFormat(value: string | undefined | null): PrintFormatKey | null {
  if (!value) return null
  const v = value.toLowerCase().replace(/[\s.-]/g, '')
  if (v.includes('a4')) return 'a4'
  if (v.includes('a3')) return 'a3'
  if (v.includes('a2')) return 'a2'
  return null
}

export interface FrameChoice {
  withFrame: boolean
  /** Die Farbe, wie der Käufer sie gewählt hat — für den Kommissionierzettel. */
  colorLabel: string | null
}

/**
 * „Weißer Rahmen" → mit Rahmen, weiß. „Ohne Rahmen" → ohne.
 *
 * Im Zweifel OHNE Rahmen: einen Rahmen zu wenig zu schicken fällt auf und
 * ist nachlieferbar, einen zu viel zu schicken kostet Geld und niemand
 * meldet sich.
 */
export function parseFrame(value: string | undefined | null): FrameChoice {
  if (!value) return { withFrame: false, colorLabel: null }
  const v = value.toLowerCase()
  if (v.includes('ohne') || v.includes('kein') || v.includes('no frame')) {
    return { withFrame: false, colorLabel: null }
  }
  if (v.includes('rahmen') || v.includes('frame')) {
    return { withFrame: true, colorLabel: value.trim() }
  }
  return { withFrame: false, colorLabel: null }
}

/**
 * Zieht Breitengrad und Längengrad aus dem Koordinatenfeld.
 * Nimmt "(52.52, 13.405)" ebenso wie "52.5200°N, 13.4050°E".
 */
export function parseCoords(value: string | undefined | null): { lat: number; lng: number } | null {
  if (!value) return null
  const m = value.match(
    /(-?\d{1,3}(?:[.,]\d+)?)\s*°?\s*([NSns])?\s*[,;]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*°?\s*([EWOewo])?/,
  )
  if (!m) return null
  let lat = Number.parseFloat(m[1].replace(',', '.'))
  let lng = Number.parseFloat(m[3].replace(',', '.'))
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  if (m[2] && m[2].toUpperCase() === 'S') lat = -Math.abs(lat)
  // 'W' ist West; 'O' ist im Deutschen Ost, im Englischen gibt es das nicht.
  if (m[4] && m[4].toUpperCase() === 'W') lng = -Math.abs(lng)
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

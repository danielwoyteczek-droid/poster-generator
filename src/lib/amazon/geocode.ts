/**
 * PROJ-31: Ortssuche für importierte Bestellungen.
 *
 * Der Käufer tippt bei Amazon eine Adresse als Text ein („Pozorišni trg 1
 * 21101 Novi Sad Serbia"). Damit die Karte weiß, wohin sie zentrieren soll,
 * muss dieser Text durch dieselbe Suche, die im Editor hinter dem Suchfeld
 * steckt — MapTiler.
 *
 * Der Unterschied zum Editor: dort sitzt ein Mensch davor und sieht sofort,
 * ob die Karte den richtigen Ort zeigt. Hier läuft es unbeaufsichtigt, also
 * muss Unsicherheit gemeldet statt überspielt werden. Ein mehrdeutiger
 * Treffer schickt die Position in die Prüfung, statt ein Poster mit der
 * falschen Stadt zu drucken.
 *
 * Eigene Datei statt Aufruf von /api/geocode: eine Serverless-Funktion, die
 * über HTTP ihre eigene Route aufruft, kostet einen Netz-Umweg und bricht,
 * sobald die Basis-URL nicht stimmt.
 */

export interface GeocodeHit {
  ok: true
  lat: number
  lng: number
  placeName: string
  /** true, wenn mehrere gleichwertige Treffer zurückkamen. */
  ambiguous: boolean
  /** Anzahl weiterer Treffer neben dem gewählten. */
  alternatives: number
}

export interface GeocodeMiss {
  ok: false
  reason: string
}

export type GeocodeResult = GeocodeHit | GeocodeMiss

interface MapTilerFeature {
  place_name?: string
  center?: [number, number]
  relevance?: number
}

/**
 * Ab welchem Abstand in der Trefferbewertung ein zweiter Treffer als
 * gleichwertig gilt. MapTiler liefert `relevance` zwischen 0 und 1; liegen
 * zwei Treffer dichter als das beieinander, ist die Eingabe nicht eindeutig.
 */
const AMBIGUITY_MARGIN = 0.05

export async function geocodeOnce(query: string): Promise<GeocodeResult> {
  const apiKey = process.env.MAPTILER_API_KEY || process.env.NEXT_PUBLIC_MAPTILER_API_KEY
  if (!apiKey) return { ok: false, reason: 'MapTiler-Schlüssel fehlt auf dem Server' }

  const trimmed = query.trim()
  if (!trimmed) return { ok: false, reason: 'leere Eingabe' }

  let data: { features?: MapTilerFeature[] }
  try {
    const url =
      `https://api.maptiler.com/geocoding/${encodeURIComponent(trimmed)}.json` +
      `?key=${encodeURIComponent(apiKey)}&limit=5&language=de`
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
    if (!response.ok) return { ok: false, reason: `MapTiler antwortete ${response.status}` }
    data = await response.json()
  } catch (e) {
    return { ok: false, reason: `Abruf fehlgeschlagen: ${(e as Error).message}` }
  }

  const features = (data.features ?? []).filter(
    (f): f is MapTilerFeature & { center: [number, number] } =>
      Array.isArray(f.center) && f.center.length === 2,
  )
  if (features.length === 0) return { ok: false, reason: 'kein Treffer' }

  const best = features[0]
  const [lng, lat] = best.center

  if (
    typeof lat !== 'number' || typeof lng !== 'number' ||
    lat < -90 || lat > 90 || lng < -180 || lng > 180
  ) {
    return { ok: false, reason: 'Treffer ohne brauchbare Koordinaten' }
  }

  // Mehrdeutig, wenn der zweite Treffer fast so gut passt wie der erste.
  // Fehlt die Bewertung, gilt jeder weitere Treffer als gleichwertig — im
  // Zweifel lieber einmal zu oft nachfragen als die falsche Stadt drucken.
  let ambiguous = false
  if (features.length > 1) {
    const r1 = features[0].relevance
    const r2 = features[1].relevance
    ambiguous =
      typeof r1 !== 'number' || typeof r2 !== 'number'
        ? true
        : r1 - r2 < AMBIGUITY_MARGIN
  }

  return {
    ok: true,
    lat,
    lng,
    placeName: best.place_name ?? trimmed,
    ambiguous,
    alternatives: features.length - 1,
  }
}

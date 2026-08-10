/**
 * PROJ-51: Geo-Grenzen-Masken — client library.
 *
 * The editor calls our own backend proxy (`/api/geo-boundaries/...`), which
 * will search Nominatim, simplify polygons server-side and cache them.
 *
 * Until that backend lands (built by `/backend`), the functions below fall
 * back to querying the public OpenStreetMap **Nominatim** service directly
 * from the browser — so the editor already shows the *real, detailed*
 * administrative borders (a country's actual coastline etc.), not a crude
 * placeholder shape.
 *
 * The direct-browser call is a development stopgap only: Nominatim's usage
 * policy (≈1 req/s, proper app identification, ODbL attribution) is satisfied
 * properly by the server-side proxy once `/backend` ships.
 */

/** Administrative level of a boundary — drives grouping in the picker. */
export type GeoAdminLevel = 'country' | 'region' | 'city'

/** GeoJSON geometry we accept for a boundary. */
export type GeoBoundaryGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] }

/** [west, south, east, north] — used for the auto-fit camera. */
export type GeoBBox = [number, number, number, number]

/** Lightweight search hit — no geometry, so the list stays cheap. */
export interface GeoBoundarySearchResult {
  id: string
  name: string
  adminLevel: GeoAdminLevel
  bbox: GeoBBox
}

/**
 * A fully-resolved boundary. This object is what gets embedded in the saved
 * project (PROJ-5) so the poster stays reproducible without the API.
 */
export interface GeoBoundary extends GeoBoundarySearchResult {
  geometry: GeoBoundaryGeometry
}

// ─── Nominatim fallback (dev stopgap) ────────────────────────────────────────

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

/**
 * Nominatim returns full geometry already in the search response, so the
 * resolved boundaries are cached here and `fetchGeoBoundary` just reads them
 * back — no second network round-trip, friendlier to the rate limit.
 */
const geometryCache = new Map<string, GeoBoundary>()

interface NominatimResult {
  osm_type?: string
  osm_id?: number
  name?: string
  display_name?: string
  addresstype?: string
  type?: string
  boundingbox?: [string, string, string, string]
  geojson?: { type?: string; coordinates?: unknown }
}

const CITY_TYPES = new Set([
  'city', 'town', 'village', 'municipality', 'borough', 'suburb',
  'city_district', 'hamlet', 'quarter',
])

function mapAdminLevel(addresstype?: string, type?: string): GeoAdminLevel {
  const v = (addresstype || type || '').toLowerCase()
  if (v === 'country' || v === 'continent') return 'country'
  if (CITY_TYPES.has(v)) return 'city'
  return 'region'
}

/**
 * Query Nominatim for administrative regions matching `query`. Only results
 * that carry a real Polygon/MultiPolygon outline are kept. `polygon_threshold`
 * applies a light Douglas-Peucker simplification server-side so the geometry
 * stays detailed (real coastline) without exploding the vertex count.
 */
async function nominatimSearch(
  query: string,
  signal?: AbortSignal,
): Promise<GeoBoundary[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    polygon_geojson: '1',
    polygon_threshold: '0.002',
    limit: '10',
    'accept-language': 'de',
  })
  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`nominatim failed: ${res.status}`)
  const data = (await res.json()) as NominatimResult[]
  if (!Array.isArray(data)) return []

  const out: GeoBoundary[] = []
  for (const r of data) {
    const geom = r.geojson
    if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue
    if (!r.osm_type || r.osm_id == null) continue
    const bb = r.boundingbox
    if (!bb || bb.length !== 4) continue
    // Nominatim boundingbox is [south, north, west, east]; we want
    // [west, south, east, north].
    const bbox: GeoBBox = [
      parseFloat(bb[2]), parseFloat(bb[0]), parseFloat(bb[3]), parseFloat(bb[1]),
    ]
    if (bbox.some((n) => Number.isNaN(n))) continue
    const name = r.name?.trim() || r.display_name?.split(',')[0]?.trim() || query
    out.push({
      id: `${r.osm_type}:${r.osm_id}`,
      name,
      adminLevel: mapAdminLevel(r.addresstype, r.type),
      bbox,
      geometry: geom as GeoBoundaryGeometry,
    })
  }
  return out
}

// ─── Client API ──────────────────────────────────────────────────────────────

/**
 * Search administrative regions by name. Hits the backend proxy first; on any
 * failure (not built yet / offline) falls back to a direct Nominatim query so
 * the real borders still load.
 */
export async function searchGeoBoundaries(
  query: string,
  signal?: AbortSignal,
): Promise<GeoBoundarySearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  // Preferred path — our own cached/simplified backend proxy.
  try {
    const res = await fetch(
      `/api/geo-boundaries/search?q=${encodeURIComponent(trimmed)}`,
      { signal },
    )
    if (res.ok) {
      const data = (await res.json()) as GeoBoundarySearchResult[]
      if (Array.isArray(data)) return data
    }
  } catch (err) {
    if (signal?.aborted) throw err
    // backend unavailable — fall through to Nominatim
  }

  // Stopgap — query OpenStreetMap Nominatim directly for real geometry.
  const boundaries = await nominatimSearch(trimmed, signal)
  for (const b of boundaries) geometryCache.set(b.id, b)
  return boundaries.map(({ id, name, adminLevel, bbox }) => ({
    id, name, adminLevel, bbox,
  }))
}

/**
 * Resolve a full boundary (incl. geometry) by id. Reads the backend proxy;
 * falls back to the geometry cached by the preceding `searchGeoBoundaries`
 * call (Nominatim returns geometry inline with the search results).
 */
export async function fetchGeoBoundary(id: string): Promise<GeoBoundary | null> {
  try {
    const res = await fetch(`/api/geo-boundaries/${encodeURIComponent(id)}`)
    if (res.ok) return (await res.json()) as GeoBoundary
  } catch {
    // backend unavailable — fall through to the cache
  }
  return geometryCache.get(id) ?? null
}

// ─── Geometry helpers ────────────────────────────────────────────────────────

/** World rectangle ring used as the outer ring of the inverse mask. */
const WORLD_RING: number[][] = [
  [-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85],
]

/**
 * Build the "everything except this region" polygon: a world-sized rectangle
 * whose holes are the region's outer rings. Painted in the poster background
 * colour, it leaves only the region itself showing the map.
 *
 * Region holes (lakes etc.) are intentionally ignored — acceptable for the
 * poster use case.
 */
export function buildInverseMaskPolygon(
  geometry: GeoBoundaryGeometry,
): { type: 'Polygon'; coordinates: number[][][] } {
  const holes: number[][][] =
    geometry.type === 'Polygon'
      ? [geometry.coordinates[0]]
      : geometry.coordinates.map((poly) => poly[0])
  return { type: 'Polygon', coordinates: [WORLD_RING, ...holes] }
}

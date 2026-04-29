/**
 * Dynamic Mockups API-Wrapper (PROJ-30 Phase 3).
 *
 * Endpoint:  POST https://app.dynamicmockups.com/api/v1/renders
 * Auth:      x-api-key Header (siehe DYNAMIC_MOCKUPS_API_KEY in .env.local)
 * Sync-API:  Antwort kommt nach ~5-15s direkt mit der Composite-URL zurück.
 *
 * Verwendung:
 *  - Worker:                renderMockup({ templateUuid, smartObjectUuid, assetUrl })
 *  - Admin (Mockup-Set-Save): validateMockupUuids({ templateUuid, smartObjectUuid })
 */

const DEFAULT_API_URL = 'https://app.dynamicmockups.com/api/v1'
const DEFAULT_TIMEOUT_MS = 60_000

export type AssetFit = 'cover' | 'contain' | 'stretch'

export interface SmartObjectAssignment {
  smartObjectUuid: string
  assetUrl: string
  fit?: AssetFit
}

export interface RenderMockupParams {
  templateUuid: string
  smartObjectUuid?: string
  /**
   * HTTPS-URL des Poster-PNGs, das in das Smart Object eingesetzt wird.
   * Wird von Dynamic Mockups gefetcht, muss also für 1h erreichbar sein.
   */
  assetUrl?: string
  /**
   * Mehrere Smart-Objects gleichzeitig befüllen (Multi-Slot-Mockups,
   * z. B. Diptychon mit 2 Posters). Wenn gesetzt, werden smartObjectUuid
   * + assetUrl auf der Top-Ebene ignoriert.
   */
  smartObjects?: SmartObjectAssignment[]
  /**
   * Wie soll das Asset ins Smart Object eingepasst werden?
   * - `contain` (Default): Asset komplett sichtbar, kein Überstand auf Frame. Kann Weißraum haben.
   * - `cover`: Asset füllt SO komplett, eventuell Cropping/Bleed je nach SO-Bounds.
   * - `stretch`: Asset wird verzerrt zum Füllen.
   */
  fit?: AssetFit
  apiKey?: string
  apiUrl?: string
  timeoutMs?: number
}

export interface RenderMockupResult {
  /** URL des fertig gerenderten Composite-Bildes auf Dynamic-Mockups-CDN */
  exportPath: string
  exportLabel?: string
  /** Roh-Antwort der API für Debug-Zwecke */
  raw: unknown
}

export class DynamicMockupsApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly responseBody?: unknown,
  ) {
    super(message)
    this.name = 'DynamicMockupsApiError'
  }
}

function getApiKey(explicit?: string): string {
  const key = explicit ?? process.env.DYNAMIC_MOCKUPS_API_KEY
  if (!key) {
    throw new DynamicMockupsApiError(
      0,
      'DYNAMIC_MOCKUPS_API_KEY ist nicht gesetzt. Bitte in .env.local hinterlegen.',
    )
  }
  return key
}

function getApiUrl(explicit?: string): string {
  if (explicit) return explicit
  // GitHub Actions reicht fehlende Secrets als leeren String durch — `??` fängt
  // nur `undefined`. Deshalb explizit auf truthy prüfen, sonst landet
  // `${""}/renders` als `/renders` im fetch und URL-Parser failed.
  const fromEnv = process.env.DYNAMIC_MOCKUPS_API_URL
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_API_URL
}

function getTimeout(explicit?: number): number {
  if (explicit) return explicit
  const fromEnv = Number.parseInt(process.env.DYNAMIC_MOCKUPS_TIMEOUT_MS ?? '', 10)
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_TIMEOUT_MS
}

/**
 * Rendert ein Mockup synchron via Dynamic Mockups API.
 * Wartet auf die fertige Composite-URL und gibt sie zurück.
 *
 * Wirft `DynamicMockupsApiError` bei API-Fehlern, Network-Issues oder Timeouts.
 */
export async function renderMockup(params: RenderMockupParams): Promise<RenderMockupResult> {
  const apiKey = getApiKey(params.apiKey)
  const baseUrl = getApiUrl(params.apiUrl)
  const timeoutMs = getTimeout(params.timeoutMs)

  const defaultFit: AssetFit = params.fit ?? 'cover'
  const smartObjects = params.smartObjects ?? (
    params.smartObjectUuid && params.assetUrl
      ? [{ smartObjectUuid: params.smartObjectUuid, assetUrl: params.assetUrl, fit: defaultFit }]
      : []
  )
  if (smartObjects.length === 0) {
    throw new DynamicMockupsApiError(0, 'Mindestens ein Smart-Object muss angegeben werden')
  }
  const body = {
    mockup_uuid: params.templateUuid,
    smart_objects: smartObjects.map((s) => ({
      uuid: s.smartObjectUuid,
      asset: {
        url: s.assetUrl,
        fit: s.fit ?? defaultFit,
      },
    })),
  }

  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response
  try {
    response = await fetch(`${baseUrl}/renders`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new DynamicMockupsApiError(0, `Dynamic-Mockups-Timeout nach ${timeoutMs}ms`)
    }
    throw new DynamicMockupsApiError(0, `Network-Fehler: ${(err as Error).message}`)
  } finally {
    clearTimeout(timeoutHandle)
  }

  let parsed: unknown
  try {
    parsed = await response.json()
  } catch {
    throw new DynamicMockupsApiError(
      response.status,
      `Antwort konnte nicht als JSON geparst werden (HTTP ${response.status})`,
    )
  }

  if (!response.ok) {
    const message =
      typeof (parsed as { message?: string })?.message === 'string'
        ? (parsed as { message: string }).message
        : `HTTP ${response.status}`
    throw new DynamicMockupsApiError(response.status, message, parsed)
  }

  const data = (parsed as { success?: boolean; data?: { export_path?: string; export_label?: string }; message?: string })
  if (!data.success) {
    throw new DynamicMockupsApiError(
      response.status,
      data.message ?? 'Dynamic Mockups antwortete mit success=false',
      parsed,
    )
  }

  const exportPath = data.data?.export_path
  if (!exportPath) {
    throw new DynamicMockupsApiError(
      response.status,
      'export_path fehlt in der Antwort',
      parsed,
    )
  }

  return {
    exportPath,
    exportLabel: data.data?.export_label,
    raw: parsed,
  }
}

export interface DynamicMockupsListItem {
  uuid: string
  name: string
  thumbnail?: string
  smart_objects: { uuid: string; name?: string }[]
}

/**
 * Listet alle Mockups im Dynamic-Mockups-Account.
 * Wird vom Admin-UI genutzt, um neue Mockup-Sets schnell zu importieren.
 */
export async function listMockups(opts?: { apiKey?: string; apiUrl?: string }): Promise<DynamicMockupsListItem[]> {
  const apiKey = getApiKey(opts?.apiKey)
  const baseUrl = getApiUrl(opts?.apiUrl)

  const res = await fetch(`${baseUrl}/mockups?include_all_catalogs=true`, {
    headers: {
      'x-api-key': apiKey,
      Accept: 'application/json',
    },
  })

  let parsed: unknown
  try { parsed = await res.json() } catch {
    throw new DynamicMockupsApiError(res.status, `Antwort konnte nicht geparst werden (HTTP ${res.status})`)
  }

  if (!res.ok) {
    const msg = (parsed as { message?: string })?.message ?? `HTTP ${res.status}`
    throw new DynamicMockupsApiError(res.status, msg, parsed)
  }

  const body = parsed as { success?: boolean; data?: unknown[] }
  if (!body.success || !Array.isArray(body.data)) {
    throw new DynamicMockupsApiError(res.status, 'Unerwartete Antwortstruktur', parsed)
  }

  return body.data.map((m): DynamicMockupsListItem => {
    const item = m as { uuid: string; name?: string; thumbnail?: string; smart_objects?: { uuid: string; name?: string }[] }
    return {
      uuid: item.uuid,
      name: item.name ?? 'Unbenanntes Mockup',
      thumbnail: item.thumbnail,
      smart_objects: item.smart_objects ?? [],
    }
  })
}

/**
 * Lädt ein gerendertes Composite von einer Dynamic-Mockups-CDN-URL als Buffer.
 * Wir laden jedes Composite einmal nach Supabase um, damit Marketing-Seiten
 * unter unserer Domäne ausliefern (DSGVO + Cache-Stabilität).
 */
export async function fetchCompositeBuffer(exportPath: string): Promise<Buffer> {
  const res = await fetch(exportPath)
  if (!res.ok) {
    throw new DynamicMockupsApiError(res.status, `Composite-Download fehlgeschlagen: HTTP ${res.status}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

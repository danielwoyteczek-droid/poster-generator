// PROJ-56: Client-Aufrufe des Image Generators. Wirft Error mit lesbarer
// Meldung, damit die Oberfläche sie direkt anzeigen kann.

import type {
  GenerateRequest,
  GenerateResponse,
  GeneratorImage,
  GeneratorState,
  GeneratorTemplate,
  MockupSetOption,
  Orientation,
  OverlayAsset,
  PaletteOption,
  SelectionEntry,
} from './types'

const BASE = '/api/admin/image-generator'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof data?.error === 'string' ? data.error : `Anfrage fehlgeschlagen (${res.status})`
    throw new Error(message)
  }
  return data as T
}

function json(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

export interface PresetListItem {
  id: string
  name: string
  poster_type: 'map' | 'star-map' | 'photo'
  status: string
  preview_image_url: string | null
  preview_image_url_a4: string | null
}

export const imageGeneratorApi = {
  listPresets: () =>
    request<{ presets: PresetListItem[] }>('/api/admin/presets?status=all').then((d) => d.presets),

  listMockupSets: () =>
    request<{ mockup_sets: MockupSetOption[] }>('/api/admin/mockup-sets').then((d) => d.mockup_sets),

  listPalettes: () =>
    request<{ palettes: PaletteOption[] }>('/api/admin/palettes?status=published').then((d) => d.palettes),

  getState: (presetId: string) =>
    request<GeneratorState>(`${BASE}/presets/${presetId}`),

  generate: (presetId: string, body: GenerateRequest) =>
    request<GenerateResponse>(`${BASE}/presets/${presetId}/generate`, json('POST', body)),

  deleteImage: (imageId: string) =>
    request<{ ok: true }>(`${BASE}/images/${imageId}`, { method: 'DELETE' }),

  retryImage: (imageId: string) =>
    request<{ image: GeneratorImage }>(`${BASE}/images/${imageId}/retry`, { method: 'POST' }),

  zipUrl: (presetId: string) => `${BASE}/presets/${presetId}/zip`,

  listOverlays: () =>
    request<{ overlays: OverlayAsset[] }>(`${BASE}/overlays`).then((d) => d.overlays),

  uploadOverlay: (file: File, name: string, orientation: Orientation) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', name)
    fd.append('orientation', orientation)
    return request<{ overlay: OverlayAsset }>(`${BASE}/overlays`, { method: 'POST', body: fd }).then((d) => d.overlay)
  },

  listTemplates: () =>
    request<{ templates: GeneratorTemplate[] }>(`${BASE}/templates`).then((d) => d.templates),

  createTemplate: (name: string, entries: SelectionEntry[]) =>
    request<{ template: GeneratorTemplate }>(`${BASE}/templates`, json('POST', { name, entries })).then((d) => d.template),

  updateTemplate: (id: string, patch: { name?: string; entries?: SelectionEntry[] }) =>
    request<{ template: GeneratorTemplate }>(`${BASE}/templates/${id}`, json('PATCH', patch)).then((d) => d.template),

  deleteTemplate: (id: string) =>
    request<{ ok: true }>(`${BASE}/templates/${id}`, { method: 'DELETE' }),
}

'use client'

import { useEffect, useRef } from 'react'
import { useMapExport } from '@/hooks/useMapExport'
import { useStarMapExport } from '@/hooks/useStarMapExport'
import { usePhotoExport } from '@/hooks/usePhotoExport'
import { useEditorStore } from '@/hooks/useEditorStore'
import type { PrintFormat } from '@/lib/print-formats'

type RenderPosterPngFn = (opts?: { format?: PrintFormat }) => Promise<string>

declare global {
  interface Window {
    __posterReady?: boolean
    __renderPosterPng?: RenderPosterPngFn
    __presetApplied?: boolean
  }
}

const DEFAULT_FORMAT: PrintFormat = 'a4'
const READY_DELAY_MS = 1500 // Puffer nach Preset-Apply für Map-Tiles + Style-Loader
const PRESET_APPLY_TIMEOUT_MS = 30_000 // Hard-Cap fürs Warten auf PresetUrlApplier

/**
 * Bridge für Map-Editor-Headless-Render.
 * Mounten in `?headless=1`-Seiten; exposed `window.__renderPosterPng` und
 * setzt nach Fonts-Ready + Delay `window.__posterReady = true`.
 */
export function HeadlessMapRenderBridge() {
  const { renderPreview } = useMapExport()
  return <BridgeImpl renderPreview={renderPreview} />
}

/**
 * Bridge für Star-Map-Editor-Headless-Render.
 */
export function HeadlessStarMapRenderBridge() {
  const { renderPreview } = useStarMapExport()
  return <BridgeImpl renderPreview={renderPreview} />
}

/**
 * Bridge für Foto-Poster-Editor-Headless-Render. Wie die Map-/Star-Map-
 * Bridges, aber ohne Lat/Lng-URL-Override (Foto-Posters haben keine
 * Geo-Komponente). Slot-Fotos werden via Storage-URLs geladen — der
 * READY_DELAY_MS-Puffer reicht für `loadImage()` in `drawLetterMask()`.
 */
export function HeadlessPhotoRenderBridge() {
  const { renderPreview } = usePhotoExport()
  return <BridgeImpl renderPreview={renderPreview} skipLocationOverride />
}

function BridgeImpl({
  renderPreview,
  skipLocationOverride = false,
}: {
  renderPreview: (format: PrintFormat) => Promise<string>
  /** When true, skip the lat/lng/zoom URL override step. Photo posters
   *  have no geo state to write to, so the override block is a no-op
   *  there — and writing to `useEditorStore.viewState` would touch a
   *  store the photo editor never reads from. */
  skipLocationOverride?: boolean
}) {
  const renderPreviewRef = useRef(renderPreview)
  renderPreviewRef.current = renderPreview

  useEffect(() => {
    window.__renderPosterPng = async (opts) => {
      const format = opts?.format ?? DEFAULT_FORMAT
      return renderPreviewRef.current(format)
    }

    let cancelled = false
    void (async () => {
      // 1. Wenn ein Preset in der URL steckt, warte bis PresetUrlApplier
      //    `__presetApplied` setzt (true bei Erfolg, false bei Fehler).
      const url = new URL(window.location.href)
      const hasPreset = url.searchParams.has('preset')
      if (hasPreset) {
        console.log('[hl-debug] HeadlessBridge: warte auf __presetApplied')
        const start = Date.now()
        while (
          typeof window.__presetApplied === 'undefined' &&
          Date.now() - start < PRESET_APPLY_TIMEOUT_MS
        ) {
          await new Promise((r) => setTimeout(r, 100))
        }
        console.log('[hl-debug] HeadlessBridge: __presetApplied =', window.__presetApplied)
      }

      // 2. Location-Override per URL-Param (?lat=...&lng=...&location_name=...).
      //    PROJ-30 Phase 4: Worker übergibt die preset-spezifische Location dort.
      //    Zoom kommt primär aus dem Preset (pendingCenter.zoom, vom applyPreset
      //    gesetzt). URL-`zoom` ist nur expliziter Override für Test-Szenarien.
      //    Für Foto-Posters (skipLocationOverride) wird das übersprungen.
      if (skipLocationOverride) {
        // Fall-through to Fonts + Delay
      } else {
      const lat = parseFloat(url.searchParams.get('lat') ?? '')
      const lng = parseFloat(url.searchParams.get('lng') ?? '')
      const urlZoom = parseFloat(url.searchParams.get('zoom') ?? '')
      const locationName = url.searchParams.get('location_name')
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        useEditorStore.setState((state) => {
          // Preset-Zoom gewinnt: pendingCenter.zoom > viewState.zoom > URL-zoom
          const presetZoom = state.pendingCenter?.zoom
          const targetZoom = Number.isFinite(urlZoom)
            ? urlZoom
            : presetZoom != null
              ? presetZoom
              : state.viewState.zoom
          console.log('[hl-debug] HeadlessBridge: applying location', {
            lat, lng, targetZoom, presetZoom, urlZoom: Number.isFinite(urlZoom) ? urlZoom : null,
          })
          return {
            ...state,
            viewState: {
              ...state.viewState,
              lat,
              lng,
              zoom: targetZoom,
            },
            marker: {
              ...state.marker,
              lat,
              lng,
            },
            locationName: locationName ?? state.locationName,
            pendingCenter: null,
          }
        })
      } else if (typeof url.searchParams.get('preset') === 'string') {
        // Kein Lat/Lng übergeben, aber Preset geladen → Preset-Zoom dennoch
        // in viewState propagieren, damit der Offscreen-Render ihn nutzt.
        useEditorStore.setState((state) => {
          if (state.pendingCenter?.zoom == null) return state
          return {
            ...state,
            viewState: { ...state.viewState, zoom: state.pendingCenter.zoom },
            pendingCenter: null,
          }
        })
      }
      } // end of skipLocationOverride else-block

      // 3. Fonts laden
      try {
        if (typeof document !== 'undefined' && document.fonts?.ready) {
          await document.fonts.ready
        }
      } catch {
        // Fonts-API ist optional; ignorieren wenn nicht verfügbar
      }

      // 4. Kurzer Puffer für Style/Tile-Loader
      await new Promise((r) => setTimeout(r, READY_DELAY_MS))
      if (!cancelled) {
        window.__posterReady = true
        console.log('[hl-debug] HeadlessBridge: __posterReady = true')
      }
    })()

    return () => {
      cancelled = true
      delete window.__posterReady
      delete window.__renderPosterPng
    }
  }, [])

  return null
}

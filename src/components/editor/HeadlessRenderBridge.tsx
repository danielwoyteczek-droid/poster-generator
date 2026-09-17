'use client'

import { useEffect, useRef } from 'react'
import { useMapExport } from '@/hooks/useMapExport'
import { useStarMapExport } from '@/hooks/useStarMapExport'
import { usePhotoExport } from '@/hooks/usePhotoExport'
import { useEditorStore } from '@/hooks/useEditorStore'
import { ensureFontsRegistered } from '@/hooks/useFonts'
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
  renderPreview: (format: PrintFormat, opts?: { watermark?: boolean; viewportW?: number; viewportH?: number }) => Promise<string>
  /** When true, skip the lat/lng/zoom URL override step. Photo posters
   *  have no geo state to write to, so the override block is a no-op
   *  there — and writing to `useEditorStore.viewState` would touch a
   *  store the photo editor never reads from. */
  skipLocationOverride?: boolean
}) {
  const renderPreviewRef = useRef(renderPreview)
  renderPreviewRef.current = renderPreview

  useEffect(() => {
    // Safety net (PROJ-30): when the preset failed to apply, this holds the
    // reason. `__renderPosterPng` then throws instead of rendering — see the
    // abort block below for why a silent fallback render is dangerous.
    let presetError: string | null = null

    window.__renderPosterPng = async (opts) => {
      if (presetError) throw new Error(presetError)
      const format = opts?.format ?? DEFAULT_FORMAT
      // PROJ-53: reproduce the editor's exact extent — the worker passes the
      // design-time preview size as ?vw/?vh. Without it renderMapOffscreen
      // falls back to 500px → tighter crop than the editor.
      const sp = new URL(window.location.href).searchParams
      const vw = parseFloat(sp.get('vw') ?? '')
      const vh = parseFloat(sp.get('vh') ?? '')
      return renderPreviewRef.current(format, {
        viewportW: Number.isFinite(vw) && vw > 0 ? vw : undefined,
        viewportH: Number.isFinite(vh) && vh > 0 ? vh : undefined,
      })
    }

    let cancelled = false
    const markReady = () => {
      if (!cancelled) {
        window.__posterReady = true
        console.log('[hl-debug] HeadlessBridge: __posterReady = true')
      }
    }

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

        // Abort the render if the preset never applied. `false` = fetch /
        // 404 / apply error (see PresetUrlApplier); still `undefined` after
        // the timeout = PresetUrlApplier never resolved. In both cases the
        // store still holds the DEFAULT design — rendering it would upload a
        // wrong poster (wrong map style + palette) as the preset/listing
        // preview. Fail loudly so the worker marks render_status='failed'
        // with a clear reason instead.
        if (window.__presetApplied !== true) {
          const presetId = url.searchParams.get('preset')
          presetError =
            window.__presetApplied === false
              ? `Preset ${presetId} konnte nicht angewendet werden (nicht gefunden / Ladefehler) — Render abgebrochen, sonst würde das Default-Design gerendert.`
              : `Preset ${presetId} wurde nicht innerhalb von ${PRESET_APPLY_TIMEOUT_MS}ms angewendet — Render abgebrochen.`
          console.error('[hl-debug] HeadlessBridge:', presetError)
          // Mark ready so the worker proceeds quickly to __renderPosterPng,
          // which then throws presetError — a fast, clear failure instead of
          // a 60s waitForFunction timeout.
          markReady()
          return
        }
      }

      // 2. Location-Override per URL-Param (?lat=...&lng=...&location_name=...).
      //    PROJ-30 Phase 4: Worker übergibt die preset-spezifische Location dort.
      //    Zoom kommt primär aus dem Preset (pendingCenter.zoom, vom applyPreset
      //    gesetzt). URL-`zoom` ist nur expliziter Override für Test-Szenarien.
      //    Für Foto-Posters (skipLocationOverride) wird das übersprungen.
      //
      //    PROJ-42 City-Renders: Wenn `?city_render=1` gesetzt ist (und es kein
      //    Preset gibt), nimmt der Bridge zusätzlich `?layout=` und `?palette=`
      //    aus der URL und schreibt sie direkt in den Editor-Store. Damit
      //    rendert der Worker eine Stadt-Hero-Card (klassisch+sand etc.) ohne
      //    dass dafür ein Preset im DB gebraucht wird.
      if (skipLocationOverride) {
        // Fall-through to Fonts + Delay
      } else {
      // PROJ-42: city-render style/palette override (only for map editor).
      const isCityRender = url.searchParams.get('city_render') === '1'
      if (isCityRender && !hasPreset) {
        const layout = url.searchParams.get('layout')
        const palette = url.searchParams.get('palette')
        if (layout || palette) {
          console.log('[hl-debug] HeadlessBridge: applying city_render style/palette', { layout, palette })
          useEditorStore.setState((state) => ({
            ...state,
            ...(layout ? { styleId: layout } : {}),
            ...(palette ? { paletteId: palette, customPalette: null, customPaletteBase: null } : {}),
          }))
        }
      }
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
          // PROJ-42: bei city_render auch den Title-textBlock auf den
          // Stadtnamen setzen (sonst rendert das Poster "NEW YORK" als
          // Titel — der Default-Text aus EDITOR_INITIAL_STATE).
          //
          // 2026-05-11: Brand-Font-Wahl. Title wird auf Cormorant Garamond
          // Bold ALL CAPS gesetzt — passt zur UI-Headline-Font des Brand
          // Systems (siehe project_brand_fonts.md). Customer kann im Editor
          // jederzeit ueberschreiben; das ist nur der Render-Default.
          const isCityRender = url.searchParams.get('city_render') === '1'
          const updatedTextBlocks =
            isCityRender && locationName
              ? state.textBlocks.map((tb) =>
                  tb.id === 'block-title' || (!tb.isCoordinates && tb.id === state.textBlocks[0]?.id)
                    ? {
                        ...tb,
                        text: locationName.toUpperCase(),
                        fontFamily: 'Cormorant Garamond',
                        bold: true,
                      }
                    : tb,
                )
              : state.textBlocks
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
            textBlocks: updatedTextBlocks,
            pendingCenter: null,
          }
        })
      } else if (typeof url.searchParams.get('preset') === 'string') {
        // Kein Lat/Lng übergeben, aber Preset geladen → die gespeicherte
        // Kamera des Presets (Mitte + Zoom) in viewState übernehmen, damit der
        // Offscreen-Render genau den Editor-Ausschnitt zeigt. Im Editor
        // übernimmt das MapPreview; headless gibt es keine MapPreview.
        useEditorStore.setState((state) => {
          const pc = state.pendingCenter
          if (!pc) return state
          return {
            ...state,
            viewState: {
              ...state.viewState,
              lat: pc.lat ?? state.viewState.lat,
              lng: pc.lng ?? state.viewState.lng,
              zoom: pc.zoom ?? state.viewState.zoom,
            },
            pendingCenter: null,
          }
        })
      }
      } // end of skipLocationOverride else-block

      // 3. Fonts laden. Admin-Fonts (PROJ-47) registriert sonst nur der
      //    Font-Picker der Sidebar — headless gibt es den nicht.
      try {
        await ensureFontsRegistered()
      } catch {
        // Fallback-Fonts aus globals.css bleiben nutzbar
      }
      try {
        if (typeof document !== 'undefined' && document.fonts?.ready) {
          await document.fonts.ready
        }
      } catch {
        // Fonts-API ist optional; ignorieren wenn nicht verfügbar
      }

      // 4. Kurzer Puffer für Style/Tile-Loader
      await new Promise((r) => setTimeout(r, READY_DELAY_MS))
      markReady()
    })()

    return () => {
      cancelled = true
      delete window.__posterReady
      delete window.__renderPosterPng
    }
  }, [])

  return null
}

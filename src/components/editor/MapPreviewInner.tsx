'use client'

import { useEffect, useRef } from 'react'
import { useLocale } from 'next-intl'
import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import { useEditorStore } from '@/hooks/useEditorStore'
import type { ViewState } from '@/hooks/useEditorStore'
import { setMapInstance } from '@/hooks/useMapInstance'
import { buildPetiteStyle } from '@/lib/petite-style-loader'
import { getPalette } from '@/lib/map-palettes'
import { buildInverseMaskPolygon, type GeoBoundaryGeometry } from '@/lib/geo-boundaries'

interface MapPreviewInnerProps {
  storeSlice?: 'primary' | 'secondary'
}

// PROJ-51: ids for the geo-boundary map layers. The "overmask" fill paints
// everything OUTSIDE the region in the poster background colour; the contour
// line traces the border.
const GEO_OVERMASK_SRC = 'geo-boundary-overmask-src'
const GEO_REGION_SRC = 'geo-boundary-region-src'
const GEO_OVERMASK_LAYER = 'geo-boundary-overmask'
const GEO_CONTOUR_LAYER = 'geo-boundary-contour'

export default function MapPreviewInner({ storeSlice = 'primary' }: MapPreviewInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maptilersdk.Map | null>(null)
  const lastStyleKeyRef = useRef<string | null>(null)

  const store = useEditorStore()

  const layoutId = storeSlice === 'primary' ? store.styleId : store.secondMap.styleId
  const paletteId = storeSlice === 'primary' ? store.paletteId : store.secondMap.paletteId
  const customPaletteBase = storeSlice === 'primary' ? store.customPaletteBase : store.secondMap.customPaletteBase
  const customPalette = storeSlice === 'primary' ? store.customPalette : store.secondMap.customPalette
  const streetLabelsVisible = store.streetLabelsVisible
  const placeLabelsVisible = store.placeLabelsVisible
  // PROJ-51: geo-boundary mask state (primary slice only — it's a single-map
  // shape). geoBgColor must match the poster card so the over-painted area
  // outside the region blends seamlessly.
  const maskKey = store.maskKey
  const geoBoundary = store.geoBoundary
  const posterDarkMode = store.posterDarkMode
  const pendingFitBounds = store.pendingFitBounds
  const clearPendingFitBounds = store.clearPendingFitBounds
  const geoBgColor = posterDarkMode
    ? (customPalette?.background ?? getPalette(paletteId)?.colors.background ?? '#ffffff')
    : '#ffffff'
  const locale = useLocale()
  const pendingCenter = storeSlice === 'primary' ? store.pendingCenter : store.secondMap.pendingCenter
  const pendingZoomDelta = storeSlice === 'primary' ? store.pendingZoomDelta : store.secondMap.pendingZoomDelta
  const viewState = storeSlice === 'primary' ? store.viewState : store.secondMap.viewState
  const setViewState: (vs: ViewState) => void =
    storeSlice === 'primary' ? store.setViewState : store.setSecondMapViewState
  const clearPendingCenter =
    storeSlice === 'primary' ? store.clearPendingCenter : store.clearSecondPendingCenter
  const clearZoomDelta =
    storeSlice === 'primary' ? store.clearZoomDelta : store.clearSecondZoomDelta

  const setViewStateRef = useRef(setViewState)
  const clearPendingCenterRef = useRef(clearPendingCenter)
  const clearZoomDeltaRef = useRef(clearZoomDelta)
  const clearPendingFitBoundsRef = useRef(clearPendingFitBounds)
  const streetLabelsRef = useRef(streetLabelsVisible)
  // PROJ-51: id of the geo-boundary region whose geometry is currently loaded
  // into the map sources. Lets sync() skip the (expensive, worker-reparsing)
  // setData() call when only paint values changed — that re-parse blanked the
  // layer for a frame and made the mask flicker on every slider tick.
  const geoRegionRef = useRef<string>('')
  useEffect(() => { setViewStateRef.current = setViewState }, [setViewState])
  useEffect(() => { clearPendingCenterRef.current = clearPendingCenter }, [clearPendingCenter])
  useEffect(() => { clearZoomDeltaRef.current = clearZoomDelta }, [clearZoomDelta])
  useEffect(() => { clearPendingFitBoundsRef.current = clearPendingFitBounds }, [clearPendingFitBounds])
  useEffect(() => { streetLabelsRef.current = streetLabelsVisible }, [streetLabelsVisible])

  // PROJ-51: current geo-boundary layer config + a handle to the apply fn.
  // The fn is created inside the map-init effect (it closes over the live
  // map); the geoRef carries the latest store values into it, and the sync
  // effect below pokes it whenever they change.
  const geoRef = useRef<{ active: boolean; geometry: GeoBoundaryGeometry | null; bgColor: string }>({
    active: false,
    geometry: null,
    bgColor: '#ffffff',
  })
  const applyGeoBoundaryRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY
    if (!apiKey) {
      console.error('[MapPreview] NEXT_PUBLIC_MAPTILER_API_KEY not set')
      return
    }

    maptilersdk.config.apiKey = apiKey

    // Start with an empty shell; the style effect below fills it with the
    // resolved petite-moment layout + palette.
    const initialStyle = { version: 8, sources: {}, layers: [] } as unknown as maptilersdk.StyleSpecification

    const map = new maptilersdk.Map({
      container: containerRef.current,
      style: initialStyle,
      center: [viewState.lng, viewState.lat],
      zoom: viewState.zoom,
      dragRotate: false,
      touchZoomRotate: true,
      hash: false,
      navigationControl: false,
      geolocateControl: false,
      // MapLibre/MapTiler regenerates the attribution widget on every
      // setStyle, so CSS-hiding it doesn't stick. Disable at init instead.
      // OSM attribution stays legally required — keep a static link in the
      // page footer (or a dedicated /karten-attribution route) so you stay
      // compliant with the ODbL license.
      attributionControl: false,
      language: maptilersdk.Language.AUTO,
    })

    const emit = () => {
      const center = map.getCenter()
      const bounds = map.getBounds()
      const container = map.getContainer()
      setViewStateRef.current({
        lng: Number(center.lng.toFixed(6)),
        lat: Number(center.lat.toFixed(6)),
        zoom: Number(map.getZoom().toFixed(2)),
        viewportWidth: container.clientWidth,
        viewportHeight: container.clientHeight,
        bounds: {
          west: Number(bounds.getWest().toFixed(6)),
          south: Number(bounds.getSouth().toFixed(6)),
          east: Number(bounds.getEast().toFixed(6)),
          north: Number(bounds.getNorth().toFixed(6)),
        },
      })
    }

    const applyStreetLabels = () => {
      if (!mapRef.current) return
      const style = mapRef.current.getStyle()
      if (!style?.layers) return
      for (const layer of style.layers) {
        const sl = (layer as { 'source-layer'?: string })['source-layer']
        if (layer.type === 'symbol' && sl === 'transportation_name') {
          try {
            mapRef.current.setLayoutProperty(
              layer.id,
              'visibility',
              streetLabelsRef.current ? 'visible' : 'none',
            )
          } catch { /* layer may be gone on style swap */ }
        }
      }
    }

    // PROJ-51: (re)apply the geo-boundary layers. Called after every style
    // swap (setStyle wipes custom sources/layers) and whenever the selected
    // region changes. geo-boundary is a single-map shape — secondary slice
    // never renders it.
    const applyGeoBoundary = () => {
      const m = mapRef.current
      if (!m || storeSlice !== 'primary' || !m.isStyleLoaded()) return
      // Remove any previous geo layers/sources first so this is idempotent.
      try {
        if (m.getLayer(GEO_CONTOUR_LAYER)) m.removeLayer(GEO_CONTOUR_LAYER)
        if (m.getLayer(GEO_OVERMASK_LAYER)) m.removeLayer(GEO_OVERMASK_LAYER)
        if (m.getSource(GEO_REGION_SRC)) m.removeSource(GEO_REGION_SRC)
        if (m.getSource(GEO_OVERMASK_SRC)) m.removeSource(GEO_OVERMASK_SRC)
      } catch { /* style swapped mid-call */ }
      const cfg = geoRef.current
      if (!cfg.active || !cfg.geometry) return
      try {
        type AddSourceArg = Parameters<typeof m.addSource>[1]
        m.addSource(GEO_OVERMASK_SRC, {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: buildInverseMaskPolygon(cfg.geometry) },
        } as AddSourceArg)
        m.addSource(GEO_REGION_SRC, {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: cfg.geometry },
        } as AddSourceArg)
        // Overmask: paints everything OUTSIDE the region in the poster
        // background colour, so only the region shows the map.
        m.addLayer({
          id: GEO_OVERMASK_LAYER,
          type: 'fill',
          source: GEO_OVERMASK_SRC,
          paint: { 'fill-color': cfg.bgColor, 'fill-opacity': 1 },
        })
        // Contour: traces the region border — the automatic "Formkontur".
        m.addLayer({
          id: GEO_CONTOUR_LAYER,
          type: 'line',
          source: GEO_REGION_SRC,
          layout: { 'line-join': 'round' },
          paint: { 'line-color': '#1a1a1a', 'line-width': 1.4 },
        })
      } catch { /* style swapped mid-call */ }
    }
    applyGeoBoundaryRef.current = applyGeoBoundary

    map.on('load', () => { map.resize(); emit(); applyStreetLabels(); applyGeoBoundary() })
    map.on('styledata', applyStreetLabels)
    map.on('styledata', applyGeoBoundary)
    map.on('moveend', emit)
    map.on('zoomend', emit)

    mapRef.current = map
    setMapInstance(storeSlice, map)

    return () => {
      setMapInstance(storeSlice, null)
      map.remove()
      mapRef.current = null
    }
  }, [storeSlice]) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply layout + palette changes
  useEffect(() => {
    const map = mapRef.current
    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY
    if (!map || !apiKey) return

    let cancelled = false

    ;(async () => {
      const key = `${layoutId}|${paletteId}|${customPaletteBase ?? ''}|${JSON.stringify(customPalette ?? null)}|${streetLabelsVisible}|${placeLabelsVisible}|${locale}`
      if (lastStyleKeyRef.current === key) return
      try {
        console.log('[MapPreview] loading layout:', layoutId, 'palette:', paletteId)
        const style = await buildPetiteStyle({
          layoutId,
          paletteId,
          customPaletteBase,
          customPalette,
          streetLabelsVisible,
          placeLabelsVisible,
          locale,
          apiKey,
        })
        if (cancelled) return
        try {
          const { validateStyleMin } = await import('@maplibre/maplibre-gl-style-spec')
          const errors = validateStyleMin(style as Parameters<typeof validateStyleMin>[0])
          if (errors.length > 0) {
            console.warn('[MapPreview] style validation failed with', errors.length, 'errors:')
            for (const e of errors) {
              console.warn('  •', (e as { message?: string }).message ?? String(e))
            }
          } else {
            console.log('[MapPreview] style validated OK, layers:', (style as { layers?: unknown[] }).layers?.length)
          }
        } catch (e) {
          console.warn('[MapPreview] could not run validator:', e)
        }
        map.setStyle(style as maptilersdk.StyleSpecification)
        lastStyleKeyRef.current = key
      } catch (err) {
        console.error('[MapPreview] buildPetiteStyle failed:', err)
      }
    })()

    return () => { cancelled = true }
  }, [layoutId, paletteId, customPaletteBase, customPalette, streetLabelsVisible, placeLabelsVisible, locale])

  // Toggle street labels on style changes — fast path that doesn't rebuild
  // the whole style. Layers with source-layer transportation_name carry the
  // street-name symbols.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const style = map.getStyle()
    if (!style?.layers) return
    for (const layer of style.layers) {
      const sl = (layer as { 'source-layer'?: string })['source-layer']
      if (layer.type === 'symbol' && sl === 'transportation_name') {
        try {
          map.setLayoutProperty(
            layer.id,
            'visibility',
            streetLabelsVisible ? 'visible' : 'none',
          )
        } catch { /* layer may be gone during style swap */ }
      }
    }
  }, [streetLabelsVisible])

  // Toggle place labels (city/town/country/park/water names) — same fast
  // path as street labels. Covers source-layer 'place', 'park',
  // 'water_name', and waterway symbol layers.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const style = map.getStyle()
    if (!style?.layers) return
    const placeSrcLayers = new Set(['place', 'park', 'water_name', 'waterway'])
    for (const layer of style.layers) {
      const sl = (layer as { 'source-layer'?: string })['source-layer']
      if (layer.type === 'symbol' && sl && placeSrcLayers.has(sl)) {
        try {
          map.setLayoutProperty(
            layer.id,
            'visibility',
            placeLabelsVisible ? 'visible' : 'none',
          )
        } catch { /* layer may be gone during style swap */ }
      }
    }
  }, [placeLabelsVisible])

  // PROJ-51: geo-boundary layers — an "overmask" fill that paints everything
  // OUTSIDE the region in the poster background colour, plus a contour line
  // tracing the border. The outer area is always fully masked.
  //
  // NOTE: the outer-area modes (Verblassen / Leuchten / Posterrand) and a
  // customisable Formkontur are NOT implemented for geo-masks — see the
  // feature spec. They need the SVG-mask pipeline (like the shape masks),
  // not these MapLibre layers; that is a separate, dedicated task.
  //
  // Two sources + two layers, created once and kept. Geometry is only
  // re-uploaded on a real region change. After setStyle() (palette / map-style
  // swap) wipes the style, the `idle` handler re-creates them. Only the
  // primary map carries a geo-boundary.
  useEffect(() => {
    if (storeSlice !== 'primary') return
    const map = mapRef.current
    if (!map) return

    const active = maskKey === 'geo-boundary' && !!geoBoundary

    type GeoJsonSource = { setData: (data: unknown) => void }

    const removeGeo = () => {
      for (const id of [GEO_CONTOUR_LAYER, GEO_OVERMASK_LAYER]) {
        if (map.getLayer(id)) map.removeLayer(id)
      }
      for (const id of [GEO_OVERMASK_SRC, GEO_REGION_SRC]) {
        if (map.getSource(id)) map.removeSource(id)
      }
    }

    const sync = () => {
      try {
        if (!active || !geoBoundary) { removeGeo(); geoRegionRef.current = ''; return }

        // Geometry is only (re)uploaded when a source is missing (first run /
        // after a style swap) or the region itself changed.
        const regionChanged = geoBoundary.id !== geoRegionRef.current
        const overmaskSrc = map.getSource(GEO_OVERMASK_SRC) as GeoJsonSource | undefined
        const regionSrc = map.getSource(GEO_REGION_SRC) as GeoJsonSource | undefined
        if (!overmaskSrc || !regionSrc || regionChanged) {
          const inverse = {
            type: 'Feature' as const, properties: {},
            geometry: buildInverseMaskPolygon(geoBoundary.geometry),
          }
          const region = {
            type: 'Feature' as const, properties: {},
            geometry: geoBoundary.geometry,
          }
          if (!overmaskSrc) {
            map.addSource(GEO_OVERMASK_SRC, { type: 'geojson', data: inverse } as Parameters<typeof map.addSource>[1])
          } else if (regionChanged) {
            overmaskSrc.setData(inverse)
          }
          if (!regionSrc) {
            map.addSource(GEO_REGION_SRC, { type: 'geojson', data: region } as Parameters<typeof map.addSource>[1])
          } else if (regionChanged) {
            regionSrc.setData(region)
          }
        }
        geoRegionRef.current = geoBoundary.id

        // Layers — overmask (outside fully over-painted) then contour.
        if (!map.getLayer(GEO_OVERMASK_LAYER)) {
          map.addLayer({
            id: GEO_OVERMASK_LAYER, type: 'fill', source: GEO_OVERMASK_SRC,
            paint: { 'fill-antialias': true, 'fill-color': geoBgColor },
          })
        }
        if (!map.getLayer(GEO_CONTOUR_LAYER)) {
          map.addLayer({
            id: GEO_CONTOUR_LAYER, type: 'line', source: GEO_REGION_SRC,
            layout: { 'line-join': 'round' },
            paint: { 'line-color': '#22272e', 'line-width': 1.6 },
          })
        }
        // Keep the over-paint colour in sync with the poster background.
        if (map.getLayer(GEO_OVERMASK_LAYER)) {
          map.setPaintProperty(GEO_OVERMASK_LAYER, 'fill-color', geoBgColor)
        }
      } catch (e) {
        console.error('[geo] sync error:', e)
      }
    }

    sync()

    // setStyle() (palette / map-style swap) wipes every source + layer. Once
    // the new style settles (`idle`), re-create the geo layers if they're
    // gone. `idle` only — never `styledata`, which our own addLayer calls
    // fire synchronously and would re-enter this in a loop.
    const onIdle = () => {
      const present = !!map.getLayer(GEO_CONTOUR_LAYER)
      if ((active && !present) || (!active && present)) sync()
    }
    map.on('idle', onIdle)
    return () => {
      map.off('idle', onIdle)
    }
  }, [storeSlice, maskKey, geoBoundary, geoBgColor])

  // PROJ-51: auto-frame a freshly picked region by fitting its bounding box.
  useEffect(() => {
    if (storeSlice !== 'primary') return
    if (!pendingFitBounds || !mapRef.current) return
    const [w, s, e, n] = pendingFitBounds
    mapRef.current.fitBounds(
      [[w, s], [e, n]],
      { padding: 24, duration: 600 },
    )
    clearPendingFitBounds()
  }, [pendingFitBounds, storeSlice, clearPendingFitBounds])

  // Apply pending camera. Default path is jumpTo — applyPreset() fires a
  // parallel style swap and setStyle() would cancel an in-flight flyTo
  // mid-animation, stranding the camera. User-driven location searches
  // opt into `animated: true` (no concurrent style swap there) so the
  // map glides into the new view instead of teleporting.
  useEffect(() => {
    if (!pendingCenter || !mapRef.current) return
    const target = { center: [pendingCenter.lng, pendingCenter.lat] as [number, number], zoom: pendingCenter.zoom }
    if (pendingCenter.animated) {
      mapRef.current.flyTo({ ...target, duration: 800, essential: true })
    } else {
      mapRef.current.jumpTo(target)
    }
    clearPendingCenterRef.current()
  }, [pendingCenter])

  // Handle zoom in/out from external controls
  useEffect(() => {
    if (!pendingZoomDelta || !mapRef.current) return
    if (pendingZoomDelta > 0) mapRef.current.zoomIn()
    else mapRef.current.zoomOut()
    clearZoomDeltaRef.current()
  }, [pendingZoomDelta])

  // PROJ-51: keep the geo-boundary layers in sync with the editor store.
  // The 'styledata' binding above re-applies them after style swaps; this
  // effect handles region selection / removal / palette (bg colour) changes.
  useEffect(() => {
    geoRef.current = {
      active: storeSlice === 'primary' && maskKey === 'geo-boundary' && !!geoBoundary,
      geometry: geoBoundary?.geometry ?? null,
      bgColor: geoBgColor,
    }
    applyGeoBoundaryRef.current?.()
  }, [storeSlice, maskKey, geoBoundary, geoBgColor])

  // PROJ-51: auto-frame a freshly-selected region's bounding box. Cleared
  // straight after so panning/zooming afterwards isn't overridden.
  useEffect(() => {
    if (storeSlice !== 'primary' || !pendingFitBounds || !mapRef.current) return
    const [w, s, e, n] = pendingFitBounds
    mapRef.current.fitBounds([[w, s], [e, n]], { padding: 28, duration: 600, maxZoom: 13 })
    clearPendingFitBoundsRef.current()
  }, [pendingFitBounds, storeSlice])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

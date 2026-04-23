'use client'

import { useEffect, useRef } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import { useEditorStore } from '@/hooks/useEditorStore'
import type { ViewState } from '@/hooks/useEditorStore'
import { setMapInstance } from '@/hooks/useMapInstance'
import { buildPetiteStyle } from '@/lib/petite-style-loader'

interface MapPreviewInnerProps {
  storeSlice?: 'primary' | 'secondary'
}

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
  const streetLabelsRef = useRef(streetLabelsVisible)
  useEffect(() => { setViewStateRef.current = setViewState }, [setViewState])
  useEffect(() => { clearPendingCenterRef.current = clearPendingCenter }, [clearPendingCenter])
  useEffect(() => { clearZoomDeltaRef.current = clearZoomDelta }, [clearZoomDelta])
  useEffect(() => { streetLabelsRef.current = streetLabelsVisible }, [streetLabelsVisible])

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

    map.on('load', () => { map.resize(); emit(); applyStreetLabels() })
    map.on('styledata', applyStreetLabels)
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
      const key = `${layoutId}|${paletteId}|${customPaletteBase ?? ''}|${JSON.stringify(customPalette ?? null)}|${streetLabelsVisible}`
      if (lastStyleKeyRef.current === key) return
      try {
        console.log('[MapPreview] loading layout:', layoutId, 'palette:', paletteId)
        const style = await buildPetiteStyle({
          layoutId,
          paletteId,
          customPaletteBase,
          customPalette,
          streetLabelsVisible,
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
  }, [layoutId, paletteId, customPaletteBase, customPalette, streetLabelsVisible])

  // Toggle street labels on style changes
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

  // Fly to geocoded location
  useEffect(() => {
    if (!pendingCenter || !mapRef.current) return
    mapRef.current.flyTo({ center: [pendingCenter.lng, pendingCenter.lat], zoom: pendingCenter.zoom })
    clearPendingCenterRef.current()
  }, [pendingCenter])

  // Handle zoom in/out from external controls
  useEffect(() => {
    if (!pendingZoomDelta || !mapRef.current) return
    if (pendingZoomDelta > 0) mapRef.current.zoomIn()
    else mapRef.current.zoomOut()
    clearZoomDeltaRef.current()
  }, [pendingZoomDelta])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

'use client'

import { useEffect, useRef } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import {
  useWeddingEditorStore,
  type SlotIndex,
} from '@/hooks/useWeddingEditorStore'
import type { ViewState } from '@/hooks/useEditorStore'
import { setMapInstance, weddingSliceFor } from '@/hooks/useMapInstance'
import { buildPetiteStyle } from '@/lib/petite-style-loader'

/**
 * Slot-aware MapTiler renderer — parallel implementation to MapPreviewInner
 * (single-map editor), but reads its inputs from a wedding slot instead of
 * `useEditorStore`. Kept as a separate component because the single-map
 * implementation is critical-path and we don't want to risk regressions by
 * abstracting it under a shared base in this chunk. Shared extraction is a
 * later refactor once both surfaces are stable.
 *
 * Each instance registers itself in the map registry under the `wedding-N`
 * slice so the export pipeline (Chunk 4) can grab the live MapTiler instances
 * for high-res rendering.
 */
export default function WeddingSlotMapInner({ index }: { index: SlotIndex }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maptilersdk.Map | null>(null)
  const lastStyleKeyRef = useRef<string | null>(null)

  const slot = useWeddingEditorStore((s) => s.slots[index])
  const setSlotViewState = useWeddingEditorStore((s) => s.setSlotViewState)
  const clearSlotPendingCenter = useWeddingEditorStore((s) => s.clearSlotPendingCenter)
  const clearSlotZoomDelta = useWeddingEditorStore((s) => s.clearSlotZoomDelta)

  const {
    styleId,
    paletteId,
    customPaletteBase,
    customPalette,
    streetLabelsVisible,
    pendingCenter,
    pendingZoomDelta,
    viewState,
  } = slot

  const setViewStateRef = useRef<(vs: ViewState) => void>(() => {})
  const clearPendingCenterRef = useRef<() => void>(() => {})
  const clearZoomDeltaRef = useRef<() => void>(() => {})
  const streetLabelsRef = useRef(streetLabelsVisible)

  useEffect(() => {
    setViewStateRef.current = (vs) => setSlotViewState(index, vs)
  }, [setSlotViewState, index])
  useEffect(() => {
    clearPendingCenterRef.current = () => clearSlotPendingCenter(index)
  }, [clearSlotPendingCenter, index])
  useEffect(() => {
    clearZoomDeltaRef.current = () => clearSlotZoomDelta(index)
  }, [clearSlotZoomDelta, index])
  useEffect(() => {
    streetLabelsRef.current = streetLabelsVisible
  }, [streetLabelsVisible])

  // Map lifecycle — only depends on slot index, not on per-frame state.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY
    if (!apiKey) {
      console.error('[WeddingSlotMap] NEXT_PUBLIC_MAPTILER_API_KEY not set')
      return
    }

    maptilersdk.config.apiKey = apiKey

    const initialStyle = {
      version: 8,
      sources: {},
      layers: [],
    } as unknown as maptilersdk.StyleSpecification

    // Read initial view from the store snapshot — avoids capturing a stale
    // `viewState` from the closure when the mount-effect runs once.
    const initial = useWeddingEditorStore.getState().slots[index].viewState

    const map = new maptilersdk.Map({
      container: containerRef.current,
      style: initialStyle,
      center: [initial.lng, initial.lat],
      zoom: initial.zoom,
      dragRotate: false,
      touchZoomRotate: true,
      hash: false,
      navigationControl: false,
      geolocateControl: false,
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

    map.on('load', () => {
      map.resize()
      emit()
      applyStreetLabels()
    })
    map.on('styledata', applyStreetLabels)
    map.on('moveend', emit)
    map.on('zoomend', emit)

    mapRef.current = map
    setMapInstance(weddingSliceFor(index), map)

    return () => {
      setMapInstance(weddingSliceFor(index), null)
      map.remove()
      mapRef.current = null
    }
  }, [index])

  // Apply layout + palette changes.
  useEffect(() => {
    const map = mapRef.current
    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY
    if (!map || !apiKey) return

    let cancelled = false

    ;(async () => {
      const key = `${styleId}|${paletteId}|${customPaletteBase ?? ''}|${JSON.stringify(customPalette ?? null)}|${streetLabelsVisible}`
      if (lastStyleKeyRef.current === key) return
      try {
        const style = await buildPetiteStyle({
          layoutId: styleId,
          paletteId,
          customPaletteBase,
          customPalette,
          streetLabelsVisible,
          apiKey,
        })
        if (cancelled) return
        map.setStyle(style as maptilersdk.StyleSpecification)
        lastStyleKeyRef.current = key
      } catch (err) {
        console.error('[WeddingSlotMap] buildPetiteStyle failed:', err)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [styleId, paletteId, customPaletteBase, customPalette, streetLabelsVisible])

  // Toggle street labels on style changes.
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

  // Apply pending camera (geocode result OR layout reset).
  useEffect(() => {
    if (!pendingCenter || !mapRef.current) return
    mapRef.current.jumpTo({
      center: [pendingCenter.lng, pendingCenter.lat],
      zoom: pendingCenter.zoom,
    })
    clearPendingCenterRef.current()
  }, [pendingCenter])

  // Handle zoom in/out from external controls.
  useEffect(() => {
    if (!pendingZoomDelta || !mapRef.current) return
    if (pendingZoomDelta > 0) mapRef.current.zoomIn()
    else mapRef.current.zoomOut()
    clearZoomDeltaRef.current()
  }, [pendingZoomDelta])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

'use client'

import { useEffect, useRef } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import { useEditorStore } from '@/hooks/useEditorStore'
import type { ViewState } from '@/hooks/useEditorStore'
import { setMapInstance } from '@/hooks/useMapInstance'
import { buildPetiteStyle, isPetiteStyle } from '@/lib/petite-style-loader'

function buildStyleUrl(mapId: string, key: string) {
  return `https://api.maptiler.com/maps/${mapId}/style.json?key=${encodeURIComponent(key)}`
}

interface MapPreviewInnerProps {
  storeSlice?: 'primary' | 'secondary'
}

export default function MapPreviewInner({ storeSlice = 'primary' }: MapPreviewInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maptilersdk.Map | null>(null)
  const lastStyleKeyRef = useRef<string | null>(null)

  const store = useEditorStore()

  const styleId = storeSlice === 'primary' ? store.styleId : store.secondMap.styleId
  const paletteId = store.paletteId
  const customPaletteBase = store.customPaletteBase
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
  useEffect(() => { setViewStateRef.current = setViewState }, [setViewState])
  useEffect(() => { clearPendingCenterRef.current = clearPendingCenter }, [clearPendingCenter])
  useEffect(() => { clearZoomDeltaRef.current = clearZoomDelta }, [clearZoomDelta])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY
    if (!apiKey) {
      console.error('[MapPreview] NEXT_PUBLIC_MAPTILER_API_KEY not set')
      return
    }

    maptilersdk.config.apiKey = apiKey

    // Initial style — URL for MapTiler-hosted styles, fallback JSON for petite-base
    const initialStyle: maptilersdk.StyleSpecification | string = isPetiteStyle(styleId)
      ? ({ version: 8, sources: {}, layers: [] } as unknown as maptilersdk.StyleSpecification)
      : buildStyleUrl(styleId, apiKey)

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

    map.on('load', () => { map.resize(); emit() })
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

  // Apply style changes (external styleId or palette/street settings for petite-base)
  useEffect(() => {
    const map = mapRef.current
    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY
    if (!map || !apiKey) return

    let cancelled = false

    ;(async () => {
      if (isPetiteStyle(styleId)) {
        const key = `petite|${paletteId}|${customPaletteBase ?? ''}|${streetLabelsVisible}`
        if (lastStyleKeyRef.current === key) return
        try {
          const style = await buildPetiteStyle({
            paletteId,
            customPaletteBase,
            streetLabelsVisible,
            apiKey,
          })
          if (cancelled) return
          map.setStyle(style as maptilersdk.StyleSpecification)
          lastStyleKeyRef.current = key
        } catch (err) {
          console.error('[MapPreview] buildPetiteStyle failed:', err)
        }
      } else {
        const styleUrl = buildStyleUrl(styleId, apiKey)
        if (lastStyleKeyRef.current === styleUrl) return
        lastStyleKeyRef.current = styleUrl
        map.setStyle(styleUrl)
      }
    })()

    return () => { cancelled = true }
  }, [styleId, paletteId, customPaletteBase, streetLabelsVisible])

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

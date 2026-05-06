'use client'

import { useEffect, useRef } from 'react'
import * as maptilersdk from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import { buildPetiteStyle } from '@/lib/petite-style-loader'
import type { MapPaletteColors } from '@/lib/map-palettes'

interface Props {
  colors: MapPaletteColors
}

// Berlin Mitte — picked because it has dense roads, water (Spree), labels,
// buildings and parks within a small frame, so the picked colours show up
// across most map roles at once.
const PREVIEW_CENTER: [number, number] = [13.405, 52.52]
const PREVIEW_ZOOM = 13.5
const DEFAULT_LAYOUT_ID = 'klassisch'

/**
 * Live map preview for the admin palette editor. Re-applies the in-progress
 * colours to a real MapTiler-rendered map every time the picker changes,
 * debounced so the colour wheel doesn't trigger a setStyle per pointer move.
 */
export function PalettePreviewMap({ colors }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maptilersdk.Map | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const colorsRef = useRef(colors)
  colorsRef.current = colors

  // Init map once.
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY
    if (!containerRef.current || mapRef.current || !apiKey) return

    maptilersdk.config.apiKey = apiKey

    const initialStyle = {
      version: 8,
      sources: {},
      layers: [],
    } as unknown as maptilersdk.StyleSpecification

    const map = new maptilersdk.Map({
      container: containerRef.current,
      style: initialStyle,
      center: PREVIEW_CENTER,
      zoom: PREVIEW_ZOOM,
      dragRotate: false,
      touchZoomRotate: false,
      hash: false,
      navigationControl: false,
      geolocateControl: false,
      attributionControl: false,
      interactive: false,
      language: maptilersdk.Language.AUTO,
    })

    mapRef.current = map

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Re-apply style on colour change, debounced.
  useEffect(() => {
    const map = mapRef.current
    const apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY
    if (!map || !apiKey) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const style = await buildPetiteStyle({
          layoutId: DEFAULT_LAYOUT_ID,
          paletteId: 'custom',
          customPaletteBase: null,
          customPalette: colorsRef.current,
          streetLabelsVisible: false,
          apiKey,
        })
        map.setStyle(style as maptilersdk.StyleSpecification)
      } catch (err) {
        console.error('[PalettePreviewMap] buildPetiteStyle failed:', err)
      }
    }, 200)
  }, [colors])

  if (!process.env.NEXT_PUBLIC_MAPTILER_API_KEY) {
    return (
      <div className="aspect-square w-full rounded-md border border-border bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">
        MapTiler-API-Key fehlt
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="aspect-square w-full rounded-md border border-border overflow-hidden bg-muted/40"
      aria-label="Karten-Vorschau mit gewählten Farben"
    />
  )
}

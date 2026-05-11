'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { useEditorStore } from '@/hooks/useEditorStore'
import { getFeaturedStyle, DEFAULT_FEATURED_STYLE_ID } from '@/lib/featured-styles'

interface CityApiResponse {
  cities: Array<{
    slug_base: string
    name: string
    country_code: string
    region: string | null
    latitude: number
    longitude: number
  }>
}

const CITY_RENDER_DEFAULT_ZOOM = 12

/**
 * PROJ-42: Customer-side URL-applier for `/[locale]/map?city=<slug_base>&style=<id>`.
 *
 * Mounted in /map/page.tsx alongside PresetUrlApplier. When a customer
 * lands here from a Stadt-Landing-Page CTA, this component:
 *   1. Fetches the city's geocode via /api/cities (filtered by slug_base)
 *   2. Looks up the chosen Featured-Style (layoutId + paletteId)
 *   3. Applies layout + palette + map-center + marker to useEditorStore
 *   4. Strips the query params so a reload does not re-apply
 *
 * If `style` is missing or invalid, the default Featured-Style is used.
 * If `city` cannot be resolved, a toast is shown and the editor falls
 * back to its default state.
 */
export function CityUrlApplier() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const appliedRef = useRef<string | null>(null)

  useEffect(() => {
    const cityParam = searchParams.get('city')
    if (!cityParam) return
    const styleParam = searchParams.get('style') ?? DEFAULT_FEATURED_STYLE_ID
    const key = `${cityParam}:${styleParam}`
    if (appliedRef.current === key) return
    appliedRef.current = key

    const style = getFeaturedStyle(styleParam) ?? getFeaturedStyle(DEFAULT_FEATURED_STYLE_ID)
    if (!style) {
      // Should never happen — DEFAULT_FEATURED_STYLE_ID is always valid.
      toast.error('Style konnte nicht geladen werden')
      return
    }

    fetch('/api/cities')
      .then((r) => r.json() as Promise<CityApiResponse>)
      .then((data) => {
        const city = (data.cities ?? []).find((c) => c.slug_base === cityParam)
        if (!city) {
          toast.error('Stadt konnte nicht geladen werden')
          return
        }

        // Apply layout + palette + map-center + marker in one batch update.
        // Title-textBlock auf Stadtnamen setzen, damit der Customer im Editor
        // sofort die Stadt im Title sieht (statt 'NEW YORK' aus dem
        // EDITOR_INITIAL_STATE). Der Customer kann den Title danach noch
        // editieren — wir setzen nur den Initial-Wert, nichts wird gelocked.
        useEditorStore.setState((state) => ({
          ...state,
          styleId: style.layoutId,
          paletteId: style.paletteId,
          customPalette: null,
          customPaletteBase: null,
          locationName: city.name,
          viewState: {
            ...state.viewState,
            lat: city.latitude,
            lng: city.longitude,
            zoom: CITY_RENDER_DEFAULT_ZOOM,
          },
          pendingCenter: {
            lng: city.longitude,
            lat: city.latitude,
            zoom: CITY_RENDER_DEFAULT_ZOOM,
          },
          marker: {
            ...state.marker,
            enabled: true,
            lat: city.latitude,
            lng: city.longitude,
          },
          textBlocks: state.textBlocks.map((tb) =>
            tb.id === 'block-title' || (!tb.isCoordinates && tb.id === state.textBlocks[0]?.id)
              ? { ...tb, text: city.name.toUpperCase() }
              : tb,
          ),
        }))

        toast.success(`${city.name} geladen`, { duration: 4000 })

        // Strip city/style params so a reload doesn't re-apply.
        const params = new URLSearchParams(searchParams.toString())
        params.delete('city')
        params.delete('style')
        const query = params.toString()
        router.replace(query ? `${pathname}?${query}` : pathname)
      })
      .catch(() => {
        toast.error('Stadt konnte nicht geladen werden')
      })
  }, [searchParams, router, pathname])

  return null
}

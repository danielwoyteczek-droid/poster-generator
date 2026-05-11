import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CityMapsHubPage } from '@/components/landing/CityMapsHubPage'
import { CITY_URL_SEGMENT } from '@/lib/city-routing'
import { buildHubMetadata, isLocale } from '@/lib/city-maps-hub-route'

export const revalidate = 3600

const SEGMENT = 'mapa-ciudad' as const

interface PageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const p = await params
  return buildHubMetadata(SEGMENT, p)
}

/**
 * `/mapa-ciudad/` — ES-Locale-Hub für Stadt-Karten-LPs (PROJ-44).
 */
export default async function MapaCiudadHubPage({ params }: PageProps) {
  const { locale } = await params
  if (!isLocale(locale) || CITY_URL_SEGMENT[locale] !== SEGMENT) notFound()
  return <CityMapsHubPage locale={locale} />
}

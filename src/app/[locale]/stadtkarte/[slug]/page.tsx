import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CityLandingPage } from '@/components/landing/CityLandingPage'
import { CITY_URL_SEGMENT } from '@/lib/city-routing'
import { buildCityPageMetadata, isLocale } from '@/lib/city-page-route'

export const revalidate = 3600

const SEGMENT = 'stadtkarte' as const

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
  searchParams: Promise<{ preview?: string }>
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [p, sp] = await Promise.all([params, searchParams])
  return buildCityPageMetadata(SEGMENT, p, sp)
}

/**
 * `/stadtkarte/[slug]` — DE-Locale-Route fuer Stadt-Landing-Pages (PROJ-42).
 */
export default async function StadtkartePage({ params, searchParams }: PageProps) {
  const [{ locale, slug }, sp] = await Promise.all([params, searchParams])
  if (!isLocale(locale) || CITY_URL_SEGMENT[locale] !== SEGMENT) notFound()
  return <CityLandingPage locale={locale} slug={slug} preview={sp.preview === '1'} />
}

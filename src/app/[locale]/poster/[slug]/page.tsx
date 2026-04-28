import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { OccasionLandingPage } from '@/components/landing/OccasionLandingPage'
import { generateOccasionPageMetadata } from '@/lib/occasion-page-metadata'
import { OCCASION_URL_SEGMENT } from '@/lib/occasion-routing'
import { locales, type Locale } from '@/i18n/config'

export const revalidate = 3600

const SEGMENT = 'poster' as const

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
  searchParams: Promise<{ preview?: string }>
}

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value)
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ locale, slug }, sp] = await Promise.all([params, searchParams])
  if (!isLocale(locale) || OCCASION_URL_SEGMENT[locale] !== SEGMENT) return {}
  return generateOccasionPageMetadata(locale, slug, sp.preview === '1')
}

/**
 * `/poster/[slug]` route — active for locales that use the singular URL
 * segment (DE, IT). Locales whose `OCCASION_URL_SEGMENT` is `posters` get
 * 404 here so the canonical URL stays unambiguous; they reach the same
 * page via the `/posters/[slug]` sibling route.
 */
export default async function PosterRoute({ params, searchParams }: PageProps) {
  const [{ locale, slug }, sp] = await Promise.all([params, searchParams])
  if (!isLocale(locale) || OCCASION_URL_SEGMENT[locale] !== SEGMENT) notFound()
  return <OccasionLandingPage locale={locale} slug={slug} preview={sp.preview === '1'} />
}

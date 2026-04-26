import { groq } from 'next-sanity'
import { sanityClient } from './client'
import { isConfigured } from './env'

export interface SanityImage {
  _type: 'image'
  asset: { _ref: string; _type: 'reference' }
  alt?: string
  caption?: string
  hotspot?: { x: number; y: number }
}

export interface LegalPage {
  _id: string
  title: string
  slug: { current: string }
  metaDescription?: string
  body: unknown[]
  updatedAt?: string
}

export interface BlogPost {
  _id: string
  title: string
  slug: { current: string }
  excerpt?: string
  coverImage?: SanityImage
  tags?: string[]
  publishedAt: string
  body: unknown[]
}

export interface FaqItem {
  _id: string
  question: string
  answer: unknown[]
  category?: string
  displayOrder?: number
}

export interface AboutPage {
  _id: string
  title: string
  metaDescription?: string
  heroImage?: SanityImage
  body: unknown[]
}

export interface SiteSettings {
  contactEmail?: string
  socialLinks?: Array<{ label: string; url: string }>
  footerNote?: string
}

export interface HomepageExample {
  image: SanityImage
  label?: string
  href?: string
}

export interface Homepage {
  _id: string
  language: string
  heroImageDesktop?: SanityImage
  heroImageMobile?: SanityImage
  examplesImages?: HomepageExample[]
}

export interface GalleryCategory {
  tag: string
  label: string
  subline?: string
  categoryImage?: SanityImage
}

export interface GalleryPage {
  _id: string
  language: string
  pageHeadline: string
  pageSubline?: string
  heroImage?: SanityImage
  categories?: GalleryCategory[]
}

async function safeFetch<T>(query: string, params?: Record<string, unknown>, fallback: T | null = null): Promise<T | null> {
  if (!isConfigured) return fallback
  try {
    return await sanityClient.fetch<T>(query, params ?? {})
  } catch (err) {
    console.error('[sanity] fetch failed:', err)
    return fallback
  }
}

// Locale-aware queries: prefer the requested locale, fall back to DE if no
// match exists yet (so partially-translated content still renders).
const LOCALE_FILTER = `(language == $locale || (!defined(language) && $locale == "de"))`

export const getLegalPage = (slug: string, locale: string = 'de') =>
  safeFetch<LegalPage>(
    groq`*[_type == "legalPage" && slug.current == $slug && ${LOCALE_FILTER}][0]{ _id, title, slug, metaDescription, body, updatedAt }`,
    { slug, locale },
  )

export const listLegalPages = (locale: string = 'de') =>
  safeFetch<LegalPage[]>(
    groq`*[_type == "legalPage" && ${LOCALE_FILTER}]{ _id, title, slug }`,
    { locale },
    [],
  )

export const listBlogPosts = (locale: string = 'de') =>
  safeFetch<BlogPost[]>(
    groq`*[_type == "blogPost" && ${LOCALE_FILTER}] | order(publishedAt desc){ _id, title, slug, excerpt, coverImage, tags, publishedAt }`,
    { locale },
    [],
  )

export const getBlogPost = (slug: string, locale: string = 'de') =>
  safeFetch<BlogPost>(
    groq`*[_type == "blogPost" && slug.current == $slug && ${LOCALE_FILTER}][0]{ _id, title, slug, excerpt, coverImage, tags, publishedAt, body }`,
    { slug, locale },
  )

export const listFaqItems = (locale: string = 'de') =>
  safeFetch<FaqItem[]>(
    groq`*[_type == "faqItem" && ${LOCALE_FILTER}] | order(coalesce(displayOrder, 0) asc, question asc){ _id, question, answer, category, displayOrder }`,
    { locale },
    [],
  )

export const getAboutPage = (locale: string = 'de') =>
  safeFetch<AboutPage>(
    groq`*[_type == "aboutPage" && ${LOCALE_FILTER}][0]{ _id, title, metaDescription, heroImage, body }`,
    { locale },
  )

export const getSiteSettings = () =>
  safeFetch<SiteSettings>(
    groq`*[_type == "siteSettings"][0]{ contactEmail, socialLinks, footerNote }`,
  )

/**
 * Liefert das Homepage-Dokument für die angefragte Locale, mit Per-Field-Fallback
 * auf das DE-Dokument: einzelne leere Felder werden vom DE-Default ergänzt, ohne
 * dass das ganze Dokument durchfällt. Wenn weder Locale-Doc noch DE-Doc
 * existieren, wird `null` zurückgegeben — der Caller muss dann auf hardcoded
 * Defaults aus `/public/` zurückfallen.
 */
export const getHomepage = async (locale: string = 'de'): Promise<Homepage | null> => {
  const projection = groq`{ _id, language, heroImageDesktop, heroImageMobile, examplesImages[]{ image, label, href } }`
  const requested = await safeFetch<Homepage>(
    groq`*[_type == "homepage" && language == $locale][0]${projection}`,
    { locale },
  )
  if (locale === 'de' || requested?.heroImageDesktop && requested?.heroImageMobile && (requested?.examplesImages?.length ?? 0) > 0) {
    return requested
  }
  const fallback = await safeFetch<Homepage>(
    groq`*[_type == "homepage" && language == "de"][0]${projection}`,
  )
  if (!fallback) return requested
  if (!requested) return fallback
  return {
    ...requested,
    heroImageDesktop: requested.heroImageDesktop ?? fallback.heroImageDesktop,
    heroImageMobile: requested.heroImageMobile ?? fallback.heroImageMobile,
    examplesImages:
      requested.examplesImages && requested.examplesImages.length > 0
        ? requested.examplesImages
        : fallback.examplesImages,
  }
}

/**
 * Liefert das Galerie-Seiten-Dokument fuer die angefragte Locale, mit
 * Per-Field-Fallback auf das DE-Dokument: einzelne leere Felder werden
 * vom DE-Default ergaenzt. Wenn weder Locale-Doc noch DE-Doc existieren,
 * wird `null` zurueckgegeben — der Caller zeigt dann die hardcoded
 * Default-Headline aus den i18n-Strings.
 *
 * Wichtig: `categories[]` faellt als ganzes Array zurueck, NICHT pro
 * Eintrag. Wenn Marketing fuer FR keine eigenen Sektionen pflegt, sieht
 * der franzoesische Besucher die DE-Sektionen mit DE-Headings — sprachlich
 * unsauber, aber besser als eine leere Galerie. Sobald Marketing die FR-
 * Sektionen pflegt, ueberschreibt das den Fallback komplett.
 */
export const getGalleryPage = async (locale: string = 'de'): Promise<GalleryPage | null> => {
  const projection = groq`{
    _id,
    language,
    pageHeadline,
    pageSubline,
    heroImage,
    categories[]{ tag, label, subline, categoryImage }
  }`
  const requested = await safeFetch<GalleryPage>(
    groq`*[_type == "galleryPage" && language == $locale][0]${projection}`,
    { locale },
  )
  if (locale === 'de') return requested
  if (
    requested?.pageHeadline &&
    requested?.heroImage &&
    requested?.categories &&
    requested.categories.length > 0
  ) {
    return requested
  }
  const fallback = await safeFetch<GalleryPage>(
    groq`*[_type == "galleryPage" && language == "de"][0]${projection}`,
  )
  if (!fallback) return requested
  if (!requested) return fallback
  return {
    ...requested,
    pageHeadline: requested.pageHeadline || fallback.pageHeadline,
    pageSubline: requested.pageSubline ?? fallback.pageSubline,
    heroImage: requested.heroImage ?? fallback.heroImage,
    categories:
      requested.categories && requested.categories.length > 0
        ? requested.categories
        : fallback.categories,
  }
}

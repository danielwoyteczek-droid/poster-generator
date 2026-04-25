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

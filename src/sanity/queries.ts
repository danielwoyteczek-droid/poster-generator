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

export const getLegalPage = (slug: string) =>
  safeFetch<LegalPage>(
    groq`*[_type == "legalPage" && slug.current == $slug][0]{ _id, title, slug, metaDescription, body, updatedAt }`,
    { slug },
  )

export const listLegalPages = () =>
  safeFetch<LegalPage[]>(
    groq`*[_type == "legalPage"]{ _id, title, slug }`,
    {},
    [],
  )

export const listBlogPosts = () =>
  safeFetch<BlogPost[]>(
    groq`*[_type == "blogPost"] | order(publishedAt desc){ _id, title, slug, excerpt, coverImage, tags, publishedAt }`,
    {},
    [],
  )

export const getBlogPost = (slug: string) =>
  safeFetch<BlogPost>(
    groq`*[_type == "blogPost" && slug.current == $slug][0]{ _id, title, slug, excerpt, coverImage, tags, publishedAt, body }`,
    { slug },
  )

export const listFaqItems = () =>
  safeFetch<FaqItem[]>(
    groq`*[_type == "faqItem"] | order(coalesce(displayOrder, 0) asc, question asc){ _id, question, answer, category, displayOrder }`,
    {},
    [],
  )

export const getAboutPage = () =>
  safeFetch<AboutPage>(
    groq`*[_type == "aboutPage"][0]{ _id, title, metaDescription, heroImage, body }`,
  )

export const getSiteSettings = () =>
  safeFetch<SiteSettings>(
    groq`*[_type == "siteSettings"][0]{ contactEmail, socialLinks, footerNote }`,
  )

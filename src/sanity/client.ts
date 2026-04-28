import { createClient } from 'next-sanity'
import imageUrlBuilder from '@sanity/image-url'
import { apiVersion, dataset, projectId } from './env'

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: 'published',
})

/**
 * Draft-aware client for preview mode (PROJ-29). Uses the write token to read
 * `drafts.*` documents in addition to published ones. Pages opt into this via
 * `?preview=1` — the regular published-only client stays the default.
 */
export const sanityPreviewClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  perspective: 'drafts',
  token: process.env.SANITY_API_WRITE_TOKEN,
})

const builder = imageUrlBuilder({ projectId, dataset })

type SanityImageSource = Parameters<ReturnType<typeof imageUrlBuilder>['image']>[0]

export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}

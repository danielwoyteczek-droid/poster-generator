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

const builder = imageUrlBuilder({ projectId, dataset })

type SanityImageSource = Parameters<ReturnType<typeof imageUrlBuilder>['image']>[0]

export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}

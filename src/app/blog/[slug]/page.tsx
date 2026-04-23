import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { PortableTextRenderer } from '@/components/sanity/PortableTextRenderer'
import { getBlogPost } from '@/sanity/queries'
import { urlFor } from '@/sanity/client'

export const revalidate = 60

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPost(slug)
  if (!post) return { title: 'Artikel nicht gefunden' }
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      images: post.coverImage
        ? [{ url: urlFor(post.coverImage).width(1200).height(630).auto('format').url() }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getBlogPost(slug)
  if (!post) notFound()

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-white">
      <LandingNav />
      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-6 py-12">
          <p className="text-sm text-gray-400 mb-2">
            {new Date(post.publishedAt).toLocaleDateString('de-DE', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}
          </p>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
          {post.excerpt && <p className="text-lg text-gray-600 mb-8">{post.excerpt}</p>}
          {post.coverImage && (
            <div className="aspect-[16/9] relative rounded-lg overflow-hidden bg-gray-100 mb-10">
              <Image
                src={urlFor(post.coverImage).width(1400).auto('format').url()}
                alt={post.coverImage.alt ?? post.title}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 800px"
              />
            </div>
          )}
          <div className="prose prose-gray max-w-none">
            <PortableTextRenderer value={post.body} />
          </div>
          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="text-xs text-gray-600 bg-gray-100 rounded-full px-3 py-1">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
      <LandingFooter />
    </div>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getLocale, getTranslations } from 'next-intl/server'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { listBlogPosts } from '@/sanity/queries'
import { urlFor } from '@/sanity/client'

export const revalidate = 60

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('blog')
  return {
    title: t('title'),
    description: t('metaDescription'),
  }
}

export default async function BlogIndexPage() {
  const t = await getTranslations('blog')
  const locale = await getLocale()
  const dateLocale = ({ de: 'de-DE', en: 'en-US', fr: 'fr-FR', it: 'it-IT', es: 'es-ES' } as const)[locale as 'de' | 'en' | 'fr' | 'it' | 'es'] ?? 'de-DE'
  const posts = (await listBlogPosts()) ?? []

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-white">
      <LandingNav />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">{t('title')}</h1>
          <p className="text-muted-foreground mb-10">{t('subtitle')}</p>

          {posts.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-sm">
              {t('empty')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <Link key={post._id} href={`/blog/${post.slug.current}`} className="group">
                  <article className="space-y-3">
                    {post.coverImage ? (
                      <div className="aspect-[4/3] relative rounded-lg overflow-hidden bg-muted">
                        <Image
                          src={urlFor(post.coverImage).width(800).auto('format').url()}
                          alt={post.coverImage.alt ?? post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[4/3] rounded-lg bg-muted" />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground/70">
                        {new Date(post.publishedAt).toLocaleDateString(dateLocale, {
                          day: '2-digit', month: 'long', year: 'numeric',
                        })}
                      </p>
                      <h2 className="text-lg font-semibold text-foreground mt-1 group-hover:text-foreground/70">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{post.excerpt}</p>
                      )}
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}

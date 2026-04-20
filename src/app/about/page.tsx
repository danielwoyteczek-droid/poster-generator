import type { Metadata } from 'next'
import Image from 'next/image'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { PortableTextRenderer } from '@/components/sanity/PortableTextRenderer'
import { getAboutPage } from '@/sanity/queries'
import { urlFor } from '@/sanity/client'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getAboutPage()
  return {
    title: page?.title ?? 'Über uns',
    description: page?.metaDescription,
  }
}

export default async function AboutPage() {
  const page = await getAboutPage()

  return (
    <div className="min-h-screen flex flex-col pt-14 bg-white">
      <LandingNav />
      <main className="flex-1">
        {page?.heroImage && (
          <div className="relative w-full aspect-[16/7] bg-gray-100">
            <Image
              src={urlFor(page.heroImage).width(1920).auto('format').url()}
              alt={page.heroImage.alt ?? page.title}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
          </div>
        )}
        <div className="max-w-3xl mx-auto px-6 py-12">
          {page ? (
            <>
              <h1 className="text-4xl font-bold text-gray-900 mb-6">{page.title}</h1>
              <article className="prose prose-gray max-w-none">
                <PortableTextRenderer value={page.body} />
              </article>
            </>
          ) : (
            <div className="text-center py-20">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">About-Seite noch nicht befüllt</h1>
              <p className="text-gray-500 text-sm">
                Die About-Seite muss im Sanity Studio angelegt werden.
              </p>
            </div>
          )}
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}

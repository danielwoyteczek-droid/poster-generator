import type { Metadata } from 'next'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { FaqList } from '@/components/sanity/FaqList'
import { listFaqItems } from '@/sanity/queries'
import { toPlainText } from '@portabletext/react'

export const metadata: Metadata = {
  title: 'FAQ – Häufig gestellte Fragen',
  description: 'Antworten auf häufige Fragen rund um unsere Karten- und Sternenposter.',
}

export default async function FaqPage() {
  const items = (await listFaqItems()) ?? []

  // Schema.org FAQPage for rich snippets / AI search
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: toPlainText(item.answer as Parameters<typeof toPlainText>[0]) || '',
      },
    })),
  }

  return (
    <div className="min-h-screen flex flex-col pt-14 bg-white">
      <LandingNav />
      {items.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Häufige Fragen</h1>
          <p className="text-gray-500 mb-10">
            Wenn deine Frage hier nicht auftaucht, schreib uns einfach.
          </p>
          <FaqList items={items} />
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}

import type { OccasionFaqEntry } from '@/sanity/queries'

interface Props {
  entries: OccasionFaqEntry[]
}

/**
 * FAQ block: native <details>/<summary> accordion (keyboard-accessible by
 * default, no client JS) plus Schema.org FAQPage JSON-LD for Google Rich
 * Results. Section is omitted entirely when there are no FAQ entries.
 */
export function OccasionFaq({ entries }: Props) {
  if (!entries || entries.length === 0) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer,
      },
    })),
  }

  return (
    <section className="py-12 sm:py-16 border-t border-border">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-8 text-center">
          Häufige Fragen
        </h2>
        <ul className="space-y-3">
          {entries.map((entry, idx) => (
            <li key={idx}>
              <details className="group rounded-lg border border-border bg-white open:shadow-sm">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 py-4 text-base font-medium text-foreground">
                  <span>{entry.question}</span>
                  <span className="text-muted-foreground transition-transform group-open:rotate-45 text-xl leading-none select-none" aria-hidden>
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5 text-foreground/70 leading-relaxed whitespace-pre-line">
                  {entry.answer}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  )
}

import { PortableTextRenderer } from '@/components/sanity/PortableTextRenderer'
import type { CityBodySection } from '@/sanity/queries'

interface Props {
  sections: CityBodySection[]
}

/**
 * PROJ-42: Stadt-Body-Sektionen. Pro Sektion ein H2 + Portable-Text-Body.
 * Marketing pflegt 1-4 Sektionen, Zielwortmenge ~200-300 Woerter total.
 */
export function CityBody({ sections }: Props) {
  if (!sections || sections.length === 0) return null
  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-12">
        {sections.map((section, idx) => (
          <article key={idx}>
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-4">
              {section.heading}
            </h2>
            <div className="prose prose-gray max-w-none">
              <PortableTextRenderer value={section.body} />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

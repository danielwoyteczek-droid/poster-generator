interface Props {
  paragraphs: string[]
}

/**
 * PROJ-44: Hub-Intro — kurzer redaktioneller Prose-Block (~150 Woerter)
 * mit den SEO-Keywords im Body. Server-Component, kein Markup-Spezial.
 */
export function HubIntro({ paragraphs }: Props) {
  if (!paragraphs || paragraphs.length === 0) return null
  return (
    <section className="py-10 sm:py-14">
      <div className="max-w-3xl mx-auto px-6 sm:px-6 space-y-4">
        {paragraphs.map((p, idx) => (
          <p key={idx} className="text-base sm:text-lg leading-relaxed text-foreground/90">
            {p}
          </p>
        ))}
      </div>
    </section>
  )
}

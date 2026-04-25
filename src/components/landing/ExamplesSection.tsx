import Image from 'next/image'
import Link from 'next/link'

const EXAMPLES = [
  { label: 'Stadtposter', src: '/example-1.webp', href: '/map' },
  { label: 'Sternenposter', src: '/example-2.webp', href: '/star-map' },
]

export function ExamplesSection() {
  return (
    <section id="examples" className="py-24 bg-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Echte Beispiele
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
            So könnten deine Poster aussehen.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {EXAMPLES.map((ex) => (
            <Link
              key={ex.src}
              href={ex.href}
              className="flex flex-col items-center gap-3 group"
            >
              <div
                className="w-full relative bg-muted rounded-xl overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow"
                style={{ aspectRatio: '2/3' }}
              >
                <Image
                  src={ex.src}
                  alt={ex.label}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <p className="text-sm font-medium text-foreground/70 group-hover:text-foreground transition-colors">
                {ex.label}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

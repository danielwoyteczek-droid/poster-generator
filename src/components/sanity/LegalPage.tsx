import { LandingNav } from '@/components/landing/LandingNav'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { PortableTextRenderer } from './PortableTextRenderer'
import type { LegalPage } from '@/sanity/queries'

interface Props {
  page: LegalPage | null
  slug: string
}

export function LegalPageView({ page, slug }: Props) {
  return (
    <div className="min-h-screen flex flex-col pt-16 bg-white">
      <LandingNav />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-12">
          {page ? (
            <>
              <h1 className="text-3xl font-bold text-foreground mb-2">{page.title}</h1>
              {page.updatedAt && (
                <p className="text-sm text-muted-foreground mb-8">
                  Stand: {new Date(page.updatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              )}
              <article className="prose prose-gray max-w-none">
                <PortableTextRenderer value={page.body} />
              </article>
            </>
          ) : (
            <div className="text-center py-20">
              <h1 className="text-2xl font-semibold text-foreground mb-2">Seite noch nicht befüllt</h1>
              <p className="text-muted-foreground text-sm">
                Die Seite <code className="bg-muted px-1.5 py-0.5 rounded">{slug}</code> muss im Sanity Studio angelegt werden.
              </p>
            </div>
          )}
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}

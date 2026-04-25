import { LandingNav } from '@/components/landing/LandingNav'
import { LandingFooter } from '@/components/landing/LandingFooter'

interface Props {
  title: string
  updatedAt?: string
  children: React.ReactNode
}

/**
 * Shared layout for hardcoded legal pages — provides nav, footer,
 * styled content area consistent with Sanity-backed content pages.
 */
export function LegalLayout({ title, updatedAt, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col pt-16 bg-white">
      <LandingNav />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
          {updatedAt && (
            <p className="text-sm text-muted-foreground mb-8">Stand: {updatedAt}</p>
          )}
          <article className="prose prose-gray max-w-none
            prose-headings:font-semibold prose-headings:text-foreground
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-3
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-2
            prose-p:text-foreground/70 prose-p:leading-relaxed
            prose-a:text-blue-600 prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-blue-800
            prose-strong:font-semibold prose-strong:text-foreground
            prose-ul:list-disc prose-ul:pl-6 prose-ul:text-foreground/70
            prose-li:leading-relaxed
          ">
            {children}
          </article>
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}

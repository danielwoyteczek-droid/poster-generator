import type { Metadata } from 'next'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { LandingNav } from '@/components/landing/LandingNav'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { PortableTextRenderer } from '@/components/sanity/PortableTextRenderer'
import { getAboutPage } from '@/sanity/queries'
import { urlFor } from '@/sanity/client'

export const revalidate = 60

/**
 * Team is hard-coded here intentionally: names are proper nouns (not
 * translated), and role labels are pulled from `about.team.roles.*` so
 * they localize automatically per locale.
 */
const team = [
  { name: 'Léa', roleKey: 'founder', image: '/staff/staff_founder.jpg' },
  { name: 'Sophie', roleKey: 'designer', image: '/staff/staff_designerin.jpg' },
  { name: 'Tom', roleKey: 'technician', image: '/staff/staff_technician.jpg' },
  { name: 'Nora', roleKey: 'customerService', image: '/staff/staff_cusotmer_service.jpg' },
] as const

export async function generateMetadata(): Promise<Metadata> {
  const page = await getAboutPage()
  return {
    title: page?.title ?? 'Über uns',
    description: page?.metaDescription,
  }
}

export default async function AboutPage() {
  const [page, t] = await Promise.all([getAboutPage(), getTranslations('about.team')])

  return (
    <div className="min-h-screen flex flex-col pt-16 bg-white">
      <LandingNav />
      <main className="flex-1">
        {page?.heroImage && (
          <div className="relative w-full aspect-[16/7] bg-muted">
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
              <h1 className="text-4xl font-bold text-foreground mb-6">{page.title}</h1>
              <article className="prose prose-gray max-w-none">
                <PortableTextRenderer value={page.body} />
              </article>
            </>
          ) : (
            <div className="text-center py-20">
              <h1 className="text-2xl font-semibold text-foreground mb-2">About-Seite noch nicht befüllt</h1>
              <p className="text-muted-foreground text-sm">
                Die About-Seite muss im Sanity Studio angelegt werden.
              </p>
            </div>
          )}
        </div>

        <section className="border-t border-border bg-muted/30">
          <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground text-center mb-3">
              {t('heading')}
            </h2>
            <p className="text-muted-foreground text-center max-w-xl mx-auto mb-12">
              {t('subheading')}
            </p>
            <ul className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {team.map((member) => (
                <li key={member.image} className="flex flex-col">
                  <div className="relative w-full aspect-[3/4] overflow-hidden rounded-xl bg-muted">
                    <Image
                      src={member.image}
                      alt={`${member.name} – ${t(`roles.${member.roleKey}`)}`}
                      fill
                      className="object-cover"
                      sizes="(min-width: 1024px) 280px, 50vw"
                    />
                  </div>
                  <div className="mt-4">
                    <p className="text-base md:text-lg font-medium text-foreground">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{t(`roles.${member.roleKey}`)}</p>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {t(`bios.${member.roleKey}`)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}

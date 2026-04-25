import Image from 'next/image'
import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { getHomepage } from '@/sanity/queries'
import { urlFor } from '@/sanity/client'

const FALLBACK_DESKTOP = '/hero-desktop.webp'
const FALLBACK_MOBILE = '/hero-mobile.webp'

export async function HeroSection() {
  const t = await getTranslations('hero')
  const locale = await getLocale().catch(() => 'de')
  const homepage = await getHomepage(locale)

  const desktopSrc = homepage?.heroImageDesktop
    ? urlFor(homepage.heroImageDesktop).width(2000).format('webp').url()
    : FALLBACK_DESKTOP
  const mobileSrc = homepage?.heroImageMobile
    ? urlFor(homepage.heroImageMobile).width(900).format('webp').url()
    : homepage?.heroImageDesktop
      ? urlFor(homepage.heroImageDesktop).width(900).format('webp').url()
      : FALLBACK_MOBILE
  const desktopAlt = homepage?.heroImageDesktop?.alt ?? 'Poster Generator Hero'
  const mobileAlt = homepage?.heroImageMobile?.alt ?? desktopAlt

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background images */}
      <Image
        src={desktopSrc}
        alt={desktopAlt}
        fill
        className="object-cover hidden md:block"
        priority
      />
      <Image
        src={mobileSrc}
        alt={mobileAlt}
        fill
        className="object-cover md:hidden"
        priority
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div className="relative z-10 text-center text-white px-4 max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
          {t('titleLine1')}<br />{t('titleLine2')}
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-xl mx-auto leading-relaxed">
          {t('subtitle')}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" className="bg-white text-foreground hover:bg-muted text-base px-8" asChild>
            <Link href="/map">
              {t('ctaCreate')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/60 text-white hover:bg-white/10 text-base px-8 bg-transparent"
            asChild
          >
            <a href="#examples">{t('ctaExamples')}</a>
          </Button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/50">
        <div className="w-px h-8 bg-white/30 animate-pulse" />
      </div>
    </section>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles, Printer, Store, FileImage } from 'lucide-react'
import { LandingNav } from '@/components/landing/LandingNav'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'B2B & Pro · Petite-Moment',
  description:
    'Posters fuer Druckereien, Copyshops und Etsy-Kreatoren. Monatliches Abo mit Credits, Commercial License inklusive.',
}

/**
 * PROJ-50: /[locale]/business — kurze Pitch-Page als Vorgriff auf den
 * vollen Marketing-Funnel (PROJ-51). Stellt das B2B-Modell vor und leitet
 * zur Tier-Auswahl unter /business/upgrade.
 */
export default async function BusinessPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  return (
    <div className="min-h-screen flex flex-col pt-16">
      <LandingNav />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-muted/40 to-background py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary mb-4">
              <Sparkles className="w-4 h-4" />
              Petite-Moment Pro
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Posters in deinem Shop, ohne Designaufwand.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Monatliches Abo mit inkludierten Designs. Commercial License
              eingeschlossen — perfekt fuer Etsy-Kreatoren und Copyshops, die
              Karten- und Foto-Poster anbieten.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg">
                <Link href={`/${locale}/business/upgrade`}>
                  Pricing ansehen
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={`/${locale}/business/upgrade`}>
                  7-Tage-Trial starten
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Wer profitiert davon */}
        <section className="py-16">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-2xl font-semibold text-center mb-10">Fuer wen ist das?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <PersonaCard
                icon={<Store className="w-6 h-6" />}
                title="Etsy-Kreatoren"
                description="Du verkaufst personalisierte Karten- oder Foto-Poster auf Etsy. Statt jedes Design einzeln in Illustrator zu bauen, generierst du sie in Sekunden hier — mit Commercial License zum sofortigen Weiterverkauf."
              />
              <PersonaCard
                icon={<Printer className="w-6 h-6" />}
                title="Druckereien & Copyshops"
                description="Biete deinen Laufkundinnen und Laufkunden personalisierte Poster als Zusatzservice an, ohne eigene Software entwickeln zu muessen. Dein Team kann jedes Format direkt im Browser drucken."
              />
            </div>
          </div>
        </section>

        {/* Was bekommst du */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-2xl font-semibold text-center mb-10">Was im Abo enthalten ist</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <Feature
                icon={<FileImage className="w-5 h-5" />}
                title="Bis 300 Designs pro Monat"
                description="Tier-abhaengig (Starter / Pro / Business). Re-Downloads desselben Projekts sind immer gratis."
              />
              <Feature
                icon={<Sparkles className="w-5 h-5" />}
                title="Watermark-frei"
                description="Alle Exporte in voller Aufloesung, ohne Branding-Layer. Perfekt fuer Druck."
              />
              <Feature
                icon={<Printer className="w-5 h-5" />}
                title="Commercial License"
                description="Du darfst Exporte kommerziell weiterverkaufen (z.B. auf Etsy als Sofort-Download)."
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-2xl font-semibold mb-4">7 Tage kostenlos testen</h2>
            <p className="text-muted-foreground mb-6">
              Kreditkarte zum Sign-up noetig, aber innerhalb 7 Tagen jederzeit kuendbar.
              Nach dem Trial automatischer Convert in den gewaehlten Plan.
            </p>
            <Button asChild size="lg">
              <Link href={`/${locale}/business/upgrade`}>Tier auswaehlen</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}

function PersonaCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="space-y-2">
      <div className="text-primary">{icon}</div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

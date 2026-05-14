import type { Metadata } from 'next'
import { Sparkles, Printer, Store, FileImage } from 'lucide-react'
import { LandingNav } from '@/components/landing/LandingNav'
import { Button } from '@/components/ui/button'
import { UpgradeView } from '@/components/business/UpgradeView'

export const metadata: Metadata = {
  title: 'B2B & Pro · Petite-Moment',
  description:
    'Posters fuer Druckereien, Copyshops und Etsy-Kreatoren. Monatliches Abo mit Credits, Commercial License inklusive.',
}

/**
 * PROJ-50: /[locale]/business — kombinierte Pitch + Pricing-Page.
 * Hero, Personas, Features oben — Tier-Picker mit Stripe-Checkout direkt
 * darunter. Keine Separation zu /business/upgrade (das ist nur noch ein
 * Server-Redirect auf #pricing).
 */
export default function BusinessPage() {
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
                <a href="#pricing">Pricing ansehen</a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#pricing">7-Tage-Trial starten</a>
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

        {/* Pricing — der eigentliche Funnel-Endpunkt */}
        <section id="pricing" className="py-16 bg-muted scroll-mt-20">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-foreground mb-3">
                Waehle deinen Pro-Plan
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Alle Plans inklusive Commercial License, Watermark-frei, 7-Tage-Trial.
                Monatlich kuendbar — keine Mindestlaufzeit.
              </p>
            </div>
            <UpgradeView />
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

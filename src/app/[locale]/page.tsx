import type { Metadata } from 'next'
import { LandingNav } from '@/components/landing/LandingNav'
import { HeroSection } from '@/components/landing/HeroSection'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { ExamplesSection } from '@/components/landing/ExamplesSection'
import { PricingSection } from '@/components/landing/PricingSection'
import { LandingFooter } from '@/components/landing/LandingFooter'

export const metadata: Metadata = {
  title: 'Poster Generator — Dein Lieblingsort als Poster',
  description: 'Erstelle individuelle Kartenposter von jedem Ort der Welt. Wähle Kartenausschnitt, füge Text hinzu und bestelle als Druck oder Download.',
  openGraph: {
    title: 'Poster Generator — Dein Lieblingsort als Poster',
    description: 'Individuelle Kartenposter in wenigen Minuten erstellen.',
    type: 'website',
  },
}

export default function HomePage() {
  return (
    <>
      <LandingNav />
      <main className="pt-16">
        <HeroSection />
        <FeaturesSection />
        <ExamplesSection />
        <PricingSection />
      </main>
      <LandingFooter />
    </>
  )
}

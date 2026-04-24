import { Cormorant_Garamond, Inter, Fraunces, DM_Sans } from 'next/font/google'
import Image from 'next/image'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-fraunces',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-dm-sans',
})

export const metadata = { title: 'Design Preview – Font Pairings' }

function MockupContent({
  headlineClass,
  bodyClass,
}: {
  headlineClass: string
  bodyClass: string
}) {
  return (
    <div className={bodyClass}>
      {/* Fake Navigation */}
      <nav className="flex items-center justify-between border-b border-stone-300/60 pb-4 mb-10">
        <Image
          src="/brand/logo_1200x300.svg"
          alt="petite-moment"
          width={160}
          height={40}
          className="h-9 w-auto"
        />
        <div className="hidden md:flex gap-7 text-sm text-stone-700">
          <span>Editor</span>
          <span>Beispiele</span>
          <span>Preise</span>
          <span>Blog</span>
        </div>
        <button className="rounded-full bg-stone-900 text-white text-sm px-5 py-2">
          Jetzt gestalten
        </button>
      </nav>

      {/* Kicker */}
      <div className="mb-4 text-xs tracking-[0.18em] uppercase text-stone-500">
        Kartenposter aus München
      </div>

      {/* Headline */}
      <h1
        className={`${headlineClass} text-5xl md:text-6xl leading-[1.05] text-stone-900 mb-5`}
      >
        Ein Moment,<br />
        der für immer bleibt.
      </h1>

      {/* Lead */}
      <p className="text-lg text-stone-600 max-w-xl mb-8 leading-relaxed">
        Gestalte ein personalisiertes Kartenposter deines Lieblingsortes —
        suche eine Adresse, wähle Stil und Format, ergänze deinen Text.
        Wir drucken es in Deutschland für dich.
      </p>

      {/* CTAs */}
      <div className="flex gap-3 mb-14">
        <button className="rounded-full bg-stone-900 text-white px-6 py-3 font-medium">
          Poster gestalten
        </button>
        <button className="rounded-full border border-stone-300 px-6 py-3 font-medium text-stone-800">
          Beispiele ansehen
        </button>
      </div>

      {/* Section label */}
      <div className="mb-3 text-xs tracking-[0.18em] uppercase text-stone-500">
        So funktioniert&apos;s
      </div>

      {/* Subheadline */}
      <h2 className={`${headlineClass} text-3xl text-stone-900 mb-4`}>
        In drei Schritten zu deinem Poster
      </h2>

      {/* Body paragraph */}
      <p className="text-base text-stone-700 max-w-xl mb-10 leading-[1.7]">
        Ob Heimatstadt, Hochzeitsort oder erster gemeinsamer Urlaub —
        wähle einen Ort, der zählt, und verwandle ihn in ein einzigartiges
        Wandbild. Kein Designerwissen nötig, dafür volle Kontrolle über
        Stil, Format und Text.
      </p>

      {/* Card example */}
      <div className="rounded-2xl border border-stone-300/70 bg-stone-50/60 p-6 max-w-md">
        <div className="mb-2 text-xs tracking-[0.18em] uppercase text-stone-500">
          Beispiel
        </div>
        <h3 className={`${headlineClass} text-2xl text-stone-900 mb-2`}>
          Unser Hochzeitstag
        </h3>
        <p className="text-sm text-stone-600 mb-4">
          München, 14. Juni 2024 · Din A2, Hochformat
        </p>
        <div className="text-xs text-stone-500">
          48,2° N · 11,5° O
        </div>
      </div>
    </div>
  )
}

export default function DesignPreviewPage() {
  return (
    <main
      className={`${cormorant.variable} ${inter.variable} ${fraunces.variable} ${dmSans.variable} min-h-screen bg-[#FAF6F1]`}
    >
      {/* Header */}
      <div className="border-b border-stone-300/60 bg-white/60 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-stone-500">
            Design Preview · Font-Pairing-Vergleich
          </div>
          <div className="text-xs text-stone-400">
            Hintergrund: Cream #FAF6F1 (neutral, nur zur Vorschau)
          </div>
        </div>
      </div>

      {/* Side by side */}
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-300/60">
        {/* LEFT: Cormorant + Inter */}
        <section className="p-10 md:p-14">
          <div className="mb-8 pb-4 border-b border-stone-300/60">
            <div className="text-xs tracking-[0.18em] uppercase text-stone-500 mb-1">
              Pairing 1
            </div>
            <div
              className="text-xl text-stone-900"
              style={{ fontFamily: 'var(--font-cormorant)' }}
            >
              Cormorant Garamond <span className="text-stone-500">+ Inter</span>
            </div>
          </div>
          <MockupContent
            headlineClass="font-[family-name:var(--font-cormorant)] font-medium"
            bodyClass="font-[family-name:var(--font-inter)]"
          />
        </section>

        {/* RIGHT: Fraunces + DM Sans */}
        <section className="p-10 md:p-14">
          <div className="mb-8 pb-4 border-b border-stone-300/60">
            <div className="text-xs tracking-[0.18em] uppercase text-stone-500 mb-1">
              Pairing 2
            </div>
            <div
              className="text-xl text-stone-900"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              Fraunces <span className="text-stone-500">+ DM Sans</span>
            </div>
          </div>
          <MockupContent
            headlineClass="font-[family-name:var(--font-fraunces)] font-medium"
            bodyClass="font-[family-name:var(--font-dm-sans)]"
          />
        </section>
      </div>

      {/* Footer note */}
      <div className="max-w-7xl mx-auto px-6 py-10 text-center text-xs text-stone-500">
        Zum Vergleich: Beide Seiten nutzen identischen Content, identische Größen
        und identische Farben — unterschiedlich ist nur die Typografie.
      </div>
    </main>
  )
}

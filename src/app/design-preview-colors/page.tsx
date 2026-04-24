import { Cormorant_Garamond, Inter } from 'next/font/google'
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

export const metadata = { title: 'Design Preview – Farbpaletten' }

type Palette = {
  id: string
  name: string
  mood: string
  bg: string
  surface: string
  primary: string
  primaryFg: string
  accent: string
  text: string
  muted: string
  border: string
}

const palettes: Palette[] = [
  {
    id: 'warm',
    name: 'Warm-Romantisch',
    mood: 'Terracotta · Creme · Gold — französisches Boutique-Gefühl',
    bg: '#FAF6F1',
    surface: '#FFFFFF',
    primary: '#C26B4D',
    primaryFg: '#FFFFFF',
    accent: '#B8935A',
    text: '#2D221C',
    muted: '#8A7A6E',
    border: '#E5DCCE',
  },
  {
    id: 'sage',
    name: 'Frisch-Boutique',
    mood: 'Salbeigrün · Off-White · Pfirsich — modern-wellness',
    bg: '#F8F7F4',
    surface: '#FFFFFF',
    primary: '#6B8E7F',
    primaryFg: '#FFFFFF',
    accent: '#E8A47C',
    text: '#1F2B26',
    muted: '#7A8883',
    border: '#DDE3DF',
  },
  {
    id: 'petrol',
    name: 'Zeitlos-Minimalistisch',
    mood: 'Tiefpetrol · Weiß · warmes Grau — editorial, ruhig',
    bg: '#FFFFFF',
    surface: '#F8F7F3',
    primary: '#1F3A44',
    primaryFg: '#FFFFFF',
    accent: '#A89B8C',
    text: '#0F1E23',
    muted: '#6B7680',
    border: '#E8E5E0',
  },
]

function Swatch({ label, color, textDark = false }: { label: string; color: string; textDark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-full border border-black/10 shrink-0"
        style={{ backgroundColor: color }}
      />
      <div className="text-xs leading-tight">
        <div className={textDark ? 'text-stone-900' : 'opacity-90'}>{label}</div>
        <div className={textDark ? 'text-stone-500 font-mono' : 'opacity-60 font-mono'}>
          {color}
        </div>
      </div>
    </div>
  )
}

function PalettePreview({ p }: { p: Palette }) {
  return (
    <section
      className="py-16 md:py-20 px-6 md:px-12"
      style={{ backgroundColor: p.bg, color: p.text }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Palette header */}
        <div
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-8 mb-10 border-b"
          style={{ borderColor: p.border }}
        >
          <div>
            <div
              className="text-xs tracking-[0.18em] uppercase mb-2"
              style={{ color: p.muted }}
            >
              Palette · {p.id}
            </div>
            <h2
              className="text-3xl md:text-4xl"
              style={{ fontFamily: 'var(--font-cormorant)', fontWeight: 500 }}
            >
              {p.name}
            </h2>
            <p className="text-sm mt-2" style={{ color: p.muted }}>
              {p.mood}
            </p>
          </div>

          {/* Swatches */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Swatch label="Background" color={p.bg} textDark />
            <Swatch label="Primary" color={p.primary} textDark />
            <Swatch label="Accent" color={p.accent} textDark />
            <Swatch label="Text" color={p.text} textDark />
          </div>
        </div>

        {/* Mockup content */}
        <div className="grid md:grid-cols-[1.3fr_1fr] gap-10 md:gap-16">
          {/* Left column: hero */}
          <div>
            {/* Nav */}
            <nav
              className="flex items-center justify-between pb-4 mb-10 border-b"
              style={{ borderColor: p.border }}
            >
              <Image
                src="/brand/logo_1200x300.svg"
                alt="petite-moment"
                width={140}
                height={35}
                className="h-8 w-auto"
              />
              <div
                className="hidden md:flex gap-6 text-sm"
                style={{ color: p.text }}
              >
                <span>Editor</span>
                <span>Beispiele</span>
                <span>Preise</span>
              </div>
              <button
                className="rounded-full text-sm px-4 py-2"
                style={{ backgroundColor: p.primary, color: p.primaryFg }}
              >
                Jetzt gestalten
              </button>
            </nav>

            {/* Kicker */}
            <div
              className="mb-3 text-xs tracking-[0.18em] uppercase"
              style={{ color: p.muted }}
            >
              Kartenposter aus München
            </div>

            {/* Headline */}
            <h1
              className="text-4xl md:text-5xl leading-[1.05] mb-5"
              style={{ fontFamily: 'var(--font-cormorant)', fontWeight: 500 }}
            >
              Ein Moment,<br />
              der für immer bleibt.
            </h1>

            {/* Lead */}
            <p
              className="text-base md:text-lg max-w-lg mb-7 leading-relaxed"
              style={{ color: p.muted }}
            >
              Gestalte ein personalisiertes Kartenposter deines Lieblingsortes.
              Suche einen Ort, wähle Stil und Format, ergänze deinen Text —
              wir drucken es für dich in Deutschland.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full px-6 py-3 font-medium text-sm"
                style={{ backgroundColor: p.primary, color: p.primaryFg }}
              >
                Poster gestalten
              </button>
              <button
                className="rounded-full px-6 py-3 font-medium text-sm border"
                style={{
                  borderColor: p.border,
                  color: p.text,
                  backgroundColor: 'transparent',
                }}
              >
                Beispiele ansehen
              </button>
              <button
                className="rounded-full px-6 py-3 font-medium text-sm"
                style={{ color: p.accent, backgroundColor: 'transparent' }}
              >
                Mehr erfahren →
              </button>
            </div>
          </div>

          {/* Right column: card + accent demo */}
          <div className="space-y-6">
            {/* Product card */}
            <div
              className="rounded-2xl p-6 border"
              style={{ backgroundColor: p.surface, borderColor: p.border }}
            >
              <div
                className="mb-2 text-xs tracking-[0.18em] uppercase"
                style={{ color: p.accent }}
              >
                Bestseller
              </div>
              <h3
                className="text-2xl mb-1"
                style={{ fontFamily: 'var(--font-cormorant)', fontWeight: 500 }}
              >
                Unser Hochzeitstag
              </h3>
              <p className="text-sm mb-4" style={{ color: p.muted }}>
                München · 14. Juni 2024 · Din A2
              </p>
              <div
                className="flex items-center justify-between pt-4 border-t"
                style={{ borderColor: p.border }}
              >
                <span
                  className="text-lg font-semibold"
                  style={{ color: p.text }}
                >
                  ab 39,90 €
                </span>
                <button
                  className="rounded-full px-4 py-2 text-sm font-medium"
                  style={{ backgroundColor: p.primary, color: p.primaryFg }}
                >
                  In den Warenkorb
                </button>
              </div>
            </div>

            {/* Accent stripe */}
            <div
              className="rounded-2xl p-5 flex items-center gap-4"
              style={{ backgroundColor: p.accent + '22', borderLeft: `4px solid ${p.accent}` }}
            >
              <div
                className="text-sm"
                style={{ color: p.text }}
              >
                <strong>Kostenloser Versand</strong> ab 49 € innerhalb Deutschlands.
              </div>
            </div>

            {/* Muted info block */}
            <div
              className="rounded-xl p-4 text-xs"
              style={{
                backgroundColor: p.surface,
                color: p.muted,
                border: `1px solid ${p.border}`,
              }}
            >
              Kein Designer? Kein Problem.<br />
              Unser Editor führt dich in wenigen Schritten zum fertigen Poster.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function DesignPreviewColorsPage() {
  return (
    <main className={`${cormorant.variable} ${inter.variable}`}>
      {/* Top header */}
      <div className="bg-stone-900 text-stone-100">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div
            className="text-base"
            style={{ fontFamily: 'var(--font-cormorant)', fontWeight: 500 }}
          >
            Design Preview · Farbpaletten
          </div>
          <div className="text-xs text-stone-400">
            Font-Stack: Cormorant Garamond + Inter
          </div>
        </div>
      </div>

      <div
        className={inter.variable}
        style={{ fontFamily: 'var(--font-inter)' }}
      >
        {palettes.map((p) => (
          <PalettePreview key={p.id} p={p} />
        ))}
      </div>

      <footer className="bg-stone-900 text-stone-400 text-xs py-8 text-center">
        Alle drei Paletten nutzen identische Schrift, Layout und Content —
        unterschiedlich ist nur die Farbe.
      </footer>
    </main>
  )
}

import type { Metadata } from 'next'
import { LegalLayout } from '@/components/legal/LegalLayout'

export const metadata: Metadata = {
  title: 'Impressum',
  description: 'Impressum der UMOI GmbH, Anbieter von petite-moment.com — individuelle Karten- und Sternenposter.',
}

export default function ImpressumPage() {
  return (
    <LegalLayout title="Impressum">
      <h2>Angaben gemäß § 5 TMG</h2>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 München<br />
        Deutschland
      </p>

      <h2>Vertreten durch</h2>
      <p>Daniel Woyteczek (Geschäftsführer)</p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
      </p>

      <h2>Registereintrag</h2>
      <p>
        Eintragung im Handelsregister<br />
        Registergericht: Amtsgericht München<br />
        Registernummer: HRB 291299
      </p>

      <h2>Umsatzsteuer-ID</h2>
      <p>
        Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
        DE367277198
      </p>

      <h2>Redaktionell verantwortlich</h2>
      <p>
        Daniel Woyteczek<br />
        Seefelder Straße 4, 81377 München
      </p>

      <h2>EU-Streitschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>
        . Unsere E-Mail-Adresse findest du oben.
      </p>

      <h2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
      <p>
        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>
    </LegalLayout>
  )
}

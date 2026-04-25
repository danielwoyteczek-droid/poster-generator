import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { LegalLayout } from '@/components/legal/LegalLayout'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal')
  return {
    title: t('imprintTitle'),
    description: t('imprintMeta'),
  }
}

function ImpressumDE() {
  return (
    <>
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
    </>
  )
}

function ImprintEN() {
  return (
    <>
      <h2>Information pursuant to § 5 TMG</h2>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 Munich<br />
        Germany
      </p>

      <h2>Represented by</h2>
      <p>Daniel Woyteczek (Managing Director)</p>

      <h2>Contact</h2>
      <p>
        Email: <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
      </p>

      <h2>Commercial register</h2>
      <p>
        Registered in the commercial register<br />
        Registering court: Local Court of Munich (Amtsgericht München)<br />
        Registration number: HRB 291299
      </p>

      <h2>VAT ID</h2>
      <p>
        Value-added tax identification number pursuant to § 27 a of the German VAT Act:<br />
        DE367277198
      </p>

      <h2>Editorial responsibility</h2>
      <p>
        Daniel Woyteczek<br />
        Seefelder Straße 4, 81377 Munich
      </p>

      <h2>EU online dispute resolution</h2>
      <p>
        The European Commission provides a platform for online dispute resolution (ODR):{' '}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>
        . Our email address is provided above.
      </p>

      <h2>Consumer dispute resolution</h2>
      <p>
        We are neither willing nor obligated to participate in dispute resolution proceedings
        before a consumer arbitration board.
      </p>
    </>
  )
}

export default async function ImpressumPage() {
  const locale = await getLocale()
  const t = await getTranslations('legal')
  const isEnglish = locale === 'en'
  return (
    <LegalLayout
      title={t('imprintTitle')}
      showCourtesyNotice={isEnglish}
    >
      {isEnglish ? <ImprintEN /> : <ImpressumDE />}
    </LegalLayout>
  )
}

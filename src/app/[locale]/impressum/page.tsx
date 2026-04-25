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

function ImprintFR() {
  return (
    <>
      <h2>Informations conformément au § 5 TMG</h2>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 Munich<br />
        Allemagne
      </p>

      <h2>Représentée par</h2>
      <p>Daniel Woyteczek (gérant)</p>

      <h2>Contact</h2>
      <p>
        E-mail : <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
      </p>

      <h2>Registre du commerce</h2>
      <p>
        Inscription au registre du commerce<br />
        Tribunal d'enregistrement : tribunal cantonal de Munich (Amtsgericht München)<br />
        Numéro d'enregistrement : HRB 291299
      </p>

      <h2>Numéro de TVA</h2>
      <p>
        Numéro d'identification fiscale conformément au § 27 a de la loi allemande sur la TVA :<br />
        DE367277198
      </p>

      <h2>Responsable éditorial</h2>
      <p>
        Daniel Woyteczek<br />
        Seefelder Straße 4, 81377 Munich
      </p>

      <h2>Règlement des litiges en ligne (UE)</h2>
      <p>
        La Commission européenne met à disposition une plateforme de règlement en ligne des litiges (RLL) :{' '}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>
        . Notre adresse e-mail figure ci-dessus.
      </p>

      <h2>Règlement des litiges de consommation</h2>
      <p>
        Nous ne sommes ni disposés ni tenus de participer à une procédure de règlement des litiges
        devant un organisme de conciliation des consommateurs.
      </p>
    </>
  )
}

function ImprintIT() {
  return (
    <>
      <h2>Informazioni ai sensi del § 5 TMG</h2>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 Monaco di Baviera<br />
        Germania
      </p>

      <h2>Rappresentata da</h2>
      <p>Daniel Woyteczek (amministratore)</p>

      <h2>Contatto</h2>
      <p>
        E-mail: <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
      </p>

      <h2>Registro delle imprese</h2>
      <p>
        Iscrizione nel registro delle imprese<br />
        Tribunale di registrazione: Amtsgericht di Monaco di Baviera<br />
        Numero di registrazione: HRB 291299
      </p>

      <h2>Partita IVA</h2>
      <p>
        Codice di identificazione fiscale ai sensi del § 27 a della legge tedesca sull'IVA:<br />
        DE367277198
      </p>

      <h2>Responsabile editoriale</h2>
      <p>
        Daniel Woyteczek<br />
        Seefelder Straße 4, 81377 Monaco di Baviera
      </p>

      <h2>Risoluzione delle controversie online (UE)</h2>
      <p>
        La Commissione europea mette a disposizione una piattaforma per la risoluzione online delle controversie (ODR):{' '}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>
        . Il nostro indirizzo e-mail è indicato sopra.
      </p>

      <h2>Risoluzione delle controversie con i consumatori</h2>
      <p>
        Non siamo disposti né obbligati a partecipare a procedure di risoluzione delle controversie
        davanti a un organismo di conciliazione per i consumatori.
      </p>
    </>
  )
}

function ImprintES() {
  return (
    <>
      <h2>Información según el § 5 TMG</h2>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 Múnich<br />
        Alemania
      </p>

      <h2>Representada por</h2>
      <p>Daniel Woyteczek (administrador)</p>

      <h2>Contacto</h2>
      <p>
        Correo electrónico: <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
      </p>

      <h2>Registro mercantil</h2>
      <p>
        Inscripción en el registro mercantil<br />
        Tribunal de registro: tribunal local de Múnich (Amtsgericht München)<br />
        Número de registro: HRB 291299
      </p>

      <h2>NIF</h2>
      <p>
        Número de identificación fiscal según el § 27 a de la Ley alemana del IVA:<br />
        DE367277198
      </p>

      <h2>Responsable editorial</h2>
      <p>
        Daniel Woyteczek<br />
        Seefelder Straße 4, 81377 Múnich
      </p>

      <h2>Resolución de litigios en línea (UE)</h2>
      <p>
        La Comisión Europea ofrece una plataforma para la resolución de litigios en línea (ODR):{' '}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>
        . Nuestra dirección de correo figura más arriba.
      </p>

      <h2>Resolución de litigios de consumo</h2>
      <p>
        No estamos dispuestos ni obligados a participar en procedimientos de resolución de litigios
        ante una entidad de arbitraje de consumo.
      </p>
    </>
  )
}

function renderImprint(locale: string) {
  switch (locale) {
    case 'de': return <ImpressumDE />
    case 'fr': return <ImprintFR />
    case 'it': return <ImprintIT />
    case 'es': return <ImprintES />
    default: return <ImprintEN />
  }
}

export default async function ImpressumPage() {
  const locale = await getLocale()
  const t = await getTranslations('legal')
  return (
    <LegalLayout
      title={t('imprintTitle')}
      showCourtesyNotice={locale !== 'de'}
    >
      {renderImprint(locale)}
    </LegalLayout>
  )
}

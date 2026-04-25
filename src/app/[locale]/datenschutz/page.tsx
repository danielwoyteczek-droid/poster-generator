import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { LegalLayout } from '@/components/legal/LegalLayout'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal')
  return {
    title: t('privacyTitle'),
    description: t('privacyMeta'),
  }
}

function PrivacyDE() {
  return (
    <>
      <h2>1. Verantwortlicher</h2>
      <p>
        Verantwortlicher im Sinne der DSGVO und anderer nationaler Datenschutzgesetze ist:
      </p>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 München<br />
        Deutschland<br />
        E-Mail: <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
      </p>
      <p>Vertreten durch den Geschäftsführer Daniel Woyteczek.</p>

      <h2>2. Hosting und Bereitstellung der Website</h2>
      <p>
        Unsere Website wird bei <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133, Covina,
        CA 91723, USA gehostet. Beim Aufruf unserer Website werden automatisch folgende Daten in
        Server-Logs erfasst: IP-Adresse, Datum und Uhrzeit des Zugriffs, übertragene Datenmenge,
        Referrer-URL, User-Agent. Diese Daten sind technisch notwendig und werden nach kurzer
        Zeit automatisch gelöscht.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einem stabilen und
        sicheren Betrieb).
      </p>
      <p>
        Mit Vercel besteht ein Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO sowie die
        EU-Standardvertragsklauseln für die Datenübermittlung in die USA.
      </p>

      <h2>3. Registrierung und Nutzerkonto</h2>
      <p>
        Wenn du ein Konto anlegst, verarbeiten wir deine E-Mail-Adresse und dein verschlüsseltes
        (gehashtes) Passwort. Die Daten werden bei <strong>Supabase Inc.</strong> (Server in der
        EU) gespeichert.
      </p>
      <p>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).</p>
      <p>
        Speicherdauer: bis zur Löschung deines Kontos. Du kannst dein Konto jederzeit per E-Mail
        an <a href="mailto:love@petite-moment.com">love@petite-moment.com</a> löschen lassen.
      </p>

      <h2>4. Bestellung und Zahlungsabwicklung</h2>
      <p>Bei einer Bestellung verarbeiten wir:</p>
      <ul>
        <li>deine E-Mail-Adresse (für Bestellbestätigung und Kontakt)</li>
        <li>bei physischen Produkten: Name und Lieferadresse (für den Versand)</li>
        <li>Inhalt deiner Bestellung inkl. Poster-Konfiguration (zur Erstellung und Auslieferung)</li>
      </ul>
      <p>
        Die <strong>Zahlungsabwicklung</strong> erfolgt ausschließlich über{' '}
        <strong>Stripe Payments Europe Ltd.</strong> (Dublin, Irland). Kartendaten oder
        Bankverbindungen werden von Stripe direkt erfasst und sind uns zu keinem Zeitpunkt
        bekannt. Stripe ist PCI-DSS-zertifiziert. Datenschutzerklärung von Stripe:{' '}
        <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer">
          stripe.com/de/privacy
        </a>
        .
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) sowie Art. 6 Abs. 1 lit.
        c DSGVO (steuer- und handelsrechtliche Aufbewahrungspflichten).
      </p>
      <p>
        Speicherdauer: Bestelldaten werden entsprechend den gesetzlichen Aufbewahrungsfristen (6
        bzw. 10 Jahre nach AO und HGB) gespeichert.
      </p>

      <h2>5. E-Mail-Kommunikation</h2>
      <p>
        Zur Versendung von Transaktions-E-Mails (Bestellbestätigung, Versandbenachrichtigung)
        nutzen wir <strong>Resend (Inbound Technology Inc.)</strong>, USA. Dabei werden deine
        E-Mail-Adresse und der E-Mail-Inhalt an Resend übermittelt.
      </p>
      <p>
        Mit Resend besteht ein Auftragsverarbeitungsvertrag sowie die EU-Standardvertragsklauseln
        für die Datenübermittlung in die USA. Datenschutzerklärung:{' '}
        <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
          resend.com/legal/privacy-policy
        </a>
        .
      </p>
      <p>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).</p>

      <h2>6. Karten- und Ortsdaten</h2>
      <p>
        Für die Darstellung von Kartenausschnitten und die Orts-Suche nutzen wir den Dienst{' '}
        <strong>MapTiler AG</strong>, Baarerstrasse 10, 6300 Zug, Schweiz. Beim Laden einer Karte
        werden deine IP-Adresse und ggf. Suchanfragen an MapTiler übermittelt.
      </p>
      <p>
        Die Schweiz verfügt über einen EU-Angemessenheitsbeschluss (Art. 45 DSGVO).
      </p>
      <p>
        Datenschutzerklärung MapTiler:{' '}
        <a href="https://www.maptiler.com/privacy-policy/" target="_blank" rel="noopener noreferrer">
          maptiler.com/privacy-policy
        </a>
        .
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) sowie Art. 6 Abs. 1 lit.
        f DSGVO (berechtigtes Interesse an einer funktionsfähigen Kartenanzeige).
      </p>

      <h2>7. Content-Management</h2>
      <p>
        Unsere redaktionellen Inhalte (Blog, FAQ, About) verwalten wir mit{' '}
        <strong>Sanity.io</strong> (Sanity AS, Rosenkrantzgaten 11, 0159 Oslo, Norwegen). Beim
        Besuch unserer Content-Seiten werden technische Abrufdaten an Sanity übermittelt.
        Norwegen verfügt über einen EU-Angemessenheitsbeschluss.
      </p>
      <p>
        Datenschutzerklärung Sanity:{' '}
        <a href="https://www.sanity.io/legal/privacy" target="_blank" rel="noopener noreferrer">
          sanity.io/legal/privacy
        </a>
        .
      </p>

      <h2>8. Cookies und Local Storage</h2>
      <p>
        Technisch notwendige Cookies und Local Storage (Anmeldung, Warenkorb, Poster-Entwürfe)
        setzen wir immer ein. Analyse- und Marketing-Cookies werden nur nach deiner
        <strong> ausdrücklichen Einwilligung</strong> über unser Cookie-Banner geladen. Du kannst
        deine Einwilligung jederzeit im Footer unter „Cookie-Einstellungen" widerrufen. Details in
        unserer <a href="/cookie-richtlinie">Cookie-Richtlinie</a>.
      </p>
      <p>
        Rechtsgrundlage für notwendige Cookies: § 25 Abs. 2 Nr. 2 TTDSG sowie Art. 6 Abs. 1 lit. f
        DSGVO. Rechtsgrundlage für Analyse- und Marketing-Cookies: § 25 Abs. 1 TTDSG sowie Art. 6
        Abs. 1 lit. a DSGVO (Einwilligung).
      </p>

      <h2>9. Google Tag Manager</h2>
      <p>
        Wir setzen <strong>Google Tag Manager</strong> der Google Ireland Limited, Gordon House,
        Barrow Street, Dublin 4, Irland, ein. Der Tag Manager selbst erhebt keine personenbezogenen
        Daten, sondern dient ausschließlich der Verwaltung der von uns eingesetzten Analyse- und
        Marketing-Tags. Er lädt diese nur, wenn du entsprechend eingewilligt hast.
      </p>

      <h2>10. Google Analytics 4</h2>
      <p>
        Mit deiner Einwilligung nutzen wir <strong>Google Analytics 4</strong> (Google Ireland
        Limited), um die Nutzung unserer Website statistisch auszuwerten. Dabei werden
        pseudonymisierte Nutzungsdaten (z. B. aufgerufene Seiten, Klicks, Geräteinformationen)
        verarbeitet. IP-Adressen werden von Google vor der Speicherung gekürzt.
      </p>
      <p>
        Google kann die Daten zusätzlich in die USA übermitteln. Es bestehen
        EU-Standardvertragsklauseln nach Art. 46 DSGVO.
      </p>
      <p>
        Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung), § 25 Abs. 1 TTDSG.
      </p>
      <p>
        Speicherdauer: maximal 14 Monate. Datenschutzerklärung:{' '}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          policies.google.com/privacy
        </a>
        . Widerruf jederzeit über das Cookie-Banner möglich.
      </p>

      <h2>11. Deine Rechte</h2>
      <p>Du hast jederzeit das Recht auf:</p>
      <ul>
        <li><strong>Auskunft</strong> über die zu deiner Person gespeicherten Daten (Art. 15 DSGVO)</li>
        <li><strong>Berichtigung</strong> unrichtiger Daten (Art. 16 DSGVO)</li>
        <li>
          <strong>Löschung</strong> deiner Daten (Art. 17 DSGVO), soweit keine gesetzlichen
          Aufbewahrungspflichten entgegenstehen
        </li>
        <li><strong>Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO)</li>
        <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO)</li>
        <li><strong>Widerspruch</strong> gegen die Verarbeitung (Art. 21 DSGVO)</li>
      </ul>
      <p>
        Für alle Anliegen schreibe uns bitte an{' '}
        <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>.
      </p>

      <h2>12. Beschwerderecht</h2>
      <p>
        Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig
        für uns ist:
      </p>
      <p>
        Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)<br />
        Promenade 18, 91522 Ansbach<br />
        <a href="https://www.lda.bayern.de" target="_blank" rel="noopener noreferrer">
          www.lda.bayern.de
        </a>
      </p>

      <h2>13. Keine automatisierte Entscheidungsfindung</h2>
      <p>
        Wir nutzen keine automatisierte Entscheidungsfindung oder Profiling im Sinne von Art. 22
        DSGVO.
      </p>

      <h2>14. Aktualität dieser Erklärung</h2>
      <p>
        Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an geänderte
        Rechtslagen oder bei Änderungen unserer Dienste anzupassen. Die aktuelle Version findest
        du jederzeit auf dieser Seite.
      </p>
    </>
  )
}

function PrivacyEN() {
  return (
    <>
      <h2>1. Controller</h2>
      <p>
        The controller within the meaning of the GDPR and other national data protection laws is:
      </p>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 Munich<br />
        Germany<br />
        Email: <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
      </p>
      <p>Represented by managing director Daniel Woyteczek.</p>

      <h2>2. Hosting and provision of the website</h2>
      <p>
        Our website is hosted by <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133, Covina,
        CA 91723, USA. When you visit our website, the following data is automatically recorded
        in server logs: IP address, date and time of access, amount of data transferred,
        referrer URL, user agent. This data is technically necessary and is automatically
        deleted after a short time.
      </p>
      <p>
        Legal basis: Art. 6 (1) lit. f GDPR (legitimate interest in stable and secure
        operation).
      </p>
      <p>
        We have a data processing agreement (DPA) with Vercel pursuant to Art. 28 GDPR, as well
        as the EU Standard Contractual Clauses for data transfers to the USA.
      </p>

      <h2>3. Registration and user account</h2>
      <p>
        When you create an account, we process your email address and your encrypted (hashed)
        password. The data is stored at <strong>Supabase Inc.</strong> (servers in the EU).
      </p>
      <p>Legal basis: Art. 6 (1) lit. b GDPR (performance of contract).</p>
      <p>
        Storage period: until you delete your account. You can request deletion of your account
        at any time by emailing{' '}
        <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>.
      </p>

      <h2>4. Orders and payment processing</h2>
      <p>For each order, we process:</p>
      <ul>
        <li>your email address (for order confirmation and contact)</li>
        <li>for physical products: name and shipping address (for delivery)</li>
        <li>contents of your order including poster configuration (for production and delivery)</li>
      </ul>
      <p>
        <strong>Payment processing</strong> is handled exclusively through{' '}
        <strong>Stripe Payments Europe Ltd.</strong> (Dublin, Ireland). Card details and bank
        information are collected directly by Stripe and are never known to us. Stripe is
        PCI-DSS certified. Stripe&apos;s privacy policy:{' '}
        <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
          stripe.com/privacy
        </a>
        .
      </p>
      <p>
        Legal basis: Art. 6 (1) lit. b GDPR (performance of contract) and Art. 6 (1) lit. c
        GDPR (statutory tax and commercial retention obligations).
      </p>
      <p>
        Storage period: order data is retained according to statutory retention periods (6 or
        10 years under the German Tax Code (AO) and Commercial Code (HGB)).
      </p>

      <h2>5. Email communication</h2>
      <p>
        For sending transactional emails (order confirmation, shipping notification) we use{' '}
        <strong>Resend (Inbound Technology Inc.)</strong>, USA. Your email address and the
        email content are transmitted to Resend.
      </p>
      <p>
        We have a data processing agreement with Resend, as well as the EU Standard
        Contractual Clauses for data transfers to the USA. Privacy policy:{' '}
        <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
          resend.com/legal/privacy-policy
        </a>
        .
      </p>
      <p>Legal basis: Art. 6 (1) lit. b GDPR (performance of contract).</p>

      <h2>6. Map and location data</h2>
      <p>
        For displaying map sections and location search we use the service{' '}
        <strong>MapTiler AG</strong>, Baarerstrasse 10, 6300 Zug, Switzerland. When a map is
        loaded, your IP address and any search queries are transmitted to MapTiler.
      </p>
      <p>
        Switzerland has an EU adequacy decision (Art. 45 GDPR).
      </p>
      <p>
        MapTiler privacy policy:{' '}
        <a href="https://www.maptiler.com/privacy-policy/" target="_blank" rel="noopener noreferrer">
          maptiler.com/privacy-policy
        </a>
        .
      </p>
      <p>
        Legal basis: Art. 6 (1) lit. b GDPR (performance of contract) and Art. 6 (1) lit. f
        GDPR (legitimate interest in functional map display).
      </p>

      <h2>7. Content management</h2>
      <p>
        Our editorial content (blog, FAQ, About) is managed with{' '}
        <strong>Sanity.io</strong> (Sanity AS, Rosenkrantzgaten 11, 0159 Oslo, Norway). When
        visiting our content pages, technical request data is transmitted to Sanity. Norway
        has an EU adequacy decision.
      </p>
      <p>
        Sanity privacy policy:{' '}
        <a href="https://www.sanity.io/legal/privacy" target="_blank" rel="noopener noreferrer">
          sanity.io/legal/privacy
        </a>
        .
      </p>

      <h2>8. Cookies and local storage</h2>
      <p>
        Strictly necessary cookies and local storage (sign-in, cart, poster drafts) are always
        used. Analytics and marketing cookies are only loaded after your{' '}
        <strong>explicit consent</strong> via our cookie banner. You can revoke your consent
        at any time via the &quot;Cookie settings&quot; link in the footer. Details are
        provided in our <a href="/cookie-richtlinie">Cookie policy</a>.
      </p>
      <p>
        Legal basis for necessary cookies: § 25 (2) No. 2 TTDSG and Art. 6 (1) lit. f GDPR.
        Legal basis for analytics and marketing cookies: § 25 (1) TTDSG and Art. 6 (1) lit. a
        GDPR (consent).
      </p>

      <h2>9. Google Tag Manager</h2>
      <p>
        We use <strong>Google Tag Manager</strong> by Google Ireland Limited, Gordon House,
        Barrow Street, Dublin 4, Ireland. The Tag Manager itself does not collect personal
        data; it serves only to manage the analytics and marketing tags we use. It only loads
        them if you have consented accordingly.
      </p>

      <h2>10. Google Analytics 4</h2>
      <p>
        With your consent we use <strong>Google Analytics 4</strong> (Google Ireland Limited)
        to statistically analyse the use of our website. Pseudonymised usage data (e.g. pages
        visited, clicks, device information) is processed. IP addresses are truncated by
        Google before storage.
      </p>
      <p>
        Google may also transfer the data to the USA. EU Standard Contractual Clauses pursuant
        to Art. 46 GDPR are in place.
      </p>
      <p>
        Legal basis: Art. 6 (1) lit. a GDPR (consent), § 25 (1) TTDSG.
      </p>
      <p>
        Storage period: maximum 14 months. Privacy policy:{' '}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          policies.google.com/privacy
        </a>
        . You can revoke consent at any time via the cookie banner.
      </p>

      <h2>11. Your rights</h2>
      <p>You have the right at any time to:</p>
      <ul>
        <li><strong>access</strong> the data stored about you (Art. 15 GDPR)</li>
        <li><strong>correct</strong> inaccurate data (Art. 16 GDPR)</li>
        <li>
          <strong>delete</strong> your data (Art. 17 GDPR), unless statutory retention
          obligations prevent this
        </li>
        <li><strong>restrict processing</strong> (Art. 18 GDPR)</li>
        <li><strong>data portability</strong> (Art. 20 GDPR)</li>
        <li><strong>object</strong> to processing (Art. 21 GDPR)</li>
      </ul>
      <p>
        For all enquiries please email us at{' '}
        <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>.
      </p>

      <h2>12. Right to lodge a complaint</h2>
      <p>
        You have the right to lodge a complaint with a data protection supervisory authority.
        The competent authority for us is:
      </p>
      <p>
        Bavarian State Office for Data Protection Supervision (BayLDA)<br />
        Promenade 18, 91522 Ansbach, Germany<br />
        <a href="https://www.lda.bayern.de" target="_blank" rel="noopener noreferrer">
          www.lda.bayern.de
        </a>
      </p>

      <h2>13. No automated decision-making</h2>
      <p>
        We do not use automated decision-making or profiling within the meaning of Art. 22
        GDPR.
      </p>

      <h2>14. Updates to this policy</h2>
      <p>
        We reserve the right to amend this privacy policy to reflect changes in the legal
        situation or in our services. The current version is always available on this page.
      </p>
    </>
  )
}

export default async function DatenschutzPage() {
  const locale = await getLocale()
  const t = await getTranslations('legal')
  const isEnglish = locale === 'en'
  return (
    <LegalLayout
      title={t('privacyTitle')}
      updatedAt={isEnglish ? 'April 21, 2026' : '21. April 2026'}
      showCourtesyNotice={isEnglish}
    >
      {isEnglish ? <PrivacyEN /> : <PrivacyDE />}
    </LegalLayout>
  )
}

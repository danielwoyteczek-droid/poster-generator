import type { Metadata } from 'next'
import { LegalLayout } from '@/components/legal/LegalLayout'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description: 'Wie wir deine personenbezogenen Daten bei petite-moment.com verarbeiten und welche Rechte dir zustehen.',
}

export default function DatenschutzPage() {
  return (
    <LegalLayout title="Datenschutzerklärung" updatedAt="21. April 2026">
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
    </LegalLayout>
  )
}

import type { Metadata } from 'next'
import { LegalLayout } from '@/components/legal/LegalLayout'

export const metadata: Metadata = {
  title: 'Cookie-Richtlinie',
  description: 'Welche Cookies und ähnlichen Technologien wir bei petite-moment.com einsetzen — transparent und DSGVO-konform.',
}

export default function CookieRichtliniePage() {
  return (
    <LegalLayout title="Cookie-Richtlinie" updatedAt="20. April 2026">
      <p>
        Diese Cookie-Richtlinie erklärt, welche Cookies und ähnlichen Technologien wir auf
        petite-moment.com einsetzen, warum wir sie brauchen und wie du die Verwendung
        kontrollieren kannst.
      </p>

      <h2>Was sind Cookies?</h2>
      <p>
        Cookies sind kleine Textdateien, die beim Besuch einer Website in deinem Browser
        gespeichert werden. Sie helfen uns, deine Sitzung aufrechtzuerhalten, deinen Warenkorb zu
        speichern und die Website sicher zu betreiben.
      </p>

      <h2>Welche Cookies und Speichertechniken nutzen wir?</h2>

      <h3>Technisch notwendige Cookies und Local Storage</h3>
      <p>
        Diese sind für den Betrieb der Website zwingend erforderlich und lassen sich nicht
        deaktivieren, ohne dass wesentliche Funktionen ausfallen:
      </p>
      <ul>
        <li>
          <strong>Supabase-Auth-Cookies</strong> — halten deine Anmeldung aufrecht und sichern deine
          Sitzung
        </li>
        <li>
          <strong>Stripe-Cookies</strong> — werden beim Zahlungsvorgang von Stripe gesetzt zur
          Betrugserkennung und sicheren Zahlungsabwicklung
        </li>
        <li>
          <strong>LocalStorage</strong> (<code>poster-cart</code>,{' '}
          <code>poster-generator-draft</code>) — speichert deinen Warenkorb und deine
          Poster-Entwürfe in deinem Browser, damit du jederzeit weiterarbeiten kannst
        </li>
      </ul>
      <p>
        <strong>Rechtsgrundlage:</strong> § 25 Abs. 2 Nr. 2 TTDSG — technisch unbedingt erforderlich,
        keine Einwilligung nötig.
      </p>

      <h3>Stripe (Zahlungsabwicklung)</h3>
      <p>
        Stripe setzt beim Aufrufen der Checkout-Seite eigene Cookies zur Betrugsprävention und
        sicheren Kartenabwicklung. Ohne diese Cookies ist keine Bezahlung möglich. Details:{' '}
        <a href="https://stripe.com/cookies-policy/legal" target="_blank" rel="noopener noreferrer">
          stripe.com/cookies-policy/legal
        </a>
        .
      </p>

      <h2>Keine Tracking- oder Marketing-Cookies</h2>
      <p>
        Wir verzichten bewusst auf Analytics- und Marketing-Tracking mit Cookies (kein Google
        Analytics, kein Facebook Pixel, kein Retargeting). Sollten wir solche Dienste in Zukunft
        einsetzen, binden wir vorab einen Consent-Banner ein und aktualisieren diese
        Cookie-Richtlinie.
      </p>

      <h2>Deine Kontrollmöglichkeiten</h2>
      <p>
        Du kannst Cookies jederzeit in den Einstellungen deines Browsers löschen oder das Setzen
        neuer Cookies verhindern. Einige Funktionen unserer Website (Anmeldung, Warenkorb,
        Poster-Entwürfe, Zahlung) werden dann allerdings nicht mehr zuverlässig funktionieren.
      </p>

      <h2>Kontakt</h2>
      <p>
        Bei Fragen zu unserer Cookie-Nutzung schreib uns an{' '}
        <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>.
      </p>
    </LegalLayout>
  )
}

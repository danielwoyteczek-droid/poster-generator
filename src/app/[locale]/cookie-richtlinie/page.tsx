import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { LegalLayout } from '@/components/legal/LegalLayout'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal')
  return {
    title: t('cookiesTitle'),
    description: t('cookiesMeta'),
  }
}

function CookiesDE() {
  return (
    <>
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
    </>
  )
}

function CookiesEN() {
  return (
    <>
      <p>
        This cookie policy explains which cookies and similar technologies we use at
        petite-moment.com, why we need them, and how you can control their use.
      </p>

      <h2>What are cookies?</h2>
      <p>
        Cookies are small text files that are stored in your browser when you visit a website.
        They help us keep your session alive, store your shopping cart, and operate the site
        securely.
      </p>

      <h2>Which cookies and storage techniques do we use?</h2>

      <h3>Strictly necessary cookies and local storage</h3>
      <p>
        These are essential for the operation of the website and cannot be disabled without
        significant functionality being lost:
      </p>
      <ul>
        <li>
          <strong>Supabase auth cookies</strong> — keep you signed in and secure your session
        </li>
        <li>
          <strong>Stripe cookies</strong> — set by Stripe during payment for fraud detection and
          secure payment processing
        </li>
        <li>
          <strong>LocalStorage</strong> (<code>poster-cart</code>,{' '}
          <code>poster-generator-draft</code>) — stores your cart and poster drafts in your
          browser so you can continue editing at any time
        </li>
      </ul>
      <p>
        <strong>Legal basis:</strong> § 25 (2) No. 2 TTDSG — strictly necessary for technical
        operation, no consent required.
      </p>

      <h3>Stripe (payment processing)</h3>
      <p>
        Stripe sets its own cookies on the checkout page for fraud prevention and secure card
        processing. Payment is not possible without these cookies. Details:{' '}
        <a href="https://stripe.com/cookies-policy/legal" target="_blank" rel="noopener noreferrer">
          stripe.com/cookies-policy/legal
        </a>
        .
      </p>

      <h2>No tracking or marketing cookies</h2>
      <p>
        We deliberately do not use analytics or marketing tracking cookies (no Google Analytics,
        no Facebook Pixel, no retargeting). Should we add such services in the future, we will
        first introduce a consent banner and update this cookie policy.
      </p>

      <h2>Your controls</h2>
      <p>
        You can delete cookies at any time in your browser settings or prevent new cookies from
        being set. However, some site features (sign-in, cart, poster drafts, payment) may then
        no longer work reliably.
      </p>

      <h2>Contact</h2>
      <p>
        If you have questions about our use of cookies, please email us at{' '}
        <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>.
      </p>
    </>
  )
}

export default async function CookieRichtliniePage() {
  const locale = await getLocale()
  const t = await getTranslations('legal')
  const isEnglish = locale === 'en'
  return (
    <LegalLayout
      title={t('cookiesTitle')}
      updatedAt={isEnglish ? 'April 20, 2026' : '20. April 2026'}
      showCourtesyNotice={isEnglish}
    >
      {isEnglish ? <CookiesEN /> : <CookiesDE />}
    </LegalLayout>
  )
}

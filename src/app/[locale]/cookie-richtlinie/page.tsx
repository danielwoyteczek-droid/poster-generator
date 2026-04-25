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

function CookiesFR() {
  return (
    <>
      <p>
        Cette politique de cookies explique quels cookies et technologies similaires nous
        utilisons sur petite-moment.com, pourquoi nous en avons besoin et comment vous pouvez
        contrôler leur utilisation.
      </p>

      <h2>Que sont les cookies ?</h2>
      <p>
        Les cookies sont de petits fichiers texte stockés dans votre navigateur lorsque vous
        visitez un site web. Ils nous aident à maintenir votre session, à enregistrer votre
        panier et à exploiter le site en toute sécurité.
      </p>

      <h2>Quels cookies et techniques de stockage utilisons-nous ?</h2>

      <h3>Cookies strictement nécessaires et stockage local</h3>
      <p>
        Ils sont indispensables au fonctionnement du site et ne peuvent être désactivés sans
        perte de fonctionnalité essentielle :
      </p>
      <ul>
        <li>
          <strong>Cookies d'authentification Supabase</strong> — maintiennent votre connexion
          et sécurisent votre session
        </li>
        <li>
          <strong>Cookies Stripe</strong> — déposés par Stripe lors du paiement pour la
          détection de fraude et le traitement sécurisé du paiement
        </li>
        <li>
          <strong>LocalStorage</strong> (<code>poster-cart</code>,{' '}
          <code>poster-generator-draft</code>) — stocke votre panier et vos brouillons
          d'affiche dans votre navigateur pour que vous puissiez continuer à les modifier à
          tout moment
        </li>
      </ul>
      <p>
        <strong>Base juridique :</strong> § 25 al. 2 n° 2 TTDSG — strictement nécessaire au
        fonctionnement technique, aucun consentement requis.
      </p>

      <h3>Stripe (traitement des paiements)</h3>
      <p>
        Stripe dépose ses propres cookies sur la page de paiement pour la prévention de la
        fraude et le traitement sécurisé des cartes. Le paiement n'est pas possible sans ces
        cookies. Détails :{' '}
        <a href="https://stripe.com/cookies-policy/legal" target="_blank" rel="noopener noreferrer">
          stripe.com/cookies-policy/legal
        </a>
        .
      </p>

      <h2>Pas de cookies de suivi ou marketing</h2>
      <p>
        Nous renonçons délibérément aux cookies d'analyse et de marketing (pas de Google
        Analytics, pas de Pixel Facebook, pas de retargeting). Si nous utilisons de tels
        services à l'avenir, nous mettrons d'abord en place une bannière de consentement et
        mettrons à jour cette politique de cookies.
      </p>

      <h2>Vos contrôles</h2>
      <p>
        Vous pouvez supprimer les cookies à tout moment dans les paramètres de votre
        navigateur ou empêcher la mise en place de nouveaux cookies. Cependant, certaines
        fonctions du site (connexion, panier, brouillons d'affiche, paiement) risquent alors
        de ne plus fonctionner correctement.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question concernant notre utilisation des cookies, écrivez-nous à{' '}
        <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>.
      </p>
    </>
  )
}

function CookiesIT() {
  return (
    <>
      <p>
        Questa politica sui cookie spiega quali cookie e tecnologie simili utilizziamo su
        petite-moment.com, perché ne abbiamo bisogno e come puoi controllarne l'uso.
      </p>

      <h2>Cosa sono i cookie?</h2>
      <p>
        I cookie sono piccoli file di testo memorizzati nel tuo browser quando visiti un sito
        web. Ci aiutano a mantenere attiva la tua sessione, a salvare il carrello e a gestire
        il sito in sicurezza.
      </p>

      <h2>Quali cookie e tecniche di archiviazione utilizziamo?</h2>

      <h3>Cookie strettamente necessari e archiviazione locale</h3>
      <p>
        Sono indispensabili per il funzionamento del sito e non possono essere disattivati
        senza perdita di funzionalità essenziali:
      </p>
      <ul>
        <li>
          <strong>Cookie di autenticazione Supabase</strong> — mantengono attivo il tuo
          accesso e proteggono la sessione
        </li>
        <li>
          <strong>Cookie Stripe</strong> — impostati da Stripe durante il pagamento per il
          rilevamento delle frodi e l'elaborazione sicura
        </li>
        <li>
          <strong>LocalStorage</strong> (<code>poster-cart</code>,{' '}
          <code>poster-generator-draft</code>) — memorizza il tuo carrello e le bozze di
          poster nel tuo browser, così puoi continuare a modificarli in qualsiasi momento
        </li>
      </ul>
      <p>
        <strong>Base giuridica:</strong> § 25 c. 2 n. 2 TTDSG — strettamente necessari per il
        funzionamento tecnico, nessun consenso richiesto.
      </p>

      <h3>Stripe (elaborazione dei pagamenti)</h3>
      <p>
        Stripe imposta i propri cookie nella pagina di pagamento per la prevenzione delle
        frodi e l'elaborazione sicura delle carte. Senza questi cookie il pagamento non è
        possibile. Dettagli:{' '}
        <a href="https://stripe.com/cookies-policy/legal" target="_blank" rel="noopener noreferrer">
          stripe.com/cookies-policy/legal
        </a>
        .
      </p>

      <h2>Nessun cookie di tracciamento o marketing</h2>
      <p>
        Rinunciamo consapevolmente ai cookie di analisi e marketing (niente Google Analytics,
        niente Pixel di Facebook, niente retargeting). Se in futuro utilizzassimo tali
        servizi, introdurremmo prima un banner di consenso e aggiorneremmo questa politica
        sui cookie.
      </p>

      <h2>I tuoi controlli</h2>
      <p>
        Puoi eliminare i cookie in qualsiasi momento nelle impostazioni del browser o impedire
        l'impostazione di nuovi cookie. Tuttavia, alcune funzioni del sito (accesso, carrello,
        bozze di poster, pagamento) potrebbero non funzionare correttamente.
      </p>

      <h2>Contatto</h2>
      <p>
        Per domande sull'uso dei cookie, scrivici a{' '}
        <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>.
      </p>
    </>
  )
}

function CookiesES() {
  return (
    <>
      <p>
        Esta política de cookies explica qué cookies y tecnologías similares utilizamos en
        petite-moment.com, por qué las necesitamos y cómo puedes controlar su uso.
      </p>

      <h2>¿Qué son las cookies?</h2>
      <p>
        Las cookies son pequeños archivos de texto que se almacenan en tu navegador cuando
        visitas un sitio web. Nos ayudan a mantener tu sesión, guardar tu carrito y operar
        el sitio de forma segura.
      </p>

      <h2>¿Qué cookies y técnicas de almacenamiento utilizamos?</h2>

      <h3>Cookies estrictamente necesarias y almacenamiento local</h3>
      <p>
        Son imprescindibles para el funcionamiento del sitio y no pueden desactivarse sin
        perder funciones esenciales:
      </p>
      <ul>
        <li>
          <strong>Cookies de autenticación de Supabase</strong> — mantienen tu sesión iniciada
          y la aseguran
        </li>
        <li>
          <strong>Cookies de Stripe</strong> — establecidas por Stripe durante el pago para
          la detección de fraude y el procesamiento seguro
        </li>
        <li>
          <strong>LocalStorage</strong> (<code>poster-cart</code>,{' '}
          <code>poster-generator-draft</code>) — almacena tu carrito y borradores de póster
          en tu navegador para que puedas seguir editando en cualquier momento
        </li>
      </ul>
      <p>
        <strong>Base jurídica:</strong> § 25 ap. 2 nº 2 TTDSG — estrictamente necesarias para
        el funcionamiento técnico, no se requiere consentimiento.
      </p>

      <h3>Stripe (procesamiento de pagos)</h3>
      <p>
        Stripe establece sus propias cookies en la página de pago para la prevención de
        fraude y el procesamiento seguro de tarjetas. Sin estas cookies no es posible el
        pago. Detalles:{' '}
        <a href="https://stripe.com/cookies-policy/legal" target="_blank" rel="noopener noreferrer">
          stripe.com/cookies-policy/legal
        </a>
        .
      </p>

      <h2>Sin cookies de seguimiento ni marketing</h2>
      <p>
        Renunciamos deliberadamente a las cookies de análisis y marketing (sin Google
        Analytics, sin Pixel de Facebook, sin retargeting). Si en el futuro utilizamos tales
        servicios, primero introduciremos un banner de consentimiento y actualizaremos esta
        política de cookies.
      </p>

      <h2>Tus controles</h2>
      <p>
        Puedes eliminar las cookies en cualquier momento en la configuración de tu navegador
        o impedir el establecimiento de nuevas cookies. Sin embargo, algunas funciones del
        sitio (inicio de sesión, carrito, borradores de póster, pago) podrían no funcionar
        correctamente.
      </p>

      <h2>Contacto</h2>
      <p>
        Si tienes preguntas sobre nuestro uso de cookies, escríbenos a{' '}
        <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>.
      </p>
    </>
  )
}

const UPDATED_AT = {
  de: '20. April 2026',
  en: 'April 20, 2026',
  fr: '20 avril 2026',
  it: '20 aprile 2026',
  es: '20 de abril de 2026',
} as const

function renderCookies(locale: string) {
  switch (locale) {
    case 'de': return <CookiesDE />
    case 'fr': return <CookiesFR />
    case 'it': return <CookiesIT />
    case 'es': return <CookiesES />
    default: return <CookiesEN />
  }
}

export default async function CookieRichtliniePage() {
  const locale = await getLocale()
  const t = await getTranslations('legal')
  return (
    <LegalLayout
      title={t('cookiesTitle')}
      updatedAt={UPDATED_AT[locale as keyof typeof UPDATED_AT] ?? UPDATED_AT.de}
      showCourtesyNotice={locale !== 'de'}
    >
      {renderCookies(locale)}
    </LegalLayout>
  )
}

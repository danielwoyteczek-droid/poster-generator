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

function PrivacyFR() {
  return (
    <>
      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement au sens du RGPD et des autres lois nationales sur la
        protection des données est :
      </p>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 Munich<br />
        Allemagne<br />
        E-mail : <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
      </p>
      <p>Représentée par le gérant Daniel Woyteczek.</p>

      <h2>2. Hébergement et fourniture du site</h2>
      <p>
        Notre site est hébergé par <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133,
        Covina, CA 91723, USA. Lors de la consultation du site, les données suivantes sont
        automatiquement enregistrées dans les journaux serveur : adresse IP, date et heure
        de l'accès, volume de données transféré, URL de référence, agent utilisateur. Ces
        données sont techniquement nécessaires et sont supprimées automatiquement après une
        courte période.
      </p>
      <p>
        Base juridique : art. 6 § 1 f) RGPD (intérêt légitime à un fonctionnement stable et
        sécurisé).
      </p>
      <p>
        Un contrat de sous-traitance (DPA) au sens de l'art. 28 RGPD ainsi que les clauses
        contractuelles types de l'UE pour le transfert de données vers les États-Unis ont
        été conclus avec Vercel.
      </p>

      <h2>3. Inscription et compte utilisateur</h2>
      <p>
        Lorsque vous créez un compte, nous traitons votre adresse e-mail et votre mot de
        passe chiffré (hashé). Les données sont stockées chez{' '}
        <strong>Supabase Inc.</strong> (serveurs dans l'UE).
      </p>
      <p>Base juridique : art. 6 § 1 b) RGPD (exécution du contrat).</p>
      <p>
        Durée de conservation : jusqu'à la suppression de votre compte. Vous pouvez demander
        la suppression de votre compte à tout moment par e-mail à{' '}
        <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>.
      </p>

      <h2>4. Commande et traitement des paiements</h2>
      <p>Lors d'une commande, nous traitons :</p>
      <ul>
        <li>votre adresse e-mail (pour la confirmation de commande et le contact)</li>
        <li>pour les produits physiques : nom et adresse de livraison (pour l'expédition)</li>
        <li>le contenu de votre commande, y compris la configuration du poster (pour la production et la livraison)</li>
      </ul>
      <p>
        Le <strong>traitement des paiements</strong> est effectué exclusivement par{' '}
        <strong>Stripe Payments Europe Ltd.</strong> (Dublin, Irlande). Les données de carte
        ou les coordonnées bancaires sont collectées directement par Stripe et ne nous sont
        jamais communiquées. Stripe est certifié PCI-DSS. Politique de confidentialité de
        Stripe :{' '}
        <a href="https://stripe.com/fr/privacy" target="_blank" rel="noopener noreferrer">
          stripe.com/fr/privacy
        </a>
        .
      </p>
      <p>
        Base juridique : art. 6 § 1 b) RGPD (exécution du contrat) et art. 6 § 1 c) RGPD
        (obligations légales de conservation fiscale et commerciale).
      </p>
      <p>
        Durée de conservation : les données de commande sont conservées conformément aux
        délais légaux de conservation (6 ou 10 ans selon le code des impôts allemand (AO)
        et le code de commerce allemand (HGB)).
      </p>

      <h2>5. Communication par e-mail</h2>
      <p>
        Pour l'envoi des e-mails transactionnels (confirmation de commande, notification
        d'expédition), nous utilisons <strong>Resend (Inbound Technology Inc.)</strong>,
        USA. Votre adresse e-mail et le contenu de l'e-mail sont transmis à Resend.
      </p>
      <p>
        Un contrat de sous-traitance ainsi que les clauses contractuelles types de l'UE
        pour le transfert de données vers les États-Unis ont été conclus avec Resend.
        Politique de confidentialité :{' '}
        <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
          resend.com/legal/privacy-policy
        </a>
        .
      </p>
      <p>Base juridique : art. 6 § 1 b) RGPD (exécution du contrat).</p>

      <h2>6. Données cartographiques et de localisation</h2>
      <p>
        Pour l'affichage des extraits de carte et la recherche de lieux, nous utilisons le
        service <strong>MapTiler AG</strong>, Baarerstrasse 10, 6300 Zoug, Suisse. Lors du
        chargement d'une carte, votre adresse IP et, le cas échéant, vos requêtes de
        recherche sont transmises à MapTiler.
      </p>
      <p>
        La Suisse bénéficie d'une décision d'adéquation de l'UE (art. 45 RGPD).
      </p>
      <p>
        Politique de confidentialité de MapTiler :{' '}
        <a href="https://www.maptiler.com/privacy-policy/" target="_blank" rel="noopener noreferrer">
          maptiler.com/privacy-policy
        </a>
        .
      </p>
      <p>
        Base juridique : art. 6 § 1 b) RGPD (exécution du contrat) et art. 6 § 1 f) RGPD
        (intérêt légitime à un affichage cartographique fonctionnel).
      </p>

      <h2>7. Gestion des contenus</h2>
      <p>
        Nos contenus éditoriaux (blog, FAQ, À propos) sont gérés avec{' '}
        <strong>Sanity.io</strong> (Sanity AS, Rosenkrantzgaten 11, 0159 Oslo, Norvège).
        Lors de la consultation de nos pages de contenu, des données techniques de requête
        sont transmises à Sanity. La Norvège bénéficie d'une décision d'adéquation de l'UE.
      </p>
      <p>
        Politique de confidentialité de Sanity :{' '}
        <a href="https://www.sanity.io/legal/privacy" target="_blank" rel="noopener noreferrer">
          sanity.io/legal/privacy
        </a>
        .
      </p>

      <h2>8. Cookies et stockage local</h2>
      <p>
        Les cookies strictement nécessaires et le stockage local (connexion, panier,
        brouillons d'affiche) sont toujours utilisés. Les cookies d'analyse et de marketing
        ne sont chargés qu'après votre <strong>consentement explicite</strong> via notre
        bannière de cookies. Vous pouvez retirer votre consentement à tout moment via le
        lien « Paramètres des cookies » dans le pied de page. Détails dans notre{' '}
        <a href="/cookie-richtlinie">politique de cookies</a>.
      </p>
      <p>
        Base juridique pour les cookies nécessaires : § 25 al. 2 n° 2 TTDSG et art. 6 § 1
        f) RGPD. Base juridique pour les cookies d'analyse et de marketing : § 25 al. 1
        TTDSG et art. 6 § 1 a) RGPD (consentement).
      </p>

      <h2>9. Google Tag Manager</h2>
      <p>
        Nous utilisons <strong>Google Tag Manager</strong> de Google Ireland Limited,
        Gordon House, Barrow Street, Dublin 4, Irlande. Le Tag Manager lui-même ne collecte
        pas de données à caractère personnel ; il sert exclusivement à gérer les balises
        d'analyse et de marketing que nous utilisons. Il ne les charge que si vous avez
        donné votre consentement.
      </p>

      <h2>10. Google Analytics 4</h2>
      <p>
        Avec votre consentement, nous utilisons <strong>Google Analytics 4</strong> (Google
        Ireland Limited) pour analyser statistiquement l'utilisation de notre site. Des
        données d'utilisation pseudonymisées (par exemple, pages consultées, clics,
        informations sur l'appareil) sont traitées. Les adresses IP sont raccourcies par
        Google avant stockage.
      </p>
      <p>
        Google peut également transférer les données vers les États-Unis. Les clauses
        contractuelles types de l'UE conformément à l'art. 46 RGPD sont en place.
      </p>
      <p>
        Base juridique : art. 6 § 1 a) RGPD (consentement), § 25 al. 1 TTDSG.
      </p>
      <p>
        Durée de conservation : 14 mois maximum. Politique de confidentialité :{' '}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          policies.google.com/privacy
        </a>
        . Vous pouvez retirer votre consentement à tout moment via la bannière de cookies.
      </p>

      <h2>11. Vos droits</h2>
      <p>Vous avez à tout moment le droit :</p>
      <ul>
        <li><strong>d'accès</strong> aux données stockées vous concernant (art. 15 RGPD)</li>
        <li><strong>de rectification</strong> des données inexactes (art. 16 RGPD)</li>
        <li>
          <strong>d'effacement</strong> de vos données (art. 17 RGPD), sauf obligations
          légales de conservation contraires
        </li>
        <li><strong>de limitation du traitement</strong> (art. 18 RGPD)</li>
        <li><strong>de portabilité</strong> des données (art. 20 RGPD)</li>
        <li><strong>d'opposition</strong> au traitement (art. 21 RGPD)</li>
      </ul>
      <p>
        Pour toute demande, écrivez-nous à{' '}
        <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>.
      </p>

      <h2>12. Droit de réclamation</h2>
      <p>
        Vous avez le droit de déposer une réclamation auprès d'une autorité de contrôle de
        la protection des données. L'autorité compétente pour nous est :
      </p>
      <p>
        Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)<br />
        Promenade 18, 91522 Ansbach, Allemagne<br />
        <a href="https://www.lda.bayern.de" target="_blank" rel="noopener noreferrer">
          www.lda.bayern.de
        </a>
      </p>

      <h2>13. Pas de prise de décision automatisée</h2>
      <p>
        Nous n'utilisons pas de prise de décision automatisée ni de profilage au sens de
        l'art. 22 RGPD.
      </p>

      <h2>14. Mises à jour de la présente politique</h2>
      <p>
        Nous nous réservons le droit de modifier la présente politique de confidentialité
        afin de l'adapter aux évolutions législatives ou aux modifications de nos services.
        La version actuelle est toujours disponible sur cette page.
      </p>
    </>
  )
}

function PrivacyIT() {
  return (
    <>
      <h2>1. Titolare del trattamento</h2>
      <p>
        Titolare del trattamento ai sensi del GDPR e di altre leggi nazionali sulla
        protezione dei dati è:
      </p>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 Monaco di Baviera<br />
        Germania<br />
        E-mail: <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
      </p>
      <p>Rappresentata dall'amministratore Daniel Woyteczek.</p>

      <h2>2. Hosting e fornitura del sito</h2>
      <p>
        Il nostro sito è ospitato da <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133,
        Covina, CA 91723, USA. Quando visiti il sito, i seguenti dati vengono registrati
        automaticamente nei log del server: indirizzo IP, data e ora dell'accesso, volume
        di dati trasferito, URL di riferimento, user agent. Questi dati sono tecnicamente
        necessari e vengono cancellati automaticamente dopo poco tempo.
      </p>
      <p>
        Base giuridica: art. 6 par. 1 lett. f) GDPR (interesse legittimo a un funzionamento
        stabile e sicuro).
      </p>
      <p>
        Con Vercel è stato concluso un accordo sul trattamento dei dati (DPA) ai sensi
        dell'art. 28 GDPR e le clausole contrattuali standard dell'UE per il trasferimento
        di dati negli USA.
      </p>

      <h2>3. Registrazione e account utente</h2>
      <p>
        Quando crei un account, trattiamo il tuo indirizzo e-mail e la tua password
        crittografata (con hash). I dati vengono memorizzati su <strong>Supabase Inc.</strong>{' '}
        (server nell'UE).
      </p>
      <p>Base giuridica: art. 6 par. 1 lett. b) GDPR (esecuzione del contratto).</p>
      <p>
        Periodo di conservazione: fino alla cancellazione del tuo account. Puoi richiedere
        la cancellazione in qualsiasi momento via e-mail a{' '}
        <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>.
      </p>

      <h2>4. Ordini ed elaborazione dei pagamenti</h2>
      <p>Per ogni ordine trattiamo:</p>
      <ul>
        <li>il tuo indirizzo e-mail (per la conferma dell'ordine e il contatto)</li>
        <li>per i prodotti fisici: nome e indirizzo di consegna (per la spedizione)</li>
        <li>il contenuto dell'ordine, inclusa la configurazione del poster (per la produzione e la consegna)</li>
      </ul>
      <p>
        L'<strong>elaborazione dei pagamenti</strong> avviene esclusivamente tramite{' '}
        <strong>Stripe Payments Europe Ltd.</strong> (Dublino, Irlanda). I dati della carta
        o le coordinate bancarie vengono raccolti direttamente da Stripe e non ci sono mai
        noti. Stripe è certificato PCI-DSS. Informativa sulla privacy di Stripe:{' '}
        <a href="https://stripe.com/it/privacy" target="_blank" rel="noopener noreferrer">
          stripe.com/it/privacy
        </a>
        .
      </p>
      <p>
        Base giuridica: art. 6 par. 1 lett. b) GDPR (esecuzione del contratto) e art. 6
        par. 1 lett. c) GDPR (obblighi legali di conservazione fiscale e commerciale).
      </p>
      <p>
        Periodo di conservazione: i dati degli ordini vengono conservati secondo i termini
        di legge (6 o 10 anni secondo il codice fiscale tedesco (AO) e il codice di commercio
        tedesco (HGB)).
      </p>

      <h2>5. Comunicazione via e-mail</h2>
      <p>
        Per l'invio di e-mail transazionali (conferma d'ordine, notifica di spedizione)
        utilizziamo <strong>Resend (Inbound Technology Inc.)</strong>, USA. Il tuo indirizzo
        e-mail e il contenuto dell'e-mail vengono trasmessi a Resend.
      </p>
      <p>
        Con Resend è stato concluso un accordo sul trattamento dei dati e le clausole
        contrattuali standard dell'UE per il trasferimento di dati negli USA. Informativa
        sulla privacy:{' '}
        <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
          resend.com/legal/privacy-policy
        </a>
        .
      </p>
      <p>Base giuridica: art. 6 par. 1 lett. b) GDPR (esecuzione del contratto).</p>

      <h2>6. Dati cartografici e di localizzazione</h2>
      <p>
        Per la visualizzazione di mappe e la ricerca di luoghi utilizziamo il servizio{' '}
        <strong>MapTiler AG</strong>, Baarerstrasse 10, 6300 Zugo, Svizzera. Quando viene
        caricata una mappa, il tuo indirizzo IP ed eventuali query di ricerca vengono
        trasmessi a MapTiler.
      </p>
      <p>
        La Svizzera dispone di una decisione di adeguatezza dell'UE (art. 45 GDPR).
      </p>
      <p>
        Informativa sulla privacy di MapTiler:{' '}
        <a href="https://www.maptiler.com/privacy-policy/" target="_blank" rel="noopener noreferrer">
          maptiler.com/privacy-policy
        </a>
        .
      </p>
      <p>
        Base giuridica: art. 6 par. 1 lett. b) GDPR (esecuzione del contratto) e art. 6
        par. 1 lett. f) GDPR (interesse legittimo a una visualizzazione cartografica
        funzionante).
      </p>

      <h2>7. Gestione dei contenuti</h2>
      <p>
        I nostri contenuti editoriali (blog, FAQ, Chi siamo) sono gestiti con{' '}
        <strong>Sanity.io</strong> (Sanity AS, Rosenkrantzgaten 11, 0159 Oslo, Norvegia).
        Quando visiti le nostre pagine di contenuto, dati tecnici di richiesta vengono
        trasmessi a Sanity. La Norvegia dispone di una decisione di adeguatezza dell'UE.
      </p>
      <p>
        Informativa sulla privacy di Sanity:{' '}
        <a href="https://www.sanity.io/legal/privacy" target="_blank" rel="noopener noreferrer">
          sanity.io/legal/privacy
        </a>
        .
      </p>

      <h2>8. Cookie e archiviazione locale</h2>
      <p>
        I cookie strettamente necessari e l'archiviazione locale (accesso, carrello, bozze
        di poster) sono sempre utilizzati. I cookie di analisi e marketing vengono caricati
        solo dopo il tuo <strong>consenso esplicito</strong> tramite il banner dei cookie.
        Puoi revocare il consenso in qualsiasi momento tramite il link «Impostazioni
        cookie» nel piè di pagina. Dettagli nella nostra{' '}
        <a href="/cookie-richtlinie">politica sui cookie</a>.
      </p>
      <p>
        Base giuridica per i cookie necessari: § 25 c. 2 n. 2 TTDSG e art. 6 par. 1 lett.
        f) GDPR. Base giuridica per i cookie di analisi e marketing: § 25 c. 1 TTDSG e
        art. 6 par. 1 lett. a) GDPR (consenso).
      </p>

      <h2>9. Google Tag Manager</h2>
      <p>
        Utilizziamo <strong>Google Tag Manager</strong> di Google Ireland Limited, Gordon
        House, Barrow Street, Dublino 4, Irlanda. Tag Manager stesso non raccoglie dati
        personali; serve esclusivamente a gestire i tag di analisi e marketing che usiamo.
        Li carica solo se hai dato il tuo consenso.
      </p>

      <h2>10. Google Analytics 4</h2>
      <p>
        Con il tuo consenso utilizziamo <strong>Google Analytics 4</strong> (Google Ireland
        Limited) per analizzare statisticamente l'uso del nostro sito. Vengono trattati dati
        di utilizzo pseudonimizzati (ad esempio pagine visitate, clic, informazioni sul
        dispositivo). Gli indirizzi IP vengono troncati da Google prima della memorizzazione.
      </p>
      <p>
        Google può inoltre trasferire i dati negli USA. Sono in vigore le clausole
        contrattuali standard dell'UE ai sensi dell'art. 46 GDPR.
      </p>
      <p>
        Base giuridica: art. 6 par. 1 lett. a) GDPR (consenso), § 25 c. 1 TTDSG.
      </p>
      <p>
        Periodo di conservazione: massimo 14 mesi. Informativa sulla privacy:{' '}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          policies.google.com/privacy
        </a>
        . Puoi revocare il consenso in qualsiasi momento tramite il banner dei cookie.
      </p>

      <h2>11. I tuoi diritti</h2>
      <p>Hai sempre il diritto di:</p>
      <ul>
        <li><strong>accedere</strong> ai dati memorizzati su di te (art. 15 GDPR)</li>
        <li><strong>rettificare</strong> i dati inesatti (art. 16 GDPR)</li>
        <li>
          <strong>cancellare</strong> i tuoi dati (art. 17 GDPR), salvo obblighi di
          conservazione di legge contrari
        </li>
        <li><strong>limitare il trattamento</strong> (art. 18 GDPR)</li>
        <li><strong>portabilità dei dati</strong> (art. 20 GDPR)</li>
        <li><strong>opporti</strong> al trattamento (art. 21 GDPR)</li>
      </ul>
      <p>
        Per qualsiasi richiesta, scrivici a{' '}
        <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>.
      </p>

      <h2>12. Diritto di reclamo</h2>
      <p>
        Hai il diritto di presentare un reclamo a un'autorità di controllo per la protezione
        dei dati. L'autorità competente per noi è:
      </p>
      <p>
        Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)<br />
        Promenade 18, 91522 Ansbach, Germania<br />
        <a href="https://www.lda.bayern.de" target="_blank" rel="noopener noreferrer">
          www.lda.bayern.de
        </a>
      </p>

      <h2>13. Nessun processo decisionale automatizzato</h2>
      <p>
        Non utilizziamo processi decisionali automatizzati né profilazione ai sensi
        dell'art. 22 GDPR.
      </p>

      <h2>14. Aggiornamenti di questa informativa</h2>
      <p>
        Ci riserviamo il diritto di modificare la presente informativa sulla privacy per
        adeguarla a cambiamenti normativi o a modifiche dei nostri servizi. La versione
        attuale è sempre disponibile su questa pagina.
      </p>
    </>
  )
}

function PrivacyES() {
  return (
    <>
      <h2>1. Responsable del tratamiento</h2>
      <p>
        El responsable del tratamiento en el sentido del RGPD y de otras leyes nacionales
        de protección de datos es:
      </p>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 Múnich<br />
        Alemania<br />
        Correo: <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
      </p>
      <p>Representada por el administrador Daniel Woyteczek.</p>

      <h2>2. Alojamiento y prestación del sitio</h2>
      <p>
        Nuestro sitio está alojado por <strong>Vercel Inc.</strong>, 440 N Barranca Ave
        #4133, Covina, CA 91723, EE. UU. Al acceder al sitio, los siguientes datos se
        registran automáticamente en los registros del servidor: dirección IP, fecha y hora
        de acceso, volumen de datos transferido, URL de referencia, agente de usuario. Estos
        datos son técnicamente necesarios y se eliminan automáticamente tras un breve plazo.
      </p>
      <p>
        Base jurídica: art. 6 ap. 1 f) RGPD (interés legítimo en un funcionamiento estable
        y seguro).
      </p>
      <p>
        Con Vercel se ha celebrado un contrato de encargo de tratamiento (DPA) conforme al
        art. 28 RGPD y las cláusulas contractuales tipo de la UE para la transferencia de
        datos a EE. UU.
      </p>

      <h2>3. Registro y cuenta de usuario</h2>
      <p>
        Cuando creas una cuenta, tratamos tu correo electrónico y tu contraseña cifrada
        (hash). Los datos se almacenan en <strong>Supabase Inc.</strong> (servidores en la
        UE).
      </p>
      <p>Base jurídica: art. 6 ap. 1 b) RGPD (ejecución del contrato).</p>
      <p>
        Plazo de conservación: hasta la eliminación de tu cuenta. Puedes solicitar la
        eliminación en cualquier momento por correo a{' '}
        <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>.
      </p>

      <h2>4. Pedidos y procesamiento de pagos</h2>
      <p>En cada pedido tratamos:</p>
      <ul>
        <li>tu correo electrónico (para confirmación del pedido y contacto)</li>
        <li>para productos físicos: nombre y dirección de envío (para el envío)</li>
        <li>el contenido de tu pedido, incluida la configuración del póster (para producción y entrega)</li>
      </ul>
      <p>
        El <strong>procesamiento de pagos</strong> se realiza exclusivamente a través de{' '}
        <strong>Stripe Payments Europe Ltd.</strong> (Dublín, Irlanda). Los datos de tarjeta
        o las coordenadas bancarias son recopilados directamente por Stripe y nunca son
        conocidos por nosotros. Stripe está certificado por PCI-DSS. Política de privacidad
        de Stripe:{' '}
        <a href="https://stripe.com/es/privacy" target="_blank" rel="noopener noreferrer">
          stripe.com/es/privacy
        </a>
        .
      </p>
      <p>
        Base jurídica: art. 6 ap. 1 b) RGPD (ejecución del contrato) y art. 6 ap. 1 c) RGPD
        (obligaciones legales de conservación fiscal y mercantil).
      </p>
      <p>
        Plazo de conservación: los datos de los pedidos se conservan según los plazos
        legales (6 o 10 años según el código tributario alemán (AO) y el código de comercio
        alemán (HGB)).
      </p>

      <h2>5. Comunicación por correo electrónico</h2>
      <p>
        Para enviar correos transaccionales (confirmación de pedido, notificación de envío)
        utilizamos <strong>Resend (Inbound Technology Inc.)</strong>, EE. UU. Tu correo
        electrónico y el contenido del correo se transmiten a Resend.
      </p>
      <p>
        Con Resend se ha celebrado un contrato de encargo de tratamiento y las cláusulas
        contractuales tipo de la UE para la transferencia de datos a EE. UU. Política de
        privacidad:{' '}
        <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
          resend.com/legal/privacy-policy
        </a>
        .
      </p>
      <p>Base jurídica: art. 6 ap. 1 b) RGPD (ejecución del contrato).</p>

      <h2>6. Datos cartográficos y de ubicación</h2>
      <p>
        Para mostrar fragmentos de mapa y la búsqueda de lugares utilizamos el servicio{' '}
        <strong>MapTiler AG</strong>, Baarerstrasse 10, 6300 Zug, Suiza. Al cargar un mapa,
        tu dirección IP y, en su caso, las consultas de búsqueda se transmiten a MapTiler.
      </p>
      <p>
        Suiza dispone de una decisión de adecuación de la UE (art. 45 RGPD).
      </p>
      <p>
        Política de privacidad de MapTiler:{' '}
        <a href="https://www.maptiler.com/privacy-policy/" target="_blank" rel="noopener noreferrer">
          maptiler.com/privacy-policy
        </a>
        .
      </p>
      <p>
        Base jurídica: art. 6 ap. 1 b) RGPD (ejecución del contrato) y art. 6 ap. 1 f) RGPD
        (interés legítimo en una visualización cartográfica funcional).
      </p>

      <h2>7. Gestión de contenidos</h2>
      <p>
        Nuestros contenidos editoriales (blog, preguntas frecuentes, Sobre nosotros) se
        gestionan con <strong>Sanity.io</strong> (Sanity AS, Rosenkrantzgaten 11, 0159
        Oslo, Noruega). Al visitar nuestras páginas de contenido, se transmiten datos
        técnicos de solicitud a Sanity. Noruega dispone de una decisión de adecuación de la
        UE.
      </p>
      <p>
        Política de privacidad de Sanity:{' '}
        <a href="https://www.sanity.io/legal/privacy" target="_blank" rel="noopener noreferrer">
          sanity.io/legal/privacy
        </a>
        .
      </p>

      <h2>8. Cookies y almacenamiento local</h2>
      <p>
        Las cookies estrictamente necesarias y el almacenamiento local (inicio de sesión,
        carrito, borradores de póster) se utilizan siempre. Las cookies de análisis y
        marketing solo se cargan tras tu <strong>consentimiento explícito</strong> mediante
        nuestra banner de cookies. Puedes retirar tu consentimiento en cualquier momento a
        través del enlace «Configuración de cookies» en el pie de página. Detalles en
        nuestra <a href="/cookie-richtlinie">política de cookies</a>.
      </p>
      <p>
        Base jurídica para las cookies necesarias: § 25 ap. 2 nº 2 TTDSG y art. 6 ap. 1 f)
        RGPD. Base jurídica para las cookies de análisis y marketing: § 25 ap. 1 TTDSG y
        art. 6 ap. 1 a) RGPD (consentimiento).
      </p>

      <h2>9. Google Tag Manager</h2>
      <p>
        Utilizamos <strong>Google Tag Manager</strong> de Google Ireland Limited, Gordon
        House, Barrow Street, Dublín 4, Irlanda. El propio Tag Manager no recoge datos
        personales; sirve exclusivamente para gestionar las etiquetas de análisis y
        marketing que usamos. Solo las carga si has dado tu consentimiento.
      </p>

      <h2>10. Google Analytics 4</h2>
      <p>
        Con tu consentimiento utilizamos <strong>Google Analytics 4</strong> (Google Ireland
        Limited) para analizar estadísticamente el uso de nuestro sitio. Se tratan datos de
        uso seudonimizados (por ejemplo, páginas visitadas, clics, información del
        dispositivo). Google trunca las direcciones IP antes de almacenarlas.
      </p>
      <p>
        Google también puede transferir los datos a EE. UU. Hay en vigor cláusulas
        contractuales tipo de la UE conforme al art. 46 RGPD.
      </p>
      <p>
        Base jurídica: art. 6 ap. 1 a) RGPD (consentimiento), § 25 ap. 1 TTDSG.
      </p>
      <p>
        Plazo de conservación: máximo 14 meses. Política de privacidad:{' '}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          policies.google.com/privacy
        </a>
        . Puedes retirar tu consentimiento en cualquier momento mediante el banner de
        cookies.
      </p>

      <h2>11. Tus derechos</h2>
      <p>Tienes derecho en cualquier momento a:</p>
      <ul>
        <li><strong>acceder</strong> a los datos almacenados sobre ti (art. 15 RGPD)</li>
        <li><strong>rectificar</strong> datos inexactos (art. 16 RGPD)</li>
        <li>
          <strong>suprimir</strong> tus datos (art. 17 RGPD), salvo obligaciones legales
          de conservación contrarias
        </li>
        <li><strong>limitar el tratamiento</strong> (art. 18 RGPD)</li>
        <li><strong>portabilidad de los datos</strong> (art. 20 RGPD)</li>
        <li><strong>oponerte</strong> al tratamiento (art. 21 RGPD)</li>
      </ul>
      <p>
        Para cualquier consulta, escríbenos a{' '}
        <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>.
      </p>

      <h2>12. Derecho a presentar una reclamación</h2>
      <p>
        Tienes derecho a presentar una reclamación ante una autoridad de control en materia
        de protección de datos. La autoridad competente para nosotros es:
      </p>
      <p>
        Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)<br />
        Promenade 18, 91522 Ansbach, Alemania<br />
        <a href="https://www.lda.bayern.de" target="_blank" rel="noopener noreferrer">
          www.lda.bayern.de
        </a>
      </p>

      <h2>13. Sin decisiones automatizadas</h2>
      <p>
        No utilizamos decisiones automatizadas ni elaboración de perfiles en el sentido
        del art. 22 RGPD.
      </p>

      <h2>14. Actualizaciones de esta política</h2>
      <p>
        Nos reservamos el derecho a modificar esta política de privacidad para adaptarla a
        cambios en la legislación o a cambios en nuestros servicios. La versión actual
        está siempre disponible en esta página.
      </p>
    </>
  )
}

const UPDATED_AT = {
  de: '21. April 2026',
  en: 'April 21, 2026',
  fr: '21 avril 2026',
  it: '21 aprile 2026',
  es: '21 de abril de 2026',
} as const

function renderPrivacy(locale: string) {
  switch (locale) {
    case 'de': return <PrivacyDE />
    case 'fr': return <PrivacyFR />
    case 'it': return <PrivacyIT />
    case 'es': return <PrivacyES />
    default: return <PrivacyEN />
  }
}

export default async function DatenschutzPage() {
  const locale = await getLocale()
  const t = await getTranslations('legal')
  return (
    <LegalLayout
      title={t('privacyTitle')}
      updatedAt={UPDATED_AT[locale as keyof typeof UPDATED_AT] ?? UPDATED_AT.de}
      showCourtesyNotice={locale !== 'de'}
    >
      {renderPrivacy(locale)}
    </LegalLayout>
  )
}

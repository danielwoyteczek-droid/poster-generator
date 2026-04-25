import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { LegalLayout } from '@/components/legal/LegalLayout'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal')
  return {
    title: t('termsTitle'),
    description: t('termsMeta'),
  }
}

function TermsDE() {
  return (
    <>
      <h2>§ 1 Geltungsbereich und Anbieter</h2>
      <p>
        (1) Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge, die zwischen
        der
      </p>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 München<br />
        (nachfolgend „wir" oder „Anbieter")
      </p>
      <p>
        und dem Kunden (nachfolgend „Kunde") über den Online-Shop unter{' '}
        <a href="https://petite-moment.com">petite-moment.com</a> geschlossen werden.
      </p>
      <p>
        (2) Verbraucher im Sinne dieser AGB ist jede natürliche Person, die ein Rechtsgeschäft zu
        Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbständigen
        beruflichen Tätigkeit zugerechnet werden können (§ 13 BGB). Unternehmer ist jede
        natürliche oder juristische Person oder rechtsfähige Personengesellschaft, die bei
        Abschluss eines Rechtsgeschäfts in Ausübung ihrer gewerblichen oder selbständigen
        beruflichen Tätigkeit handelt (§ 14 BGB).
      </p>
      <p>
        (3) Abweichende, entgegenstehende oder ergänzende Allgemeine Geschäftsbedingungen des
        Kunden werden nur dann und insoweit Vertragsbestandteil, als wir ihrer Geltung
        ausdrücklich schriftlich zugestimmt haben.
      </p>

      <h2>§ 2 Vertragsgegenstand</h2>
      <p>
        (1) Wir bieten individuell gestaltbare Poster an, insbesondere Karten- und Sternenposter,
        jeweils in den folgenden Ausprägungen:
      </p>
      <ul>
        <li><strong>Digitaler Download</strong> — PNG- und PDF-Datei in Druckqualität</li>
        <li><strong>Poster</strong> — physischer Druck auf Fotopapier</li>
        <li><strong>Gerahmtes Poster</strong> — physischer Druck im Holzrahmen</li>
      </ul>
      <p>
        (2) Die angebotenen Produkte werden vom Kunden über unseren Editor individuell gestaltet.
        Die finale Gestaltung liegt in der Verantwortung des Kunden.
      </p>

      <h2>§ 3 Vertragsschluss</h2>
      <p>
        (1) Die Darstellung der Produkte in unserem Online-Shop stellt kein rechtlich bindendes
        Angebot, sondern eine Aufforderung zur Abgabe eines Angebotes dar.
      </p>
      <p>
        (2) Durch das Auswählen eines Produkts, Konfiguration im Editor und Bestätigung des
        Kaufvorgangs im Stripe-Checkout gibt der Kunde ein bindendes Angebot zum Abschluss eines
        Kaufvertrages ab.
      </p>
      <p>
        (3) Der Vertrag kommt durch die Bestätigung der Bestellung per E-Mail zustande, die
        unmittelbar nach erfolgreicher Zahlung automatisch versendet wird.
      </p>
      <p>
        (4) Der Vertragstext (Bestelldaten und AGB) wird von uns gespeichert und kann vom Kunden
        jederzeit in seinem Kundenkonto eingesehen werden.
      </p>

      <h2>§ 4 Preise und Versandkosten</h2>
      <p>
        (1) Die auf der Produktseite angegebenen Preise enthalten die gesetzliche
        Mehrwertsteuer und sonstige Preisbestandteile.
      </p>
      <p>
        (2) Versandkosten für physische Produkte werden im Checkout-Vorgang separat ausgewiesen
        und sind vom Kunden zusätzlich zu tragen.
      </p>
      <p>
        (3) Bei digitalen Downloads fallen keine Versandkosten an.
      </p>

      <h2>§ 5 Zahlung</h2>
      <p>
        (1) Die Zahlung erfolgt über den externen Zahlungsdienstleister Stripe Payments Europe
        Ltd., Dublin, Irland. Zur Verfügung stehen insbesondere Zahlung per Kreditkarte (Visa,
        Mastercard, American Express), SEPA-Lastschrift, Apple Pay und Google Pay. Die jeweils
        verfügbaren Zahlungsarten werden im Bestellvorgang angezeigt.
      </p>
      <p>
        (2) Der Kaufpreis ist mit Abschluss der Bestellung sofort zur Zahlung fällig.
      </p>

      <h2>§ 6 Lieferung</h2>
      <p>
        (1) Physische Produkte werden innerhalb Deutschlands, Österreichs und der Schweiz
        versendet. Die Lieferzeit beträgt in der Regel 3–5 Werktage nach Zahlungseingang, kann
        sich aber abhängig vom Zielland und Anbieter des Versandunternehmens verlängern.
      </p>
      <p>
        (2) Digitale Downloads stehen dem Kunden unmittelbar nach Zahlungseingang in seinem
        Kundenkonto bzw. über den in der Bestellbestätigung enthaltenen Link zur Verfügung.
      </p>

      <h2>§ 7 Widerrufsrecht und Ausschluss</h2>
      <p>
        (1) <strong>Ausschluss bei personalisierten Produkten:</strong> Sämtliche von uns
        angebotenen Poster (Stadtposter, Sternenposter sowie die daraus abgeleiteten Produktformen
        Download, Poster, gerahmtes Poster) werden nach der individuellen Konfiguration des Kunden
        angefertigt (Ort, Koordinaten, Datum, Textblöcke, Farben, Form, Rahmengestaltung). Es
        handelt sich jeweils um Waren, die nicht vorgefertigt sind und für deren Herstellung eine
        individuelle Auswahl oder Bestimmung durch den Verbraucher maßgeblich ist bzw. die
        eindeutig auf die persönlichen Bedürfnisse des Verbrauchers zugeschnitten sind. Das
        Widerrufsrecht ist daher gemäß <strong>§ 312g Abs. 2 Nr. 1 BGB ausgeschlossen</strong>.
      </p>
      <p>
        (2) <strong>Vorzeitiges Erlöschen bei digitalen Inhalten:</strong> Soweit ein Kunde einen
        Digital-Download erwirbt, erlischt ein etwaig bestehendes Widerrufsrecht darüber hinaus
        gemäß § 356 Abs. 5 BGB vorzeitig, wenn der Kunde (a) ausdrücklich zugestimmt hat, dass wir
        mit der Ausführung des Vertrags vor Ablauf der Widerrufsfrist beginnen, und (b) seine
        Kenntnis davon bestätigt hat, dass er durch seine Zustimmung mit Beginn der Ausführung
        sein Widerrufsrecht verliert. Diese Zustimmung wird im Checkout-Vorgang explizit
        abgefragt.
      </p>
      <p>
        (3) Einzelheiten zum Ausschluss sowie das Muster-Widerrufsformular für die Fälle, in denen
        ausnahmsweise doch ein Widerrufsrecht besteht, ergeben sich aus unserer{' '}
        <a href="/widerrufsbelehrung">Widerrufsbelehrung</a>.
      </p>
      <p>
        (4) Der Ausschluss des Widerrufsrechts lässt die gesetzlichen Gewährleistungsrechte des
        Kunden (§ 9 dieser AGB) unberührt.
      </p>

      <h2>§ 8 Eigentumsvorbehalt</h2>
      <p>
        Bis zur vollständigen Bezahlung verbleiben gelieferte Waren in unserem Eigentum.
      </p>

      <h2>§ 9 Gewährleistung</h2>
      <p>(1) Es gelten die gesetzlichen Gewährleistungsrechte.</p>
      <p>
        (2) Offensichtliche Mängel sind innerhalb einer angemessenen Frist nach Empfang der Ware
        schriftlich oder per E-Mail anzuzeigen. Die Unterlassung der Anzeige hat für die
        gesetzlichen Rechte des Verbrauchers keine Folgen.
      </p>
      <p>
        (3) Unterschiede zwischen Druckergebnissen und Bildschirmdarstellung können aufgrund
        technischer Gegebenheiten (z.B. Farbprofile unterschiedlicher Monitore) auftreten und
        stellen keinen Mangel dar.
      </p>

      <h2>§ 10 Haftung</h2>
      <p>
        (1) Wir haften unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie für Schäden aus der
        Verletzung des Lebens, des Körpers oder der Gesundheit.
      </p>
      <p>
        (2) Bei leichter Fahrlässigkeit haften wir nur bei der Verletzung wesentlicher
        Vertragspflichten (Kardinalpflichten) und beschränkt auf den vertragstypischen,
        vorhersehbaren Schaden.
      </p>
      <p>
        (3) Eine weitergehende Haftung ist ausgeschlossen. Die Haftung nach dem
        Produkthaftungsgesetz bleibt unberührt.
      </p>

      <h2>§ 11 Urheberrechte</h2>
      <p>
        (1) Mit dem Erwerb eines Posters (physisch oder digital) erwirbt der Kunde ein einfaches,
        nicht übertragbares Nutzungsrecht zur privaten Nutzung. Eine gewerbliche Nutzung,
        Weitergabe oder Vervielfältigung bedarf unserer vorherigen schriftlichen Zustimmung.
      </p>
      <p>
        (2) Der Kunde versichert, dass die von ihm eingegebenen Inhalte (Ortsangaben, Texte) keine
        Rechte Dritter verletzen. Er stellt uns von allen Ansprüchen Dritter frei, die aus einer
        Verletzung dieser Zusicherung resultieren.
      </p>

      <h2>§ 12 Datenschutz</h2>
      <p>
        Die Verarbeitung personenbezogener Daten erfolgt nach Maßgabe unserer{' '}
        <a href="/datenschutz">Datenschutzerklärung</a>.
      </p>

      <h2>§ 13 Online-Streitbeilegung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit:{' '}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>
        . Wir sind nicht bereit oder verpflichtet, an einem Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2>§ 14 Schlussbestimmungen</h2>
      <p>
        (1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
        Bei Verbrauchern gilt diese Rechtswahl nur insoweit, als dadurch nicht der durch
        zwingende Bestimmungen des Rechts des Staates gewährte Schutz entzogen wird, in dem der
        Verbraucher seinen gewöhnlichen Aufenthalt hat.
      </p>
      <p>
        (2) Ausschließlicher Gerichtsstand für alle Streitigkeiten aus diesem Vertrag mit
        Unternehmern ist München.
      </p>
      <p>
        (3) Sollten einzelne Bestimmungen dieses Vertrages unwirksam oder undurchführbar sein
        oder werden, wird dadurch die Wirksamkeit der übrigen Bestimmungen nicht berührt.
      </p>
    </>
  )
}

function TermsEN() {
  return (
    <>
      <h2>§ 1 Scope and provider</h2>
      <p>
        (1) These General Terms and Conditions (T&amp;Cs) apply to all contracts concluded
        between
      </p>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 Munich, Germany<br />
        (hereinafter &quot;we&quot; or &quot;the provider&quot;)
      </p>
      <p>
        and the customer (hereinafter &quot;the customer&quot;) via the online shop at{' '}
        <a href="https://petite-moment.com">petite-moment.com</a>.
      </p>
      <p>
        (2) A consumer within the meaning of these T&amp;Cs is any natural person who concludes
        a legal transaction for purposes that are predominantly outside their trade, business
        or profession (§ 13 BGB). An entrepreneur is any natural or legal person or
        partnership with legal capacity that, when concluding a legal transaction, acts in the
        exercise of its trade, business or profession (§ 14 BGB).
      </p>
      <p>
        (3) Deviating, conflicting or supplementary general terms and conditions of the
        customer become part of the contract only if and to the extent that we have expressly
        agreed to their validity in writing.
      </p>

      <h2>§ 2 Subject matter of the contract</h2>
      <p>
        (1) We offer customisable posters, in particular city and star posters, in the
        following variants:
      </p>
      <ul>
        <li><strong>Digital download</strong> — PNG and PDF file in print quality</li>
        <li><strong>Poster</strong> — physical print on photo paper</li>
        <li><strong>Framed poster</strong> — physical print in a wooden frame</li>
      </ul>
      <p>
        (2) The products on offer are individually configured by the customer using our editor.
        Final design is the customer&apos;s responsibility.
      </p>

      <h2>§ 3 Conclusion of contract</h2>
      <p>
        (1) The presentation of products in our online shop does not constitute a legally
        binding offer but rather an invitation to submit an offer.
      </p>
      <p>
        (2) By selecting a product, configuring it in the editor and confirming the purchase
        in the Stripe checkout, the customer submits a binding offer to conclude a contract
        of sale.
      </p>
      <p>
        (3) The contract is concluded by the order confirmation sent by email automatically
        immediately after successful payment.
      </p>
      <p>
        (4) The contract text (order data and T&amp;Cs) is stored by us and can be viewed by
        the customer at any time in the customer account.
      </p>

      <h2>§ 4 Prices and shipping costs</h2>
      <p>
        (1) The prices stated on the product page include statutory VAT and other price
        components.
      </p>
      <p>
        (2) Shipping costs for physical products are shown separately during checkout and are
        payable by the customer in addition to the purchase price.
      </p>
      <p>
        (3) No shipping costs apply to digital downloads.
      </p>

      <h2>§ 5 Payment</h2>
      <p>
        (1) Payment is processed via the external payment provider Stripe Payments Europe
        Ltd., Dublin, Ireland. Available methods include credit card (Visa, Mastercard,
        American Express), SEPA direct debit, Apple Pay and Google Pay. The methods available
        in each case are shown during checkout.
      </p>
      <p>
        (2) The purchase price is due for payment immediately upon completion of the order.
      </p>

      <h2>§ 6 Delivery</h2>
      <p>
        (1) Physical products are shipped within Germany, Austria and Switzerland. Delivery
        time is generally 3–5 business days after receipt of payment but may be longer
        depending on the destination country and shipping carrier.
      </p>
      <p>
        (2) Digital downloads are made available to the customer immediately after receipt of
        payment in the customer account or via the link contained in the order confirmation.
      </p>

      <h2>§ 7 Right of withdrawal and exclusion</h2>
      <p>
        (1) <strong>Exclusion for personalised products:</strong> All posters offered by us
        (city posters, star posters and the derived product formats: download, poster, framed
        poster) are made according to the customer&apos;s individual configuration (location,
        coordinates, date, text blocks, colors, shape, framing). They are goods that are not
        pre-fabricated and for the production of which an individual selection or
        determination by the consumer is decisive, or which are clearly tailored to the
        personal needs of the consumer. The right of withdrawal is therefore{' '}
        <strong>excluded under § 312g (2) No. 1 BGB</strong>.
      </p>
      <p>
        (2) <strong>Early expiry for digital content:</strong> Where a customer purchases a
        digital download, any right of withdrawal also expires early under § 356 (5) BGB if
        the customer (a) expressly consents to performance starting before the withdrawal
        period expires, and (b) confirms awareness that, by giving consent, they lose their
        right of withdrawal once performance begins. This consent is explicitly requested
        during checkout.
      </p>
      <p>
        (3) Details of the exclusion and the model withdrawal form for cases in which a right
        of withdrawal does exceptionally exist are provided in our{' '}
        <a href="/widerrufsbelehrung">Right of withdrawal</a> page.
      </p>
      <p>
        (4) The exclusion of the right of withdrawal does not affect the customer&apos;s
        statutory warranty rights (§ 9 of these T&amp;Cs).
      </p>

      <h2>§ 8 Retention of title</h2>
      <p>
        Delivered goods remain our property until full payment has been received.
      </p>

      <h2>§ 9 Warranty</h2>
      <p>(1) Statutory warranty rights apply.</p>
      <p>
        (2) Obvious defects must be reported in writing or by email within a reasonable time
        after receipt of the goods. Failure to report has no consequences for the consumer&apos;s
        statutory rights.
      </p>
      <p>
        (3) Differences between print results and on-screen display may occur due to
        technical conditions (e.g. color profiles of different monitors) and do not constitute
        a defect.
      </p>

      <h2>§ 10 Liability</h2>
      <p>
        (1) We are liable without limitation for intent and gross negligence as well as for
        damages arising from injury to life, body or health.
      </p>
      <p>
        (2) In the case of slight negligence, we are liable only for breach of essential
        contractual obligations (cardinal obligations) and limited to the foreseeable damage
        typical of the contract.
      </p>
      <p>
        (3) Any further liability is excluded. Liability under the German Product Liability
        Act remains unaffected.
      </p>

      <h2>§ 11 Copyright</h2>
      <p>
        (1) By purchasing a poster (physical or digital) the customer acquires a simple,
        non-transferable right of use for private use. Commercial use, transfer or
        reproduction requires our prior written consent.
      </p>
      <p>
        (2) The customer warrants that the content they enter (locations, texts) does not
        infringe third-party rights. The customer indemnifies us against any third-party
        claims arising from a breach of this warranty.
      </p>

      <h2>§ 12 Data protection</h2>
      <p>
        Personal data is processed in accordance with our{' '}
        <a href="/datenschutz">privacy policy</a>.
      </p>

      <h2>§ 13 Online dispute resolution</h2>
      <p>
        The European Commission provides a platform for online dispute resolution:{' '}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>
        . We are neither willing nor obliged to participate in dispute resolution proceedings
        before a consumer arbitration board.
      </p>

      <h2>§ 14 Final provisions</h2>
      <p>
        (1) The law of the Federal Republic of Germany applies, excluding the UN Convention
        on Contracts for the International Sale of Goods. For consumers, this choice of law
        applies only to the extent that the protection granted by mandatory provisions of the
        law of the state in which the consumer has their habitual residence is not thereby
        withdrawn.
      </p>
      <p>
        (2) The exclusive place of jurisdiction for all disputes arising from this contract
        with entrepreneurs is Munich.
      </p>
      <p>
        (3) Should individual provisions of this contract be or become invalid or
        unenforceable, the validity of the remaining provisions shall not be affected.
      </p>
    </>
  )
}

export default async function AGBPage() {
  const locale = await getLocale()
  const t = await getTranslations('legal')
  const isEnglish = locale === 'en'
  return (
    <LegalLayout
      title={isEnglish ? 'Terms and Conditions' : 'Allgemeine Geschäftsbedingungen (AGB)'}
      updatedAt={isEnglish ? 'April 20, 2026' : '20. April 2026'}
      showCourtesyNotice={isEnglish}
    >
      {isEnglish ? <TermsEN /> : <TermsDE />}
    </LegalLayout>
  )
}

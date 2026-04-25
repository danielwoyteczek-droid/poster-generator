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

function TermsFR() {
  return (
    <>
      <h2>§ 1 Champ d'application et prestataire</h2>
      <p>
        (1) Les présentes conditions générales de vente (CGV) s'appliquent à tous les
        contrats conclus entre
      </p>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 Munich, Allemagne<br />
        (ci-après « nous » ou « le prestataire »)
      </p>
      <p>
        et le client (ci-après « le client ») via la boutique en ligne{' '}
        <a href="https://petite-moment.com">petite-moment.com</a>.
      </p>
      <p>
        (2) Au sens des présentes CGV, est consommateur toute personne physique qui conclut
        un acte juridique à des fins qui, pour l'essentiel, ne relèvent ni de son activité
        commerciale ni de son activité professionnelle indépendante (§ 13 BGB). Est
        professionnel toute personne physique ou morale ou société de personnes ayant la
        capacité juridique qui, lors de la conclusion d'un acte juridique, agit dans
        l'exercice de son activité commerciale ou professionnelle indépendante (§ 14 BGB).
      </p>
      <p>
        (3) Les conditions générales du client divergentes, contraires ou complémentaires
        ne sont intégrées au contrat que si et dans la mesure où nous avons expressément
        consenti par écrit à leur application.
      </p>

      <h2>§ 2 Objet du contrat</h2>
      <p>
        (1) Nous proposons des affiches personnalisables, en particulier des affiches
        cartographiques et stellaires, dans les variantes suivantes :
      </p>
      <ul>
        <li><strong>Téléchargement numérique</strong> — fichier PNG et PDF en qualité d'impression</li>
        <li><strong>Affiche</strong> — impression physique sur papier photo</li>
        <li><strong>Affiche encadrée</strong> — impression physique avec cadre en bois</li>
      </ul>
      <p>
        (2) Les produits proposés sont configurés individuellement par le client via notre
        éditeur. La conception finale relève de la responsabilité du client.
      </p>

      <h2>§ 3 Conclusion du contrat</h2>
      <p>
        (1) La présentation des produits dans notre boutique en ligne ne constitue pas une
        offre juridiquement contraignante mais une invitation à faire une offre.
      </p>
      <p>
        (2) En sélectionnant un produit, en le configurant dans l'éditeur et en confirmant
        l'achat dans le checkout Stripe, le client soumet une offre contraignante de
        conclusion d'un contrat de vente.
      </p>
      <p>
        (3) Le contrat est conclu par la confirmation de la commande envoyée par e-mail
        automatiquement immédiatement après le paiement réussi.
      </p>
      <p>
        (4) Le texte du contrat (données de commande et CGV) est conservé par nous et peut
        être consulté à tout moment par le client dans son compte.
      </p>

      <h2>§ 4 Prix et frais de livraison</h2>
      <p>
        (1) Les prix indiqués sur la page produit comprennent la TVA légale et les autres
        composantes du prix.
      </p>
      <p>
        (2) Les frais de livraison pour les produits physiques sont indiqués séparément
        lors du paiement et sont à la charge du client en plus du prix d'achat.
      </p>
      <p>
        (3) Aucun frais de livraison ne s'applique aux téléchargements numériques.
      </p>

      <h2>§ 5 Paiement</h2>
      <p>
        (1) Le paiement est traité par le prestataire de paiement externe Stripe Payments
        Europe Ltd., Dublin, Irlande. Les modes disponibles incluent notamment le paiement
        par carte bancaire (Visa, Mastercard, American Express), le prélèvement SEPA, Apple
        Pay et Google Pay. Les modes disponibles sont indiqués lors du paiement.
      </p>
      <p>
        (2) Le prix d'achat est exigible immédiatement à la finalisation de la commande.
      </p>

      <h2>§ 6 Livraison</h2>
      <p>
        (1) Les produits physiques sont expédiés en Allemagne, en Autriche et en Suisse.
        Le délai de livraison est en règle générale de 3 à 5 jours ouvrés après réception
        du paiement, mais peut être plus long selon le pays de destination et le
        transporteur.
      </p>
      <p>
        (2) Les téléchargements numériques sont mis à disposition du client immédiatement
        après réception du paiement dans son compte client ou via le lien contenu dans la
        confirmation de commande.
      </p>

      <h2>§ 7 Droit de rétractation et exclusion</h2>
      <p>
        (1) <strong>Exclusion pour les produits personnalisés :</strong> toutes les affiches
        que nous proposons (affiches de ville, affiches stellaires et les formats dérivés :
        téléchargement, affiche, affiche encadrée) sont fabriquées selon la configuration
        individuelle du client (lieu, coordonnées, date, blocs de texte, couleurs, forme,
        encadrement). Il s'agit dans chaque cas de biens non préfabriqués pour la
        fabrication desquels une sélection ou une décision individuelle du consommateur est
        déterminante, ou qui sont nettement adaptés aux besoins personnels du consommateur.
        Le droit de rétractation est donc{' '}
        <strong>exclu en vertu du § 312g al. 2 n° 1 BGB</strong>.
      </p>
      <p>
        (2) <strong>Expiration anticipée pour les contenus numériques :</strong> lorsqu'un
        client achète un téléchargement numérique, tout éventuel droit de rétractation
        expire en outre par anticipation conformément au § 356 al. 5 BGB lorsque le client
        (a) a expressément consenti à ce que nous commencions l'exécution du contrat avant
        l'expiration du délai de rétractation et (b) a confirmé avoir compris qu'en donnant
        son consentement, il perd son droit de rétractation au début de l'exécution. Ce
        consentement est expressément demandé lors du paiement.
      </p>
      <p>
        (3) Les détails de l'exclusion ainsi que le modèle de formulaire de rétractation
        pour les cas où, à titre exceptionnel, un droit de rétractation existe, figurent
        dans notre <a href="/widerrufsbelehrung">information sur le droit de rétractation</a>.
      </p>
      <p>
        (4) L'exclusion du droit de rétractation n'affecte pas les droits légaux de garantie
        du client (§ 9 des présentes CGV).
      </p>

      <h2>§ 8 Réserve de propriété</h2>
      <p>
        Jusqu'au paiement intégral, les biens livrés restent notre propriété.
      </p>

      <h2>§ 9 Garantie</h2>
      <p>(1) Les droits légaux de garantie s'appliquent.</p>
      <p>
        (2) Les défauts apparents doivent être signalés par écrit ou par e-mail dans un
        délai raisonnable après réception du bien. L'absence de signalement n'a aucune
        conséquence sur les droits légaux du consommateur.
      </p>
      <p>
        (3) Des différences entre le résultat d'impression et l'affichage à l'écran peuvent
        survenir en raison de conditions techniques (par exemple, profils de couleurs des
        différents moniteurs) et ne constituent pas un défaut.
      </p>

      <h2>§ 10 Responsabilité</h2>
      <p>
        (1) Nous sommes responsables sans limitation en cas de dol et de faute lourde, ainsi
        que pour les dommages résultant d'atteintes à la vie, au corps ou à la santé.
      </p>
      <p>
        (2) En cas de négligence légère, nous ne sommes responsables qu'en cas de
        manquement à des obligations contractuelles essentielles (obligations cardinales)
        et limités au dommage prévisible typique du contrat.
      </p>
      <p>
        (3) Toute responsabilité supplémentaire est exclue. La responsabilité au titre de
        la loi allemande sur la responsabilité du fait des produits demeure inchangée.
      </p>

      <h2>§ 11 Droits d'auteur</h2>
      <p>
        (1) Avec l'achat d'une affiche (physique ou numérique), le client acquiert un droit
        d'utilisation simple et non transférable à des fins privées. Toute utilisation
        commerciale, transmission ou reproduction nécessite notre accord écrit préalable.
      </p>
      <p>
        (2) Le client garantit que les contenus qu'il saisit (lieux, textes) ne portent pas
        atteinte aux droits de tiers. Il nous indemnise contre toute prétention de tiers
        résultant d'une violation de cette garantie.
      </p>

      <h2>§ 12 Protection des données</h2>
      <p>
        Le traitement des données à caractère personnel est effectué conformément à notre{' '}
        <a href="/datenschutz">politique de confidentialité</a>.
      </p>

      <h2>§ 13 Règlement en ligne des litiges</h2>
      <p>
        La Commission européenne met à disposition une plateforme de règlement en ligne des
        litiges :{' '}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>
        . Nous ne sommes ni disposés ni tenus de participer à une procédure de règlement
        des litiges devant un organisme de conciliation des consommateurs.
      </p>

      <h2>§ 14 Dispositions finales</h2>
      <p>
        (1) Le droit de la République fédérale d'Allemagne s'applique, à l'exclusion de la
        Convention des Nations unies sur les contrats de vente internationale de
        marchandises. Pour les consommateurs, ce choix de droit ne s'applique que dans la
        mesure où la protection accordée par les dispositions impératives du droit de
        l'État dans lequel le consommateur a sa résidence habituelle n'est pas écartée.
      </p>
      <p>
        (2) Le tribunal exclusivement compétent pour tous les litiges découlant du présent
        contrat avec les professionnels est Munich.
      </p>
      <p>
        (3) Si certaines dispositions du présent contrat sont ou deviennent invalides ou
        inapplicables, la validité des autres dispositions n'en est pas affectée.
      </p>
    </>
  )
}

function TermsIT() {
  return (
    <>
      <h2>§ 1 Ambito di applicazione e fornitore</h2>
      <p>
        (1) Le presenti condizioni generali di vendita (CGV) si applicano a tutti i
        contratti conclusi tra
      </p>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 Monaco di Baviera, Germania<br />
        (di seguito «noi» o «il fornitore»)
      </p>
      <p>
        e il cliente (di seguito «il cliente») tramite il negozio online{' '}
        <a href="https://petite-moment.com">petite-moment.com</a>.
      </p>
      <p>
        (2) Ai sensi delle presenti CGV, è consumatore qualsiasi persona fisica che conclude
        un negozio giuridico per scopi prevalentemente non riconducibili alla propria
        attività commerciale o professionale autonoma (§ 13 BGB). È imprenditore qualsiasi
        persona fisica o giuridica o società di persone con capacità giuridica che, alla
        conclusione di un negozio giuridico, agisce nell'esercizio della propria attività
        commerciale o professionale autonoma (§ 14 BGB).
      </p>
      <p>
        (3) Eventuali condizioni generali del cliente divergenti, contrarie o integrative
        diventano parte del contratto solo se e nella misura in cui abbiamo espressamente
        acconsentito per iscritto alla loro validità.
      </p>

      <h2>§ 2 Oggetto del contratto</h2>
      <p>
        (1) Offriamo poster personalizzabili, in particolare poster cartografici e stellati,
        nelle seguenti varianti:
      </p>
      <ul>
        <li><strong>Download digitale</strong> — file PNG e PDF in qualità di stampa</li>
        <li><strong>Poster</strong> — stampa fisica su carta fotografica</li>
        <li><strong>Poster incorniciato</strong> — stampa fisica con cornice in legno</li>
      </ul>
      <p>
        (2) I prodotti offerti vengono configurati individualmente dal cliente tramite il
        nostro editor. Il design finale è di responsabilità del cliente.
      </p>

      <h2>§ 3 Conclusione del contratto</h2>
      <p>
        (1) La presentazione dei prodotti nel nostro negozio online non costituisce
        un'offerta giuridicamente vincolante, ma un invito a presentare un'offerta.
      </p>
      <p>
        (2) Selezionando un prodotto, configurandolo nell'editor e confermando l'acquisto
        nel checkout Stripe, il cliente presenta un'offerta vincolante per la conclusione
        di un contratto di vendita.
      </p>
      <p>
        (3) Il contratto si conclude con la conferma dell'ordine via e-mail, inviata
        automaticamente subito dopo il pagamento avvenuto con successo.
      </p>
      <p>
        (4) Il testo del contratto (dati dell'ordine e CGV) viene memorizzato da noi e può
        essere consultato in qualsiasi momento dal cliente nel proprio account.
      </p>

      <h2>§ 4 Prezzi e spese di spedizione</h2>
      <p>
        (1) I prezzi indicati sulla pagina prodotto includono l'IVA di legge e altri
        elementi del prezzo.
      </p>
      <p>
        (2) Le spese di spedizione per i prodotti fisici vengono indicate separatamente
        durante il checkout e sono a carico del cliente in aggiunta al prezzo d'acquisto.
      </p>
      <p>
        (3) Per i download digitali non sono previste spese di spedizione.
      </p>

      <h2>§ 5 Pagamento</h2>
      <p>
        (1) Il pagamento avviene tramite il fornitore di servizi di pagamento esterno
        Stripe Payments Europe Ltd., Dublino, Irlanda. Sono disponibili in particolare il
        pagamento con carta di credito (Visa, Mastercard, American Express), addebito
        diretto SEPA, Apple Pay e Google Pay. Le modalità disponibili vengono mostrate
        durante il processo d'ordine.
      </p>
      <p>
        (2) Il prezzo d'acquisto è esigibile immediatamente al completamento dell'ordine.
      </p>

      <h2>§ 6 Consegna</h2>
      <p>
        (1) I prodotti fisici vengono spediti in Germania, Austria e Svizzera. Il tempo di
        consegna è di norma di 3–5 giorni lavorativi dalla ricezione del pagamento, ma può
        essere più lungo a seconda del paese di destinazione e del corriere.
      </p>
      <p>
        (2) I download digitali sono messi a disposizione del cliente immediatamente dopo
        la ricezione del pagamento nel suo account o tramite il link contenuto nella
        conferma d'ordine.
      </p>

      <h2>§ 7 Diritto di recesso ed esclusione</h2>
      <p>
        (1) <strong>Esclusione per i prodotti personalizzati:</strong> tutti i poster da noi
        offerti (poster cartografici, poster stellati e i formati derivati: download,
        poster, poster incorniciato) sono realizzati secondo la configurazione individuale
        del cliente (luogo, coordinate, data, blocchi di testo, colori, forma, cornice).
        Sono in ogni caso beni non prefabbricati, per la cui realizzazione è determinante
        una scelta o decisione individuale del consumatore, o che sono chiaramente adattati
        alle esigenze personali del consumatore. Il diritto di recesso è pertanto{' '}
        <strong>escluso ai sensi del § 312g c. 2 n. 1 BGB</strong>.
      </p>
      <p>
        (2) <strong>Estinzione anticipata per i contenuti digitali:</strong> nel caso in
        cui un cliente acquisti un download digitale, l'eventuale diritto di recesso si
        estingue inoltre anticipatamente ai sensi del § 356 c. 5 BGB se il cliente (a) ha
        espressamente acconsentito a che iniziamo l'esecuzione del contratto prima della
        scadenza del periodo di recesso e (b) ha confermato di sapere che, dando il
        consenso, perde il diritto di recesso dall'inizio dell'esecuzione. Questo consenso
        viene esplicitamente richiesto durante il checkout.
      </p>
      <p>
        (3) I dettagli sull'esclusione e il modulo di recesso tipo per i casi in cui in via
        eccezionale sussiste un diritto di recesso sono indicati nelle nostre{' '}
        <a href="/widerrufsbelehrung">istruzioni di recesso</a>.
      </p>
      <p>
        (4) L'esclusione del diritto di recesso non pregiudica i diritti legali di garanzia
        del cliente (§ 9 delle presenti CGV).
      </p>

      <h2>§ 8 Riserva di proprietà</h2>
      <p>
        Fino al pagamento integrale, i beni consegnati restano di nostra proprietà.
      </p>

      <h2>§ 9 Garanzia</h2>
      <p>(1) Si applicano i diritti legali di garanzia.</p>
      <p>
        (2) Eventuali difetti evidenti devono essere segnalati per iscritto o via e-mail
        entro un termine ragionevole dalla ricezione della merce. La mancata segnalazione
        non ha conseguenze sui diritti legali del consumatore.
      </p>
      <p>
        (3) Differenze tra i risultati di stampa e la visualizzazione a schermo possono
        verificarsi per ragioni tecniche (ad esempio profili colore di monitor diversi) e
        non costituiscono un difetto.
      </p>

      <h2>§ 10 Responsabilità</h2>
      <p>
        (1) Siamo responsabili senza limitazioni in caso di dolo e colpa grave, nonché per
        i danni derivanti dalla lesione della vita, del corpo o della salute.
      </p>
      <p>
        (2) In caso di colpa lieve siamo responsabili solo per la violazione di obblighi
        contrattuali essenziali (obblighi cardinali) e limitatamente al danno tipico e
        prevedibile del contratto.
      </p>
      <p>
        (3) Ogni ulteriore responsabilità è esclusa. Resta impregiudicata la responsabilità
        ai sensi della legge tedesca sulla responsabilità per danno da prodotti.
      </p>

      <h2>§ 11 Diritti d'autore</h2>
      <p>
        (1) Con l'acquisto di un poster (fisico o digitale) il cliente acquisisce un
        diritto d'uso semplice e non trasferibile per uso privato. Qualsiasi uso
        commerciale, trasferimento o riproduzione richiede il nostro previo consenso
        scritto.
      </p>
      <p>
        (2) Il cliente garantisce che i contenuti da lui inseriti (luoghi, testi) non
        violino diritti di terzi. Egli ci tiene indenni da qualsiasi pretesa di terzi
        derivante dalla violazione di tale garanzia.
      </p>

      <h2>§ 12 Protezione dei dati</h2>
      <p>
        Il trattamento dei dati personali avviene secondo quanto previsto dalla nostra{' '}
        <a href="/datenschutz">informativa sulla privacy</a>.
      </p>

      <h2>§ 13 Risoluzione delle controversie online</h2>
      <p>
        La Commissione europea mette a disposizione una piattaforma per la risoluzione
        online delle controversie:{' '}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>
        . Non siamo disposti né obbligati a partecipare a procedure di risoluzione delle
        controversie davanti a un organismo di conciliazione per i consumatori.
      </p>

      <h2>§ 14 Disposizioni finali</h2>
      <p>
        (1) Si applica il diritto della Repubblica Federale di Germania, ad esclusione
        della Convenzione delle Nazioni Unite sui contratti di vendita internazionale di
        merci. Per i consumatori questa scelta di legge si applica solo nella misura in
        cui non venga sottratta la protezione accordata dalle disposizioni inderogabili
        del diritto dello Stato in cui il consumatore ha la propria residenza abituale.
      </p>
      <p>
        (2) Il foro competente esclusivo per tutte le controversie derivanti dal presente
        contratto con imprenditori è Monaco di Baviera.
      </p>
      <p>
        (3) Qualora singole disposizioni del presente contratto siano o divengano nulle o
        inattuabili, la validità delle restanti disposizioni non ne sarà pregiudicata.
      </p>
    </>
  )
}

function TermsES() {
  return (
    <>
      <h2>§ 1 Ámbito de aplicación y proveedor</h2>
      <p>
        (1) Las presentes condiciones generales de venta (CGV) se aplican a todos los
        contratos celebrados entre
      </p>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 Múnich, Alemania<br />
        (en adelante, «nosotros» o «el proveedor»)
      </p>
      <p>
        y el cliente (en adelante, «el cliente») a través de la tienda online{' '}
        <a href="https://petite-moment.com">petite-moment.com</a>.
      </p>
      <p>
        (2) En el sentido de las presentes CGV, es consumidor toda persona física que
        celebra un negocio jurídico con fines que, en su mayor parte, no pueden imputarse
        ni a su actividad comercial ni profesional independiente (§ 13 BGB). Es empresario
        toda persona física o jurídica o sociedad de personas con capacidad jurídica que,
        al celebrar un negocio jurídico, actúa en el ejercicio de su actividad comercial o
        profesional independiente (§ 14 BGB).
      </p>
      <p>
        (3) Las condiciones generales del cliente divergentes, contrarias o
        complementarias solo se incorporan al contrato si y en la medida en que hayamos
        consentido expresamente por escrito su aplicación.
      </p>

      <h2>§ 2 Objeto del contrato</h2>
      <p>
        (1) Ofrecemos pósters personalizables, en particular pósters cartográficos y
        estelares, en las siguientes variantes:
      </p>
      <ul>
        <li><strong>Descarga digital</strong> — archivo PNG y PDF en calidad de impresión</li>
        <li><strong>Póster</strong> — impresión física en papel fotográfico</li>
        <li><strong>Póster enmarcado</strong> — impresión física con marco de madera</li>
      </ul>
      <p>
        (2) Los productos ofertados son configurados individualmente por el cliente a
        través de nuestro editor. El diseño final es responsabilidad del cliente.
      </p>

      <h2>§ 3 Celebración del contrato</h2>
      <p>
        (1) La presentación de los productos en nuestra tienda online no constituye una
        oferta jurídicamente vinculante, sino una invitación a presentar una oferta.
      </p>
      <p>
        (2) Al seleccionar un producto, configurarlo en el editor y confirmar la compra en
        el checkout de Stripe, el cliente presenta una oferta vinculante de celebración de
        un contrato de compraventa.
      </p>
      <p>
        (3) El contrato se perfecciona mediante la confirmación del pedido enviada
        automáticamente por correo electrónico inmediatamente después del pago realizado
        con éxito.
      </p>
      <p>
        (4) El texto del contrato (datos del pedido y CGV) es almacenado por nosotros y
        puede ser consultado en cualquier momento por el cliente en su cuenta.
      </p>

      <h2>§ 4 Precios y gastos de envío</h2>
      <p>
        (1) Los precios indicados en la página del producto incluyen el IVA legal y otros
        componentes del precio.
      </p>
      <p>
        (2) Los gastos de envío para productos físicos se indican por separado durante el
        proceso de pago y corren a cargo del cliente además del precio de compra.
      </p>
      <p>
        (3) En las descargas digitales no se aplican gastos de envío.
      </p>

      <h2>§ 5 Pago</h2>
      <p>
        (1) El pago se realiza a través del proveedor externo de servicios de pago Stripe
        Payments Europe Ltd., Dublín, Irlanda. Están disponibles, en particular, el pago
        con tarjeta de crédito (Visa, Mastercard, American Express), domiciliación SEPA,
        Apple Pay y Google Pay. Los métodos disponibles se muestran durante el proceso de
        pedido.
      </p>
      <p>
        (2) El precio de compra es exigible inmediatamente al finalizar el pedido.
      </p>

      <h2>§ 6 Entrega</h2>
      <p>
        (1) Los productos físicos se envían a Alemania, Austria y Suiza. El plazo de
        entrega es, por regla general, de 3 a 5 días laborables tras la recepción del
        pago, aunque puede ser más largo en función del país de destino y del transportista.
      </p>
      <p>
        (2) Las descargas digitales se ponen a disposición del cliente inmediatamente
        después de la recepción del pago en su cuenta o mediante el enlace contenido en la
        confirmación del pedido.
      </p>

      <h2>§ 7 Derecho de desistimiento y exclusión</h2>
      <p>
        (1) <strong>Exclusión para productos personalizados:</strong> todos los pósters que
        ofrecemos (pósters de ciudad, pósters estelares y los formatos derivados: descarga,
        póster, póster enmarcado) se elaboran según la configuración individual del cliente
        (lugar, coordenadas, fecha, bloques de texto, colores, forma, encuadre). Se trata,
        en cada caso, de bienes no prefabricados para cuya elaboración resulta determinante
        una elección o decisión individual del consumidor, o que están claramente adaptados
        a las necesidades personales del consumidor. El derecho de desistimiento queda, por
        tanto, <strong>excluido conforme al § 312g ap. 2 nº 1 BGB</strong>.
      </p>
      <p>
        (2) <strong>Extinción anticipada para contenidos digitales:</strong> cuando un
        cliente adquiere una descarga digital, cualquier derecho de desistimiento existente
        se extingue además de forma anticipada conforme al § 356 ap. 5 BGB si el cliente
        (a) ha consentido expresamente que comencemos la ejecución del contrato antes de
        la finalización del plazo de desistimiento y (b) ha confirmado tener conocimiento
        de que, al dar su consentimiento, pierde su derecho de desistimiento desde el
        inicio de la ejecución. Este consentimiento se solicita expresamente durante el
        proceso de pago.
      </p>
      <p>
        (3) Los detalles de la exclusión y el modelo de formulario de desistimiento para
        los casos en los que excepcionalmente exista un derecho de desistimiento se
        recogen en nuestra{' '}
        <a href="/widerrufsbelehrung">información sobre el derecho de desistimiento</a>.
      </p>
      <p>
        (4) La exclusión del derecho de desistimiento no afecta a los derechos legales de
        garantía del cliente (§ 9 de las presentes CGV).
      </p>

      <h2>§ 8 Reserva de propiedad</h2>
      <p>
        Hasta el pago íntegro, los bienes entregados permanecen en nuestra propiedad.
      </p>

      <h2>§ 9 Garantía</h2>
      <p>(1) Se aplican los derechos legales de garantía.</p>
      <p>
        (2) Los defectos evidentes deben comunicarse por escrito o por correo electrónico
        dentro de un plazo razonable tras la recepción de la mercancía. La omisión de
        dicha comunicación no tiene consecuencias para los derechos legales del consumidor.
      </p>
      <p>
        (3) Pueden producirse diferencias entre los resultados de impresión y la
        visualización en pantalla por motivos técnicos (por ejemplo, perfiles de color de
        diferentes monitores) y no constituyen un defecto.
      </p>

      <h2>§ 10 Responsabilidad</h2>
      <p>
        (1) Respondemos sin limitación por dolo y negligencia grave, así como por daños
        derivados de la lesión a la vida, el cuerpo o la salud.
      </p>
      <p>
        (2) En caso de negligencia leve solo respondemos por el incumplimiento de
        obligaciones contractuales esenciales (obligaciones cardinales) y limitadamente al
        daño previsible típico del contrato.
      </p>
      <p>
        (3) Cualquier responsabilidad adicional queda excluida. La responsabilidad
        conforme a la Ley alemana de responsabilidad por productos defectuosos permanece
        intacta.
      </p>

      <h2>§ 11 Derechos de autor</h2>
      <p>
        (1) Con la adquisición de un póster (físico o digital) el cliente obtiene un
        derecho de uso simple, intransferible, para uso privado. Cualquier uso comercial,
        transmisión o reproducción requiere nuestro consentimiento previo por escrito.
      </p>
      <p>
        (2) El cliente garantiza que los contenidos por él introducidos (lugares, textos)
        no infringen derechos de terceros. Nos exime de cualquier reclamación de terceros
        derivada de la infracción de esta garantía.
      </p>

      <h2>§ 12 Protección de datos</h2>
      <p>
        El tratamiento de los datos personales se rige por nuestra{' '}
        <a href="/datenschutz">política de privacidad</a>.
      </p>

      <h2>§ 13 Resolución de litigios en línea</h2>
      <p>
        La Comisión Europea ofrece una plataforma para la resolución de litigios en línea:{' '}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
          https://ec.europa.eu/consumers/odr/
        </a>
        . No estamos dispuestos ni obligados a participar en procedimientos de resolución
        de litigios ante una entidad de arbitraje de consumo.
      </p>

      <h2>§ 14 Disposiciones finales</h2>
      <p>
        (1) Se aplica el Derecho de la República Federal de Alemania, con exclusión de la
        Convención de las Naciones Unidas sobre los Contratos de Compraventa Internacional
        de Mercaderías. Para los consumidores, esta elección de Derecho solo se aplica en
        la medida en que no se prive de la protección concedida por las disposiciones
        imperativas del Derecho del Estado en el que el consumidor tiene su residencia
        habitual.
      </p>
      <p>
        (2) El fuero exclusivo para todos los litigios derivados del presente contrato con
        empresarios es Múnich.
      </p>
      <p>
        (3) Si alguna disposición del presente contrato fuera o llegara a ser inválida o
        inaplicable, la validez de las restantes disposiciones no se verá afectada.
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

const TERMS_TITLE = {
  de: 'Allgemeine Geschäftsbedingungen (AGB)',
  en: 'Terms and Conditions',
  fr: 'Conditions générales de vente',
  it: 'Termini e condizioni',
  es: 'Términos y condiciones',
} as const

function renderTerms(locale: string) {
  switch (locale) {
    case 'de': return <TermsDE />
    case 'fr': return <TermsFR />
    case 'it': return <TermsIT />
    case 'es': return <TermsES />
    default: return <TermsEN />
  }
}

export default async function AGBPage() {
  const locale = await getLocale()
  return (
    <LegalLayout
      title={TERMS_TITLE[locale as keyof typeof TERMS_TITLE] ?? TERMS_TITLE.de}
      updatedAt={UPDATED_AT[locale as keyof typeof UPDATED_AT] ?? UPDATED_AT.de}
      showCourtesyNotice={locale !== 'de'}
    >
      {renderTerms(locale)}
    </LegalLayout>
  )
}

import type { Metadata } from 'next'
import { getLocale, getTranslations } from 'next-intl/server'
import { LegalLayout } from '@/components/legal/LegalLayout'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('legal')
  return {
    title: t('withdrawalTitle'),
    description: t('withdrawalMeta'),
  }
}

function WithdrawalDE() {
  return (
    <>
      <p>
        Verbraucher haben bei Abschluss eines Fernabsatzgeschäfts grundsätzlich ein gesetzliches
        Widerrufsrecht. <strong>Wichtiger Hinweis für unsere Produkte:</strong> Da alle bei uns
        angebotenen Poster individuell nach deinen Vorgaben (Ort, Datum, Textblöcke, Design)
        angefertigt werden, besteht für diese Produkte <strong>kein Widerrufsrecht</strong> (siehe
        Abschnitt „Ausschluss des Widerrufsrechts"). Die nachfolgende allgemeine Belehrung gilt
        daher nur für Bestellungen, die nicht unter die dort genannten Ausnahmen fallen.
      </p>

      <h2>Widerrufsrecht</h2>
      <p>
        Du hast das Recht, binnen <strong>vierzehn Tagen</strong> ohne Angabe von Gründen diesen
        Vertrag zu widerrufen.
      </p>
      <p>
        Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag,
      </p>
      <ul>
        <li>
          an dem du oder ein von dir benannter Dritter, der nicht der Beförderer ist, die Waren in
          Besitz genommen hat bzw. hat (bei physischen Produkten),
        </li>
        <li>
          an dem der Vertrag geschlossen wurde (bei digitalen Inhalten — vorbehaltlich des
          vorzeitigen Erlöschens, siehe unten).
        </li>
      </ul>
      <p>
        Um dein Widerrufsrecht auszuüben, musst du uns
      </p>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 München<br />
        E-Mail: <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
      </p>
      <p>
        mittels einer eindeutigen Erklärung (z.B. ein mit der Post versandter Brief oder eine
        E-Mail) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafür
        das untenstehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
      </p>
      <p>
        Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung
        des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.
      </p>

      <h2>Folgen des Widerrufs</h2>
      <p>
        Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir erhalten
        haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich
        daraus ergeben, dass du eine andere Art der Lieferung als die von uns angebotene,
        günstigste Standardlieferung gewählt hast), unverzüglich und spätestens binnen{' '}
        <strong>vierzehn Tagen</strong> ab dem Tag zurückzuzahlen, an dem die Mitteilung über
        deinen Widerruf dieses Vertrags bei uns eingegangen ist.
      </p>
      <p>
        Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der ursprünglichen
        Transaktion eingesetzt hast, es sei denn, mit dir wurde ausdrücklich etwas anderes
        vereinbart; in keinem Fall werden dir wegen dieser Rückzahlung Entgelte berechnet.
      </p>
      <p>
        Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben oder
        bis du den Nachweis erbracht hast, dass du die Waren zurückgesandt hast, je nachdem,
        welches der frühere Zeitpunkt ist.
      </p>
      <p>
        Du hast die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab dem
        Tag, an dem du uns über den Widerruf dieses Vertrags unterrichtest, an uns
        zurückzusenden. Die Frist ist gewahrt, wenn du die Waren vor Ablauf der Frist von
        vierzehn Tagen absendest. Du trägst die unmittelbaren Kosten der Rücksendung der Waren.
      </p>
      <p>
        Du musst für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser Wertverlust
        auf einen zur Prüfung der Beschaffenheit, Eigenschaften und Funktionsweise der Waren
        nicht notwendigen Umgang mit ihnen zurückzuführen ist.
      </p>

      <h2>Ausschluss des Widerrufsrechts</h2>
      <p>
        Das Widerrufsrecht besteht nicht bzw. erlischt vorzeitig in den folgenden Fällen:
      </p>

      <h3>1. Personalisierte / individuell angefertigte Waren (§ 312g Abs. 2 Nr. 1 BGB)</h3>
      <p>
        Das Widerrufsrecht besteht nicht bei Verträgen über die Lieferung von Waren, die nicht
        vorgefertigt sind und für deren Herstellung eine individuelle Auswahl oder Bestimmung
        durch den Verbraucher maßgeblich ist oder die eindeutig auf die persönlichen Bedürfnisse
        des Verbrauchers zugeschnitten sind.
      </p>
      <p>
        <strong>Diese Ausnahme greift bei uns für sämtliche Poster-Produkte</strong> (Stadtposter,
        Sternenposter, Poster und gerahmte Poster in allen Formaten), da diese stets nach deiner
        individuellen Konfiguration (Ort, Koordinaten, Datum, Textblöcke, Farben, Form,
        Rahmengestaltung) angefertigt und erst nach deinem Kaufabschluss produziert werden.
      </p>

      <h3>2. Digitale Inhalte (§ 356 Abs. 5 BGB)</h3>
      <p>
        Das Widerrufsrecht erlischt bei Verträgen über die Lieferung von nicht auf einem
        körperlichen Datenträger befindlichen digitalen Inhalten (Download) vorzeitig, sobald wir
        mit der Ausführung des Vertrags begonnen haben, nachdem du (a) ausdrücklich zugestimmt
        hast, dass wir mit der Ausführung vor Ablauf der Widerrufsfrist beginnen, und (b) deine
        Kenntnis davon bestätigt hast, dass du durch deine Zustimmung mit Beginn der Ausführung
        dein Widerrufsrecht verlierst. Diese Zustimmung wird im Checkout-Vorgang explizit
        abgefragt.
      </p>
      <p>
        Da Digital-Downloads darüber hinaus ebenfalls individuell nach deinen Vorgaben generiert
        werden, greift unabhängig davon bereits die Ausnahme nach Ziffer 1.
      </p>

      <h3>Hinweis zu Gewährleistungsrechten</h3>
      <p>
        Der Ausschluss des Widerrufsrechts lässt deine gesetzlichen{' '}
        <strong>Gewährleistungsrechte</strong> unberührt. Solltest du ein fehlerhaft gedrucktes,
        beschädigtes oder mangelhaft geliefertes Produkt erhalten, melde dich bitte unter{' '}
        <a href="mailto:love@petite-moment.com">love@petite-moment.com</a> — wir finden eine
        Lösung (in der Regel kostenloser Neudruck bzw. Nachdruck des digitalen Exports).
      </p>

      <h2>Muster-Widerrufsformular</h2>
      <p>
        Wenn du den Vertrag widerrufen willst, dann fülle bitte dieses Formular aus und sende es
        zurück:
      </p>
      <blockquote>
        <p>
          An<br />
          UMOI GmbH<br />
          Seefelder Straße 4<br />
          81377 München<br />
          E-Mail: <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
        </p>
        <p>
          Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über den
          Kauf der folgenden Waren (*) / die Erbringung der folgenden Dienstleistung (*):
        </p>
        <p>
          ___________________________________________<br /><br />
          — Bestellt am (*) / erhalten am (*): ___________________________________________<br /><br />
          — Name des/der Verbraucher(s): ___________________________________________<br /><br />
          — Anschrift des/der Verbraucher(s): ___________________________________________<br /><br />
          — Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier): _______________<br /><br />
          — Datum: ___________
        </p>
        <p>(*) Unzutreffendes streichen.</p>
      </blockquote>

      <p>
        Ende der Widerrufsbelehrung.
      </p>
    </>
  )
}

function WithdrawalEN() {
  return (
    <>
      <p>
        Consumers generally have a statutory right of withdrawal when concluding a distance
        sales contract. <strong>Important note for our products:</strong> Because all posters
        offered here are individually made to your specifications (location, date, text blocks,
        design), <strong>no right of withdrawal exists</strong> for these products (see
        section &quot;Exclusion of the right of withdrawal&quot;). The general instructions below
        therefore only apply to orders that do not fall under those exceptions.
      </p>

      <h2>Right of withdrawal</h2>
      <p>
        You have the right to withdraw from this contract within{' '}
        <strong>fourteen days</strong> without giving any reason.
      </p>
      <p>
        The withdrawal period is fourteen days from the day:
      </p>
      <ul>
        <li>
          on which you, or a third party named by you who is not the carrier, took possession of
          the goods (for physical products),
        </li>
        <li>
          on which the contract was concluded (for digital content — subject to the early
          expiry described below).
        </li>
      </ul>
      <p>
        To exercise the right of withdrawal, you must inform us
      </p>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 Munich, Germany<br />
        Email: <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
      </p>
      <p>
        of your decision to withdraw from this contract by an unequivocal statement (e.g. a
        letter sent by post or an email). You may use the model withdrawal form below, but it
        is not mandatory.
      </p>
      <p>
        To meet the withdrawal deadline, it is sufficient for you to send your communication
        concerning the exercise of the right of withdrawal before the withdrawal period has
        expired.
      </p>

      <h2>Effects of withdrawal</h2>
      <p>
        If you withdraw from this contract, we will reimburse all payments received from you,
        including delivery costs (except for the supplementary costs arising if you chose a
        type of delivery other than the least expensive standard delivery offered by us),
        without undue delay and at the latest within{' '}
        <strong>fourteen days</strong> from the day on which we received your notice of
        withdrawal.
      </p>
      <p>
        We will use the same means of payment as you used for the original transaction, unless
        you have expressly agreed otherwise; in any case, you will not incur any fees as a
        result of such reimbursement.
      </p>
      <p>
        We may withhold reimbursement until we have received the goods back or you have
        supplied evidence of having sent them back, whichever is earlier.
      </p>
      <p>
        You shall send back the goods or hand them over to us without undue delay and in any
        event no later than fourteen days from the day on which you communicate your
        withdrawal from this contract to us. The deadline is met if you send back the goods
        before the period of fourteen days has expired. You will bear the direct cost of
        returning the goods.
      </p>
      <p>
        You are only liable for any diminished value of the goods resulting from handling
        other than what is necessary to establish the nature, characteristics and functioning
        of the goods.
      </p>

      <h2>Exclusion of the right of withdrawal</h2>
      <p>
        The right of withdrawal does not exist or expires early in the following cases:
      </p>

      <h3>1. Personalized / custom-made goods (§ 312g (2) No. 1 BGB)</h3>
      <p>
        The right of withdrawal does not exist for contracts for the supply of goods that are
        not pre-fabricated and for the production of which an individual selection or
        determination by the consumer is decisive, or which are clearly tailored to the
        personal needs of the consumer.
      </p>
      <p>
        <strong>This exception applies to all our poster products</strong> (city posters, star
        posters, posters and framed posters in all formats), as they are always made to your
        individual configuration (location, coordinates, date, text blocks, colors, shape,
        framing) and only produced after you complete your purchase.
      </p>

      <h3>2. Digital content (§ 356 (5) BGB)</h3>
      <p>
        The right of withdrawal expires for contracts for the supply of digital content not
        delivered on a physical medium (download) as soon as we have begun performing the
        contract, after you have (a) expressly consented to performance starting before the
        withdrawal period expires, and (b) confirmed your awareness that by giving consent you
        lose your right of withdrawal once performance begins. This consent is explicitly
        requested during checkout.
      </p>
      <p>
        Since digital downloads are also generated according to your individual specifications,
        the exception under No. 1 above applies independently in any case.
      </p>

      <h3>Note on warranty rights</h3>
      <p>
        The exclusion of the right of withdrawal does not affect your statutory{' '}
        <strong>warranty rights</strong>. Should you receive a misprinted, damaged or defective
        product, please contact us at{' '}
        <a href="mailto:love@petite-moment.com">love@petite-moment.com</a> — we will find a
        solution (typically a free reprint or re-issue of the digital export).
      </p>

      <h2>Model withdrawal form</h2>
      <p>
        If you wish to withdraw from the contract, please complete and return this form:
      </p>
      <blockquote>
        <p>
          To<br />
          UMOI GmbH<br />
          Seefelder Straße 4<br />
          81377 Munich, Germany<br />
          Email: <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
        </p>
        <p>
          I/We (*) hereby give notice that I/we (*) withdraw from my/our (*) contract for the
          sale of the following goods (*) / for the provision of the following service (*):
        </p>
        <p>
          ___________________________________________<br /><br />
          — Ordered on (*) / received on (*): ___________________________________________<br /><br />
          — Name of consumer(s): ___________________________________________<br /><br />
          — Address of consumer(s): ___________________________________________<br /><br />
          — Signature of consumer(s) (only if this form is notified on paper): _______________<br /><br />
          — Date: ___________
        </p>
        <p>(*) Delete as appropriate.</p>
      </blockquote>

      <p>
        End of withdrawal instructions.
      </p>
    </>
  )
}

function WithdrawalFR() {
  return (
    <>
      <p>
        Les consommateurs disposent en principe d'un droit légal de rétractation pour les
        contrats à distance. <strong>Note importante concernant nos produits :</strong>{' '}
        toutes les affiches que nous proposons étant fabriquées individuellement selon vos
        spécifications (lieu, date, blocs de texte, design), <strong>aucun droit de
        rétractation n'existe</strong> pour ces produits (voir la section « Exclusion du
        droit de rétractation »). Les instructions générales ci-dessous ne s'appliquent donc
        qu'aux commandes ne relevant pas de ces exceptions.
      </p>

      <h2>Droit de rétractation</h2>
      <p>
        Vous avez le droit de vous rétracter du présent contrat sans donner de motif dans un
        délai de <strong>quatorze jours</strong>.
      </p>
      <p>
        Le délai de rétractation expire quatorze jours après le jour :
      </p>
      <ul>
        <li>
          où vous-même, ou un tiers désigné par vous autre que le transporteur, prenez
          physiquement possession des biens (pour les produits physiques),
        </li>
        <li>
          de la conclusion du contrat (pour les contenus numériques — sous réserve de
          l'expiration anticipée décrite ci-dessous).
        </li>
      </ul>
      <p>
        Pour exercer le droit de rétractation, vous devez nous notifier à
      </p>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 Munich, Allemagne<br />
        E-mail : <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
      </p>
      <p>
        votre décision de rétractation du présent contrat au moyen d'une déclaration dénuée
        d'ambiguïté (par exemple, lettre envoyée par la poste ou e-mail). Vous pouvez
        utiliser le modèle de formulaire de rétractation ci-dessous, mais ce n'est pas
        obligatoire.
      </p>
      <p>
        Pour que le délai de rétractation soit respecté, il suffit que vous envoyiez votre
        communication relative à l'exercice du droit de rétractation avant l'expiration du
        délai.
      </p>

      <h2>Effets de la rétractation</h2>
      <p>
        En cas de rétractation de votre part du présent contrat, nous vous rembourserons
        tous les paiements reçus de vous, y compris les frais de livraison (à l'exception
        des frais supplémentaires découlant du fait que vous avez choisi un mode de
        livraison autre que le mode moins coûteux de livraison standard proposé par nous),
        sans retard excessif et, en tout état de cause, au plus tard{' '}
        <strong>quatorze jours</strong> à compter du jour où nous sommes informés de votre
        décision de rétractation.
      </p>
      <p>
        Nous procéderons au remboursement en utilisant le même moyen de paiement que celui
        que vous avez utilisé pour la transaction initiale, sauf accord exprès contraire de
        votre part ; en tout état de cause, ce remboursement n'occasionnera pas de frais
        pour vous.
      </p>
      <p>
        Nous pouvons différer le remboursement jusqu'à réception des biens ou jusqu'à ce que
        vous ayez fourni une preuve d'expédition des biens, la date retenue étant celle du
        premier de ces faits.
      </p>
      <p>
        Vous devrez renvoyer ou remettre les biens, sans retard excessif et, en tout état
        de cause, au plus tard quatorze jours après que vous nous aurez communiqué votre
        décision de rétractation. Ce délai est respecté si vous renvoyez les biens avant
        l'expiration du délai de quatorze jours. Vous devrez prendre en charge les frais
        directs de renvoi des biens.
      </p>
      <p>
        Votre responsabilité n'est engagée qu'à l'égard de la dépréciation des biens
        résultant de manipulations autres que celles nécessaires pour établir la nature, les
        caractéristiques et le bon fonctionnement de ces biens.
      </p>

      <h2>Exclusion du droit de rétractation</h2>
      <p>
        Le droit de rétractation n'existe pas ou expire prématurément dans les cas suivants :
      </p>

      <h3>1. Biens personnalisés / faits sur mesure (§ 312g al. 2 n° 1 BGB)</h3>
      <p>
        Le droit de rétractation n'existe pas pour les contrats portant sur la fourniture de
        biens qui ne sont pas préfabriqués et pour la fabrication desquels une sélection ou
        une décision individuelle du consommateur est déterminante, ou qui sont nettement
        adaptés aux besoins personnels du consommateur.
      </p>
      <p>
        <strong>Cette exception s'applique à toutes nos affiches</strong> (affiches de ville,
        affiches stellaires, affiches et affiches encadrées dans tous les formats), car
        elles sont toujours fabriquées selon votre configuration individuelle (lieu,
        coordonnées, date, blocs de texte, couleurs, forme, encadrement) et produites
        uniquement après finalisation de votre achat.
      </p>

      <h3>2. Contenus numériques (§ 356 al. 5 BGB)</h3>
      <p>
        Le droit de rétractation expire pour les contrats portant sur la fourniture d'un
        contenu numérique non livré sur un support matériel (téléchargement) dès que nous
        avons commencé l'exécution du contrat, après que vous ayez (a) expressément consenti
        à ce que l'exécution commence avant l'expiration du délai de rétractation et (b)
        confirmé avoir conscience qu'en donnant votre consentement, vous perdez votre droit
        de rétractation dès le début de l'exécution. Ce consentement est expressément demandé
        lors du paiement.
      </p>
      <p>
        Comme les téléchargements numériques sont également générés selon vos spécifications
        individuelles, l'exception du point 1 ci-dessus s'applique de toute façon.
      </p>

      <h3>Note sur les droits de garantie</h3>
      <p>
        L'exclusion du droit de rétractation n'affecte pas vos{' '}
        <strong>droits légaux de garantie</strong>. Si vous recevez un produit mal imprimé,
        endommagé ou défectueux, contactez-nous à{' '}
        <a href="mailto:love@petite-moment.com">love@petite-moment.com</a> — nous trouverons
        une solution (généralement une réimpression gratuite ou une réémission de l'export
        numérique).
      </p>

      <h2>Modèle de formulaire de rétractation</h2>
      <p>
        Si vous souhaitez vous rétracter du contrat, veuillez compléter et renvoyer le
        présent formulaire :
      </p>
      <blockquote>
        <p>
          À<br />
          UMOI GmbH<br />
          Seefelder Straße 4<br />
          81377 Munich, Allemagne<br />
          E-mail : <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
        </p>
        <p>
          Je/Nous (*) vous notifie/notifions (*) par la présente ma/notre (*) rétractation du
          contrat portant sur la vente du bien (*) / pour la prestation de services (*)
          ci-dessous :
        </p>
        <p>
          ___________________________________________<br /><br />
          — Commandé le (*) / reçu le (*) : ___________________________________________<br /><br />
          — Nom du/des consommateur(s) : ___________________________________________<br /><br />
          — Adresse du/des consommateur(s) : ___________________________________________<br /><br />
          — Signature du/des consommateur(s) (uniquement en cas de notification papier) : _______________<br /><br />
          — Date : ___________
        </p>
        <p>(*) Biffer la mention inutile.</p>
      </blockquote>

      <p>
        Fin de l'instruction sur la rétractation.
      </p>
    </>
  )
}

function WithdrawalIT() {
  return (
    <>
      <p>
        I consumatori dispongono in linea di principio di un diritto legale di recesso per i
        contratti a distanza. <strong>Avviso importante per i nostri prodotti:</strong>{' '}
        poiché tutti i poster da noi offerti sono realizzati individualmente in base alle tue
        specifiche (luogo, data, blocchi di testo, design), per questi prodotti{' '}
        <strong>non sussiste alcun diritto di recesso</strong> (vedi la sezione «Esclusione
        del diritto di recesso»). Le istruzioni generali che seguono si applicano pertanto
        solo agli ordini che non rientrano in tali eccezioni.
      </p>

      <h2>Diritto di recesso</h2>
      <p>
        Hai il diritto di recedere dal presente contratto entro{' '}
        <strong>quattordici giorni</strong> senza fornire alcuna motivazione.
      </p>
      <p>
        Il periodo di recesso è di quattordici giorni dal giorno:
      </p>
      <ul>
        <li>
          in cui tu o un terzo da te designato (diverso dal vettore) acquisti il possesso
          fisico dei beni (per i prodotti fisici),
        </li>
        <li>
          in cui è stato concluso il contratto (per i contenuti digitali — fatta salva
          l'estinzione anticipata descritta sotto).
        </li>
      </ul>
      <p>
        Per esercitare il diritto di recesso devi informarci a
      </p>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 Monaco di Baviera, Germania<br />
        E-mail: <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
      </p>
      <p>
        della tua decisione di recedere dal presente contratto mediante una dichiarazione
        esplicita (ad esempio, lettera inviata per posta o e-mail). Puoi utilizzare il
        modulo di recesso tipo riportato sotto, ma non è obbligatorio.
      </p>
      <p>
        Per rispettare il termine di recesso è sufficiente che tu invii la comunicazione
        relativa all'esercizio del diritto di recesso prima della scadenza del termine.
      </p>

      <h2>Effetti del recesso</h2>
      <p>
        Se recediti dal presente contratto, ti rimborseremo tutti i pagamenti ricevuti da
        te, comprese le spese di consegna (ad eccezione dei costi supplementari derivanti
        dalla tua scelta di un tipo di consegna diverso dal tipo meno costoso di consegna
        standard da noi offerto), senza indebito ritardo e in ogni caso entro{' '}
        <strong>quattordici giorni</strong> dal giorno in cui siamo informati della tua
        decisione di recedere.
      </p>
      <p>
        Effettueremo tale rimborso utilizzando lo stesso mezzo di pagamento da te utilizzato
        per la transazione iniziale, salvo che tu non abbia espressamente concordato
        diversamente; in ogni caso non sosterrai alcun costo a seguito di tale rimborso.
      </p>
      <p>
        Possiamo trattenere il rimborso fino al ricevimento dei beni o finché non avrai
        fornito la prova di averli rispediti, a seconda di quale evento si verifichi prima.
      </p>
      <p>
        Devi rispedirci i beni senza indebito ritardo e in ogni caso entro quattordici giorni
        dal giorno in cui ci comunichi il recesso dal presente contratto. Il termine è
        rispettato se invii i beni prima della scadenza del termine di quattordici giorni.
        Le spese dirette di restituzione dei beni sono a tuo carico.
      </p>
      <p>
        Sei responsabile soltanto della diminuzione del valore dei beni risultante da una
        manipolazione diversa da quella necessaria per stabilire la natura, le
        caratteristiche e il funzionamento dei beni.
      </p>

      <h2>Esclusione del diritto di recesso</h2>
      <p>
        Il diritto di recesso non sussiste o si estingue anticipatamente nei seguenti casi:
      </p>

      <h3>1. Beni personalizzati / realizzati su misura (§ 312g c. 2 n. 1 BGB)</h3>
      <p>
        Il diritto di recesso non sussiste per i contratti relativi alla fornitura di beni
        che non sono prefabbricati e per la cui realizzazione è determinante una scelta o
        decisione individuale del consumatore, o che sono chiaramente adattati alle
        esigenze personali del consumatore.
      </p>
      <p>
        <strong>Questa eccezione si applica a tutti i nostri prodotti poster</strong>{' '}
        (poster cartografici, poster stellati e i formati derivati: download, poster, poster
        incorniciato), poiché sono sempre realizzati secondo la tua configurazione
        individuale (luogo, coordinate, data, blocchi di testo, colori, forma, cornice) e
        prodotti solo dopo il completamento dell'acquisto.
      </p>

      <h3>2. Contenuti digitali (§ 356 c. 5 BGB)</h3>
      <p>
        Il diritto di recesso si estingue per i contratti relativi alla fornitura di
        contenuti digitali non forniti su supporto materiale (download) non appena abbiamo
        iniziato l'esecuzione del contratto, dopo che tu (a) abbia espressamente acconsentito
        a che l'esecuzione inizi prima della scadenza del termine di recesso e (b) abbia
        confermato di sapere che, dando il consenso, perdi il diritto di recesso dal momento
        in cui inizia l'esecuzione. Tale consenso viene esplicitamente richiesto durante il
        checkout.
      </p>
      <p>
        Poiché i download digitali sono comunque generati secondo le tue specifiche
        individuali, l'eccezione di cui al punto 1 si applica in ogni caso indipendentemente.
      </p>

      <h3>Nota sui diritti di garanzia</h3>
      <p>
        L'esclusione del diritto di recesso non pregiudica i tuoi{' '}
        <strong>diritti legali di garanzia</strong>. Se ricevi un prodotto stampato male,
        danneggiato o difettoso, contattaci all'indirizzo{' '}
        <a href="mailto:love@petite-moment.com">love@petite-moment.com</a> — troveremo una
        soluzione (di solito una ristampa gratuita o una nuova esportazione digitale).
      </p>

      <h2>Modulo di recesso tipo</h2>
      <p>
        Se desideri recedere dal contratto, compila e restituisci il presente modulo:
      </p>
      <blockquote>
        <p>
          A<br />
          UMOI GmbH<br />
          Seefelder Straße 4<br />
          81377 Monaco di Baviera, Germania<br />
          E-mail: <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
        </p>
        <p>
          Con la presente io/noi (*) notifico/notifichiamo (*) il recesso dal mio/nostro (*)
          contratto di vendita dei seguenti beni (*) / per la prestazione del seguente
          servizio (*):
        </p>
        <p>
          ___________________________________________<br /><br />
          — Ordinato il (*) / ricevuto il (*): ___________________________________________<br /><br />
          — Nome del/dei consumatore(i): ___________________________________________<br /><br />
          — Indirizzo del/dei consumatore(i): ___________________________________________<br /><br />
          — Firma del/dei consumatore(i) (solo se il presente modulo è notificato su carta): _______________<br /><br />
          — Data: ___________
        </p>
        <p>(*) Cancellare la voce inutile.</p>
      </blockquote>

      <p>
        Fine delle istruzioni di recesso.
      </p>
    </>
  )
}

function WithdrawalES() {
  return (
    <>
      <p>
        Los consumidores disponen, en principio, de un derecho legal de desistimiento al
        celebrar un contrato a distancia. <strong>Aviso importante sobre nuestros
        productos:</strong> dado que todos los pósters que ofrecemos se fabrican
        individualmente según tus especificaciones (lugar, fecha, bloques de texto, diseño),
        para estos productos <strong>no existe derecho de desistimiento</strong> (consulta
        la sección «Exclusión del derecho de desistimiento»). Las instrucciones generales
        que siguen solo se aplican, por tanto, a los pedidos que no entren dentro de dichas
        excepciones.
      </p>

      <h2>Derecho de desistimiento</h2>
      <p>
        Tienes derecho a desistir del presente contrato en un plazo de{' '}
        <strong>catorce días</strong> sin necesidad de justificación.
      </p>
      <p>
        El plazo de desistimiento expirará a los catorce días del día:
      </p>
      <ul>
        <li>
          en que tú o un tercero por ti indicado, distinto del transportista, adquiera la
          posesión material de los bienes (para los productos físicos),
        </li>
        <li>
          de la celebración del contrato (para los contenidos digitales — sujeto a la
          extinción anticipada descrita más abajo).
        </li>
      </ul>
      <p>
        Para ejercer el derecho de desistimiento, deberás notificarnos a
      </p>
      <p>
        UMOI GmbH<br />
        Seefelder Straße 4<br />
        81377 Múnich, Alemania<br />
        Correo: <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
      </p>
      <p>
        tu decisión de desistir del contrato a través de una declaración inequívoca (por
        ejemplo, una carta enviada por correo postal o un correo electrónico). Podrás
        utilizar el modelo de formulario de desistimiento que figura a continuación, aunque
        su uso no es obligatorio.
      </p>
      <p>
        Para cumplir el plazo de desistimiento, basta con que la comunicación relativa al
        ejercicio por tu parte de este derecho sea enviada antes de que expire el plazo
        correspondiente.
      </p>

      <h2>Consecuencias del desistimiento</h2>
      <p>
        En caso de desistimiento por tu parte, te devolveremos todos los pagos recibidos,
        incluidos los gastos de envío (con la excepción de los gastos adicionales resultantes
        de la elección por tu parte de una modalidad de envío diferente a la modalidad menos
        costosa de envío ordinario que ofrezcamos), sin demora indebida y, en todo caso, a
        más tardar <strong>catorce días</strong> a partir de la fecha en la que se nos
        informe de tu decisión de desistir.
      </p>
      <p>
        Procederemos a efectuar dicho reembolso utilizando el mismo medio de pago empleado
        por ti para la transacción inicial, a no ser que hayas dispuesto expresamente lo
        contrario; en todo caso, no incurrirás en ningún gasto como consecuencia del
        reembolso.
      </p>
      <p>
        Podremos retener el reembolso hasta haber recibido los bienes, o hasta que hayas
        presentado una prueba de la devolución de los mismos, según qué condición se cumpla
        primero.
      </p>
      <p>
        Deberás devolvernos o entregarnos directamente los bienes sin demora indebida y, en
        cualquier caso, a más tardar en el plazo de catorce días a partir de la fecha en
        que nos comuniques tu decisión de desistir. Se considerará cumplido el plazo si
        efectúas la devolución antes de que el periodo de catorce días haya finalizado.
        Deberás asumir el coste directo de devolución de los bienes.
      </p>
      <p>
        Solo serás responsable de la disminución de valor de los bienes resultante de una
        manipulación distinta a la necesaria para establecer la naturaleza, las
        características y el funcionamiento de los bienes.
      </p>

      <h2>Exclusión del derecho de desistimiento</h2>
      <p>
        El derecho de desistimiento no existe o se extingue anticipadamente en los siguientes
        casos:
      </p>

      <h3>1. Bienes personalizados / hechos a medida (§ 312g ap. 2 nº 1 BGB)</h3>
      <p>
        No existe derecho de desistimiento en los contratos relativos al suministro de bienes
        que no estén prefabricados y para cuya elaboración resulte determinante una elección
        o decisión individual del consumidor, o que estén claramente adaptados a las
        necesidades personales del consumidor.
      </p>
      <p>
        <strong>Esta excepción se aplica a todos nuestros productos de póster</strong>{' '}
        (pósters de ciudad, pósters estelares y los formatos derivados: descarga, póster,
        póster enmarcado), ya que se elaboran siempre según tu configuración individual
        (lugar, coordenadas, fecha, bloques de texto, colores, forma, encuadre) y solo se
        producen tras la finalización de la compra.
      </p>

      <h3>2. Contenidos digitales (§ 356 ap. 5 BGB)</h3>
      <p>
        El derecho de desistimiento se extingue en los contratos relativos al suministro de
        contenidos digitales no entregados en un soporte físico (descarga) tan pronto como
        hayamos comenzado la ejecución del contrato, después de que tú (a) hayas otorgado
        expresamente tu consentimiento a que la ejecución comience antes de que finalice el
        plazo de desistimiento y (b) hayas confirmado tener conocimiento de que, al otorgar
        tu consentimiento, pierdes el derecho de desistimiento desde el inicio de la
        ejecución. Este consentimiento se solicita expresamente durante el proceso de pago.
      </p>
      <p>
        Dado que las descargas digitales también se generan según tus especificaciones
        individuales, en cualquier caso se aplica de forma independiente la excepción del
        punto 1.
      </p>

      <h3>Nota sobre los derechos de garantía</h3>
      <p>
        La exclusión del derecho de desistimiento no afecta a tus{' '}
        <strong>derechos legales de garantía</strong>. Si recibes un producto mal impreso,
        dañado o defectuoso, contáctanos en{' '}
        <a href="mailto:love@petite-moment.com">love@petite-moment.com</a> — encontraremos
        una solución (normalmente una reimpresión gratuita o una nueva exportación digital).
      </p>

      <h2>Modelo de formulario de desistimiento</h2>
      <p>
        Si deseas desistir del contrato, cumplimenta y devuelve el presente formulario:
      </p>
      <blockquote>
        <p>
          A la atención de<br />
          UMOI GmbH<br />
          Seefelder Straße 4<br />
          81377 Múnich, Alemania<br />
          Correo: <a href="mailto:love@petite-moment.com">love@petite-moment.com</a>
        </p>
        <p>
          Por la presente le comunico/comunicamos (*) que desisto/desistimos (*) de mi/nuestro
          (*) contrato de venta de los siguientes bienes (*) / de prestación del siguiente
          servicio (*):
        </p>
        <p>
          ___________________________________________<br /><br />
          — Pedido el (*) / recibido el (*): ___________________________________________<br /><br />
          — Nombre del/de los consumidor(es): ___________________________________________<br /><br />
          — Domicilio del/de los consumidor(es): ___________________________________________<br /><br />
          — Firma del/de los consumidor(es) (solo si el presente formulario se notifica en papel): _______________<br /><br />
          — Fecha: ___________
        </p>
        <p>(*) Táchese lo que no proceda.</p>
      </blockquote>

      <p>
        Fin de la información sobre el derecho de desistimiento.
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

function renderWithdrawal(locale: string) {
  switch (locale) {
    case 'de': return <WithdrawalDE />
    case 'fr': return <WithdrawalFR />
    case 'it': return <WithdrawalIT />
    case 'es': return <WithdrawalES />
    default: return <WithdrawalEN />
  }
}

export default async function WiderrufsbelehrungPage() {
  const locale = await getLocale()
  const t = await getTranslations('legal')
  return (
    <LegalLayout
      title={t('withdrawalTitle')}
      updatedAt={UPDATED_AT[locale as keyof typeof UPDATED_AT] ?? UPDATED_AT.de}
      showCourtesyNotice={locale !== 'de'}
    >
      {renderWithdrawal(locale)}
    </LegalLayout>
  )
}

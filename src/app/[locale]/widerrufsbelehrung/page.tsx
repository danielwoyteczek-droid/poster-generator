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

export default async function WiderrufsbelehrungPage() {
  const locale = await getLocale()
  const t = await getTranslations('legal')
  const isEnglish = locale === 'en'
  return (
    <LegalLayout
      title={t('withdrawalTitle')}
      updatedAt={isEnglish ? 'April 20, 2026' : '20. April 2026'}
      showCourtesyNotice={isEnglish}
    >
      {isEnglish ? <WithdrawalEN /> : <WithdrawalDE />}
    </LegalLayout>
  )
}

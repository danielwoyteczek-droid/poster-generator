import type { Metadata } from 'next'
import { LegalLayout } from '@/components/legal/LegalLayout'

export const metadata: Metadata = {
  title: 'Widerrufsbelehrung',
  description: 'Widerrufsbelehrung und Muster-Widerrufsformular für Bestellungen bei petite-moment.com.',
}

export default function WiderrufsbelehrungPage() {
  return (
    <LegalLayout title="Widerrufsbelehrung" updatedAt="20. April 2026">
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
    </LegalLayout>
  )
}

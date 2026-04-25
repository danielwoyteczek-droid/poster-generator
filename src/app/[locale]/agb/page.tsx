import type { Metadata } from 'next'
import { LegalLayout } from '@/components/legal/LegalLayout'

export const metadata: Metadata = {
  title: 'Allgemeine Geschäftsbedingungen',
  description: 'AGB der UMOI GmbH für den Vertrieb individueller Karten- und Sternenposter über petite-moment.com.',
}

export default function AGBPage() {
  return (
    <LegalLayout title="Allgemeine Geschäftsbedingungen (AGB)" updatedAt="20. April 2026">
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
    </LegalLayout>
  )
}

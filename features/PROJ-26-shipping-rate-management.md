# PROJ-26: Versandkosten

## Status: Architected
**Created:** 2026-04-26
**Last Updated:** 2026-08-11

> **Neu zugeschnitten am 2026-08-11.** Die ursprüngliche Fassung plante eine
> Tarif-Matrix Land × Produkt × Format mit Admin-Oberfläche, Bulk-Edit,
> Entwurf/Veröffentlicht-Status und Gratis-Versand-Schwellen pro Land. Das
> wurde nie gebaut und ist für den heutigen Bedarf zu groß. Ersetzt durch ein
> Modell mit zwei Zonen und drei Versandarten, gepflegt in Stripe. Die alte
> Fassung steht in der Git-Historie.

## Problem & Ziel

Heute werden **gar keine Versandkosten berechnet.** Der Checkout fragt bei
physischen Produkten eine Lieferadresse ab (DE, AT, CH), übergibt aber nie
`shipping_options` an Stripe. Der Versand ist also im Produktpreis enthalten —
was bei einem DTF-Bogen für 4,99 € und rund 1,80 € Inlandsporto die Marge
auffrisst und bei Auslandsbestellungen zum Verlustgeschäft wird.

Ziel ist eine Versandkostenberechnung, die zum tatsächlichen Versandweg passt,
ohne eine Verwaltungsoberfläche zu bauen, die niemand braucht.

## Produktentscheidungen

| Thema | Entscheidung |
|---|---|
| Zonen | **Zwei.** Inland (DE) und EU-Ausland. Die Schweiz entfällt — Zoll und Einfuhrumsatzsteuer lohnen den Aufwand nicht |
| Versandarten | **Drei.** Brief, Kleinpaket, Paket |
| Tarifpflege | **In Stripe** als Shipping Rates. Beträge im Dashboard änderbar ohne Deploy, wie bei den Produktpreisen. Im Code stehen nur die IDs |
| Zuordnung | **Größtes Format im Warenkorb bestimmt die Versandart.** Eine Regel, die auch in einem Jahr noch nachvollziehbar ist |
| EU-Ausland | **Immer Paket, 9,99 €.** Pauschal, unabhängig vom Inhalt. Mischpreis über Kleinpaket- und Paketsendungen |
| Freibetrag | **49 € im Inland, keiner im EU-Ausland** |
| Schalter | **Global an/aus.** Erlaubt eine Gratis-Versand-Aktion ohne Code-Änderung |

### Tarife

| Zone | Versandart | Preis |
|---|---|---|
| Inland | Brief | 2,50 € |
| Inland | Kleinpaket | 3,99 € |
| Inland | Paket | 5,99 € |
| EU-Ausland | Paket | 9,99 € |

### Zuordnung im Inland

| Warenkorbinhalt | Versandart |
|---|---|
| Nur Download | kein Versand |
| DTF A4, bis 10 Bögen | Brief |
| DTF A4, mehr als 10 Bögen | Kleinpaket |
| DTF A3 | Kleinpaket |
| DTF 40 × 50 | Paket |
| Poster ohne Rahmen | Kleinpaket |
| Poster mit Rahmen | Paket |
| Gemischt | die teuerste zutreffende Art |

**Warum A3 kein Brief ist:** Großbrief und Maxibrief sind auf 353 × 250 mm
begrenzt. A4 (210 × 297) passt, A3 (297 × 420) überschreitet die Länge um fast
sieben Zentimeter. Falten scheidet bei DTF aus — Knickkanten beschädigen den
Transfer. Also gerollt, und eine Rolle ist kein Brief.

**Warum eine Stückzahlgrenze beim Brief:** Ein Maxibrief darf 1000 g und 50 mm.
DTF-Folie ist dünn, rechnerisch ginge mehr; ab einem gewissen Stapel wird es am
Schalter aber zur Diskussion. Zehn ist konservativ und deckt den Normalfall.

### Lieferländer

Inland: DE. EU-Ausland: AT, NL, BE, LU, FR, IT, ES, PL, DK, CZ.

Die Liste steht im Code und lässt sich jederzeit erweitern — sie ist kein
Feature, sondern eine Konstante.

## Dependencies
- **Requires:** PROJ-6 (Stripe-Bezahlsystem) — Tarife gehen als `shipping_options` in die Checkout-Session
- **Betrifft:** PROJ-55 (DTF) — erste Produktart, bei der die Versandart vom Format abhängt

## User Stories

- Als Kunde möchte ich vor dem Sprung zu Stripe sehen, was der Versand kostet,
  sodass mich der Endbetrag nicht überrascht.
- Als Kunde mit einem reinen Download-Warenkorb möchte ich keine Versandkosten
  berechnet bekommen.
- Als Kunde möchte ich sehen, wie viel mir noch zum kostenfreien Versand fehlt,
  sodass ich entscheiden kann, ob ich etwas ergänze.
- Als Kunde im EU-Ausland möchte ich wissen, dass geliefert wird und was es
  kostet, bevor ich meine Adresse eingebe.
- Als Betreiber möchte ich die Beträge in Stripe ändern können, ohne dass ein
  Deploy nötig ist.
- Als Betreiber möchte ich Versandkosten zeitweise abschalten können, sodass
  eine Gratis-Versand-Aktion keine Code-Änderung braucht.

## Acceptance Criteria

### Berechnung
- [ ] Die Versandart ergibt sich aus dem größten Format im Warenkorb, nach der
      Tabelle oben.
- [ ] Reine Download-Warenkörbe erzeugen keine Versandkosten und keine
      Adressabfrage.
- [ ] Im EU-Ausland gilt unabhängig vom Inhalt der Paket-Tarif.
- [ ] Erreicht der Warenkorbwert im Inland 49 €, entfällt der Versand.
- [ ] Ist der globale Schalter aus, entfällt der Versand in beiden Zonen.
- [ ] Die Auflage einer Position beeinflusst die Versandart nur über die
      Stückzahlgrenze beim Brief, nicht über den Preis.

### Warenkorb
- [ ] Der Kunde wählt sein Lieferland im Warenkorb, vorbelegt aus der Locale.
- [ ] Versandart und -kosten werden mit dem Gesamtbetrag angezeigt.
- [ ] Liegt der Warenkorb unter dem Freibetrag, wird der fehlende Betrag
      genannt.
- [ ] Bei reinen Downloads erscheint keine Länderauswahl.

### Checkout
- [ ] Die Session bekommt **genau einen** Versandtarif — den berechneten.
- [ ] Die Adressabfrage ist auf das im Warenkorb gewählte Land beschränkt, damit
      Gezahltes und Geliefertes zusammenpassen.
- [ ] Fehlt die Stripe-ID für einen Tarif, wird ohne Versandkosten
      fortgefahren statt die Bestellung abzubrechen.

## Edge Cases

- **Kunde wechselt das Land nach der Berechnung.** Die Anzeige aktualisiert
  sich; maßgeblich ist der Stand beim Klick auf „Zur Kasse".
- **Warenkorb aus Download und physischem Produkt.** Versand fällt an, der
  Download bleibt unberücksichtigt.
- **Warenkorbwert überschreitet den Freibetrag erst durch einen Gutschein.**
  Maßgeblich ist der Wert vor Rabatt — sonst finanziert ein Gutschein
  zusätzlich den Versand.
- **Zehn A4-Bögen plus ein A3-Bogen.** A3 gewinnt, also Kleinpaket.
- **Stripe-Tarif im Dashboard deaktiviert.** Checkout läuft ohne
  Versandkosten weiter, der Vorfall wird protokolliert.

## Non-Goals

- Keine Admin-Oberfläche für Tarife — die Beträge liegen in Stripe.
- Keine Tarife pro Land innerhalb der EU-Zone.
- Keine Gewichts- oder Volumenberechnung.
- Keine Schweiz, kein Vereinigtes Königreich, kein Übersee.

## Offene Punkte

- Die vier Stripe-Shipping-Rate-IDs (`shr_…`) müssen angelegt und im Code
  eingetragen werden.
- Der EU-Pauschalpreis von 9,99 € liegt unter den realen Kosten für entfernte
  Länder (Frankreich, Italien rund 16–18 €). Bewusst als Mischpreis gewählt;
  bei steigendem EU-Anteil neu zu bewerten.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_Zuschnitt vom 2026-08-11 — Umsetzung erfolgt direkt, siehe Implementierung._

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

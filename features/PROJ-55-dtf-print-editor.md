# PROJ-55: DTF-Print-Editor (Kunden-Motive auf Transferbogen)

## Status: Planned
**Created:** 2026-08-10
**Last Updated:** 2026-08-10

## Kontext

Ein neuer Produkttyp neben Poster und Download: **DTF-Transferdrucke** (Direct-to-Film).
Der Kunde bringt sein eigenes Motiv mit — es wird nichts gestaltet, nichts kartografiert.
Er lädt Bilder hoch und ergänzt sie bei Bedarf um eigene Texte, verteilt beides auf einem
Transferbogen, wählt Format und Auflage, gibt den Druck frei und bestellt. Wir drucken den
Bogen selbst und versenden ihn.

Das unterscheidet DTF grundlegend von allen bestehenden Editoren: Es gibt kein Design-
Ergebnis, das wir erzeugen, sondern eine **Druckvorlage, die der Kunde verantwortet**.
Deshalb ist die verbindliche Druckfreigabe kein Komfort-Feature, sondern der rechtliche
Kern des Produkts.

Die Freigabe erfolgt **einmalig am Ende des Bestellvorgangs**, unmittelbar vor dem
Bezahlen — nicht pro Bogen im Editor. Damit kann der Kunde beliebig oft zurückgehen und
Änderungen vornehmen, ohne eine bereits erteilte Freigabe zu entwerten. Bestätigt wird
genau der Stand, der im Moment des Bezahlens im Warenkorb liegt.

### Zwei getrennte Mengen-Achsen

Ein häufiges Missverständnis, daher explizit:

- **Bögen (Seiten):** Unterschiedliche Motiv-Anordnungen. Bogen 1 trägt andere Bilder
  als Bogen 2. Jeder Bogen hat sein eigenes Format.
- **Auflage pro Bogen:** Derselbe Bogen wird n-mal identisch gedruckt.

Beispiel: 2 Bögen, Bogen 1 = A4 in 3-facher Auflage, Bogen 2 = A3 in 1-facher Auflage
→ 4 gedruckte Bögen, 2 verschiedene Motivanordnungen.

## Dependencies
- **Requires:** PROJ-3 (Poster-Export) — Render-Pipeline für die druckfertige Ausgabe
- **Requires:** PROJ-5 (Projekt-Verwaltung) — DTF-Entwürfe werden als Projekt gespeichert
- **Requires:** PROJ-6 (Stripe-Bezahlsystem) — drei neue Produkte im bestehenden Checkout
- **Requires:** PROJ-10 (Admin-Bestellverwaltung) — Druck-PDFs pro Bogen im Fulfillment
- **Requires:** PROJ-19 / PROJ-32 (Foto-Integration, Foto-Poster-Editor) — vorhandene
  Upload-Infrastruktur und `user_photos`-Bucket
- **Requires:** PROJ-26 (Versandkosten-Management) — DTF ist ein physisches Produkt
- **Related:** PROJ-48 (Tier-Pricing) — Produktmodell in `src/lib/products.ts` wird erweitert

## Produktentscheidungen

| Thema | Entscheidung |
|---|---|
| Formate | **A4**, **A3**, **40 × 50 cm** — drei neue Stripe-Produkte |
| Dateitypen | **PNG und JPG**. Bei JPG sichtbare Warnung, dass der weiße Hintergrund mitgedruckt wird |
| Spiegelung | **Export ungespiegelt.** Die Spiegelung übernimmt die RIP-Software am Drucker |
| Auflösung | **Effektive dpi wird immer neutral angezeigt.** Eine einzige Warnung unter **150 dpi**, kein Blockieren, keine Ampel — der Kunde entscheidet |
| Inhalte | **Bilder und Text.** Textelemente analog zum Stadtkarten-Editor (Font, Größe, Farbe, Ausrichtung, Fett, Versalien, Laufweite) |
| Anordnung | **Frei positionieren, skalieren, drehen, duplizieren.** Kein Auto-Nesting |
| Ränder | **1 cm Sicherheitsabstand** zu allen vier Bogenkanten, **1 cm** zwischen Elementen. Beide Werte konfigurierbar, nicht hart verdrahtet |
| Formate mischen | **Erlaubt** — jeder Bogen ist eine eigene Warenkorb-Position mit eigenem Format |
| Speichern | **Ja**, als Projekt wie die anderen Editoren |
| Freigabe | **Einmalig im Checkout** vor dem Bezahlen, zwei Pflicht-Checkboxen: Druckfreigabe und Rechteinhaber-Bestätigung |
| Preise | **In Stripe gepflegt.** Drei neue Price-IDs in `products.ts`, Beträge holt `stripe-catalog.ts` live — identisch zu Poster und Download |
| Fulfillment | **Druckfertige PDF pro Bogen**, Originalgröße, 300 dpi, Download in der Bestellansicht |

## User Stories

- Als Kunde möchte ich ein eigenes Motiv hochladen und auf einem Transferbogen platzieren,
  sodass ich es als DTF-Druck bestellen kann, ohne ein Grafikprogramm zu benutzen.
- Als Kunde möchte ich mehrere verschiedene Motive auf denselben Bogen legen, sodass ich
  den bezahlten Bogen vollständig ausnutze statt Platz zu verschenken.
- Als Kunde möchte ich ein platziertes Motiv duplizieren und die Kopien einzeln skalieren,
  sodass ich dasselbe Design in mehreren Größen auf einem Bogen bekomme.
- Als Kunde möchte ich eigenen Text auf den Bogen setzen und gestalten, sodass ich Namen,
  Sprüche oder Nummern drucken kann, ohne dafür ein Bild anfertigen zu müssen.
- Als Kunde möchte ich Text mit einem Bild kombinieren, sodass ich zum Beispiel ein Logo
  mit einem Namen darunter als ein Transfer bekomme.
- Als Kunde möchte ich zwischen A4, A3 und 40 × 50 cm wählen, sodass ich das Format zu
  meinem Bedarf und Budget passend aussuchen kann.
- Als Kunde möchte ich mehrere Bögen mit unterschiedlichen Motiven in einer Bestellung
  anlegen, sodass ich nicht mehrfach Versandkosten zahle.
- Als Kunde möchte ich pro Bogen eine Auflage festlegen, sodass ich denselben Bogen
  mehrfach bekomme, ohne ihn neu gestalten zu müssen.
- Als Kunde möchte ich unmittelbar vor dem Bezahlen eine verbindliche Vorschau aller Bögen
  sehen und einmalig bestätigen, sodass ich sicher bin, dass genau das gedruckt wird, was
  ich sehe — ohne bei jeder Änderung erneut bestätigen zu müssen.
- Als Betreiber möchte ich, dass der Kunde beim Bezahlen bestätigt, die Rechte am Motiv zu
  besitzen, sodass die Haftung für fremdes Material bei ihm liegt.
- Als Kunde möchte ich gewarnt werden, wenn mein Bild für die gewählte Größe zu klein ist,
  sodass ich keinen unscharfen Druck bestelle.
- Als Kunde möchte ich meinen Entwurf speichern und später weiterbearbeiten, sodass ich
  die Arbeit nicht in einer Sitzung erledigen muss.
- Als Betreiber möchte ich pro bestelltem Bogen eine druckfertige PDF herunterladen können,
  sodass ich sie ohne Nacharbeit an den Drucker geben kann.
- Als Betreiber möchte ich in der Bestellung sehen, welcher Bogen in welcher Auflage
  gedruckt werden soll, sodass ich die Sendung korrekt zusammenstelle.

## Acceptance Criteria

### Zugang und Navigation
- [ ] In der Hauptnavigation existiert ein Link **„DTF Print"**, der auf den neuen Editor
      führt — sichtbar in Desktop- und Mobile-Navigation, lokalisiert in allen 5 Sprachen.
- [ ] Der Editor ist unter einer eigenen Route erreichbar, analog zu `/map`, `/star-map`, `/photo`.
- [ ] Der Editor ist ohne Login benutzbar; Speichern erfordert ein Konto (wie bestehende Editoren).

### Bogen und Format
- [ ] Der Kunde wählt pro Bogen eines von drei Formaten: A4, A3, 40 × 50 cm.
- [ ] Die Arbeitsfläche zeigt den Bogen maßstabsgetreu mit sichtbarem Rand.
- [ ] Ein Formatwechsel bei bereits platzierten Motiven verwirft keine Motive; Motive
      außerhalb der neuen Bogengrenze werden sichtbar als „außerhalb" markiert.
- [ ] Der Kunde kann weitere Bögen hinzufügen und einzelne Bögen löschen.
- [ ] Jeder Bogen hat ein unabhängig wählbares Format.
- [ ] Jeder Bogen hat eine unabhängig wählbare Auflage (mindestens 1).

### Upload
- [ ] Der Kunde kann PNG- und JPG-Dateien hochladen, per Dateiauswahl und per Drag & Drop.
- [ ] Mehrere Dateien lassen sich in einem Vorgang hochladen.
- [ ] Bei einem JPG-Upload erscheint ein deutlich sichtbarer Hinweis, dass der Hintergrund
      als weiße Fläche mitgedruckt wird.
- [ ] Hochgeladene Bilder bleiben in einer Motiv-Ablage verfügbar und können mehrfach auf
      denselben oder auf verschiedene Bögen gezogen werden, ohne erneuten Upload.
- [ ] Nicht unterstützte Dateitypen werden mit einer verständlichen Meldung abgelehnt.
- [ ] Eine Maximalgröße pro Datei ist definiert und wird durchgesetzt.

### Motive platzieren
- [ ] Ein Motiv lässt sich per Drag & Drop auf dem Bogen frei positionieren.
- [ ] Ein Motiv lässt sich über Eckanfasser proportional skalieren.
- [ ] Ein Motiv lässt sich drehen.
- [ ] Ein Motiv lässt sich duplizieren; die Kopie ist unabhängig skalier- und drehbar.
- [ ] Ein Motiv lässt sich löschen.
- [ ] Die aktuelle Größe eines ausgewählten Motivs wird in Zentimetern angezeigt.
- [ ] Die Größe lässt sich zusätzlich numerisch in Zentimetern eingeben.
- [ ] Motive lassen sich nicht über die Bogenkante hinaus platzieren, oder der überstehende
      Teil wird unmissverständlich als „wird abgeschnitten" dargestellt.
- [ ] Ein Sicherheitsabstand von **1 cm** zu allen vier Bogenkanten wird als Hilfslinie
      visualisiert.
- [ ] Ein Abstand von **1 cm** zwischen zwei Elementen wird eingehalten bzw. bei
      Unterschreitung sichtbar gemacht (Schnittabstand).
- [ ] Beide Werte sind zentral konfigurierbar und nicht im Code verstreut — sie können sich
      nach dem ersten Testdruck ändern.

### Text
- [ ] Der Kunde kann ein Textelement hinzufügen und den Text frei eingeben, auch mehrzeilig.
- [ ] Ein Textelement lässt sich wie ein Bild positionieren, skalieren, drehen, duplizieren
      und löschen.
- [ ] Wählbar sind: Schriftart, Schriftgröße, Farbe, Ausrichtung, Fett, Versalien, Laufweite
      — analog zum bestehenden Textblock-Modell der anderen Editoren.
- [ ] Zur Auswahl stehen die über PROJ-47 gepflegten Fonts.
- [ ] Text wird in der Vorschau exakt so dargestellt wie im Druck (gleiche Schrift,
      gleiche Metrik).
- [ ] Beliebige Textfarbe ist wählbar, auch Weiß — DTF druckt Weiß mit eigener Tinte,
      auf dem Transfer ist es sichtbar.
- [ ] Sehr kleine Schriftgrade werden mit einer Warnung versehen, weil feine Striche beim
      Transfer nicht zuverlässig haften.
- [ ] In der Druck-PDF ist Text in Kurven umgewandelt oder die Schrift vollständig
      eingebettet — kein Font-Fallback beim Öffnen der Datei.

### Auflösungsprüfung (nur Bilder)
- [ ] Für das ausgewählte Bild wird die effektive Auflösung bei aktueller Skalierung
      berechnet und als neutrale Angabe eingeblendet (z. B. „214 dpi bei aktueller Größe").
- [ ] Unterschreitet ein Bild **150 dpi**, erscheint genau eine Warnung am Motiv.
- [ ] Es gibt keine zweite Warnstufe und keine Ampel — eine Schwelle, eine Warnung.
- [ ] Die Warnung blockiert weder Platzierung noch Bestellung. Die Entscheidung liegt
      ausdrücklich beim Kunden.
- [ ] Die Freigabe-Ansicht im Checkout listet betroffene Bilder noch einmal auf.
- [ ] Der Schwellwert ist konfigurierbar.

### Druckfreigabe (im Checkout, vor dem Bezahlen)
- [ ] Im Editor selbst gibt es **keine** Freigabe-Bestätigung. Der Kunde kann jederzeit
      ändern, zurückgehen und erneut in den Warenkorb legen, ohne etwas zu entwerten.
- [ ] Enthält der Warenkorb mindestens eine DTF-Position, erscheint vor dem Bezahl-Schritt
      eine Freigabe-Ansicht mit der Druckvorschau **aller** DTF-Bögen der Bestellung.
- [ ] Die Vorschau zeigt jeden Bogen in Druckdarstellung mit Format-, Maß- und Auflagenangabe.
- [ ] Die Vorschau macht Transparenz erkennbar von Weiß unterscheidbar (z. B. Karomuster).
- [ ] Motive mit Auflösungswarnung werden in dieser Ansicht explizit aufgelistet.
- [ ] Der Kunde muss **zwei** Checkboxen aktiv setzen:
      1. Druckfreigabe — exakt diese Darstellung soll gedruckt werden
      2. Rechteinhaber-Bestätigung — er besitzt die Rechte an den hochgeladenen Motiven
- [ ] Der Bezahl-Button ist deaktiviert, solange nicht beide Checkboxen gesetzt sind.
- [ ] Keine der Checkboxen ist vorausgewählt.
- [ ] Beide Bestätigungen werden mit Zeitstempel an der Bestellung gespeichert.
- [ ] Die Freigabe gilt für die Bestellung als Ganzes, nicht pro Bogen — sie muss nie
      wiederholt oder erneuert werden.
- [ ] Mit der Freigabe werden die Druckdaten eingefroren: die Bestellung referenziert einen
      unveränderlichen Stand, nicht den laufend bearbeitbaren Entwurf.
- [ ] Enthält der Warenkorb keine DTF-Position, erscheint die Freigabe-Ansicht nicht.

### Warenkorb und Checkout
- [ ] Jeder Bogen wird als eigene Warenkorb-Position mit Format, Auflage und Vorschaubild geführt.
- [ ] Die Auflage ist im Warenkorb änderbar.
- [ ] Der Preis richtet sich nach Format und Auflage.
- [ ] DTF-Positionen lassen sich mit bestehenden Poster- und Download-Positionen kombinieren.
- [ ] Der Checkout läuft über den bestehenden Stripe-Flow.
- [ ] Versandkosten werden nach den Regeln aus PROJ-26 berechnet.

### Fulfillment
- [ ] Nach Zahlungseingang wird pro Bogen eine druckfertige PDF erzeugt: Originalmaß,
      300 dpi, ungespiegelt, Transparenz erhalten.
- [ ] Die PDFs sind in der Admin-Bestellansicht pro Position herunterladbar.
- [ ] Die Bestellansicht zeigt je Position Format und Auflage sowie einmal pro Bestellung
      den Zeitstempel von Druckfreigabe und Rechteinhaber-Bestätigung.
- [ ] Die PDF-Erzeugung ist wiederholbar, falls ein Download fehlschlägt.

### Speichern
- [ ] Ein eingeloggter Kunde kann einen DTF-Entwurf mit allen Bögen speichern.
- [ ] Gespeicherte Entwürfe erscheinen in der Projektliste und lassen sich laden.
- [ ] Ein geladener Entwurf stellt Motive, Positionen, Skalierungen, Drehungen, Formate
      und Auflagen wieder her.

## Edge Cases

- **Kunde lädt ein winziges Bild hoch und zieht es auf Bogengröße.** Warnung erscheint,
  Bestellung bleibt möglich, Druckfreigabe listet das Motiv als kritisch auf.
- **Kunde lädt ein JPG mit weißem Hintergrund hoch.** Warnung beim Upload, Karomuster in
  der Vorschau macht den Unterschied sichtbar. Es wird nichts automatisch freigestellt.
- **Kunde wechselt das Format von 40 × 50 auf A4, Motive liegen außerhalb.** Motive bleiben
  erhalten und werden als außerhalb markiert; die Druckfreigabe ist gesperrt, solange ein
  Motiv außerhalb liegt.
- **Kunde legt einen Bogen ohne jedes Element an.** Leerer Bogen kann nicht in den Warenkorb.
- **Kunde legt ein Textelement an und lässt es leer.** Zählt nicht als Inhalt und landet
  nicht in der Druckdatei.
- **Kunde wählt eine sehr kleine Schriftgröße oder eine sehr dünne Schrift.** Warnung, keine
  Blockade — dieselbe Logik wie bei der Bildauflösung.
- **Kunde setzt weißen Text auf den transparenten Bogen.** Muss funktionieren: In der
  Vorschau wäre Weiß auf Karomuster sonst kaum erkennbar, gedruckt ist es aber sichtbar.
  Die Vorschau darf hier nicht in die Irre führen.
- **Ein Font wird über die Admin-Verwaltung (PROJ-47) entfernt, nachdem ein Kunde ihn in
  einem gespeicherten Entwurf verwendet hat.** Der Entwurf darf nicht stillschweigend auf
  eine andere Schrift zurückfallen.
- **Kunde ändert einen Bogen, nachdem er ihn in den Warenkorb gelegt hat.** Unkritisch,
  weil die Freigabe erst beim Bezahlen erfolgt. Die Freigabe-Ansicht muss allerdings den
  **aktuellen** Stand zeigen — nicht einen veralteten Vorschau-Cache.
- **Kunde erteilt die Freigabe, öffnet in einem zweiten Tab den Editor und ändert etwas,
  bezahlt dann.** Gedruckt wird der Stand zum Zeitpunkt der Freigabe. Die Bestellung
  referenziert einen eingefrorenen Snapshot, keinen Live-Entwurf.
- **Kunde bricht bei Stripe ab und kehrt zurück.** Er landet wieder in der Freigabe-Ansicht;
  bereits gesetzte Checkboxen dürfen nicht stillschweigend übernommen werden, wenn sich
  der Warenkorb zwischenzeitlich geändert hat.
- **Upload schlägt fehl oder die Verbindung bricht ab.** Fehlermeldung, bereits platzierte
  Motive bleiben erhalten.
- **Kunde lädt eine sehr große Datei hoch.** Größenlimit greift mit klarer Meldung statt
  stillem Fehlschlag.
- **Kunde bestellt 20 Bögen.** Eine Obergrenze pro Bestellung ist definiert.
- **Motive überlappen sich.** Erlaubt — die Vorschau zeigt es, der Kunde verantwortet es.
- **Kunde lädt urheberrechtlich geschütztes Material hoch.** Der Upload wird nicht geprüft;
  die Rechteinhaber-Checkbox im Checkout verlagert die Haftung. Du behältst dir vor, eine
  Bestellung abzulehnen — ein Prozess dafür ist nicht Teil dieses Features.
- **Gast gestaltet einen Entwurf und loggt sich dann ein.** Der Entwurf geht nicht verloren.

## Offene Punkte

- **Stripe-Prices** für A4, A3 und 40 × 50 müssen im Dashboard angelegt und ihre IDs in
  `src/lib/products.ts` eingetragen werden. Die Beträge selbst pflegst du in Stripe —
  `stripe-catalog.ts` liest sie live, kein Deploy nötig für Preisänderungen.
- **Obergrenze** für Bögen pro Bestellung und Elemente pro Bogen ist noch zu bestimmen.
- **Maximale Dateigröße** pro Upload ist noch zu bestimmen. Vorschlag: 50 MB — ein
  bogenfüllendes PNG mit Transparenz auf 40 × 50 cm bei 300 dpi hat rund 28 Megapixel und
  liegt schnell bei 30–60 MB. Ein zu niedriges Limit sperrt genau die Dateien aus, die für
  gute Druckqualität nötig wären.
- **Mindest-Schriftgröße** für die Textwarnung ist noch zu bestimmen — hängt davon ab, wie
  fein euer Drucker Striche noch sauber überträgt. Nach dem ersten Testdruck festlegbar.
- **Nicht bedruckbarer Rand des eigenen Druckers** ist noch zu prüfen. Liegt er über 1 cm,
  wird er zur Untergrenze für den Sicherheitsabstand.
- **Spiegelung im eigenen RIP** ist noch zu verifizieren. Die Spec geht von „RIP spiegelt
  selbst" aus, der Export bleibt ungespiegelt. Vor dem ersten Serienlauf einmal prüfen —
  bei doppelter Spiegelung ist jeder Bogen Ausschuss.

## Technical Requirements

- Der Editor muss auf Mobilgeräten bedienbar sein (Zielbreite ab 375 px), analog zu PROJ-43.
- Uploads landen im bestehenden `user_photos`-Bucket bzw. einem eigenen DTF-Bucket mit
  denselben Zugriffsregeln.
- Die Druck-PDF muss Transparenz verlustfrei erhalten — kein Flattening auf Weiß.
- Schriften in der Druck-PDF müssen eingebettet oder in Kurven umgewandelt sein, damit die
  Datei auf dem Druckrechner identisch aussieht.
- Für die Bearbeitung im Editor wird eine verkleinerte Vorschauversion der Uploads verwendet,
  nicht das Original. Ein 28-Megapixel-Bild live zu verschieben macht den Editor auf
  Mobilgeräten unbenutzbar; die Druckdatei entsteht serverseitig aus dem Original.
- Die Vorschau muss die Druckdatei maßstabsgetreu widerspiegeln; Abweichungen zwischen
  Vorschau und Druck sind ein kritischer Fehler, weil der Kunde auf die Vorschau hin freigibt.
- Rechteinhaber-Bestätigung und Druckfreigabe müssen revisionssicher mit der Bestellung
  gespeichert werden.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

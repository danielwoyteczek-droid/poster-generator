# PROJ-55: DTF-Print-Editor (Kunden-Motive auf Transferbogen)

## Status: In Progress
**Created:** 2026-08-10
**Last Updated:** 2026-08-11

> **Phasen 1–4 sind gebaut** — Upload, Editor, Kaufweg und Druckdateien.
> Siehe „Implementierung" am Ende. Offen: Text auf dem Bogen, Bogen-Reiter im
> Editor, Entwürfe speichern — und der Testdruck zur Spiegelung.

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

**Erstellt:** 2026-08-10

### Einordnung

DTF sieht auf den ersten Blick aus wie „noch ein Editor". Technisch ist es der erste
Bereich, in dem **Kundendateien in Druckqualität** durch das System laufen. Alle
bestehenden Editoren erzeugen ihr Bild selbst und kennen dessen Auflösung. Hier kommt
das Material von außen, und wir garantieren dem Kunden per Freigabe, dass genau das
gedruckt wird, was er gesehen hat.

Daraus folgen die drei Entscheidungen, die diesen Entwurf tragen: ein eigener Upload-Weg,
der nichts wegwirft; ein serverseitiger Druckdatei-Erzeuger; und eine eingefrorene Kopie
der Bestellung, die sich nicht mehr ändern kann.

---

### A) Komponentenstruktur

```
DTF-Editor-Seite  (neue Route, neben /map, /star-map, /photo)
├── Bogen-Leiste
│   ├── Bogen-Reiter (wechseln zwischen Bogen 1, 2, 3 …)
│   ├── "Bogen hinzufügen"
│   └── "Bogen löschen"
├── Arbeitsfläche
│   ├── Bogen maßstabsgetreu, Hochformat oder Querformat
│   ├── Sicherheitsrand als Hilfslinie (1 cm)
│   ├── Bildelemente      — verschieben, skalieren, drehen, duplizieren
│   ├── Textelemente      — dieselben Griffe wie Bilder
│   └── Auswahlrahmen mit Anfassern
├── Seitenleiste (Desktop) / Tap-Sheet (Mobil, Muster aus PROJ-43)
│   ├── Reiter "Bogen"   — Format, Auflage
│   ├── Reiter "Motive"  — Upload-Feld, Motiv-Ablage, Größe in cm, dpi-Anzeige
│   └── Reiter "Text"    — Text anlegen, Schrift, Größe, Farbe, Ausrichtung,
│                          Fett, Versalien, Laufweite
├── Hinweisleiste        — dpi des gewählten Bildes, Warnungen
└── "In den Warenkorb"   — legt den aktuellen Bogen als Position ab

Checkout — Freigabe-Schritt   (erscheint nur, wenn DTF im Warenkorb liegt)
├── Vorschau jedes DTF-Bogens mit Format, Maßen und Auflage
├── Transparenz als Karomuster erkennbar
├── Liste der Motive unter 150 dpi
├── Checkbox 1 — Druckfreigabe
├── Checkbox 2 — Rechteinhaber-Bestätigung
└── "Bezahlen"  (gesperrt, solange nicht beide gesetzt sind)

Admin-Bestellansicht  (Erweiterung des bestehenden Bereichs aus PROJ-10)
└── Pro DTF-Position: Format, Auflage, Vorschaubild, Download der Druckdatei
    und die beiden Freigabe-Zeitstempel
```

Die Motiv-Ablage ist bewusst eine eigene Fläche: Ein einmal hochgeladenes Bild soll auf
mehrere Bögen gezogen werden können, ohne erneut übertragen zu werden. Bei Dateien in
Druckgröße ist jeder vermiedene Upload spürbar.

---

### B) Datenmodell

**Ein Upload** (eine hochgeladene Kundendatei)
- Die Originaldatei, unverändert und in voller Auflösung
- Eine verkleinerte Web-Vorschau für die Arbeit im Editor
- Breite und Höhe in Pixeln, Dateityp, Dateigröße
- Wem sie gehört: Konto oder — bei Gästen — eine anonyme Sitzungskennung
- Wann sie hochgeladen wurde
- Ob sie Teil einer bezahlten Bestellung ist (steuert das Aufräumen)

**Ein Bogen**
- Format: A4, A3 oder 40 × 50 cm
- Auflage: wie oft dieser Bogen gedruckt wird
- Position im Entwurf (Bogen 1, 2, 3 …)
- Die Elemente darauf

**Ein Element** — entweder Bild oder Text
- Art des Elements
- Position und Größe, angegeben als Anteil des Bogens statt in Pixeln, damit ein
  Formatwechsel nichts zerstört
- Drehung
- Stapelreihenfolge
- Bei Bild: Verweis auf den Upload
- Bei Text: der Text selbst plus Schrift, Größe, Farbe, Ausrichtung, Fett, Versalien
  und Laufweite — dieselben Eigenschaften, die Textblöcke in den anderen Editoren haben

**Eine Bestellposition**
- Eine eingefrorene Kopie eines Bogens samt aller Elemente
- Format, Auflage, Preis
- Verweis auf die erzeugte Druckdatei, sobald sie vorliegt

**An der Bestellung selbst**
- Zeitpunkt der Druckfreigabe
- Zeitpunkt der Rechteinhaber-Bestätigung

Entwürfe werden wie die anderen Editoren als Projekt gespeichert, mit DTF als neuer
Projektart. Die Dateien liegen in einem eigenen Ablagebereich, getrennt von den
Poster-Fotos — sie haben andere Größen, andere Aufbewahrungsregeln und andere
Zugriffsmuster.

---

### C) Technische Entscheidungen

**Ein eigener Editor statt Ausbau des Foto-Editors.**
Der Foto-Editor arbeitet mit festen Plätzen: eine bestimmte Anzahl Slots, in die Bilder
einrasten, dazu Masken und Raster. DTF ist das Gegenteil — eine freie Fläche mit beliebig
vielen Elementen an beliebigen Stellen. Diese beiden Modelle in einer Komponente zu
vereinen würde beide verkomplizieren und die bestehende Foto-Funktion gefährden. Die
gemeinsamen Teile (Upload, Textblock-Eigenschaften, Tap-Sheet auf Mobil) werden trotzdem
geteilt.

**Jeder Upload wird zweimal vorgehalten: Original und Vorschau.**
Das ist die wichtigste Entscheidung des Entwurfs. Der bestehende Foto-Upload verkleinert
jedes Bild auf 2400 Pixel Kantenlänge und wirft das Original weg — für Poster-Fotos
sinnvoll, für Druckdaten fatal. Ein bogenfüllendes Motiv auf 40 × 50 cm braucht rund
5900 Pixel. Wir behalten deshalb das Original unangetastet und erzeugen zusätzlich eine
kleine Fassung, mit der der Editor arbeitet. Der Kunde schiebt im Browser also ein
leichtes Bild herum, gedruckt wird aus dem Original. Ohne diese Trennung wäre der Editor
auf dem Handy unbenutzbar oder die Druckqualität ruiniert — beides zusammen geht nicht.

**Das neue Format bekommt einen eigenen Begriff.**
Die bestehende Formatliste (A4, A3, A2) hängt an Produkten, Warenkorb, Versandkosten,
Vorlagen und der Render-Pipeline. Würden wir 40 × 50 dort einhängen, müsste jeder dieser
Bereiche eine Antwort auf ein Format haben, das ihn nichts angeht — etwa „Wie sieht ein
Sternenposter in 40 × 50 aus?". Deshalb führen wir Bogenformate als eigenständigen Begriff
neben den Posterformaten. Sie überschneiden sich zufällig bei A4 und A3, sind aber
fachlich verschiedene Dinge: das eine ist ein Papierformat für Poster, das andere ein
Bogenmaß für Transferfolie.

**Die Druckdatei entsteht auf dem Server, nicht im Browser.**
Ein Bogen mit mehreren Motiven in Druckauflösung übersteigt, was ein Mobilbrowser
zuverlässig verarbeitet. Der Server hat die Originaldateien ohnehin und setzt sie mit den
bereits eingesetzten Werkzeugen zusammen. Das hält auch die Vorschau ehrlich: Vorschau und
Druckdatei entstehen aus derselben Beschreibung des Bogens, nicht aus zwei getrennten
Wegen, die auseinanderlaufen können.

**Erzeugung automatisch bei Zahlungseingang.**
Sobald die Zahlung bestätigt ist, werden die Druckdateien erzeugt und abgelegt. Wenn du
die Bestellung öffnest, liegt alles bereit. Damit ein Fehlschlag nicht unbemerkt bleibt,
bekommt jede Position einen sichtbaren Status und die Erzeugung lässt sich manuell
wiederholen — sonst merkst du ein Problem erst, wenn der Kunde auf seinen Druck wartet.

**Die Bestellung bekommt eine eingefrorene Kopie, keinen Verweis.**
Der Kunde gibt frei, was er im Checkout sieht. Würde die Bestellung auf den lebenden
Entwurf zeigen, könnte er ihn danach ändern — und wir würden etwas anderes drucken als
freigegeben. Die Kopie macht die Freigabe belastbar. Der Warenkorb selbst arbeitet bereits
so und legt eine Momentaufnahme pro Position ab; DTF folgt diesem Muster.

**Aufräumen nach 30 Tagen.**
Dateien aus bezahlten Bestellungen bleiben, damit Nachdrucke und Reklamationen möglich
sind. Uploads aus abgebrochenen Entwürfen werden nach 30 Tagen gelöscht. Bei Dateigrößen
in dieser Größenordnung wäre unbefristetes Sammeln teuer, und es entstünde ein Bestand
personenbezogener Bilddaten ohne Löschkonzept.

**Text nutzt die vorhandenen Textblock-Eigenschaften.**
Schrift, Größe, Farbe, Ausrichtung, Fett, Versalien und Laufweite gibt es bereits, ebenso
die Schriftenverwaltung aus PROJ-47. DTF erbt das, ergänzt um Drehung — die Bilder auf
demselben Bogen lassen sich drehen, beim Text wäre alles andere inkonsistent. In der
Druckdatei werden Schriften eingebettet oder in Kurven gewandelt, damit die Datei auf dem
Druckrechner identisch aussieht.

**Versandkosten als eigene Zeile in der bestehenden Matrix.**
DTF-Bögen wiegen und verpacken sich anders als gerahmte Poster. Sie kommen deshalb als
eigenes Produkt in die Versandkosten-Verwaltung, statt Poster-Tarife mitzubenutzen.

---

### D) Abhängigkeiten

**Keine neuen Pakete nötig.** Alles Erforderliche ist bereits im Projekt:

| Vorhanden | Wofür bei DTF |
|---|---|
| `pdf-lib` | Erzeugung der Druck-PDF, wird schon für den Poster-Export genutzt |
| `sharp` | Serverseitige Bildverarbeitung, seit PROJ-52 im Einsatz |
| `browser-image-compression` | Erzeugung der kleinen Editor-Vorschau (nicht des Originals) |
| `heic2any` | Umwandlung von iPhone-Fotos, bereits im Foto-Upload verwendet |
| Supabase Storage | Ablage von Originalen, Vorschauen und Druckdateien |
| shadcn/ui | Alle Bedienelemente; Drag-und-Skalier-Logik existiert in den Editoren bereits |

---

### E) Was dieser Entwurf an bestehenden Bereichen berührt

Diese Liste ist bewusst vollständig, weil DTF quer durch den Bestellprozess schneidet:

| Bereich | Änderung |
|---|---|
| Produktkatalog | Dritter Produkttyp neben Download und Poster, drei neue Stripe-Preise |
| Warenkorb | Positionen mit Bogenformat und Auflage statt Posterformat |
| Checkout | Neuer Freigabe-Schritt vor dem Bezahlen |
| Bestellungen | Zwei Freigabe-Zeitstempel, Druckdateien pro Position |
| Admin (PROJ-10) | Neue Darstellung und Download in der Bestellansicht |
| Versandkosten (PROJ-26) | Neue Tarifzeilen |
| Projekte (PROJ-5) | DTF als weitere Projektart |
| Schriften (PROJ-47) | Werden im DTF-Editor mitverwendet |
| Navigation | Neuer Punkt „DTF Print", in fünf Sprachen |
| Ablage | Neuer Bereich für Kundendateien mit Aufräum-Regel |

Der Checkout ist der heikelste Punkt: Dort ist heute jede Bestellung des Shops unterwegs.
Der Freigabe-Schritt darf für Bestellungen ohne DTF nicht in Erscheinung treten und den
bestehenden Ablauf nicht verändern.

---

### F) Risiken

**Vorschau und Druck müssen übereinstimmen.** Weicht der Druck von der Vorschau ab, hat der
Kunde etwas freigegeben, das er nie gesehen hat — und die Freigabe ist wertlos. Beide
müssen aus derselben Bogenbeschreibung entstehen. Das ist die wichtigste Prüfung in der
QA-Phase.

**Weißer Text und weiße Flächen.** Auf dem Karomuster der Vorschau kaum zu sehen, im Druck
deutlich vorhanden. Die Vorschau muss das ehrlich zeigen, sonst führt sie in die Irre.

**Speicherwachstum.** Originaldateien in Druckauflösung summieren sich schnell. Die
Aufräum-Regel muss von Anfang an laufen, nicht nachgereicht werden.

**Bedienbarkeit auf dem Handy.** Mehrere Elemente frei zu positionieren ist auf kleinen
Bildschirmen anspruchsvoll. Das Tap-Sheet-Muster aus PROJ-43 ist die Grundlage, reicht
aber allein nicht — die Griffe zum Skalieren und Drehen brauchen eine eigene Lösung.

**Gast-Uploads.** Der Editor ist ohne Anmeldung nutzbar, es können also nicht angemeldete
Besucher Dateien ablegen. Der Zugriffsschutz muss verhindern, dass jemand fremde Uploads
liest, obwohl kein Konto dahintersteht.

**Die Spiegelung ist noch unbestätigt.** Der Entwurf geht davon aus, dass euer RIP selbst
spiegelt. Das ist eine Annahme, kein Wissen — und wenn sie falsch ist, ist jeder gedruckte
Bogen Ausschuss. Ein Testdruck vor Baubeginn klärt es.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

---

## Implementierung

### Phase 1 — Upload-Fundament (2026-08-10)

Gebaut wurde ausschließlich die Datei-Infrastruktur. Editor, Warenkorb,
Freigabe-Schritt und Druckdatei-Erzeugung folgen in späteren Phasen.

**Datenbank** (`20260810100000_proj55_dtf_uploads.sql`)
- Tabelle `dtf_uploads` mit `original_path` und `preview_path` als getrennten
  Feldern. Besitzer ist per CHECK entweder ein Konto oder eine Gast-Sitzung,
  nie beides und nie keines.
- Bucket `dtf-uploads`: **privat**, 50 MB, PNG und JPEG. Bewusst **ohne jede
  Policy** auf `storage.objects` — damit kommt weder `anon` noch
  `authenticated` direkt heran, nur Service-Role und signierte URLs.
- `dtf_uploads_collect_expired()` liefert abgelaufene Zeilen und löscht sie;
  die Storage-Objekte entfernt der Aufrufer anhand der zurückgegebenen Pfade.
  EXECUTE nur für `service_role`.

**Kein Weg über den Server für die Datei selbst.** Serverless-Funktionen
nehmen rund 4,5 MB Body an; bei bis zu 50 MB großen Druckdaten scheidet das
aus. Die Route stellt stattdessen zwei signierte Upload-URLs aus, der Client
lädt direkt zu Storage und meldet den Abschluss zurück. Der Server prüft
dabei, dass Original **und** Vorschau wirklich liegen, bevor er auf `ready`
setzt — sonst zeigte der Editor ein Motiv, das beim Drucken fehlt.

**Neue Dateien**
| Datei | Zweck |
|---|---|
| `src/lib/dtf-constants.ts` | Gemeinsame Grenzwerte für Client und Server, damit keine doppelte Prüfung auseinanderläuft |
| `src/lib/dtf-guest-session.ts` | Besitzer-Identität; Gäste über httpOnly-Cookie |
| `src/lib/dtf-upload.ts` | Client-Upload: Original unverändert, Vorschau zusätzlich |
| `src/app/api/dtf/uploads/route.ts` | Upload anmelden (POST), eigene Ablage (GET) |
| `src/app/api/dtf/uploads/[id]/route.ts` | Abschluss (PATCH), Löschen (DELETE) |
| `src/app/api/dtf/cron/cleanup-uploads/route.ts` | 30-Tage-Aufräumen |
| `src/app/api/photos/sign/route.ts` | Signierte URLs für `user-photos`, siehe Sicherheitsfix |
| `.github/workflows/dtf-cleanup-uploads.yml` | Täglicher Aufräum-Lauf |

### Mitgefixt: offene Gast-Uploads in `user-photos`

Beim Prüfen der bestehenden Upload-Infrastruktur fiel auf, dass die
anon-Policies auf `user-photos` nur prüften, ob der erste Ordner `anon`
heißt — nicht, welchem Gast er gehört:

```
user_photos_guest_select / _update / _delete  (anon):  foldername[1] = 'anon'
```

Damit konnte **jeder nicht angemeldete Besucher die Fotos aller anderen
Gäste lesen, überschreiben und löschen**. Betroffen waren Foto-Poster-Editor
und die Foto-Integration im Map-Editor. Angemeldete Nutzer waren nie
betroffen, dort prüft die Policy korrekt gegen `auth.uid()`.

Ein reiner RLS-Fix ist nicht möglich, weil `anon` keine Identität hat, die
eine Policy prüfen könnte. Deshalb:
- SELECT, UPDATE und DELETE für `anon` entfernt
  (`20260810100001_harden_user_photos_guest_access.sql`)
- INSERT bleibt, damit der Direkt-Upload weiter funktioniert
- Signieren und Löschen laufen über `/api/photos/sign` mit Besitzprüfung
- Einziger Aufrufer ist `src/lib/photo-upload.ts` — die sechs
  Editor-Aufrufstellen bleiben unverändert

**Restgrenze:** Bestands-Gäste identifizieren sich über eine localStorage-UUID,
die der Client mitschickt; der Server kann sie nicht kryptografisch prüfen.
Wer eine fremde UUID kennt, käme an deren Fotos — erraten lässt sie sich
nicht, und Auflisten ist ohne SELECT-Recht nicht mehr möglich. Für DTF wird
diese Schwäche vermieden: Dort steckt die Gast-Identität in einem
httpOnly-Cookie, und die Routen akzeptieren grundsätzlich keine
clientseitig gelieferte Sitzungs-ID.

### Abweichungen von der Spec

- **Zwei Fristen statt einer** beim Aufräumen: 30 Tage für fertige Uploads,
  zusätzlich 24 Stunden für `pending`-Zeilen, bei denen der Client nie
  abgeschlossen hat. Ohne die zweite Frist blieben Karteileichen einen
  Monat liegen.
- **`preview_path` ist zunächst NULL.** Er wird erst beim Abschluss gesetzt,
  weil vorher nicht feststeht, ob die Vorschau wirklich ankam.

### Verifiziert

- Bucket privat, 50 MB, **0** Policies auf `storage.objects`; `dtf_uploads`
  mit aktivem RLS; `collect_expired` weder für `anon` noch `authenticated`
  ausführbar — alles per Query gegen die DB geprüft
- Bei `user-photos` verbleibt nur noch `user_photos_guest_insert`
- 33 neue Integrationstests, davon 13 allein für die Besitzprüfung
  (Präfix-Trick `anon/<id>-evil` und Pfad-Traversal eingeschlossen)
- Volle Unit-Suite: 261 Tests grün
- `npm run build`: erfolgreich, alle vier Routen registriert

### Noch offen für den Betrieb

- Secret **`DTF_CLEANUP_CRON_SECRET`** in GitHub und in Vercel setzen, sonst
  antwortet die Aufräum-Route mit 401 und der Storage wächst ungebremst.
- **Foto-Editor erneut testen.** Der Upload-Weg von PROJ-19/32 wurde durch
  den Sicherheitsfix verändert (Signieren und Löschen laufen jetzt über den
  Server). Die Unit-Tests decken die Route ab, den echten Upload-Durchlauf
  im Browser aber nicht.

### Bestehendes Problem, nicht von dieser Phase verursacht

`npm test` meldet 7 fehlgeschlagene Dateien: Vitest greift die
Playwright-Specs unter `tests/` mit auf, die dort nicht laufen können. Alle
261 echten Unit-Tests sind grün. Keine der betroffenen Dateien wurde in
dieser Phase angefasst.

### Phase 2 — Editor-Oberfläche (2026-08-10)

Gebaut ist der reduzierte erste Wurf: **ein Bogen, nur Bilder, kein
Speichern**. Text, Bogen-Reiter und Projekt-Speicherung folgen später; das
Datenmodell ist darauf ausgelegt, ohne Umbau erweitert zu werden.

Wichtig: Der Verzicht auf Bogen-Reiter nimmt dem Kunden **keine Fähigkeit**.
Weil jeder Bogen ohnehin eine eigene Warenkorb-Position ist, kann er mehrere
Bögen bestellen — gestalten, ablegen, nächsten gestalten. Die Reiter wären
reiner Komfort.

**Neue Dateien**
| Datei | Zweck |
|---|---|
| `src/hooks/useDtfStore.ts` | Bogen, Auflage, Elemente, Motiv-Ablage |
| `src/components/dtf-editor/DtfSheetCanvas.tsx` | Bogen maßstabsgetreu; ziehen, skalieren, drehen |
| `src/components/dtf-editor/sidebar/DtfSheetTab.tsx` | Format und Auflage |
| `src/components/dtf-editor/sidebar/DtfMotifsTab.tsx` | Upload, Ablage, Eigenschaften, dpi |
| `src/components/dtf-editor/DtfEditorLayout.tsx` | Desktop-Layout |
| `src/components/dtf-editor/mobile/MobileDtfEditorLayout.tsx` | Mobiles Tap-Sheet |
| `src/components/dtf-editor/DtfEditorShell.tsx` | Weiche Desktop/Mobil |
| `src/app/[locale]/dtf/page.tsx` | Route |

`dtf-constants.ts` wurde um `DtfSheetFormat` (a4, a3, 40x50), die Randwerte
und die Elementgrenzen erweitert. 36 Übersetzungsschlüssel plus
`nav.dtfPrint` in allen fünf Sprachen; Navigationslink in
`LandingNavClient.tsx`.

#### Abweichung von der Spec: Millimeter statt Bruchteile

Das Tech Design sah Position und Größe „als Anteil des Bogens" vor, damit ein
Formatwechsel nichts zerstört. Umgesetzt sind **Millimeter**.

Für Poster sind Bruchteile richtig: Ein Textblock soll auf A3 genauso
proportioniert sitzen wie auf A4. Für DTF ist es umgekehrt — wer ein Logo auf
10 cm zieht, will 10 cm gedruckt bekommen. Beim Wechsel von A4 auf A3 darf es
nicht auf 14 cm mitwachsen; der Kunde will mehr Platz, nicht ein größeres
Motiv. Millimeter treiben zudem direkt die cm-Anzeige, die dpi-Rechnung und
später die Druckdatei.

Beim Verkleinern des Formats können Motive dadurch außerhalb landen. Sie
werden weder verschoben noch gelöscht, sondern rot umrandet und mit
Hinweistext markiert — Motive hinter dem Rücken des Kunden zu verschieben
wäre die schlechtere Überraschung.

#### Umsetzungsdetails

- **Maßstabsgetreu über einen einzigen Faktor.** `pxPerMm` bildet Millimeter
  auf Bildschirmpixel ab, alles andere rechnet in Millimetern. Vorschau und
  Druckdatei entstehen so zwangsläufig aus derselben Beschreibung — bei einem
  Produkt mit verbindlicher Druckfreigabe ist das die Kernanforderung, keine
  Fleißaufgabe.
- **Karomuster als Bogenhintergrund.** Der Bogen ist Folie, kein Papier.
  Weiße Flächen im Motiv werden gedruckt und müssen von „nichts"
  unterscheidbar sein — besonders wichtig bei JPG-Uploads.
- **Pointer-Events statt eines Drag-Pakets.** Maus und Touch nehmen denselben
  Pfad, keine neue Abhängigkeit.
- **Skalieren über den Abstand zum Mittelpunkt**, nicht über die
  Achsendifferenz. Damit bleibt der Griff auch bei gedrehten Motiven
  intuitiv.
- **Drehen rastet mit Shift auf 15°.** Hilft, ein Motiv exakt gerade oder auf
  90° zu stellen.
- **Hüllbox-Rechnung für „außerhalb".** Ein um 45° gedrehtes Quadrat braucht
  deutlich mehr Platz als seine Kantenlänge; eine Prüfung ohne Rotation
  würde das übersehen.
- **dpi immer sichtbar, eine einzige Warnung unter 150.** Keine Ampel: Eine
  Warnung, die bei jedem Handyfoto anspringt, wird ignoriert.

#### Verifiziert

- `npm run build`: erfolgreich, Route `/[locale]/dtf` registriert
- 261 Unit-Tests weiterhin grün

#### Noch nicht vorhanden

Kein „In den Warenkorb" — das ist Phase 3 zusammen mit Produkten,
Freigabe-Schritt und eingefrorener Kopie. Der Editor ist bis dahin
benutzbar, aber nicht bestellbar.

#### Bestehende Werkzeugprobleme (nicht von dieser Phase)

`npm run lint` ruft `next lint` auf, das es in Next 16 nicht mehr gibt; und
es existiert keine `eslint.config.js`. Lint läuft also derzeit überhaupt
nicht — unabhängig von PROJ-55, aber es heißt, dass Stilfehler im gesamten
Projekt momentan unentdeckt bleiben.

### Phase 3 — Kaufweg (2026-08-10/11)

Produkte, Warenkorb, Freigabe-Dialog und Checkout. Der Kaufweg ist
durchgängig: gestalten, ablegen, freigeben, bezahlen.

Die Freigabe sitzt in einem **Dialog vor dem Checkout**, nicht als Schritt
darin. Durch den Bestellablauf läuft jede Bestellung des Shops; ihn umzubauen
wäre das größte vermeidbare Risiko gewesen. Warenkörbe ohne DTF sehen den
Dialog nicht und nehmen exakt denselben Weg wie vorher — die einzige Änderung
dort sind zwei zusätzliche Felder in einem Insert, der ohnehin passiert.

Zusätzlich eine **serverseitige Schranke**: Der Dialog läuft im Browser, ein
direkter Aufruf von `/api/checkout` könnte ihn umgehen. Da die Freigabe der
rechtliche Kern des Produkts ist, lehnt die Route jeden Warenkorb mit
DTF-Positionen ohne Freigabe ab.

Preise: A4 4,99 €, A3 5,99 €, 40 × 50 6,99 €. Alle drei als `per_unit` in
Stripe — die Auflage geht als Menge, damit der im Dashboard gepflegte
Stückpreis maßgeblich bleibt.

### Phase 4 — Druckdateien (2026-08-11)

Nach Zahlungseingang entsteht pro DTF-Position eine PDF: Originalmaß,
Transparenz erhalten, **ungespiegelt**.

**Warum nicht der vorhandene Renderer.** Es gibt zwei — `renderPosterFromSnapshot`
im Browser und den Headless-Worker aus PROJ-30. Beide **rastern**: Sie malen
alles auf eine Fläche und erzeugen ein Bild. Für selbst gestaltete Poster ist
das richtig, für Kundendateien ein Rückschritt — das Original wurde extra
unangetastet gelassen, um es nicht flachzurechnen. Stattdessen bettet
`dtf-print-file.ts` mit `pdf-lib` jedes Original unverändert ein, an Position
und Größe aus der Bogenbeschreibung. Mehrfach platzierte Motive landen nur
einmal in der Datei.

Zwei Fallen beim Zeichnen, beide behandelt:

- **PDF zählt von unten links, der Editor von oben links.** Die y-Achse wird
  umgerechnet. Das ist eine Koordinatenumrechnung, keine Bildspiegelung.
- **pdf-lib dreht um die linke untere Ecke, der Editor um die Mitte.** Ohne
  Ausgleich läge ein gedrehtes Motiv woanders als in der Vorschau — und die
  Vorschau ist das, was freigegeben wurde.

**Aufräumschutz.** Beim Erzeugen werden die beteiligten Uploads auf
`is_ordered = true` gesetzt, und zwar bevor die PDF gebaut wird. Ohne diesen
Schritt hätte die 30-Tage-Regel die Originale gelöscht — ein Nachdruck vier
Wochen später wäre unmöglich, und ein fehlgeschlagener Lauf nicht mehr
wiederholbar.

**Fehlerbehandlung.** Jede Position wird einzeln abgearbeitet und einzeln als
fehlgeschlagen markiert; ein defektes Motiv auf Bogen 2 reißt Bogen 1 nicht
mit. Fehler lassen den Webhook nicht scheitern — Stripe würde sonst erneut
zustellen und die Bestellung mehrfach verarbeiten.

**Neue Dateien**
| Datei | Zweck |
|---|---|
| `supabase/migrations/20260811100000_proj55_dtf_print_files.sql` | Tabelle mit Status je Position |
| `src/lib/dtf-print-file.ts` | PDF aus der Bogenbeschreibung |
| `src/lib/dtf-print-run.ts` | Lauf über eine Bestellung, Aufräumschutz |
| `src/app/api/admin/orders/[id]/dtf-print-files/route.ts` | Liste, Download, Wiederholen |
| `src/components/admin/AdminDtfPrintFiles.tsx` | Anzeige in der Bestellansicht |

**Mitgefixt:** Die Bestellansicht rendert automatisch PNG und PDF für jede
Position. Bei einer DTF-Position wäre `renderPosterFromSnapshot` mit
`posterType: 'dtf'` gescheitert — bei jedem Öffnen der Bestellung eine
Fehlermeldung. DTF-Positionen werden dort jetzt übersprungen.

#### Bekannte Grenze

Die Erzeugung hängt im Stripe-Webhook, Zeitlimit 300 Sekunden. Bei mehreren
50-MB-Originalen kann das eng werden. Bewusst so belassen, bis sich zeigt, ob
es in der Praxis zum Problem wird; die Alternative wäre, den Lauf als Job in
die PROJ-30-Warteschlange zu hängen — die Bau-Funktion bliebe dieselbe, nur
der Auslöser wechselte.

#### Noch offen

- **Testdruck.** Die Annahme „RIP spiegelt selbst" ist unbestätigt. Bei
  doppelter Spiegelung ist jeder Bogen Ausschuss.
- **Text auf dem Bogen**, Bogen-Reiter im Editor und Entwürfe speichern —
  bewusst aus dem ersten Wurf herausgehalten.

### Behoben nach Code-Review (2026-09-21)

Ein Review über den gesamten PR #4 (66 Dateien) fand neun Befunde. Die beiden
blockierenden sind hier behoben; die übrigen sieben stehen darunter als offene
Liste.

**Blocker 1 — jede Druckdatei scheiterte am Bucket.** `dtf-print-run.ts` lud das
fertige PDF nach `dtf-uploads`. Dieser Bucket lässt laut Migration
`20260810100000` nur `image/png` und `image/jpeg` zu, und Storage prüft den
MIME-Typ auch gegenüber der Service-Role. Jede DTF-Bestellung wäre auf
`failed` stehen geblieben, der Wiederholen-Knopf im Admin lief gegen dieselbe
Wand — der Kunde zahlt, die Druckdatei entsteht nie. Behoben mit einem eigenen
Bucket `dtf-print-files` (Migration `20260921090000`, privat, nur
`application/pdf`, keine Größengrenze wie bei `exports`/`order-exports`).

Eigener Bucket statt erweiterter MIME-Liste, weil die beiden Dateiarten
verschiedene Lebensdauern haben: Kundenuploads ohne Bestellung räumt der Cron
nach `DTF_RETENTION_DAYS` weg, eine Druckdatei gehört zu einer bezahlten
Bestellung und bleibt. Ein gemeinsamer Bucket hätte den Aufräum-Lauf gezwungen,
beides auseinanderzuhalten — genau die Art Sonderfall, die irgendwann jemand
übersieht und die dann bezahlte Druckdateien löscht.

Geändert: `DTF_PRINT_BUCKET` in `dtf-constants.ts`, der Upload in
`dtf-print-run.ts` und das Signieren in
`api/admin/orders/[id]/dtf-print-files/route.ts`. Der Download des
Kunden-Originals in `dtf-print-file.ts` bleibt auf `dtf-uploads` — das ist
Kundenmaterial, kein Erzeugnis.

**Blocker 2 — Endlosschleife auf der Bestellseite des Kunden.**
`AdminOrderDetail` überspringt DTF-Positionen beim automatischen Vorbereiten
der Exporte; der Zwilling `OrderView` — die Seite, die der Kunde nach dem
Bezahlen sieht — tat es nicht. `renderPosterFromSnapshot` wirft bei einem
DTF-Snapshot, das `catch` zeigt einen Toast, das `finally` setzt `preparing`
zurück, und weil `preparing` in den Abhängigkeiten des Effekts steht, läuft er
sofort wieder. Ergebnis wäre eine Endlosschleife aus Fehlversuchen direkt nach
der Zahlung. Derselbe Schutz ist jetzt in beiden Pfaden.

Lehrstück für die Cross-Cutting-Regel: Der Schutz wurde beim Bau an einer
Stelle ergänzt und beim Zwilling vergessen.

#### Offen aus dem Review

| # | Befund | Schwere |
|---|---|---|
| 3 | `checkout/route.ts` schreibt `total_cents` als reine Produktsumme, obwohl eine `shipping_rate` an der Stripe-Session hängt — Mail, Bestellseite und `trackPurchase` zeigen zu wenig | hoch |
| 4 | `DtfAddToCart` legt eine `URL.createObjectURL(...)` in den persistierten Warenkorb und in `orders.items`; nach einem Reload ist der gerasterte Text im Freigabedialog weg — der Ansicht, auf der die verbindliche Druckfreigabe beruht | hoch |
| 5 | `dtf-text-raster.ts` zeichnet ohne `document.fonts.ready`, anders als alle fünf Schwester-Pipelines — gedruckt ≠ freigegeben | mittel |
| 6 | `checkout/route.ts` verengt `allowed_countries` auf ein Land aus der Locale; auf der englischen Storefront bekommt ein EU-Kunde ein Deutschland-only-Adressformular | mittel |
| 7 | `useDtfStore.setQuantity` ohne Obergrenze, Checkout-Schema deckelt bei 99 → generischer „Invalid cart"-400 | niedrig |
| 8 | `DtfTextRender` klemmt `widthMm`, ohne das Text-Div zu verkleinern; gedruckter Text rutscht über den Sicherheitsrand | niedrig |
| 9 | `DtfMotifsTab` lässt ein Motiv löschen, das in einer Warenkorbposition steckt (`is_ordered` erst nach Zahlung) | niedrig |

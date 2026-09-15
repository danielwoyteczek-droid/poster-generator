# PROJ-31: Amazon-Custom-Anpassungsdaten-Importer

## Status: In Progress
**Created:** 2026-04-28
**Last Updated:** 2026-09-15

> **Stand:** Phase 0 und 2 sind vom Abholer auf UMOI-SERVER erledigt — er
> liest JTL und schickt fertige Positionen. Der Eingang auf petite-moment
> steht ebenfalls (siehe *Umgesetzt* unten). Offen ist Phase 3: SKU→Preset,
> Editor-Zustand, Auto-Render, Queue-Oberfläche.
>
> Für Phase 3 ist die Feldzuordnung Amazon → Preset entworfen und entschieden,
> aber noch nicht gebaut — siehe *Entwurf: Feldzuordnung* unten.

## Dependencies
- **Requires PROJ-8** (Design-Presets) — die Zuordnung Amazon-SKU → internes Preset bestimmt, welches Design gerendert wird.
- **Requires PROJ-30** (Preset-Render-Pipeline) — der Auto-Render nutzt denselben Headless-Editor-Mechanismus.
- **Requires PROJ-1** (Karten-Editor Core) — die Käuferangaben werden in den bestehenden Editor-Zustand übersetzt.
- **Requires PROJ-3** (Poster-Export) — die Druckdatei entsteht über die vorhandene Export-Pipeline.
- **Requires PROJ-47** (Admin-Font-Verwaltung) — Amazon liefert die vom Käufer gewählte Schrift als Datei mit; sie wird gegen die Schriftbibliothek aufgelöst.
- **Teilt Code mit PROJ-49** (Etsy-Integration) — gemeinsamer Personalisierungs-Parser, gemeinsame Prüf-Queue, gemeinsame Render-Stufe.
- **Berührt PROJ-10** (Admin-Bestellverwaltung) *nicht* — Amazon-Bestellungen legen bewusst keine Zeilen in der internen Bestelltabelle an (Begründung unter Tech-Entscheidungen).

---

## Der Befund, der diese Spec verkleinert hat (2026-09-14)

Die ursprüngliche Spec baute den Importer auf der Amazon **Selling Partner API** auf und galt als blockiert auf die Rollenfreigabe `Direct-to-Consumer Shipping`. **Dieser Blocker ist hinfällig.**

Die Anpassungsdaten personalisierter Bestellungen sind ohne jede Rollenfreigabe erreichbar. Im FBM-Bestellbericht in Seller Central lassen sich unter *Bestellungen → Bestellberichte → Spalten hinzufügen → Benutzerdefinierte URLs* zwei Spalten aktivieren:

| Spalte | Inhalt |
|---|---|
| `customized-url` | Link auf ein ZIP — per einfachem Abruf ohne Anmeldung erreichbar |
| `customized-page` | Kurzlink auf die Amazon-Ansicht |

Das ZIP enthält die Anpassungsdaten als JSON, dieselben Daten als XML, ein SVG mit dem Schriftzug und ein Vorschaubild. Dieselben Daten stehen in der JTL-Datenbank in `dbo.pf_amazon_bestellungpos`, Spalte `cCustomJson`.

Verifiziert an drei echten Bestellungen aus zwei völlig verschiedenen Produktwelten.

**Was JTL bereits übernimmt** — und damit aus dieser Spec herausfällt:

| Ursprünglich geplant | Wer macht es real |
|---|---|
| Bestelldaten abrufen | JTL-eazyAuction |
| Lieferadresse (PII-Rolle) | JTL, ist die Warenwirtschaft |
| Versandrückmeldung an Amazon | JTL meldet Tracking zurück |
| **Anpassungsdaten aufbereiten** | **das Einzige, was petite-moment beisteuert** |

Damit entfallen: SP-API-Zugriff, Rollenanträge, Identitätsverifizierung im Solution Provider Portal, Sandbox-Strategie, Token-Rotation, Rate-Limit-Behandlung, PII-Verschlüsselung, Versandrückmeldung, Stornierungs-Abgleich.

---

## Problem & Ziel

petite-moment verkauft personalisierte Karten-Poster über Amazon Custom (SKU-Schema `LQ-xx-xx`). Der Käufer gibt Titel, Ort, Namen, Format und Rahmen direkt im Amazon-Frontend ein. Heute liest der Betreiber diese Felder von Hand ab, tippt sie im Editor nach, wählt das passende Design und exportiert die Druckdatei — rund 5–10 Minuten pro Bestellung, mit Tippfehlerrisiko bei Ortsangaben.

**Ziel:** Kommt eine Bestellung mit SKU `LQ-xx-xx` herein, bereitet das Tool sie so weit vor, dass der Betreiber nur noch prüft und druckt.

## Scope

**Im Scope**
- Zuordnung Amazon-SKU → internes Preset und Feld-Schema
- Anpassungsdaten aus JTL abholen und auswerten
- Editor-Zustand aus Preset plus Käuferangaben bauen
- Poster automatisch rendern, Druckdatei ablegen
- Prüf-Queue mit Status „Wartet auf Druck"

**Außerhalb des Scope**
- Jeglicher SP-API-Zugriff und jeder Rollenantrag
- Versandrückmeldung an Amazon (macht JTL)
- Lieferadressen und Bezahlvorgänge (macht JTL)
- Nicht-Poster-Produkte der GmbH (z. B. Wärmflaschen) — der Importer ignoriert alles ohne `LQ-`-SKU
- Weitere Marktplätze außer DE

## User Stories
- Als Betreiber möchte ich Amazon-Custom-Bestellungen fertig aufbereitet in einer Prüf-Queue vorfinden, statt sie in Seller Central abzulesen und im Editor nachzutippen.
- Als Betreiber möchte ich pro Amazon-SKU einmal hinterlegen, welches Design sie meint und welches Amazon-Feld auf welches Poster-Element gehört.
- Als Betreiber möchte ich vor dem Druck sehen, was der Importer aus den Käuferangaben gemacht hat, und einzelne Werte korrigieren können.
- Als Betreiber möchte ich Bestellungen mit unbekannter SKU nicht verlieren, sondern als „Zuordnung fehlt" aufgelistet bekommen — mit der Möglichkeit, die Zuordnung nachzutragen und neu zu verarbeiten.
- Als Betreiber möchte ich Etsy- und Amazon-Bestellungen an einem Ort prüfen, nicht auf zwei Seiten.
- Als Betreiber möchte ich bei unklarer Ortsangabe eine Rückfrage statt einer falsch zentrierten Karte.

## Acceptance Criteria

### Zuordnung SKU → Design
- [ ] Admin-Seite listet alle bekannten Amazon-SKUs, ungezuordnete zuerst
- [ ] Pro SKU: Preset auswählbar, Feld-Schema pflegbar, Notizfeld
- [ ] Unbekannte SKUs aus dem Import legen automatisch eine offene Zeile an, statt die Bestellung zu verwerfen
- [ ] Nach nachgetragener Zuordnung lassen sich betroffene Bestellungen erneut verarbeiten

### Abholung und Auswertung
- [ ] Der Abholer erkennt neue Positionen mit `LQ-`-SKU und überspringt alle anderen
- [ ] Anpassungsdaten werden gelesen, egal ob die JTL-Spalte das vollständige JSON oder nur einen Link darauf enthält
- [ ] Eine bereits importierte Position wird nicht doppelt angelegt
- [ ] Alle Käuferangaben eines Auftrags werden erfasst: Texte, Auswahlfelder, Schrift und Farbe — je Textblock zugeordnet
- [ ] Ein unbekannter Feldtyp blockiert den Import nicht, wird aber in der Queue sichtbar gemeldet
- [ ] Fehlende Pflichtfelder oder Werte, die nicht zum erwarteten Muster passen, führen zu „Prüfung nötig" — niemals zu stillem Überspringen

### Feldzuordnung Amazon → Preset
- [ ] Je SKU ist hinterlegt, welches Anpassungsfeld welchen Textblock des Presets befüllt — die Zuordnung liegt in den Daten, nicht im Code
- [ ] Je Zuordnung ist hinterlegt, was bei leerem Feld geschieht: automatisch, Preset-Text oder leer
- [ ] Ein leer gelassenes Koordinatenfeld lässt den Koordinatenblock automatisch; ein ausgefülltes ersetzt ihn durch den Freitext des Käufers
- [ ] Ein Textfeld ohne gepflegte Zuordnung schickt die Position in die Prüfung — es wird nicht der Reihe nach verteilt
- [ ] Beim ersten Auftreten einer SKU schlägt das System eine Zuordnung vor; unbestätigt zählt sie als ungepflegt
- [ ] Zeigt eine Zuordnung auf einen Block, den das Preset nicht mehr enthält, landet die Position in der Prüfung
- [ ] Die Pflegemaske beschriftet die Textblöcke mit ihrem Preset-Text, nicht mit ihrer internen Kennung

### Ort und Editor-Zustand
- [ ] Die Ortsangabe des Käufers wird über dieselbe Ortssuche aufgelöst, die im Editor hinter dem Suchfeld liegt
- [ ] Hat der Käufer zusätzlich Koordinaten eingetippt, schlagen diese den Textfund
- [ ] Kein Treffer oder mehrdeutiger Treffer → „Prüfung nötig" statt falsch zentrierter Karte
- [ ] Der Editor-Zustand entsteht aus dem Preset als Basis, die Käuferangaben überschreiben nur die dafür vorgesehenen Elemente
- [ ] Die vom Käufer gewählte Schrift wird gegen die Schriftbibliothek aufgelöst; ist sie unbekannt, greift die Preset-Schrift und die Position wird markiert
- [ ] Format- und Rahmenangabe des Käufers werden übernommen

### Render und Prüf-Queue
- [ ] Nach erfolgreicher Auswertung wird automatisch gerendert, ohne Zutun des Betreibers
- [ ] Die Druckdatei ist aus der Queue herunterladbar; ein fehlgeschlagener Render ist einzeln wiederholbar
- [ ] Die Queue zeigt Etsy- und Amazon-Bestellungen gemeinsam, mit Filter nach Quelle und Status
- [ ] Detailansicht zeigt Vorschau, erkannte Felder mit Herkunft, Gestaltungsangaben und die Rohdaten
- [ ] Einzelne Feldwerte sind korrigierbar; danach lässt sich neu rendern
- [ ] Status „Wartet auf Druck" ist der Zustand, in dem eine Bestellung druckfertig auf den Betreiber wartet
- [ ] Eine gedruckte Bestellung lässt sich abhaken und verschwindet aus der offenen Liste

### Betrieb
- [ ] Jeder Abholvorgang wird protokolliert: Zeitpunkt, gefundene, übernommene und fehlgeschlagene Positionen
- [ ] Fehler landen mit Positionsbezug in Sentry
- [ ] Das Zugangsgeheimnis des Abholers liegt ausschließlich in Umgebungsvariablen
- [ ] Die JTL-Zugangsdaten verlassen den lokalen Abholer nicht

---

## Tech Design (Solution Architect)

### A) Der Weg einer Bestellung

```
JTL-Wawi-Datenbank (im Firmennetz)
    |
    |   Lokaler Abholer — ein Skript, das im Firmennetz läuft
    |   · findet neue Positionen mit LQ-SKU
    |   · holt die Anpassungsdaten (direkt oder über den hinterlegten Link)
    v
    |   Übergabe an petite-moment, mit gemeinsamem Geheimnis abgesichert
    v
Anpassungsdaten flach klopfen
    |   Aus dem verschachtelten Amazon-Baum werden Felder mit Beschriftung,
    |   Wert und Zugehörigkeit zu ihrem Textblock.
    v
SKU nachschlagen  ──── keine Zuordnung ──→  Queue: „Zuordnung fehlt"
    |   Preset + Feld-Schema
    v
Felder gegen das Schema prüfen  ──── Pflichtfeld fehlt ──→  Queue: „Prüfung nötig"
    |   Dieselbe Prüfstufe wie bei Etsy, dasselbe Ergebnisformat.
    v
Ort auflösen  ──── mehrdeutig / kein Treffer ──→  Queue: „Prüfung nötig"
    v
Editor-Zustand bauen
    |   Preset als Basis, Käuferangaben als gezielte Überschreibungen.
    v
Rendern  ──── fehlgeschlagen ──→  Queue: „Render-Fehler", wiederholbar
    v
Queue: „Wartet auf Druck"  →  Betreiber prüft, druckt, hakt ab
```

### B) Was der Betreiber sieht

```
Admin → Externe Bestellungen        (die heutige Etsy-Seite, erweitert)
├── Kopfzeile
│   ├── Letzter Abgleich je Quelle
│   └── Filter: Alle · Etsy · Amazon
├── Statusfilter
│   └── Wartet auf Druck · Prüfung nötig · Zuordnung fehlt · Render-Fehler · Erledigt
├── Tabelle
│   └── Quelle · Bestellnummer · Datum · Status · Positionen · Detail
└── Detailansicht einer Position
    ├── Poster-Vorschau + Druckdatei herunterladen
    ├── Erkannte Felder — Wert, aus welchem Amazon-Feld, korrigierbar
    ├── Gestaltung — Schrift und Farbe je Textblock
    ├── Rohdaten (aufklappbar, für Zweifelsfälle)
    └── Aktionen: Neu rendern · Als gedruckt abhaken · Zuordnung nachtragen

Admin → Amazon-SKUs                 (neue Seite)
├── Tabelle: SKU · ASIN · Preset · Schema gepflegt? · Bestellungen
├── Unzugeordnete SKUs stehen oben
└── Schema-Editor je SKU
    └── Je Zeile: Amazon-Feldname · internes Element · Pflicht? · erlaubtes Muster
```

### C) Welche Informationen gespeichert werden

**Zuordnung je Amazon-SKU** *(neu)*
Die SKU, optional die ASIN, der Marktplatz, welches Design gemeint ist, das Feld-Schema und ein Notizfeld. Das Feld-Schema beschreibt für jedes Amazon-Feld, auf welches Poster-Element es geht, ob es Pflicht ist und welchem Muster sein Wert folgen muss. Es hat dieselbe Form wie das Etsy-Schema und wird von derselben Prüfstufe gelesen.

**Importierte Bestellposition** *(neu)*
Amazon-Bestellnummer und Positionsnummer, SKU und ASIN, Kaufdatum, Status, die Rohdaten der Anpassung, die erkannten Felder, die Gestaltungsangaben je Textblock, der aufgelöste Ort, der erzeugte Editor-Zustand, der Verweis auf die Druckdatei, eine Fehlermeldung und Zeitstempel. Eine Zeile je Position — bei Etsy ist es eine Zeile je Bestellung mit Positionen darin, weil die Etsy-Schnittstelle so liefert; JTL liefert Positionen.

**Druckdatei** *(neu, von beiden Quellen genutzt)*
Speicherort, Zustand (in Arbeit, fertig, fehlgeschlagen), Fehlermeldung, Größe. Bewusst eine eigene Ablage statt eines Feldes in der Bestellzeile: Die Erzeugung kann scheitern und wiederholt werden, braucht also einen eigenen Zustand — dieselbe Überlegung wie bei den DTF-Druckdateien aus PROJ-55.

**Abholprotokoll** *(vorhanden, um die Quelle erweitert)*
Das Protokoll der Etsy-Abgleiche bekommt ein Feld für die Quelle und nimmt die Amazon-Läufe mit auf.

**Keine Lieferadressen, keine Zahlungsdaten.** Sie werden weder abgeholt noch gespeichert — JTL hat sie. Damit hat diese Spec keine nennenswerte Datenschutz-Fläche, anders als der SP-API-Entwurf.

### D) Tech-Entscheidungen, und warum

**1. Ein lokaler Abholer statt eines Abrufs durch die Website.**
Die JTL-Datenbank liegt im Firmennetz und ist von außen nicht erreichbar. Die Website kann sie also nicht abfragen, egal wie sie gebaut ist. Stattdessen läuft im Firmennetz ein Skript, das die Datenbank liest und das Ergebnis an eine Adresse der Website übergibt, abgesichert durch ein gemeinsames Geheimnis. Dasselbe Muster nutzt das Projekt bereits beim Render-Worker und beim Etsy-Abgleich. Nebeneffekt: Die Datenbank-Zugangsdaten bleiben im Firmennetz und landen nie beim Hoster.

**2. Zwei Wege zu den Anpassungsdaten, automatisch gewählt.**
Ob die JTL-Spalte das vollständige JSON oder nur einen Link darauf enthält, ist noch nicht bestätigt — das lässt sich nur mit Zugriff auf die Datenbank klären. Statt darauf zu warten, erkennt der Abholer beides: sieht der Inhalt nach Anpassungsdaten aus, nimmt er sie direkt; sieht er nach einem Link aus, lädt er das ZIP nach und liest die Daten daraus. Damit ist die offene Frage kein Blocker mehr, sondern nur noch eine Frage der Geschwindigkeit.

**3. Die vollständige Quelle ist der Anpassungs-Baum, nicht die flache Zusammenfassung daneben.**
Amazon legt die Daten zweimal ab: als verschachtelten Baum und als flache Liste. Die flache Liste ist bequemer, aber lückenhaft — sobald der Käufer den Schriftzug selbst verschiebt, schrumpft der Eintrag dort auf einen Bildverweis zusammen und der eingegebene Text fehlt. In zwei der drei geprüften Bestellungen ist genau das passiert. Ausgewertet wird deshalb der Baum.

**4. Felder direkt zuordnen, nicht über einen Textumweg.**
Naheliegend wäre, aus den Amazon-Feldern einen Text der Form „Beschriftung: Wert" zu bauen und ihn durch den vorhandenen Etsy-Parser zu schicken — der ist auf genau solche Freitexte ausgelegt. Das spart Code, verliert aber Information, weil der Etsy-Parser für unstrukturierte Käufereingaben gebaut ist und raten muss, wo es nach dem Umweg gar nichts mehr zu raten gäbe. Nachgemessen an den echten Bestellungen:

| Fall | Eingabe | Ergebnis nach dem Textumweg |
|---|---|---|
| Wert enthält Bindestrich mit Leerzeichen | `Anna - Ben` | Feld geht verloren |
| Zwei Felder mit gleicher Beschriftung | `Farbe` (Titel) + `Farbe` (Namen) | nur das erste überlebt |
| Schrift und Farbe je Textblock | zwei Schriften, zwei Farben | Zuordnung zum Textblock weg |

Der dritte Fall wiegt am schwersten: Bestellung 304 gestaltet Titel und Namen unterschiedlich — schwarz in einer Schrift, grau in einer anderen. Nach dem Textumweg ist nicht mehr entscheidbar, welche Farbe zu welchem Block gehört. Im Baum steht es.

Stattdessen wird die Prüfstufe des vorhandenen Parsers — Beschriftungen abgleichen, Pflichtfelder prüfen, Muster prüfen, Ergebnis formen — als eigener Baustein herausgezogen. Etsy ruft sie weiter über den bisherigen Einstieg auf, unverändert in Verhalten und Signatur; Amazon ruft sie mit direkt zugeordneten Feldern auf. **Beide Quellen münden damit in dasselbe Ergebnisformat und denselben Prüf- und Render-Weg — es gibt keinen zweiten Review-Pfad.** Der Refactor ist klein und von den bestehenden Parser-Tests abgedeckt; er wird um Tests mit den anonymisierten echten Bestellungen ergänzt.

Zugeordnet wird dabei nach dem internen Amazon-Feldnamen zuerst, der Käufer-Beschriftung danach. Der interne Name ist kurz und stabil; die Beschriftung ist der Text, den der Käufer liest, und ändert sich, sobald das Listing überarbeitet wird.

**5. Ein Prüfplatz für beide Verkaufskanäle.**
Die vorhandene Etsy-Bestellseite wird zur Queue für externe Bestellungen verallgemeinert, mit Filter nach Quelle. Getrennte Ablagen je Quelle, eine gemeinsame Oberfläche darüber. Das hält die laufende Etsy-Arbeit unangetastet, vermeidet zwei fast gleiche Seiten und gibt dem Etsy-Kanal die noch fehlenden Stufen — Render, Druckdatei, Freigabe — ohne Zusatzaufwand mit.

**6. Das Design kommt aus dem Preset, der Käufer überschreibt nur Einzelheiten.**
Layout, Farbwelt, Kartenstil und Textpositionen stehen im Preset. Aus der Bestellung kommen nur Titel, Namen, Ort, Format und Rahmen. So bleibt das Ergebnis gestalterisch konsistent, und eine neue Amazon-Variante ist eine Zeile in der Zuordnungstabelle statt Arbeit am Code.

**7. Die Schriftwahl des Käufers wird aufgelöst, nicht ignoriert.**
Amazon liefert zur gewählten Schrift die Schriftdatei mit — in Bestellung 304 sogar eine selbst hochgeladene. Der Importer sucht die Schrift in der Schriftbibliothek aus PROJ-47. Findet er sie, wird sie verwendet; findet er sie nicht, greift die Preset-Schrift und die Position wird markiert, damit der Betreiber die Schrift einmalig nachpflegen kann. Ohne diesen Schritt weicht das gedruckte Poster von der Vorschau ab, die der Käufer bei Amazon gesehen hat.

**8. Amazon-Bestellungen legen keine Zeilen in der internen Bestelltabelle an.**
Sie haben bei petite-moment weder Zahlung noch Lieferadresse noch Versandpflicht — JTL ist dort das führende System. Eine Bestellzeile ohne Geldfluss in der Bestellverwaltung wäre eine Zeile, die niemand fortführt. Der Druckauftrag lebt daher in der Queue für externe Bestellungen. Die Umsatzauswertung des Business Centers bleibt davon unberührt, weil sie ohnehin nur bezahlte Bestellungen zählt.

**9. Ausgelöst wird der Abgleich vom Firmennetz aus, nicht nach Zeitplan in der Cloud.**
Der Abholer kann als Aufgabe im Firmennetz regelmäßig laufen oder vom Betreiber gestartet werden. Ein Zeitplan beim Hoster ergibt keinen Sinn, weil die Datenquelle von dort nicht erreichbar ist.

### E) Neue Abhängigkeiten

- **Ein Treiber für Microsoft SQL Server** — JTL-Wawi speichert dort. Wird ausschließlich vom lokalen Abholer gebraucht, nicht von der Website.
- Sonst nichts. ZIP-Lesen, Schema-Prüfung, Render und Ablage sind bereits im Projekt vorhanden.

### F) Risiken und offene Punkte

| Punkt | Wirkung | Umgang |
|---|---|---|
| Inhalt der JTL-Spalte `cCustomJson` unbestätigt | keine — beide Fälle werden behandelt | in Phase 0 nebenbei klären |
| Spaltennamen in `pf_amazon_bestellungpos` unbekannt | die Abfrage des Abholers muss vor Ort geschrieben werden | Phase 0: Tabelle ansehen, Abfrage festlegen |
| Ab wann die Anpassungsspalten gefüllt sind, ist unklar — die Seller-Central-Spalten wirken nicht rückwirkend | ältere Bestellungen bleiben manuell | Phase 0 misst es an echten Daten |
| Meldet JTL den Versand tatsächlich an Amazon zurück? | wäre eine Lücke außerhalb dieser Spec | vom Betreiber zu bestätigen, keine Auswirkung auf den Bau |
| Die Fixtures enthalten echte Kundendaten | dürfen so nicht ins Repository | vor Übernahme als Testdaten anonymisieren — Namen, Adresse und Koordinaten ersetzen, Struktur erhalten |
| Amazon-Links auf die ZIPs könnten ablaufen | Nachladen schlüge fehl | Rohdaten werden beim Import gespeichert, nicht später nachgeladen |

---

## Roadmap Phasen

**Phase 0 — Datenquelle vor Ort klären** (ein halber Tag, im Firmennetz)
Tabelle `pf_amazon_bestellungpos` ansehen, Spaltennamen und Inhalt von `cCustomJson` feststellen, Abfrage festlegen, ab wann Daten vorliegen. Ergebnis fließt in Phase 2.

**Phase 1 — Auswertung und Zuordnung** (3–4 Tage)
Baum-Auswertung mit Textblock-Bindung, herausgezogene Prüfstufe im Personalisierungs-Parser, Ablagen für SKU-Zuordnung und importierte Positionen, Admin-Seite für die SKU-Zuordnung. Tests gegen die anonymisierten echten Bestellungen.

**Phase 2 — Abholer** (2–3 Tage)
Lokales Skript gegen JTL, Übergabe-Adresse mit gemeinsamem Geheimnis, Idempotenz, Abholprotokoll.

**Phase 3 — Editor-Zustand, Render und Queue** (4–5 Tage)
Ortsauflösung, Editor-Zustand aus Preset plus Käuferangaben, Schriftauflösung über PROJ-47, Auto-Render, Druckdatei-Ablage, gemeinsame Queue mit Detailansicht und Korrekturmöglichkeit. Etsy erbt Render und Freigabe hier mit.

**Phase 4 — Erster Echtlauf** (1–2 Tage)
Eine echte Bestellung von der JTL-Zeile bis zur Druckdatei, Sentry-Anbindung, Feinschliff an der Queue.

---

## Entwurf: Feldzuordnung Amazon → Preset (entschieden 2026-09-15)

Gehört zu Phase 3. Die Frage dahinter: jedes Design bei Amazon hat eigene
Anpassungsfelder, teils gleiche, teils andere. Damit eine importierte
Bestellung fertig im Editor liegt, muss feststehen, welches Feld welchen
Textblock des Presets befüllt.

### Der Befund

Die Zuordnung findet heute an zwei Stellen statt, und nur die erste ist
richtig gebaut.

**Stufe 1 — Amazon-Feld → interner Schlüssel.** `LQ_DEFAULT_SCHEMA` in
`src/lib/amazon/sku-schema.ts`, je SKU überschreibbar über
`amazon_sku_mappings.personalization_schema`. Kann bereits heute pro Design
unterschiedliche Felder.

**Stufe 2 — interner Schlüssel → Textblock.** Hart verdrahtet:
`TEXT_ORDER = ['title', 'names', 'subline']` in der Editor-Route, verteilt
positional im `AmazonOrderApplier` — der n-te Text auf den n-ten
Nicht-Koordinaten-Block. Diese Stufe kennt das Preset nicht, sie zählt durch.

Was daran bricht, am Beispiel von `LQ-30001-09`: Das Amazon-Feld „Stadt und
Koordinaten" ist auf `subline` abgebildet. Der Applier überspringt
Koordinatenblöcke vollständig. Das Preset `AMZ_LQ-30001-09` hat aber nur zwei
Nicht-Koordinaten-Blöcke. Also füllen `title` und `names` diese beiden, und
`subline` fällt hinten runter — der Freitext des Käufers landet nirgends.
Bleibt das Feld leer, stimmt das Ergebnis nur zufällig: der Koordinatenblock
bleibt dann eben unangetastet.

### Die Lösung: das Ziel gehört ins Schema

Jedes Schemafeld bekommt zwei Angaben dazu:

```
{ key: 'subline',
  label: 'Stadt und Koordinaten',
  target: 'block-coords',      ← welcher Textblock des Presets
  whenEmpty: 'auto' }          ← was, wenn der Käufer nichts eingibt
```

Drei Leer-Regeln:

| Regel | Verhalten bei leerem Feld |
|---|---|
| `auto` | Block bleibt wie im Preset — beim Koordinatenblock setzt der Renderer Stadt + Koordinaten |
| `preset` | Der im Preset hinterlegte Text bleibt stehen |
| `leer` | Block wird geleert |

Der gefüllte Fall auf einem Koordinatenblock ist kein neues Konzept: Der
Editor setzt schon heute `isCoordinates: false` und übernimmt den Text, wenn
ein Mensch dort hineintippt (`TextTab.tsx`). Die Automatik tut dasselbe
maschinell.

### Zwei Entscheidungen

**1. Kein positionaler Rückfall.** Ein Textfeld ohne gepflegtes Ziel schickt
die Position in die Prüfung. Gerade das Durchzählen ist der Mechanismus, der
heute still den falschen Block befüllt; als Netz behalten hieße, den Fehler zu
konservieren. Einmal je SKU pflegen ist billiger als bei jeder Bestellung zu
prüfen, ob es zufällig gepasst hat.

**2. Vorschlag ja, Automatik nein.** Beim ersten Auftreten einer SKU schlägt
das System eine Zuordnung nach Label-Ähnlichkeit vor. Ein unbestätigter
Vorschlag zählt aber als ungepflegt — die Bestellung geht in die Prüfung, bis
der Betreiber einmal bestätigt hat. Sonst winkt man einen falschen Vorschlag
durch und merkt es erst am gedruckten Poster.

### Pflege

Nicht als JSON von Hand, sondern als Maske in der SKU-Verwaltung: links die
Anpassungsfelder aus einer echten Bestellung, rechts ein Auswahlfeld mit den
Textblöcken des zugeordneten Presets, dazu die Leer-Regel.

```
Amazon-Feld                    →  Textblock im Preset        Wenn leer
──────────────────────────────────────────────────────────────────────────
Titel                          →  [Wo alles begann…    ▾]   [Preset-Text ▾]
Namen                          →  [Maria & Alex        ▾]   [Preset-Text ▾]
Stadt und Koordinaten          →  [Ort & Koordinaten   ▾]   [Automatisch ▾]
Adresse für die Karte          →  (Kartenmitte)              —
Größe des Posters              →  (Postergröße)              —
```

Die Auswahlfelder zeigen den Preset-Text des Blocks, nicht seine Kennung
(`block-1789496636322`) — der Betreiber wählt, was er auf dem Poster sieht.

### Absicherung

Beim Auswerten prüfen, ob jedes Ziel im Preset noch existiert. Wird ein Preset
später geändert und ein Block fällt weg, muss die Position in `pruefung`
landen statt still auf den falschen Block zu schreiben.

### Was den Umfang klein hält

Blockkennungen sind innerhalb eines Presets eindeutig — in allen 24
Map-Presets geprüft, keine Dubletten. Stand heute: 10 SKU-Zeilen, davon 2
einem Preset zugeordnet, 0 mit eigenem Schema. Die Pflege ist einmalig, nicht
laufend.

---

## Umgesetzt (2026-09-15) — Eingang

Der Abholer auf UMOI-SERVER war vor der Gegenseite fertig. Sein Vertrag steht
in `docs/amazon-ingest/UEBERGABE-PETITE-MOMENT.md`, ein anonymisierter
Beispiel-Rumpf daneben in `fixture-ingest-beispiel.json`.

Gebaut:

- `supabase/migrations/20260915000000_proj31_amazon_custom_orders.sql` —
  Tabelle `amazon_custom_orders`, eine Zeile je Bestellposition, Unique auf
  `(amazon_order_id, order_item_id)`.
- `supabase/migrations/20260915000001_proj31_amazon_custom_storage_bucket.sql` —
  privater Bucket `amazon-custom` für Vorschaubild, SVG und XML.
- `src/lib/amazon/ingest.ts` — Aufnahme-Logik samt Dubletten-Entscheidung.
- `src/app/api/amazon/ingest/route.ts` — Endpunkt, Bearer-Auth über
  `AMAZON_INGEST_SECRET`.
- `src/lib/amazon/ingest.test.ts` — 16 Tests auf die reinen Bausteine.

Abweichungen vom Tabellenvorschlag aus Abschnitt 6 der Übergabe:

- **`xml_path` ergänzt.** Die Übergabe nennt das XML verzichtbar, der
  Vorschlag hatte keine Spalte dafür. Eine Spalte ist billiger als eine
  weggeworfene Datei.
- **`ingest_warnings` ergänzt.** Fehlende Assets, ein abgeleitetes
  `customization_item` oder eine abweichende Längenangabe sollen sichtbar
  sein, statt still zu verschwinden.
- **`queue_status` ohne CHECK-Constraint.** Der Lebenszyklus wird in dieser
  Spec gerade erst entworfen; ein Constraint hieße bei jedem neuen Zustand
  eine Migration — und im Projekt ist jede Migration sofort produktiv. Die
  bekannten Werte stehen im Spalten-Kommentar.

Zwei Verhaltensentscheidungen, die in der Übergabe offen blieben:

- **Ein Storno nimmt nur einen ungedruckten Auftrag aus der Queue.** Ist
  `printed_at` gesetzt, wird zwar `order_state` aktualisiert, `queue_status`
  aber nicht mehr angefasst — der Druck ist passiert, das soll die Queue nicht
  nachträglich leugnen.
- **Ein fehlendes Asset löscht nie ein vorhandenes.** Amazons ZIP ist nicht
  immer erreichbar; ohne diese Regel verlöre ein Rückschau-Lauf das
  Vorschaubild. Umgekehrt zählt ein nachgereichtes Asset als Änderung und
  wird ergänzt.

Nicht Teil dieses Schritts: SKU→Preset-Zuordnung, Auswertung von
`customization_item`, Render, Queue-Oberfläche. Die Zeilen bleiben vorerst auf
`queue_status = 'neu'` stehen.

---

## Behoben (2026-09-15) — Schriftabgleich meldete bekannte Schriften als unbekannt

Beim Öffnen einer Bestellung im Editor erschienen Hinweise wie *„Schrift
‚Cathalia' (title) ist nicht in der Bibliothek — Preset-Schrift bleibt
stehen"*, obwohl Cathalia und Caviar Dreams seit jeher im Editor stehen. Das
Poster wäre mit der Preset-Schrift gedruckt worden und damit anders, als der
Käufer es bei Amazon gesehen hat.

Zwei Ursachen in `src/app/api/admin/amazon/orders/[id]/editor/route.ts`:

- **Nur die halbe Bibliothek gefragt.** Der Abgleich las ausschließlich die
  Tabelle `fonts`. Dort stehen aber nur die vom Admin über PROJ-47
  hochgeladenen Schriften (aktuell drei). Die neun Stammschriften leben in
  `FALLBACK_FONTS` in `src/lib/fonts.ts` plus den `@font-face`-Regeln in
  `globals.css`; die für PROJ-47 vorgesehene Seed-Migration, die sie in die
  Tabelle spiegeln sollte, existiert nicht. Der Editor selbst führt beide
  Quellen korrekt zusammen (`useFonts`), diese Route tat es nicht — also galt
  für Amazon-Bestellungen *jede* Stammschrift als unbekannt.
- **Namen exakt verglichen.** Amazon liefert den Namen so, wie der Käufer ihn
  gesehen hat („Caviar Dreams"), die Bibliothek führt den Schnitt unter seinem
  CSS-Namen („CaviarDreams"). Der Vergleich ignorierte nur Groß- und
  Kleinschreibung und scheiterte am Leerzeichen.

Geändert: Die bekannte Menge entsteht jetzt aus Tabelle **und**
`FALLBACK_FONTS`, verglichen wird über eine normalisierte Form (Leerzeichen,
Punkte, Unter- und Bindestriche entfallen). Gesetzt wird der Name, unter dem
der Renderer die Schrift kennt — nicht Amazons Schreibweise. Beiläufig
mitgezogen: die Tabellenabfrage filtert nun auf `status = 'published'`, damit
kein Entwurf gesetzt wird, den der Editor gar nicht anbietet.

Gegen die echten Daten geprüft: die einzigen zwei Schriftwünsche im Bestand
(„Cathalia", „Caviar Dreams") lösen auf `Cathalia` und `CaviarDreams` auf.

Offen, aber nicht Teil dieses Fixes: Die PROJ-47-Phase-2-Seed-Migration fehlt
weiterhin. Solange sie fehlt, ist `FALLBACK_FONTS` für die neun Stammschriften
die einzige Wahrheit — jede weitere Stelle, die die Bibliothek prüft, muss
beide Quellen lesen.

---

## Anhang: verworfener Ursprungs-Scope (Stand 2026-04-28)

Der ursprüngliche Entwurf holte Bestelldaten, Lieferadresse und Anpassungsdaten über die Selling Partner API und meldete den Versand dorthin zurück. Er setzte voraus: Identitätsverifizierung im Solution Provider Portal, ein ausgefülltes Lösungsanbieterprofil, freigegebene Rollen `Orders`, `Direct-to-Consumer Shipping` und `Product Listing`, Zugangsdaten samt Erneuerungs-Token, sowie Sandbox-Tests vor dem Produktivbetrieb. Dazu kamen Token-Bucket gegen die Rate-Limits, Wiederholungen mit wachsendem Abstand, verschlüsselte Lieferadressen, maskierte Protokolle und eine Löschfrist für Rohdaten.

Davon war zum Zeitpunkt des Abbruchs erledigt: Migration vom alten Developer Central, E-Mail-Authentifizierung, Freischaltung der Sandbox-App-Erstellung. Offen und nie beantragt: Identitätsverifizierung, Compliance-Fragebogen, Produktiv-Rollen.

Der Entwurf ist nicht gescheitert, sondern überflüssig geworden: Drei seiner vier Aufgaben erledigt JTL bereits, und die vierte ist ohne Schnittstelle erreichbar.

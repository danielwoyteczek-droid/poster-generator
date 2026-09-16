# PROJ-31: Amazon-Custom-Anpassungsdaten-Importer

## Status: In Review
**Created:** 2026-04-28
**Last Updated:** 2026-09-16

> **Stand:** Phase 0 und 2 sind vom Abholer auf UMOI-SERVER erledigt — er
> liest JTL und schickt fertige Positionen. Der Eingang auf petite-moment
> steht ebenfalls (siehe *Umgesetzt* unten). Phase 3 ist gebaut, bis auf die
> gemeinsame Queue mit Etsy; der Auto-Render ist bewusst entfallen.
>
> Die Feldzuordnung Amazon → Preset ist gebaut (siehe *Umgesetzt — Feldzuordnung*
> unten), ebenso die Vorschau in der Prüf-Queue.
>
> Der erste Echtlauf (Phase 4) ist am 2026-09-15 gelaufen: Bestellung
> `305-5531288-7707506` lief von der JTL-Zeile bis zum fertigen Poster durch.
>
> Am 2026-09-16 nachgezogen: Druckdatei bei Freigabe, Handkorrekturen, die
> eine Neuauswertung überleben, Schriftprüfung in der Auswertung,
> Abholprotokoll und Sentry (siehe *Umgesetzt — Druckdatei, Korrekturen,
> Betrieb*).
>
> Offen bleiben: die gemeinsame Queue mit Etsy (bewusst zurückgestellt) und
> die Zuordnung der neun noch ungepflegten SKUs — Letzteres ist
> Dateneingabe, keine Entwicklung.

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

> **Abgleich gegen den Code am 2026-09-16.** `[x]` = gebaut und im Code
> nachgesehen, `[ ]` = fehlt. *Teilweise* steht dabei, wenn ein Teil fehlt.
> Kriterien, die den Abholer auf UMOI-SERVER betreffen, sind nach dem
> Übergabe-Vertrag (`docs/amazon-ingest/`) und dem Echtlauf vom 2026-09-15
> bewertet — der Abholer-Code liegt nicht in diesem Repo.

### Zuordnung SKU → Design
- [x] Admin-Seite listet alle bekannten Amazon-SKUs, ungezuordnete zuerst
- [x] Pro SKU: Preset auswählbar, Feld-Schema pflegbar, Notizfeld — Notiz seit 2026-09-16 im aufgeklappten Bereich bearbeitbar
- [x] Unbekannte SKUs aus dem Import legen automatisch eine offene Zeile an, statt die Bestellung zu verwerfen
- [x] Nach nachgetragener Zuordnung lassen sich betroffene Bestellungen erneut verarbeiten — Speichern einer SKU wertet ihre wartenden Positionen neu aus

### Abholung und Auswertung
- [x] Der Abholer erkennt neue Positionen mit `LQ-`-SKU und überspringt alle anderen
- [x] Anpassungsdaten werden gelesen, egal ob die JTL-Spalte das vollständige JSON oder nur einen Link darauf enthält — `customization_source` `jtl_column` / `downloaded_zip`
- [x] Eine bereits importierte Position wird nicht doppelt angelegt
- [x] Alle Käuferangaben eines Auftrags werden erfasst: Texte, Auswahlfelder, Schrift und Farbe — je Textblock zugeordnet
- [x] Ein unbekannter Feldtyp blockiert den Import nicht, wird aber in der Queue sichtbar gemeldet
- [x] Fehlende Pflichtfelder oder Werte, die nicht zum erwarteten Muster passen, führen zu „Prüfung nötig" — niemals zu stillem Überspringen

### Feldzuordnung Amazon → Preset
- [x] Je SKU ist hinterlegt, welches Anpassungsfeld welchen Textblock des Presets befüllt — die Zuordnung liegt in den Daten, nicht im Code
- [x] Je Zuordnung ist hinterlegt, was bei leerem Feld geschieht: automatisch, Preset-Text oder leer
- [x] Ein leer gelassenes Koordinatenfeld lässt den Koordinatenblock automatisch; ein ausgefülltes ersetzt ihn durch den Freitext des Käufers
- [x] Ein Textfeld ohne gepflegte Zuordnung schickt die Position in die Prüfung — es wird nicht der Reihe nach verteilt
- [x] Beim ersten Auftreten einer SKU schlägt das System eine Zuordnung vor; unbestätigt zählt sie als ungepflegt
- [x] Zeigt eine Zuordnung auf einen Block, den das Preset nicht mehr enthält, landet die Position in der Prüfung
- [x] Die Pflegemaske beschriftet die Textblöcke mit ihrem Preset-Text, nicht mit ihrer internen Kennung

### Ort und Editor-Zustand
- [x] Die Ortsangabe des Käufers wird über dieselbe Ortssuche aufgelöst, die im Editor hinter dem Suchfeld liegt — MapTiler, `geocode.ts`
- [x] Hat der Käufer zusätzlich Koordinaten eingetippt, schlagen diese den Textfund
- [x] Kein Treffer oder mehrdeutiger Treffer → „Prüfung nötig" statt falsch zentrierter Karte
- [x] Der Editor-Zustand entsteht aus dem Preset als Basis, die Käuferangaben überschreiben nur die dafür vorgesehenen Elemente
- [x] Die vom Käufer gewählte Schrift wird gegen die Schriftbibliothek aufgelöst; ist sie unbekannt, greift die Preset-Schrift und die Position wird markiert — seit 2026-09-16 prüft auch die Auswertung und setzt „Prüfen"
- [x] Format- und Rahmenangabe des Käufers werden übernommen — Format in den Editor-Zustand; der Rahmen ist keine Postereigenschaft, sondern Versandinfo, und steht als „Mit Rahmen" in der Detailansicht

### Render und Prüf-Queue
- [x] ~~Nach erfolgreicher Auswertung wird automatisch gerendert~~ → **verworfen 2026-09-15**, ersetzt durch: die Detailansicht zeigt das Poster beim Ansehen, ohne gespeicherten Render (Begründung unter *Entschieden — Auto-Render*)
- [x] Die Druckdatei entsteht bei der Freigabe und ist aus der Queue herunterladbar; ein fehlgeschlagener Render ist einzeln wiederholbar — PDF direkt aus der Vorschau, nur bei druckfertigen oder gedruckten Bestellungen; bei Fehler erneut klicken
- [ ] Die Queue zeigt Etsy- und Amazon-Bestellungen gemeinsam, mit Filter nach Quelle und Status — **zurückgestellt 2026-09-16:** Etsy läuft ohne API über den CSV-Import, das Zusammenlegen bringt im Alltag gerade wenig. Die Amazon-Queue hat den Statusfilter
- [x] Detailansicht zeigt Vorschau, erkannte Felder mit Herkunft, Gestaltungsangaben und die Rohdaten
- [x] Einzelne Feldwerte sind korrigierbar; danach lässt sich neu rendern — die drei beim Abgleich gefundenen Mängel sind am 2026-09-16 behoben
- [x] Status „Wartet auf Druck" ist der Zustand, in dem eine Bestellung druckfertig auf den Betreiber wartet — heißt im Code `bereit`, in der Oberfläche „Druckfertig"
- [x] Eine gedruckte Bestellung lässt sich abhaken und verschwindet aus der offenen Liste — mit „Doch nicht gedruckt" als Rücknahme

### Betrieb
- [x] Jeder Abholvorgang wird protokolliert: Zeitpunkt, gefundene, übernommene und fehlgeschlagene Positionen — `amazon_ingest_runs`, in der Queue als „Letzter Abgleich"
- [x] Fehler landen mit Positionsbezug in Sentry — Tag `amazon_order_item_id`, ohne Käufereingaben
- [x] Das Zugangsgeheimnis des Abholers liegt ausschließlich in Umgebungsvariablen — `AMAZON_INGEST_SECRET`
- [x] Die JTL-Zugangsdaten verlassen den lokalen Abholer nicht

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

## Feldzuordnung Amazon → Preset (entschieden und umgesetzt 2026-09-15)

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

## Entschieden (2026-09-15) — Auto-Render und Druckdatei

Der ursprüngliche Plan war: nach erfolgreicher Auswertung automatisch die
Druckdatei rendern und ablegen. **Das wird nicht gebaut.**

Der Einwand des Betreibers: Ob ein Design wirklich passt, entscheidet ohnehin
ein Mensch — ein langer Name bricht um, ein Kartenausschnitt sitzt daneben.
Eine Druckdatei, die vor dieser Prüfung entsteht, ist doppelt unerwünscht:
sie kostet Rechenzeit für etwas, das vielleicht verworfen wird, und sie liegt
danach herum und lädt dazu ein, die falsche Datei zu greifen.

Die Trennung, auf die es hinausläuft:

| | Wann | Wozu |
|---|---|---|
| **Vorschau** | beim Ansehen der Bestellung | macht die Prüfung zum Blick statt zum Klickweg |
| **Druckdatei** | erst auf die Freigabe des Betreibers | hochauflösend, und nur für das, was wirklich gedruckt wird |

Der Mensch bleibt also in der Schleife — er prüft nur an einem Bild statt an
einem Editor-Ladevorgang.

**Was dadurch entfällt:** Render-Worker-Anbindung für Bestellungen,
Speicherplatz für Vorschaubilder, Spalten für Render-Status und -Fehler, ein
Wiederhol-Knopf für fehlgeschlagene Vorschau-Renders, und die Frage, was mit
einem gespeicherten Bild geschieht, wenn sich Zuordnung oder Preset danach
ändern. Die Vorschau kann nicht veralten, weil es sie zwischen zwei Blicken
nicht gibt.

---

## Umgesetzt (2026-09-16) — Druckdatei, Korrekturen, Betrieb

Nach dem Abgleich der Abnahmekriterien gegen den Code. Entscheidungen des
Betreibers dazu: Druckdatei im Browser erzeugen und direkt laden, ohne
Ablage; gemeinsame Queue mit Etsy zurückstellen.

### Druckdatei bei Freigabe

- `AmazonOrderPreview.tsx` — Knopf „Druckdatei (PDF)" unter dem
  Vorschaubild. Gebaut wird im selben Store, aus dem das Bild stammt, mit
  `exportPDF` — demselben Export wie im Editor. Aktiv nur bei `bereit` oder
  bereits gedruckt (Nachdruck); sonst steht dort, dass erst geprüft wird.
  Dateiname `amazon-<Bestellung>-<Position>-<Format>.pdf`.
- Nach dem Laden hält `PATCH print_file_created` den Zeitpunkt in der
  vorhandenen Spalte `rendered_at` fest; die Queue zeigt ihn an. Die Datei
  selbst wird nicht gespeichert.
- `useMapExport` — `exportPNG`/`exportPDF` nehmen optional einen Dateinamen
  und melden zurück, ob der Export gelang. **Geteilter Code:** einziger
  weiterer Aufrufer ist `ExportTab.tsx` (Karten-Editor), der beides nicht
  nutzt und unverändert läuft.

### Korrekturen, die eine Neuauswertung überleben

Beim Abgleich gefunden: Eine Korrektur schrieb direkt in `parse_result`,
und jede Neuauswertung — auch das Speichern der SKU-Zuordnung — ersetzte
das vollständig. Die Korrektur war still weg.

- Migration `20260916000000_proj31_amazon_corrections_and_runs.sql` —
  Spalte `field_corrections`. `resolveAndSave` liest sie frisch und legt sie
  mit `applyCorrections` über das Ergebnis des Abgleichs, danach wird neu
  geprüft. Damit holt ein nachgetragenes Pflichtfeld die Position aus der
  Prüfung, und ein korrigierter Ort wird neu gesucht.
- `PATCH correct_field` / `reset_field` — speichern bzw. entfernen die
  Korrektur und werten sofort neu aus.
- Queue — zeigt alle Felder des Schemas, nicht nur die erkannten, markiert
  fehlende Pflichtfelder, bietet „Zurücknehmen" an. Die Vorschau lädt nach
  einer Änderung neu. Ist die Bestellung im Editor angepasst, steht dort,
  dass Korrekturen das Poster nicht mehr ändern.
- **Mitbehoben:** Eine im Editor übernommene Bestellung (`editor_state`)
  fiel beim nächsten Speichern der SKU zurück in „Prüfen". Jetzt bleibt sie
  druckfertig; die Hinweise der Automatik bleiben sichtbar.

### Schrift in der Auswertung

`src/lib/amazon/fonts.ts` hält den Abgleich gegen die Bibliothek, den
vorher nur die Editor-Route kannte. Die Auswertung nutzt ihn jetzt auch:
eine unbekannte Schrift ergibt einen Hinweis und „Prüfen". Freigeben lässt
sich die Bestellung dann über „Im Editor öffnen → Anpassung übernehmen".
Im Bestand ändert das nichts — die einzigen zwei Schriftwünsche sind bekannt.

### Betrieb

- Tabelle `amazon_ingest_runs` — ein Eintrag je Aufruf des Abholers, auch
  ohne neue Position. Die Queue zeigt „Letzter Abgleich" mit Anzahl der
  Fehlschläge; vorher war nur die jüngste neue Bestellung sichtbar.
- Sentry — Fehler einzelner Positionen als Meldung mit Tag
  `amazon_order_item_id`, ohne Käufereingaben. Ein fehlschlagender
  Protokolleintrag geht ebenfalls an Sentry, kippt aber die Antwort an den
  Abholer nicht.
- SKU-Verwaltung — Notiz bearbeitbar, ohne die wartenden Bestellungen neu
  auszuwerten.

### Geprüft

`tsc --noEmit` ohne neue Fehler; `vitest run src/` mit 301 Tests grün,
davon 9 neu in `resolve.test.ts`; Produktionsbuild übersetzt. Migration
angewendet und Spalte sowie Tabelle per Abfrage bestätigt.

**Nicht geprüft:** alles im Browser. Die Admin-Seiten liegen hinter dem
Login, und es gibt keine E2E-Anmeldung. Vor dem Merge von Hand ansehen:
Druckdatei an einer druckfertigen Bestellung laden und das PDF mit der
Vorschau vergleichen; ein Feld korrigieren, dann „Neu auswerten" — die
Korrektur muss stehen bleiben. `npm run lint` lief nicht, weil ESLint 9
keine `eslint.config.*` findet — das betrifft das ganze Repo.

### Beim Abgleich gefunden, nicht behoben

`renderPreview()` in `useMapExport` gibt `placeLabelsVisible` und `locale`
nicht an den Renderer weiter, der Export (`run`) schon. Blendet ein Preset
Ortsnamen aus, zeigt die Vorschau sie trotzdem, die Druckdatei nicht.
Heute ohne Wirkung: keins der 24 Karten-Presets blendet sie aus. Nicht
angefasst, weil `renderPreview` auch die Preset-Renders von PROJ-30 und die
Vorschaubilder beim Preset-Speichern baut — eine Änderung dort gehört durch
`/qa` für diese Features.

---

## Umgesetzt (2026-09-15) — Vorschau in der Prüf-Queue

- `src/lib/amazon/apply-order-to-editor.ts` — die Übersetzung Bestellung →
  Editor-Zustand, herausgezogen aus `AmazonOrderApplier`. Sie lag dort als
  einzige Kopie; jetzt lesen Editor und Vorschau dieselbe Funktion. Zwei
  Kopien wären auseinandergelaufen, und dann zeigte die Vorschau etwas
  anderes als der Editor — genau das Vertrauen, auf dem die Prüfung beruht,
  wäre dahin. Meldungen an den Benutzer macht sie nicht: was passiert ist,
  kommt als Rückgabewert zurück, und die beiden Aufrufer machen daraus, was
  zu ihnen passt.
- `AmazonOrderPreview.tsx` — lädt die Bestellung, wendet sie an, wartet auf
  Schriften plus denselben Puffer wie der Headless-Render (1500 ms) und baut
  das Bild über `useMapExport().renderPreview()`. Dasselbe `renderPreview()`,
  aus dem auch die Druckdatei entsteht, also zeigt die Vorschau das Poster
  und keine Nachbildung. Das Format kommt aus dem Zustand *nach* dem
  Anwenden — eine A3-Bestellung als A4 zu rendern zeigte den falschen
  Ausschnitt.
- `/private/admin/amazon/orders/[id]/vorschau` — nackte Admin-Seite, die die
  Queue in einem Rahmen einbettet. Der eigene Seitenaufruf ist Absicht: Der
  Editor-Store, den die Vorschau befüllt, bleibt darin und färbt nicht auf
  die Admin-Oberfläche ab. Beim Schließen ist er mitsamt Zustand weg.
- `AdminAmazonOrders.tsx` — „Unser Poster" steht in der Detailansicht über
  „Amazons Vorschau". Beide nebeneinander beantworten die eigentliche Frage:
  Passt das, was wir drucken, zu dem, was der Käufer bestellt hat?

Kein Worker, kein Speicherplatz, keine Migration, keine neue Spalte.

### Behoben dabei — die Vorschau zeigte den Ort des Presets

Beim ersten Ansehen stand auf dem Bild nicht der Ort der Bestellung, sondern
der des Presets.

Der Grund: `applyPreset` und `applyOverlay` schreiben die Zielposition nach
`pendingCenter`. Das ist kein Zustand, sondern ein **Auftrag an die Karte** —
im Editor liest MapLibre ihn, fährt dorthin und schreibt das Ergebnis nach
`viewState`. Die Vorschau hat keine Karte, also führte den Auftrag niemand
aus, und `renderPreview()` baute sein Bild aus dem unveränderten `viewState`.
Derselbe Stolperstein, den der Headless-Render von PROJ-30 schon kennt: auch
er schreibt `viewState` direkt (`HeadlessRenderBridge`).

Behoben mit `commitPendingCenter()` in `apply-order-to-editor.ts` — führt den
offenen Auftrag selbst aus, für Aufrufer ohne Karte. Der Editor ruft sie
nicht auf; dort gehört das Fahren der Karte.

**Zweiter Fund, derselbe Ort — trifft auch den Editor:** `applyOverlay` setzte
`pendingCenter.zoom` aus `viewState.zoom`. Unmittelbar davor hatte
`applyPreset` den Preset-Zoom nach `pendingCenter` geschrieben, und die Karte
hatte ihn noch nicht gelesen — beide Aufrufe laufen synchron hintereinander.
Der Überschreiber griff damit auf den Zoom von *vorher* zurück und warf den
Preset-Ausschnitt weg. Jetzt gewinnt `pendingCenter.zoom`.

### Geprüft

`tsc --noEmit` ohne neue Fehler (die zwei bestehenden liegen in
`upload-overlay/route.test.ts` und `useMobileSheet.test.ts` und sind
PROJ-31-fremd); `vitest run src/` mit 292 Tests grün; Produktionsbuild
übersetzt, die Route steht im Manifest.

Am angemeldeten Browser nachgesehen: Die Detailansicht zeigt das Poster, und
der Ort ist der der Bestellung.

**Nicht geprüft:** der Editor-Pfad nach dem Zoom-Fix. `applyOverlay` ist
geteilter Code — was die Vorschau richtig macht, ändert auch, mit welchem
Ausschnitt eine Bestellung im Editor aufgeht. Beim nächsten „Im Editor
öffnen" mit ansehen.

**Keine Unit-Tests:** Kein bestehender Test im Repo fasst den Editor-Store an.
Das Gerüst dafür aufzubauen wäre mehr Arbeit als die Änderung selbst; die
Prüfung ist hier der Blick auf das Bild.

**Offen, falls die Vorschau zu lange braucht:** Sie baut die Karte bei jedem
Öffnen neu. Bei einer Bestellung ist das unerheblich; wenn die Queue länger
wird und das Warten stört, wäre ein zwischengespeichertes Bild der nächste
Schritt — dann aber mit der Frage, wie es erkennt, dass es veraltet ist.

---

## Umgesetzt (2026-09-15) — Feldzuordnung

Der Entwurf oben, gebaut. Zwei Schritte, zwei Commits.

### Auswertung und Anwendung

- `src/lib/amazon/field-mapping.ts` — reine Funktionen: `readPresetBlocks`,
  `checkMapping`, `planBlockActions`, `blockLabel`, `suggestTargets`. Keine
  Datenbank, damit Auswertung und Editor-Route dieselbe Wahrheit lesen.
- `personalization-parser.ts` — `target` und `whenEmpty` am Schemafeld.
  Beide optional: „nicht gepflegt" bleibt ein eigener Zustand, und die
  bestehenden Etsy-Schemata gelten unverändert weiter. Keine Migration, die
  Spalte `personalization_schema` ist bereits JSONB.
- `resolve.ts` — prüft die Zuordnung gegen die Blöcke des Presets und setzt
  `pruefung`, wenn ein Textfeld kein Ziel hat oder ein Ziel ins Leere zeigt.
- Editor-Route — baut Blockanweisungen statt einer Textreihenfolge.
  `TEXT_ORDER` ist entfallen.
- `AmazonOrderApplier` — wendet die Anweisungen über die Blockkennung an.
  Ein Freitext auf einem Koordinatenblock setzt `isCoordinates: false`,
  dieselbe Regel, die der Editor bei einer Handeingabe anwendet.

### Pflege

- `AdminAmazonSkuMapping.tsx` — die Maske. Auswahl je Textfeld: Zielblock
  (beschriftet mit dem Preset-Text) und Leer-Regel. Das rohe JSON liegt
  darunter unter „Erweitert" und bearbeitet denselben Entwurf, damit beide
  Ansichten nicht auseinanderlaufen.
- `suggestTargets` — Vorschlag in drei Stufen: Koordinatenfeld auf
  Koordinatenblock, dann einander enthaltende Beschriftungen, dann der Rest
  der Reihe nach. Die dritte Stufe ist geraten und wird in der Maske als
  solche ausgewiesen. Der Vorschlag füllt nur den Entwurf.
- Die SKU-Liste zeigt je Zeile, wie viele Textfelder noch kein Ziel haben.

### Gepflegte Daten

`LQ-30001-09`: `title` → `block-title`, `names` → `block-1789496636322`,
`subline` → `block-coords` mit `whenEmpty: auto`.

Der Auftrag, an dem der Fehler auffiel, ist damit richtig: Der Käufer hatte
„Stadt und Koordinaten" mit `Forever <3` gefüllt; das fiel vorher unter den
Tisch, weil das Preset nur zwei Blöcke ohne Koordinaten hat und die von Titel
und Namen belegt waren.

`LQ-30001-01` (Heart Love) bleibt bewusst ungepflegt — es liegt keine echte
Bestellung vor, und ein geratenes Mapping ohne Bestätigung ist genau das, was
diese Änderung verhindern soll.

### Geprüft

26 Unit-Tests in `field-mapping.test.ts` gegen die echten Blockkennungen von
`AMZ_LQ-30001-09`; `vitest run src/` mit 292 Tests grün; `tsc --noEmit` ohne
neue Fehler; Produktionsbuild übersetzt.

**Nicht geprüft:** Die Maske ist für 375 px gebaut (die Zeilen stapeln unter
`sm` auf eine Spalte), aber nicht am laufenden Gerät angesehen — die
Admin-Seite liegt hinter dem Login, und es gibt keine E2E-Anmeldung im Repo.

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

---

## QA Test Results

**Tested:** 2026-09-16
**App URL:** http://localhost:3000 (Dev, gegen die gemeinsame Dev/Prod-Datenbank)
**Tester:** QA Engineer (AI)

### Wie getestet wurde — und die Grenze

Die Admin-Oberflächen liegen hinter dem Login, und das Repo hat keine
E2E-Anmeldung. **Queue, SKU-Verwaltung, Vorschau und Druckdatei sind daher
nicht im Browser bedient worden.** Bewertet wurden sie über den Code, über
einen lesenden Probelauf der Auswertung gegen die echte Bestellung
`305-5531288-7707506` (ohne Schreiben, ohne Ortssuche) und über den
Zugriffsschutz von außen. Einen Aufruf des Eingangs mit gültigem Geheimnis
gab es bewusst nicht — Dev schreibt in die Produktionsdatenbank.

Cross-Browser (Firefox, Safari) und die Breiten 375/768/1440 px: nicht
geprüft, aus demselben Grund. Laut Code stapelt die Detailansicht unter
`md` einspaltig, und die Tabelle scrollt waagerecht.

### Acceptance Criteria Status

#### AC-1: Zuordnung SKU → Design
- [x] Ungezuordnete SKUs stehen oben (Sortierung in `GET /api/admin/amazon/skus`)
- [x] Preset, Feld-Schema, Notiz pflegbar (Code; Notiz speichert ohne Neuauswertung)
- [x] Unbekannte SKU legt offene Zeile an (Code, `resolve.ts`)
- [x] Nachgetragene Zuordnung wertet wartende Positionen neu aus (Code, `resolveBySku`)

#### AC-2: Abholung und Auswertung
- [x] `LQ-`-Filter, JSON-oder-Link, Dubletten: laut Abholer-Vertrag und Echtlauf; Dublettenlogik zusätzlich in `ingest.test.ts`
- [x] Käuferangaben je Textblock: Probelauf liefert alle 7 Felder, Werte identisch zum gespeicherten Ergebnis (nur die Schlüsselreihenfolge weicht ab, JSONB sortiert um)
- [x] Unbekannter Feldtyp → Hinweis, kein Abbruch (Code)
- [x] Fehlendes Pflichtfeld → „Prüfen": Probelauf mit geleertem Ort ergibt `pruefung` und „Pflichtfelder fehlen: location"

#### AC-3: Feldzuordnung Amazon → Preset
- [x] Alle 7 Kriterien — 26 Unit-Tests in `field-mapping.test.ts` grün

#### AC-4: Ort und Editor-Zustand
- [x] Ortssuche, Koordinaten schlagen Text, mehrdeutig → Prüfung (Code)
- [x] Preset als Basis, gezielte Überschreibung (Code, geteilte `applyOrderToEditor`)
- [x] Unbekannte Schrift → Prüfung: 3 Unit-Tests; im Bestand ohne Wirkung, beide Schriften der echten Bestellung sind bekannt
- [x] Format übernommen, Rahmen als Hinweis „Mit Rahmen" (Code)

#### AC-5: Render und Prüf-Queue
- [x] Druckdatei bei Freigabe — **nur Code geprüft**, keine PDF erzeugt
- [ ] Gemeinsame Queue mit Etsy — bewusst zurückgestellt (Entscheidung 2026-09-16), kein Fehler
- [x] Detailansicht mit Vorschau, Feldern, Gestaltung, Rohdaten (Code; Vorschau am 2026-09-15 im Browser gesehen)
- [x] Korrektur überlebt Neuauswertung: Probelauf mit Korrektur `names` ergibt den korrigierten Wert und `bereit`; 6 Unit-Tests
- [x] „Druckfertig" als Wartezustand, „Gedruckt" nimmt aus der offenen Liste (Code)
- [x] ~~BUG: siehe BUG-1 — eine stornierte Bestellung kann wieder druckfertig werden~~ → behoben 2026-09-16, Nachtest offen

#### AC-6: Betrieb
- [x] Abholprotokoll `amazon_ingest_runs` (Tabelle bestätigt; kein echter Lauf seit der Migration)
- [x] Sentry mit Positionsbezug (Code)
- [x] Geheimnis nur in Umgebungsvariablen, in `.env.local.example` dokumentiert
- [x] JTL-Zugangsdaten bleiben lokal (Architektur)

### Edge Cases Status

#### EC-1: Stornierte Bestellung
- [x] Storno vor dem Druck setzt `storniert`; Probelauf bestätigt, dass die Auswertung `storniert` hält
- [x] ~~BUG: Editor-Übernahme, „Doch nicht gedruckt" und „Gedruckt" prüfen den Storno nicht (BUG-1)~~ → behoben 2026-09-16

#### EC-2: Bestellung mit Menge > 1
- [x] ~~BUG: Die Queue zeigt die Menge nirgends (BUG-2)~~ → behoben 2026-09-16

#### EC-3: Korrektur des Orts bei eingetippten Koordinaten
- [ ] BUG: Korrektur greift nicht, ohne Hinweis (BUG-3)

#### EC-4: Handfreigabe im Editor, danach SKU gespeichert
- [x] Bleibt druckfertig, Hinweise bleiben sichtbar (Code)

#### EC-5: Leere Korrektur auf einem Pflichtfeld
- [x] Zählt als fehlend → Prüfung (Unit-Test und Probelauf)

### Security Audit Results
- [x] Ohne Anmeldung: alle vier Lese-Endpunkte 401, alle Schreibaktionen (PATCH/PUT) 401 — 14 E2E-Tests in `tests/PROJ-31-amazon-order-importer.spec.ts`
- [x] Admin-Seiten und Vorschau leiten ohne Anmeldung zum Login
- [x] Eingang: fehlendes, falsches und leeres Bearer-Token → 401; GET → 405; Vergleich zeitkonstant
- [x] Öffentlicher Supabase-Schlüssel: kein Lesen aus `amazon_custom_orders`, `amazon_sku_mappings`, `amazon_ingest_runs`; kein Schreiben ins Protokoll (401); Bucket `amazon-custom` weder listbar noch öffentlich abrufbar
- [x] Supabase Security Advisor: keine Befunde zu PROJ-31-Tabellen
- [x] Keine Käufereingaben in Sentry-Meldungen; Rohdaten nur in der Admin-Detailansicht; React escaped alle Werte
- [x] `postMessage` zwischen Vorschau und Queue auf die eigene Origin beschränkt
- [ ] Low: `page_url` vom Abholer wird ungeprüft als Link gesetzt (BUG-5)
- [ ] Low, seitenweit: kein `X-Frame-Options`/`frame-ancestors` (BUG-6)
- [x] Rate-Limiting am Eingang: keins — hinter dem Geheimnis vertretbar

### Regression
- [x] `vitest run src/`: 301 Tests grün
- [x] Playwright Chromium: 41 bestanden, 22 übersprungen, 1 fehlgeschlagen — `PROJ-39 … clicking a pill swaps the image`. **Nicht durch PROJ-31:** schlägt auch ohne die Änderungen dieser Sitzung fehl (der Test greift das Logo statt eines Galeriebilds)
- [x] Geteilter Code `useMapExport`: `ExportTab` ruft `exportPNG`/`exportPDF` ohne die neuen optionalen Angaben auf — unverändert; `renderPreview` nicht angefasst
- [x] Produktionsbuild übersetzt

### Bugs Found

#### BUG-1: Stornierte Bestellung kann wieder druckfertig und gedruckt werden
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Eine Bestellung wird bei Amazon storniert → Queue zeigt „Storniert"
  2. Filter „Storniert" → Detail → „Im Editor öffnen" → „Anpassung übernehmen"
  3. Expected: abgelehnt oder zumindest Warnung, Status bleibt „Storniert"
  4. Actual: `PUT …/editor` setzt `queue_status = 'bereit'` ohne Blick auf `order_state` — die Bestellung steht als druckfertig in der offenen Liste, und die Druckdatei ist freigeschaltet
- **Gleiches Muster:** „Gedruckt" (`mark_printed`) ist bei stornierten Bestellungen klickbar; „Doch nicht gedruckt" (`unmark_printed`) setzt immer `bereit`, auch wenn die Bestellung inzwischen storniert ist
- **Priority:** Fix before deployment — eine stornierte Bestellung zu drucken kostet Material und Versand
- **Status: Behoben 2026-09-16.** `PUT …/editor` lehnt stornierte Bestellungen mit 409 ab (Vorabprüfung plus `order_state <> cancelled` im Update gegen einen Storno dazwischen). `mark_printed` lehnt ab; `unmark_printed` setzt bei Storno `storniert` statt `bereit`. Oberfläche: roter Hinweis „Bei Amazon storniert — nicht drucken", kein „Gedruckt"-Knopf, keine Druckdatei (auch nicht als Nachdruck), „Anpassung übernehmen" im Editor gesperrt

#### BUG-2: Bestellmenge ist in der Queue unsichtbar
- **Severity:** Low (vom Betreiber herabgestuft 2026-09-16: rund 95 % der Bestellungen sind 1 Stück)
- **Steps to Reproduce:**
  1. Käufer bestellt dasselbe personalisierte Poster zweimal (`quantity = 2`)
  2. Queue und Detailansicht öffnen
  3. Expected: Menge sichtbar, zumindest wenn > 1
  4. Actual: `quantity` steht in der API-Antwort, wird aber weder in der Tabelle noch in der Detailansicht angezeigt — gedruckt wird ein Poster
- **Priority:** Fix before deployment
- **Status: Behoben 2026-09-16.** Ab 2 Stück: Badge „N Stück" in der Tabelle, „N Stück drucken" im Kopf der Detailansicht und neben dem Druckdatei-Knopf, „N Stück" in der Editor-Leiste

#### BUG-3: Ortskorrektur wirkt nicht, wenn der Käufer Koordinaten angegeben hat
- **Severity:** Low
- **Steps to Reproduce:**
  1. Bestellung mit ausgefülltem Koordinatenfeld
  2. In der Detailansicht „Adresse für die Karte" korrigieren
  3. Expected: Karte zeigt den korrigierten Ort, oder ein Hinweis, dass die Koordinaten Vorrang haben
  4. Actual: Koordinaten schlagen den Ort (so spezifiziert), die Kartenmitte bleibt — ohne Hinweis. Workaround: Koordinatenfeld mitkorrigieren
- **Priority:** Fix in next sprint

#### BUG-4: Arbeitsliste sortiert neueste zuerst, ohne Versandfrist
- **Severity:** Low
- **Steps to Reproduce:** Queue öffnen. Sortiert wird nach `purchase_date` absteigend; `latest_ship_at` wird nicht angezeigt. Der Index der Migration ist für „älteste zuerst" angelegt, und eine Arbeitsliste arbeitet man in der Regel nach Frist ab
- **Priority:** Nice to have

#### BUG-5: `page_url` wird ungeprüft als Link gesetzt
- **Severity:** Low
- **Steps to Reproduce:** Der Abholer liefert `page_url` als freien String (max. 2000 Zeichen), die Detailansicht rendert ihn als `href`. Ein `javascript:`-Link wäre klickbar. Setzt einen kompromittierten Abholer voraus
- **Priority:** Nice to have — im Ingest-Schema auf `https://` beschränken

#### BUG-6: Seiten sind fremd einbettbar (seitenweit, nicht PROJ-31-spezifisch)
- **Severity:** Low
- **Beobachtung:** Weder `next.config.ts` noch die Middleware setzen `X-Frame-Options` oder `frame-ancestors`, obwohl `.claude/rules/security.md` `DENY` vorsieht. Für PROJ-31 wichtig: `DENY` würde die eingebettete Vorschau brechen — beim Nachziehen `SAMEORIGIN` bzw. `frame-ancestors 'self'` wählen
- **Priority:** Fix in next sprint, zusammen mit den Security-Headern aus `/deploy`

### Summary
- **Acceptance Criteria:** 32 von 34 erfüllt; 1 bewusst zurückgestellt (Etsy-Queue), 1 durch BUG-1 eingeschränkt (seither behoben)
- **Bugs Found:** 6 total (0 critical, 0 high, 1 medium, 5 low; BUG-2 vom Betreiber auf Low gesetzt) — BUG-1 und BUG-2 am 2026-09-16 behoben, 4 Low offen
- **Security:** Pass — Zugriffsschutz von außen und über den öffentlichen Schlüssel dicht; zwei Low-Befunde
- **Production Ready:** Formal ja (keine Critical/High) — **empfohlen: noch nicht**
- **Recommendation:** Erst BUG-1 und BUG-2 beheben, dann die Druckdatei einmal im Browser erzeugen und mit der Vorschau vergleichen. Solange der Kernablauf nie bedient wurde, kann dort ein High-Fehler liegen, den dieser Test nicht sehen konnte

### Nach der Behebung von BUG-1 und BUG-2 (2026-09-16)
- `tsc --noEmit` ohne neue Fehler; `vitest run src/` 301 grün; PROJ-31-E2E 14 grün
- **Produktionsbuild nicht bestätigt:** bricht ab, auch ohne die Änderungen dieser Sitzung — dem Rechner fehlt Arbeitsspeicher (Webpack: „process out of memory", knapp 3 von 16 GB frei; der seit dem Vorabend laufende Dev-Server hält gut 2 GB). Vor dem Merge mit beendetem Dev-Server wiederholen
- Die Behebungen selbst sind nicht im Browser geprüft (keine Admin-Anmeldung im Test) und brauchen den Nachtest per `/qa`

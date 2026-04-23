# PROJ-21: Layout-Presets

## Status: Architected
**Created:** 2026-04-24
**Last Updated:** 2026-04-24

## Dependencies
- Requires: PROJ-1 (Karten-Editor Core) — Basis-Canvas, Mask-System, Fade-Logik
- Requires: PROJ-2 (Textblock-Editor) — Textblöcke mit Default-Content (Headline, Koordinaten, Datum)
- Beeinflusst: PROJ-8 (Design-Presets) — Layout-Wert muss mitgespeichert werden

## Kontext
Aktuell gibt es eine "Form"-Auswahl im Sidebar, die Kartenform und Text-Layout vermischt.
Speziell `text-below` ist technisch eine Maske, semantisch aber eine Layout-Entscheidung
(wo kommt der Text hin, nicht welche Form hat die Karte). Parallel fehlt ein einfacher
Weg, einen 5 mm Innenrand rund um das Poster zu setzen, den der User gerade nur über
eine Form-Maske (frame1.svg) bekommt.

PROJ-21 trennt Kartenform und Layout sauber und bietet drei Standard-Layouts + einen
regelbaren Innenrand-Slider.

## User Stories
- Als Nutzer möchte ich zwischen einem "vollflächigen" Poster und Postern mit Textbereich
  unten wählen können, damit ich den Platz für Headline und Koordinaten bewusst steuere.
- Als Nutzer möchte ich einen konfigurierbaren Innenrand (0–10 mm) um das gesamte Poster
  einstellen können, damit zwischen Karteninhalt und Posterrand bewusster Abstand bleibt
  (Passepartout-Optik).
- Als Nutzer möchte ich, dass meine Textblöcke beim Layout-Wechsel an die neue Struktur
  angepasst werden, ohne dass mein bereits getippter Text verloren geht.
- Als Nutzer möchte ich, dass meine Kartenform (Kreis, Herz, Split-Varianten) und mein
  Layout unabhängig voneinander kombinierbar sind.
- Als Nutzer möchte ich, dass meine Layout-Einstellung beim Speichern eines Design-Presets
  mit konserviert wird.

## Acceptance Criteria
- [ ] Sidebar zeigt unter "Kartenform" einen neuen Abschnitt "Layout" mit drei Optionen:
      **Vollflächig**, **Text unten 30 %**, **Text unten 15 %**
- [ ] "Text unten 30 %": Karte nimmt die obere 70 % des Posters ein, untere 30 % sind
      textfähiger Bereich
- [ ] "Text unten 15 %": Karte nimmt die obere 85 % des Posters ein, untere 15 % sind
      textfähiger Bereich
- [ ] "Vollflächig": Karte nutzt die volle Posterfläche, kein reservierter Textbereich
- [ ] Die bestehende Fade-Logik (weicher Übergang am Karten-Rand) bleibt auf allen drei
      Layouts erhalten
- [ ] Ein Slider "Innenrand" (0–10 mm, Default 0 mm, 1-mm-Schritte) ist für alle Layouts
      verfügbar und rückt den gesamten Poster-Inhalt um den gewählten Wert vom Papierrand ein
- [ ] Die aktuelle `text-below` Form-Option wird aus dem Form-Picker entfernt und zu
      "Text unten 30 %" migriert
- [ ] Layout funktioniert für Solo- und Duo-Kartenformen (Kreis, Herz, Rechteck,
      Split-Circles, Split-Halves, Split-Hearts) ohne Sonderfälle
- [ ] Bei Layout-Wechsel werden Textblöcke in den reservierten Textbereich repositioniert,
      vom User getippter Text-Inhalt bleibt dabei erhalten (nur Position ändert sich)
- [ ] Design-Presets (PROJ-8) speichern und reproduzieren Layout + Innenrand-Wert
- [ ] Export (PNG + PDF) rendert Innenrand und Textbereich identisch zum Editor-Preview

## Edge Cases
- **Layout-Wechsel mit leerem Text**: Blocks bleiben auch ohne User-Eingabe an der neuen
  Position, mit ihrem Default-Content.
- **Innenrand + Duo-Kartenform**: Split-Mitte bleibt zentriert, beide Hälften rücken
  gemeinsam vom Rand ein.
- **Text unten 15 % mit großem Headline-Font**: Headline muss auf 15 % Höhe passen oder
  sichtbar umbrechen — kein stiller Overflow.
- **Vollflächig-Layout**: kein reservierter Textbereich → frei positionierte Textblöcke
  überlagern die Karte. Ist gewünscht (Overlay-Optik), nicht fehlerhaft.
- **Alte Presets (vor PROJ-21)** mit `maskKey: text-below`: beim Laden automatisch in
  Layout "Text unten 30 %" + Kartenform "Rechteck" konvertieren, kein manueller Eingriff
  nötig.
- **Innenrand = 10 mm bei A4**: bei ca. 210 × 297 mm bleibt mehr als genug Nutzfläche,
  aber Textblöcke am Poster-Rand können abgeschnitten wirken — Drag-Grenzen respektieren
  den Innenrand.
- **Export-DPI**: Innenrand in mm rechnet sich bei PDF-Print-DPI korrekt um, nicht nur in
  Bildschirm-Pixeln.

## Technical Requirements (optional)
- Layout-Wechsel < 100 ms (reine Position + Mask-Update, keine Tile-Neuladung)
- Innenrand-Slider-Änderungen live im Preview ohne Ruckeln
- Backwards-kompatibel: bestehende Presets ohne Layout-Feld nehmen "Vollflächig" als
  Default an

## Abgrenzung zu anderen Features
- **Kartenform** (Kreis, Herz, Splits, SVG-Rahmen wie frame1): bleibt eigener Sidebar-
  Abschnitt, definiert die Silhouette der Karte
- **Dekorativer Poster-Rahmen** (z.B. aufwändigere SVG-Frames, Ornamente): kein Teil von
  PROJ-21, eigener späterer Spec falls gewünscht
- **Textblock-Inhalt und -Formatierung** (PROJ-2): unverändert, Layout nutzt die
  bestehenden Blöcke und deren Default-Text

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Component Structure (Sidebar-Erweiterung)

```
MapTab (Sidebar, linke Spalte)
+-- Kartenstil (schon vorhanden)
+-- Kartenform (schon vorhanden, ohne 'text-below')
+-- Layout (NEU)
|   +-- Tile 'Vollflächig'
|   +-- Tile 'Text unten 30 %'
|   +-- Tile 'Text unten 15 %'
+-- Innenrand (NEU)
|   +-- Slider 0–10 mm
|   +-- Anzeige 'aktueller Wert: X mm'
+-- Farbpalette (schon vorhanden)
+-- Straßen/Marker (schon vorhanden)
```

```
PosterCanvas (Editor-Preview)
+-- Poster-Hülle
    +-- Innenrand-Zone (0–10 mm Padding rund herum)
        +-- Layout-Container (entscheidet Aufteilung)
            +-- Karten-Bereich (volle Höhe ODER 70 % ODER 85 %)
            |   +-- Karte mit Kartenform-Mask + Fade
            +-- Text-Bereich (nur bei Text unten 30 % / 15 %)
                +-- Textblöcke (Headline, Koordinaten, Datum, ...)
```

### B) Data Model (Was gespeichert wird)

Zwei neue Felder im Editor-State (Browser-State, kein Backend):

```
Poster-Konfiguration erweitert um:
- Layout:        'full' | 'text-30' | 'text-15'  (Default: 'full')
- Innenrand:     Zahl 0–10 (in Millimetern, Default: 0)
```

Beides wird zusammen mit dem restlichen Editor-Zustand im **Design-Preset
(PROJ-8)** mitgespeichert — kein zusätzliches Datenbank-Schema nötig, die
Preset-JSON-Struktur bekommt zwei Felder mehr.

Migration: Beim Laden eines Presets ohne diese Felder (alte Presets) gelten:
- `Layout = 'full'` (Standard)
- `Innenrand = 0` (keine Einrückung)
- Zusätzlich: wenn die alte `maskKey = 'text-below'` ist → automatisch auf
  `Layout = 'text-30'` + `maskKey = 'none'` umbiegen, damit niemand sein altes
  Poster zerschießt sieht.

### C) Wie sich die Layouts unterscheiden

| Layout              | Karten-Höhe | Text-Bereich | Fade am Rand |
|---------------------|-------------|--------------|--------------|
| Vollflächig         | 100 %       | kein fester  | wie bisher   |
| Text unten 30 %     | 70 %        | untere 30 %  | wie bisher   |
| Text unten 15 %     | 85 %        | untere 15 %  | wie bisher   |

Der Innenrand-Slider legt sich über ALLE drei Layouts: die ganze Komposition
(Karte + Textbereich) wird um den gewählten Millimeterwert vom Papierrand
eingerückt. Für 0 mm gibt es keinen sichtbaren Effekt.

### D) Verhalten beim Layout-Wechsel

- Text-Inhalt (was der User getippt hat) bleibt **immer** erhalten
- Text-Position wird angepasst: liegt ein Block außerhalb des neuen
  Textbereichs, rückt er in den Textbereich ein. Liegt er bereits innerhalb,
  bleibt er stehen
- Beim Wechsel zu "Vollflächig" bleiben alle Blöcke an ihrer letzten Position
  (Overlay-Optik)
- Beim Wechsel zu einem kleineren Textbereich werden Blöcke entsprechend
  hochgezogen

### E) Tech-Entscheidungen (Warum so)

- **Frontend-only**: Layouts sind reine Darstellung, kein Server-State nötig.
  Spart Datenbank-Migration und hält die Bearbeitung flüssig.
- **Drei feste Layouts statt freier Slider**: Designprinzip für Nicht-Designer
  — Entscheidungen reduzieren, nicht erweitern. Der Innenrand bleibt als
  Slider flexibel, weil dort die Nuance wichtig ist.
- **Innenrand in Millimetern statt Prozent**: der User denkt in Papier-
  Dimensionen (wie beim Bilderrahmen), nicht in Poster-Anteilen.
- **Layout vom Formular (Mask) trennen**: aktuell wird 'text-below' als
  Maske missbraucht. Die Trennung macht es künftig trivial, z.B. "Text oben"
  oder "Text seitlich" zu ergänzen, ohne für jede Kombination eine eigene
  SVG-Maske zu bauen.
- **Kein neuer Preset-Typ**: die bestehende Preset-Struktur wird nur um zwei
  Felder erweitert. Bestehende Presets laufen ohne manuellen Eingriff weiter.

### F) Abhängigkeiten (Packages)

Keine neuen Packages. Nutzt alles Bestehende:
- shadcn **Slider** für den Innenrand-Regler (schon installiert)
- Tailwind für die Layout-Tiles und die Proportionen
- Bestehendes Mask-/Fade-Rendering (unverändert)

### G) Export (PROJ-3) Kompatibilität

Die Export-Pipeline (PNG/PDF) rendert denselben Komponenten-Baum wie das
Editor-Preview. Layout und Innenrand sind in diesem Baum enthalten → im
Export erscheint das Poster identisch zum Preview, inklusive der 5 mm
Einrückung bei A4 oder A3.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

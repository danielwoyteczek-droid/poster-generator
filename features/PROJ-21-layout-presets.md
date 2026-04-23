# PROJ-21: Layout-Presets

## Status: Planned
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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

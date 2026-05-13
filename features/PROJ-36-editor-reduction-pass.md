# PROJ-36: Editor Reduction Pass — Customer-First Sidebar

## Status: In Progress
**Created:** 2026-05-04
**Last Updated:** 2026-05-13

## Design Pivot 2026-05-13 — Sheet → „Erweiterte Optionen"-Switch

The original Phase 2 design used a Sheet/Drawer (right on Desktop, bottom on Mobile) to host the Anpassen-classified controls. Live user testing (2026-05-13) revealed two problems with this approach:

1. **Duplication**: until the Phase-2 classification propagation is finished, every non-gated control renders in BOTH the main sidebar AND the Sheet, so the customer sees „the same controls twice plus the one gated section".
2. **Modal backdrop kills live editing**: shadcn's Sheet ships a dimmed backdrop over the canvas, so the customer cannot watch the poster update while adjusting controls — which is the entire point of a poster editor.

**Iteration 1** replaced the Sheet with a segmented two-button toggle „Standard ↔ Anpassen" at the top of the sidebar. Labels turned out to be unclear in user-testing (Operator-Feedback: „Standard / Anpassen versteht keiner") — pivoted again.

**Iteration 2 (current)** uses a **single Switch labelled „Erweiterte Optionen"** at the *bottom* of the sidebar. Default off. When flipped on, the Anpassen-classified sections are revealed *additively* below the customer-min controls — not a mode swap, but a reveal-pattern (analog zu Windows-Einstellungen / Google-Forms). Customer mental model: „mehr Sektionen werden sichtbar", nicht „ich wechsle in einen anderen Editor-Modus".

Same `EditorViewContext` mechanism remains; `shouldRenderControl()` semantics changed: in `view='anpassen'`, BOTH customer-min and anpassen controls render (previously: only anpassen). Customer-min controls are always visible — the switch only reveals or hides the additional anpassen sections.

**Implementation status (Map editor):**
- ✅ `EditorViewToggle` component — single Switch (shadcn) with i18n label „Erweiterte Optionen", admin-hidden
- ✅ `shouldRenderControl()` made additive (`customer-min` always renders for non-admin; `anpassen` renders only if switch on)
- ✅ `EditorLayout.tsx` (Map-Desktop) — Switch mounted at sidebar bottom (`border-t` separator)
- ✅ `MobileEditorLayout.tsx` (Map-Mobile) — Switch mounted at bottom of MobileBottomSheet content
- ✅ `EditorAnpassenFooter.tsx` + `EditorAnpassenSheet.tsx` files deleted
- ✅ i18n string `editor.advancedOptions` added in DE/EN/FR/IT/ES (replaces previous `viewStandard`/`viewAnpassen`)
- ✅ Smoke test `scripts/smoke-test-anpassen-toggle.ts` — 6/6 passing on Desktop + Mobile viewports (verifies switch presence, default-off state, click flips, canvas stays unobscured)
- ⏳ **Pending**: Phase-2 classification propagation to all ~20 Anpassen-controls (Map-Style, Palette, Layout-Mode, Frame, Marker-Typ, Text-Styling). Without this, the switch is wired up correctly but only the one gated section (Außenbereich-Block) responds to it.
- ⏳ **Pending**: same Switch pattern in Star-Map and Foto-Editor layouts (those layouts never had Sheet+Footer — Switch is purely additive when their classification propagation is ready).

## Dependencies
- Voraussetzt: PROJ-1 (Karten-Editor Core), PROJ-7 (Star-Map), PROJ-32 (Foto-Editor) — die drei Editor-Modi, deren Sidebars hier reduziert werden
- Voraussetzt: PROJ-18 (Mobile Editor) — Mobile-Patterns sind die Referenz für die Reduktions-Wirkung
- Komplementär zu PROJ-25 (Editor UX Consistency Pass) — PROJ-25 polished bestehende Controls (Disabled-States, Drift, Reihenfolge), PROJ-36 entscheidet *welche Controls Customer überhaupt sieht*

## Problem & Ziel
Selbst der Erbauer des Editors (Daniel) verliert mittlerweile den mentalen Faden, welche Controls in welcher Kombination welchen Effekt haben — bestätigt heute (2026-05-04) im Live-Bug-Diagnoseversuch, bei dem ein „Inner Margin" als „text-30 Mode-Effekt" fehlinterpretiert wurde. Wenn der Erbauer kapituliert, hat ein Endkunde null Chance.

Das deckt die bestehende Editor-Low-Friction-Doktrin: **Editor = Konfigurator (Ort → Preset → Text → Kauf), nicht Werkzeug. Profi-Settings aggressiv verstecken.**

PROJ-36 zieht diese Doktrin konsequent durch: identifiziert das Customer-Minimal-Set, versteckt alles andere hinter EINEM `„Anpassen"`-Toggle. Iteration 1 ist **Audit-only** — wir listen alle Controls, klassifizieren sie gemeinsam, *dann* erst Code.

## User Stories
- Als Customer ohne Designerfahrung will ich beim Öffnen des Editors auf einen Blick verstehen, was ich tun muss (Ort + Preset + Text + Kauf), ohne von 30 Slidern und Toggles erschlagen zu werden.
- Als Customer will ich weiterhin Detail-Anpassungen vornehmen können, wenn ich sie wirklich brauche — über einen klar erkennbaren `„Anpassen"`-Knopf, der mir die zweite Ebene öffnet.
- Als Customer will ich, dass mein bereits gespeichertes Projekt mit individuellen Settings exakt so aussieht wie damals — auch wenn diese Settings jetzt hinter `„Anpassen"` versteckt sind.
- Als Operator (Daniel) will ich eine vollständige, dokumentierte Klassifikations­liste aller Editor-Controls haben, damit künftig klar ist, wo neue Features hingehören (Customer-Min, hinter `„Anpassen"`, oder Admin-only).
- Als Operator will ich, dass die Reduktion nicht zu Datenverlust führt — alle bestehenden Werte in geladenen Presets/Projekten bleiben aktiv und änderbar.

## Acceptance Criteria

### Phase 1 — Audit & Klassifikation (vor jedem Code-Change)
- [ ] **Vollständige Inventur** aller sichtbaren Controls in den drei Editor-Sidebars (Map, Star-Map, Foto), aufgeteilt nach Desktop und Mobile, in einer Tabelle mit Spalten:
  - Control-Label (DE)
  - Editor-Modus (Map / Star-Map / Foto / alle)
  - Plattform (Desktop / Mobile / beide)
  - Heutiger Zustand (immer sichtbar / bedingt sichtbar / disabled)
  - Vorgeschlagene Klassifikation: **Customer-Min**, **Anpassen**, oder **Admin-only**
  - Begründung in einem Satz
- [ ] Operator (Daniel) reviewed die Tabelle und gibt **pro Zeile Go/No-Go** für die vorgeschlagene Klassifikation. Audit-Ergebnis wird im Spec-File festgehalten (Sektion „Klassifikations-Beschluss" wird unten ergänzt).
- [ ] **Customer-Min** enthält mindestens (auf jeden Fall sichtbar im Default-Layout):
  - Ortssuche
  - Preset-Auswahl
  - Text-Editing (Inhalte, nicht Schriftart/Position)
  - Marker auf der Karte: sichtbar + per Drag verschiebbar (Style/Farbe/Icon → Anpassen)
  - Druckformat-Wahl (A4 / A3)
  - Orientierung-Wahl (Hochformat / Querformat)
  - Kauf-Button / In den Warenkorb
- [ ] **Anpassen** enthält im Default-Vorschlag (kann pro Item via Audit umklassifiziert werden):
  - Maskenform (Kreis / Herz / Vollbild / Custom)
  - Layout-Mode (Vollbild / Text-30 / Text-15)
  - Außenbereich-Mode (Voll / Faded / Glow / Keiner) inkl. dazugehöriger Margin/Opacity/Glow-Settings
  - Innerer Rand
  - Form-Kontur (Innen-Frame: Stroke, Farbe, Dicke)
  - Dekorativer Außen-Frame (Single/Double, Offset, Thickness, Gap, Farbe)
  - Color-Palette (vorgegebene + custom)
  - Map-Style / Layout-Picker (Klassisch / Minimal / Detail / Tusche / Satellit)
  - Marker-Style (Farbe, Icon)
  - Text-Block-Style (Schriftart, Größe, Farbe, Position)
  - Star-Map-spezifische Sky-Settings (Sky-Farbe, Star-Farbe, Texturen, Konstellationen-Toggles, etc.)
  - Foto-Editor-spezifische Settings (Filter, Crop-Detail, Letter-Mask-Font, etc.)
- [ ] **Admin-only** (heute schon hinter `isAdmin` oder zusätzlich rein zu nehmen):
  - Save-as-Preset
  - Reset-Editor
  - Photo-Mode-Switcher (PROJ-32)
  - Decoration-Picker (PROJ-35)
  - Custom-Mask-Upload-Verwaltung
  - Layout-Designer (Grid Layout Designer aus PROJ-32)

### Phase 2 — `„Anpassen"`-Mechanik + PresetPicker-Move (nach Audit-Approval)
- [ ] EINEN gut auffindbaren `„Anpassen"`-Trigger in der Sidebar (Position oben oder unten am Customer-Min-Block, jedenfalls visuell vom Min-Block abgesetzt). Beschriftung-Vorschlag: `„Anpassen"` (DE) / `„Customize"` (EN/FR/IT/ES) — ggf. mit Icon (z.B. `Sliders`).
- [ ] Trigger ist auf Desktop UND Mobile identisch positioniert und beschriftet.
- [ ] Klick auf den Trigger öffnet alle Anpassen-Controls in einem klaren Sekundär-Bereich. Mechanik kann sein: Akkordeon, Drawer, oder eingeblendete zusätzliche Sektionen — Entscheidung wird in der Architektur-Phase getroffen, NICHT im Spec.
- [ ] Wenn ein Customer ein Projekt/Preset lädt, das nicht-default-Werte in Anpassen-Controls hat:
  - Werte werden **respektiert und gerendert** (nicht reset)
  - Anpassen-Bereich bleibt **kollabiert** (UI-Default; kein automatisches Aufklappen)
  - Erst wenn Customer Anpassen öffnet, sieht er die geladenen Werte und kann sie ändern
- [ ] **PresetPicker-Move im Foto-Editor**: PresetPicker wird aus dem Letter-Mask-Word-Tab herausgezogen und zur persistenten Top-Komponente im Foto-Editor-Sidebar (sichtbar in Letter-Mask, Single-Photo, Photo-Grid). Bestehende `applyPreset()`-Logik wechselt den `layoutMode` auf den im Preset-JSON gespeicherten Wert — keine zusätzliche Mode-Switch-Logik nötig.

### Phase 3 — Verifikation
- [ ] Smoke-Test des Customer-Min-Flows (Ort → Preset → Text → Kauf) in allen drei Editor-Modi (Map, Star-Map, Foto), Desktop + Mobile, ohne dass Anpassen geöffnet wird. Muss zu einem kaufbaren Poster führen.
- [ ] Bestehende gespeicherte Customer-Projekte aus der Pre-PROJ-36-Welt laden und prüfen: Render exakt wie zuvor, Editierbarkeit der custom Settings via Anpassen.
- [ ] Bestehende Presets aus dem Admin laden und prüfen: gleiche Treue.
- [ ] Mobile-Layout: keine versteckten Tabs/Sektionen, die durch die Reduktion ihre Daseinsberechtigung verlieren (z.B. wenn ein ganzer Tab nur ein einziges Anpassen-Control enthielte, sollte er entfernt oder zusammengelegt werden).

## Edge Cases

- **Customer hat im Anpassen-Bereich Werte geändert, schließt Anpassen wieder zu**: Werte bleiben aktiv, Render reflektiert sie. Nichts wird verworfen. Bei Reload wieder dieselben Werte.
- **Customer hat ein Preset gewählt, das nicht-default Anpassen-Settings mitbringt** (z.B. Glow + custom Frame): Anpassen-Bereich bleibt kollabiert (Default), aber die Settings sind aktiv. Optional kleiner Hinweis am Anpassen-Trigger („Anpassen (3 Detail-Settings aktiv)") — Diskussion in Architektur, nicht hier.
- **Mobile mit nur Customer-Min-Controls**: Sidebar wird sehr kurz. Bewusst — der Customer-Min-Flow muss in einem Screen ohne Scrollen sichtbar sein. Wenn doch nicht, wird das in Phase 3 nachgezogen.
- **Star-Map-Editor hat keinen Marker**: Der Customer-Min-Eintrag „Marker" gilt nur für Map-Editor. Pro Editor-Modus kann das Customer-Min-Set leicht abweichen — die Audit-Tabelle macht das pro Modus explizit.
- **Foto-Editor hat keine Ortssuche**: Analog. Customer-Min ist im Foto-Modus: Foto-Upload + Preset-Auswahl + Text + Format/Orientation + Kauf.
- **Preset-Auswahl ist leer für aktuelle Locale**: bestehender Empty-State bleibt; nicht in PROJ-36-Scope (gehört zu PROJ-24 / Preset-Erweiterung).
- **Customer aktiviert Anpassen, ändert was, geht zurück, neues Preset gewählt**: Soll das Preset die Anpassen-Werte überschreiben (Standard-Verhalten heute) oder Customer-Werte erhalten? **Default-Antwort:** Preset überschreibt — wer ein Preset wechselt, will dessen Look, nicht den vorherigen Frankenstein. (Bestehendes Verhalten beibehalten.)
- **Admin-Preview vs. Customer-Sicht**: Admin sieht beim Editieren eines Presets weiterhin alle Controls (Admin-Mode). Der Reduktions-Pass betrifft NUR die Customer-View. Klar trennen.

## Non-Goals

- **Keine Erweiterung der Preset-Anzahl** in PROJ-36. Wenn die aktuellen Presets nicht ausreichen, wird das in einem separaten Spec adressiert (siehe Dependencies / Komplementär).
- **Keine Neugestaltung der Sidebar-Visuals** (Farben, Spacing, Typografie). Nur Sichtbarkeit und Gruppierung. Visual-Polish ist PROJ-23-Land.
- **Keine Logik-Änderungen** an Render-Pipeline oder Preset-Format. Anpassen ist rein UI-Schicht.
- **Kein Mode-Switch „Einfach / Profi"** — bewusst verworfen zu Gunsten des einfacheren Single-`„Anpassen"`-Toggles.
- **Keine Customer-rolle-spezifischen Sichten basierend auf Auth-Status** über `isAdmin` hinaus (z.B. „Power-User-Mode für angemeldete Wiederkäufer"). Out of scope.
- **Keine Refactor-Fleißarbeit** an existierenden Controls (z.B. Slider-zu-Number-Input-Umbau). Nur sichtbar/versteckt + Trigger.

## Klassifikations-Beschluss

### Vorgeschlagene Klassifikation (Stand 2026-05-04, wartet auf Operator-Review)

Tabellen sind dedupliziert über Desktop + Mobile (Klassifikation ist plattform-unabhängig). Plattform-spezifische Abweichungen sind in einer Extra-Spalte vermerkt.

Spaltenlogik:
- **Heute** = wer das Control aktuell sieht (`always` = jeder, `admin-only` = nur Admin, `conditional` = nur unter bestimmten Umständen)
- **Vorschlag** = `Customer-Min` / `Anpassen` / `Admin-only`
- **Warum** = Kurz-Begründung in 2–4 Wörtern

#### Map-Editor (Desktop + Mobile gleich, sofern nicht anders vermerkt)

| Control | Heute | Vorschlag | Warum |
|---------|-------|-----------|-------|
| Ortssuche | always | **Customer-Min** | Entry-Point |
| Papierformat (A4/A3) | always | **Customer-Min** | Preis-relevant |
| Ausrichtung (Hoch/Quer) | always | **Customer-Min** | Komposition-relevant |
| PresetPicker (Designs) | always | **Customer-Min** | Design-Wahl |
| Marker anzeigen (Switch) | always | **Customer-Min** | Visueller Anker |
| Marker-Position (Drag auf Canvas) | always | **Customer-Min** | „Da war's" |
| Textblock hinzufügen | always | **Customer-Min** | Text-Workflow |
| Block-Liste / Auswahl | conditional: textBlocks > 0 | **Customer-Min** | Text-Workflow |
| Lock/Unlock Block | conditional | **Customer-Min** | Verhindert ungewolltes Ändern |
| Block löschen | conditional: !locked | **Customer-Min** | Text-Workflow |
| Text-Inhalt (Textarea) | conditional: selectedBlock | **Customer-Min** | Kern-Editing |
| Text-Ideen (Select) | conditional: selectedBlock && !isCoordinates | **Customer-Min** | Niedrige Eintrittshürde |
| Produkt-Auswahl (Download/Poster/Frame) | conditional: !isAdmin | **Customer-Min** | Kauf-Schritt |
| In den Warenkorb | conditional: !isAdmin | **Customer-Min** | Kauf-Schritt |
| Speichern (Projekt) | conditional: logged-in | **Customer-Min** | WIP sichern |
| Karten-Stil (Layout) | always | **Anpassen** | Customer wechselt via Preset |
| Farbpalette | always | **Anpassen** | Customer wechselt via Preset |
| Custom-Farbeditor (8 Inputs) | conditional: paletteId === 'custom' | **Anpassen** | Power-User-Detail |
| Custom-Palette zurücksetzen | conditional: paletteId === 'custom' | **Anpassen** | Folgekonsequenz |
| Straßennamen anzeigen | always | **Anpassen** | Detail-Tuning |
| Kartenform/Maske | always | **Anpassen** | Customer wechselt via Preset |
| Mehr/Weniger Masken | conditional: > MASK_INITIAL_VISIBLE | **Anpassen** | Konsequenz aus Maske |
| Decoration anzeigen (Toggle) | conditional: decorationSvgUrl | **Anpassen** | Detail-Tuning |
| Layout-Mode (full / text-30 / text-15) | always | **Anpassen** | Vom Preset bestimmt |
| Formkontur (Switch + Farbe + Stärke) | conditional: shapeSupported | **Anpassen** | Detail-Tuning |
| Äußerer Rahmen (Switch + Style + Farbe + Stärke + Gap + Offset) | always (Switch), sonst conditional | **Anpassen** | Detail-Tuning |
| Außenbereich-Modus (None/Faded/Glow/Full) | conditional: !isSplitActive | **Anpassen** | Detail-Tuning |
| Außenbereich-Opacity / Glow-Radius / Glow-Intensität | conditional | **Anpassen** | Folgekonsequenz |
| Margin-Lock + 4 Margin-Slider | conditional | **Anpassen** | Detail-Tuning |
| Außenbereich Dark-Mode | conditional | **Anpassen** | Detail-Tuning |
| Marker-Typ (classic/heart) | conditional: marker.enabled | **Anpassen** | Style-Detail |
| Marker-Farbe | conditional: marker.enabled | **Anpassen** | Style-Detail |
| Zweite Ansicht (Split-Modus-Picker) | always | **Anpassen** | Power-User-Feature, ~5% Use-Case |
| Zweite Ortssuche / Stil / Palette / Custom-Farben (Split-Map) | conditional: splitMode === 'second-map' | **Anpassen** | Folge aus Split |
| Zweiter Marker (Show/Typ/Farbe) | conditional: splitMode === 'second-map' | **Anpassen** | Folge aus Split |
| Foto-Upload / Filter / Zoom (Split-Photo) | conditional: splitMode === 'photo' | **Anpassen** | Folge aus Split |
| Zonen-Position | conditional: splitMode === 'photo' | **Anpassen** | Folge aus Split |
| Schriftart / Schriftgröße (Slider+Number) / Textfarbe / Ausrichtung / Bold / Uppercase | conditional: selectedBlock | **Anpassen** | Vom Preset bestimmt |
| Decoration-Picker (Admin) | admin-only | **Admin-only** | Operator-Konfig |
| „Als Palette speichern"-Button + Dialog | admin-only | **Admin-only** | Operator-Konfig |
| Foto im Photo-Tab (Upload/Filter/Maske) | always (Photo-Tab existiert auf Map-Editor) | **Admin-only** *(siehe Anmerkung)* | Map-Editor sollte keine Foto-Funktionen haben |
| PNG / PDF herunterladen | admin-only | **Admin-only** | Operator-Tool |
| Als Preset speichern | admin-only | **Admin-only** | Operator-Tool |
| Editor zurücksetzen | admin-only | **Admin-only** | Operator-Tool |

**Anmerkung zum Photo-Tab im Map-Editor:** Audit hat den Photo-Tab im Map-Editor gefunden (laut Inventur in MapTab/MobilePhotoTab). Das ist vermutlich Legacy aus einer früheren Iteration. Bestätigung gebraucht: Brauchen Customer im Map-Editor wirklich Foto-Funktionen, oder ist das tot? Falls tot → komplett entfernen, nicht nur verstecken.

#### Star-Map-Editor (Desktop + Mobile gleich)

| Control | Heute | Vorschlag | Warum |
|---------|-------|-----------|-------|
| Ortssuche | always | **Customer-Min** | Entry-Point |
| Datum & Uhrzeit | always | **Customer-Min** | Pflicht für Sternenbild |
| PresetPicker | always | **Customer-Min** | Design-Wahl |
| Papierformat | always (Export-Tab) | **Customer-Min** | Preis-relevant |
| Vorschau (Zimmeransicht) | always | **Customer-Min** | Kauf-Vertrauen |
| Textblock hinzufügen / Liste / Lock / Löschen / Inhalt / Ideen | always / conditional | **Customer-Min** | Text-Workflow |
| Produkt-Auswahl + In den Warenkorb | conditional: !isAdmin | **Customer-Min** | Kauf-Schritt |
| Speichern | conditional: logged-in | **Customer-Min** | WIP sichern |
| Poster-Hintergrundfarbe | always | **Anpassen** | Vom Preset bestimmt |
| Sky-Hintergrundfarbe | always | **Anpassen** | Vom Preset bestimmt |
| Sternfarbe | always | **Anpassen** | Vom Preset bestimmt |
| Himmel-Textur (Picker) + Opacity | always / conditional | **Anpassen** | Vom Preset bestimmt |
| Formkontur (Switch + Farbe + Stärke) | always / conditional | **Anpassen** | Detail-Tuning |
| Sterndichte (Slider) | always | **Anpassen** | Detail-Tuning |
| Milchstraße / Konstellationen / Sonne / Mond / Planeten / Kompass / Gradnetz (Switches) | always | **Anpassen** | Vom Preset bestimmt |
| Gradnetz-Opacity | conditional | **Anpassen** | Folgekonsequenz |
| Schriftart / Schriftgröße / Textfarbe / Ausrichtung / Bold / Uppercase | conditional: selectedBlock | **Anpassen** | Vom Preset bestimmt |
| Außenbereich-Modus + Opacity + Margin | admin-only (heute schon) | **Admin-only** | Vor-PROJ-36 bereits Operator-Konfig |
| Äußerer Rahmen (Switch + Stil + Farbe + Stärke + Gap) | admin-only (heute schon) | **Admin-only** | Vor-PROJ-36 bereits Operator-Konfig |
| PNG / PDF herunterladen | admin-only | **Admin-only** | Operator-Tool |
| Als Preset speichern | admin-only | **Admin-only** | Operator-Tool |
| Editor zurücksetzen | admin-only | **Admin-only** | Operator-Tool |

#### Foto-Editor (Desktop + Mobile gleich)

| Control | Heute | Vorschlag | Warum |
|---------|-------|-----------|-------|
| PresetPicker (in Letter-Mask Word-Tab) | conditional: letter-mask | **Customer-Min** *(plus Audit-Finding)* | Design-Wahl. Audit-Finding: PresetPicker fehlt in single-photo + photo-grid Modi — Customer hat dort keine Preset-Auswahl |
| Ausrichtung (Hoch/Quer) | conditional: letter-mask | **Customer-Min** | Komposition-relevant |
| Papierformat | always (Export-Tab) | **Customer-Min** | Preis-relevant |
| Wort (TextInput) | conditional: letter-mask | **Customer-Min** | Kern-Editing letter-mask |
| Slot-Karte (Auswahl) | conditional: letter-mask | **Customer-Min** | Slot-Workflow |
| Slot Foto hochladen / ersetzen / entfernen | conditional: letter-mask | **Customer-Min** | Kern-Workflow |
| Single-Photo Hochladen / Ersetzen / Entfernen | conditional: single-photo | **Customer-Min** | Kern-Workflow |
| Grid-Slot Hochladen / Ersetzen / Entfernen | conditional: photo-grid | **Customer-Min** | Kern-Workflow |
| Grid-Slot-Karte (Auswahl) | conditional: photo-grid | **Customer-Min** | Slot-Workflow |
| Textblock hinzufügen / Liste / Lock / Löschen / Inhalt / Ideen | always / conditional | **Customer-Min** | Text-Workflow |
| Produkt-Auswahl + In den Warenkorb | conditional: !isAdmin | **Customer-Min** | Kauf-Schritt |
| Speichern | conditional: logged-in | **Customer-Min** | WIP sichern |
| Wort-Breite (Slider) | conditional: letter-mask | **Anpassen** | Detail-Tuning |
| Default-Slot-Farbe (Picker + Hex) | conditional: letter-mask | **Anpassen** | Vom Preset bestimmt |
| Slot-Farbe (Picker + Hex + Reset) | conditional: empty slot | **Anpassen** | Vom Preset bestimmt |
| Slot Zoom-Slider | conditional: slot mit Foto | **Customer-Min** | Customer hat Foto hochgeladen, Zoom direkt verfügbar (kein Anpassen-Klick als Reibung) |
| Single-Photo Maske | conditional: single-photo | **Anpassen** | Vom Preset bestimmt |
| Single-Photo Zoom | conditional: single-photo + Foto | **Anpassen** | Detail-Tuning |
| Single-Photo Filter | conditional: single-photo + Foto | **Anpassen** | Vom Preset bestimmt |
| Grid Default-Slot-Farbe (Picker + Hex) | conditional: photo-grid | **Anpassen** | Vom Preset bestimmt |
| Grid Slot-Farbe (Picker + Hex + Reset) | conditional: empty grid slot | **Anpassen** | Vom Preset bestimmt |
| Grid Slot Zoom-Slider | conditional: grid slot mit Foto | **Customer-Min** | Customer hat Foto hochgeladen, Zoom direkt verfügbar (kein Anpassen-Klick als Reibung) |
| Schriftart / Schriftgröße / Textfarbe / Ausrichtung / Bold / Uppercase | conditional: selectedBlock | **Anpassen** | Vom Preset bestimmt |
| Photo-Mode-Switcher (Toolbar) | admin-only | **Admin-only** | Operator-Tool, vom Preset gesteuert |
| GridLayoutDesigner | admin-only | **Admin-only** | Operator-Tool |
| PNG / PDF herunterladen | admin-only | **Admin-only** | Operator-Tool |
| Als Preset speichern | admin-only | **Admin-only** | Operator-Tool |
| Editor zurücksetzen | admin-only | **Admin-only** | Operator-Tool |

### Audit-Findings (zusätzlich zur Klassifikation)

1. **Photo-Tab im Map-Editor (Map-Tab + MobilePhotoTab)**: ✅ Beschluss 2026-05-04: bleibt drin, wird nicht entfernt.
2. **PresetPicker fehlt in Foto-Editor single-photo + photo-grid Modi**: ✅ Beschluss 2026-05-04: PresetPicker wird zur **persistenten Top-Komponente** im Foto-Editor-Sidebar (Header-Position), sichtbar in allen drei Modi (Letter-Mask / Single-Photo / Photo-Grid). Bestehende `applyPreset()`-Logik wechselt automatisch den Mode (Preset-JSON enthält `layoutMode`). Wird Teil von PROJ-36 Phase 2.
3. **Slot-Zoom (Letter-Mask + Photo-Grid)**: ✅ Beschluss 2026-05-04: Customer-Min (verschoben aus Anpassen). Customer hat Foto hochgeladen, Zoom direkt verfügbar.
4. **Star-Map: Datum & Uhrzeit-Reihenfolge**: ✅ Beschluss 2026-05-04: Reihenfolge im Sidebar wird beibehalten/bestätigt: **Ort → Datum → Preset → Settings**. Datum bestimmt das Sternenbild und beeinflusst, ob ein Preset visuell passt — daher vor Preset-Auswahl.

### Operator-Review-Status

- [x] Map-Editor-Tabelle reviewed und bestätigt (Operator-Approval 2026-05-04)
- [x] Star-Map-Editor-Tabelle reviewed und bestätigt (Operator-Approval 2026-05-04)
- [x] Foto-Editor-Tabelle reviewed und bestätigt (Operator-Approval 2026-05-04)
- [x] Audit-Findings 1–4 entschieden (siehe Beschlüsse oben)

✅ **Audit-Phase abgeschlossen 2026-05-04. Phase 2 (Architektur + Implementation) ist freigegeben.**

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Gesamtablauf (Customer-Erlebnis)

```
[Customer öffnet Editor]
         │
         v
[Sidebar zeigt nur Customer-Min-Controls]
  - Tabs bleiben (Layout / Marker / Text / Export ...)
  - Pro Tab nur die als Customer-Min klassifizierten Controls
  - Sticky-Footer unten: [⚙ Anpassen]
         │
         ├── Customer macht Ort + Preset + Text + Kauf → Standard-Flow durch
         │
         └── Customer klickt [⚙ Anpassen]
                     │
                     v
         [Anpassen-Sheet öffnet]
           Desktop: von rechts als Side-Drawer
           Mobile:  von unten als Bottom-Sheet
                     │
                     v
         [Sheet-Inhalt = gleiche Tab-Struktur,
          aber nur die als Anpassen klassifizierten Controls]
                     │
                     ├── Customer ändert Detail → Live-Preview im Editor
                     │
                     └── Customer schließt Sheet → zurück im aufgeräumten Min-View
                                                     (Werte bleiben aktiv)
```

```
[Admin öffnet denselben Editor]
         │
         v
[Sidebar zeigt ALLES auf einmal]
  - Customer-Min + Anpassen-Controls flach in den Tabs
  - Plus Admin-only-Controls (Save-as-Preset, PNG/PDF, Reset)
  - KEIN Anpassen-Sheet nötig (er sieht eh schon alles)
```

### B) Komponenten-Struktur

```
3 Editor-Layouts (Map / Star-Map / Foto)
│
├── EditorLayoutShell  (existiert bereits pro Modus)
│   │
│   ├── EditorCanvas  (zentral, unverändert)
│   │
│   ├── EditorSidebar  (rechts auf Desktop, unten auf Mobile)
│   │   │
│   │   ├── (NUR Foto-Editor) PresetPicker  ← NEU: persistent oben,
│   │   │                                     sichtbar in allen 3 Photo-Modi
│   │   │
│   │   ├── TabBar  (Layout / Marker / Text / Export …)
│   │   │
│   │   ├── ActiveTabContent
│   │   │   └── Tab-Komponente (MapTab / MarkerTab / TextTab …)
│   │   │       │
│   │   │       └── Bekommt neuen Prop:  view: 'customer' | 'anpassen'
│   │   │           - 'customer' → rendert nur Customer-Min-Controls
│   │   │           - 'anpassen' → rendert nur Anpassen-Controls
│   │   │           - Admin sieht alle Controls (kein view-Branch)
│   │   │
│   │   └── EditorAnpassenFooter  ← NEU: Sticky am unteren Rand
│   │       └── Button [⚙ Anpassen]   (nur sichtbar für Customer)
│   │
│   └── EditorAnpassenSheet  ← NEU: Overlay
│       ├── Sheet-Header („Anpassen")
│       ├── TabBar  (gleiche Tabs wie Sidebar, gespiegelt)
│       └── ActiveTabContent  (jeweilige Tab-Komponente, view='anpassen')
```

### C) Datenmodell (in Klartext)

**Keine neuen persistenten Daten.** Die Klassifikation (Customer-Min / Anpassen / Admin-only) ist hardcoded in den Komponenten — pro Control eine simple Render-Bedingung à la „zeige mich nur, wenn der View-Prop passt oder der User Admin ist".

**Neue UI-State (lokal in der Editor-Session, nicht persistiert):**
- `isAnpassenOpen: boolean` — ist das Sheet aktuell offen? Liegt im Editor-Store oder als lokaler React-State im Sidebar-Wrapper. Wird beim Tab-Wechsel innerhalb des Sheets nicht zurückgesetzt.

**Bestehende Daten unverändert:**
- Editor-Store, Preset-Format, Render-Pipeline — alles bleibt. Reduktion ist rein UI-Schicht. Geladene Projekte mit nicht-default Werten in Anpassen-Controls werden 1:1 weiter gerendert; Customer sieht die Werte erst, wenn er das Sheet öffnet.

### D) Tech-Entscheidungen (Warum?)

| Entscheidung | Begründung |
|-------------|-----------|
| ~~**Sheet/Drawer als Anpassen-Container**~~ **[Verworfen 2026-05-13 — siehe „Design Pivot" oben. Aktuelle Lösung: segmentierter Toggle im Sidebar, kein Overlay.]** Klarer visueller Modus-Wechsel: Customer-View bleibt aufgeräumt, Anpassen ist ein „eigener Bereich". Auf Mobile als Bottom-Sheet, auf Desktop als Right-Drawer — eine `<Sheet>`-Komponente (shadcn ist bereits installiert) deckt beides ab. Kein Bundle-Wachstum. |
| **Bestehende Tab-Struktur behalten**, nicht alles in linearen Flow refactoren | Minimaler Refactor — bestehende Tab-Komponenten (`MapTab`, `MarkerTab`, etc.) werden nur um einen `view`-Prop erweitert, statt sie wegzuwerfen. Mobile-Tab-Bar funktioniert weiter wie gewohnt. Customer-Min vs. Anpassen ist eine Sichtbarkeits-Variante derselben Komponente, kein paralleler Code-Zweig. |
| **Sticky-Footer als Anpassen-Trigger**, kein Floating Action Button | Footer-Pattern ist im Cart-/Checkout-Kontext bekannt (CTA unten). Klare Bedeutung: „Das ist alles, was du brauchst — willst du tiefer? Klick hier." Konkurriert nicht mit dem Editor-Canvas. Auf Mobile besser positioniert als ein FAB, der mit der Mobile-Tab-Bar konkurrieren würde. |
| **Pro-Control Render-Bedingung** statt Config-Datei | Jedes Control entscheidet selbst, ob es rendert (`if (view === 'customer' && isCustomerMin) ...`). Konkrete, lokal lesbare Regel direkt am Control statt einer entfernten Klassifikations-Tabelle. Audit-Tabelle aus Phase 1 dient als Referenz für die Implementation. |
| **Admin sieht alles flach**, kein Anpassen-Sheet für Admin | Admin braucht Übersicht über alle Settings beim Preset-Bauen. Sheet wäre Reibung. View-Prop wird für Admin nicht ausgewertet (oder Admin-Bypass im Render-Filter). Optional V2: „Customer-Simulator"-Toggle für Admin zum Testen. |
| **PresetPicker als Foto-Editor-Sidebar-Header**, nicht in eigenen Tab | Persistent über alle 3 Foto-Modi (Letter-Mask, Single, Grid) sichtbar. Bestehende `applyPreset()`-Logik wechselt den `layoutMode` automatisch (Mode steckt im Preset-JSON) — keine zusätzliche State-Migration. PresetPicker zieht aus `LetterMaskTab` heraus, lebt im Foto-Editor-Layout-Wrapper. |
| **Keine Persistierung des Sheet-Open-States** | Beim Reload startet Customer wieder in der aufgeräumten Min-View. Verstärkt das „Default-Erlebnis = Customer-Min"-Versprechen. |

### E) Integration in bestehende Systeme

- **Editor-Store** (`useEditorStore`, `useStarMapStore`, `usePhotoEditorStore`): unverändert. Anpassen-Sheet greift auf dieselben Selektoren/Setter zu wie die Sidebar-Tabs.
- **shadcn-Komponenten**: `Sheet`, `Tabs`, `Button`, `Sticky-Layout-Pattern` — alles bereits da. Keine neuen Installation.
- **i18n** (PROJ-20): neue Strings nur für `editor.anpassen` (Trigger-Label) + `editor.anpassenSheetTitle` in 5 Sprachen (DE/EN/FR/IT/ES). 10 Strings total.
- **`useAuth` Hook**: liefert `isAdmin`. Bestehender Hook, keine Änderung nötig.
- **`useIsMobileEditor` Hook**: liefert `isMobile`. Wird genutzt, um Sheet zwischen `side="right"` und `side="bottom"` zu schalten.

### F) Dependencies (neue Pakete)

**Keine.** Komplett mit Bordmitteln umsetzbar.

### G) Deployment & Rollout-Reihenfolge

1. **Neue Helfer-Komponenten** (`EditorAnpassenFooter`, `EditorAnpassenSheet`) bauen — isoliert testbar
2. **PresetPicker im Foto-Editor verschieben** — kleinster diskreter Schritt, separater Commit
3. **Pro Editor-Modus** den Sidebar-Wrapper um Footer + Sheet erweitern
4. **Pro Tab-Komponente** (~10 Tabs insgesamt) den `view`-Prop einbauen + Controls per Klassifikations-Tabelle filtern
5. **Smoke-Test pro Modus** (Map / Star-Map / Foto, Desktop + Mobile) — Customer-Min-Flow muss zum Kauf führen
6. **Bestehende Customer-Projekte testen** — mindestens 3 alte gespeicherte Projekte mit Anpassen-Werten laden, Render verifizieren

Reihenfolge der Editor-Modi: empfohlen **Map zuerst** (komplexester, lernt am meisten daraus), dann Star-Map, dann Foto. Pro Modus separater Commit, damit Regression-Bisecting einfach bleibt.

### H) Was später kommen könnte (V2+, nicht für V1)

- **„3 Detail-Settings aktiv"-Hinweis** am Anpassen-Trigger, wenn ein geladenes Projekt nicht-default Werte hat — macht versteckte aktive Settings sichtbarer, ohne sie aufzudrängen
- **Admin-„Customer-Simulator"-Toggle**, um aus Admin-Sicht den Customer-View zu testen ohne Logout
- **Open-Sheet-Animation/Transition** für mehr Polish (heute reicht der shadcn-Default)
- **Sheet-Header zeigt aktiven Tab-Namen** (z.B. „Anpassen: Marker") — kontextbezogene Klarheit
- **Smarte Defaults pro Customer**: wenn ein Customer mehrfach Anpassen-Settings ändert, nächste Session direkt Sheet offen — opt-in
- **Per-Tab Anpassen-Trigger** statt einem zentralen — für Power-User, die wissen, welcher Bereich sie interessiert

## Implementation Notes — Frontend (2026-05-04, Iteration 1)

**Infrastruktur fertig:**
- [src/components/editor/EditorViewContext.tsx](src/components/editor/EditorViewContext.tsx) — Context + `useEditorView()` Hook + `shouldRenderControl()` Helper. Admin bypassed den Filter immer.
- ~~[src/components/editor/EditorAnpassenFooter.tsx]~~ **gelöscht 2026-05-13 im Sheet→Toggle-Pivot.**
- ~~[src/components/editor/EditorAnpassenSheet.tsx]~~ **gelöscht 2026-05-13 im Sheet→Toggle-Pivot.**
- 10 i18n-Strings (`editor.anpassen` + `editor.anpassenSheetTitle`) in DE/EN/FR/IT/ES. **Ergänzt 2026-05-13:** `editor.viewStandard` + `editor.viewAnpassen` für den neuen Toggle (auch in 5 Sprachen).

**Editor-Layouts verdrahtet (2026-05-13 nach Pivot):**
- [EditorLayout.tsx](src/components/editor/EditorLayout.tsx) (Desktop Map-Editor) — `EditorViewToggle` im Sidebar-Header (über der Tab-Bar). View-State (`'customer' | 'anpassen'`) per `useState` lokal im Layout. `EditorViewProvider` bekommt `value={view}` statt hartkodiertem `"customer"`.
- [mobile/MobileEditorLayout.tsx](src/components/editor/mobile/MobileEditorLayout.tsx) (Mobile Map-Editor) — gleicher Toggle, mounted oben im Bottom-Sheet-Content. Sheet-Architektur (`MobileBottomSheet`) bleibt unverändert — der Toggle lebt darin.
- [EditorViewToggle.tsx](src/components/editor/EditorViewToggle.tsx) — neue zwei-Tasten-Segment-Komponente. Admin sieht sie nicht (returns null bei `isAdmin`). Verwendet i18n `editor.viewStandard` + `editor.viewAnpassen`.

**Demo-Sektion gated** (Pattern-Validierung):
- Außenbereich-Modus-Block in [MapTab.tsx:1006-1163](src/components/sidebar/MapTab.tsx#L1006) jetzt mit `showAnpassen`-Guard. Customer sieht den Block nicht im Main-Sidebar; nach Klick auf Footer-Trigger erscheint er im Anpassen-Sheet. Admin sieht ihn weiterhin überall.

### Was in Folge-Iterationen gegated werden muss

Pro Editor-Modus + Tab-Komponente. Verwende `shouldRenderControl({ view, isAdmin, classification })` analog zur Demo-Sektion oder den abgekürzten `showAnpassen`-Boolean wenn die Sektion eindeutig Anpassen ist. Per Klassifikations-Beschluss (siehe oben).

**Map-Editor Desktop ([MapTab.tsx](src/components/sidebar/MapTab.tsx))**:
- Karten-Stil-Picker, Farbpalette, Custom-Farbeditor, Straßennamen-Switch — Anpassen
- Kartenform/Maske + Mehr/Weniger-Button + Decoration-Toggle — Anpassen
- Layout-Mode (full/text-30/text-15) — Anpassen
- Formkontur (Switch + Farbe + Stärke) — Anpassen
- Äußerer Rahmen (Switch + Style + Farbe + Stärke + Gap + Offset) — Anpassen
- Marker-Typ + Marker-Farbe — Anpassen (Marker-Show-Switch bleibt Customer-Min)
- Zweite Ansicht (Split-Picker + ALL Sub-Controls) — Anpassen
- Decoration-Picker (Admin) — Admin-only (bereits via `isAdmin`-Gate)

**Text-Tab Desktop ([TextTab.tsx](src/components/sidebar/TextTab.tsx))**:
- Customer-Min: Add-Block, Block-Liste, Lock/Unlock, Block-Löschen, Text-Inhalt (Textarea), Text-Ideen
- Anpassen: Schriftart, Schriftgröße (Slider+Number), Textfarbe, Ausrichtung, Bold, Uppercase

**Photo-Tab Desktop ([PhotoTab.tsx](src/components/sidebar/PhotoTab.tsx))**:
- Komplett Admin-only laut Audit-Beschluss (Foto-Funktionen im Map-Editor sind Operator-Tool) — siehe Audit-Finding #1

**Export-Tab Desktop ([ExportTab.tsx](src/components/sidebar/ExportTab.tsx))**:
- Customer-Min: Produkt-Auswahl, In-den-Warenkorb
- Admin-only (bereits): PNG/PDF herunterladen
- Customer-Min: Format/Orientation (sind aktuell schon)

**Mobile-Tabs (parallel zur Desktop-Logik)**:
- [MobileMapTab.tsx](src/components/sidebar/mobile/MobileMapTab.tsx) — analog MapTab
- [MobileLayoutTab.tsx](src/components/sidebar/mobile/MobileLayoutTab.tsx) — KOMPLETT Anpassen (Layout/Form/Frame/Außenbereich liegen alle hier)
- [MobileMarkerTab.tsx](src/components/sidebar/mobile/MobileMarkerTab.tsx) — Marker-Show Customer-Min, Typ+Farbe Anpassen
- [MobileTextTab.tsx](src/components/sidebar/mobile/MobileTextTab.tsx) — analog TextTab

**Star-Map-Editor**:
- [StarMapLayout.tsx](src/components/star-map/StarMapLayout.tsx) + [mobile/MobileStarMapLayout.tsx](src/components/star-map/mobile/MobileStarMapLayout.tsx) — Footer + Sheet einbauen, analog Map
- [StarMapTab.tsx](src/components/star-map/StarMapTab.tsx) — Customer-Min: Ortssuche, Datum, PresetPicker. Anpassen: alle Farben (Poster/Sky/Stern), Textur, Formkontur. Außenbereich/Frame ist bereits Admin-only.
- [HimmelTab.tsx](src/components/star-map/HimmelTab.tsx) — alle Switches + Sterndichte → Anpassen

**Foto-Editor**:
- PresetPicker-Move: aus Letter-Mask Word-Tab herausziehen, in Foto-Editor-Sidebar-Header (persistent in allen 3 Modi) einbauen
- Footer + Sheet pro Foto-Mode-Layout einbauen
- Customer-Min: Wort, Slot/Single/Grid Foto-Upload+Replace+Remove, Slot-Zoom, Format, Orientation, PresetPicker
- Anpassen: Wort-Breite, Default-Slot-Farbe, Slot-Farbe, Single-Photo Maske/Filter, Grid Default-Farbe, Grid Slot-Farbe

### Bekannte Browser-Test-Punkte (für /qa)

- Footer erscheint NUR im Customer-Modus (logout & retry)
- Sheet öffnet sich Mobile von unten, Desktop von rechts
- Außenbereich-Block ist im Customer-Sidebar versteckt, im Sheet sichtbar (Demo-Sektion)
- Admin sieht Außenbereich-Block überall (im Sidebar UND wenn er das Sheet öffnen würde — aber Admin sieht keinen Footer-Trigger)
- Tab-Wechsel im Sheet behält den Sheet offen (?)
- Geladenes Preset mit non-default Außenbereich-Werten rendert korrekt, Sheet bleibt geschlossen beim Laden

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

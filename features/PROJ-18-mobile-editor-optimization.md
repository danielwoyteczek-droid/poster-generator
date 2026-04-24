# PROJ-18: Mobile-Editor (Feature-Parität, touch-optimiert)

## Status: In Progress
**Created:** 2026-04-21
**Last Updated:** 2026-04-24

## Dependencies
- Requires: PROJ-1 (Karten-Editor Core) — Mobile nutzt dieselbe Map-Render- und Daten-Infrastruktur
- Requires: PROJ-2 (Textblock-Editor) — Textinhalte und -Stile identisch, nur Interaktion anders (kein Dragging)
- Requires: PROJ-3 (Poster-Export) — Export-Pipeline wird 1:1 wiederverwendet
- Requires: PROJ-8 (Design-Presets) — Presets sind optionaler Einstiegspunkt, nicht mehr die einzige Option
- Requires: PROJ-15 (Dynamische Farbschemen) — Farbwahl im Karten-Tab
- Requires: PROJ-19 (Foto-Integration) — Foto-Tab spiegelt Desktop
- Requires: PROJ-21 (Layout-Presets) — Formkontur + Rand im Layout-Tab

## Problem & Ziel
Aktuell erscheint der Editor auf Mobile als 1:1-Verkleinerung des Desktop-Layouts — schmale Sidebar neben winziger Canvas. Bedienelemente sind zu klein, Scroll-Bereiche konkurrieren, die Vorschau ist unlesbar. Nutzer:innen verlassen die Seite oder wechseln ans Desktop.

Die bisherige PROJ-18-Version setzte auf einen **reduzierten Preset-Only-Flow** für Mobile. Nach Wettbewerbs-Analyse (u. a. cartida.de) ist klar: Mobile braucht **den vollen Funktionsumfang** des Desktop-Editors — in einer mobil-optimierten Interaktionsform. Preset-Only würde uns gegenüber dem Wettbewerb schwächen.

Die Lösung: **Feste Vorschau oben, Tab-Bar darunter, scrollbarer Tool-Inhalt unten.** Sechs feingranulare Tabs (statt vier auf Desktop) verteilen die Optionen, sodass jeder Tab eine übersichtliche Tiefe behält. Einzige bewusste Einschränkung: **Textblöcke sind nicht per Finger verschiebbar** — Fingerpositionierung ist dafür zu ungenau. Textinhalte werden per Tap editiert, Positionen folgen dem gewählten Layout-Preset.

## User Stories
- Als Mobile-Nutzer:in will ich alle Editor-Werkzeuge (Karte, Layout, Text, Marker, Fotos, Export) nutzen, ohne ans Desktop wechseln zu müssen.
- Als Mobile-Nutzer:in will ich die Poster-Vorschau **immer sehen**, während ich Einstellungen ändere, damit ich das Ergebnis sofort beurteilen kann.
- Als Mobile-Nutzer:in will ich zwischen Werkzeugen über eine **Tab-Bar** wechseln — pro Tab nur die zugehörigen Optionen.
- Als Mobile-Nutzer:in will ich Textblöcke **antippen und inhaltlich bearbeiten**, ohne sie frei auf der Canvas verschieben zu müssen.
- Als Mobile-Nutzer:in will ich Marker durch Tap auf die Karte oder per Adress-Suche platzieren.
- Als Mobile-Nutzer:in will ich ein Projekt auf dem Handy speichern und auf dem Desktop 1:1 weiterbearbeiten können — und umgekehrt.
- Als Desktop-Nutzer:in will ich den Editor unverändert vorfinden — dieses Feature ändert das Desktop-Layout nicht.

## Acceptance Criteria

### Layout-Struktur
- [ ] Auf Viewports **< 768 px** wird statt `EditorLayout` ein neues `MobileEditorLayout` gerendert:
  1. **Oben fix:** Poster-Vorschau (ca. 50–60 % der Viewport-Höhe), bleibt beim Scrollen im Tool-Bereich sichtbar
  2. **Darunter fix:** Tab-Bar mit 6 Tabs (Karte / Layout / Text / Marker / Fotos / Export)
  3. **Unten:** eigener **scrollbarer** Tool-Container des aktiven Tabs
- [ ] Vorschau und Tool-Container haben **getrennte Scroll-Zonen** — Scrollen im Tool-Bereich bewegt die Vorschau nicht.
- [ ] Zoom-Controls (+/−) liegen als Overlay **direkt auf der Karten-Vorschau**, nicht im Tool-Container (unabhängig vom aktiven Tab erreichbar).

### Tab-Inhalte (sechs feingranulare Tabs)
- [ ] **Karte**: Basis-Stil-Wahl (Minimal / Detailliert), Farbpaletten-Grid (aus PROJ-15), Straßennamen-Toggle.
- [ ] **Layout**: Formkontur als Karten-Grid (3×2, z. B. Polar / Classic / Halo / Quadrat / Card / Architekt mit Icons), Rand-Chips (Weiß / Einfach / Doppelt / Ohne).
- [ ] **Text**: Liste aller Textblöcke des gewählten Layouts. Tap auf einen Block öffnet einen Inline-Editor (Sheet) für Inhalt, Schrift, Größe, Farbe. **Dragging ist nur im Text-Tab aktiv** (da Schriftgrößen stark variieren und manuelles Nachjustieren der Position nötig sein kann). In allen anderen Tabs sind Textblöcke nicht verschiebbar, damit versehentliche Finger-Berührungen die Position nicht verändern.
- [ ] **Marker**: Liste aller Marker auf der Karte. Hinzufügen per Tap auf die Karte oder per Adress-Suche. Bearbeiten/Löschen per Tap auf den Marker in der Liste.
- [ ] **Fotos**: Foto-Integration analog Desktop (PROJ-19) — Upload, Zuschnitt, Platzierung in den Foto-Slots des gewählten Layouts.
- [ ] **Export**: Format-Toggle (A4 / A3), Produkt-Kacheln (Download / Poster / Rahmen), führt in denselben Stripe-Checkout wie Desktop.

### Interaktions-Standards
- [ ] Alle Touch-Targets ≥ 44 × 44 px (Apple HIG).
- [ ] Aktiver Tab durch Akzentfarbe + fettere Schrift oder Unterstreichung markiert.
- [ ] Selektion in Karten-Grids (Layouts, Farbpaletten) durch farbigen Rand um die aktive Karte.
- [ ] Karte reagiert auf Pinch-to-Zoom und Pan — Zentrum und Zoom-Level sind Teil des Projekt-Snapshots.
- [ ] Drag-and-Drop von Textblöcken ist **nur im aktiven Text-Tab** erlaubt. In allen anderen Tabs sind Blöcke durch `pointer-events: none` gegen versehentliches Verschieben geschützt.

### Cross-Device-Konsistenz
- [ ] Ein auf Mobile gespeichertes Projekt öffnet sich 1:1 auf Desktop und umgekehrt — kein Feature-Verlust in beide Richtungen.
- [ ] Projekt-Snapshot (`projectId`) enthält identische Felder, unabhängig vom Erstell-Gerät.
- [ ] Export liefert auf Mobile dieselbe Druckqualität wie auf Desktop.
- [ ] Auth, Projekt-Verwaltung, Checkout, Export-API werden ohne Duplizierung wiederverwendet.

## Edge Cases
- **Landscape-Orientierung**: Vorschau bleibt oben, Tab-Bar und Tool-Container passen sich an. Ab einer gewissen Breite evtl. Vorschau-links-/Tools-rechts-Split — Entscheidung beim Architecture-Schritt.
- **Layout-Preset-Wechsel**: Vorhandene Textinhalte mappen auf die neuen Preset-Positionen (identische Logik wie Desktop), kein Datenverlust.
- **Tool-Inhalt länger als Container**: Interner Scroll mit visuellem Hinweis (z. B. Schatten am Rand), Tab-Bar bleibt fix.
- **Tap auf Karte im Vorschau-Bereich**: Je nach aktivem Tab unterschiedliche Bedeutung — im Marker-Tab setzt es einen Marker, sonst keine Reaktion (zoom/pan nur über Gesten).
- **Projekt vom Desktop mit Text-Positionen außerhalb aktueller Layout-Slots**: Positionen werden auf die nächsten Preset-Slots gemappt; User sieht einen einmaligen Hinweis "Layout an Mobile angepasst".
- **User ohne Login**: Gleicher anonymer Flow wie Desktop — Projekt lokal, Checkout erzwingt Login/Checkout-Mail.

## Non-Goals
- **Kein Drag-and-Drop außerhalb des Text-Tabs** — nach einem ersten Mobile-Test wurde Dragging innerhalb des Text-Tabs zugelassen, weil stark variable Schriftgrößen manuelles Nachjustieren nötig machen. Außerhalb des Text-Tabs bleibt Dragging deaktiviert.
- **Keine mobile-only Features**, die auf Desktop nicht existieren — Parität ist das Ziel.
- **Keine Änderungen am Desktop-Editor** durch dieses Feature.
- **Keine Native App** — bleibt Web/PWA.
- **Kein separater Preset-Only-Flow** (die vorherige PROJ-18-Version) — Preset-Auswahl ist Teil des normalen Editors, genau wie auf Desktop.

## Technische Anforderungen

### Viewport-Detection
- Clientseitig via CSS-Breakpoint `< 768 px` — bei Match rendert `MobileEditorLayout`, sonst `EditorLayout`.
- Switch zur Laufzeit (Fensterresize / Orientierungswechsel) wird korrekt behandelt, ohne Projekt-State zu verlieren.

### Architektur
- Neue Komponente `MobileEditorLayout` parallel zu `EditorLayout`, **nicht** verschachtelt.
- Pro Tab eine eigene Komponente (`MobileMapTab`, `MobileLayoutTab`, `MobileTextTab`, `MobileMarkerTab`, `MobilePhotoTab`, `MobileExportTab`), die denselben Projekt-State über bestehende Hooks liest/schreibt wie die Desktop-Pendants.
- **Gemeinsam genutzt** (keine Duplikation): Map-Renderer (MapTiler SDK), Projekt-Datenmodell, Supabase-Auth, Stripe-Checkout, Export-Pipeline, Preset-API.

### UI-Primitive (shadcn/ui)
- Tab-Bar: `Tabs` / `TabsList` / `TabsTrigger` in einer mobil-fixierten Variante (fixed bottom oder fixed-below-preview)
- Preset- und Layout-Grids: `Card` mit `onClick` + Selected-Border
- Chip-Rows (Ränder, Produkt-Auswahl): `Button` mit `variant="outline"` + aktiv-Zustand
- Inline-Textblock-Editor: `Sheet` (shadcn) von unten

### Performance
- Lighthouse Mobile Performance Score ≥ 85 auf `/map` (warm, nach initialem Tab-Wechsel).
- Karten-Tiles werden **nicht** neu geladen, wenn nur ein Tab gewechselt wird.

## Open Questions
- **Tablet (768–1024 px)**: Mobile-Layout oder Desktop-Layout? Vorschlag zur Klärung im Architecture-Schritt: ab 1024 px Desktop, darunter Mobile.
- **Landscape auf Phones**: Vorschau oben behalten oder seitlich neben die Tabs? Hypothese: oben lassen, weil die Vorschau in Landscape ohnehin breit wird — Architecture entscheidet final.
- **Scope Star-Map-Editor (`/star-map`)**: Dieser Spec fokussiert `/map`. Der Stern-Karten-Editor bekommt dasselbe Mobile-Pattern in einem Folge-Feature oder innerhalb dieser Umsetzung, je nach Aufwand — zu entscheiden im Architecture-Schritt.
- **Tab-Bar-Position**: Fix unterhalb der Vorschau (wie cartida.de) oder fix am unteren Bildschirmrand (wie iOS-Tab-Apps)? Hypothese: unterhalb der Vorschau, damit der Tool-Inhalt direkt am Daumen klebt.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### 1. Überblick
Wir erweitern den bestehenden Editor um eine **zweite Präsentationsschicht** für Mobile. Das Datenmodell, der Editor-Store (`useEditorStore`), die APIs und der Map-Renderer bleiben unverändert. Mobile ist eine **alternative Darstellung desselben Editors**, nicht ein zweiter Editor.

Entscheidend: Bei einem Viewport-Wechsel (Desktop → Mobile oder Handy-Drehung) bleibt der Projekt-State erhalten. Speichern/Laden/Export funktionieren identisch, egal auf welchem Gerät.

### 2. Komponentenstruktur

```
/map (Karten-Editor-Seite)
├── LandingNav (unverändert)
├── PresetUrlApplier (unverändert)
└── EditorShell                        ← neu: entscheidet Mobile vs. Desktop
    │
    ├── EditorLayout (bestehend)       ← rendert auf Desktop (≥ 1024 px)
    │   ├── Sidebar mit 4 Tabs
    │   │   ├── MapTab
    │   │   ├── TextTab
    │   │   ├── PhotoTab
    │   │   └── ExportTab
    │   └── PosterCanvas
    │
    └── MobileEditorLayout (neu)       ← rendert auf Mobile (< 1024 px)
        ├── Vorschau-Zone (fix oben)
        │   ├── PosterCanvas (wiederverwendet, feste Höhe)
        │   └── Zoom-Controls (Overlay)
        │
        ├── Tab-Bar (fix, direkt unter Vorschau)
        │   └── 6 Tabs: Karte / Layout / Text / Marker / Fotos / Export
        │
        └── Tool-Container (eigener Scroll)
            ├── MobileMapTab           ← Ort, Stil, Farben, Straßennamen, Preset-Picker
            ├── MobileLayoutTab         ← Formkontur, Layout-Preset, Formkontur-Slider, Rand
            ├── MobileTextTab           ← Textblock-Liste (Tap öffnet Bottom-Sheet-Editor)
            ├── MobileMarkerTab         ← Marker-Pin (An/Aus, Typ, Farbe) + Split-Marker
            ├── MobilePhotoTab          ← Foto-Upload, Filter, Zuschnitt
            └── MobileExportTab         ← Format, Produkt, Checkout
```

**Neue Komponenten:**
- `EditorShell` — Wrapper, der per `useIsMobile` entscheidet, welches Layout gerendert wird
- `MobileEditorLayout` — das Drei-Zonen-Layout (Vorschau / Tabs / Tool-Container)
- Sechs `Mobile*Tab`-Komponenten — jede zeigt eine zusammengehörige Gruppe von Einstellungen
- `MobileTextBlockSheet` — Bottom-Sheet für die Inline-Bearbeitung einzelner Textblöcke (öffnet beim Tap)

**Unverändert bleiben:** `PosterCanvas`, `EditorLayout` (Desktop), alle bestehenden Tabs (Desktop), `useEditorStore`, alle APIs.

**Aufteilung der heutigen `MapTab`-Inhalte auf Mobile-Tabs:**
| Desktop `MapTab` — Block | Mobile-Tab |
|---|---|
| Ort suchen | Karte |
| Zweite Ansicht (Split-Modus: Zweite Karte / Foto) | Karte |
| Preset-Picker | Karte |
| Kartenstil (Minimal / Detailliert) | Karte |
| Farbpalette + Eigene Farbe | Karte |
| Straßennamen-Toggle | Karte |
| Kartenform (Herz, Kreis, Quadrat …) | Layout |
| Layout (Vollflächig / Text 30 % / Text 15 %) | Layout |
| Formkontur (Slider) | Layout |
| Admin-Design (Außenbereich, Ränder) | Layout (admin-only) |
| Marker-Pin (An/Aus, Typ, Farbe) | Marker |

### 3. Datenmodell & State

**Kein neues Datenmodell.** Der gesamte Mobile-Editor liest und schreibt denselben `useEditorStore`, den der Desktop-Editor verwendet. Das bedeutet:

- Ein Projekt kann auf Mobile begonnen, gespeichert, auf Desktop geöffnet und dort weiterbearbeitet werden — und umgekehrt.
- Der Projekt-Snapshot (gespeichert via `useProjectSync` in Supabase) ist geräteunabhängig.
- Presets (PROJ-8), Farbpaletten (PROJ-15), Layout-Presets (PROJ-21), Fotos (PROJ-19) — alles identisch über beide Layouts.

**Einziges neues State-Feld (UI-only, nicht persistiert):**
- `activeTab: 'map' | 'layout' | 'text' | 'marker' | 'photo' | 'export'` — welcher Tab im Mobile-Layout aktiv ist. Initialwert: `'map'`. Überlebt keinen Reload (Tab-Wahl ist Session-Zustand, nicht Teil des Projekts).

### 4. Technische Entscheidungen

**a) Viewport-Erkennung: Client-side via `useIsMobile`**
Der Hook existiert bereits und ist die shadcn-Standardlösung. Klein, gut getestet, reagiert auf Fenstergröße und Orientierungswechsel.
*Begründung:* Wir wollen nicht beide Layouts parallel rendern (Karte zwei Mal initialisieren ist teuer und verwirrt den Map-Renderer). Client-Side-Fork bedeutet: Server rendert neutral, nach dem ersten Render entscheidet sich das Layout. Eine kleine Initial-Flacker-Phase akzeptieren wir für V1.

**b) Breakpoint: 1024 px (nicht 768 px)**
Entgegen dem bestehenden `MOBILE_BREAKPOINT = 768` aus dem shadcn-Hook schlage ich vor, für den Editor den Breakpoint auf **1024 px** zu setzen. Tablets (iPad Mini, iPad 10") sollen den Mobile-Editor bekommen, nicht den Desktop-Editor — der ist auf Tablet-Breite immer noch zu eng.
*Umsetzung:* Entweder der bestehende Hook wird angepasst oder wir führen einen eigenen `useIsMobileEditor`-Hook mit 1024 px ein. Ich empfehle den eigenen Hook, damit wir den allgemeinen `useIsMobile` (für Landing-Page, Admin-UI) bei 768 px belassen.

**c) Textblock-Interaktion: Tap-to-Edit via Bottom Sheet, kein Dragging**
Auf Mobile deaktivieren wir die Drag-Handler des `TextBlockOverlay` vollständig. Tap auf einen Textblock öffnet ein Bottom-Sheet (shadcn `Sheet`), in dem Inhalt, Schrift, Größe und Farbe bearbeitet werden. Positionen werden vom aktiven Layout-Preset (PROJ-21) bestimmt und sind nicht frei anpassbar.
*Begründung:* Fingerpositionierung auf einem 4"-Screen ist zu ungenau. Cartida hat dieselbe Entscheidung getroffen (bestätigt durch Screenshots).

**d) Preview-Höhe: Fix ~55 % der Viewport-Höhe, Tool-Container nimmt Rest**
Die Vorschau bleibt beim Scrollen im Tool-Container **immer sichtbar** — das ist der zentrale UX-Gewinn gegenüber der Cartida-Variante (dort scrollt die Vorschau mit).
*Begründung:* Nutzer ändern Farben und Formen und sehen sofort das Ergebnis. Das ist auf dem Handy, wo Abläufe schneller und intuitiver sein müssen, entscheidend.

**e) Zoom- und Pan-Gesten: Unverändert über MapTiler-SDK**
Pinch-to-Zoom und Pan auf der Karte funktionieren nativ. Die +/–-Buttons werden als Overlay auf der Karte gerendert, unabhängig vom aktiven Tab erreichbar.

**f) Landscape auf Phones: Gleiche Struktur, Vorschau bleibt oben**
Keine Sonderbehandlung für Landscape — die Vorschau wird breiter, die Tabs laufen weiterhin horizontal darunter. Falls sich in der QA herausstellt, dass Landscape zu eng wird, können wir nachträglich einen Side-by-Side-Split bauen. V1: einheitliches Layout.

**g) `/star-map` bleibt außerhalb dieses Tickets**
Der Stern-Karten-Editor bekommt dasselbe Mobile-Pattern, aber in einem Folge-Feature (neue PROJ-ID). Grund: Der `StarMapLayout` hat eine andere Tab-Struktur (`HimmelTab`, `StarMapTab`, `StarMapExportTab`), und die Implementierung für beide auf einmal würde den Scope verdoppeln.

### 5. Abhängigkeiten (Packages)
**Keine neuen Packages.** Alle benötigten Bausteine sind bereits vorhanden:
- `shadcn/ui`: `Tabs`, `Sheet`, `Card`, `Button`, `Switch`, `Slider`, `Label`, `Separator`, `ScrollArea`
- `@maptiler/sdk` (unverändert)
- `lucide-react` (für Tab-Icons: Map, Droplet, Type, MapPin, Camera, ShoppingBag)
- React, Next.js, Tailwind (bestehend)

### 6. Entscheidungen zu offenen Fragen aus dem Spec

| Offene Frage | Entscheidung |
|---|---|
| Tablet-Breakpoint | **< 1024 px = Mobile**, ≥ 1024 px = Desktop |
| Landscape auf Phones | Gleiche Struktur, Vorschau bleibt oben |
| Scope `/star-map` | **Nicht in PROJ-18** — Folge-Feature |
| Tab-Bar-Position | **Direkt unter Vorschau** (Cartida-Pattern), nicht am Bildschirmrand |
| Tap auf Karte in Vorschau | Im `Marker`-Tab setzt es einen Marker; in allen anderen Tabs keine Reaktion (nur Zoom/Pan) |

### 7. Aus dem Scope dieses Tickets

**Drin:**
- Kompletter Mobile-Editor für `/map` mit 6 Tabs
- Textblock-Tap-Editor via Bottom-Sheet
- Viewport-basiertes Layout-Switching
- Cross-Device-Konsistenz (Mobile ↔ Desktop)

**Draußen (Folge-Tickets):**
- Mobile-Version von `/star-map` (eigener PROJ-ID, später)
- Landscape-Side-by-Side-Layout auf Phones (nur falls QA es fordert)
- Mobile-spezifische Admin-UIs (`/private/admin/*`) — Admin nutzt Desktop

## Implementation Notes (Frontend)

### Was gebaut wurde
**Neuer Hook:**
- `src/hooks/useIsMobileEditor.ts` — Breakpoint 1024 px, SSR-safe (initial `undefined` bis Client-Mount)

**Neuer Shell + Mobile-Layout:**
- `src/components/editor/EditorShell.tsx` — entscheidet Desktop vs. Mobile; rendert während `isMobile === undefined` eine neutrale Loading-Fläche, um Layout-Flacker zu vermeiden
- `src/components/editor/mobile/MobileEditorLayout.tsx` — Drei-Zonen-Struktur: 52vh Vorschau (fix oben) + 56px Tab-Bar (6 Icons + Label) + scrollbarer Tool-Container

**Sechs Mobile-Tabs:**
- `src/components/sidebar/mobile/MobileMapTab.tsx` — Ort, Split-Modus (Keine/Zweite Karte/Foto), Preset-Picker, Kartenstil, Farbpalette (inkl. Custom-Editor), Straßennamen
- `src/components/sidebar/mobile/MobileLayoutTab.tsx` — Kartenform (Grid mit "Mehr anzeigen" ab 6 Items), Layout-Preset (full/text-30/text-15), Formkontur-Slider, Admin-Design (Außenbereich, Rand, Äußerer Rahmen)
- `src/components/sidebar/mobile/MobileTextTab.tsx` — Block-Liste mit Tap-to-Edit via Bottom-Sheet (85vh, enthält Text/Schrift/Größe/Farbe/Ausrichtung/Stil/Löschen)
- `src/components/sidebar/mobile/MobileMarkerTab.tsx` — Primary-Marker (enable/typ/farbe); Second-Marker sichtbar wenn Split-Modus = `second-map`
- `src/components/sidebar/mobile/MobilePhotoTab.tsx` — dünner Wrapper um bestehenden `PhotoTab`
- `src/components/sidebar/mobile/MobileExportTab.tsx` — dünner Wrapper um bestehenden `ExportTab`

**Touch-Optimierungen in bestehendem Editor:**
- `src/components/editor/TextBlockOverlay.tsx` — neue `interactive`-Prop; auf Mobile (via `useIsMobileEditor`) wird Drag/Resize deaktiviert und Pointer-Events blockiert (Canvas-Tap auf Textblock macht nichts; Bearbeitung erfolgt ausschließlich über `MobileTextTab`)

**Integration:**
- `src/app/map/page.tsx` importiert jetzt `EditorShell` statt `EditorLayout` — Desktop-Rendering unverändert (EditorShell fällt auf EditorLayout zurück)

### Entscheidungen / Abweichungen vom Tech Design
- **Kartenform-Grid**: Tech Design sagte "3×2", Implementation zeigt **6 Masken initial** (3 Spalten × 2 Reihen) mit "Mehr anzeigen"-Toggle für weitere. Entspricht dem Desktop-Verhalten und nutzt Screen-Space besser auf Mobile.
- **Custom Palette Editor**: Statt aus MapTab zu extrahieren, in `MobileMapTab` dupliziert (`MobileCustomPaletteEditor`). Pragmatisch — vermeidet Änderung am Desktop-MapTab, das 900+ Zeilen hat und hohes Regression-Risiko trägt. Kann später konsolidiert werden.
- **SSR-Verhalten**: `EditorShell` rendert bei `isMobile === undefined` eine leere graue Fläche statt einer Layout-Variante zu raten. Verhindert Hydration-Mismatch-Flacker, kostet einen Tick bis zum ersten Render (akzeptabel).
- **Zoom-Controls**: Werden unverändert von `PosterCanvas` gerendert (als Overlay rechts neben dem Poster). Keine separate Mobile-Variante nötig, da die interne Positionierung anhand der Poster-Größe funktioniert.

### Preview-Größe & Font-Skalierung (iterative Fixes)
Nach dem ersten Test mit echtem Mobile-Viewport kamen zwei zusätzliche Anpassungen, die inzwischen eingebaut sind:

**1. Preview-Fläche maximiert**
- `PosterCanvas` akzeptiert jetzt eine optionale `padding`-Prop (Default 64 für Desktop)
- `MobileEditorLayout` übergibt `padding={16}` und hat die Preview-Höhe auf **58vh** (vorher 52vh) angehoben
- Desktop ist unverändert

**2. Textblock-Font-Scale — konsistent über alle Render-Pfade (Option D)**
Ohne Skalierung schlägt ein auf Desktop gesetztes `fontSize` auf Mobile durch und wird relativ zum kleineren Poster zu groß (Text wie "Dein Moment" wird zweizeilig). Zusätzlich rendert der pre-existing Export-Pfad (`scaleX = exportW / previewW`) mobilexportierte Projekte ~2× größer als desktopexportierte. Beide Probleme lösen wir mit **einem einheitlichen Font-Scale**:

- Neue Shared-Utility `src/lib/font-scale.ts` mit `FONT_SCALE_REFERENCE_WIDTH = 660` und `computeFontScale(previewW)`
- **Formel:** `fontScale = Math.min(1, previewW / 660)`
- Angewendet in **allen** Render-Pfaden:
  - `PosterCanvas` (Live-Preview) → via `TextBlockOverlay` `fontScale`-Prop
  - `useMapExport.drawTextBlocks` (Zimmeransicht **und** PNG/PDF-Download)
  - `useStarMapExport.drawTextBlocks` (gleiches Muster für Stern-Karten)
  - `poster-from-snapshot.drawTextBlocks` (server-gerenderte Poster aus DB-Snapshots)
- **Auf Desktop** (previewW ≥ 660) → fontScale = 1, keine Änderung gegenüber Pre-existing Verhalten
- **Auf Desktop mit kleinem Fenster** (previewW < 660) → fontScale leicht unter 1, Text minimal kleiner — aber dafür im Druck-Verhältnis jetzt konsistent (vorher war bei kleineren Fenstern die Preview-Proportion inkorrekt)
- **Auf Mobile** (previewW ≈ 300) → fontScale ≈ 0.45, Text visuell kleiner aber exakt im selben poster-relativen Verhältnis wie Desktop

**Konsequenz:** Preview, Zimmeransicht und Print stimmen jetzt über alle Geräte und alle Fenstergrößen überein. Ein auf Desktop gemachtes Projekt zeigt auf Mobile dieselbe Textproportion (nur kleiner in Absolut-Pixeln), und beim Druck ergeben Mobile- und Desktop-Export für dasselbe Projekt dasselbe Ergebnis.

**3. iOS Safari Map-Capture Fix**
Das WebGL-Framebuffer der offscreen-MapTiler-Instanz wird auf iOS Safari vor `getCanvas()` geleert, selbst mit `preserveDrawingBuffer:true`. Folge: leere Karte in Zimmeransicht, Cart-Thumbnail und PDF-Download. Fix in `useMapExport.renderMapOffscreen`:
- Nach `waitForMapStable` wird `map.triggerRepaint()` aufgerufen und auf das `render`-Event gewartet, bevor der Canvas abgegriffen wird
- 500 ms Safety-Timeout, falls das Event nicht feuert (Style bereits fertig gepaintet)
- Zusätzlich: `opacity:0` vom Offscreen-Container entfernt (iOS skippt WebGL-Render für vollständig transparente Elemente); Container bleibt über `left:-99999px` off-screen
- Minimale Offscreen-Container-Breite auf 800 px erhöht, sodass `pixelRatio` unter allen Bedingungen ≤ ~3× bleibt (Schutz gegen iOS-Safari-Texturlimits bei hohem pixelRatio)

### Offene Punkte für QA
- Visuelle Prüfung der Preview-Größe bei verschiedenen Phone-Breiten (iPhone SE 375px, Android 360px, iPad 768px)
- Zoom-Controls-Sichtbarkeit — bei sehr schmalen Phones könnten sie seitlich abgeschnitten werden
- Landscape-Verhalten (Preview wird breit, Tool-Container schrumpft)
- Bottom-Sheet des TextTab auf sehr flachen Phones (Landscape Home Indicator)
- Cross-Device-Test: Projekt auf Desktop speichern → auf Phone öffnen → identischer Zustand?
- **Font-Scale-Grenzfall**: Mobile-User mit `fontSize` klein eingestellt (< 11 px nach Scale) — wird auf minimum 8 px geklemmt, aber prüfen ob lesbar
- **Cross-Device-Konsistenz im Druck**: Dasselbe Projekt von Desktop und Mobile exportiert sollte jetzt identisch aussehen — explizit gegen-prüfen in QA
- **Desktop mit kleinem Browser-Fenster**: Text skaliert jetzt leicht mit Fenstergröße (vorher nicht) — Regressionscheck auf „üblichen" Desktop-Größen

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

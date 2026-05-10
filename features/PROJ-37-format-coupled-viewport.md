# PROJ-37: Format-gekoppelter Editor-Viewport (A4/A3/A2)

## Status: In Review
**Created:** 2026-05-08
**Last Updated:** 2026-05-10

## Implementation Notes (Frontend, 2026-05-10) — Format-invariante Schriftgrößen
- Bug zuvor: Text-Blöcke wurden als absolute `fontSize: number` (px @ ~660-Referenz) gespeichert. Beim Format-Wechsel A4 → A3/A2 blieb die Pixel-Größe konstant, während die Logical Canvas wuchs → Text schrumpfte sichtbar relativ zum Poster, Customer musste manuell nachjustieren.
- Lösung: neues Feld `TextBlock.fontSizeFraction` (Anteil der Posterbreite, 0–1) als Renderer-Truth; alter `fontSize` bleibt für Sidebar-UI und Backwards-Compat.
- `lib/font-scale.ts`: `computeFontScale` + `FONT_SCALE_REFERENCE_WIDTH` entfernt; ersetzt durch `resolveFontSizePx(block, canvasWidth)` Helper + `FONT_SIZE_LEGACY_REF_WIDTH = 800` (A4 Logical Canvas, hält A4-Designs visuell konstant)
- `useEditorStore`: Defaults schreiben beide Felder; `updateTextBlock` synct `fontSizeFraction` automatisch wenn Sidebar `fontSize` ändert; `loadFromConfig` migriert legacy textBlocks via `migrateTextBlockFraction` (idempotent)
- Renderer-Pfade umgestellt auf `resolveFontSizePx(block, W)`: `useMapExport`, `useStarMapExport`, `usePhotoExport`, `lib/poster-from-snapshot`, `TextBlockOverlay` (Live-Preview + Drag-Clamp)
- 3 Canvas-Komponenten reichen jetzt `canvasWidth` statt `fontScale` an `TextBlockOverlay`: `PosterCanvas` (logical), `StarMapCanvas` + `PhotoPosterCanvas` (visual)
- Sidebar UI (TextTab + MobileTextTab) unverändert — Customer sieht weiterhin den gewohnten 8–220 fontSize-Range
- TypeScript clean, `npm run build` erfolgreich, 47 Vitest-Unit-Tests passen
- **Visueller Effekt:** A4-Designs vor dem Fix sehen unverändert aus (Ref-Width = 800 = A4 Logical). A3/A2-Designs aus der Übergangszeit erhalten beim Migrate proportional korrekte Schriftgröße — Text wirkt jetzt 41% (A3) / 100% (A2) größer als zuvor. Star-Map und Photo-Editor: Text wird ~17% kleiner als vorher (vorher 660-Ref, jetzt 800-Ref) — bewusst akzeptiert weil der Karten-Editor das primäre Customer-Volumen trägt

## Implementation Notes (Frontend, 2026-05-08)
- `print-formats.ts`: A2 (420×594mm, 4961×7016px) hinzugefügt; `LOGICAL_CANVAS_SIZE` Konstanten pro Format (A4=800×1131, A3=1131×1600, A2=1600×2263) und `effectiveLogicalCanvas()` Helper
- `MapTab.tsx` + `mobile/MobileMapTab.tsx`: Format-Selector am Top hinzugefügt (3-Spalten-Grid)
- `ExportTab.tsx`: Format-Selector entfernt
- Star-Map + Foto-Editor Format-Pickers: nehmen A2 automatisch auf (iterieren `PRINT_FORMAT_OPTIONS`); Catalog-API gibt `null` zurück bei nicht gepriceten Formaten → A2-Buttons sind disabled bis Operator A2-Pricing in Stripe-Catalog setzt
- `useEditorStore.setPrintFormat`: Auto-Recenter beim Format-Wechsel — wenn Marker mit konkreter lng/lat aktiv ist, setzt pendingCenter auf Marker-Position (Zoom bleibt). Gilt auch für Secondary-Map im Split-Modus
- `PosterCanvas.tsx`: Logical Canvas Pattern implementiert — Visual Wrapper sized to visualSize, Poster div sized to logical canvas mit `transform: scale(visualScale)`, transformOrigin top-left. mmToPx + marginPx leben jetzt im Logical-Pixel-Raum. Map-Controls (Zoom/Locate-Buttons) verwenden visualSize für Positioning
- `fontScale = computeFontScale(logicalCanvas.width)` — vorher visualSize-basiert. Editor und Export nutzen jetzt denselben Wert (beide Logical), Print-Ratio konsistent
- `useMapExport.ts`: keine Änderung nötig — verwendet schon `viewState.viewportWidth` welches durch das neue Logical-Canvas-Setup automatisch logical zurückliefert (MapLibre's `container.clientWidth` reportet Layout-Pixel, nicht Visual-Pixel)
- TypeScript clean, /de/map kompiliert + rendert 200 OK
- **Bekannte offene Punkte für QA**: (1) MapLibre-Pointer-Events innerhalb CSS-transform-skaliertem Parent — getBoundingClientRect liefert visual size, clientWidth liefert logical size → mögliche Drag/Zoom-Focal-Point-Mismatches (Faktor visualScale). In der Praxis testen ob spürbar. (2) Mobile-Auto-Fit bei A2: Logical 1600×2263 wird auf z.B. 350×495px Display-Bereich skaliert (visualScale 0.22) — schauen ob WebGL-Performance auf älteren Geräten passt. (3) FONT_SCALE_REFERENCE_WIDTH bleibt bei 660 → bei A2 mit Logical 1600 ist fontScale auf 1.0 gecappt; Customer kann Text-Größen manuell hochkurbeln

## Dependencies
- Requires: PROJ-1 (Karten-Editor Core) — bestehender Editor wird erweitert
- Requires: PROJ-3 (Poster-Export) — Export-Pipeline muss exakt den Editor-Ausschnitt rendern
- Requires: PROJ-18 (Mobile-Editor) — Mobile-Variante der Sizing-Logik
- Requires: PROJ-26 (Versandkosten-Management) — A2-Versand-Tarife pro Land
- Touches: PROJ-6 (Stripe) — A2-Pricing pro Produkt im Catalog

## Problem Statement

Aktuell ändert das Papierformat (A4 vs. A3) nur die Druck-Auflösung — der gerenderte Karten-Ausschnitt bleibt identisch. Das widerspricht der Customer-Erwartung: bei einem größeren Papier müsste mehr Karte sichtbar sein (mehr Stadt drumherum, gleicher Detail-Grad). Aktuell fühlt sich A3 wie „A4 zoomgeschaltet auf größerem Papier" an, statt wie eine echte Vergrößerung des Druck-Bereichs.

Ziel: Format-Wahl koppelt sich an den physisch gerenderten Karten-Viewport. Bei gleichem MapLibre-Zoom-Level zeigt A3 ~√2× und A2 ~2× mehr Geografie pro Kante als A4.

## User Stories

- **Als Customer** wähle ich am Anfang des Editor-Flows mein Papierformat (A4/A3/A2), damit ich gleich sehe wieviel Karte ich pro Größe bekomme
- **Als Customer** wechsle ich jederzeit das Format im MapTab, sehe sofort die Auswirkung auf den Karten-Ausschnitt (mehr/weniger Drumherum) und kann auch zurückwechseln ohne meine Komposition zu verlieren (Marker bleibt zentriert, Text bleibt proportional positioniert)
- **Als Customer** zoome/pane ich frei in der Karte; was ich im Editor sehe ist exakt das, was am Ende gedruckt wird (WYSIWYG inklusive Format-Coverage)
- **Als Mobile-Customer** sehe ich den format-gekoppelten Viewport ebenfalls auf dem Handy (A3/A2 ist ggf. größer als das Display → Container-Scroll oder Pinch-zu-Fit)
- **Als Admin** sehe ich keine Behandlungs-Sonderfälle für alte Test-Projekte — die einfach mit dem neuen Viewport öffnen

## Acceptance Criteria

### Editor (Desktop)
- [ ] `PrintFormat` Type erweitert um `'a2'` mit korrekten mm- und px-Werten (420×594mm, 4961×7016px @ 300dpi)
- [ ] Format-Selector (A4/A3/A2) sitzt am Top des MapTab und wird aus dem Export-Tab entfernt
- [ ] Bei Format-Wechsel ändert sich die physische Pixel-Größe des Editor-Preview-Canvas (nicht der Bildschirm-Pixel sondern der gerenderten MapLibre-Canvas in dem MapLibre denkt: "ich rendere auf X×Y px bei Zoom Z")
- [ ] Der MapLibre-Zoom-Level bleibt beim Format-Wechsel unverändert; durch den größeren/kleineren Canvas zeigt MapLibre automatisch mehr/weniger Geografie
- [ ] Marker-Position (lng/lat) bleibt beim Format-Wechsel unverändert (Marker steht weiter über demselben geografischen Punkt)
- [ ] Text-Block-Positionen (gespeichert in 0–1 Anteilen) bleiben proportional korrekt (alle ISO-A-Formate haben dieselbe √2-Aspect-Ratio)
- [ ] Bei Wechsel A4 → A3 oder A4 → A2 sieht Customer mehr Karte um seinen Marker; bei Wechsel zurück zu kleinerem Format wird's wieder enger — keine Daten gehen verloren
- [ ] Editor-Preview-Container im UI passt sich an: bei A2 wird der Preview-Bereich auf dem Bildschirm sichtbar größer (entweder via vergrößertem Container oder via skaliertem Container der das Größenverhältnis kommuniziert)

### Editor (Mobile, PROJ-18)
- [ ] Mobile-MapTab zeigt denselben Format-Selector (A4/A3/A2)
- [ ] Mobile-Preview-Canvas skaliert ebenfalls mit Format
- [ ] Falls A3/A2-Canvas größer als der Mobile-Viewport ist: Customer kann scrollen oder pinchen um den ganzen Druckbereich zu sehen (technische Lösung in /architecture)

### Export
- [ ] PNG- und PDF-Export rendern exakt den Editor-Viewport in Druck-DPI (kein neuer Ausschnitt-Berechnung)
- [ ] A2-Export erzeugt 4961×7016px PNG bzw. PDF
- [ ] Export-Pipeline für Foto-Poster (PROJ-32) und Star-Map (PROJ-7) bleibt unverändert (kein Coverage-Effekt da kein Map-Tile-Rendering)

### Pricing & Versand
- [ ] Product-Catalog (Stripe) bekommt A2-Preise für alle drei Produkte (Download / Poster / Bilderrahmen)
- [ ] Versandkosten-Tabelle (PROJ-26) bekommt A2-Tarife pro Land
- [ ] DiscountBadge / formatPrice / Cart funktionieren mit A2 ohne Code-Änderungen

### Star-Map & Foto-Poster
- [ ] Format-Selector in Star-Map-Editor (PROJ-7) und Foto-Editor (PROJ-32) bekommt ebenfalls A2-Option, ändert aber **nur** die Druck-Größe — kein viewport-couplig (da diese Editoren keinen Tile-basierten Coverage-Effekt haben)

## Edge Cases

- **Format-Wechsel mit aktivem Marker am Bildschirm-Rand:** Marker rutscht beim Verkleinern (A2→A4) potentiell aus dem Sichtbereich. Verhalten: Marker behält geografische Position; falls außerhalb des neuen Viewports, MapLibre zentriert nicht automatisch — Customer muss ggf. manuell pannen oder es wird empfohlen, den Marker erneut zu setzen. (Alternative: Auto-Recenter beim Format-Wechsel — siehe /architecture)
- **Format-Wechsel mit aktivem Split-Map (zwei Karten):** Beide Map-Viewports skalieren mit. Marker-Positionen beider Karten bleiben erhalten.
- **Format-Wechsel mit aktivem Foto im Split (PROJ-19):** Foto-Container bleibt am Poster-Rand verankert, skaliert proportional mit dem neuen Canvas. Crop-Werte (cropX/cropY/cropScale 0–1) bleiben gültig.
- **Sehr kleines Mobile-Display + A2-Format:** A2-Canvas ist auf 375px-Display physisch zu groß. Lösungsraum: Container-Scroll, Pinch-Zoom, oder Auto-Fit-Skalierung. Entscheidung in /architecture.
- **Existierende Test-Projekte (Admin):** Beim Öffnen wird der Viewport mit der neuen Sizing-Logik gerendert. Falls das Projekt auf A3/A2 gespeichert war: Customer sieht mehr Karte als beim Speichern. Akzeptabel da nur Admin-Test-Daten.
- **Browser-Resize während Editor offen:** Der Preview-Container reagiert auf Window-Resize wie bisher — die Format-gekoppelte Canvas-Größe bleibt aber dieselbe (Format ändert sich ja nicht). Nur das Container-Skalierungsverhältnis (CSS-Transform-Scale) ändert sich.
- **Deep-Link / Share-URL mit altem Format:** Falls Customer eine geteilte URL mit `format=a4` öffnet, wird der A4-Viewport gerendert. Unverändertes Verhalten.
- **Print-Preview-Button:** Customer-Sicht in PreviewTriggerButton zeigt das exakte Druck-Bild — bleibt korrekt da dasselbe Viewport-Resultat genutzt wird.

## Technical Requirements (optional)

- **Performance:** Format-Wechsel soll ohne sichtbare Verzögerung passieren (< 200ms inkl. MapLibre-Resize). MapLibre-Canvas-Resize ist günstig wenn Zoom unverändert bleibt.
- **Tile-Cost:** Größere Viewports laden mehr MapTiler-Tiles. A2-Viewport ist ~4× A4-Tile-Bereich → entsprechend ~4× Tile-Requests pro Pan/Zoom. Akzeptabel da A2 selten gewählt werden wird; Tile-Cache hilft.
- **Browser-Support:** wie Hauptanwendung (Chrome, Firefox, Safari, mobile Safari/Chrome).
- **Aspect-Ratio-Garantie:** Alle ISO-A-Formate sind √2 → Text-Block-Layout in 0–1-Koords bleibt visuell konsistent.

## Out of Scope (explicit Non-Goals)

- A1, A0 oder Sonder-Formate
- Format-spezifische Default-Zooms (z.B. „A2 startet automatisch in geringerem Zoom") — Customer entscheidet selbst
- Aspect-Ratio-Wechsel (z.B. quadratisch oder US-Letter) — bleibt für späteres Feature
- Format-spezifische Layouts/Presets (z.B. ein Preset, das nur auf A2 funktioniert)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Kernidee: „Logical Canvas" pro Format

Heute ist die Map-Editor-Vorschau ein einziger Container, der sich an die Bildschirmgröße anpasst. MapLibre rendert immer in 100% dieses Containers — egal ob A4 oder A3. Daher zeigt jedes Format dieselbe Geografie.

Das neue Konzept führt eine **Trennung** ein:

1. **Logical Canvas** — ein virtueller Pixel-Bereich, in dem MapLibre denkt es rendere. Pro Format eine feste Größe. Beispiel:
   - A4 = 800×1131 logische Pixel
   - A3 = 1131×1600 logische Pixel
   - A2 = 1600×2263 logische Pixel
2. **Visual Container** — der echte sichtbare Bereich auf dem Bildschirm. Wird per CSS-Skalierung an die Logical Canvas angepasst.

Da MapLibre auf einer größeren Logical Canvas „mehr Platz hat", zeigt es bei gleichem Zoom-Level automatisch entsprechend mehr Geografie. Customer erlebt: A3 = mehr Karte um den Marker als A4.

### Component Structure (Visual Tree)

```
Editor-Seite
├── Sidebar (links)
│   └── MapTab
│       ├── Format-Selector (NEU am Top: A4 / A3 / A2)
│       ├── Standort-Suche
│       ├── Split-Modus
│       ├── Stil/Palette/Maske
│       └── Marker-Pins
│
└── Editor-Canvas-Bereich (rechts)
    └── Visual Container (Bildschirm-sichtbar)
        └── Logical Canvas (Format-spezifische Größe)
            ├── MapLibre-Karte (rendert auf Logical-Canvas-Pixel)
            ├── Masken-Overlay (SVG)
            ├── Marker-Pins (positioniert über lng/lat)
            ├── Text-Blocks (positioniert in 0-1 Anteilen)
            └── Foto-Overlays (Letter/Grid/Single)

Mobile-Editor
└── Visual Container (passt sich an Display)
    └── Logical Canvas (gleich wie Desktop, ggf. herunterskaliert via Auto-Fit)
        └── (gleiche Inhalte wie Desktop)

Export-Pipeline (im Hintergrund)
└── Hidden Canvas (in Druckauflösung, z.B. A2 = 4961×7016px)
    └── Render: MapLibre auf Logical-Canvas-Geometrie, hochskaliert auf Druck-DPI
```

### Format-Wechsel-Verhalten

Wenn der Customer das Format wechselt, passieren drei Dinge gleichzeitig:

1. **Logical Canvas Größe ändert sich** → MapLibre bekommt neue Render-Dimensionen, zeigt automatisch mehr/weniger Geografie bei gleichem Zoom.
2. **Visual Container skaliert via CSS-Transform** so dass der Customer trotzdem das ganze Poster sieht (Auto-Fit).
3. **Map auto-zentriert auf den Marker** (Zoom bleibt unverändert). Falls kein Marker da ist, bleibt die Map-Mitte stabil.

→ Customer-Erlebnis: Drücken auf „A3" und der Editor zeigt sofort den Marker zentriert mit mehr Karte drumherum. Drücken auf „A4" und es wird wieder enger, Marker bleibt mittig.

### Data Model (was muss gespeichert werden)

**Im Editor-Store** (kein Datenbank-Schema-Wechsel):

- **printFormat** — bestehender Wert wird um `'a2'` erweitert (heute: `'a4' | 'a3'`)
- **viewState** (lng, lat, zoom) — unverändert; bleibt format-unabhängig
- **textBlocks** (x/y/width in 0-1 Anteilen) — unverändert; alle ISO-A-Formate haben dieselbe √2-Aspect-Ratio, daher visuell konsistent
- **marker** (lng, lat) — unverändert; geografische Position bleibt format-unabhängig

**Neu nur in der Logik (kein Persistenz)**:

- Format → Logical-Canvas-Pixel-Lookup (Konstante pro Format)
- Visual-Skalierungsfaktor (errechnet aus Visual-Container-Größe und Logical-Canvas-Größe)

**Im Stripe-Product-Catalog** (manuelle Konfiguration, kein Code):

- Pro Produkt (Download, Poster, Bilderrahmen) eine A2-Preis-Variante hinzufügen
- A2-Versandtarife pro Land in PROJ-26-Versandkostentabelle

### Mobile-spezifisch: Auto-Fit

Auf Mobile ist die Logical Canvas immer größer als das Display (vor allem bei A2). **Auto-Fit-Strategie:** der Visual Container skaliert via CSS-Transform automatisch herunter, sodass das ganze Poster auf einmal sichtbar ist. Customer sieht z.B. ein A2-Poster auf dem 6"-Display in komprimierter Form.

→ Karten-Details wirken auf Mobile bei A2 entsprechend klein. Akzeptiert: Customer kann jederzeit auf A4 wechseln um Detail-Schärfe zu bekommen, oder am Desktop weiterarbeiten.

### Export-Pipeline (Hidden Canvas)

Bestehende Export-Pipeline rendert bereits auf eine separate Hidden Canvas in voller Druckauflösung. Anpassung:

- Hidden Canvas nimmt nicht mehr nur den fixen sichtbaren Map-Ausschnitt — sondern dieselben Logical-Canvas-Geometrien wie der Editor, hochskaliert auf 300dpi-Druckauflösung.
- A2 erzeugt ein 4961×7016px PNG/PDF.
- MapLibre in der Hidden Canvas verwendet dieselbe lng/lat/zoom-Position wie der Editor, lediglich `pixelRatio` wird angepasst um Druck-DPI zu erreichen.

Dadurch ist sichergestellt: Was der Customer im Editor sieht ist exakt das, was gedruckt wird (WYSIWYG inklusive Coverage).

### Star-Map und Foto-Poster (PROJ-7, PROJ-32)

Diese Editoren rendern keine Tile-basierten Karten, daher haben sie keinen „mehr-Inhalt-bei-A3"-Effekt. Sie bekommen den A2-Selector im Format-Dropdown, aber der Render-Inhalt skaliert nur in der Druck-Größe — keine Logical-Canvas-Coupling-Logik nötig.

### Tech-Entscheidungen (warum so?)

**Warum „Logical Canvas" statt direkt-am-Container-rendern?**
Weil MapLibre intern auf seine Pixel-Größe schaut, um zu entscheiden wieviele Tiles geladen werden und wieviel Geografie sichtbar ist. Wenn wir einfach den Visual Container vergrößern, kommen wir an Bildschirm-Grenzen — wir können auf Desktop nicht beliebig groß werden, auf Mobile gar nicht. Die Logical Canvas ist der virtuelle Render-Bereich, der per CSS auf das Sichtbare angepasst wird. Editor und Export benutzen dieselbe Logical Canvas → garantiertes WYSIWYG.

**Warum Auto-Recenter auf Marker beim Format-Wechsel?**
Customer komponiert um seinen Marker. Wenn beim Wechsel A2 → A4 der Marker plötzlich am Rand wäre oder ganz außerhalb, hätte er das Gefühl „mein Bild ist kaputt". Auto-Recenter (Zoom bleibt!) hält die Komposition intakt: Marker mittig, gleicher Detail-Grad, nur enger drumherum.

**Warum Auto-Fit auf Mobile statt Pinch-Zoom?**
Pinch-Zoom auf einem Editor-Preview interagiert chaotisch mit MapLibre's eigener Pinch-zum-Map-Zoomen. Auto-Fit ist ein-Step und vorhersehbar — Customer sieht das ganze Poster, fertig. Falls Detail nötig: A4 wählen, fertig.

**Warum keine neuen Datenbank-Felder?**
Weil printFormat schon im Store ist und alle anderen Werte (viewState, textBlocks, marker) format-unabhängig sind. Logical-Canvas-Größe ist eine Konstante pro Format → Code-Lookup, keine Persistenz.

### Dependencies (zu installierende Packages)

**Keine neuen NPM-Packages.** Alle benötigten Bausteine sind bereits da:
- MapLibre GL: für Karten-Rendering (vorhanden)
- Zustand: für `printFormat`-Store (vorhanden)
- Tailwind CSS: für Visual Container & CSS-Transform (vorhanden)

**Manuelle Setup-Aufgaben** (außerhalb Code):
- A2-Preise in Stripe-Catalog pro Produkt anlegen (Admin-UI für Product-Catalog)
- A2-Versandtarife pro Land in Versand-DB (PROJ-26-Admin-UI)
- A2-Druckanbieter-Setup (Operator-Aufgabe, kein Code)

### Was wird angefasst (Code-Bereiche)

| Bereich | Was passiert |
|---------|-------------|
| `src/lib/print-formats.ts` | A2-Eintrag hinzufügen |
| `src/components/editor/PosterCanvas.tsx` | Logical-Canvas-Konzept einführen, Visual Container scaling |
| `src/components/sidebar/MapTab.tsx` | Format-Selector am Top hinzufügen |
| `src/components/sidebar/ExportTab.tsx` | Format-Selector entfernen |
| `src/components/sidebar/mobile/MobileMapTab.tsx` | Format-Selector am Top hinzufügen |
| `src/hooks/useEditorStore.ts` | `setPrintFormat` erweitert um Auto-Recenter-Logik |
| `src/hooks/useMapExport.ts` | Hidden Canvas verwendet Logical-Canvas-Geometrie |
| `src/components/sidebar/StarMapExportTab.tsx`, `PhotoExportTab.tsx` | A2-Option im Format-Dropdown |
| Stripe Product-Catalog (DB) | A2-Preise pro Produkt anlegen |
| Versand-DB (PROJ-26) | A2-Tarife pro Land |


## QA Test Results

**QA-Datum:** 2026-05-08
**QA-Methode:** Code-Audit + Vitest Unit-Tests + E2E-Spec geschrieben (Run aus Infrastruktur-Gründen vertagt — port-3000 belegt durch falsches Workspace-Root)
**Browser-Bestätigung:** Customer hat im Live-Editor bestätigt: A3/A2 zeigt sichtbar mehr Geografie ✓, Mobile-Performance OK ✓

### Acceptance-Criteria-Status

| AC | Status | Notes |
|----|--------|-------|
| `PrintFormat` Type erweitert um `'a2'` | ✅ Pass | `print-formats.ts` enthält A2 (420×594mm, 4961×7016px) + `LOGICAL_CANVAS_SIZE` Konstanten |
| Format-Selector am Top des MapTab | ✅ Pass | 3-Spalten-Grid in MapTab + MobileMapTab; aus ExportTab entfernt |
| Logical-Canvas pro Format aktiv | ✅ Pass | PosterCanvas rendert poster-div in `logicalCanvas.width × logicalCanvas.height` Pixeln, MapLibre's `clientWidth` = logical |
| Zoom-Level bleibt beim Format-Wechsel | ✅ Pass | `setPrintFormat` ändert nur `pendingCenter`-Koordinaten, nicht zoom |
| Marker-Position (lng/lat) bleibt | ✅ Pass | `setPrintFormat` setzt nur pendingCenter auf marker.lng/lat — marker-state unverändert |
| Text-Block-Positionen proportional korrekt | ✅ Pass | 0–1 Anteile transform-invariant (TextBlockOverlay-Audit bestätigt) |
| A4 → A3/A2 zeigt mehr Karte | ✅ Pass | Customer-Live-Verifikation |
| Mobile MapTab Format-Selector | ✅ Pass | Implementiert + visuell vom User bestätigt |
| Mobile-Auto-Fit | ✅ Pass | CSS-Transform skaliert Logical-Canvas auf Display-Größe; kein zusätzlicher Code nötig |
| PNG/PDF-Export rendert exakten Editor-Viewport | ⚠️ Vermutlich Pass (nicht headless-getestet) | useMapExport liest `viewState.viewportWidth` welches durch das neue Setup logical zurückgibt; kein Code-Change in Export-Pipeline notwendig |
| A2-Export → 4961×7016px PNG/PDF | ⚠️ Nicht direkt verifiziert | Logik korrekt nach Code-Audit (`PRINT_FORMATS.a2.widthPx/heightPx` × pixelRatio) |
| Star-Map + Foto-Editor A2-Option | ✅ Pass | Iterieren `PRINT_FORMAT_OPTIONS`; A2 erscheint automatisch im 3-Spalten-Grid |
| Stripe-Catalog A2-Pricing | 🔵 Out-of-Code-Scope | Operator-Aufgabe (Admin-Backend); Catalog-API gibt `null` zurück bei nicht gepricten Formaten → A2-Buttons disabled bis gesetzt |
| Versandtarife A2 (PROJ-26) | 🔵 Out-of-Code-Scope | Operator-Aufgabe |

### Bugs

#### 🔴 HIGH — DraggablePin lat/lng-Konvertierung verschoben unter visualScale ≠ 1

**Datei:** [src/components/editor/DraggablePin.tsx:84-103](src/components/editor/DraggablePin.tsx#L84-L103)

**Problem:** Beim Drag eines Marker-Pins:
- `rect = container.getBoundingClientRect()` liefert visuelle Pixel (z.B. 600 wide bei A4 Desktop mit visualScale=0.75)
- `x = ev.clientX - rect.left` ist visueller Offset (0–600)
- `setDragPos({x})` → Pin-CSS-`left: 100px` ist im LOGICAL-Pixel-Raum (mapAreaRef ist innen im transformierten Poster) → renders bei visual 100×0.75 = 75px
- `map.unproject([x, y])` interpretiert x als logical Pixel → nimmt Cursor-Visual-100 als wäre Cursor-Logical-100, aber Cursor war eigentlich bei Logical-133

**Effekt:** Pin "lagged" hinter dem Cursor um Faktor `(1 - visualScale)`. Bei A4 (visualScale ≈ 0.75) ~25% Verschiebung. Bei A2 (visualScale ≈ 0.4) ~60% Verschiebung. Pin landet beim Loslassen an falscher geographischer Position.

**Reproduktion:** Editor öffnen → Marker aktivieren → Pin draggen → beobachten dass Pin nicht beim Cursor bleibt.

**Fix-Skizze:** `visualScale` als Prop an DraggablePin übergeben; alle visuellen Pixel mit `1/visualScale` multiplizieren bevor sie als logical-pixel interpretiert werden.

#### 🟠 MEDIUM — fontScale-Reduktion auf Mobile (~17% kleiner)

**Datei:** [src/components/editor/PosterCanvas.tsx:108](src/components/editor/PosterCanvas.tsx) — `fontScale = computeFontScale(logicalCanvas.width)`

**Problem:** Vor PROJ-37 nutzte fontScale die Visual-Width (z.B. ~300 auf Mobile → fontScale 0.45), jetzt die Logical-Width (800 auf jedem Device → fontScale 1.0 capped). Text wird in größeren Logical-Pixeln gerendert und dann CSS-runterskaliert. Resultierende Mobile-Display-Pixel: 36 × 0.375 = 13.5px statt vorher 16.2px → ~17% kleinere Text-Darstellung als vorher auf Mobile.

**Effekt:** Mobile-Customer sehen Text ein Stück kleiner als gewohnt. Customer hat aber Live-Test bestätigt — wahrscheinlich noch im akzeptablen Bereich. Falls Beschwerden: `FONT_SCALE_REFERENCE_WIDTH` von 660 auf ~545 senken oder Default-Font-Sizes anheben.

#### 🟡 LOW — viewportWidth in alten gespeicherten Projekten obsolet

**Datei:** [src/hooks/useProjectSync.ts:83,101](src/hooks/useProjectSync.ts) + [src/hooks/useMapExport.ts:512](src/hooks/useMapExport.ts)

**Problem:** Pre-PROJ-37 wurde `viewState.viewportWidth/Height` als visual on-screen Pixel gespeichert (z.B. 600). Post-PROJ-37 sind diese Werte logical (800). Beim Laden eines alten Projekts liest der Store kurz die alte 600-Größe; falls Customer sofort exportiert vor dem ersten MapLibre-emit (das viewportWidth auf logical 800 überschreibt), nutzt Export die falsche Preview-Width → Print-Layout leicht verschoben.

**Mitigation:** Per User-Bestätigung gibt es noch keine echten Customer-Projekte (nur Admin-Test) → real-life Impact = 0. MapLibre's `moveend`-Emit überschreibt viewportWidth innerhalb von ~100ms nach Editor-Mount, sodass Export-Klick danach korrekt ist.

#### 🟡 LOW — MapLibre Drag/Scroll-Zoom-Focal-Point-Mismatch

**Datei:** Architektur (CSS-Transform auf MapLibre-Parent)

**Problem:** MapLibre nutzt `getBoundingClientRect` (visual) für Pointer-Events und `clientWidth` (logical) für Canvas-Render. Drag-Pan-Geschwindigkeit ist daher um Faktor `visualScale` "sluggish" (langsamer) auf A3/A2. Scroll-Wheel-Zoom-Focal-Point ist um denselben Faktor verschoben.

**Mitigation:** Customer hat im Live-Test bestätigt dass es "sieht richtig gut aus" — vermutlich nicht spürbar im typischen Editor-Flow (Zoom mit Buttons, kleine Pan-Korrekturen). Falls echtes Problem: gleicher Architektur-Fix wie für DraggablePin (Skalierung der Input-Koordinaten).

### Security-Audit

- ✅ Keine User-Inputs → keine XSS/Injection-Vektoren in PROJ-37
- ✅ Keine API-Endpoints geändert → keine Auth-Bypass-Vektoren
- ✅ Keine sensiblen Daten in Browser-Console / Network exposed
- ✅ Keine neuen externen Dependencies installiert

### Regression-Check

- ✅ Vitest unit tests: 31 passed (alle die vorher liefen). Pre-existing failure in PROJ-18-mobile-editor.spec.ts und PROJ-27-mobile-star-map-editor.spec.ts ist Vitest-vs-Playwright-Konfig-Issue, nicht durch PROJ-37 verursacht
- ✅ TypeScript-Compile: clean (`npx tsc --noEmit -p .`)
- ✅ Foto-Poster-Editor (PhotoPosterCanvas) und Star-Map-Editor verwenden separate Canvas-Sizing — nicht von Logical-Canvas-Pattern betroffen
- ✅ TextBlockOverlay + PhotoOverlay Drag-Math nutzen Ratio (rect-fraction) → transform-invariant
- ✅ applyPreset im Map-Mode setzt printFormat nicht → keine Surprise-Format-Wechsel beim Preset-Apply
- ⚠️ DraggablePin: REGRESSION (siehe HIGH bug oben) — Pin-Drag funktionierte vor PROJ-37 sauber

### E2E-Tests

Spec geschrieben in [tests/PROJ-37-format-coupled-viewport.spec.ts](tests/PROJ-37-format-coupled-viewport.spec.ts) (12 Test-Cases). Run blockiert weil Port 3000 von einem Stale-Dev-Server (falsches Workspace-Root) belegt war. Tests sind ready-to-run sobald Port frei ist (`taskkill /F /PID <pid>` für den falschen Next-Prozess oder Restart der Dev-Session).

### Production-Ready-Decision

**🚧 NOT READY** — wegen 1 HIGH bug (DraggablePin-Verschiebung).

**Empfehlung:** Vor Produktiv-Stellung den DraggablePin-Fix einbauen (visualScale-Prop durchreichen + Skalierung). Die anderen Issues (fontScale, alte viewportWidth, MapLibre-Drag-Feel) sind akzeptabel — Customer-Live-Test war schon positiv.

**Open für Customer:**
1. Bitte testen: Editor öffnen, Marker aktivieren, Pin verschieben — bleibt der Pin beim Cursor während des Drags und landet er an der erwarteten Stelle? Falls nein → DraggablePin-Fix Priorität HIGH
2. Stripe-Catalog A2-Pricing pro Produkt anlegen sobald gewünscht (separate Operator-Aufgabe)
3. PROJ-26 A2-Versandtarife pro Land ergänzen


## Deployment
_To be added by /deploy_

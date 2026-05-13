# PROJ-45: Multi-Map-Hochzeitsposter-Editor

## Status: In Progress
**Created:** 2026-05-11
**Last Updated:** 2026-05-11

## Implementation Notes
- **Chunk 1 (Foundation, 2026-05-11):** PosterType-Enum auf 4 Typen erweitert; `useWeddingEditorStore` (Zustand, 3 Slots + globals); `SlotStateContext` für slot-aware Leaf-Components (Chunk 3); `useProjectSync` mit `wedding`-Branch (LS-Key `poster-generator-draft-wedding`, getConfig/applyConfig/subscribe/getDefaultTitle); `wedding.*` i18n-Namespace in allen 5 aktiven Locales (de/en/fr/it/es). Type-check sauber (0 neue TS-Errors).
- **Chunk 2 (Desktop & Mobile Skeleton, 2026-05-11):** Route `/[locale]/wedding/page.tsx`; `WeddingEditorShell` (Desktop/Mobile-Switcher am 1024-px-Breakpoint, mountet Auto-Save + locale-defaults für Slot-Labels); `WeddingLayout` (Sidebar w-72 + Canvas); `WeddingCanvas` mit drei klickbaren Slot-Placeholdern (dashed border statt MapTiler — echte Karten in Chunk 3) im horizontal-3- oder vertical-3-Layout, globaler Footer mit Paarnamen + Hochzeitsdatum; `WeddingSidebar` mit shadcn-Tabs + per-Slot-Formular (Label/Datum/Ort-Readonly) + Globaleinstellungen (Paarnamen/Hochzeitsdatum/Layout-Picker); `SlotTabSwitcher` als TabsList-Wrapper; `MobileWeddingLayout` als 50/50-Stacked-Provisorium (volle Tap-Sheet-UX in Chunk 5). `EditorToolbar` akzeptiert jetzt auch `posterType="wedding"`. Type-check sauber (0 neue TS-Errors).
- **Chunk 3 (Live Maps + Location Search, 2026-05-11):** `useMapInstance`-Registry um `wedding-0|1|2`-Slices erweitert (+ `weddingSliceFor()`-Helper); `WeddingSlotMap` + `WeddingSlotMapInner` als slot-aware Parallel-Implementierung zu `MapPreview`/`MapPreviewInner` (eigenes File-Pair statt Refactor des Single-Map-Editors — Null Regressions-Risiko); WeddingCanvas zeigt jetzt drei echte MapTiler-Karten in runden Slot-Containern mit `ring-primary/40` als Active-Indicator; `LocationSearch` (war bereits store-agnostisch, hat nur `onSelect`-Callback) direkt in Desktop- und Mobile-Sidebar eingehängt mit `setSlotLocation(index, lat, lng, name)`-Wiring. Slot-spezifische Style-/Palette-/Mask-Picker bewusst aus diesem Chunk gelassen — kommen als Chunk 3b nach Browser-Verifikation. Type-check sauber (0 neue TS-Errors).
- **Chunk 3b (Per-Slot Style & Palette Pickers, 2026-05-11):** `WeddingStylePicker` (shadcn Select mit MAP_LAYOUTS, locale-Labels via `useTranslatedLabel('mapLayouts')`) und `WeddingPalettePicker` (3-Spalten-Grid mit 4-Farb-Swatch-Vorschau, DB-Paletten via `useMapPalettes` mit MAP_PALETTES-Fallback) unter `src/components/wedding/pickers/`; eingehängt in Desktop- und Mobile-SlotFields nach dem Datum-Feld. Writes via `updateSlot(index, { styleId | paletteId, customPalette: null, customPaletteBase: null })` — MapTiler-Style-Effect im `WeddingSlotMapInner` reagiert reaktiv. **Mask-Picker bewusst weiter aufgeschoben** — Wedding-Canvas nutzt aktuell `rounded-full`-CSS, echte Herz/Frame-Masken brauchen SVG-Clip-Path-Rendering im Slot-Container (eigener Aufwand für späteren Chunk 3c). Type-check sauber (0 neue TS-Errors).
- **Chunk 3c-Format (Format + Orientation, 2026-05-11):** Manuelle Slot-Layout-RadioGroup ersetzt durch deterministische Ableitung aus Poster-Orientation (`src/lib/wedding-layout.ts` mit `slotLayoutFromOrientation()` — Portrait → vertical-3, Landscape → horizontal-3). Neuer Format-Picker (A4/A3/A2) + Orientation-Toggle (Hoch/Quer, mit RectangleVertical/RectangleHorizontal-Icons) in den Wedding-Sidebar-Globaleinstellungen (Desktop + Mobile) — schreibt auf `useEditorStore.printFormat` / `useEditorStore.orientation` (shared mit den anderen Editoren, wie Star-Map und Photo). `slotLayout` field aus `useWeddingEditorStore` entfernt; `useProjectSync` ignoriert das Feld bei legacy-configs jetzt still. WeddingCanvas-Aspect-Ratio dynamisch (Portrait `210/297`, Landscape `297/210`) + dynamische Max-Width (480 px portrait, 680 px landscape). Type-check sauber (0 neue TS-Errors).
- **Chunk 3c-Hearts (Herz-Masken statt Kreise + Slot-Größen-Bugfix, 2026-05-11):** WeddingCanvas-Slot-Container nutzt jetzt CSS `mask-image` mit einem Inline-SVG-Herz (Pfad aus `MAP_MASKS['heart-single']`, viewBox eng auf das Herz zugeschnitten `38 70 520 480`, sodass `maskSize: contain` das Herz zentriert + maximal füllt). Fix für den Bug, dass Slots von links nach rechts wuchsen: Button jetzt `h-full w-full` (vorher kein expliziter Width-Constraint → Button schrumpfte auf Content-Größe → kürzere Labels = kleinere Slots = kleinere Karten). Label bekommt `line-clamp-2`, damit lange Labels die Slot-Höhe nicht sprengen. `rounded-full` + `aspect-square` aus der Map-Box entfernt — die Form kommt jetzt komplett aus der CSS-Maske. Active-Slot-Indikator dezenter (`bg-primary/5` statt expliziter Ring), damit die Herz-Form die Aufmerksamkeit zieht. Type-check sauber (0 neue TS-Errors). **Geparkt für später:** Per-Slot-Mask-Picker (User kann z. B. Slot 2 als Rechteck-Frame haben) — kommt sobald Customer-Feedback zeigt, dass Variation gewünscht ist.
- **Chunk 3c-LogicalCanvas (Format-Coupled Viewport + Hearts vergrößert + Labels unten, 2026-05-11):** WeddingCanvas portiert komplett das PROJ-37-Pattern: ResizeObserver am Wrapper berechnet `visualSize`, innerer Poster-`div` lebt im LOGICAL-Pixel-Raum (`effectiveLogicalCanvas(printFormat, orientation)` — A4: 800×1131, A3: 1131×1600, A2: 1600×2263) und wird via `transform: scale(visualScale)` runter-/hochskaliert. Effekt: A2 zeigt jetzt sichtbar mehr Geografie pro Slot als A4 bei gleichem Zoom, weil MapTiler im größeren Logical-Raum mehr Tiles rendert. Hearts bekommen jetzt einen eigenen `aspect-[520/480]`-Wrapper mit `maskSize: 100% 100%` und `m-auto` — sie füllen ihre Slot-Höhe vollständig und sind horizontal zentriert (vorher tote Ränder durch `maskSize: contain` auf rechteckigen Slots). Slot-Layout umstrukturiert: Label + Datum jetzt UNTER dem Herz (Etsy-Bestseller-Pattern, vom User bestätigt) statt oben/unten getrennt. Typografie skaliert mit `fontScale = logicalCanvas.width / a4Width` — Footer-Couple-Names sind in A2 doppelt so groß in logischen Pixeln wie in A4, sehen am Bildschirm aber identisch aus (visualScale kompensiert). Type-check sauber (0 neue TS-Errors). Risiko: MapTiler-Quota — drei Karten bei A2 sind ~3.2M Pixel insgesamt, beobachten.

## Summary
Eigener Hochzeits-Posterkategorie: ein Poster mit **fix drei Karten-Slots** auf einem einzigen Canvas — validiertes Etsy-Bestseller-Muster "Met / Engaged / Married". Editor-Codebasis wird **parametrisiert**, nicht kopiert: ein Editor-Frontend, das via `mapSlots[]`-State 1 (bestehender Single-Map-Editor) oder 3 (Hochzeit) Karten rendert. Eigenständige SEO-Kategorie über Anlass-Landingpages (PROJ-29) in allen Locales.

## Dependencies
- **Requires:** PROJ-1 (Karten-Editor Core) — State-Refactor `mapState` → `mapSlots[]`
- **Requires:** PROJ-3 (Poster-Export) — Export-Pipeline muss N Karten rendern
- **Requires:** PROJ-5 (Projekt-Verwaltung) — neuer `wedding`-Projekttyp neben `map`, `starmap`, `photo`
- **Requires:** PROJ-20 (Internationalisierung) — alle UI-Texte + Default-Title-Library lokalisiert
- **Requires:** PROJ-21 (Layout-Presets) — neue Slot-Layout-Varianten (horizontal-3, vertical-3)
- **Requires:** PROJ-29 (Anlass-Landing-Pages) — Hochzeits-Landing als primärer Discovery-Trichter
- **Requires:** PROJ-43 (Mobile Tap-Sheet UX) — Slot-Switcher im Tap-Sheet
- **Touches:** PROJ-11 (Homepage) — Feature-Card im Hero
- **Touches:** PROJ-24 (Localized Storefront Content) — Hochzeits-Beispielbilder pro Locale
- **Touches:** PROJ-30 (Preset-Render-Pipeline) — Bulk-Renders für Hochzeits-Presets
- **Touches:** PROJ-33 (Saisonaler Marketing-Kalender) — Mai–September-Posts linken auf Landing
- **Touches:** PROJ-42/44 (Stadt-Hubs) — Cross-Sell-Link auf typischen Hochzeits-Locations

## User Stories

### Primär-Zielgruppe: Hochzeitspaar (Self-Buy)
- Als **Brautpaar** möchte ich **drei bedeutungsvolle Orte unserer Geschichte (Kennenlernen, Verlobung, Hochzeit) auf einem einzigen Poster festhalten**, damit ich ein hochwertiges Andenken für unser Zuhause habe.
- Als **Brautpaar** möchte ich **für jeden der drei Orte einen eigenen Kartenstil, Maskenform und Farbpalette wählen können**, damit das Poster meine Designvorstellung exakt trifft (auch wenn das gegen "alles unified" geht — Flexibilität ist mir wichtiger).
- Als **Brautpaar** möchte ich **die Slot-Labels in meiner Sprache erleben** ("Wo wir uns trafen" / "Where we met" / "Donde nos conocimos"), damit das Poster sich nicht wie eine Übersetzung anfühlt.

### Sekundär-Zielgruppe: Hochzeitsgast (Geschenk)
- Als **Hochzeitsgast** möchte ich **innerhalb von wenigen Minuten ein personalisiertes Hochzeitsgeschenk konfigurieren** ohne Designkenntnisse, damit ich kein generisches Geschenk mitbringen muss.
- Als **Hochzeitsgast** möchte ich **die drei Orte des Brautpaars eingeben können (auch wenn ich nicht alle Details kenne)**, damit ich einen Slot mit Platzhalter speichern und das Brautpaar später nach Details fragen kann.

### Sekundär-Zielgruppe: Long-Distance- oder Patchwork-Paar
- Als **Long-Distance-Paar** möchte ich **drei Orte frei wählen können** (z. B. "Mein Heimatort / Dein Heimatort / Unser gemeinsamer Ort"), damit der Editor auch für untypische Lebensgeschichten funktioniert.

### Discovery
- Als **suchender Google-Nutzer** möchte ich **bei der Suche "Hochzeitsgeschenk personalisierte Karte" auf einer dedizierten Landingpage in meiner Sprache landen**, damit ich sofort erkenne, dass dieses Tool für meinen Anlass passt.
- Als **wiederkehrender Besucher** möchte ich **die Hochzeitskategorie deutlich im Hauptnav oder auf der Homepage sehen**, damit ich sie ohne Suche wiederfinde.

## Acceptance Criteria

### Editor: Slots & State
- [ ] Editor unterstützt einen `mapSlots: MapState[]`-State, der 1 oder 3 Slots enthalten kann.
- [ ] Bei Start über `/{locale}/editor/?preset=wedding-triptychon` wird der Editor mit **genau 3 Slots** initialisiert.
- [ ] Bei Start ohne Preset (Single-Map-Standard) verhält sich der Editor exakt wie heute (`mapSlots.length === 1`, keine UI-Änderung sichtbar).
- [ ] Sidebar zeigt im Multi-Slot-Modus oben eine **Tab-Leiste** mit drei Tabs (Karte 1 / Karte 2 / Karte 3, lokalisiert).
- [ ] Aktiver Tab steuert, welcher Slot in der Sidebar (Suche, Stil, Maske, Palette, Label, Datum) bearbeitet wird.
- [ ] Wechsel zwischen Tabs ist verlustfrei (Eingaben in inaktiven Slots bleiben erhalten).

### Per-Slot-Konfiguration
- [ ] Jeder Slot hat **unabhängige** Konfiguration für: Ortssuche, Kartenstil, Farbpalette, Maskenform, Slot-Label, Slot-Datum.
- [ ] Das gewählte Layout-Format (A4/A3/A2 via PROJ-37) gilt **global** für das gesamte Poster (nicht pro Slot).
- [ ] Brand-Typographie (PROJ-23) gilt **global**.
- [ ] Globaler Footer enthält: Paar-Namen (zwei Textfelder oder ein kombiniertes Feld) + Haupt-Hochzeitsdatum (separates Feld, lokalisiertes Datumsformat).

### Layout-Patterns (über PROJ-21)
- [ ] Verfügbare Slot-Layouts: `horizontal-3` (drei Karten nebeneinander), `vertical-3` (untereinander).
- [ ] Layout-Wahl wird als Layout-Preset in PROJ-21 hinterlegt (kein eigener Editor-Picker, sondern Teil der bestehenden Layout-Logik).
- [ ] Bei A4/A3 Querformat ist `horizontal-3` Default; bei Hochformat ist `vertical-3` Default.

### Empty-Slot-Verhalten
- [ ] Ein Slot ohne Ort zeigt im Editor einen **Placeholder** (lokalisierter Text "Ort wählen") und einen visuellen Stub statt Karte.
- [ ] Export (PDF/PNG) ist blockiert, solange mindestens ein Slot leer ist; UI zeigt eine lokalisierte Warnung mit Hinweis auf den/die leeren Slot(s).
- [ ] Speichern eines Projekts mit leeren Slots ist erlaubt (Work-in-Progress).

### Speicherformat (PROJ-5)
- [ ] Neuer Projekttyp `wedding` neben den bestehenden Typen (`map`, `starmap`, `photo`).
- [ ] Wedding-Projekt-Schema enthält `slots: MapSlotState[]` (Array fester Länge 3), `coupleNames`, `weddingDate`, `slotLayout` (horizontal-3 / vertical-3), Locale, Format (A4/A3/A2).
- [ ] In der Projekt-Übersicht wird Wedding-Projekt mit eigenem Icon/Badge dargestellt (analog Stern-Karten und Foto-Poster).

### Discovery & Routing
- [ ] Anlass-Landingpage `/{locale}/hochzeit/` (DE), `/{locale}/wedding/` (EN), `/{locale}/boda/` (ES) etc. ist live, jeweils über PROJ-29 ausgespielt.
- [ ] Landingpage-CTA "Hochzeitsposter erstellen" führt nach `/{locale}/editor/?preset=wedding-triptychon`.
- [ ] Top-Nav enthält in allen Locales einen Eintrag "Hochzeit" / "Wedding" / "Boda" auf Top-Level (kein Dropdown im MVP).
- [ ] Homepage (PROJ-11) zeigt eine Feature-Card "Hochzeitsposter erstellen" neben den anderen Editor-Modi.
- [ ] Footer verlinkt die Hochzeits-Landingpage in allen Locales.
- [ ] Inspiration/Gallery (PROJ-30/39) hat einen Filter-Chip "Anlass: Hochzeit"; Hochzeits-Presets sind mit `occasion: wedding` getaggt.

### i18n (PROJ-20) — Pflicht in **allen** aktiven Locales
- [ ] **Alle** Editor-UI-Texte des Multi-Slot-Modus sind über PROJ-20 lokalisiert (Tab-Labels, Slot-Labels, Placeholders, Warnungen, Tooltips).
- [ ] Default-Title-Library pro Slot ist in jeder Locale gepflegt:
  - DE: "Wo wir uns trafen" · "Wo wir uns verlobten" · "Wo wir geheiratet haben"
  - EN: "Where we met" · "Where we got engaged" · "Where we married"
  - ES: "Donde nos conocimos" · "Donde nos comprometimos" · "Donde nos casamos"
  - Weitere aktive Locales analog
- [ ] User kann das Default-Label pro Slot überschreiben; eigener Text wird **nicht** automatisch übersetzt.
- [ ] Anlass-Landing-Slugs sind pro Locale lokalisiert (`/de/hochzeit/`, `/en/wedding/`, `/es/boda/`).
- [ ] Datums-Formatierung im Footer und pro Slot folgt Locale-Konvention (DE: `12.06.2026`, EN: `June 12, 2026`, ES: `12 de junio de 2026`).
- [ ] Storefront-Content (PROJ-24): mindestens ein Hochzeits-Beispielbild pro Locale auf der Landingpage (deutsche Standesämter für DE, span. Iglesias für ES, US-Chapels für EN-US — soweit jeweils Locale aktiv).

### Export (PROJ-3)
- [ ] PDF-Export rendert alle drei Slots korrekt im gewählten Layout in Druckqualität.
- [ ] PNG-Export liefert die gleiche Auflösung wie bestehende Single-Map-Exports pro Format (A4/A3/A2).
- [ ] Exportierte Datei enthält keine Editor-Tab-UI, nur das finale Poster.

### Mobile (PROJ-43 Tap-Sheet)
- [ ] Mobile Tap-Sheet zeigt im Multi-Slot-Modus oben einen kompakten Slot-Switcher (drei Punkte/Tabs).
- [ ] Wischen zwischen Slots ist möglich (analog horizontal-Swipe-Picker aus dem Mobile-Editor-Pattern).
- [ ] Editor-Performance auf Mobile: kein spürbarer Lag bei Slot-Wechsel (< 200 ms).

## Edge Cases

### Slot- und State-Edge-Cases
- **Was passiert, wenn der User mitten in der Bearbeitung das Layout-Format wechselt (A4 Querformat → A4 Hochformat)?** → Slot-Layout wechselt vom Default `horizontal-3` zum Default `vertical-3`; Slot-Inhalte bleiben erhalten, nur die räumliche Anordnung ändert sich.
- **Was passiert, wenn ein Single-Map-Projekt geöffnet wird und der User auf "Slot hinzufügen" klickt?** → Nicht möglich im MVP — Single-Map und Wedding sind getrennte Projekttypen. Der einzige Weg ins Wedding-Modell ist über die Hochzeits-Landing oder den `?preset=wedding-triptychon`-Einstieg.
- **Was passiert, wenn der User in einem Slot eine sehr lange Stadt eingibt (z. B. "Llanfairpwllgwyngyll")?** → Slot-Label-Feld kürzt mit Ellipse in der Sidebar-Vorschau; auf dem Poster bricht der Text um (max. 2 Zeilen, danach Ellipse).
- **Was passiert beim Browser-Reload mitten in der Konfiguration?** → Wie bei Single-Map: Auto-Save in LocalStorage; bei Reload werden alle drei Slots wiederhergestellt.

### Per-Slot-Style-Edge-Cases
- **Was, wenn die drei gewählten Stile/Paletten ästhetisch nicht harmonieren?** → User-Entscheidung, kein algorithmisches Eingreifen. Aber: die Hochzeits-Landingpage und die Default-Initialisierung zeigen eine **vorabgestimmte Style-Kombination** (z. B. alle drei Slots im gleichen Stil + Palette als Startpunkt), damit der "leere Editor" bereits gut aussieht und der User nur nachjustieren muss.
- **Was, wenn ein Slot eine Custom-Mask mit Decoration (PROJ-35) nutzt und ein anderer eine einfache Kreis-Maske?** → Beide werden gerendert wie angegeben; Decorations sind pro Slot konfigurierbar.

### Discovery-Edge-Cases
- **Was passiert, wenn die Anlass-Landingpage in einer Locale (z. B. NL) noch keinen lokalisierten Content hat?** → PROJ-29-Fallback-Strategie greift (vermutlich EN-Default); Multi-Map-Editor selbst ist trotzdem in der Locale verfügbar.
- **Wie verhält sich der Editor, wenn jemand die URL `/de/editor/?preset=wedding-triptychon` direkt teilt?** → Wie ein Deep-Link: 3 Slots initial leer, mit Default-Labels, Default-Layout. Kein Vor-Geo-Filling.

### Empty-Slot-/Validierungs-Edge-Cases
- **Was, wenn der User nur 1 von 3 Slots befüllt und auf Kaufen klickt?** → Export-Block greift; Modal/Toast lokalisiert: "Bitte fülle alle drei Karten-Slots, bevor du dein Poster bestellst" (DE) bzw. analog in anderen Locales.
- **Was, wenn der User die Default-Labels löscht?** → Slot zeigt im Editor weiterhin den Placeholder; auf dem Poster wird kein Label gerendert (= bewusste User-Entscheidung "kein Label").
- **Was, wenn der User leere Paar-Namen oder leeres Hochzeitsdatum hat?** → Footer-Felder sind nicht Pflicht für Export (rein dekorativ); leere Felder werden auf dem Poster weggelassen.

### Conversion-/Marketing-Edge-Cases
- **Was, wenn die saisonale Hochzeits-Hochphase (Mai–September) endet?** → PROJ-33 schaltet automatisch auf andere Anlässe; Hochzeits-Landing bleibt aber dauerhaft online (evergreen SEO).
- **Was, wenn ein Stadt-Hub (PROJ-42/44) eine sehr untypische Hochzeits-Location ist (z. B. Mönchengladbach)?** → Kein dedizierter Cross-Sell-Link; nur typische Hochzeits-Locations (Como, Mallorca, Sylt, Berlin-Standesamt etc.) bekommen den Cross-Sell-Module aktiviert. Liste wird im Admin verwaltet (PROJ-9/22-nah).

## Technical Requirements
- **Performance:** Slot-Wechsel < 200 ms wahrgenommen; initiales Laden des 3-Slot-Editors < 2 s auf Standard-Verbindung.
- **Mobile:** Funktioniert ab 375 px Viewport (Mobile-First-Doktrin); Tap-Sheet (PROJ-43) ist Standard auf Touch.
- **Browser-Support:** Identisch zum bestehenden Editor (Chrome, Firefox, Safari, Edge — aktuelle Versionen).
- **i18n-Vollständigkeit:** Kein hardcodierter String im Multi-Slot-Pfad; alle aktiven Locales bekommen Default-Titles, Slot-Labels und Validation-Messages gleichzeitig.
- **Speicher-Migration:** Bestehende Single-Map-Projekte bleiben unverändert (kein Schema-Upgrade); Wedding-Projekt-Schema ist additiv.
- **MapTiler-Quota:** 3 Karten pro Poster verdreifachen MapTiler-Calls pro Editor-Session — Caching/Throttling im Editor-State sicherstellen, damit Stil-Wechsel in einem Slot nicht alle drei neu lädt.

## Out of Scope (für Folge-Specs)
- **Muster E "Milestones Map"** — eine Karte mit 3–13 Pins. Anderes Konzept (Bounding-Box-Berechnung, Pin-Cluster), eigenes künftiges PROJ.
- **Muster F "Set of 3 separate Prints"** — physisches Triptychon (3 einzeln gerahmte Poster). Gehört zu PROJ-6 Stripe als Print-Bundle-Option.
- **Foil-Druck-Varianten** (Copper/Gold/Silver/Rosegold) — Print-Tier-Erweiterung in PROJ-12.
- **Custom Slot-Anzahl** (2, 4, 5+) — bewusst aus dem MVP entfernt (Entscheidung: fix 3 Slots ist klarer und Etsy-validiert).
- **Dynamisches Slot-Add/Remove im Editor** — widerspricht Low-Friction-Doktrin; verworfen.
- **Auto-Übersetzung von User-Custom-Labels** — nur Default-Library lokalisiert.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Leitidee

Hochzeitsposter ist der **vierte Poster-Typ** neben `map`, `star-map` und `photo`. Der bestehende Code hat dieses „Typ-pro-Editor"-Muster schon etabliert (siehe `PosterType` in `src/lib/poster-types.ts`, separate Zustand-Stores, separate Editor-Routen, separate Export-Hooks). Wedding fügt sich dort als vierter Eintrag ein. **Reuse** passiert auf Komponenten-Ebene (Karten-Vorschau, Ortssuche, Masken-Picker, Stil-Picker — alles slot-aware verwendet), **nicht** durch Aufweichen des Single-Map-Stores. Damit bleiben die anderen drei Editoren völlig unverändert.

### Architektur-Korrektur zum Spec

Das Spec nennt die URL `/de/editor/?preset=wedding-triptychon`. Die bestehende Codebase folgt aber dem Muster **eine Route pro Poster-Typ** (`/{locale}/map/`, `/{locale}/star-map/`, `/{locale}/photo/`). Konsequente Fortschreibung wäre `/{locale}/wedding/`. Empfehlung: dem Codebase-Muster folgen, **keinen Editor-Query-String erfinden**. Die lokalisierten Anlass-Landings (`/de/hochzeit/`, `/en/wedding/`, `/es/boda/`) bleiben wie geplant — sie linken auf `/{locale}/wedding/`.

### Komponenten-Struktur

```
/{locale}/wedding/ (neue Editor-Route)
+-- WeddingEditorShell  (neue Orchestrierungs-Komponente)
|   +-- Sidebar (Desktop) / Tap-Sheet (Mobile)
|   |   +-- SlotTabSwitcher  (NEU — drei Tabs „Karte 1 / 2 / 3" lokalisiert)
|   |   +-- Aktiver Slot zeigt eine slot-aware Variante von:
|   |       +-- LocationSearch       (bestehend, slot-aware)
|   |       +-- Map-Stil-Picker      (bestehend, slot-aware)
|   |       +-- Farbpalette-Picker   (bestehend, slot-aware)
|   |       +-- Masken-Picker        (bestehend, slot-aware)
|   |       +-- Slot-Label-Feld      (NEU — Default aus i18n-Catalog)
|   |       +-- Slot-Datum-Feld      (NEU)
|   |   +-- Globale Felder (unter den Tabs):
|   |       +-- Paar-Namen-Feld
|   |       +-- Hochzeitsdatum-Feld
|   |       +-- Print-Format-Picker (bestehend, global)
|   |       +-- Slot-Layout-Picker (NEU — horizontal-3 / vertical-3)
|   +-- WeddingCanvas  (NEU — rendert 3 Slot-Karten im gewählten Layout)
|       +-- 3 × MapPreview (bestehend, jeweils slot-aware)
|       +-- 3 × Slot-Label + Slot-Datum + Slot-Koordinaten (NEU)
|       +-- Globaler Footer (Paar-Namen + Hochzeitsdatum)
|   +-- ExportTab  (bestehend, mit Validierung „alle 3 Slots befüllt?")

/{locale}/hochzeit/  /  /{locale}/wedding/  /  /{locale}/boda/  (PROJ-29)
+-- OccasionHero (bestehend)
+-- 3 Style-Beispiele (Hochzeits-Presets aus PROJ-30/39)
+-- OccasionCta → führt nach /{locale}/wedding/
```

### Was tatsächlich neu gebaut wird

1. **`useWeddingEditorStore` (Zustand-Store)** — Analog zu `useStarMapStore` / `usePhotoEditorStore`. Hält das Slot-Array, globale Felder, aktiven Slot-Index.
2. **`WeddingEditorShell` + `WeddingCanvas`** — Orchestrierung, kein Karten-Code; delegiert pro Slot an bestehende Komponenten.
3. **`SlotTabSwitcher`** — nutzt das vorhandene shadcn `Tabs`-Primitiv (`src/components/ui/tabs.tsx`); keine eigene UI-Primitive.
4. **`useWeddingExport`** — Analog zu `useMapExport` / `useStarMapExport`. Rendert 3 Slot-Karten in eine PDF/PNG-Composition.
5. **`MobileWeddingLayout` + Mobile-Tap-Sheet-Varianten** — Analog zu `MobileStarMapLayout`. Slot-Switcher als Swipe-Picker.
6. **Editor-Route `/{locale}/wedding/page.tsx`** — Server-Component-Shell, lädt das Wedding-Editor-Bundle.
7. **Anlass-Landing-Routen `/{locale}/hochzeit/`, `/{locale}/wedding/`, `/{locale}/boda/`** — PROJ-29 erzeugt diese aus dem Occasions-Backend; nur Konfigurations-Aufwand, kein neuer Routing-Code.
8. **i18n-Strings** — Neue Catalog-Sektion `wedding.*` in `src/lib/i18n-catalog.ts` mit Tab-Labels, Default-Slot-Titles pro Locale, Validation-Warnungen.

### Was umgebaut, aber nicht neu geschrieben wird

- **Slot-aware Leaf-Components**: `LocationSearch`, `MapPreview`, Masken-Picker etc. greifen heute direkt auf `useEditorStore` zu. Sie bekommen einen optionalen Kontext-Wrapper, der sie auf eine beliebige „Slot-State-Quelle" mappt. Der bestehende Karten-Editor reicht weiterhin den `useEditorStore` durch; der Wedding-Editor reicht den jeweils aktiven Slot aus `useWeddingEditorStore` durch. Damit existieren die Komponenten genau einmal im Code.
- **`PosterType`-Enum** in `src/lib/poster-types.ts` wird um `'wedding'` erweitert. Existierende Mask-Applicability-Filter bekommen den vierten Typ automatisch.
- **`useProjectSync.ts`** bekommt einen vierten Branch für Wedding-Projekte (LS-Key + Config-Blob-Shape). Server-Schema bleibt unverändert (Projects-Tabelle speichert `config_json` als JSON-Blob — additiv).
- **Layout-Presets-Registry (PROJ-21)** bekommt zwei neue Einträge `wedding-horizontal-3` und `wedding-vertical-3`.
- **Masken-Admin (PROJ-38) / `applicable_poster_types`** — Hochzeit ist standardmäßig `applicable_poster_types: []` für bestehende Masken; Admin entscheidet, welche Masken in Hochzeits-Slots verfügbar sind.

### Was 100% unverändert bleibt

Karten-Stile (`map-layouts.ts`), Geocoding-API (`/api/geocode`), MapTiler-Calls, Farbpaletten, Decorations (PROJ-35), Aquarell-Texturen, Brand-Typo (PROJ-23), Print-Format-Logik (A4/A3/A2 via PROJ-37), TextBlock-Editor (PROJ-2), Stripe-Pipeline (PROJ-6), Bestellungs-Backend (PROJ-10/12), die bestehenden drei Editoren.

### Datenmodell (Wedding-Projekt)

**Ein Wedding-Projekt enthält:**

- **Drei Slots** (fixe Anzahl, immer 3):
  - Ort (Name + Koordinaten + Karten-Viewport)
  - Karten-Stil-ID
  - Farbpalette-ID
  - Masken-Schlüssel + Form-Konfiguration (Größe/Drehung)
  - Slot-Label (frei überschreibbar, Default aus i18n-Catalog)
  - Slot-Datum (optional, lokalisiert formatiert)
- **Globale Felder:**
  - Paar-Namen (ein Freitext-Feld, Default leer)
  - Hochzeitsdatum (optional, lokalisiert formatiert)
  - Slot-Layout (`horizontal-3` oder `vertical-3`)
  - Print-Format (A4 / A3 / A2)
  - Orientation (portrait / landscape)
  - Locale (für Default-Labels und Datumsformat)
  - Optional: TextBlocks für freie Zusatztexte

**Wo gespeichert:**
- **Lokal (Gast/Draft):** Browser-LocalStorage unter `poster-generator-draft-wedding` (analog zu den drei bestehenden LS-Keys in `useProjectSync.ts`).
- **Server (eingeloggt):** Bestehende `projects`-Tabelle, `poster_type='wedding'`, `config_json` enthält die obige Struktur. Keine neue Tabelle, kein neuer API-Endpunkt (`/api/projects` und `/api/projects/[id]` arbeiten typ-agnostisch).

### Routing-Übersicht

| Pfad | Zweck | Inhalt |
|---|---|---|
| `/{locale}/wedding/` | Editor | Wedding-Editor-Shell |
| `/{locale}/wedding/?project={id}` | Editor mit geladenem Projekt | Wedding-Editor-Shell, lädt Projekt von Server |
| `/de/hochzeit/`, `/en/wedding/`, `/es/boda/`, … | Anlass-Landing (PROJ-29) | OccasionLandingPage, CTA → `/{locale}/wedding/` |
| `/{locale}/gallery/?occasion=wedding` | Inspiration mit Hochzeits-Filter | Bestehende Gallery + neuer Filter-Chip |

Top-Nav-Eintrag „Hochzeit" / „Wedding" / „Boda" linkt **auf die Landing**, nicht direkt auf den Editor — bessere Conversion-Story (User sieht Beispiele bevor er konfiguriert) und sauberes SEO-Routing.

### Tech-Entscheidungen mit Begründung

1. **Eigener Zustand-Store statt Erweiterung von `useEditorStore`** — Verhindert Regressionen im bestehenden Karten-Editor. Single-Map-Code bleibt buchstäblich unverändert. Wartungs-Risiko: minimal.
2. **Slot-aware Leaf-Components via Kontext-Wrapper** — Alternative wäre Code-Duplikation (drei Sidebars je für eine Slot-Instanz). Der Kontext-Wrapper ist kleiner Aufwand und garantiert: jeder Bugfix in `LocationSearch` wirkt sofort überall.
3. **Fix 3 Slots ohne Toggle** — User-Entscheidung aus Requirements-Phase; vereinfacht State (kein dynamisches Array-Resizing), Layout-Algebra (kein „wo platziere ich 5 Slots?"), und Mobile-Tap-Sheet (drei Tabs sind eindeutig swipebar).
4. **Per-Slot-Stile statt unified** — User-Entscheidung; technisch teurer (3 unabhängige MapTiler-Style-Loads pro Editor-Session), wird durch Style-Caching im Store-Layer abgefedert. Risiko: MapTiler-Quota — Spec-Tech-Requirements deckt das ab.
5. **Eigener `wedding`-Projekttyp statt unified `mapSlots[]`-Schema** — User-Entscheidung; keine Migration nötig, Projekt-Übersicht zeigt klar getrennte Kategorien, Foto-/Star-Pattern wird konsequent fortgeschrieben.
6. **Editor-Route `/{locale}/wedding/` statt Query-Preset** — Bestehende Codebase-Konvention; cleaner Deep-Link, besseres SEO, einfacheres SSR-Caching.
7. **shadcn-`Tabs` für Slot-Switcher** — Pflicht laut `.claude/rules/frontend.md`; keine Custom-Tab-Implementierung.

### Dependencies (neu zu installieren)

**Keine.** Alle benötigten Bausteine existieren bereits: Zustand (Store), shadcn Tabs (Sidebar-Tab-Switcher), MapTiler-SDK (Karten), bestehende Export-Pipeline (PDF/PNG), i18n-Catalog (Strings), Tailwind (Styling), Supabase-Client (Projekt-Persistenz).

### Backend-Bedarf

**Minimal additiv.** Die `projects`-Tabelle akzeptiert bereits beliebige `poster_type`-Strings und beliebige `config_json`-Strukturen. Es gibt:
- Keine neue Datenbank-Tabelle.
- Keine neue API-Route.
- Keine Schema-Migration.
- Keine neue RLS-Policy.

Was es braucht: das `poster_type`-CHECK-Constraint (falls eines existiert) muss `'wedding'` zulassen. Falls strikt enum-typisiert in der DB, wäre das eine 1-Zeilen-Migration. Im Backend-Spec (PROJ-45-Phase) zu verifizieren.

### Risiken & Open Questions

- **MapTiler-Quota:** 3× Karten pro Editor-Session × Hochzeits-Volume kann Costs treiben. Mitigation: Slot-Style-Caching im Store, sodass Stil-Wechsel in Slot 1 nicht Slots 2/3 neu lädt.
- **Mobile-Performance:** Drei gleichzeitig gerenderte Karten auf Mobile könnten Memory-Probleme machen. Mitigation: Inaktive Slots als statisches Bild rendern und nur den aktiven Slot als Live-Karte halten — bekanntes Pattern aus PROJ-43 Tap-Sheet.
- **Default-Style-Harmonie:** Wedding-Editor initial mit drei _identischen_ Stil-/Palette-Kombis starten (= sieht out-of-the-box gut aus); User kann pro Slot abweichen. Sicherheitsnetz gegen den UX-Concern aus dem Edge-Case „Was, wenn die drei Stile nicht harmonieren?".
- **Bestehende Custom-Masken:** Per default `applicable_poster_types: []` für Wedding — Admin muss aktiv freigeben. Verhindert, dass nicht-passende Masken (z. B. Split-Masken aus dem Map-Editor) im Wedding-Editor erscheinen.



## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

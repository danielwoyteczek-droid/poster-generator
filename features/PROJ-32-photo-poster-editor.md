# PROJ-32: Foto-Poster-Editor

## Status: In Progress
**Created:** 2026-04-29
**Last Updated:** 2026-04-29

## Implementation Notes (Frontend Pass 1 — Vertical Slice Letter-Mask)

Erster Frontend-Pass deckt den **Letter-Mask-Modus end-to-end** ab. Single-Photo-Modus, Multi-Photo-Grid und Admin-`GridLayoutDesigner` sowie die Auswahl-/Preset-Galerie folgen in späteren Passes.

### Was gebaut wurde
- **Mask-Font Anton** via `next/font/google` (subsets: `latin`, `latin-ext` für ÄÖÜß), CSS-Variable `--font-mask-anton` global registriert ([src/app/layout.tsx](src/app/layout.tsx))
- **Domain-Lib** [src/lib/letter-mask.ts](src/lib/letter-mask.ts) — Charset-Validation (A–Z + ÄÖÜß), Length 3–10, Live-Sanitizer, Mask-Font-Definition mit Glyph-Proportionen für Layout-Engine
- **Zustand-Store** [src/hooks/usePhotoEditorStore.ts](src/hooks/usePhotoEditorStore.ts) — `layoutMode`, `word`, `slots[]` (pro Buchstabe Foto **oder** Slot-Farbe), `defaultSlotColor`, Crop-State pro Slot. Slot-Reslot-Logik: Bei Wort-Änderung bleiben Slots erhalten, deren Char an gleicher Position passt
- **LetterMaskOverlay** [src/components/photo-editor/LetterMaskOverlay.tsx](src/components/photo-editor/LetterMaskOverlay.tsx) — CSS `background-clip: text` pro Buchstabe (jeder Buchstabe hat eigenes Background-Image), Pan-Crop per Pointer-Drag, Auto-Resize per `ResizeObserver` für glyph-skalierende Font-Größe
- **PhotoPosterCanvas** [src/components/photo-editor/PhotoPosterCanvas.tsx](src/components/photo-editor/PhotoPosterCanvas.tsx) — re-uses `printFormat` aus `useEditorStore`, Mobile-Touch-Isolation pro Tab (PROJ-18-Pattern), eingebetteter `TextBlockOverlay` (REUSE PROJ-2)
- **Sidebar-Tabs** Word + Slots + Text:
  - [LetterMaskTab](src/components/photo-editor/sidebar/LetterMaskTab.tsx) — Wort-Input, Mask-Font-Vorschau (read-only), Default-Slot-Color-Picker
  - [PhotoSlotsTab](src/components/photo-editor/sidebar/PhotoSlotsTab.tsx) — pro Slot: Upload (REUSE `uploadPhoto` aus PROJ-19), Zoom-Slider, Color-Picker mit Reset-auf-Default
  - Text-Tab: REUSE bestehender `TextTab` / `MobileTextTab`
- **Editor-Shell** [PhotoEditorShell](src/components/photo-editor/PhotoEditorShell.tsx) → Desktop [PhotoEditorLayout](src/components/photo-editor/PhotoEditorLayout.tsx) + Mobile [MobilePhotoEditorLayout](src/components/photo-editor/mobile/MobilePhotoEditorLayout.tsx) (analog `EditorShell` / `StarMapEditorShell`)
- **Route** [src/app/[locale]/photo/page.tsx](src/app/[locale]/photo/page.tsx)
- **Top-Nav** [LandingNavClient.tsx](src/components/landing/LandingNavClient.tsx) — neuer `photoPoster`-Eintrag zwischen `starPoster` und `Anlässe`-Dropdown; User-Dropdown-Shortcut zu `/photo`; `isEditor`-Check erweitert
- **i18n** komplett für alle 5 Locales (de, en, es, it, fr): `nav.photoPoster`, `editorTabs.photoPageTitle`, `photoEditor.*` (32 Keys)

### Bewusst NICHT in diesem Pass
- **Single-Photo-Modus** — Render-Pfad in `PhotoPosterCanvas` zeigt Platzhalter („Modus … kommt in Folge-Pass")
- **Multi-Photo-Grid-Modus** — gleicher Platzhalter
- **Admin-`GridLayoutDesigner`**
- **Preset-Auswahl-Seite** — User landet direkt im Editor mit Default-Wort „PAPA"; Preset-Galerie (`poster_type='photo'`) folgt nach `/backend` (DB-Migration nötig)
- **`EditorToolbar`** auf `/photo` — `posterType: 'map' | 'star-map'`-Type muss zuerst in `/backend` um `'photo'` erweitert werden, dann Save/Preset/Reset-Buttons in einem Folge-Frontend-Pass
- **`PresetUrlApplier`** — wartet ebenfalls auf DB-Schema

### Technische Abweichungen vom Architecture-Doc
- **CSS `background-clip: text` statt SVG `<text>` mit `clipPath`** für den Editor-Renderer. Begründung: einfacher zu pflegen, gleiches visuelles Ergebnis, browser-nativ (mit `-webkit-`-Prefix). Der **Export-Pfad** in PROJ-3 wird weiterhin SVG/`opentype.js` verwenden müssen, da CSS `background-clip: text` in Canvas/PDF-Export nicht direkt unterstützt ist. Die Trennung Editor-Render vs. Export-Render ist im Tech-Design-J explizit so vorgesehen.
- **Slot-Layout**: pro Buchstabe ein Flex-Slot mit gleicher Breite. Anton-Glyphen passen sich per JS-berechneter `font-size` an. Umlaute werden durch das Container-Sizing automatisch in der Höhe abgefangen (kein hartes Reservieren wie im Tech-Design-E ursprünglich beschrieben — der `ResizeObserver`-getriebene Ansatz erweist sich als robust).

### Verifikation
- `npx tsc --noEmit` → grün
- `npm run build` → kompiliert; `/[locale]/photo` ist als dynamische Route registriert
- `npm run lint` → projektweit kaputt (Next 16 hat `next lint` entfernt) — nicht durch diesen Pass verursacht
- Browser-Test ausstehend: Dev-Server starten, `/de/photo` öffnen, Wort tippen, Foto pro Slot hochladen, Crop testen, Slot-Farbe wechseln, Mobile-Viewport prüfen

## Dependencies
- Requires: PROJ-19 (Foto-Integration im Poster) — liefert die Foto-Infrastruktur (Upload, HEIC-Konvertierung, Kompression, Supabase-Storage, Crop/Pan/Zoom, signed URLs, Auto-Cleanup nach Fulfillment)
- Requires: PROJ-2 (Textblock-Editor) — gleiche Text-Layer-Logik wie im Karten-Editor
- Requires: PROJ-3 (Poster-Export) — gleiche PNG/PDF-Export-Pipeline; wird um Letter-Mask-Rendering und Multi-Photo-Grid erweitert
- Requires: PROJ-5 (Projekt-Verwaltung) — Snapshot-Speichern/Laden von Foto-Postern
- Requires: PROJ-8 (Design-Presets) — wird um `poster_type: 'photo'` erweitert; Preset bestimmt Layout-Modus, Mask-Font, Standard-Slot-Farben
- Requires: PROJ-22 (Admin-Paletten-Verwaltung) — Slot-Farben für leere Letter-Mask-Slots stammen aus der globalen Palette
- Requires: PROJ-20 (i18n) — eigene Route `/[locale]/photo` muss in alle Sprachen integriert werden

## Problem & Ziel
Heute kann ein Kunde nur Karten-Poster (PROJ-1) oder Stern-Poster (PROJ-7) erstellen. Beide Editoren verwenden Karten-Daten als Hauptmotiv. Es gibt jedoch eine starke emotionale Kategorie, in der **Fotos das Hauptmotiv** sind — z. B. ein „PAPA"-Poster, in dem jeder Buchstabe ein Foto des Vaters mit dem Kind enthält, oder ein einzelnes großformatiges Foto mit einem persönlichen Spruch darunter. Dafür gibt es heute keinen Einstieg.

PROJ-32 ergänzt einen **dritten Editor-Typ** mit eigener Route `/[locale]/photo`, gleichberechtigt neben Karte und Stern. Das vom Kunden gewählte **Design-Preset bestimmt den Layout-Modus** (Letter-Mask / Single-Photo / Multi-Photo-Grid), die Mask-Schrift, das Text-Layout und die Slot-Farben. Der Kunde lädt seine Fotos hoch, schreibt seinen Text, exportiert oder bestellt das Poster.

PROJ-32 baut konsequent auf PROJ-19 auf: die komplette Foto-Upload-/Storage-/Crop-Infrastruktur ist dort definiert und wird hier wiederverwendet. PROJ-32 fügt nur den neuen Editor-Einstieg, die drei Foto-Layout-Modi und die Erweiterung des Preset-Systems hinzu.

## User Stories

### Customer
- Als Kunde will ich auf der Startseite/Top-Nav „Foto-Poster" als gleichberechtigten dritten Produkt-Typ neben Karte und Stern sehen, damit ich diese Option überhaupt entdecke.
- Als Kunde will ich ein Letter-Mask-Preset auswählen und dann mein eigenes Wort (z. B. „PAPA", „MAMA", „LIAM", „JÜRGEN") mit 3–10 Buchstaben eingeben können.
- Als Kunde will ich für jeden Buchstaben meines Letter-Mask-Worts ein eigenes Foto hochladen, damit jeder Buchstabe individuell aussieht.
- Als Kunde will ich pro Buchstaben das hochgeladene Foto verschieben/zoomen, damit der richtige Bildausschnitt im Buchstaben sichtbar ist.
- Als Kunde will ich ein Single-Photo-Preset auswählen und ein einzelnes Foto in einer Maske (Vollbild, Kreis, Herz, Quadrat …) plus persönlichen Text drumherum platzieren.
- Als Kunde will ich ein Multi-Photo-Grid-Preset (z. B. 2×2-Collage) auswählen und 4 Fotos in einer fertigen Anordnung darstellen.
- Als Kunde will ich für leere Letter-Mask-Slots eine **Slot-Farbe** wählen können, damit ich das Poster auch mit weniger Fotos schon „fertig" aussehen lassen kann (Mischlayout: einige Buchstaben Foto, andere in solider Farbe).
- Als Kunde will ich mein Foto-Poster speichern und später wieder öffnen können — alle Fotos, Crops und Texte unverändert.
- Als Kunde will ich mein Foto-Poster als hochauflösendes PNG/PDF exportieren und als physisches Poster bestellen können.

### Admin
- Als Admin will ich im Editor ein Foto-Poster konfigurieren und als Preset speichern (mit `poster_type: 'photo'`), genauso wie heute Karten- und Stern-Presets.
- Als Admin will ich pro Preset den **Layout-Modus** festlegen: Letter-Mask, Single-Photo oder Multi-Photo-Grid.
- Als Admin will ich pro Letter-Mask-Preset die **Mask-Schrift** fix wählen (z. B. eine fette Display-Schrift), damit der Customer im Editor keine Font-Auswahl hat und das Layout konsistent bleibt.
- Als Admin will ich Foto-Presets in der Preset-Galerie genauso filtern und veröffentlichen wie Karten-Presets.

## Acceptance Criteria

### Editor-Einstieg
- [ ] Neue Route `/[locale]/photo` (deutsche und alle weiteren konfigurierten Locales) parallel zu `/[locale]/map` und `/[locale]/star-map`
- [ ] Top-Nav-Eintrag „Foto-Poster" (lokalisiert) zwischen den bestehenden Editor-Einstiegen
- [ ] Landing/Auswahl-Seite zeigt nur Presets mit `poster_type: 'photo'` aus der Preset-Galerie
- [ ] Kein Karten-/Geocoder-/MapTiler-Code im Photo-Editor — Karten-Layer ist nicht geladen

### Letter-Mask-Modus
- [ ] Layout-Modus `letter-mask` rendert ein vom Customer eingegebenes Wort als Maske
- [ ] Eingabefeld für Wort: 3–10 Zeichen, Charset `A–Z + ÄÖÜß` (case-insensitive, intern Großbuchstaben)
- [ ] Validierung: Eingaben außerhalb des Charsets werden nicht akzeptiert (Live-Filterung beim Tippen + Hinweis bei ungültigen Eingaben)
- [ ] Mindestens **8 vorgehaltene Wortlängen-Layouts** für 3, 4, 5, 6, 7, 8, 9, 10 Buchstaben — Schriftgröße/Slot-Breite skaliert automatisch je nach Wortlänge auf das Poster-Format
- [ ] Mask-Font ist Teil der Preset-Konfiguration und wird nicht vom Customer geändert
- [ ] Pro Buchstabe ein eigener Foto-Slot mit:
  - Eigenem Upload-Flow (Reuse PROJ-19 `photo-upload.ts`)
  - Eigenem Crop-State (`{ x, y, scale }`) im Snapshot
  - Eigenem Empty-Slot-Status: solide Farbe (Default aus Palette, vom Customer überschreibbar)
- [ ] Color-Picker für leere Slots: nutzt die globale Palette (PROJ-22), Customer kann pro Slot oder global setzen
- [ ] Mischlayout (einige Slots Foto, andere Farbe) ist exportierbar — kein Zwang zu 100 % Foto-Befüllung

### Single-Photo-Modus
- [ ] Layout-Modus `single-photo` rendert genau eine Foto-Maske auf dem Poster
- [ ] Foto-Masken-Set wiederverwendet aus PROJ-19: `full`, `circle`, `heart`, `square`, `portrait`, `landscape`
- [ ] Preset legt fest, welche Maske verwendet wird; im Customer-Editor nicht änderbar (analog Karten-Maske bei Map-Presets)
- [ ] Text-Layer (PROJ-2) wie im Karten-Editor: vollständige Wiederverwendung der bestehenden Textblock-Logik

### Multi-Photo-Grid-Modus
- [ ] Layout-Modus `photo-grid` rendert 2–6 Foto-Slots in einer im Preset definierten Anordnung
- [ ] Mindestens drei Grid-Varianten im V1: `grid-2x2`, `grid-1x3`, `grid-2-stacked` (Admin kann später erweitern)
- [ ] Jeder Slot hat eigenen Crop-State, eigenes Foto, eigenes optionales Empty-Slot-Verhalten (Farbe aus Palette)

### Foto-Upload (Reuse PROJ-19)
- [ ] Upload-Flow, HEIC-Konvertierung, clientseitige Kompression, Supabase-Storage-Upload, signed URLs, Mindest-Megapixel-Validation für 300 DPI: alles aus PROJ-19 verwendet, nicht dupliziert
- [ ] Drei-Punkt-Validierung beim Upload: Format-Check, Größen-Check, Auflösungs-Check für 300 DPI bei Ziel-Postergröße — Warnung wenn Foto zu klein ist (z. B. „Dieses Foto ist nur für Drucke bis A5 geeignet")
- [ ] Multi-File-Upload für Letter-Mask: Customer kann auf Wunsch mehrere Fotos in einem Schritt zuweisen (oder einzeln pro Slot)

### Design-Preset-Erweiterung (PROJ-8)
- [ ] DB-Migration: `presets.poster_type` ENUM erweitert um `'photo'`
- [ ] `presets.config_json` für Foto-Posters enthält: `layoutMode`, `wordLength` (für Letter-Mask), `maskFont`, `mask` (für Single-Photo), `gridLayout` (für Multi-Photo), `defaultSlotColor`, `textBlocks`
- [ ] Admin-Editor `/private/admin/presets` filtert Presets nach `poster_type` (existiert bereits, neuer Filter-Wert)
- [ ] Public Preset-API liefert `photo`-Presets für die Photo-Editor-Auswahl-Seite

### Snapshot & Persistenz
- [ ] `snapshot.posterType` Feld erweitert um `'photo'`
- [ ] Snapshot enthält bei Foto-Postern: `layoutMode`, `word` (Letter-Mask), `slots: SlotState[]` mit pro Slot Foto-Referenz oder Slot-Farbe, `crop` pro gefülltem Slot
- [ ] Speichern/Laden, Cart-Snapshot, Bestellung-Snapshot funktionieren analog zu Map/Star-Map

### Export (PROJ-3)
- [ ] PNG- und PDF-Export rendert alle drei Layout-Modi vollständig
- [ ] Letter-Mask: Schrift wird als SVG-Path konvertiert und als Clip-Mask für die Foto-Slots verwendet (kein Font-Embed nötig)
- [ ] Foto-Slots im Export verwenden die volle hochgeladene Auflösung, nicht die komprimierte Editor-Vorschau
- [ ] Empty Slots im Export: solide Farbfüllung (gleich wie im Editor)
- [ ] Export-Performance vergleichbar mit bestehendem Karten-Export (< 10 s für A4 PNG)

### i18n & SEO
- [ ] Route `/[locale]/photo` für alle aktiven Locales registriert
- [ ] Seiten-Titel, Meta-Description, Top-Nav-Label lokalisiert
- [ ] OpenGraph-Image: Hero-Vorschau eines Foto-Posters

### Mobile (PROJ-18 Patterns)
- [ ] Editor läuft mobil unter `useIsMobileEditor`-Breakpoint (1024 px)
- [ ] Touch-Isolation pro Tab, Pinch-to-Zoom für Foto-Slot-Crop
- [ ] Letter-Mask Slot-Auswahl per Tap auf den Buchstaben (Slot-Tap → Foto-Picker oder Crop-Modus)

## Edge Cases
- Customer tippt im Letter-Mask-Modus nur 1–2 Buchstaben → Eingabefeld zeigt Fehler „Mindestens 3 Buchstaben"; Editor rendert noch nicht
- Customer tippt 11+ Buchstaben → Eingabe wird auf 10 abgeschnitten + Hinweis
- Customer tippt mitten im Editieren das Wort um (z. B. „PAPA" → „OPA"): bereits gemachte Crops zu Buchstaben, die nicht mehr existieren, werden verworfen; gemeinsame Buchstaben (z. B. „P" und „A") behalten ihren Foto-Zustand, sofern Position erhalten bleibt — sonst Reset
- Customer wechselt im Editor das Preset komplett (z. B. von Letter-Mask „PAPA" zu Single-Photo): bestätigender Modal, da Foto-Zuordnungen verloren gehen
- Foto-Upload schlägt für einen Slot fehl → Slot fällt auf Empty-Slot-Farbe zurück, Customer kann erneut hochladen
- Customer lädt 10 Fotos für 10 Letter-Mask-Slots auf Mobile hoch → max. 3 parallele Uploads, Queue mit Progress-Indikator
- HEIC-Foto auf Letter-Mask-Slot → Konvertierung wie in PROJ-19, danach Slot wird gefüllt
- Customer hat alle Slots leer und lädt nirgendwo Fotos hoch → Export ist erlaubt (alle Slots in Slot-Farbe), Hinweis im Editor: „Du hast noch keine Fotos hochgeladen — sicher, dass du fortfahren willst?"
- Foto zu niedrig aufgelöst für 300 DPI bei A3 → Warnung, aber kein harter Block; Customer kann auf eigenes Risiko fortfahren oder Format auf A5 reduzieren
- Customer öffnet ein altes gespeichertes Foto-Poster, bei dem das Original-Preset gelöscht wurde → Editor lädt den Snapshot weiter (Snapshot ist self-contained), aber „Preset wechseln" zeigt das gelöschte Preset nicht mehr an
- Customer-Account löschen → alle hochgeladenen Fotos werden über bestehenden Cleanup-Cron (PROJ-19) entfernt
- Letter-Mask-Wort enthält Umlaut auf erstem Zeichen (z. B. „ÖL" — wäre 2 Zeichen, also blockiert; aber „ÖMER" → 4 Zeichen ok): Umlaut-Punkte erhöhen die Buchstabenhöhe; Layout-Engine reserviert konstante Slot-Höhe um den Buchstabenkörper, damit Umlaute nicht aus dem Poster ragen

## Non-Goals
- **Kein Mehrwortmodus mit Leerzeichen** im V1 (z. B. „MIA & TOM"). Nur einzelne Wörter ohne Leerzeichen.
- **Keine Customer-seitige Mask-Font-Auswahl** — der Font ist Teil des Presets, fix vom Admin gewählt.
- **Keine Letter-Mask-Layouts unter 3 oder über 10 Buchstaben** im V1.
- **Keine Stock-Foto-Galerie** — Customer bringt eigene Fotos mit (gleich wie PROJ-19).
- **Keine KI-Bildbearbeitung** (Hintergrund-Entfernen, Auto-Crop auf Gesicht) — gleiches Non-Goal wie PROJ-19.
- **Kein Free-Form Layout** — Customer kann Foto-Slots nicht frei verschieben oder skalieren. Layout ist vom Preset bestimmt.
- **Keine Animation/GIF/Video-Slots** — nur Standbilder.
- **Keine Multi-Word-Layouts** (z. B. „MAMA & PAPA" als zwei Zeilen) im V1.

## Technische Anforderungen
- **Re-Use vor Neu-Bauen**: PROJ-19-Komponenten (`photo-upload.ts`, `PhotoMaskOverlay`, Crop-Hooks) sind authoritative; PROJ-32 importiert, dupliziert nicht
- **Neuer Editor-State-Slice**: `usePhotoEditorStore` analog zu Map-/Star-Map-Store, mit `layoutMode`, `word`, `slots[]`, `textBlocks[]`
- **Letter-Mask-Renderer**: SVG-basiert, nutzt `getBBox` für Slot-Berechnung pro Buchstabe; Schrift wird zur Render-Zeit als SVG-Path konvertiert (z. B. via `opentype.js` für Export, im Browser via `<text>` mit `clipPath`)
- **Color-Picker für Empty Slots**: nutzt `PaletteContext` aus PROJ-22
- **Multi-Photo-Grid-Renderer**: konfigurierbares CSS-Grid-Layout, Slot-Definition kommt aus `preset.config_json.gridLayout`
- **Performance**: Letter-Mask mit 10 Foto-Slots bei je 5 MP soll auf Desktop unter 100 ms re-rendern (Crop-Drag-Latenz)
- **Mobile**: Touch-Isolation, gleiche Patterns wie PROJ-18 / PROJ-27 (Mobile Star-Map Editor)
- **Tests**:
  - Unit: Letter-Mask-Wort-Validation, Slot-Layout-Berechnung pro Wortlänge
  - E2E: kompletter Flow Letter-Mask Preset → Wort eintippen → 4 Fotos hochladen → 1 Slot leer + Farbe → Export
  - Visual Regression: Letter-Mask-Layout für Wortlängen 3, 5, 7, 10

## Open Questions
- Konkretes Mask-Font-Set: Welche 1–3 Display-Fonts sind print-tauglich UND auf Lizenz frei für Web+Print? → Klärung in `/architecture` mit konkreten Font-Vorschlägen
- Multi-Photo-Grid V1-Set: 3 Layouts oder mehr? Welche genau? → Klärung in `/architecture` zusammen mit Admin-Wireframes
- Single-Photo-Modus: Soll der Customer im Editor zwischen den Foto-Masken (Vollbild/Kreis/Herz) wechseln können, oder ist die Maske auch dort fix Preset-bestimmt? → Klärung in `/architecture` (User-Story sagt fix, aber Karten-Editor erlaubt Mask-Wechsel — Konsistenz wäre evtl. besser)
- Slot-Farbe pro Slot vs. global pro Poster: vereinfacht V1 evtl. „eine Slot-Farbe für alle leeren Slots gemeinsam"; pro Slot kommt erst V2? → Klärung in `/architecture`

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Gesamtablauf

```
[Customer öffnet /[locale]/photo]
       ↓
[Auswahl-Seite zeigt nur Presets mit poster_type='photo']
       ↓
[Customer wählt Preset → PhotoEditorShell startet im Layout-Modus des Presets]
       ↓
   ┌───────────────┬─────────────────┬──────────────────┐
   │ letter-mask   │ single-photo    │ photo-grid       │
   │ Wort eintippen│ 1 Foto + Maske  │ N Slots (Admin)  │
   │ Slot-Crops    │ Crop + Mask-Pick│ Slot-Crops       │
   └───────────────┴─────────────────┴──────────────────┘
       ↓
[Text-Layer (Reuse PROJ-2) + Empty-Slot-Farben (Reuse Palette PROJ-22)]
       ↓
[Save → Snapshot in projects/cart/orders] [Export → PNG/PDF]
```

### B) Komponenten-Struktur (PM-readable)

```
Foto-Poster-Editor (NEU)
├── Top-Nav (LandingNav.tsx) — bekommt 3. Eintrag „Foto-Poster"
├── /[locale]/photo
│   ├── Auswahl-Seite (filter: poster_type='photo')
│   └── Editor
│       ├── PhotoEditorShell (NEU) — Geschwister von EditorShell + StarMapEditorShell
│       │   ├── PhotoPosterCanvas (NEU)
│       │   │   ├── LetterMaskOverlay (NEU)         ← Wort als Foto-Maske
│       │   │   ├── SinglePhotoOverlay (REUSE: bestehender PhotoOverlay)
│       │   │   ├── PhotoGridOverlay (NEU)          ← Admin-definierte Slot-Layouts
│       │   │   └── TextBlockOverlay (REUSE: PROJ-2)
│       │   └── Sidebar-Tabs
│       │       ├── LetterMaskTab (NEU) — Wort-Input, Mask-Font-Anzeige (read-only)
│       │       ├── PhotoSlotsTab (NEU) — Liste aller Slots, Upload pro Slot, Crop, Farbe
│       │       ├── MaskTab (REUSE für single-photo) — Foto-Maske wechseln
│       │       └── TextTab (REUSE)
│       └── EditorToolbar (REUSE) — Reset, Save-as-Preset (Admin), Preview, Export
│
└── Admin: /private/admin/presets
    ├── Preset-Liste filtert um „Foto-Poster"
    └── Preset-Editor (REUSE PhotoEditorShell als Editor-Mode)
        └── GridLayoutDesigner (NEU) — nur sichtbar bei layoutMode='photo-grid'
            (Admin platziert/verschiebt/skaliert Slots auf der Poster-Fläche)
```

**Komponenten-Inventur**

| Status | Komponente | Quelle |
|--------|-----------|--------|
| Reuse 1:1 | `photo-upload.ts`, Bucket `user-photos`, HEIC-Konvertierung, Kompression | PROJ-19 |
| Reuse 1:1 | `PhotoOverlay`, Crop-Pan-Zoom-Logik | PROJ-19 |
| Reuse 1:1 | `TextBlockOverlay`, Drag-Logik | PROJ-2 |
| Reuse 1:1 | `EditorToolbar`, `SaveAsPresetButton`, `PresetUrlApplier`, `LandingNav` | PROJ-9 / PROJ-8 |
| Reuse 1:1 | Palette-Context + Color-Picker | PROJ-22 |
| Reuse + Erweitern | `apply-preset.ts` (neuer Branch für `'photo'`), `poster-from-snapshot.ts` (neuer Render-Pfad) | PROJ-3 / PROJ-8 |
| Erweitern | `useEditorStore` — neue State-Felder für Foto-Poster-Modus | PROJ-1 |
| Erweitern | `presets.poster_type` ENUM um `'photo'` (DB-Migration) | PROJ-8 |
| **Neu** | `PhotoEditorShell`, `PhotoPosterCanvas`, `LetterMaskOverlay`, `PhotoGridOverlay` | PROJ-32 |
| **Neu** | `LetterMaskTab`, `PhotoSlotsTab`, `GridLayoutDesigner` (Admin) | PROJ-32 |
| **Neu** | `/[locale]/photo/page.tsx`, Top-Nav-Eintrag, Locale-Strings | PROJ-32 |

### C) Datenmodell (Plain Language)

#### Preset-Erweiterung (DB)
- `presets.poster_type` ENUM bekommt einen dritten Wert: `'photo'`
- `presets.config_json` für Foto-Posters enthält:
  - **Layout-Modus**: einer von „Letter-Mask" / „Single-Photo" / „Photo-Grid"
  - **Bei Letter-Mask**: Mask-Font-Key (fest gewählt), Standard-Slot-Farbe (Palette-Referenz), Layout-Hinweise (z. B. „Wort zentriert auf 70 % Posterbreite"), Text-Block-Vorlage (Position + Default-Text)
  - **Bei Single-Photo**: Standard-Maske (z. B. „Vollbild"), Text-Block-Vorlage, ob/welche Foto-Masken im Editor wechselbar sind
  - **Bei Photo-Grid**: Liste der Slot-Definitionen (jede mit Position, Größe, optionaler Form), Standard-Slot-Farbe, Text-Block-Vorlage

#### Snapshot-Erweiterung (laufzeitlich)
Pro Foto-Poster wird gespeichert:
- **Poster-Typ**: `'photo'`
- **Layout-Modus**: derselbe wie im Preset (Customer kann ihn nicht wechseln)
- **Bei Letter-Mask**: Wort (3–10 Buchstaben aus A–Z + ÄÖÜß), pro Buchstabe ein Slot mit (Foto-Referenz **oder** Slot-Farbe) + Crop-Werte
- **Bei Single-Photo**: aktiv gewählte Foto-Maske, Foto-Referenz, Crop-Werte
- **Bei Photo-Grid**: pro Preset-Slot ein Slot-Eintrag mit (Foto-Referenz **oder** Slot-Farbe) + Crop-Werte
- **Text-Layer**: identisch zu Map-Postern (Reuse PROJ-2)

#### Foto-Speicherung (existiert bereits in PROJ-19)
- Supabase Storage Bucket `user-photos`, privat, RLS-geschützt
- Pro hochgeladenem Foto: signed URL + Storage-Pfad → landet als Referenz im Snapshot

### D) Tech-Entscheidungen

| Entscheidung | Begründung |
|---|---|
| **Eigener `PhotoEditorShell` statt Erweiterung des Map-`EditorShell`** | Map und Star-Map sind heute schon getrennte Shells. Foto-Editor hat anderen Toolset (kein Geocoder, keine Karten-Layer-Logik) — ein eigener Shell hält die Komponenten klein und vermeidet `if (posterType === ...)`-Verzweigungen. Konsistent mit `StarMapEditorShell`. |
| **Layout-Modus ist Preset-Eigenschaft, im Editor nicht wechselbar** | Customer wählt das Layout durch Preset-Auswahl. Wechsel im Editor würde alle Foto-Slot-Zuordnungen invalidieren — Confusion-Risiko, geringer Mehrwert. Preset-Wechsel ist explizit über die Auswahl-Seite. |
| **Mask-Font fix: 1 Display-Schrift** (Empfehlung: Anton, OFL-Lizenz) | Anton ist sehr breit (viel Foto-Fläche pro Buchstabe), kostenlos kommerziell nutzbar (SIL OFL), bereits in Google Fonts → easy Web-Loading. Fixe Schrift verhindert Layout-Brüche. Erweiterung um weitere Fonts ist Spec-V2. |
| **Letter-Mask-Rendering: SVG `<text>` mit `clipPath`** | Browser-natives Feature, gleiches Markup im Editor und im Export. Kein Font-Embed im PDF nötig — wir konvertieren beim Export die Glyphen via `opentype.js` zu SVG-Pfaden. Render-Performance auf Mobile bestätigt durch existierende SVG-Mask-Pattern in PROJ-1. |
| **Single-Photo-Maske ist im Editor wechselbar** (User-Entscheidung) | Konsistent zum Karten-Editor (dort ist Maske auch wählbar). Re-Use des bestehenden `PhotoOverlay` aus PROJ-19. |
| **Photo-Grid-Layouts werden vom Admin als Presets definiert** (User-Entscheidung) | Statt fester V1-Grid-Liste bekommt der Admin im Preset-Editor einen `GridLayoutDesigner`: er platziert N rechteckige Slots auf der Poster-Fläche (Drag-Move, Drag-Corner-Resize), wählt pro Slot optional eine Form (Vollbild/Kreis/Herz/…). Maximale Flexibilität, kein Hardcoding. Aufwand: ein neuer Admin-Editor-Tab. |
| **Slot-Farbe pro Slot individuell** (User-Entscheidung) | Color-Picker pro Slot in der `PhotoSlotsTab`-Liste. Nutzt die globale Palette (PROJ-22). Default kommt aus Preset, Customer überschreibt pro Slot. |
| **Empty-Slot-Export ist erlaubt (Mischlayout)** | Customer kann Poster auch mit nur 2 von 5 Foto-Slots gefüllt exportieren. Spec-Story explizit. |
| **Wortvalidation client-seitig** | A–Z + ÄÖÜß, 3–10 Zeichen, Live-Filter beim Tippen. Keine Server-Roundtrip nötig — reine UX-Validierung. |
| **Re-Use vor Neu-Bauen** | PROJ-19's Foto-Infrastruktur ist authoritative. PROJ-32 importiert, dupliziert nicht. Vermeidet zwei Wahrheiten beim Storage-/Crop-Modell. |

### E) Letter-Mask-Layout-Engine (Funktionsweise, kein Code)

1. Customer tippt Wort (z. B. „PAPA").
2. Layout-Engine misst die Glyphen-Breiten in Mask-Font (Anton) und plant horizontalen Slot-Layout, der die verfügbare Posterbreite ausfüllt.
3. Pro Buchstabe entsteht ein Slot mit:
   - Glyph als Clip-Mask (ein Foto „guckt" durch den Buchstaben)
   - oder, wenn kein Foto: Glyph in solider Slot-Farbe gefüllt
4. Layout für 8 Wortlängen vorberechnet: 3, 4, 5, 6, 7, 8, 9, 10. Schriftgröße passt sich automatisch an, damit das Wort die Posterbreite konsistent ausfüllt.
5. Umlaute (Ä Ö Ü) erhöhen die Glyph-Höhe — die Layout-Engine reserviert konstante vertikale Slot-Höhe um den Buchstabenkörper, damit Umlaute nicht aus dem Poster-Rand ragen.

### F) Photo-Grid-Designer (Admin-UI, neu)

Im Preset-Editor sieht der Admin bei `layoutMode='photo-grid'`:
- Eine leere Posterfläche
- „Slot hinzufügen" → fügt einen rechteckigen Slot hinzu
- Slot-Drag verschiebt, Corner-Drag skaliert
- Slot-Form-Picker: Vollbild / Kreis / Herz / Quadrat / Portrait / Landscape
- Snap-to-Grid (z. B. 5-%-Schritte) für saubere Ausrichtung
- Speichern → Slot-Liste wandert in `preset.config_json`

Customer-Editor zeigt diese Slots dann nur zum Befüllen — nicht zum Verschieben.

### G) Foto-Auflösung & 300-DPI-Validation

- Beim Upload misst der Client Original-Bildgröße in Pixeln.
- Aus der Ziel-Druckgröße (z. B. A3 = 297×420 mm) und 300 DPI berechnet sich die Mindest-Pixel-Größe.
- **Letter-Mask**: jeder Slot ist ein Bruchteil der Posterbreite — die Mindest-Pixel-Anforderung pro Slot ist entsprechend kleiner. Beispiel: 4 Slots auf A3 ⇒ pro Slot ~1240 px Breite ausreichend.
- **Single-Photo / Vollbild**: braucht volle Posterauflösung (~3500 px lange Kante für A3).
- Warnung wird angezeigt, kein harter Block — Customer entscheidet auf eigenes Risiko.

### H) Export-Pipeline (Erweiterung von PROJ-3)

`poster-from-snapshot.ts` bekommt einen dritten Render-Pfad:
- Render-Reihenfolge: Hintergrund → Letter-Mask/Single-Photo/Photo-Grid → Text-Blöcke
- Letter-Mask im PDF: Mask-Font-Glyphen werden zu SVG-Pfaden konvertiert (`opentype.js`), als `clipPath` für die Foto-Bildelemente verwendet — kein Font-Embed nötig
- Photo-Grid: pro Slot Foto in voller Auflösung in den im Preset definierten Bereich gerendert, Crop-Werte angewandt
- Empty Slots: solide Farbfläche in Slot-Form
- PNG-Export via Canvas, PDF-Export via `pdf-lib` (beides existiert bereits)

### I) Migration & Rollout

| Schritt | Was | Risiko |
|---|---|---|
| 1 | DB-Migration: `presets.poster_type` ENUM um `'photo'` erweitern | Niedrig — additive Änderung |
| 2 | Neue Sidebar-Tabs + `PhotoEditorShell` schaffen, ohne Route freizuschalten | Kein Customer-Risiko (nicht erreichbar) |
| 3 | Mask-Font (Anton) in `next/font` einbinden | Niedrig — eigener Font-Bundle |
| 4 | Letter-Mask-Layout-Engine + `LetterMaskOverlay` | Mittel — neue Render-Logik |
| 5 | Single-Photo-Modus auf Reuse-Basis | Niedrig |
| 6 | `GridLayoutDesigner` im Admin-Preset-Editor | Mittel — neuer Admin-Editor-Tab |
| 7 | Photo-Grid-Customer-Renderer | Niedrig (Slot-Daten kommen vom Preset) |
| 8 | Export-Pipeline um Foto-Poster-Pfad erweitern | Mittel — kritisch für Druck-Output |
| 9 | Top-Nav-Entry + Locale-Strings + Auswahl-Seite | Niedrig |
| 10 | Admin pflegt erste 3–5 Foto-Presets, Soft-Launch | — |

### J) Dependencies (Pakete)

| Paket | Zweck | Status |
|---|---|---|
| `browser-image-compression` | Client-seitige Bild-Verkleinerung | bereits installiert (PROJ-19) |
| `heic2any` | iOS-HEIC zu JPEG | bereits installiert (PROJ-19) |
| `opentype.js` | Mask-Font-Glyphen zu SVG-Pfaden für PDF-Export | **NEU für PROJ-32** |
| `next/font` (Google) | Anton-Webfont laden | bereits in Use |

### K) Offene technische Fragen für die Implementierungsphase

- **Anton oder Bebas Neue final?** — Empfehlung Anton (etwas dichter, besseres Foto-Verhältnis), aber Designer-Review im `/frontend`-Schritt mit konkreter Vorschau auf 3, 5, 7, 10 Buchstaben.
- **Live-Preview-Performance bei 10 Slots auf Mobile** — wenn Drag-Crop ruckelt, evtl. Debounce + Off-Thread-Render.
- **Snapshot-Migration für bestehende Foto-Snapshots aus PROJ-19** — wenn PROJ-19 bereits gespeicherte Foto-Layer hat, müssen wir das Snapshot-Schema additiv erweitern, nicht brechen. Detailprüfung im `/backend`-Schritt.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

# PROJ-46: Typografie-Hochzeitsposter-Editor ("Liebespapier")

## Status: Architected (Paused — Wiedervorlage)
**Created:** 2026-05-12
**Last Updated:** 2026-05-12

## Implementation Notes
- **Chunk 1 Frontend-Skelett (2026-05-12, paused):** Editor-Route `/[locale]/typography`, `useTypographyEditorStore`, Foundation-Library (`ScriptText`, `RingsSymbol`, `Footer`, `SvgHero`), `ScriptWithRingsComposition` + `SvgHeroWithRingsComposition`, `TypographySidebar` mit allen Edit-Feldern, Mobile-Stacked-Layout, i18n-Keys in allen 5 Locales, PosterType-Enum erweitert. Code uncommitted im Working-Tree. Type-Check sauber.
- **Blocker zur Wiederaufnahme:** Visueller Hero-Look. Mein hand-gecodeter SVG-Pfad fürs "ja" reichte nicht — Approximation war zu grob. Drei mögliche Pfade vor Re-Start:
  1. **Echte Kalligraphie-Font** (Great Vibes / Allura / Dancing Script via next/font) — editierbar, näher am Etsy-Look als mein Path-Versuch, aber kein 1:1-Match zu den Mockups.
  2. **Fertiges SVG-Asset** — User liefert eine wedding-calligraphy-SVG-Datei (Etsy-Bundle, Figma, Designer). Pixelperfekt zum Original, externer Aufwand.
  3. **Produkt-Reframe** — vielleicht ist ein eigener Typografie-Editor doch nicht der richtige Weg. Alternativen: Bestehende Editoren um Photo-/Map-freien Modus erweitern, oder Pure-Typography-Listings ohne eigenen Editor.
- **Vor Wiederaufnahme** entscheiden, welcher der drei Pfade gegangen wird. Spec-Open-Questions (Sektion G, Q1/Q2 Architecture) bleiben gültig — die SVG-Render-Strategie wäre dann konkret zu klären.

## Summary
Eigene Poster-Kategorie für **reine Typografie-Hochzeitsposter** — keine Karten, keine Fotos. Customer wählt aus einer Galerie kuratierter Decoration-Templates (Script-Word, Layered Big-Type, Line-Art-Drawing, Heart-Stroke, Names-Only, Wreath, Monogramm, …), personalisiert Hero-Text + Paar-Namen + Datum + Palette + Font und exportiert das Poster. Discovery über eigene Top-Level-Kategorie ("Liebespapier" / "Love Letter" / "Papier d'Amour" / "Carta d'Amore" / "Carta de Amor") mit eigener Landing-Page pro Locale.

Strukturell ist jedes Poster zweiteilig: **Hero-Decoration** (70–80 % Fläche, einzige Variable) + **Footer** (Paar-Namen + optionales Datum, konstant). Etsy-Bestseller-Pattern als validierte Vorlage.

## Dependencies
- **Requires:** PROJ-3 (Poster-Export) — A4/A3/A2 PNG + PDF Export-Pipeline
- **Requires:** PROJ-5 (Projekt-Verwaltung) — neuer Projekttyp `typography` neben `map`, `starmap`, `photo`, `wedding`
- **Requires:** PROJ-20 (Internationalisierung) — alle UI-Texte, Datums-Formate und URL-Segmente pro Locale
- **Requires:** PROJ-23 (Design-System & Brand-Styling) — Brand-Fonts (Cormorant Garamond, Inter, optionale Script-Fonts wie Allura), Brand-Paletten
- **Requires:** PROJ-30 (Preset-Render-Pipeline) — Bulk-Renders für Inspiration-Cards + Mockup-Composites
- **Requires:** PROJ-37 (Format-Coupled Viewport) — A4/A3/A2 Logical-Canvas-Pattern
- **Requires:** PROJ-39 (Multi-Format Preset-Renders) — pro Template A4/A3/A2-Renders für Format-Switcher in der Galerie
- **Requires:** PROJ-43 (Mobile Tap-Sheet UX) — Customer-Editor auf Mobile
- **Touches:** PROJ-11 (Homepage) — neue Feature-Card "Liebespapier" im Hero
- **Touches:** PROJ-24 (Localized Storefront Content) — Beispiel-Bilder pro Locale
- **Touches:** PROJ-29 (Anlass-Landing-Pages) — Cross-Links auf "Hochzeit"-Landing
- **Touches:** PROJ-45 (Multi-Map-Hochzeitsposter) — Cross-Sell als Alternative ("Mit Karten / Ohne Karten")

## User Stories

### Primär-Zielgruppe: Hochzeitspaar (Self-Buy)
- Als **Brautpaar** möchte ich **ein elegantes Hochzeitsposter ohne Karten oder Fotos personalisieren können**, damit ich ein puristisches Andenken bekomme, das in jedes Interior passt.
- Als **Brautpaar** möchte ich **aus einer kuratierten Galerie typografischer Designs wählen können**, damit ich das Design finde, das zu unserer Hochzeits-Ästhetik passt (minimalistisch, klassisch-elegant, verspielt, etc.) ohne selbst designen zu müssen.
- Als **Brautpaar** möchte ich **das Hero-Wort ('ja', 'love', 'oui', 'I do', 'forever', …) frei wählen können**, damit das Poster zu unserer Sprache und unserem Style passt.
- Als **Brautpaar** möchte ich **die Palette aus mehreren kuratierten Hochzeits-Farbschemen wechseln können**, damit das Poster zu unserem Hochzeits-Farbthema oder unserem Zuhause passt.

### Sekundär-Zielgruppe: Hochzeitsgast (Geschenk)
- Als **Hochzeitsgast** möchte ich **innerhalb von 3–5 Minuten ein personalisiertes Hochzeitsgeschenk konfigurieren** ohne Designkenntnisse, damit ich kein generisches Geschenk mitbringen muss.
- Als **Hochzeitsgast** möchte ich **wenn ich kein exaktes Hochzeitsdatum kenne, das Datum weglassen können**, damit ich trotzdem ein hochwertiges Geschenk konfigurieren kann.

### Sekundär-Zielgruppe: Anniversary / Jahrestag
- Als **Paar mit Jahrestag** möchte ich **das Poster ohne festes Hochzeitsdatum oder mit Erstes-Date-Datum personalisieren können**, damit der Editor auch nicht-Hochzeits-Use-Cases unterstützt.

### Discovery
- Als **suchender Google-Nutzer** möchte ich **bei der Suche "Hochzeitsposter mit Namen", "Wedding Typography Print", "Personalisiertes Brautpaar-Geschenk" auf einer dedizierten Landing-Page in meiner Sprache landen**, damit ich sofort erkenne, dass dieses Tool für meinen Anlass passt.
- Als **wiederkehrender Besucher** möchte ich **die "Liebespapier"-Kategorie in der Hauptnavigation sehen**, damit ich sie ohne Suche wiederfinde.
- Als **Customer auf Inspiration-Seite (PROJ-30 Galerie)** möchte ich **Typografie-Templates direkt zu sehen kriegen**, damit ich auch ohne Karten-Wunsch eine Conversion-Option habe.

## Acceptance Criteria

### Editor: Template-Auswahl
- [ ] Customer-Flow startet auf `/[locale]/<typography-segment>/` Landing-Page (URL-Segment pro Locale, z. B. `liebespapier` / `love-letter` / `papier-amour` / `carta-amore` / `carta-amor`).
- [ ] Landing-Page zeigt eine **Galerie aller verfügbaren Decoration-Templates** mit Live-Preview-Renders (über PROJ-30-Pipeline).
- [ ] Customer klickt ein Template → Editor öffnet unter `/[locale]/typography/?template=<id>` (oder analoger URL-Struktur).
- [ ] Customer kann im Editor auch **das Template wechseln** ohne Verlust von eingegebenen Namen, Datum oder gewählter Palette.

### Editor: Decoration-Templates
- [ ] **Mindestens 15 Templates** zum MVP-Launch verfügbar, mit Abdeckung aller identifizierten Sub-Typen:
  - Script-Word + Flourish ("ja", "love", "oui", "forever")
  - Layered Big-Type (große Background-Zahl/Wort in Cream + Script-Overlay)
  - Line-Art-Drawing (Heart-Stroke, Continuous-Line-Symbol)
  - Heart-Stroke (einfaches Herz)
  - Names-Only (große Namen als Hero)
  - Wreath/Frame (botanischer Rahmen um Footer)
  - Monogramm (verschlungene Initialen)
- [ ] Jedes Template definiert ein `hasHeroText`-Flag:
  - `true` → Hero-Text-Editor-Feld wird angezeigt (Customer kann "ja" → "love" tippen)
  - `false` → Feld bleibt versteckt (z. B. Line-Art-Heart hat keinen Text)

### Editor: Personalisierung
- [ ] Customer kann **Hero-Text** editieren (wenn `hasHeroText: true`).
- [ ] Customer kann **Font-Familie** aus einer kuratierten Auswahl von 3–4 Brand-Fonts wechseln (z. B. Cormorant Italic, Allura Script, Playfair).
- [ ] Customer kann **Palette** aus 6 kuratierten Hochzeits-Paletten wechseln (Background + Tinten-Farbe):
  - Classic Cream / Soft Sand / Dusty Rose / Sage Mist / Petrol-Brand / Midnight (Invert)
- [ ] Customer kann **Paar-Namen** als zwei Felder oder kombiniertes Feld editieren.
- [ ] Customer kann **Datum** editieren oder leer lassen (Datum ist **optional**).
- [ ] Bei langen Namen (>30 Zeichen kombiniert) **skaliert die Font-Size automatisch nach unten**, damit das Layout visuell stabil bleibt.

### Editor: Format
- [ ] Customer kann zwischen **A4 (Default), A3, A2** wechseln.
- [ ] Editor-Canvas nutzt PROJ-37 Format-Coupled-Viewport (Logical-Pixel-Raum + visualScale).
- [ ] Format-Wechsel verändert die Dichte des Layouts (z. B. mehr Whitespace bei A2) konsistent zu den anderen Editoren.

### Save / Load (PROJ-5)
- [ ] Neuer Projekttyp `typography` neben `map`, `starmap`, `photo`, `wedding`.
- [ ] Typography-Projekt-Schema enthält: `templateId`, `heroText` (optional), `coupleNames`, `weddingDate` (optional), `paletteId`, `fontFamily`, `printFormat` (A4/A3/A2), `locale`.
- [ ] In der Projekt-Übersicht wird Typography-Projekt mit eigenem Icon/Badge dargestellt.

### Export (PROJ-3)
- [ ] Customer kann PNG-Export (300 dpi für jedes Format) und PDF-Export wie bei den anderen Editoren.
- [ ] Export rendert das Poster ohne weitere Customer-Interaktion (keine zusätzlichen Konfigurations-Dialoge).

### Render-Pipeline (PROJ-30 + PROJ-39)
- [ ] Jedes Template wird via PROJ-30-Pipeline gerendert: A4-, A3- und A2-Naked-Renders plus Mockup-Composites (Wohnzimmer-Rahmen).
- [ ] Inspiration-Cards in der Landing-Page-Galerie nutzen Mockup-Composites (analog Anlass-Seiten).
- [ ] Format-Switcher in der Galerie (PROJ-39) zeigt Template in A4/A3/A2.

### Discovery & Navigation
- [ ] Neue **Top-Level-Kategorie "Liebespapier"** (lokalisiert) in der Hauptnav (Desktop + Mobile).
- [ ] Eigene **Landing-Page pro Locale** unter `/[locale]/<typography-segment>/`:
  - Hero mit Brand-Statement
  - Galerie aller Templates mit Filter (z. B. nach Stil-Kategorie)
  - Internal-Links zu PROJ-29 Anlass-Seiten ("Hochzeit") und PROJ-45 Wedding-Editor (Cross-Sell)
  - Hreflang-Tags für SEO

### Internationalisierung (PROJ-20)
- [ ] Alle UI-Texte in `de`, `en`, `fr`, `it`, `es`.
- [ ] URL-Segment pro Locale (z. B. `/de/liebespapier/`, `/en/love-letter/`, `/fr/papier-amour/`, `/it/carta-amore/`, `/es/carta-amor/`).
- [ ] Locale-spezifische Default-Hero-Texte ("ja" für DE, "yes" für EN, "oui" für FR, "sì" für IT, "sí" für ES) wenn Customer ein neues Template ohne Override öffnet.
- [ ] Locale-spezifische Datums-Formatierung im Footer (DE: `12. August 2023`, EN: `August 12, 2023`, FR: `12 août 2023`, …).

### Mobile (PROJ-43)
- [ ] Editor ist mobile-first (375 px Viewport) entwickelt + verifiziert.
- [ ] Mobile-Layout nutzt Tap-Sheet-Pattern (Bottom-Sheet für Edit-Felder).
- [ ] Template-Galerie ist auf Mobile als horizontaler Snap-Scroll-Slider oder vertikale Card-Liste umgesetzt.

## Edge Cases

- **Sehr lange Namen** (z. B. "Maximiliane-Charlotte & Friedrich-Wilhelm"): Auto-Shrink der Footer-Font-Size — kein Layout-Bruch, keine manuelle Customer-Aktion nötig.
- **Sonderzeichen / Emoji in Namen** (z. B. "Anna ❤ Noel", "François & Pénélope"): müssen korrekt gerendert werden — Brand-Fonts müssen die nötigen Glyphen abdecken (Test pro Font + Locale).
- **Leerer Hero-Text bei Template mit `hasHeroText: true`**: Validation verhindert Export (Toast: "Bitte Hero-Wort eingeben") **ODER** das Template rendert ohne Hero (User-Test-Frage für Architecture).
- **Leeres Datum**: Footer rendert nur Namen, ohne Datums-Zeile — visuell konsistent, kein leerer Whitespace.
- **Customer wechselt Template mitten im Editor**: Behält Hero-Text, Names, Datum, Palette, Font, Format. Nur Layout-Decoration wechselt.
- **Customer wechselt zu Template mit `hasHeroText: false`** und hat Hero-Text eingegeben: Hero-Text wird im neuen Template versteckt (nicht verloren — falls Customer zurückwechselt, ist der Wert noch da).
- **Customer wechselt zu Template mit anderem Default-Hero-Text** (z. B. von "ja"-Template zu "love"-Template): Behält den Customer-eingegebenen Text statt zu überschreiben.
- **Customer wechselt Palette mitten im Editor**: Background-Tint und Tinten-Farbe wechseln gleichzeitig; Customer sieht Live-Preview im Editor-Canvas.
- **Customer ändert Font auf eine Variante, die nicht alle Glyphen unterstützt** (z. B. Allura Script ohne deutsche Umlaute): Editor zeigt Warnung **ODER** Font-Picker filtert nicht-kompatible Fonts pro Locale.
- **Format-Wechsel A4 → A2**: Layout skaliert konsistent (PROJ-37-Pattern), Hero-Decoration füllt mehr Whitespace bei größeren Formaten.
- **Sehr großer Hero-Text** (z. B. 50 Zeichen statt "ja"): Auto-Shrink wie bei langen Namen, oder Hard-Cap mit Validation.
- **Customer öffnet Editor ohne Template-Parameter** (`/[locale]/typography` ohne `?template=`): Editor zeigt Template-Picker als Modal oder redirected zur Landing-Page-Galerie.
- **Offline-Save**: Wie bei den anderen Editoren via LocalStorage (`poster-generator-draft-typography`), Auto-Save-Verhalten konsistent.

## Technical Requirements

- **Performance:** Editor-Initial-Render < 500 ms (nach Bundle-Load) für die schnellste Conversion.
- **Render-Worker-Bulk:** ~15–20 Templates × 3 Formate × 1 Mockup = 60–80 Render-Jobs initial → Worker-Run dauert <30 Min (vergleichbar mit PROJ-42 City-Renders).
- **Browser-Support:** Chrome, Firefox, Safari (Desktop + Mobile), iOS 16+, Android 12+.
- **SEO:** Landing-Page erreicht Lighthouse-SEO >90; Structured-Data (Product oder CollectionPage); hreflang für alle 5 Locales.
- **Bundle-Size:** Editor-Route maximal +50 KB gzipped gegenüber dem leichtesten existierenden Editor (Map-Editor).
- **Liability:** Marketing-Texte enthalten **keine** haftbaren Claims (kein FSC, kein "klimaneutral", keine konkreten Papiergrammaturen) — gemäß Memory-Regel.

## Open Questions for Architecture
_Klärungen, die in `/architecture` adressiert werden:_

1. **Template-Daten-Struktur:** Wo leben die Template-Definitionen? Code-File (z. B. `src/lib/typography-templates.ts`) wie bei `featured-styles.ts`? Oder Sanity-CMS für non-dev Editing?
2. **Hero-Decoration-Rendering:** SVG-Templates? Inline-React-Components pro Template? Beides? Welche Trade-offs für Customer-Live-Preview vs. Headless-Render-Konsistenz?
3. **Template-Mock-Set:** Welches Mockup-Set wird für die Composites genutzt? Eigenes für Typografie-Posters (z. B. minimalistischer Schwarzer-Rahmen) oder Wiederverwendung von "Wohnzimmer Holzrahmen"?
4. **Font-Loading-Strategie:** Brand-Fonts via next/font Subsetting pro Locale, oder Vollladung? Auto-Shrink-Algorithmus für Footer/Hero?
5. **Empty-Hero-Text-Validierung:** Validation-Block oder Silent-Skip?
6. **Glyph-Coverage pro Locale:** Filter Font-Picker oder Validation bei Wechsel?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Überblick
Das Produkt besteht aus drei Schichten:

1. **Discovery-Schicht** — eigene Landing-Page pro Locale mit Template-Galerie (analog PROJ-44 Stadt-Karten-Hub).
2. **Editor-Schicht** — Customer wählt Template aus Galerie → Editor öffnet → Customer personalisiert Hero-Text + Namen + Datum + Palette + Font + Format → Export.
3. **Render-Pipeline-Schicht** — Bulk-Worker erzeugt für jedes Template Vorschau-Renders (A4/A3/A2 + Mockup-Composite) für die Galerie-Cards (PROJ-30 + PROJ-39).

Templates sind **datengetrieben** (Sanity CMS) und visuell **komponiert aus einer Foundation-Bibliothek** (wiederverwendbare React-Bauteile). Dadurch sind neue Templates ohne Code-Deploy möglich, und der Wartungsaufwand pro Template bleibt linear klein.

---

### A) Component-Struktur

```
Landing-Page (/[locale]/<typography-segment>/)
├── Hero (Brand-Statement + Kategorie-Beschreibung)
├── Template-Galerie (Grid auf Desktop, Snap-Scroll auf Mobile)
│   └── Template-Card (× 15–20)
│       ├── Render-Preview-Bild (PROJ-30-Pipeline)
│       ├── Format-Switcher (A4/A3/A2, PROJ-39)
│       └── "Personalisieren"-Button → Editor
├── Cross-Sell-Block (PROJ-45 Wedding mit Karten, PROJ-29 Anlass-Seiten)
└── FAQ + SEO-Block

Editor (/[locale]/typography/?template=<id>)
├── Sidebar (Desktop) / Tap-Sheet (Mobile, PROJ-43)
│   ├── Template-Picker-Toggle ("Template wechseln" öffnet Galerie-Modal)
│   ├── Personalisierungs-Felder
│   │   ├── Hero-Text-Input (nur wenn Template.hasHeroText = true)
│   │   ├── Paar-Namen-Felder (2 Felder oder kombiniert)
│   │   ├── Datums-Picker (optional)
│   │   ├── Palette-Picker (6 kuratierte Hochzeits-Paletten)
│   │   ├── Font-Picker (3–4 Brand-Fonts)
│   │   └── Format-Picker (A4 / A3 / A2)
│   └── Aktionen (Export / Speichern / Reset)
└── Canvas
    └── Typography-Poster-Renderer
        ├── Hintergrund (Palette-BG)
        ├── Hero-Decoration (Composition aus Foundation-Components)
        └── Footer (Names + Datum, ggf. Auto-Shrink)
```

**Foundation-Komponenten-Bibliothek** (10–12 wiederverwendbare Bauteile, daraus werden alle Templates komponiert):

| Foundation | Wofür |
|---|---|
| `ScriptText` | Großer Script-Text mit optionalen Flourish-Linien ("ja", "love") |
| `BigBackgroundLetters` | Riesige Serif-Buchstaben/Zahlen als Hintergrund-Layer ("LOVE", "2025") |
| `LineArtDrawing` | SVG-Drawing-Container (Heart-Stroke, Wreath, Symbol) |
| `RingsSymbol` | Verschlungene Ringe als Mini-Ornament |
| `HeartSymbol` | Herz-Glyph in verschiedenen Größen |
| `MonogramInitials` | Verschlungene Initialen aus Customer-Namen abgeleitet |
| `Wreath` | Botanischer Rahmen / Kranz |
| `Names` | Paar-Namen-Block mit konfigurierbarer Typografie + Trennsymbol |
| `DateLine` | Datums-Zeile mit locale-spezifischer Formatierung |
| `Footer` | Container für Names + DateLine + optionalem Mini-Symbol |
| `LayeredStack` | Vertical-Stack-Container für Multi-Layer-Templates (Background + Foreground) |

---

### B) Daten-Modell

#### Sanity CMS — neues Schema `typographyTemplate`

Pro Template wird in Sanity ein Document gepflegt mit folgenden Feldern (plain-language):

| Feld | Was es bedeutet |
|---|---|
| **Template-Key** | Eindeutige technische ID (z. B. `script-ja-classic`, `layered-year-script`, `single-line-heart`). |
| **Anzeige-Label pro Locale** | Wie der Customer das Template in der Galerie sieht ("Ja" / "Yes" / "Oui" / "Sì" / "Sí"). |
| **Composition-Key** | Welche Foundation-Components in welcher Anordnung kombiniert werden (z. B. `script-overlay-on-bg-letters`). Wird im Frontend zu einem konkreten Render-Tree aufgelöst. |
| **Hat Hero-Text?** | Boolean — bestimmt ob der Hero-Text-Input im Editor angezeigt wird. |
| **Default-Hero-Text pro Locale** | Welcher Text vorausgefüllt ist ("ja" / "yes" / "oui" / "sì" / "sí"). |
| **Decoration-Params** | Composition-spezifische Parameter (z. B. welches Symbol, Pfad-Daten für Line-Art, Initial-Buchstaben-Anzahl, Background-Letter-Inhalt). |
| **Erlaubte Fonts** | Eingeschränkte Font-Auswahl pro Template, falls bestimmte Fonts nicht zum Design passen. |
| **Default-Palette** | Welche der 6 kuratierten Paletten initial gewählt wird. |
| **Empfohlenes Format** | A4 / A3 / A2 — Customer kann übersteuern. |
| **Sortier-Order** | Reihenfolge in der Galerie. |
| **Aktiv?** | Boolean — Templates können ohne Löschen deaktiviert werden. |
| **Marketing-Description pro Locale** | Optional: Tooltip-Text in Galerie. |

#### Customer-Editor-State (LocalStorage `poster-generator-draft-typography`)

| Feld | Was es bedeutet |
|---|---|
| `templateKey` | Welches Template gerade gewählt ist. |
| `heroText` | Customer-übersteuerter Hero-Text (kann leer sein). |
| `coupleNames` | `{ name1, name2 }` — die zwei Paar-Namen. |
| `weddingDate` | Datums-String (ISO) oder `null` falls weggelassen. |
| `paletteId` | Welche der 6 kuratierten Paletten gewählt ist. |
| `fontFamily` | Welche Brand-Font gewählt ist (aus 3–4 Optionen). |
| `printFormat` | A4 / A3 / A2. |
| `locale` | Locale, in der das Projekt erstellt wurde (für Datums-Format etc.). |

#### Datenbank (Supabase, via PROJ-5)

Neuer **Projekttyp** `typography` in der bestehenden `projects`-Tabelle. Snapshot-Schema spiegelt den Editor-State plus Metadaten (User-ID, Erstell-/Update-Zeit, Thumbnail-URL).

Render-Pipeline (PROJ-30) bekommt pro Template einen Eintrag in `presets` (bestehende Tabelle) — analog zu den existierenden Featured-Styles + Foto-Editor-Presets. Per-Format-Render-Status-Spalten (a4/a3/a2) sind durch PROJ-39 bereits da. Render-Worker bekommt eine neue Route, die für `posterType = 'typography'` den Typography-Editor-Headless-Render aufruft.

---

### C) Tech-Entscheidungen — WARUM

#### Sanity CMS für Templates (statt Code-Konstante)
Im MVP gehen wir mit 15–20 Templates an den Start. Erfahrungsgemäß werden danach 5–10 weitere pro Saison nötig (Etsy-Bestseller-Updates, neue Trends, Locale-spezifische Varianten). Wenn jedes Template ein Code-Deploy ist, blockiert das Marketing-Iterationen. **Sanity macht Templates für dich (oder einen Marketing-Mitarbeiter) ohne Entwickler editierbar.**

Trade-off: Mehr initialer Setup-Aufwand (Schema, GROQ-Queries, Daten-Migration), aber innerhalb von ~1 Tag erledigt. Langfristig spart Sanity ein Vielfaches an Deploy-Overhead.

#### Foundation-Components + Template-Variants (statt 15 individuelle Templates)
15–20 Templates "from scratch" zu bauen wäre 15–20× der Aufwand. Mit ~10 wiederverwendbaren Foundation-Components komponieren wir alle Templates aus Lego-Bauteilen. **Marginal-Kosten pro neuem Template: ~30 Min statt 2–3 Stunden.**

Trade-off: Initiale Foundation-Bibliothek braucht ~3 Tage Bauzeit. Lohnt sich ab dem ~5. Template.

#### Eigene Top-Level-Kategorie "Liebespapier" (statt Subkategorie unter Wedding)
SEO-Daten zeigen: "Hochzeitsposter ohne Karten", "Wedding Typography Print", "Personalisiertes Brautpaar-Geschenk" sind eigene Such-Cluster — überlappen nur partiell mit "Hochzeitsposter mit Karten". **Eine eigene Landing-Page hat Topic-Authority-Potenzial in einem unbesetzten Cluster** (PROJ-44 Pattern, bewährt für Stadt-Karten-Hub).

Trade-off: Mehr Nav-Komplexität, mehr Content-Aufwand fürs Marketing. Aber Conversion-Trichter und Discovery-Hebel sind stärker.

#### Eigener Projekttyp `typography` (statt Wiederverwendung von `photo` oder `wedding`)
Der Editor-State, das Schema und die Render-Logik unterscheiden sich substanziell von Map-/Foto-/Wedding-Editoren. Wiederverwendung würde zu Conditional-Logic-Spaghetti führen. **Eigener Projekttyp = saubere Trennung, kein Regression-Risiko für bestehende Editoren** (Memory: "Editor-Low-Friction-Doktrin").

Trade-off: Etwas Code-Duplikation (Save/Load-Hook, Headless-Bridge), aber jeweils klein (~100 Zeilen) und wartbarer als geteilte Komponenten mit `if posterType === ...`-Verzweigungen.

#### Auto-Shrink für lange Namen + Hero-Text (statt Hard-Cap)
Hochzeitsposter sind ein Geschenk-Produkt, jeder Validation-Error ist eine potenzielle Lost-Conversion. **Auto-Shrink ist die Customer-freundlichste Variante** und ist bereits in PROJ-37/45 als Pattern etabliert (Logical-Canvas + visualScale).

#### Datum optional (statt Pflicht)
Erlaubt zusätzliche Use-Cases (Jahrestag-Posters ohne fixes Datum, Anniversary-Geschenke), erhöht den Markt um ~15–20 % laut Etsy-Daten. Trade-off: minimal, da Footer einfach eine Zeile weniger rendert.

---

### D) Discovery- & URL-Strategie

| Locale | URL-Segment | Beispiel-URL |
|---|---|---|
| `de` | `liebespapier` | `/de/liebespapier/` |
| `en` | `love-letter` | `/en/love-letter/` |
| `fr` | `papier-amour` | `/fr/papier-amour/` |
| `it` | `carta-amore` | `/it/carta-amore/` |
| `es` | `carta-amor` | `/es/carta-amor/` |

**Editor-URL** ist locale-übergreifend identisch: `/[locale]/typography/?template=<key>`. URL-Segment-Switching erfolgt über das bestehende `translate-url`-API-Pattern (PROJ-42).

**Internal Linking:**
- Aus PROJ-29 Anlass-Seiten ("Hochzeit") → Cross-Link auf Liebespapier-Galerie
- Aus PROJ-45 Wedding-Editor-Landing → "Alternative ohne Karten?" → Liebespapier
- Aus PROJ-44 Stadt-Karten-Hub → Footer-Link
- Homepage (PROJ-11) → neue Feature-Card

---

### E) Render-Pipeline-Integration (PROJ-30 + PROJ-39)

Pro Template wird in der `presets`-Tabelle ein Eintrag angelegt (analog Featured-Styles). Render-Worker bekommt eine neue Branch für `posterType === 'typography'`:

1. Worker pollt `presets` mit `render_status = 'pending'`.
2. Für Typography-Presets: ruft `localhost:3000/[locale]/typography?headless=1&template=<key>` auf.
3. Headless-Render erzeugt A4/A3/A2 PNG (PROJ-39).
4. Naked-Render geht durch Dynamic Mockups für Wohnzimmer-Composite.
5. Composite kommt in `preset_renders`-Tabelle.

Worker-Run-Schätzung für MVP: **15 Templates × 3 Formate × 2 (Naked + Mockup) = 90 Render-Calls**, bei ~20s pro Call = ~30 Min Worker-Laufzeit.

---

### F) Dependencies

| Paket | Wofür | Bereits installiert? |
|---|---|---|
| Sanity CMS Client | Templates lesen (existierend, PROJ-13) | ✓ |
| Zustand | Editor-State-Store | ✓ |
| date-fns | Locale-spezifische Datums-Formatierung | ✓ |
| next-intl | Translations | ✓ |
| Playwright (Worker) | Headless-Render | ✓ |
| Dynamic Mockups Client | Composite-Generation | ✓ |

**Keine neuen npm-Pakete nötig** — alles baut auf existierendem Stack auf.

Einzige Asset-Frage: ob neue Brand-Fonts (z. B. Allura Script für Script-Heros) zugekauft werden müssen. **Empfehlung:** Erstmal mit Cormorant Italic + Inter (bereits via next/font geladen) starten, Allura nur wenn nach Customer-Test Bedarf besteht.

---

### G) Antworten auf Open Questions aus der Spec

| Spec-Frage | Entscheidung |
|---|---|
| Q1: Template-Storage | **Sanity CMS** (siehe oben). |
| Q2: Hero-Decoration-Rendering | **Foundation-Components + Template-Variants** (siehe oben). |
| Q3: Mockup-Set für Composites | **Wohnzimmer Holzrahmen** (bestehend) — minimalistisch genug für Typo-Designs. Falls Customer-Feedback einen schwarzeren Rahmen verlangt, später neues Mockup-Set hinzufügen. |
| Q4: Font-Loading + Auto-Shrink | Brand-Fonts via next/font Subsetting pro Locale (existierend). Auto-Shrink via Logical-Canvas-Pattern (PROJ-37) — visualScale plus ResizeObserver auf Footer-/Hero-Container, dynamische Font-Size-Anpassung wenn Container überläuft. |
| Q5: Empty-Hero-Text-Validierung | **Silent-Render** bei Live-Edit (Customer sieht leeres Hero), Validation **nur beim Export-Versuch** (Toast: "Bitte Hero-Wort eingeben"). Kein blockierender Editor-State. |
| Q6: Glyph-Coverage pro Locale | Font-Picker filtert pro Locale: jeder Brand-Font hat eine Liste unterstützter Locales (z. B. Allura Script nur für `en`/`fr` ohne deutsche Umlaute → ausgeblendet bei `de`). Fallback im Editor: Customer-eingegebener Hero-Text mit nicht-unterstütztem Glyph → Warnung mit Vorschlag, Font zu wechseln. |

---

### H) Empfohlene Build-Reihenfolge

Innerhalb von PROJ-46 in 4 Chunks:

1. **Chunk 1: Foundation-Library** (~3 Tage)
   - Sanity-Schema `typographyTemplate` + 1 Pilot-Template
   - 5–6 Foundation-Components (ScriptText, BigBackgroundLetters, LineArtDrawing, Names, DateLine, Footer)
   - Headless-Render-Bridge für `posterType = 'typography'`
   - 1 Test-Render via Worker-Pipeline

2. **Chunk 2: Editor + State** (~2 Tage)
   - `useTypographyEditorStore` (Zustand)
   - Editor-Route `/[locale]/typography/page.tsx`
   - Sidebar / Tap-Sheet UI (Hero-Text, Names, Datum, Palette, Font, Format)
   - LocalStorage-Persistence
   - Auto-Shrink-Logik via Logical-Canvas-Pattern

3. **Chunk 3: Landing-Page + Galerie** (~2 Tage)
   - Routen für 5 Locales (`/de/liebespapier/`, `/en/love-letter/`, …)
   - Galerie-Component mit Template-Cards + Format-Switcher (PROJ-39 wiederverwenden)
   - Mobile Snap-Scroll-Variante
   - Hreflang-Tags, SEO-Metadata, JSON-LD
   - Translate-URL-API-Erweiterung (PROJ-42-Pattern)

4. **Chunk 4: Template-Content + Render-Bulk** (~3 Tage)
   - Restliche 14–19 Templates in Sanity anlegen (1 Marketing-Mitarbeiter-Tag oder ~30 Min/Template selbst)
   - Bulk-Render-Worker-Run für alle Templates × A4/A3/A2
   - Cross-Sell-Links auf PROJ-29 + PROJ-45 + Homepage einbauen
   - Save/Load via PROJ-5 (neuer `typography`-Projekttyp)

**Gesamt: ~10 Tage Entwickler-Zeit + 1 Tag Marketing-Content.** Reihenfolge ist bewusst gewählt: Chunk 1+2 liefern eine funktionierende End-to-End-Demo (1 Template editierbar + renderbar) als Beweis, dass die Architektur trägt. Chunk 3+4 sind dann Skalierung.

---

### I) Risiken

| Risiko | Mitigation |
|---|---|
| Foundation-Library wird unterspezifiziert, einige Templates erfordern Sonderlocken | Pilot-Template in Chunk 1 möglichst komplex wählen (z. B. das "LOVE"-Layered-Design), damit Edge-Cases früh sichtbar werden. |
| Sanity-Schema muss später erweitert werden | Sanity-Migrations sind nicht-destruktiv, Daten-Migration ist günstig. |
| Render-Pipeline für Typography rendert nicht pixel-perfect (Font-Loading-Race) | Headless-Bridge wartet auf `document.fonts.ready` wie bei den anderen Editoren — Pattern bewährt. |
| 15–20 Templates sind zu viele zum MVP-Start (Choice-Paralysis) | Galerie-Filter ("nach Stil-Kategorie") und Sortier-Order in Sanity einstellbar. Fallback: erstes Roll-Out mit 6–8 Templates, Rest schrittweise nachschieben. |
| Brand-Font-Liste reicht nicht für alle Templates | Brand-Font-Audit vor Chunk 1; bei Bedarf 1–2 zusätzliche Script-Fonts zukaufen (Adobe Fonts / Google Fonts). |

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

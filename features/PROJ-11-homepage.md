# PROJ-11: Homepage (Landing Page)

## Status: Approved
- Reality-Check 2026-05-03: Acceptance Criteria im Code abgedeckt, Status auf Approved gehoben.

**Created:** 2026-04-19
**Last Updated:** 2026-05-03

## Dependencies
- Requires: PROJ-3 (Poster-Export) — Beispiel-Poster stammen aus dem Editor
- Requires: PROJ-4 (User Authentication) — Login-Button im Nav

## User Stories
- Als potenzieller Kunde möchte ich auf der Startseite sofort verstehen, was der Poster Generator ist und kann, damit ich entscheide ob ich ihn ausprobiere
- Als Besucher möchte ich fertige Beispiel-Poster sehen, damit ich mir das Ergebnis vorstellen kann
- Als Besucher möchte ich die Funktionen des Generators auf einen Blick sehen, damit ich weiß was ich bekomme
- Als Besucher möchte ich die Preise und Produkte sehen, bevor ich mich registriere, damit ich keine Überraschungen erlebe
- Als Besucher möchte ich mit einem Klick direkt in den Editor gelangen, ohne mich zuerst registrieren zu müssen
- Als eingeloggter Nutzer möchte ich im Nav-Header meinen Account-Status sehen (Avatar oder „Mein Konto")

## Acceptance Criteria
- [ ] Route `/` zeigt die Homepage (ersetzt den Next.js-Placeholder)
- [ ] Eigener Landing-Page-Header mit Logo, Anker-Links (Features, Beispiele, Preise) und Login/Signup-Button
- [ ] Hero-Sektion: prägnante Headline, kurze Subline, primärer CTA-Button „Poster erstellen" → `/map`; Hintergrundbild `public/hero-desktop.webp` (Desktop) und `public/hero-mobile.webp` (Mobile, Breakpoint ≤ 768px)
- [ ] Beispiel-Poster-Sektion: mindestens 3 Poster-Beispiele; aktuell als Platzhalter-Cards (grauer Hintergrund + Aspect Ratio); echte Bilder werden als `public/example-1.webp` etc. nachgeliefert (Zielgröße: 600 × 850 px, Hochformat 2:3)
- [ ] Feature-Sektion: mindestens 4 Features als Icon-Cards (z.B. Kartenauswahl, Texte, Formate, Export)
- [ ] Preis-Sektion: 3 Produktkarten (Digital Download, Poster, Bilderrahmen) mit Preisen je Format (A4/A3/50×70)
- [ ] Footer mit Impressum-Link (Platzhalter)
- [ ] Seite ist statisch gerendert (kein `'use client'` auf Root-Level) für SEO
- [ ] Meta-Title und Meta-Description gesetzt (`<head>`)
- [ ] Responsive: Mobile (375px), Tablet (768px), Desktop (1440px)
- [ ] Anker-Links im Header scrollen smooth zur jeweiligen Sektion

## Edge Cases
- Eingeloggter Nutzer sieht im Nav „Mein Konto" statt „Anmelden" → Header-Komponente muss auth-aware sein ohne SSR-Probleme (Hydration)
- Beispiel-Bilder fehlen (noch nicht geliefert) → Platzhalter-Cards mit Aspect Ratio, kein broken image
- Preis-Sektion muss konsistent zu ExportTab (PROJ-3) sein — bei Preisänderungen nur eine Stelle anpassen
- Mobile: Hamburger-Menü oder kollabierter Nav (Anker-Links im Dropdown)

## Technical Requirements
- Statisches Rendering: `export const dynamic = 'force-static'` oder Default (kein fetch/auth auf Seitenebene)
- SEO: `<title>`, `<meta name="description">`, Open Graph Tags
- Performance: Hero-Bilder mit `next/image` und `priority` (`/hero-desktop.webp`, `/hero-mobile.webp`)
- Preise als Konstante in einer zentralen Datei (nicht hartcodiert im JSX), damit sie einmal gepflegt werden

---

## Erweiterung: Beispielgalerie-Seite (2026-04-26)

### Ziel
Eigenständige Galerie-Seite (`/gallery`), die Beispiel-Designs nach Anlass gruppiert zeigt (z. B. Muttertag, Geburt, Hochzeit, Heimatstadt, Reise) und pro Karte ein **veröffentlichtes Preset** verlinkt — Klick öffnet den Editor mit vorgeladenem Design, sodass Kunden ohne weiteren Klick mit dem Anpassen starten können. Voll lokalisiert (DE, EN, FR, IT, ES) inklusive Locale-spezifischer Karten-Auswahl (über `target_locales` aus PROJ-24).

### Architektur-Entscheidung — Hybrid
- **Domain-Daten in Supabase**: Presets bekommen ein neues Feld `occasions text[]` (Anlass-Tags). Das `presets`-Schema bleibt die Single-Source-of-Truth für Karten-Inhalt, Konfiguration, Preview-Bild, Locale-Targeting.
- **Marketing-Content in Sanity**: Neuer Sanity-Schema-Typ `galleryPage` pro Locale, hält ausschließlich die **Galerie-Struktur** — welche Anlass-Sektionen in welcher Reihenfolge erscheinen, mit welchem Heading/Subline/optionalem Hero-Bild. Keine harten Preset-ID-Listen → keine Stale-Referenzen.
- **Verbindung über Tag-Wert**: Sanity-Kategorie hat ein `tag`-Feld (z. B. `muttertag`); Frontend lädt alle Presets mit `occasions @> [tag]` AND `target_locales @> [currentLocale]`.

### Dependencies (Erweiterung)
- Requires PROJ-8 (Design-Presets) — Galerie konsumiert die `presets`-Tabelle, baut auf der "Von Vorlage starten"-Logik im Editor auf.
- Requires PROJ-13 (Content CMS / Sanity) — `galleryPage`-Schema lebt im bestehenden Sanity-Setup.
- Requires PROJ-20 (i18n) — Locale-Auflösung via `useLocale()` / `getLocale()`, Page-Level-Strings in `src/locales/*.json`.
- Requires PROJ-24 (Localized Storefront Content) — `target_locales`-Filter ist Voraussetzung; Sanity-Locale-Pattern (`language`-Feld) wird übernommen.

### User Stories (Erweiterung)
- Als Besucher:in möchte ich eine Galerie-Seite öffnen und auf einen Blick sehen, welche Anlässe bedient werden (Muttertag, Geburt, Hochzeit, Stadtposter, Sternenkarte) und für jeden Anlass mehrere fertige Beispiele sehen.
- Als Besucher:in möchte ich auf eine Galerie-Karte klicken und sofort im Editor landen — mit dem gewählten Design vorgeladen — sodass ich nur noch Ort/Text anpassen und kaufen muss.
- Als französische:r Besucher:in möchte ich auf `/gallery` nur Beispiele mit französischen Texten und französischen Städten sehen, damit die Galerie sich für mich gemacht anfühlt (nutzt PROJ-24 `target_locales`).
- Als Marketing-Verantwortliche:r möchte ich in Sanity pro Locale festlegen, welche Anlass-Sektionen in welcher Reihenfolge erscheinen, mit welchem Heading, Subline und optionalem Hero-Bild — ohne Code-Deploy.
- Als Admin möchte ich beim Speichern/Bearbeiten eines Presets einen oder mehrere Anlass-Tags zuweisen (Multi-Select aus fester Liste), damit das Preset in den passenden Galerie-Sektionen erscheint.
- Als Admin möchte ich Presets ohne Anlass-Tag in der Liste erkennen können, damit ich nach Migration alle Bestands-Presets nachpflegen kann.

### Acceptance Criteria (Erweiterung)

**Datenmodell — `occasions` auf Presets**
- [ ] `presets`-Tabelle bekommt `occasions text[] NOT NULL DEFAULT '{}'`.
- [ ] CHECK-Constraint: jeder Eintrag ist ein gültiger Anlass-Code aus der zentralen Enum-Liste in `src/lib/occasions.ts` (Single-Source-of-Truth, von Admin und Sanity gleich konsumiert). Initiale Liste: `muttertag`, `geburt`, `hochzeit`, `heimat`, `reise`, `geschenk`, `jahrestag`, `weihnachten`. Erweiterbar via Code-Change + Migration.
- [ ] GIN-Index auf `occasions` für `@>`-Containment-Queries.
- [ ] Zod-Schema in der API validiert: Array, alle Werte gültige Codes, keine Duplikate.
- [ ] Bestehende Presets bekommen leeres Array (sind in der Galerie unsichtbar bis Admin sie taggt).

**API**
- [ ] `GET /api/presets` akzeptiert zusätzlich `?occasion=<code>` (kombinierbar mit bestehendem `?locale=...&poster_type=...`); Filter `occasions @> [code]`. Invalid Code → 400.
- [ ] `POST /api/admin/presets` und `PATCH /api/admin/presets/[id]` akzeptieren `occasions` als optionales Feld; Validierung gegen Enum-Liste.
- [ ] `GET /api/admin/presets` liefert `occasions` mit aus, optional `?occasion=...`-Filter für Admin-Liste.

**Admin-UX**
- [ ] Im Admin-Preset-Formular (`/private/admin/presets`) gibt es ein Multi-Select "Anlässe" mit der Enum-Liste aus `src/lib/occasions.ts`. Nicht Pflichtfeld (leeres Array zulässig — Preset kann ohne Galerie-Anzeige existieren).
- [ ] In der Admin-Preset-Liste wird pro Card eine Anlass-Badges-Zeile angezeigt (analog zu den Locale-Badges aus PROJ-24); Empty-State-Hinweis "Keine Anlässe — nicht in Galerie sichtbar" als sichtbarer Hint.
- [ ] Bulk-Action "Anlässe zuweisen" im Admin (analog zum `target_locales`-Bulk-Tool aus PROJ-24): Set / Add / Remove.

**Sanity — `galleryPage`-Schema**
- [ ] Neues Sanity-Schema `galleryPage` pro Locale (folgt dem `language`-Feld-Pattern wie `homepage`/`aboutPage` aus PROJ-24).
- [ ] Felder:
  - `language` (Pflicht, Locale-Code)
  - `pageHeadline` (Pflicht) — z. B. "Von uns gestaltete Beispiele"
  - `pageSubline` (optional)
  - `heroImage` (optional, Image mit Hotspot + Alt) — Hero-Bild oben auf der Galerie-Seite
  - `categories[]` (Array, mind. 1, max. 12) mit Sub-Feldern:
    - `tag` (Pflicht, String aus Enum-Liste — Studio-Auswahl-Liste mit denselben Codes wie `src/lib/occasions.ts`)
    - `label` (Pflicht) — Section-Heading wie "Geschenke zum Muttertag"
    - `subline` (optional)
    - `categoryImage` (optional, Image mit Hotspot + Alt) — Stimmungsbild für die Section
    - `displayOrder` ist implizit über die Array-Reihenfolge im Studio
- [ ] Studio-Structure-Eintrag "Galerie-Seite (pro Sprache)" listet alle `galleryPage`-Dokumente, gruppiert per Sprache.
- [ ] DE-Default-Doc ist Pflicht (Fallback-Quelle); andere Locales optional. Per-Field-Fallback wie bei `getHomepage` aus PROJ-24.

**Frontend — Route `/gallery`**
- [ ] Route `/gallery` rendert die Galerie-Seite (statisch / ISR mit 1h Revalidate, analog zu Homepage-Sanity-Sektionen).
- [ ] Async Server Component liest:
  1. Aktuelle Locale via `getLocale()`
  2. `galleryPage`-Doc via Sanity-Query mit Per-Field-Fallback auf DE
  3. Pro Kategorie: `GET /api/presets?locale=<x>&occasion=<tag>` (oder direkter Supabase-Aufruf serverseitig) → Liste der Presets
- [ ] Layout: Hero (optional) → pro Kategorie eine Section mit Heading/Subline/optional Stimmungsbild + Grid mit Preset-Cards.
- [ ] Preset-Card zeigt: `preview_image_url`, `name`, kleinen Badge mit `poster_type` ("Stadtposter" / "Sternenkarte", aus i18n).
- [ ] Klick auf Card → Deep-Link in Editor:
  - `poster_type === 'map'` → `/map?preset=<id>`
  - `poster_type === 'star-map'` → `/star-map?preset=<id>`
- [ ] Editor-Seiten lesen `?preset=<id>` aus der URL und laden das Preset einmalig in den Store (nutzt die existierende "Von Vorlage starten"-Logik aus PROJ-8). Nach Laden wird der Query-Param entfernt (`replaceState`), damit Refresh nicht erneut lädt.
- [ ] Empty-State pro Kategorie (keine Presets für aktuelle Locale + Tag): Section bleibt sichtbar, aber zeigt einen kompakten Hinweis "Bald verfügbar" oder die Kategorie wird ausgelassen — finale Auswahl in Architecture-Phase.
- [ ] Empty-State Gesamtgalerie (alle Kategorien leer für Locale): generischer Hinweis + CTA "Eigenes Poster gestalten" → `/map`.

**i18n**
- [ ] Page-Level-Strings (Page-Title-Fallback, Empty-State, Card-Badges "Stadtposter"/"Sternenkarte", "Bald verfügbar", "Eigenes Poster gestalten") in allen 5 Locale-JSONs (`src/locales/{de,en,fr,it,es}.json`) unter Namespace `gallery`.
- [ ] Anlass-**Section-Headings** kommen ausschließlich aus Sanity (`categories[].label`) — kein i18n-JSON-Eintrag dafür, weil pro Locale eigenes Sanity-Doc.
- [ ] Anlass-**Codes** (`muttertag`, `geburt`, ...) sind locale-neutrale interne Identifier, niemals UI-sichtbar.

**Navigation & SEO**
- [ ] Galerie-Link im `LandingNav` ergänzen (zwischen "Beispiele"-Anker und "Preise"-Anker oder als eigener Top-Level-Link — Designentscheidung in Implementierung).
- [ ] Footer-Link auf `/gallery` ergänzen.
- [ ] Page-Metadata (`<title>`, `<meta description>`, Open Graph): aus Sanity (`pageHeadline`/`pageSubline`) generiert; Fallback auf i18n-Strings, wenn Sanity-Doc fehlt.
- [ ] Optional V2 (nicht V1): Per-Anlass-Landingpages unter `/gallery/[occasion]` für SEO. **Nicht im Scope dieser Erweiterung.**

### Edge Cases (Erweiterung)
- **Sanity-Doc nennt einen Tag, der nicht (mehr) in der Enum existiert**: Kategorie wird im Frontend übersprungen + Console-Warnung im Build-Log; Studio sollte aber nur Auswahl aus der Enum erlauben (verhindert das Problem an der Quelle).
- **Preset hat einen Anlass-Tag, der nicht in einer Sanity-Kategorie verwendet wird**: Preset taucht nirgends in der Galerie auf (kein Fehler — gewollt, falls Marketing einen Anlass temporär aus der Galerie entfernt, ohne Presets umzutaggen).
- **Deep-Link `/map?preset=<id>` mit ungültiger ID**: Editor lädt nicht, ignoriert Param leise, zeigt Default-Editor-Zustand. Kein Error-Toast (URL-Manipulation darf nichts kaputtmachen).
- **Deep-Link `/map?preset=<id>` mit Preset, das `poster_type='star-map'` ist**: Editor lädt nicht (Mismatch), redirect auf `/star-map?preset=<id>` oder leise ignorieren — Architecture-Entscheidung.
- **User wechselt Locale während er auf `/gallery` ist**: Seite re-rendert mit neuer Locale, neue Sanity-Doc-Query, neue Preset-Listen. Bestehende Tabs/Scroll-Position dürfen verloren gehen (kein State-Erhalt nötig).
- **Galerie wird sehr lang (z. B. 8 Kategorien × je 12 Presets = 96 Cards)**: Lazy-Loading der Preset-Bilder via `next/image` + `loading="lazy"` für nicht-erste-zwei-Sektionen; Hero/erste Section mit `priority`.
- **Preset wird nach Galerie-Render gelöscht oder unpublished**: Galerie ist ISR-cached → bis zur nächsten Revalidation könnte die Card noch sichtbar sein. Klick auf Card → Editor lädt Preset nicht (siehe ungültige-ID-Edge-Case). Kein Hard-Failure.

### Technical Requirements (Erweiterung)
- Performance: Galerie-Page-TTFB < 500 ms bei 8 Kategorien + 50 Presets (ISR / static generation, Sanity-Query gecacht).
- Server-side Rendering: Galerie ist Server Component, kein `'use client'` auf Page-Level. Card-Hover-Effekte über CSS, kein Client-Hydration nötig.
- Accessibility: Sections haben `<h2>`-Headings, Cards sind native `<a>`-Links, Bilder haben Alt-Text aus Sanity (Fallback auf Preset-`name`).
- Backwards-Compatibility: `/map` und `/star-map` ignorieren `?preset=<id>` ohne Crash, falls die Lade-Logik aus PROJ-8 noch nicht deployed ist (defensive Implementierung).
- Single-Source-of-Truth für Anlass-Codes: `src/lib/occasions.ts` exportiert `OCCASION_CODES` (Array) + `OccasionCode`-Type. Admin-UI, Sanity-Studio-Validation, API-Zod-Schema und CHECK-Constraint-Migration nutzen exakt diese Liste.

### Non-Goals (Erweiterung)
- **Keine Per-Anlass-Landingpages** (`/gallery/muttertag` etc.) in V1 — nur eine zusammenhängende Galerie mit Anker-Sektionen.
- **Keine Sortier-/Filter-UI** für Besucher (z. B. "Nur Stadtposter zeigen") — Galerie ist statisch kuratiert via Sanity-Reihenfolge.
- **Keine personalisierten Empfehlungen** ("Andere kauften auch...").
- **Keine Sanity-Editor-Action zum Vorschauen einzelner Presets aus der Galerie heraus** — Marketing kuratiert über Tags, nicht über direkte Preset-Auswahl.
- **Keine Mehrfach-Presets-pro-Card** (Karussell innerhalb einer Card) — eine Card = ein Preset.

### Decisions (vor Architecture festgelegt)
- **Hybrid-Architektur** (Sanity = Struktur, Supabase = Daten). Begründung siehe oben.
- **Anlass-Codes als Enum** in `src/lib/occasions.ts`, nicht als freie Sanity-Strings. Begründung: verhindert Tippfehler-Lücken zwischen Sanity-Tag und Preset-Tag, einfache CHECK-Constraint, einfache Erweiterung via Code-PR.
- **Initiale Anlass-Liste**: `muttertag`, `geburt`, `hochzeit`, `heimat`, `reise`, `geschenk`, `jahrestag`, `weihnachten`. Architecture-Phase darf erweitern/anpassen.
- **Deep-Link-Pattern**: `?preset=<id>` als Query-Param (nicht Path-Segment), damit `/map`/`/star-map` als Routen unverändert bleiben.

### Open Questions
- **Hash-vs-Path-Routing für Anker**: Soll `/gallery#muttertag` direkt zur Sektion scrollen? → Vorschlag: ja, jede Section bekommt `id={tag}` für Deep-Linking.
- **Empty-Section-Behavior**: Section mit 0 Presets ausblenden oder mit "Bald verfügbar"-Hinweis sichtbar lassen? → Tendenz: ausblenden, wenn Marketing die Section bewusst gepflegt hat aber noch keine Presets vorhanden sind, ist Stille besser als ein Trostpreis.
- **Galerie-Eintrag im LandingNav**: eigener Top-Level-Link oder Dropdown unter "Beispiele"? → Designentscheidung in Implementierung.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect) — Beispielgalerie-Erweiterung

### A) Wichtige Vorab-Entdeckung: Deep-Link-Mechanik existiert bereits

Im Editor ist [src/components/editor/PresetUrlApplier.tsx](src/components/editor/PresetUrlApplier.tsx) bereits implementiert. Verhalten heute:

- Liest `?preset=<id>` aus der URL
- Lädt das Preset über `GET /api/presets/[id]`
- Wenn der `poster_type` nicht zur aktuellen Editor-Seite passt → automatischer Redirect auf den richtigen Editor (z. B. `/map?preset=<id>` → `/star-map?preset=<id>`), Locale-Präfix bleibt erhalten
- Wendet das Preset an, zeigt einen "Rückgängig"-Toast
- Entfernt den Query-Param nach Anwendung, damit ein Reload nicht nochmal triggert

**Konsequenz für die Galerie:** Sie muss nichts Eigenes für Deep-Linking bauen. Cards verlinken einfach auf `/map?preset=<id>` oder `/star-map?preset=<id>`. Selbst falsche Typ-Zuordnung wird transparent korrigiert. Das vereinfacht den Scope erheblich.

### B) Auflösung der Open Questions

| Frage | Entscheidung | Begründung |
|---|---|---|
| Anker-Routing | **Hash-Anker** (`/gallery#muttertag`); jede Section erhält `id={tag}` | Native Browser-Scroll, SEO-relevant für Section-spezifisches Sharing, kein zusätzliches Routing-Layer. |
| Empty-Section-Verhalten | **Section ausblenden**, wenn 0 Presets für aktuelle Locale gefunden | "Bald verfügbar" wirkt halbfertig. Marketing kann Sections in Sanity entfernen, sobald Anlass dauerhaft leer ist. Locale-bedingte Lücken (z. B. EN noch ohne Geburts-Presets) verschwinden lautlos statt zu enttäuschen. |
| Nav-Platzierung | **Eigener Top-Level-Link "Galerie"** in `LandingNav`, zwischen "Beispiele"-Anker und "Preise"-Anker | "Beispiele" auf der Homepage ist die Teaser-Sektion (2–4 Cards); "Galerie" ist die Vollausspielung. Klare Informationshierarchie. Dropdown lohnt sich erst, wenn weitere Unterseiten dazukommen. |

### C) Komponentenstruktur (Galerie-Seite)

```
/gallery (Server Component, ISR 1h)
+-- LandingNav (bestehend, mit neuem "Galerie"-Link)
+-- GalleryHero (optional, wenn Sanity heroImage liefert)
|   +-- Headline (aus Sanity pageHeadline)
|   +-- Subline (aus Sanity pageSubline, optional)
|   +-- Hero-Bild (aus Sanity heroImage, mit Fallback)
+-- GallerySectionList (eine Section pro Sanity-Kategorie, mit ≥1 Preset)
|   +-- GallerySection (id={tag} fuer Anker)
|   |   +-- Section-Heading (aus Sanity categories[].label)
|   |   +-- Section-Subline (aus Sanity categories[].subline, optional)
|   |   +-- Stimmungsbild (aus Sanity categories[].categoryImage, optional)
|   |   +-- Preset-Card-Grid
|   |       +-- PresetCard (mehrfach)
|   |           +-- preview_image_url (next/image)
|   |           +-- name (aus presets-Tabelle, schon locale-spezifisch)
|   |           +-- poster_type-Badge ("Stadtposter" / "Sternenkarte")
|   |           +-- Link auf /map?preset=<id> oder /star-map?preset=<id>
+-- GalleryEmptyFallback (wenn alle Sections leer fuer aktuelle Locale)
|   +-- generischer CTA "Eigenes Poster gestalten" -> /map
+-- LandingFooter (bestehend, mit neuem "Galerie"-Link)
```

### D) Datenmodell

**Erweiterung der `presets`-Tabelle (Supabase):**

| Feld | Typ | Zweck |
|---|---|---|
| `occasions` (NEU) | Array von Anlass-Codes | Welche Anlass-Sektionen dieses Preset bedient. Default leer = nicht in Galerie. |

- Default beim Insert: leeres Array → bestehende Presets verschwinden initial aus der Galerie und müssen vom Admin getaggt werden (bewusste Migration, gleicher Mechanismus wie `target_locales` aus PROJ-24).
- CHECK-Constraint: nur Codes aus zentraler Enum-Liste erlaubt.
- GIN-Index auf `occasions` für schnelle Containment-Filter.
- RLS bleibt unverändert (Schreibrechte nur Admin, Leserechte für `published`-Presets öffentlich).

**Single-Source-of-Truth für Anlass-Codes (Code-Datei):**

`src/lib/occasions.ts` exportiert die Enum-Liste. Konsumenten:
- Migration / CHECK-Constraint (statisch zur Migration-Zeit)
- API-Zod-Schema (Validierung bei Insert/Update)
- Admin-UI (Multi-Select-Optionen)
- Sanity-Studio (Tag-Dropdown im `galleryPage`-Schema, generiert aus derselben Liste)
- Frontend-Filter (kein direkter Konsum, aber Type-Sicherheit)

Initiale Liste: `muttertag`, `geburt`, `hochzeit`, `heimat`, `reise`, `geschenk`, `jahrestag`, `weihnachten`.

**Neues Sanity-Schema `galleryPage`:**

| Feld | Typ | Pflicht | Zweck |
|---|---|---|---|
| `language` | Locale-Code (Enum) | Ja | Welche Sprache dieses Dokument bedient — gleiches Pattern wie `homepage`/`aboutPage`/`blogPost`. |
| `pageHeadline` | String | Ja | Haupt-Headline der Seite, z. B. "Vorlagen für jeden Anlass". |
| `pageSubline` | String | Nein | Untertitel unter der Hero-Headline. |
| `heroImage` | Image (mit Hotspot + Alt) | Nein | Optionales Hero-Bild oben. |
| `categories[]` | Array (1–12) von Objekten | Ja | Anlass-Sektionen in Anzeige-Reihenfolge. |
| `categories[].tag` | String aus Enum-Liste (Studio-Dropdown) | Ja | Verbindung zu `presets.occasions`. |
| `categories[].label` | String | Ja | Section-Heading, z. B. "Geschenke zum Muttertag". |
| `categories[].subline` | String | Nein | Erklärtext unter dem Heading. |
| `categories[].categoryImage` | Image (mit Hotspot + Alt) | Nein | Stimmungsbild für die Section. |

Pro Locale ein eigenes Dokument. Default-Doc DE ist Pflicht; andere Locales optional. Per-Field-Fallback auf DE wie bei `getHomepage()` aus PROJ-24.

**Wo gespeichert:**
- Preset-Inhalte und `occasions`: **Supabase Postgres** (Domain-Daten)
- Galerie-Struktur (Headlines, Reihenfolge, Stimmungsbilder): **Sanity Content Lake** (Marketing-Content)

### E) API-Erweiterungen

| Endpoint | Änderung |
|---|---|
| `GET /api/presets` (public) | Neuer optionaler Query-Param `?occasion=<code>`; kombinierbar mit `?locale=...&poster_type=...`. Filter: `occasions @> [code]`. Invalid Code → 400. Kein Auth-Schutz nötig (nur published Presets). |
| `POST /api/admin/presets` (admin) | `occasions` als optionales Feld im Create-Schema, Zod-validiert. |
| `PATCH /api/admin/presets/[id]` (admin) | `occasions` als optionales Patch-Feld. |
| `GET /api/admin/presets` (admin) | `occasions` mit im Select; optionaler `?occasion=...`-Filter für Admin-Liste. |
| Bulk-Endpoint (existiert für `target_locales`) | Erweiterung um Modus für `occasions` (Set/Add/Remove); analog zum bestehenden Pattern aus PROJ-24. |

`GET /api/presets/[id]` bleibt unverändert — wird vom existierenden `PresetUrlApplier` schon korrekt konsumiert.

### F) Frontend-Daten-Fluss

**Galerie-Seite (`/gallery`)** als Server Component:

1. `getLocale()` aus `next-intl/server` ermittelt aktuelle Locale.
2. `getGalleryPage(locale)` (neue Sanity-Query, analog zu `getHomepage`) lädt das Locale-Dokument; bei fehlenden Feldern Per-Field-Fallback auf DE-Doc.
3. Für jede `categories[]`-Eintrag wird die Preset-Liste serverseitig gezogen (entweder via direktem Supabase-Aufruf oder via `fetch('/api/presets?...')` — Architecture-Vorgabe: **direkter Supabase-Aufruf** ist effizienter, vermeidet API-Hop, parallelisierbar mit `Promise.all()`).
4. Sections mit 0 Treffern werden gefiltert (Empty-Section-Verhalten).
5. Wenn 0 Sections übrig: Empty-Fallback rendern.
6. Sonst: Sections in Sanity-Reihenfolge rendern.

**Klick auf Card** ruft `/map?preset=<id>` oder `/star-map?preset=<id>` auf. Der bestehende `PresetUrlApplier` übernimmt den Rest.

**ISR / Caching:** `revalidate: 3600` (1h) auf Page-Level — analog zur Homepage. Marketing-Änderungen sind nicht zeitkritisch.

### G) Neue Komponenten / Dateien (Übersicht)

```
poster-generator
│
├── supabase/migrations/
│   └── add_occasions_to_presets   ← Spalte + CHECK + GIN-Index
│
├── src/lib/
│   └── occasions.ts               ← NEU: OCCASION_CODES + OccasionCode-Type + Zod-Schema
│
├── src/sanity/
│   ├── schemas/galleryPage.ts     ← NEU: Schema im homepage-Pattern
│   ├── schema.ts                  ← galleryPage zur Type-Liste
│   ├── structure.ts               ← Studio-Eintrag "Galerie-Seite (pro Sprache)"
│   └── queries.ts                 ← getGalleryPage(locale) mit Per-Field-Fallback
│
├── src/app/[locale]/gallery/      ← NEU: Galerie-Route
│   └── page.tsx                   ← Server Component, fetcht Sanity + Presets, rendert Sections
│
├── src/app/api/
│   ├── presets/route.ts           ← occasion-Filter ergänzen
│   ├── admin/presets/route.ts     ← occasions im Create-Schema
│   ├── admin/presets/[id]/route.ts ← occasions im Patch-Schema
│   └── admin/presets/bulk/route.ts ← Bulk-Modus für occasions
│
├── src/components/landing/
│   ├── GalleryHero.tsx            ← NEU: Hero der Galerie-Seite
│   ├── GallerySection.tsx         ← NEU: eine Anlass-Section
│   ├── GalleryPresetCard.tsx      ← NEU: einzelne Card mit Deep-Link
│   ├── LandingNav.tsx             ← "Galerie"-Link ergänzen
│   └── LandingFooter.tsx          ← "Galerie"-Link ergänzen
│
└── src/components/admin/
    └── AdminPresetsList.tsx       ← Anlass-Badges + Multi-Select + Bulk-Modus
```

### H) Tech-Entscheidungen mit Begründung

| Entscheidung | Begründung |
|---|---|
| **Anlass-Codes als zentrale Code-Enum** statt freier Sanity-Strings | Verhindert Tippfehler-Lücken zwischen Sanity-Tag und Preset-Tag. Studio-Dropdown wird aus derselben Liste generiert; CHECK-Constraint erzwingt Konsistenz. Erweiterung erfordert Code-PR + Migration — bewusste Reibung, weil Anlass-Liste UX-relevant ist. |
| **Direkter Supabase-Aufruf in der Page** statt `fetch('/api/presets')` | Vermeidet HTTP-Hop im Server, parallelisierbar mit `Promise.all` für mehrere Kategorien, niedrigere Latenz. Public-API bleibt für externe Konsumenten / Client-Komponenten. |
| **ISR mit 1h Revalidate** statt SSG mit Webhook | Marketing-Änderungen sind nicht sekundenkritisch. 1h-Window ist akzeptabler Lag für Presets-Updates. Wenn später nötig: On-Demand-Revalidation per Sanity-Webhook ist minimaler Add-on. |
| **Sections leer = ausblenden** statt "Bald verfügbar" | Stille wirkt natürlicher als Trostpreis. Marketing kann pro Locale steuern, was angezeigt wird, indem sie Kategorien in Sanity hinzufügen/entfernen. |
| **Hash-Anker für Sections** | Native Browser-Behavior, SEO-relevant für direktes Linken zu "/gallery#muttertag" aus Newsletter/Ads. Keine Client-State-Komplexität. |
| **Bestehender `PresetUrlApplier` wird wiederverwendet** | Cross-poster-type-Redirect ist schon gelöst, Toast-Pattern etabliert, Query-Param-Cleanup vorhanden. Galerie braucht keine eigene Anwende-Logik. |
| **Anlässe nicht mit `target_locales` zusammenführen** | Locale ist eine **Sichtbarkeits**-Achse (welche User darf das Preset sehen), Anlass ist eine **Inhalts**-Achse (worum geht's). Trennung erlaubt Kombination ohne Cross-Effects (z. B. ein Preset für `[de]` + `[muttertag, geburt]` ist unabhängig steuerbar). |
| **Galerie-Cards verlinken auf locale-prefixed Routen** | Routing nutzt next-intl wie der Rest der App; `LocaleLink`/`useRouter`-Pattern bleibt konsistent. |

### I) Migration & Rollout-Reihenfolge

```
Schritt 1: Datenmodell + API + zentrale Enum (Backend)
   +-- Migration: occasions TEXT[] auf presets + CHECK + GIN
   +-- src/lib/occasions.ts anlegen
   +-- API-Routen erweitern, Admin-Bulk-Endpoint anpassen
             |
             v
Schritt 2: Admin-UX (Backend / Admin-Frontend)
   +-- AdminPresetsList: Anlass-Badges + Multi-Select pro Card
   +-- Bulk-Bar: Modus "Anlässe Set/Add/Remove"
   +-- Admin migriert Bestands-Presets per Bulk-Tool
             |
             v
Schritt 3: Sanity-Schema (CMS)
   +-- galleryPage-Schema mit categories[]-Array
   +-- Studio-Structure-Eintrag
   +-- Marketing legt DE-Default-Doc an, optional weitere Locales
             |
             v
Schritt 4: Galerie-Seite (Frontend)
   +-- /gallery Route + Server Component
   +-- GalleryHero, GallerySection, GalleryPresetCard
   +-- LandingNav + LandingFooter um Link erweitern
             |
             v
Schritt 5: Verifikation + i18n-Strings
   +-- Page-Level-Strings in 5 Locale-JSONs
   +-- Smoke-Test pro Locale
   +-- SEO-Metadata-Check
```

**Reihenfolge-Hinweis:** Schritt 4 darf erst deployed werden, wenn Schritt 3 abgeschlossen ist UND mindestens das DE-`galleryPage`-Doc gepflegt wurde. Andernfalls leere Galerie. Schritt 2 kann unsichtbar parallel zu Schritt 1 deployen — bis ein Preset getaggt wird, ändert sich für Endnutzer nichts.

### J) Abhängige Packages

**Keine neuen Dependencies.** Wiederverwendet:
- `@supabase/supabase-js` — DB-Zugriff für Preset-Listen
- `next-sanity`, `@sanity/image-url` — Sanity-Integration
- `next-intl` — Locale-Auflösung (`getLocale`)
- `zod` — Validierung der Anlass-Codes
- `next/image` — optimierte Card-Bilder
- `sonner` (über `PresetUrlApplier` indirekt) — Toast bei Preset-Anwendung

### K) Risiken / offene Punkte

- **Sanity-Studio-Validation für `tag`-Feld:** Studio kann eine `list`-Option mit allen Codes haben, aber wenn ein Code aus `src/lib/occasions.ts` entfernt wird, bleibt er evtl. im Studio-Dokument stehen. Mitigation: Frontend filtert Sections mit unbekanntem Tag stillschweigend (siehe Edge Case in Spec) + Console-Warnung im Build.
- **Preset-Volume:** Bei vielen Kategorien × vielen Presets könnte die Server-Side-Query teuer werden. Mitigation: ISR + Limit pro Kategorie (z. B. max 12 Cards pro Section, weitere via "Mehr anzeigen"-Link in V2).
- **Preview-Bilder-Bandbreite:** 8 Sektionen × 12 Cards = 96 next/image-Calls. Mitigation: `loading="lazy"` außer für die erste Section, `sizes`-Attribut korrekt gesetzt.
- **Marketing-Onboarding:** Galerie-Seite rendert leer, bis Marketing das erste `galleryPage`-Doc pflegt. Mitigation: Phase 4 deploybar erst nach Phase-3-Setup; alternativ Static-Default-Section "Stadtposter" als ultimativer Fallback (muss aber nicht in V1).
- **Star-Map-Presets ohne Anlass:** Aktuelle Star-Map-Presets sind oft "Wir zwei unter den Sternen"-artig, passen vielleicht nicht in einen Anlass. Mitigation: Anlass-Liste erweiterbar — Architecture-Phase darf z. B. `nacht`/`liebe`/`erinnerung` ergänzen, falls die initiale Liste zu Heimat-Stadt-zentriert wirkt.

## Implementation Notes — Beispielgalerie-Erweiterung

### Schritt 1 — Backend (Datenmodell, Lib, API, Sanity-Schema) (✅ 2026-04-26)

**Migration `add_occasions_to_presets`** (über Supabase MCP angewandt, Version `20260426...`):
- Spalte `occasions text[] NOT NULL DEFAULT '{}'` auf `public.presets`
- CHECK-Constraint `presets_occasions_valid`: Werte müssen Subset von `['muttertag','geburt','hochzeit','heimat','reise','geschenk','jahrestag','weihnachten']` sein
- GIN-Index `presets_occasions_idx` für `@>`-Containment-Filter
- Bestehende Presets bekommen automatisch `occasions = []` (= unsichtbar in Galerie, bewusste Migration durch Admin nötig — derselbe Mechanismus wie `target_locales` aus PROJ-24)

**Single-Source-of-Truth** ([src/lib/occasions.ts](src/lib/occasions.ts)):
- `OCCASION_CODES` (readonly Tuple) + `OccasionCode`-Type
- `OccasionSchema` (Zod-Enum), `OccasionsSchema` (Array mit Duplikat-Check), `OccasionsNonEmptySchema` (für UI-Pflichtfeld)
- `occasionLabels`: Anzeigenamen pro Locale für Admin-UI (Sanity-Kategorie-Labels kommen aus dem CMS, nicht aus dieser Map)
- Erweiterung der Anlass-Liste erfordert: Code-PR + Sanity-Schema-Update + Migration mit DROP+ADD CONSTRAINT

**API-Erweiterungen:**
- `GET /api/presets` (public): neuer optionaler `?occasion=<code>` Query-Param, kombinierbar mit `?locale=` und `?poster_type=`. Filter via `occasions @> [code]`. Invalid Code → 400. Detail-Route `GET /api/presets/[id]` liefert jetzt zusätzlich `occasions` und `target_locales` mit aus.
- `GET /api/admin/presets` (admin): `occasions` im Select + optionaler `?occasion=`-Filter.
- `POST /api/admin/presets` (admin): `occasions` als optionales Feld in `CreatePresetSchema`.
- `PATCH /api/admin/presets/[id]` (admin): `occasions` als optionales Feld in `PatchSchema`.
- `POST /api/admin/presets/bulk` (admin): erweitertes Body-Schema akzeptiert nun **entweder** `locales` **oder** `occasions` (mutually-exclusive via `.refine`). Backward-compatible mit dem PROJ-24-Admin-UI, das nur `locales` kennt. Handler dispatcht generisch auf `target_locales`/`occasions`-Spalte. Hard-Limit 200 IDs/Call bleibt.

**Sanity** ([src/sanity/schemas/galleryPage.ts](src/sanity/schemas/galleryPage.ts)):
- Neues Schema `galleryPage` folgt dem `language`-Feld-Pattern von `homepage`/`aboutPage`/`blogPost`/`faqItem`/`legalPage`
- Felder: `language` (Pflicht), `pageHeadline` (Pflicht), `pageSubline`, `heroImage` (Hotspot+Alt), `categories[]` (1-12 Objekte mit `tag`/`label`/`subline`/`categoryImage`)
- `categories[].tag` ist Studio-Dropdown mit denselben Codes wie `OCCASION_CODES`. **Wichtig:** Sanity-Schema kann nicht aus `@/lib/occasions` importieren (Studio läuft in eigenem Build-Kontext), daher hardcoded Liste mit Hinweis-Kommentar zur Synchronisation
- Schema in [src/sanity/schema.ts](src/sanity/schema.ts) registriert
- Studio-Structure-Eintrag "Galerie-Seite (pro Sprache)" ergänzt — listet alle Galerie-Dokumente, gruppiert per Sprache durch Marketing manuell

**Sanity-Query** ([src/sanity/queries.ts](src/sanity/queries.ts)):
- Neue Query `getGalleryPage(locale)` mit Per-Field-Fallback auf DE-Dokument: `pageHeadline`, `pageSubline`, `heroImage` und `categories[]` werden einzeln coalesced. Wichtige Design-Entscheidung: `categories[]` fällt **als Ganzes** zurück, nicht pro Eintrag — wenn Marketing für FR keine eigenen Sektionen pflegt, sieht der französische Besucher die DE-Sektionen mit DE-Headings. Sprachlich unsauber, aber besser als leere Galerie. Sobald Marketing FR-Sektionen pflegt, ersetzt das den Fallback komplett.

### Verifikation
- `npx tsc --noEmit` clean
- DB: Spalte/CHECK/Index existieren, Default greift
- API: `?occasion=muttertag` filtert korrekt (manuelles Tagging eines Bestands-Presets, Filter findet es, Cleanup zurückgesetzt)
- API: `?occasion=foobar` → 400 "Invalid occasion"
- API: `?occasion=...` kombinierbar mit `?locale=...` und `?poster_type=...`
- API: Backward-compat ohne Params unverändert (alle published Presets)
- Admin-Endpoints: 401 Forbidden ohne Auth (GET, bulk)
- DB-CHECK-Constraint blockt ungültige Anlass-Codes
- Public-Detail-Route liefert jetzt `occasions` + `target_locales` mit, sodass `PresetUrlApplier` und Admin-Listen das Feld konsumieren können

### Schritt 2 — Frontend (Admin-UX, Galerie-Seite, Nav, i18n) (✅ 2026-04-26)

**Admin-UX-Erweiterung** ([src/components/admin/AdminPresetsList.tsx](src/components/admin/AdminPresetsList.tsx) + neue [src/components/admin/OccasionMultiSelect.tsx](src/components/admin/OccasionMultiSelect.tsx)):
- Neue wiederverwendbare `OccasionMultiSelect`-Komponente spiegelt `LocaleMultiSelect` 1:1 (Popover + Checkbox-Liste). Anzeigenamen kommen aus `src/lib/occasions.ts` und folgen der aktuellen Admin-UI-Locale.
- `AdminPresetsList`-Card-Layout: zusätzliche Anlass-Badges-Zeile unter den Sprach-Badges, mit Tag-Icon, "Kein Anlass"-Hint (amber) wenn leer, Pencil-Popover für Sofort-Edit per Card. List-View bekommt eine kompakte Anlass-Spalte (nur ab `lg`-Breakpoint, sonst zu schmal).
- Bulk-Bar bekommt einen Modus-Toggle "Sprachen / Anlässe": `bulkField`-State steuert, welcher Multi-Select erscheint und welches Feld der Bulk-Endpoint updated. Bulk-Action-Labels sind kontextspezifisch ("Anlässe setzen" vs "Sprachen setzen").
- Filter-Bar: neuer Anlass-Filter mit "Alle / Kein Tag / spezifischer Anlass"-Dropdown. Client-side `none`-Filter (analog zur Locale-`none`-Logik), API-Filter für konkrete Codes.

**i18n-Strings**: Neuer `gallery`-Namespace (`pageTitle`, `metaDescription`, `headlineFallback`, `sublineFallback`, `posterTypeMap`, `posterTypeStarMap`, `emptyTitle`, `emptyDescription`, `emptyCta`) + `nav.gallery` in allen 5 Locale-JSONs (DE/EN/FR/IT/ES). Fallback-Texte greifen, solange kein Sanity-`galleryPage`-Doc gepflegt ist.

**Galerie-Komponenten** (alle Server-Components, `src/components/landing/`):
- [GalleryHero.tsx](src/components/landing/GalleryHero.tsx) — zwei Modi: Mit Sanity-Hero-Bild → fullwidth Banner mit Overlay; ohne Bild → kompakter `bg-muted`-Header mit Headline + Subline.
- [GalleryPresetCard.tsx](src/components/landing/GalleryPresetCard.tsx) — Card mit `aspect-2/3`-Preview, Hover-Scale, Type-Badge oben rechts ("Stadtposter"/"Sternenkarte"), Link auf `/map?preset=<id>` bzw. `/star-map?preset=<id>` (PresetUrlApplier übernimmt den Rest inkl. Cross-Type-Redirect).
- [GallerySection.tsx](src/components/landing/GallerySection.tsx) — eine Anlass-Section. Heading + Subline + optional Stimmungsbild (1×2-Tile auf desktop, full-width auf mobile) + Card-Grid (2/3/4 Spalten). `id={tag}`-Anker für `/gallery#muttertag`-Deep-Linking. `scroll-mt-20` damit Anker nicht unter dem fixed-Nav landen.
- [GalleryEmpty.tsx](src/components/landing/GalleryEmpty.tsx) — Fallback wenn keine Section Presets hat: Icon + Headline + Description + CTA-Button "Eigenes Poster gestalten" → `/map`.

**Galerie-Route** ([src/app/[locale]/gallery/page.tsx](src/app/[locale]/gallery/page.tsx)):
- Server Component, `revalidate = 3600` (1h ISR).
- `generateMetadata`: Titel + Description aus Sanity (wenn vorhanden), sonst aus i18n-Fallback. Open Graph mitgesetzt.
- Datenfluss: `getLocale()` → `getGalleryPage(locale)` (Sanity mit DE-Per-Field-Fallback) → für jede `categories[]`-Kategorie ein paralleler `Promise.all`-Aufruf von `fetchPresetsForCategory(locale, tag)` (direkter Supabase via `createAdminClient`, Filter `target_locales @> [locale]` AND `occasions @> [tag]`, `display_order` als Sortierung, Limit 24 Cards/Section).
- Sections mit 0 Treffern werden gefiltert. Wenn 0 Sections übrig: `GalleryEmpty` rendert.
- Nav (`LandingNav`): neuer "Galerie"-Link zwischen "Beispiele"-Anker und "Preise"-Anker. next-intl-Routing übernimmt das Locale-Prefix automatisch.
- Footer (`LandingFooter`): Galerie-Link in der "Produkte"-Spalte ergänzt.

### Verifikation
- `npx tsc --noEmit` clean
- Galerie-Routen: `/de/gallery`, `/en/gallery`, `/fr/gallery` → HTTP 200
- DE-Page rendert die deutschen Fallback-Strings ("Vorlagen für jeden", "Noch keine Vorlagen", "Eigenes Poster gestalten")
- EN-Page rendert die englischen Fallback-Strings ("Templates for every", "No templates available", "Build your own poster")
- Admin-Page `/private/admin/presets` → 307 Redirect zu Login (Auth funktioniert)
- Sanity Studio `/studio` → HTTP 200, neuer Eintrag "Galerie-Seite (pro Sprache)" sichtbar
- Empty-State erwartet, da noch kein Sanity-`galleryPage`-Doc + keine getaggten Presets vorhanden — sobald beides existiert, schaltet die Page automatisch um

### Voraussetzung vor Live-Schaltung
1. Admin loggt sich ein → `/private/admin/presets` → Bulk-Bar auf "Anlässe" umschalten → Bestands-Presets selektieren → Anlass-Tags zuweisen.
2. Marketing legt im Sanity-Studio mindestens das **DE-`galleryPage`-Dokument** an: `pageHeadline`, optional `heroImage`, mindestens 1 Kategorie mit `tag` (z. B. "muttertag") + `label` (z. B. "Geschenke zum Muttertag").
3. Sobald beides erfüllt ist: `/de/gallery` zeigt automatisch die Sections mit den getaggten Presets.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

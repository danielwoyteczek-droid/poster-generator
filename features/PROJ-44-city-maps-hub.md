# PROJ-44: Stadt-Karten-Hub (Topic-Authority-Übersichts-Seite)

## Status: In Progress
**Created:** 2026-05-11
**Last Updated:** 2026-05-11

## Dependencies
- **Requires PROJ-42** (Programmatic City Landing Pages) — die einzelnen Stadt-LPs existieren bereits unter `/de/stadtkarte/[slug]` etc. PROJ-43 baut darauf eine Hub/Index-Seite.
- **Requires PROJ-13** (Content CMS / Sanity) — optional: Hub-Hero-Bild + redaktioneller Intro-Text könnten in Sanity gepflegt werden (analog zu Galerie-Page).
- **Requires PROJ-20** (i18n) — Hub kommt pro Locale, locale-prefixed URL.
- **Soft-Dependency PROJ-30** (Render-Pipeline) — Hub zeigt Render-Thumbnails der Stadt-LPs, die schon vom PROJ-30-Worker erzeugt sind.

## Problem & Ziel

Nach PROJ-42 haben wir 10 einzelne Stadt-Landing-Pages unter `/de/stadtkarte/stadtkarte-hamburg`, `/de/stadtkarte/stadtkarte-berlin` etc. Was fehlt: eine **Übersichts-Seite** unter `/de/stadtkarte/` (ohne Slug), die alle Stadt-LPs aggregiert.

Strategischer Grund: **Topical Authority**. Google + KI-Suchmaschinen (ChatGPT, Perplexity, Gemini Search) bewerten Domains nach Cluster-Authority. Eine Hub-Page, die alle Stadt-Karten listet:
- Bündelt internes Link-Equity um das Keyword "Stadtkarte"
- Wird zum Crawler-Entry für die ganze Stadt-Karten-Sektion
- Rankt zusätzlich für breitere Keywords wie `stadtkarten als poster`, `karte als wandbild`, `personalisierte stadtkarte`
- Erlaubt Cross-Linking aus Marketing-Content (Blog, Anlass-Seiten) auf einen sauberen Hub-Anker

Nebenziel: User-Experience-Verbesserung — wer nicht weiß welche Stadt er sucht oder die Auswahl-Liste durchstöbern möchte, hat aktuell keinen Einstieg. Die einzelnen LPs sind nur über Direct-Search oder den Footer-Block erreichbar.

## User Stories
- Als SEO-Verantwortliche:r möchte ich eine Hub-Seite, die für "Stadtkarten" als Cluster-Authority bei Google rankt — damit das ganze Stadt-LP-Cluster mehr SERP-Position bekommt, nicht nur die einzelnen Städte.
- Als Kunde:in, der/die noch nicht weiß welche Stadt, will ich auf einer Seite alle verfügbaren Stadt-Karten-Designs durchstöbern können — analog zur Galerie-Seite, aber stadt-spezifisch.
- Als Marketing-Verantwortliche:r möchte ich aus Blog-Posts und Anlass-Seiten auf einen Hub-Link verlinken können (`/de/stadtkarte/`) statt auf eine konkrete Stadt — wenn Stadt nicht das Thema ist.
- Als KI-Suchmaschinen-Nutzer:in (ChatGPT-Search "welche Anbieter machen Stadtposter?") möchte ich einen klaren Hub finden, der die ganze Kategorie repräsentiert und für die KI eindeutig als "Stadt-Karten-Anbieter" interpretierbar ist.
- Als Endkunde, der/die eine spezifische Stadt sucht, kann von der Hub-Seite per Suche oder per Browse zu der konkreten Stadt-LP navigieren.

## Acceptance Criteria

### Routing
- [ ] Neue Routen pro Locale (analog zu PROJ-42-Pattern):
  - `/de/stadtkarte/` (ohne Slug)
  - `/en/city-map/`
  - `/fr/carte-de-ville/`
  - `/it/mappa-citta/`
  - `/es/mapa-ciudad/`
- [ ] Index-Page rendert wenn `/de/stadtkarte/` ohne Slug aufgerufen wird. Bestehende `[slug]`-Routen bleiben funktional.

### Seiten-Aufbau
- [ ] Layout (Server Component, ISR mit 1h-Revalidate):
  1. `LandingNav` (bestehend)
  2. **Hero-Sektion** — H1 ("Personalisierte Stadtkarten als Poster"), Sub-Headline, Hero-Bild (optional aus Sanity, ähnlich Galerie-Page)
  3. **Intro-Body** — 1-2 Absätze (~150 Wörter) redaktionell pro Locale, beschreibt das Angebot (was sind Stadtkarten-Poster, Welche Qualität, Welche Formate). Aus Sanity oder vorerst hardcoded i18n. Bietet semantische Topic-Anker für Google.
  4. **Stadt-Grid** — Cards aller Stadt-LPs mit Sanity-Doc in der Locale. Pro Card: Render-Thumbnail (Default-Featured-Style, z. B. "original"), Stadtname, Link zur jeweiligen Stadt-LP.
     - Sortierung default: `population DESC` (Top-Städte zuerst)
     - Optional: Filter-Chips für "Region" / "Land" wenn Phase-2 mehr als nur DE-Städte zeigt
  5. **CTA-Block** — "Deine Stadt nicht dabei?" mit Button → `/de/map` (Editor mit freier Stadtwahl)
  6. **FAQ-Sektion** (optional) — 3-5 häufige Fragen zu Stadt-Karten-Postern (Druck-Qualität, Versand, Formate)
  7. `LandingFooter` (bestehend)
- [ ] Grid-Layout: 3 Spalten Desktop, 2 Spalten Tablet, 1-2 Spalten Mobile (analog `RelatedCities` aus PROJ-42)
- [ ] Mobile-first responsive (siehe Mobile-First-Feedback-Memory)

### SEO-Anforderungen
- [ ] `<title>`: "Personalisierte Stadtkarten als Poster — alle Städte | petite-moment" (oder Locale-Äquivalent)
- [ ] `<meta description>`: ~150 Zeichen, enthält "Stadtkarte" + "Poster" + "personalisiert" + Format-Andeutung
- [ ] H1 enthält "Stadtkarte" als Keyword
- [ ] Hreflang-Tags zu allen verfügbaren Locale-Versionen
- [ ] Canonical zeigt auf eigene Locale-Version
- [ ] Schema.org: `CollectionPage` als JSON-LD, mit `ItemList` der Stadt-LPs als Listenelemente
- [ ] Sitemap erweitert (`/sitemap.xml` listet die Hub-URL pro Locale)
- [ ] Internal Linking: Hub wird verlinkt aus Footer-Block "Beliebte Stadtkarten" (als "Alle Stadtkarten →" Link am Ende der Liste)

### Cross-Linking
- [ ] `LandingFooter` Block "Beliebte Stadtkarten" bekommt einen "Alle Stadtkarten →"-Link am Ende, der auf den Hub zeigt
- [ ] Bestehende Stadt-LPs bekommen einen "Zurück zur Übersicht"-Link nach der "Verwandte Städte"-Sektion
- [ ] Optional: Galerie-Page (PROJ-11) kann auf Hub verlinken als Cross-Sell-Pfad

### Content
- [ ] Initial-Inhalt: hardcoded in Locale-JSONs (Hero, Intro-Body, FAQ-Antworten) für DE; andere Locales bekommen i18n-Defaults oder bleiben EN-only-Fallback
- [ ] Spätere V2: Migration der Hub-Texte nach Sanity, damit Marketing eigenständig pflegen kann (analog `homepage` / `galleryPage` Schemas)
- [ ] Render-Thumbnails für die Stadt-Cards: nutzen die bereits in PROJ-42 erzeugten `city_renders` (Featured-Style "original"). Kein neuer Render-Pipeline-Job nötig.

### Phasen-Rollout
- [ ] V1: DE-Hub mit hardcoded Texten, 10 Stadt-Cards.
- [ ] V2: EN/FR/IT/ES-Hubs, sobald die jeweiligen Stadt-LPs in der Locale existieren.

## Edge Cases
- **Keine Stadt-LPs in einer Locale** → Hub-Page zeigt CTA "Coming soon" + Link auf Editor `/map`. Kein leeres Grid.
- **Sehr wenige Stadt-LPs (< 6)** → Grid bleibt zentriert, Cards nehmen mehr Platz pro Card statt zu strecken
- **Sehr viele Stadt-LPs (> 50)** → Pagination oder "Mehr laden"-Button, oder reine Region-Filter (V2-Add-on)
- **Bot scrapet `/de/stadtkarte/` ohne LPs** → 200 OK mit "Coming soon"-Content (kein 404, damit Sitemap-Eintrag valide bleibt)
- **Stadt-Doc existiert in Sanity, aber Renders fehlen** → Card wird ohne Thumbnail gerendert oder ganz ausgeblendet (gleicher Live-Gate wie in PROJ-42 CityLandingPage)

## Non-Goals
- **Kein Such-Feature** — Browse-only V1, Filter/Search ist V2-Add-on
- **Keine User-Generated-Content** auf der Hub-Seite (Reviews, Ratings) — V3
- **Keine Region-/Bundesländer-Filter** in V1 — V2 bei Phase-2-Skalierung
- **Kein Editor-Inline-Preview** — Hub ist Discovery-Page, nicht Editor
- **Kein dynamisches Reordering** (z. B. nach Popularity, Saison) — V2

## Decisions (vor Architecture festgelegt)
- **Hub-URL `/de/stadtkarte/` ohne Slug** — direkter Parent der bestehenden `/[slug]`-Routen, Google sieht klare Hierarchie.
- **3-Spalten Grid mit Render-Thumbnails** — analog `RelatedCities` aus PROJ-42, Brand-Consistency.
- **Default-Featured-Style für Thumbnails: `original`** — die "Standard-Optik" der Stadt-LPs, bereits in der DB als Render verfügbar.
- **Sortierung default `population DESC`** — Top-Städte zuerst sichtbar, höchster Conversion-Wert.
- **Content erstmal hardcoded i18n** — schnellere V1-Auslieferung, Sanity-Migration als V2.
- **Schema.org `CollectionPage + ItemList`** — der standardisierte Hub-Pattern für Google Rich Results.

## Open Questions
- **Hub-Hero-Bild Quelle**: Sanity-Feld auf einer neuen `cityMapsHubPage`-Doc-Type oder hardcoded in `/public/`? → Architektur-Phase, Tendenz: vorerst hardcoded mit Fallback auf Brand-Default.
- **FAQ-Sektion notwendig V1?** → Klärung im Marketing-Briefing. Schema.org-FAQ-JSON-LD wäre ein zusätzlicher SEO-Bonus.
- **Pagination ab welcher Anzahl?** → Architektur-Phase. Tendenz: ab 30 Cards.

## Technical Requirements
- **Performance**: Hub-Page TTFB < 500 ms (ISR mit 1h-Revalidate, Sanity-Query gecacht, Render-Thumbnails als CDN-Asset).
- **SEO-Performance**: Lighthouse-SEO-Score ≥ 95. Core Web Vitals "good".
- **Accessibility**: H1/H2-Hierarchie sauber, Alt-Texte für Render-Thumbnails, Keyboard-navigable Card-Grid.
- **Server-Side-Rendering**: Server Component für alle Hub-Bestandteile (keine Client-Insel notwendig in V1).
- **Backwards-Compatibility**: Bestehende Stadt-LP-Routen unverändert.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Bestehende Bausteine, auf denen wir aufsetzen

PROJ-44 ist eine **leichte Erweiterung von PROJ-42** — kein neues Backend, keine neue Datenquelle, kein neuer Render-Job. Alles was wir brauchen liegt schon in der DB und im Storage:

| Baustein | Was es schon kann | Wo es lebt |
|---|---|---|
| **`cities`-Tabelle** | Stadt-Inventar mit Name, Population, Country, Region, Geocode | Supabase (PROJ-42) |
| **`city_renders`-Tabelle** | Pro Stadt × Featured-Style ein Render mit Storage-URL | Supabase (PROJ-42) |
| **`cityPage`-Sanity-Schema** | Locale-spezifische Stadt-LP-Docs mit Slugs | Sanity (PROJ-42) |
| **Sanity-Query `listCityPagesForLocale(locale)`** | Listet alle Stadt-Docs einer Locale | `src/sanity/queries.ts` (PROJ-42) |
| **`buildCityPagePath()`-Helper** | Single-Source-of-Truth für Stadt-LP-URLs pro Locale | `src/lib/city-routing.ts` (PROJ-42) |
| **`CITY_URL_SEGMENT`-Mapping** | URL-Segment pro Locale (stadtkarte / city-map / ...) | `src/lib/city-routing.ts` (PROJ-42) |
| **Default-Featured-Style-Konstante** | `original` als Default-Thumbnail-Style | `src/lib/featured-styles.ts` (PROJ-42) |
| **`RelatedCities`-Komponente** | Card-Grid-Pattern mit Render-Thumbnails + Stadt-Labels | `src/components/landing/RelatedCities.tsx` (PROJ-42) |
| **`LandingNav` / `LandingFooter`** | Marketing-Layout-Komponenten | `src/components/landing/` |
| **Sitemap-Generator** | Listet schon Stadt-LPs + Static-Routes mit Hreflang | `src/app/sitemap.ts` (PROJ-42) |

**Was wir NEU bauen:**
1. **5 Locale-Routes** für die Index-Seite (`/de/stadtkarte/`, `/en/city-map/`, etc.) — analog zu den Stadt-LP-Routen, aber **ohne Slug** (`page.tsx` direkt im Locale-Segment-Ordner).
2. **`CityMapsHubPage`-Komponente** — Server-Component die das Hub-Layout rendert.
3. **5 neue Sub-Komponenten** für Hub-Sektionen (Hero, Intro, CityGrid, Cta, optionales Hub-spezifisches Footer-Stück).
4. **i18n-Strings** unter neuem Namespace `cityMapsHub` in allen 5 Locale-JSONs (Hardcoded-Approach).
5. **Sitemap-Erweiterung** — die 5 Hub-URLs pro Locale mit Hreflang-Alternates.
6. **Internal-Links-Updates**: 
   - `LandingFooter` "Beliebte Stadtkarten"-Block bekommt einen "Alle Stadtkarten →"-Link am Ende
   - Auf jeder Stadt-LP (`CityLandingPage`) wird unter der "Verwandte Städte"-Sektion ein "Zurück zur Übersicht"-Link ergänzt

### B) Aufbau einer Hub-Seite (Visual Tree)

```
/[locale]/stadtkarte/    <- DE   (Beispiel-Locale)
/[locale]/city-map/      <- EN
/[locale]/carte-de-ville/  <- FR
/[locale]/mappa-citta/   <- IT
/[locale]/mapa-ciudad/   <- ES
|
+-- LandingNav (bestehend)
|
+-- HubHero
|   +-- H1 (i18n: "Personalisierte Stadtkarten als Poster")
|   +-- Sub-Headline (i18n: kurze Subline mit Brand-Anker)
|   (text-only Hero, kein redaktionelles Bild noetig — analog zur
|    Stadt-LP-CityHero. Visueller Anker ist das City-Grid darunter.)
|
+-- HubIntro
|   +-- Prose-Block ~150 Woerter (i18n)
|   (Beschreibt: was sind Stadt-Karten-Poster, Qualitaet, Formate,
|    Personalisierung. Semantischer Topic-Anker fuer Google.)
|
+-- CityGrid
|   +-- Grid-Heading (i18n: "Waehle deine Stadt")
|   +-- 3-Spalten-Grid Desktop, 2 Tablet, 1-2 Mobile
|       +-- CityCard x N (Render-Thumbnail + Stadtname)
|       (Sortiert nach population DESC, nur Staedte mit Sanity-Doc
|        UND ≥1 done-Render in der Locale. Klick fuehrt auf
|        /[locale]/stadtkarte/<slug>.)
|
+-- HubCta
|   +-- Headline (i18n: "Deine Stadt nicht dabei?")
|   +-- Subline (i18n)
|   +-- Button "Im Editor selbst gestalten" → /[locale]/map
|
+-- LandingFooter (bestehend, beide Blocks bekommen Hub-Links)
```

**Beziehung Sub-Komponenten zu PROJ-42:**
- `HubHero` ist eigenständig (kein Reuse — ist Brand-Hub, nicht stadt-spezifisch)
- `HubIntro` ist eigenständig (statischer Prose-Block aus i18n)
- `CityGrid`-Cards wiederverwenden das **Visual aus `RelatedCities`** (gleiche Card-Optik, gleiche Aspect-Ratio, gleiche Hover-Effekte) — entweder durch direkten Reuse der bestehenden Komponente, oder durch Extraktion in eine kleine `CityThumbnailCard`-Sub-Komponente
- `HubCta` ist eigenständig (kein CTA-Pattern aus PROJ-42 wirklich passend — analog `CityCta` aber Hub-spezifischer Text)

### C) Was wo gespeichert ist (Datenmodell in Klartext)

**Keine neuen Tabellen, kein neues Sanity-Schema.**

**Supabase — was gelesen wird:**
- `cities`-Tabelle: alle Spalten lesen (insbesondere `id`, `slug_base`, `name`, `population`, `country_code`)
- `city_renders`-Tabelle: pro Stadt der Render mit `style_id = 'original'` und `render_status = 'done'` (= Thumbnail-Bild für die Card)

**Sanity — was gelesen wird:**
- `cityPage`-Docs filtered by `language = <currentLocale>`: für jede Stadt-Doc den `cityId` (= `cities.slug_base`) und den `slug` (= die LP-URL)

**Code-Konstanten — was gelesen wird:**
- `CITY_URL_SEGMENT` (für die Hub-URL pro Locale + für die Card-Link-Generierung)
- `DEFAULT_FEATURED_STYLE_ID = 'original'` (für die Thumbnail-Auswahl)

**Hardcoded Content — was hinzugefügt wird:**
- `cityMapsHub`-Namespace in 5 Locale-JSONs mit ~10 Strings (Hero, Intro, Grid-Heading, CTA, metaTitle, metaDescription)

### D) Routing-Strategie

**Pattern:** `/[locale]/[city-segment]/` (ohne Slug, das ist der Index)

In Next.js App Router koexistiert:
- `app/[locale]/stadtkarte/page.tsx` — Hub (Index)
- `app/[locale]/stadtkarte/[slug]/page.tsx` — einzelne Stadt-LP (existiert seit PROJ-42)

Beide sind valide Next.js-Routen, die parallel arbeiten. Wenn der User `/de/stadtkarte/` aufruft (ohne Slug, mit oder ohne Trailing-Slash), greift das `page.tsx` im Locale-Segment-Ordner. Wenn er `/de/stadtkarte/stadtkarte-hamburg` aufruft, greift `[slug]/page.tsx`. Klare Hierarchie, keine Routing-Konflikte.

Pro Locale ein eigener Index-`page.tsx`-File analog zur PROJ-42-Logik (5 Files, jede ist ein dünner Wrapper, der das Locale + Segment validiert und an die geteilte `CityMapsHubPage`-Komponente delegiert).

### E) Daten-Flow beim Page-Render (Schritt für Schritt)

```
User ruft /de/stadtkarte/ auf
  |
  v
Next-intl ermittelt Locale = "de"
  |
  v
Page-Handler validiert: CITY_URL_SEGMENT["de"] == "stadtkarte" ✓
  |
  v
Hub-Komponente startet:
  |
  +-- Parallel-Load (via Promise.all):
  |   1. listCityPagesForLocale("de") → [{cityId, slug}, ...] (aus Sanity)
  |   2. createAdminClient().from('cities').select(...) → alle DE-Staedte
  |   3. createAdminClient().from('city_renders').select(...) WHERE style_id='original' AND render_status='done'
  |
  +-- In-Memory Join:
  |   - Filter cities auf die Sanity-doc-existenten (live-Staedte)
  |   - Match jede Stadt mit ihrem Render-Thumbnail
  |   - Sort by population DESC
  |   - Limit auf "alle" (V1 ohne Pagination)
  |
  +-- Translations laden (Server-Side):
  |   getTranslations({locale: "de", namespace: "cityMapsHub"})
  |
  +-- JSON-LD bauen (CollectionPage + ItemList aus den Stadt-Cards)
  |
  +-- Render JSX (Hero, Intro, Grid, CTA, Footer)
  |
  v
HTML an Client (mit ISR-Cache fuer 1h)
```

Drei DB/Sanity-Queries parallel, danach reines In-Memory-Mapping. Performance unkritisch bei 10 Cards; bei 100+ Phase-2 immer noch im Mittel <1 s.

### F) SEO-Anforderungen (kurz wiederholt)

| Element | Inhalt |
|---|---|
| `<title>` | "Personalisierte Stadtkarten als Poster — alle Städte \| petite-moment" |
| `<meta description>` | ~150 Zeichen, enthält "Stadtkarte", "personalisiert", "Poster", Format-Andeutung |
| H1 | "Personalisierte Stadtkarten" (Keyword sichtbar oben) |
| `<link rel="canonical">` | Zeigt auf eigene Locale-Version |
| `<link rel="alternate" hreflang="...">` | Pro Locale-Hub mit existierender Locale-Page |
| Schema.org | `CollectionPage` + `ItemList` mit den Stadt-Cards als List-Items |
| Sitemap | Hub-URLs pro Locale eingetragen, Hreflang-Subelements |

### G) Cross-Linking (Internal-Link-Equity-Verteilung)

**Vom Hub raus** (Hub linkt auf):
- Jede Stadt-Card → `/[locale]/stadtkarte/<slug>` (= Stadt-LP)
- CTA-Block → `/[locale]/map` (= Editor)

**Zum Hub rein** (was auf Hub linkt):
- `LandingFooter` "Beliebte Stadtkarten"-Block: neuer "Alle Stadtkarten →"-Link am Block-Ende, deutet auf Hub
- Stadt-LPs (`CityLandingPage`): nach der "Verwandte Städte"-Sektion ein "Zurück zur Übersicht"-Link auf den Hub. Damit haben einzelne Stadt-LPs eine klare Parent-Verlinkung — Google sieht Hub als Parent des ganzen Stadt-LP-Clusters
- (Optional V2) Galerie-Page könnte einen Hub-Link bekommen
- (Optional V2) Anlass-Seiten könnten einen Hub-Link bekommen

### H) i18n-Strings (Hardcoded in Locale-JSONs)

Neuer Namespace `cityMapsHub` in `src/locales/{de,en,fr,it,es}.json`:

| Key | DE-Beispiel |
|---|---|
| `pageTitle` | "Personalisierte Stadtkarten als Poster — alle Städte \| petite-moment" |
| `metaDescription` | "Personalisierte Stadtkarten als Poster — wähle deine Stadt aus 10+ Top-Optionen. A4 bis A2, Premiumdruck, versandkostenfrei." |
| `h1` | "Personalisierte Stadtkarten" |
| `subline` | "Deine Lieblingsstadt als Wand-Poster — kuratierte Designs für 10 deutsche Städte" |
| `introBody` | (~150 Wörter Prose, mehrere Absätze) |
| `gridHeading` | "Wähle deine Stadt" |
| `ctaHeadline` | "Deine Stadt nicht dabei?" |
| `ctaSubline` | "Im Editor kannst du jede Stadt frei wählen und dein eigenes Poster gestalten." |
| `ctaButtonLabel` | "Im Editor selbst gestalten" |
| `backToHubLink` | "← Zurück zur Übersicht" (genutzt auf Stadt-LPs) |
| `viewAllLink` | "Alle Stadtkarten →" (genutzt im Footer-Block) |

EN/FR/IT/ES analog. Pro Locale ~150 Wörter Übersetzung (für `introBody` macht das den Großteil der Arbeit aus).

### I) Live-Gate-Logik (was darf der Hub anzeigen)

Pro Stadt im Grid muss erfüllt sein:
1. Stadt existiert in `cities`-Tabelle (offensichtlich)
2. Sanity-`cityPage`-Doc existiert in der aktuellen Locale
3. Mindestens 1 `city_renders`-Eintrag mit `style_id = 'original'` (= Default-Featured) und `render_status = 'done'` und gültiger `image_url`

Staedte ohne Sanity-Doc werden gar nicht aufgelistet (matchet die User-Entscheidung "nur live-Städte zeigen"). Wenn die `original`-Render-Variante fehlt aber andere done sind: V1 fällt einfach auf "diese Stadt hat kein Thumbnail" zurück = Card ausblenden. V2 könnte einen Fallback auf andere done-Renders machen.

**Edge Cases:**
- **0 Stadt-Cards in der Locale** (z. B. EN-Hub vor Phase-2-Rollout): Grid wird durch eine "Coming soon"-Sektion ersetzt (i18n: "Stadt-Karten für diese Locale kommen bald"), CTA-Block bleibt sichtbar → User kann trotzdem in den Editor.
- **Genau 1-2 Cards**: Grid bleibt 3-Spalten, Cards zentrieren sich nicht (Tailwind-Grid füllt von links auf). Cosmetisch akzeptabel.

### J) ISR / Caching

| Page-Element | Caching |
|---|---|
| Hub-Page-Render | ISR mit 1h-Revalidate (analog PROJ-42) |
| Sanity-Query | Im selben ISR-Cache (eine Query pro Build) |
| Supabase-Queries | Im selben ISR-Cache (drei Queries pro Build, parallel) |
| JSON-LD-Generation | Inline beim Render, kein separater Cache |
| Render-Thumbnails (Storage-URLs) | CDN-cached durch Supabase Storage (Public-Read) |

Marketing-Änderung im i18n-JSON braucht einen Vercel-Deploy (kein Sanity-Webhook). Sobald neue Stadt-LP angelegt wird (DB + Sanity), erscheint sie spätestens nach 1h auf dem Hub.

### K) Mobile-First-Layout (per Memory-Pflicht)

Folgend der gespeicherten `feedback_mobile_first.md`-Regel: jede Komponente wird für 375 px Viewport gebaut und mental durchgespielt:

- **HubHero**: Text-only, `text-3xl sm:text-4xl md:text-5xl` für H1 — passt automatisch
- **HubIntro**: `max-w-3xl mx-auto px-6` (24 px Mobile-Padding) — keine Edge-to-Edge-Texte
- **CityGrid**: Mobile 2 Spalten, sm+ 3 Spalten (analog `RelatedCities`). Bei 10 Cards = 5 Rows × 2 Cards. ~245 px Höhe pro Card-Aspect-2/3 × 5 = ~1225 px Grid-Höhe. Akzeptabel für Scroll.
- **HubCta**: `max-w-2xl mx-auto px-6 text-center` — Standard-Pattern
- **Touch-Targets**: jede Card ist ein voll-klickbarer `<Link>`, weit > 44 px Touch-Target

### L) Phasen-Reihenfolge (Bauplan)

```
Phase 1: i18n-Strings (alle 5 Locales)
  +-- Neuer Namespace cityMapsHub in de.json (Initial mit DE-Texten)
  +-- en/fr/it/es.json bekommen die Keys zuerst mit DE-Werten als
      Placeholder; Marketing/User uebersetzt nachtraeglich
        |
        v
Phase 2: Komponenten
  +-- HubHero.tsx
  +-- HubIntro.tsx
  +-- CityGrid.tsx (intern wiederverwendet die Card-Optik aus RelatedCities)
  +-- HubCta.tsx
  +-- CityMapsHubPage.tsx (Composition)
        |
        v
Phase 3: 5 Locale-Routes
  +-- src/app/[locale]/stadtkarte/page.tsx (DE-Wrapper)
  +-- src/app/[locale]/city-map/page.tsx (EN-Wrapper)
  +-- src/app/[locale]/carte-de-ville/page.tsx (FR-Wrapper)
  +-- src/app/[locale]/mappa-citta/page.tsx (IT-Wrapper)
  +-- src/app/[locale]/mapa-ciudad/page.tsx (ES-Wrapper)
  +-- Shared route-helper lib/city-maps-hub-route.ts (Metadata-Generator)
        |
        v
Phase 4: SEO-Helper
  +-- lib/city-maps-hub-metadata.ts (Title/Description/OG/Hreflang/Canonical)
  +-- JSON-LD-Builder (CollectionPage + ItemList)
        |
        v
Phase 5: Sitemap + Cross-Linking
  +-- sitemap.ts um Hub-URLs erweitern
  +-- LandingFooter: "Alle Stadtkarten →"-Link am Block-Ende
  +-- CityLandingPage: "← Zurueck zur Uebersicht"-Link nach RelatedCities
        |
        v
Phase 6: Verifikation
  +-- tsc + vitest
  +-- Build smoke-test (alle 5 Routes registriert?)
  +-- Mobile-Layout-Review (375 px)
  +-- Lighthouse-SEO pro Locale-Hub
```

### M) Tech-Entscheidungen mit Begründung

| Entscheidung | Begründung |
|---|---|
| **Hardcoded i18n statt Sanity-Schema** | V1-Speed. Marketing aendert ueber Code-Deploy — bei einer Hub-Page ist das akzeptabel (selten geaendert). Sanity-Migration als V2 wenn Marketing eigenstaendigen Zugriff braucht. |
| **5 separate Locale-Routes statt Catch-All** | Konsistent mit PROJ-42-Pattern. Next.js-Routing-Konvention erlaubt klare URL-Hierarchie. Jede Route ist ein ~25-Zeilen-Wrapper. |
| **Shared `CityMapsHubPage`-Komponente** | Heavy Logic einmal — analog `CityLandingPage` aus PROJ-42. 5 Wrapper, eine Implementation. |
| **Nur live-Staedte im Grid (kein Coming-Soon-Placeholder)** | SEO-sauber — keine Thin-Content-Pages, keine Indexierung "halbfertiger" Cards. Per User-Entscheidung. |
| **`Default-Featured-Style` als Thumbnail** | Konsistente Card-Optik ueber alle Staedte. Vermeidet Aufwand "welcher Render fuer die Card?"-Logic. |
| **`CollectionPage + ItemList`-Schema** | Google-Standard fuer Hub-Pages mit gelisteten Items. Hilft KI-Suchmaschinen (ChatGPT, Perplexity) bei semantischer Kategorisierung. |
| **ISR mit 1h-Revalidate** | Marketing-/Content-Aenderungen sind nicht sekundenkritisch. Matched PROJ-42 SLA. |
| **Server-Component, keine Client-Insel** | Hub ist Discovery, keine Interaktion (kein Filter/Search V1). Maximiert SSR-Performance. |
| **Card-Visual aus `RelatedCities` wiederverwenden** | DRY. Falls die "Verwandte Staedte"-Cards spaeter style-angepasst werden, Hub bleibt automatisch konsistent. |
| **3 DB/Sanity-Queries parallel** | `Promise.all` minimiert TTFB. Bei 10 Staedten < 200 ms total. |
| **Pagination = V2** | 10 Cards passen auf eine Seite ohne UX-Stress. Pagination implementieren wenn Phase-2 30+ Staedte bringt. |
| **FAQ = V2** | Hub V1 ohne FAQ. Sobald Search-Console-Daten zeigen welche Fragen User stellen, schreibt Marketing einen daten-gesteuerten FAQ-Block (besser als generische Vermutungen). |

### N) Neue Dateien / berührte Dateien (Übersicht)

```
src/
+-- app/
|   +-- [locale]/
|   |   +-- stadtkarte/page.tsx           NEU: DE-Hub-Wrapper
|   |   +-- city-map/page.tsx             NEU: EN-Hub-Wrapper
|   |   +-- carte-de-ville/page.tsx       NEU: FR-Hub-Wrapper
|   |   +-- mappa-citta/page.tsx          NEU: IT-Hub-Wrapper
|   |   +-- mapa-ciudad/page.tsx          NEU: ES-Hub-Wrapper
|   +-- sitemap.ts                        ergaenzt: Hub-URLs + Hreflang
|
+-- lib/
|   +-- city-maps-hub-route.ts            NEU: Shared Metadata + Segment-Validation
|   +-- city-maps-hub-metadata.ts         NEU: Title/Description/OG/JSON-LD-Builder
|
+-- components/
|   +-- landing/
|       +-- CityMapsHubPage.tsx           NEU: Composition (Hero+Intro+Grid+CTA)
|       +-- HubHero.tsx                   NEU
|       +-- HubIntro.tsx                  NEU
|       +-- HubCityGrid.tsx               NEU (Card-Visual aus RelatedCities reused)
|       +-- HubCta.tsx                    NEU
|       +-- LandingFooter.tsx             ergaenzt: "Alle Stadtkarten →"-Link
|       +-- CityLandingPage.tsx           ergaenzt: "Zurueck zur Uebersicht"-Link
|
+-- locales/
    +-- de.json, en.json, fr.json, it.json, es.json   ergaenzt: cityMapsHub-Namespace
```

### O) Abhängige Packages

**Keine neuen Dependencies.** Alle Bausteine sind bereits installiert:
- `next-sanity` — Sanity-Queries (aus PROJ-42)
- `next-intl` — i18n (aus PROJ-20)
- `next/image` — Render-Thumbnails (Standard)
- `@supabase/supabase-js` — DB-Queries (aus PROJ-30+)

### P) Risiken & offene Punkte

- **Initiale Übersetzungs-Qualität EN/FR/IT/ES**: Hardcoded i18n bedeutet Marketing/User schreibt manuell. Für V1-Launch ist DE Pflicht; andere Locales können vorerst DE-Strings als Fallback bekommen — Hreflang verweist dann nicht auf sie, Sitemap listet sie nicht. Erst wenn Übersetzung da ist, geht die Locale live.
- **i18n-Drift**: Wenn Marketing den DE-Hub-Intro-Text ändert, müssen die 4 anderen Locale-Versionen mitgepflegt werden. Bei Hardcoded-Approach kein automatischer Sync. Mitigation: V2-Migration nach Sanity gibt Marketing einen zentralen Pflegepunkt.
- **Hub-Page bekommt Mehrgewicht in Hreflang**: Wenn EN/FR/IT/ES-Hubs früher live gehen als die jeweiligen Stadt-LPs in der Locale, gibt's Hub-URLs aber leere City-Grids (0 Stadt-Cards). Edge-Case ist abgedeckt ("Coming soon"-Output), aber SEO-Wert pro Locale-Hub steigt erst mit Phase-2-Stadt-LPs.
- **Default-Featured-Style-Wechsel**: Wenn ihr später `DEFAULT_FEATURED_STYLE_ID` von `original` auf was anderes umstellt, ändert sich automatisch die Hub-Thumbnail-Auswahl. Akzeptabel — Hub bleibt konsistent mit dem aktuellen Default.
- **Performance bei 100+ Cards (V2)**: Bei großer Skalierung könnte das ungepaginierte Grid > 5 MB HTML bedeuten. V2-Pagination muss greifen.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

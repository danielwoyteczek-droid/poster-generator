# PROJ-44: Stadt-Karten-Hub (Topic-Authority-Übersichts-Seite)

## Status: Planned
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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

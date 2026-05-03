# PROJ-29: Anlass-Landing-Pages (SEO-Marketing-Hubs)

## Status: Approved
- Reality-Check 2026-05-03: Acceptance Criteria im Code abgedeckt, Status auf Approved gehoben.

**Created:** 2026-04-26
**Last Updated:** 2026-05-03

## Dependencies
- **Requires PROJ-11** (Homepage / Galerie-Erweiterung) — nutzt die `presets.occasions`-Tagging-Infrastruktur, das `OCCASION_CODES`-Enum aus [src/lib/occasions.ts](src/lib/occasions.ts) und das gleiche Anlass-Modell.
- **Requires PROJ-13** (Content CMS / Sanity) — neues Sanity-Schema `occasionPage` lebt im bestehenden Sanity-Setup, folgt dem `language`-Feld-Pattern.
- **Requires PROJ-20** (Internationalisierung) — Locale-Routing, `getLocale()`/`useLocale()`, `[locale]/`-Struktur sind Voraussetzung.
- **Requires PROJ-24** (Localized Storefront Content) — `target_locales`-Filter auf Presets liefert die locale-spezifische Card-Auswahl pro Seite.
- Berührt PROJ-11 (Galerie bekommt "Mehr zum Anlass →"-Link) und Footer (PROJ-11 `LandingFooter` bekommt einen Anlass-Link-Block).

## Problem & Ziel
Die `/gallery`-Seite (PROJ-11) ist ein Product-Hub: alle Presets nach Anlässen gruppiert, primärer Zweck ist Auswahl. Was fehlt, sind **eigenständige SEO-Landing-Pages pro Anlass und Locale**, die emotional in das Thema einführen, redaktionell schreibendwert sind und bei Google für markt-spezifische Long-Tail-Keywords ("Geschenkideen zum Muttertag", "mothers day gift ideas") ranken.

Vergleichbare Anbieter (Cartida, Mapiful, Modern Map Art) nutzen genau dieses Muster: Pro emotionalem Trigger eine eigene URL mit Storytelling + kuratiertem Produkt-Auszug + interner Verlinkung. Diese Seiten sind die **Eingangstür für SEO-Traffic**, der dann via klare CTAs in den Editor geleitet wird.

PROJ-29 baut diese Anlass-Hubs als eigenständige Seiten — bewusst getrennt von der Galerie, weil:
- **Galerie = Vollausspielung aller Presets nach Anlass** (Product-Hub, breit)
- **Anlass-Landing-Page = redaktionelle SEO-Hub-Seite mit kuratiertem Auszug** (Marketing, fokussiert)

## User Stories
- Als potenzielle:r Kunde:in, der/die nach "Geschenkideen zum Muttertag" googelt, möchte ich auf einer Seite landen, die mich emotional abholt, mir die Produktidee zeigt und mit einem Klick in den Editor führt.
- Als französische:r Besucher:in möchte ich eine Anlass-Landing-Page in Französisch sehen — mit französischen Texten, französischen Stadt-Beispielen und französischen Keywords im Slug — damit sie sich für mich gemacht anfühlt.
- Als Marketing-Verantwortliche:r möchte ich pro Anlass und Locale ein eigenständiges Sanity-Dokument pflegen (Hero-Bild, Storytelling-Text, optionale FAQ, Meta-Tags), damit ich pro Markt unterschiedlich kuratieren und SEO-optimieren kann ohne Code-Deploy.
- Als Marketing-Verantwortliche:r möchte ich Anlass-Seiten phasenweise rollen können (DE zuerst, später EN, dann FR/IT/ES), damit nicht alle 40 Inhalte gleichzeitig produziert werden müssen.
- Als SEO-Verantwortliche:r möchte ich Slugs pro Locale keyword-recherchiert vergeben (nicht 1:1 übersetzt) und nachträglich umbenennen können, ohne Link-Saft zu verlieren — die alte URL soll automatisch auf die neue weiterleiten.
- Als Endnutzer:in möchte ich von der Anlass-Landing-Page nahtlos in den Editor mit einem vorgeladenen Beispiel-Design gelangen, sodass ich nur noch Ort/Text anpassen und kaufen muss.
- Als Galerie-Besucher:in möchte ich pro Anlass-Section in der Galerie einen "Mehr zum Anlass →"-Link sehen, der mich auf die ausführliche Marketing-Seite führt.

## Acceptance Criteria

### Scope & Anlass-Liste
- [ ] V1 deckt die 8 bestehenden Anlässe aus `OCCASION_CODES` ab: `muttertag`, `geburt`, `hochzeit`, `heimat`, `reise`, `geschenk`, `jahrestag`, `weihnachten`.
- [ ] Pro Locale + Anlass kann **maximal eine** Sanity-Doc-Instanz existieren (Eindeutigkeit per `language` + `occasion`).
- [ ] Anlässe ohne Sanity-Doc in einer Locale geben **404** (Phase-Rollout-Sicherheit, kein leerer Hülsen-Output).

### Routing & Slugs
- [ ] Pro Locale eigenes Slug-Schema, nicht 1:1 übersetzt sondern keyword-recherchiert. Routing-Pattern: `/[locale]/[poster-segment]/[slug]` (z. B. `/de/poster/geschenkideen-zum-muttertag`, `/en/posters/mothers-day-gift-ideas`, `/fr/posters/idees-cadeaux-fete-des-meres`).
- [ ] Slug ist im Sanity-`occasionPage`-Doc gepflegt (eigenes Slug-Feld), nicht hardcoded im Code. Marketing kann den Slug ändern.
- [ ] Slug-Eindeutigkeit pro Locale ist via Sanity-Validierung sichergestellt (zwei Anlass-Docs in derselben Locale dürfen nicht denselben Slug nutzen).
- [ ] Sanity-Doc hat ein zusätzliches Array-Feld `previousSlugs` (optional). Wird ein neuer Slug gesetzt, kann Marketing den alten dort eintragen.
- [ ] Auf Anfragen mit einem Slug aus `previousSlugs` antwortet die App mit **301-Redirect auf den aktuellen Slug** (SEO-Saft bleibt erhalten). Implementierung als Middleware oder Route-Handler — nicht im Scope dieser Spec, Architecture-Phase entscheidet.

### Sanity-Schema `occasionPage`
- [ ] Neues Schema `occasionPage` pro Doc mit folgenden Feldern:
  - `language` (Pflicht, Locale-Code aus `de|en|fr|it|es`) — folgt dem Pattern von `homepage`/`galleryPage`/`aboutPage`
  - `occasion` (Pflicht, String aus `OCCASION_CODES`-Enum) — Studio-Dropdown mit denselben 8 Codes wie in `src/lib/occasions.ts`
  - `slug` (Pflicht, String, slug-format-validiert) — keyword-reicher Slug pro Locale
  - `previousSlugs` (optional, Array von Strings) — für 301-Redirects nach Umbenennung
  - `pageTitle` (Pflicht, String) — H1 der Seite
  - `pageSubline` (optional, String) — Sub-Headline unter H1
  - `heroImage` (Pflicht, Image mit Hotspot + Alt) — Locale-spezifisches Stimmungsbild
  - `bodySections[]` (Pflicht, 1–4 Einträge) — Storytelling-Sektionen mit Sub-Heading + Portable-Text-Body
  - `faq[]` (optional, max 8 Einträge) — Frage/Antwort-Paare für FAQ-Sektion + Schema.org-Markup
  - `metaTitle` (Pflicht, String, max 60 Zeichen) — `<title>` und OG-Title
  - `metaDescription` (Pflicht, String, max 160 Zeichen) — `<meta description>` und OG-Description
  - `ctaPosterType` (optional, Auswahl `map`/`star-map`) — bestimmt, ob "Eigenes gestalten"-CTA auf `/map` oder `/star-map` zeigt; Default: `map`
- [ ] Studio-Structure-Eintrag "Anlass-Seiten" gruppiert die Dokumente sichtbar nach Locale + Anlass.
- [ ] Validierung: Slug-Format (`^[a-z0-9-]+$`), keine Duplikate, `previousSlugs` enthält keinen Eintrag, der dem aktuellen `slug` entspricht.

### Seiten-Aufbau (Frontend)
- [ ] Seiten-Layout (Server Component, ISR mit 1h-Revalidate):
  1. `LandingNav` (bestehend)
  2. **Hero-Sektion** — `pageTitle` (H1), optional `pageSubline`, locale-spezifisches Hero-Bild
  3. **Body-Sektionen** — pro Eintrag in `bodySections[]` ein Block mit Sub-Heading (H2) + Portable-Text-Body (Headings, Paragraphs, Lists, Links, Bilder via bestehendem PortableText-Renderer aus PROJ-13)
  4. **Preset-Grid** — Cards der `presets WHERE occasions @> [occasion] AND target_locales @> [locale]`, max 8–12 Cards, sortiert nach `display_order`. Link pro Card auf `/[locale]/map?preset=<id>` bzw. `/[locale]/star-map?preset=<id>`. Wenn 0 Presets → **Sektion komplett ausblenden** (Storytelling + CTA bleiben).
  5. **CTA-Block** — primärer Button "Eigenes Poster gestalten" → `/[locale]/map` (oder `/[locale]/star-map` falls `ctaPosterType === 'star-map'`)
  6. **FAQ-Sektion** (nur wenn `faq[]` befüllt) — Accordion-Liste + Schema.org `FAQPage` structured data
  7. `LandingFooter` (bestehend)
- [ ] Wortmenge-Zielwert pro Seite: ~400–600 Wörter Body-Content (Hero-Subline + Body-Sektionen + FAQ kombiniert), keine harte Validierung.
- [ ] Hero-Bilder werden via `next/image` mit `priority` geladen. Body-Bilder mit `loading="lazy"`.
- [ ] Cards verlinken auf locale-prefixed Routen (`/de/map?preset=...`); existierender `PresetUrlApplier` aus PROJ-11 übernimmt das Vorladen.

### SEO-Anforderungen
- [ ] Pro Seite werden gesetzt: `<title>` (aus `metaTitle`), `<meta name="description">` (aus `metaDescription`), Open Graph (`og:title`, `og:description`, `og:image` aus `heroImage`, `og:type=article`), Twitter Card (`summary_large_image`).
- [ ] **Hreflang-Tags**: für jede Anlass-Seite werden nur Locales verlinkt, deren `occasionPage`-Doc existiert. `x-default` zeigt auf die DE-Variante (Hauptmarkt), falls vorhanden; sonst auf die erste verfügbare Locale.
- [ ] **Canonical-Tag** zeigt auf die eigene Locale-Version der Seite.
- [ ] FAQ-Sektion (sofern befüllt) erzeugt Schema.org `FAQPage` JSON-LD im `<head>` für Google Rich Results.
- [ ] Sitemap (`/sitemap.xml`) listet alle Anlass-Seiten aller Locales mit existierendem Sanity-Doc auf, inkl. `<xhtml:link hreflang="...">`-Verweisen zu Locale-Varianten.

### Locale-Phasen-Rollout
- [ ] **Phase 1**: DE-Locale komplett (8 DE-Sanity-Docs, 8 DE-Hero-Bilder, 8 DE-Slugs).
- [ ] **Phase 2**: EN-Locale (8 EN-Docs, 8 EN-Bilder, 8 EN-Slugs) — nachfolgend.
- [ ] **Phase 3**: FR / IT / ES je nach Marketing-Kapazität — pro Locale unabhängig roll-out-bar.
- [ ] Sichtbarkeit jeder Anlass-Seite ist an die Existenz des Sanity-Docs in der jeweiligen Locale gekoppelt — fehlt das Doc, gibt die Route 404, hreflang verweist nicht auf die Locale, Sitemap listet sie nicht.

### Cross-Linking (Galerie & Footer)
- [ ] **Galerie-Section pro Anlass** (PROJ-11 `GallerySection.tsx`) bekommt einen Link "Mehr zum Anlass →" zur jeweiligen Anlass-Landing-Page. Link nur sichtbar, wenn die Anlass-Seite in der aktuellen Locale existiert (Sanity-Doc-Lookup beim Galerie-Render).
- [ ] **`LandingFooter`** (PROJ-11) bekommt einen neuen Link-Block "Anlässe" mit Links zu allen Anlass-Seiten der aktuellen Locale, deren Sanity-Doc existiert. Block ist im Footer auf allen Marketing-Seiten sichtbar (Homepage, Galerie, Anlass-Seiten selbst, Legal).

### i18n
- [ ] Page-Level-Strings (FAQ-Heading, "Eigenes Poster gestalten"-CTA-Label, "Mehr zum Anlass →"-Link, Footer-Block-Heading "Anlässe") in allen 5 Locale-JSONs (`src/locales/{de,en,fr,it,es}.json`) unter Namespace `occasionPage` und `nav`.
- [ ] Anlass-spezifischer Content (`pageTitle`, `pageSubline`, `bodySections`, `faq`) kommt **ausschließlich aus Sanity** — keine Hardcoded-Fallbacks, weil pro Locale eigenes Sanity-Doc gepflegt wird.

## Edge Cases
- **Sanity-Doc existiert, aber 0 Presets sind in der Locale für den Anlass getaggt** → Preset-Grid-Sektion wird komplett ausgeblendet, Hero + Body + FAQ + CTA bleiben sichtbar. Begründung: Marketing hat die Seite bewusst gepflegt, Storytelling ist der primäre SEO-Wert; Empty-Grid wirkt halbfertig, Ausblenden wirkt sauber.
- **User ruft alten Slug auf, der jetzt in `previousSlugs` steht** → 301-Redirect auf neuen Slug. Anfragen auf nicht existierende Slugs (kein aktueller, kein previous) geben 404.
- **Marketing benennt einen Slug um, vergisst aber den alten in `previousSlugs` einzutragen** → alter Slug gibt 404, SEO-Saft geht verloren. Studio-Onboarding-Doku muss das explizit erwähnen; alternativ Studio-Custom-Action "Slug umbenennen" mit Auto-Tracking — nicht V1.
- **Sanity-Doc nennt einen `occasion`, der nicht (mehr) in `OCCASION_CODES` existiert** → Doc wird stillschweigend ignoriert (404 auf seiner Slug-Route, kein Eintrag in Sitemap, kein hreflang). Console-Warnung im Build-Log. Studio-Dropdown verhindert das an der Quelle.
- **User wechselt Locale auf einer Anlass-Seite** (z. B. via LanguageSwitcher von DE nach FR auf `/de/poster/geschenkideen-zum-muttertag`) → Falls FR-Doc für `muttertag` existiert: Redirect auf den FR-Slug derselben Anlass-Seite (`/fr/posters/idees-cadeaux-fete-des-meres`). Falls FR-Doc nicht existiert: Redirect auf `/fr/gallery#muttertag` als Fallback.
- **Slug-Kollision** zwei Sanity-Docs in derselben Locale haben denselben Slug → Sanity-Validierung verhindert das beim Speichern. Falls trotzdem auftritt (z. B. via API-Import), gewinnt das zuerst gefundene Doc; Console-Warnung im Build-Log.
- **Preset wird nach Page-ISR-Render gelöscht oder unpublished** → Page bleibt cached bis zur nächsten Revalidation (max 1h). Click auf gelöschte Card → Editor lädt Preset nicht (defensives `PresetUrlApplier`-Verhalten aus PROJ-11), kein Hard-Failure.
- **Hreflang verweist auf Locale, deren Sanity-Doc nach dem Render gelöscht wird** → Page-Cache hält bis zu 1h alte hreflang-Tags. Akzeptabel für Marketing-Seiten.
- **Marketing legt zwei Anlass-Docs für dieselbe Locale + denselben Anlass an** → Sanity-Validierung verhindert Duplikate über `(language, occasion)`-Constraint. Falls trotzdem auftritt: Doc mit ältestem `_createdAt` gewinnt, andere wird ignoriert + Console-Warnung.
- **Bot scrapet `/de/poster/<random-slug>`** → Anfrage trifft Slug-Lookup, kein Treffer → 404. Sitemap und hreflang signalisieren Google klar, welche Slugs gültig sind.
- **Sanity-Doc fehlt `metaTitle` oder `metaDescription`** → Validierung in Sanity verlangt beide Felder als Pflicht. Falls Doc trotzdem ohne Meta gespeichert ist (z. B. Legacy-Import): Fallback auf `pageTitle` bzw. erste 160 Zeichen der ersten Body-Sektion. Console-Warnung.

## Non-Goals
- **Keine automatische Übersetzung** der Body-Texte zwischen Locales. Marketing schreibt pro Locale eigenständig (oder nutzt eine Content-Agentur). Begründung: SEO-Wert kommt aus markt-spezifischem Keyword-Set, nicht aus 1:1-Übersetzung.
- **Keine Per-Anlass-Editor-Konfiguration** über die Anlass-Seite hinaus. Die Seite zeigt Presets aus der bestehenden `presets`-Tabelle; sie erstellt keine neuen Preset-Inhalte.
- **Keine A/B-Tests oder Personalisierung** in V1.
- **Kein Affiliate-/Partner-Tracking** auf der Anlass-Seite.
- **Keine eigenen Editor-Konfigurationen pro Anlass** (z. B. "Anlass Muttertag → Editor öffnet mit pinker Palette"). CTA führt in den Standard-Editor mit Default- oder vorausgewähltem Preset.
- **Keine Slug-Auto-Generierung** aus dem Anlass-Code. Marketing pflegt Slug pro Locale manuell, weil Keyword-Recherche pro Markt unterschiedlich ist.
- **Keine `/gallery/[occasion]`-Routen** als Alternative zur Anlass-Landing-Page. PROJ-11-Galerie bleibt One-Page mit Anker-Sektionen; PROJ-29-Anlass-Seiten sind die SEO-Hub-Variante daneben.
- **Keine Cross-Locale-Slug-Konflikt-Auflösung** (DE-Slug `weihnachten` und EN-Slug `weihnachten` dürfen koexistieren, weil sie auf unterschiedlichen Locale-Pfaden leben — `/de/poster/weihnachten` vs. `/en/posters/weihnachten`).
- **Keine sofortige Phase-2/3-Live-Schaltung**: EN/FR/IT/ES-Seiten werden roll-out-bar gemacht, aber V1 verlangt nur, dass die Infrastruktur für alle 5 Locales bereit ist. Live geht eine Locale erst, wenn das jeweilige DE-Doc-Pendant für alle 8 Anlässe gepflegt ist.

## Decisions (vor Architecture festgelegt)
- **Eigene Route, nicht `/gallery/[occasion]`**: klare Trennung Product-Hub (Galerie) vs. Marketing-Hub (Anlass-Seite).
- **Slug-Schema `/[locale]/poster/[slug]`** (DE/IT) bzw. `/[locale]/posters/[slug]` (EN/FR/ES) — Marketing entscheidet pro Locale, ob Singular oder Plural; Sanity-Slug-Feld lebt unter dem locale-spezifischen Segment, das in den Routing-Code eingebaut wird.
- **Slugs liegen in Sanity, nicht im Code**: Marketing pflegt eigenständig, Code kennt nur das `[slug]`-Pattern.
- **Hero-Bild pro `(Anlass × Locale)` eigenständig** (40 Bilder total) — locale-authentische Motive sprechen Märkte besser an, ist Architektur-Vorgabe vom Briefing.
- **400–600 Wörter Body-Content pro Seite** (SEO-Sweet-Spot) — kein hartes Limit, aber Marketing-Briefing.
- **Slugs sind keyword-recherchiert pro Sprache, nicht 1:1 übersetzt** — Locale-spezifische Keyword-Strategie ist SEO-Voraussetzung.
- **Empty Preset Grid → Sektion ausblenden, Rest bleibt** (Decision aus Edge-Case-Klärung).
- **Slug-Änderungen via Sanity-Feld `previousSlugs` + automatischer 301-Redirect** (Decision aus Edge-Case-Klärung).
- **Hreflang nur für live-Locales, x-default = DE** (Decision aus Edge-Case-Klärung).
- **Pro Doc nur ein Anlass + eine Locale**, keine Multi-Anlass-Docs — Eindeutigkeit per `(language, occasion)`.
- **CTA führt in Standard-Editor**, nicht in vorkonfigurierten Anlass-Editor — bewusst einfach gehalten in V1.

## Open Questions
- **Routing-Segment pro Locale**: `/de/poster/...` vs. `/en/posters/...` vs. `/fr/posters/...` vs. `/it/poster/...` vs. `/es/posters/...` — soll das Pluralisierungs-Segment pro Locale konfigurierbar sein (Sanity-`siteSettings`-Doc pro Locale), oder hardcoded im Code als Konstante? → Architektur-Phase entscheidet.
- **Body-Sektionen-Bilder**: Sollen `bodySections[]` einzelne optionale Bilder pro Sektion enthalten (zusätzlich zum Hero), oder bleibt der Body rein textuell mit Bildern via Portable-Text-Inline? → Architektur-Phase entscheidet, Tendenz: Portable-Text-Inline reicht.
- **Slug-Umbenennen-UX im Studio**: Reicht das Edit-Feld + manuelles Eintragen in `previousSlugs`, oder lohnt sich eine Sanity-Custom-Action "Slug umbenennen", die den alten automatisch in `previousSlugs` einträgt? → Architektur-Phase entscheidet, V1-Default: manuell.
- **Schema.org-Markup über FAQ hinaus**: Sollen wir `Article`-Markup für die ganze Seite ausgeben, oder reicht `FAQPage` für die FAQ-Sektion? → Architektur-Phase, Tendenz: `Article` zusätzlich, weil Body-Content redaktionell ist.
- **CTA-Tracking**: Soll der "Eigenes Poster gestalten"-Button mit UTM-Tags oder Internal-Tracking-ID versehen werden, damit Marketing CTR pro Anlass-Seite messen kann? → Falls ja: in PROJ-29 oder separat in PROJ-30 (Analytics)?

## Technical Requirements
- **Performance**: Anlass-Seite TTFB < 500 ms (ISR mit 1h-Revalidate, Sanity-Query gecacht, Supabase-Preset-Query parallelisiert mit `Promise.all`).
- **SEO-Performance**: Lighthouse-SEO-Score ≥ 95 pro Seite.
- **Accessibility**: H1/H2/H3-Hierarchie sauber, Alt-Texte aus Sanity, FAQ-Accordion keyboard-bedienbar (`<details>` oder ARIA-konformes Custom-Accordion).
- **Server-Side-Rendering**: Page ist Server Component, kein `'use client'` auf Page-Level. Card-Hover-Effekte und FAQ-Accordion via CSS / native `<details>`-Element, kein Client-Hydration nötig.
- **ISR**: `revalidate: 3600` (1h) — Marketing-Änderungen sind nicht sekundenkritisch. On-Demand-Revalidation per Sanity-Webhook ist möglicher V2-Add-on.
- **Backwards-Compatibility**: Existierende `/gallery`- und Editor-Routen werden nicht verändert. Nur additive Änderungen an `LandingFooter` (neuer Link-Block) und `GallerySection` (neuer "Mehr zum Anlass →"-Link).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Bestehende Bausteine, auf denen wir aufsetzen

Vor jeder Designentscheidung ist wichtig: das Projekt hat schon viele Patterns, die hier wiederverwendet werden — wir bauen kein neues Fundament.

| Baustein | Was es schon kann | Wo es lebt |
|---|---|---|
| **`OCCASION_CODES`-Enum** | Liste der 8 Anlässe als Single-Source-of-Truth, inkl. Locale-Anzeigenamen, Zod-Schemas, DB-CHECK-Constraint | `src/lib/occasions.ts` |
| **`presets.occasions`-Spalte** | Array-Tagging der Presets mit GIN-Index für schnelle Containment-Filter | Supabase `presets` |
| **`presets.target_locales`-Spalte** | Locale-Filter für Presets, ebenfalls GIN-indiziert | Supabase `presets` |
| **`PresetUrlApplier`** | Liest `?preset=<id>` aus URL, lädt Preset, korrigiert Cross-Type-Mismatch (`/map?preset=<star-id>` → Auto-Redirect zu `/star-map`), zeigt Toast | `src/components/editor/PresetUrlApplier.tsx` |
| **Sanity-`language`-Pattern** | Etabliertes Feld-Pattern für locale-spezifische Dokumente — bereits in 5 Schemas im Einsatz (homepage, galleryPage, aboutPage, blogPost, legalPage, faqItem) | `src/sanity/schemas/*.ts` |
| **Per-Field-Fallback-Helfer** | Fertige Query-Funktionen mit DE-Fallback (`getHomepage`, `getGalleryPage`) als Vorbild | `src/sanity/queries.ts` |
| **`next-intl`-Routing mit `localePrefix: 'always'`** | URLs immer mit `/de/`, `/en/` etc. Middleware leitet automatisch | `src/i18n/routing.ts` |
| **Marketing-Layout-Komponenten** | `LandingNav` + `LandingFooter` als Server-Komponenten, schon Sanity-fähig | `src/components/landing/` |
| **PortableText-Renderer** | Renderer für Sanity-Rich-Text inkl. Bilder/Listen/Headings — schon im Blog im Einsatz | `src/sanity/schemas/portableText.ts` + Blog-Page |

**Was wir NEU bauen:** ein neues Sanity-Schema, eine neue Route, eine neue Sanity-Query mit Slug-Lookup, eine neue Middleware-Regel für Redirect-Slugs, kleine Erweiterungen am Footer und an der Galerie.

### B) Aufbau einer Anlass-Seite (Visual Tree)

```
/[locale]/poster/[slug]   ← Beispiel: /de/poster/geschenkideen-zum-muttertag
                          ← Beispiel: /en/posters/mothers-day-gift-ideas
│
+-- LandingNav (bestehend, mit "Galerie"-Link aus PROJ-11)
│
+-- OccasionHero
│   +-- H1 (pageTitle aus Sanity)
│   +-- Sub-Headline (pageSubline, optional)
│   +-- Hero-Bild (heroImage aus Sanity, locale-spezifisch)
│
+-- OccasionBody
│   +-- 1-4 Storytelling-Sektionen
│       +-- H2 (Sub-Heading aus Sanity)
│       +-- Portable-Text-Body (Absätze, Listen, Inline-Bilder, Links)
│
+-- OccasionPresetGrid (nur wenn ≥1 Preset existiert)
│   +-- Section-Heading (i18n: "Inspiration für deine [Anlass]-Karte")
│   +-- Preset-Card-Grid (max 8-12 Cards)
│       +-- PresetCard → Link auf /[locale]/map?preset=<id>
│           bzw. /[locale]/star-map?preset=<id>
│
+-- OccasionCta
│   +-- Headline + Sub-Headline (i18n)
│   +-- Primary-Button "Eigenes Poster gestalten" → /[locale]/map
│       (bzw. /star-map falls ctaPosterType='star-map')
│
+-- OccasionFaq (nur wenn faq[] befüllt)
│   +-- H2 (i18n: "Häufige Fragen")
│   +-- Native <details>-Accordion-Liste
│   +-- JSON-LD FAQPage-Markup im <head>
│
+-- LandingFooter (bestehend, NEU mit "Anlässe"-Link-Block)
```

### C) Was wo gespeichert ist (Datenmodell in Klartext)

**Sanity (Marketing-Content):**
- Pro `(Locale × Anlass)` ein `occasionPage`-Dokument
- Felder pro Doc:
  - **Sprache** (eine der 5 Locales)
  - **Anlass-Code** (einer der 8 `OCCASION_CODES`)
  - **Slug** (URL-Bestandteil pro Locale, z. B. `geschenkideen-zum-muttertag`)
  - **Liste alter Slugs** (für 301-Redirects nach Umbenennung)
  - **Seiten-Headline (H1)** + optionale Sub-Headline
  - **Hero-Bild** (mit Hotspot + Alt-Text)
  - **Body-Sektionen-Liste** (1–4 Einträge mit Sub-Heading + Rich-Text-Body)
  - **FAQ-Liste** (optional, max 8 Frage/Antwort-Paare)
  - **Meta-Title + Meta-Description** (für SEO/`<head>`)
  - **CTA-Editor-Typ** (optional: `map` oder `star-map`, bestimmt CTA-Ziel)
- Eindeutigkeit: Sanity-Validierung erlaubt nur eine Doc-Instanz pro `(Sprache + Anlass)`-Kombination und nur einen Slug pro Sprache.

**Supabase (bestehende Daten, unverändert):**
- `presets`-Tabelle bleibt komplett unverändert.
- `occasions`-Spalte und `target_locales`-Spalte werden gelesen, nicht erweitert.

**Code-Konstanten (bestehende, unverändert):**
- `OCCASION_CODES` in `src/lib/occasions.ts` bleibt die Master-Liste.
- Für jede Locale wird im Code ein **URL-Segment-Mapping** ergänzt: `de → "poster"`, `en → "posters"`, `fr → "posters"`, `it → "poster"`, `es → "posters"`. Marketing kann das pro Locale nicht selbst ändern; Architektur-Entscheidung: Singular/Plural ist eine SEO-Konstante, kein Marketing-Content.

### D) Routing-Strategie

**Pattern:** `/[locale]/[poster-segment]/[slug]`

Drei Ebenen, von außen nach innen:

1. **`[locale]`** kommt aus `next-intl` (`always`-Prefix) → bereits gelöst, keine neue Logik.
2. **`[poster-segment]`** ist locale-abhängig (`poster` oder `posters`) → wir bauen für jede Locale einen eigenen statischen Routen-Ordner, der dieselbe Page-Komponente lädt. Begründung: nur fünf Locales, fünf Ordner sind klarer als ein Catch-All mit Locale-Abgleich. Wartungsaufwand minimal.
3. **`[slug]`** ist dynamisch → der Server-Komponenten-Page-Handler nimmt den Slug, baut Locale aus `next-intl`-Context und sucht in Sanity nach dem passenden `occasionPage`-Doc.

**Slug-Lookup-Pfad:**

```
URL kommt rein  →  Locale aus Context  +  Slug aus URL
                              │
                              ▼
              Sanity-Query: occasionPage mit
              language == locale  AND
              (slug.current == requestedSlug
               OR previousSlugs[] contains requestedSlug)
                              │
                ┌─────────────┴──────────────┐
                ▼                            ▼
     Treffer auf aktuellem Slug    Treffer in previousSlugs
                │                            │
                ▼                            ▼
       Page rendern              301-Redirect auf aktuellen Slug
                                              │
                                              ▼
                              Nach Redirect: Slug-Lookup wiederholen
                                              │
                                              ▼
                                       Page rendern

     Kein Treffer  →  notFound()  →  404
```

**301-Redirect-Implementierung:** Wir machen den Redirect direkt im Page-Handler (nicht in einer Edge-Middleware). Begründung: die `previousSlugs` leben in Sanity, müssten in einer Middleware also bei jedem Request frisch geladen werden — das wäre teuer und macht Caching schwierig. Im Page-Handler nutzen wir denselben ISR-Cache wie für den Render-Pfad — alte Slugs werden zusammen mit aktuellen geladen, Redirect ist sub-millisecond.

### E) Sanity-Query-Schema (Per-Field-Fallback ODER Hard-Fail?)

**Wichtige Designentscheidung — anders als bei Homepage/Galerie:**

Bei `homepage` und `galleryPage` greift ein **Per-Field-Fallback auf DE**: wenn FR-Hero-Bild fehlt, nutzen wir das DE-Hero-Bild. Für `occasionPage` machen wir das **bewusst NICHT**:

| Aspekt | Homepage/Galerie | Anlass-Seite |
|---|---|---|
| Locale-Verhalten bei fehlendem Doc | Per-Field-Fallback auf DE | **404** |
| Begründung | Homepage muss immer da sein, sonst rendert die ganze Seite nicht | SEO-Seite ohne Content darf nicht in Google ranken — leerer Hülsen-Output schadet mehr als 404 |
| Wer entscheidet, ob die Seite live ist | Marketing pflegt iterativ, Inhalte erscheinen automatisch | Marketing entscheidet bewusst pro Seite — Existenz des Docs = Live-Schaltung |

**Konsequenz für die Query:** Slug-Lookup gegen Sanity, ein Treffer für `(language, slug || previousSlugs)` → Doc rendern; kein Treffer → `notFound()`. Kein DE-Fallback. Phase-Rollout-Sicherheit kommt automatisch: solange das FR-Doc nicht existiert, gibt `/fr/posters/...` einen 404, hreflang verweist nicht auf FR, Sitemap listet FR nicht.

### F) Hreflang-Generation

Pro Anlass-Seite passieren beim Render serverseitig folgende Schritte:

1. Aktuelle Seite: Locale + Slug bekannt.
2. Anlass-Code aus dem aktuellen Doc auslesen.
3. Sanity-Query: alle anderen `occasionPage`-Docs mit demselben Anlass-Code, gruppiert nach Locale, mit ihren jeweiligen Slugs.
4. Pro gefundener Locale-Variante ein `<link rel="alternate" hreflang="...">` ausgeben.
5. `<link rel="alternate" hreflang="x-default" href="/de/...">` zeigt auf DE, falls DE-Doc existiert; sonst auf erste verfügbare Locale.
6. `<link rel="canonical">` zeigt auf die eigene Locale-Version.

Locales, deren Doc nicht existiert, werden nicht verlinkt. Damit bleibt das Signal an Google sauber, auch im Phase-1-Rollout (nur DE live).

### G) Sitemap-Integration

Die bestehende `sitemap.xml`-Logik wird um eine zusätzliche Schleife erweitert: für jeden Anlass-Code wird über die 5 Locales gescannt und nur Einträge mit existierendem Sanity-Doc aufgenommen. Pro Eintrag werden hreflang-Verweise zu Locale-Varianten als `<xhtml:link>`-Subelemente ergänzt — Standard-Sitemap-Pattern für mehrsprachige Seiten.

### H) Cross-Linking (Galerie + Footer)

**Galerie-Sections (`GallerySection.tsx`):** bekommt einen optionalen "Mehr zum Anlass →"-Link, der nur sichtbar ist, wenn für diesen Anlass eine Anlass-Seite in der aktuellen Locale existiert. Existenz-Prüfung passiert beim Galerie-Render serverseitig (eine zusätzliche Sanity-Query: "welche Anlass-Slugs existieren in dieser Locale?", einmal für die ganze Galerie, kein N+1-Problem).

**`LandingFooter`:** bekommt einen neuen Link-Block "Anlässe" mit Links zu allen Anlass-Seiten der aktuellen Locale, deren Sanity-Doc existiert. Wieder per Sanity-Query beim Footer-Render — der Footer ist Server-Komponente, lädt die Liste einmalig pro Page-Render. Bei 8 Anlässen × 1 Locale = max 8 Slugs zu laden; ISR-Cache fängt Wiederholungen ab.

### I) ISR / Caching

| Page-Element | Caching-Strategie |
|---|---|
| Anlass-Seiten-Render | ISR mit 1h-Revalidate (`revalidate = 3600`), wie Homepage/Galerie |
| Slug-Lookup beim Page-Render | Im selben Cache wie Page-Render (eine Query pro Page-ISR-Build) |
| hreflang-Locale-Varianten-Lookup | Im selben Cache (eine Query pro Page-ISR-Build) |
| Sitemap-Generation | Eigener ISR-Cache (z. B. `revalidate = 3600`), regeneriert bei Bedarf |
| Galerie "Mehr zum Anlass"-Existenz-Lookup | Im Galerie-ISR-Cache (1h) |
| Footer "Anlässe"-Link-Liste | Im Page-ISR-Cache (jede Page hat ihren eigenen Footer-Render-Pfad) |

**Marketing-Änderung im Studio → Auswirkung:** max 1h Lag, dann frischer ISR-Build. Wenn das später nicht reicht, ist On-Demand-Revalidation per Sanity-Webhook ein minimaler Add-on (siehe Phase 6, optional).

### J) Phasen-Reihenfolge (Bauplan)

```
Phase 1: Sanity-Schema + Studio-Setup (Backend)
   +-- Schema occasionPage anlegen
   +-- Slug-Validierung (Format + Eindeutigkeit pro Locale)
   +-- previousSlugs-Validierung (kein Eintrag = aktueller Slug)
   +-- Studio-Structure-Eintrag "Anlass-Seiten (pro Sprache)"
            |
            v
Phase 2: Sanity-Queries + URL-Segment-Konstante (Backend)
   +-- getOccasionPageBySlug(locale, slug)
   +-- getOccasionPageVariants(occasion) → Locale → Slug-Map fuer hreflang
   +-- listOccasionPagesForLocale(locale) → fuer Footer und Galerie-Cross-Link
   +-- listAllOccasionPages() → fuer Sitemap
   +-- URL-Segment-Konstante pro Locale (poster/posters)
            |
            v
Phase 3: Anlass-Seite Frontend
   +-- /[locale]/poster/[slug] und /[locale]/posters/[slug] Routes
   +-- Page-Komponente: Slug-Lookup, 301-Redirect-Logik, notFound()
   +-- OccasionHero, OccasionBody, OccasionPresetGrid, OccasionCta, OccasionFaq Komponenten
   +-- generateMetadata (Title, Description, OG, Twitter, Canonical, Hreflang)
   +-- Schema.org-FAQPage-JSON-LD bei vorhandenem FAQ
            |
            v
Phase 4: Cross-Linking + Sitemap
   +-- LandingFooter: Anlaesse-Link-Block
   +-- GallerySection (PROJ-11): "Mehr zum Anlass" Link bei existenter Anlass-Seite
   +-- sitemap.xml: Anlass-Seiten + hreflang-Subelemente
            |
            v
Phase 5: i18n-Strings + Verifikation
   +-- Page-Level-Strings in allen 5 Locales (occasionPage-Namespace + nav.occasions)
   +-- Smoke-Test pro Locale (404 ohne Doc, Render mit Doc, Redirect alter Slug)
   +-- SEO-Audit (Lighthouse, hreflang validator, Schema.org-Rich-Results-Test)
            |
            v
Phase 6 (optional, V2): On-Demand-Revalidation
   +-- Sanity-Webhook auf occasionPage-Aenderung
   +-- /api/revalidate-occasion-page-Endpoint
   +-- nur wenn 1h-Lag in der Praxis stoert
```

**Reihenfolge-Hinweis:** Phase 3 (Frontend) kann erst deployen, wenn Phase 2 (Queries) steht. Phase 4 (Cross-Linking) deployt sicher, sobald mindestens das DE-Doc für mindestens einen Anlass im Sanity gepflegt ist — vorher zeigt der Footer-Link-Block nichts an, bricht aber nichts. Phase 5 ist redaktionelle Begleitung und kann parallel laufen.

### K) Tech-Entscheidungen mit Begründung

| Entscheidung | Begründung |
|---|---|
| **Eigenes Sanity-Schema `occasionPage`** statt Erweiterung von `blogPost`/`aboutPage` | Eigenständige Felder (occasion-Code, FAQ, CTA-Editor-Typ) und eindeutiges Mental-Model für Marketing. Studio-Trennung ist sauberer. |
| **Slug in Sanity, nicht im Code** | Marketing soll pro Locale Keyword-recherchieren und ändern können, ohne Code-Deploy. Slug-Eindeutigkeit per Sanity-Validierung sichergestellt. |
| **`previousSlugs`-Array statt eigene Redirect-Tabelle** | Hält die Information lokal beim Doc, kein zweiter Datenort, einfache Marketing-UX. |
| **301-Redirect im Page-Handler statt Edge-Middleware** | Sanity-Daten sind im Page-ISR-Cache; Edge-Middleware müsste sie pro Request neu laden. Page-Handler-Lösung ist schneller und einfacher. |
| **Kein DE-Per-Field-Fallback wie bei Homepage** | SEO-Seite ohne markt-spezifischen Content ist schädlicher als 404. Locale-Existenz steuert Live-Schaltung, das ist hier explizit gewünscht. |
| **URL-Segment `poster` vs `posters` als Code-Konstante**, nicht in Sanity | Routing-Konvention, keine Marketing-Entscheidung. Pro Locale ein eigener Routen-Ordner mit identischer Page-Komponente — fünf Ordner sind übersichtlicher als ein Catch-All. |
| **Statische Routen-Ordner pro Locale-Segment** statt dynamic Catch-All | next-intl-Routing erwartet bekannte Pfade. Catch-All würde die Konvention brechen und bei Routing-Konflikten zu Fehlern führen. |
| **ISR mit 1h-Revalidate** (statt SSG mit Webhook) | Marketing-Updates sind nicht sekundenkritisch. Webhook-Revalidation ist V2-Add-on, falls Lag in der Praxis stört. |
| **Hreflang-Lookup zusätzliche Sanity-Query**, nicht mit Page-Doc kombiniert | Ein Anlass-Doc kennt seine Geschwister nicht — wir brauchen eine separate Query. Im selben ISR-Cache, also kein Performance-Issue. |
| **Empty Preset-Grid → Sektion ausblenden** | Storytelling-Wert bleibt erhalten, kein "Trostpreis"-Empty-State, Seite wirkt fertig kuratiert. |
| **Wiederverwendung `LandingNav`/`LandingFooter`** | Konsistenz mit Homepage und Galerie, keine doppelte Wartung. |
| **Wiederverwendung `PresetUrlApplier`** | Cross-Type-Redirect, Toast-Pattern, URL-Cleanup sind schon gelöst. Cards verlinken einfach auf `/map?preset=<id>` — fertig. |
| **PortableText-Renderer wiederverwendet** | Schon im Blog im Einsatz, gleiche Patterns für Bilder/Listen/Headings/Links. |
| **Native `<details>`-Element für FAQ** statt Custom-Accordion-Komponente | Keyboard-bedienbar by default, kein Client-JS nötig, kleiner Bundle, A11y by default. |
| **Schema.org-FAQPage als JSON-LD im `<head>`** | Standard für Google Rich Results, einfacher zu pflegen als Mikrodaten in den DOM-Elementen. |
| **`Article`-Schema-Markup zusätzlich** (offene Frage aus Spec → Entscheidung: ja) | Anlass-Seite ist redaktionell, Article-Markup verbessert Crawler-Verständnis. JSON-LD im `<head>` analog zur FAQ. |

### L) Neue Dateien / berührte Dateien (Übersicht)

```
src/
+-- sanity/
|   +-- schemas/
|   |   +-- occasionPage.ts           NEU: Schema mit Slug-Validierung + previousSlugs
|   +-- schema.ts                     ergänzt (Schema-Liste)
|   +-- structure.ts                  ergänzt (Studio-Eintrag)
|   +-- queries.ts                    ergänzt (4 neue Query-Helfer)
|
+-- lib/
|   +-- occasion-routing.ts           NEU: URL-Segment pro Locale (poster/posters)
|
+-- app/[locale]/
|   +-- poster/[slug]/page.tsx        NEU: Page für DE/IT
|   +-- posters/[slug]/page.tsx       NEU: Page für EN/FR/ES (gleiche Implementierung)
|   +-- sitemap.ts                    ergänzt (oder neu, falls noch nicht vorhanden)
|
+-- components/
|   +-- landing/
|       +-- OccasionHero.tsx          NEU
|       +-- OccasionBody.tsx          NEU
|       +-- OccasionPresetGrid.tsx    NEU
|       +-- OccasionCta.tsx           NEU
|       +-- OccasionFaq.tsx           NEU (mit FAQPage-JSON-LD)
|       +-- LandingFooter.tsx         ergänzt (Anlässe-Link-Block)
|       +-- GallerySection.tsx        ergänzt (Mehr zum Anlass-Link)
|
+-- locales/
    +-- de.json, en.json, fr.json, it.json, es.json   ergänzt (occasionPage-Namespace + nav)
```

### M) Abhängige Packages

**Keine neuen Dependencies.** Alle Bausteine sind bereits installiert:
- `next-sanity` + `@sanity/image-url` — Sanity-Queries und Image-URLs
- `@portabletext/react` — Rich-Text-Render im Body
- `next-intl` — Locale-Routing und `getLocale()` im Server-Render
- `next/image` — optimierte Bilder

### N) Risiken & offene Punkte

- **Marketing-Onboarding:** Die Anlass-Seiten gehen erst live, wenn Marketing pro `(Locale × Anlass)` ein Sanity-Doc pflegt. Das sind im Phase-1-Rollout 8 DE-Docs + 8 DE-Hero-Bilder + 8 DE-Slug-Recherchen. Mitigation: vor Phase-3-Deploy einen redaktionellen Briefing-Termin mit Marketing — bzw. der Solo-Betrieb plant das selbst ein.
- **Slug-Konflikt mit anderen App-Routen:** `poster/abc` darf nicht mit anderen Routen kollidieren (z. B. wenn später `/[locale]/poster/...`-Listen-Seite kommt). Mitigation: Routing-Konvention dokumentieren, in der Sitemap/Robots-Sicht regelmäßig validieren.
- **Hreflang-Vollständigkeit:** Wenn Marketing ein einzelnes Anlass-Doc löscht, brechen Hreflang-Verweise von anderen Locales darauf. Mitigation: 1h-ISR-Lag absorbiert das, danach saubere Verweise.
- **`previousSlugs`-Pflege:** Marketing muss daran denken, alte Slugs einzutragen, sonst gehen 301-Chancen verloren. Mitigation: Studio-Description-Hinweis am Feld, Onboarding-Doku. V2-Idee: Custom-Studio-Action "Slug umbenennen", die das automatisch macht — nicht V1.
- **CTA-Editor-Typ:** Wenn `ctaPosterType` nicht gesetzt ist, gehen alle CTAs in den Map-Editor. Für Sternenkarten-Anlässe muss Marketing das umstellen. Mitigation: Default = `map`, Studio-Description erklärt die Wirkung.
- **Slug-Format pro Locale:** Sonderzeichen (Umlaute, Akzente) in Slugs sind unschön für SEO; Sanity-Slug-Validierung normalisiert (`a-z0-9-`). Marketing kann Akzente in der UI eingeben, aber die Validierung lehnt sie ab. Mitigation: Studio-Description nennt das erlaubte Format.
- **Volume bei vielen Anlass-Seiten:** 8 Anlässe × 5 Locales = 40 Seiten. Sitemap und hreflang-Generation müssen das verkraften — bei 40 Einträgen unkritisch, aber bei späterer Erweiterung (z. B. Per-Stadt-Seiten) nochmal prüfen.
- **Cross-Type-Presets in der Galerie-Card:** Eine `geburt`-Anlass-Seite zeigt sowohl Map- als auch Star-Map-Presets. Beide sind via `PresetUrlApplier` automatisch korrekt geroutet, aber der CTA-Button zeigt nur in EINEN Editor. Akzeptiert: Kunde kann den anderen Typ via Card-Klick erreichen.


## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

# PROJ-42: Programmatic City Landing Pages (SEO-Stadtkarten-Hubs)

## Status: Architected
**Created:** 2026-05-10
**Last Updated:** 2026-05-10

## Dependencies
- **Requires PROJ-1** (Karten-Editor Core) — CTA leitet in den Map-Editor mit vorgeladener Stadt + Style.
- **Requires PROJ-13** (Content CMS / Sanity) — neues Sanity-Schema `cityPage` lebt im bestehenden Sanity-Setup, folgt dem `language`-Feld-Pattern.
- **Requires PROJ-20** (Internationalisierung) — Locale-Routing, `getLocale()`/`useLocale()`, `[locale]/`-Struktur sind Voraussetzung.
- **Requires PROJ-30** (Preset-Render-Pipeline) — Bulk-Render der Hero-Visuals pro Stadt × Style. Ohne PROJ-30 keine Skalierung der Stadt-Visuals.
- **Soft-Dependency PROJ-29** (Anlass-Landing-Pages) — gleiches Routing/Sanity/i18n-Pattern, hreflang-Logik kann wiederverwendet werden.
- Berührt PROJ-11 (`LandingFooter` bekommt einen "Stadtkarten"-Link-Block) und PROJ-14 (Blog) optional als Internal-Linking-Quelle.

## Problem & Ziel
Suchanfragen wie `stadtkarte hamburg`, `stadtkarte berlin`, `karte münchen poster` haben hohes Volumen und kommerzielle Kaufabsicht. Aktuell rankt für diese Long-Tails niemand bei petite-moment — wir verschenken den Hauptmarkt-SEO-Traffic an Etsy, Mapiful, Mr. Maps & Co.

PROJ-42 baut **eine programmatische Landing-Page-Infrastruktur**, die pro Stadt eine eigenständige, keyword-optimierte Seite ausliefert — mit:
- **einzigartigem visuellem Asset** (3 Style-Renders der Stadt aus PROJ-30-Pipeline)
- **stadt-spezifischem Body-Content** (~200–300 Wörter, AI-Draft + Marketing-Review im Sanity)
- **klarem CTA** in den Editor mit vorgeladener Stadt + ausgewähltem Style
- **internem Linking** zu verwandten Städten + bestehenden Anlass-Seiten + Blog

**Strategisch wichtig:** Pure Programmatic mit Template-Fill-in (nur Name + Map-Bild austauschen) rankt seit ~2023 nicht mehr — Google klassifiziert das als Thin Content. Jede Stadt-Seite muss daher ein **einzigartiges visuelles Asset (= Auto-Render aus PROJ-30) UND einen einzigartigen Text-Block (= AI-Draft + manuelles Review)** haben. Sanity-Doc fehlt → Seite gibt 404. Diese Marketing-Gate-Logik (analog PROJ-29) ist die Garantie gegen Google-Penalty.

PROJ-42 baut bewusst auf der Architektur von PROJ-29 (Anlass-Seiten) auf:
- Gleiche Sanity-Pattern (locale-spezifische Docs, slug + previousSlugs, manuelles Live-Schalten via Doc-Existenz).
- Gleiche hreflang-Strategie (nur live-Locales verlinkt, x-default = DE).
- Gleiches CTA-Modell (CTA in den passenden Editor, hier: nur Map-Editor, kein Star-Map).

## User Stories
- Als Kund:in, der/die nach `stadtkarte hamburg` googelt, möchte ich auf einer Seite landen, die mir Hamburg in 3 Stilen zeigt, mich emotional abholt und mit einem Klick in den Editor mit Hamburg vorgeladen führt.
- Als Kund:in möchte ich auf der Stadt-Seite einen **Style-Picker** sehen (z. B. "Modern Schwarz", "Vintage Sepia", "Minimalist Weiß") und beim Klick direkt im Editor mit meinem Wunsch-Style + meiner Stadt landen — keine Style-Auswahl mehr im Editor.
- Als französische:r / englischsprachige:r Besucher:in möchte ich eine Stadt-Seite in meiner Sprache sehen — mit Locale-spezifischen Slugs (z. B. `/en/city-map/city-map-london`) und Locale-spezifischem Body-Text.
- Als Marketing-Verantwortliche:r möchte ich eine **Liste deutscher Top-Städte** in der Datenbank pflegen (Geocode, Bevölkerung, Bundesland) — getrennt vom redaktionellen Body-Content im Sanity, weil Stadt-Liste skaliert (100+) und das Studio-CMS nicht.
- Als Marketing-Verantwortliche:r möchte ich pro Stadt einen **AI-Body-Draft per Klick** generieren lassen ("Wahrzeichen, Geschichte, Stadtviertel"), den ich dann im Sanity reviewen und freigeben kann — manuelles Schreiben pro Stadt skaliert nicht.
- Als Marketing-Verantwortliche:r möchte ich phasenweise rollen können (Phase 1: 10 DE-Städte; Phase 2: 30+; Phase 3: weitere Locales) — pro Locale × Stadt unabhängig live schaltbar.
- Als SEO-Verantwortliche:r möchte ich **Slugs pro Locale keyword-optimiert** vergeben (`stadtkarte-hamburg` statt nur `hamburg`) und nachträglich umbenennen können, ohne Link-Saft zu verlieren — alte Slugs leiten 301 weiter.
- Als Stadt-Seiten-Besucher:in möchte ich am Ende der Seite eine **"Weitere Stadtkarten"**-Sektion sehen mit 6 verwandten Städten (gleiche Region/Land, ähnliche Größe), damit ich weiterstöbern kann ohne erneut zu googeln.
- Als Galerie- oder Blog-Besucher:in möchte ich auch **Footer-Links zu den Top-Stadt-Seiten** sehen, damit Internal Link Equity verteilt wird.

## Acceptance Criteria

### Scope V1 & Phasen-Rollout
- [ ] V1-Launch-Kriterium: **Infrastruktur + 10 DE-Stadt-Seiten live** in Phase 1: Berlin, Hamburg, München, Köln, Frankfurt am Main, Stuttgart, Düsseldorf, Leipzig, Dresden, Nürnberg.
- [ ] Phase 2 (nach V1): Erweiterung auf 30–50 weitere DE-Städte (kein Code-Deploy nötig, nur DB-Insert + Sanity-Doc-Pflege).
- [ ] Phase 3 (nach V2): EN-Locale-Rollout (Top-30 internationale Städte für englischsprachige Märkte).
- [ ] Phase 4 (später): FR/IT/ES nach Marketing-Kapazität.
- [ ] Pro `(Locale × Stadt)` kann **maximal eine** Sanity-Doc-Instanz existieren.
- [ ] Stadt-Seite ist **nur live, wenn das Sanity-Doc in der Locale existiert** — fehlt das Doc, gibt die Route 404, taucht nicht in Sitemap auf, hreflang verweist nicht darauf.

### Stadt-Inventar (Supabase)
- [ ] Neue Tabelle `cities` mit Spalten:
  - `id` (UUID, PK)
  - `slug_base` (String, eindeutig pro Land — z. B. `hamburg`, `berlin`; URL-safe lowercase)
  - `name` (String, Anzeigename — z. B. "Hamburg", "München")
  - `country_code` (String 2-Char ISO — `DE`, `AT`, `CH`, `FR`, `IT`, `ES`, `GB`, `US`, …)
  - `region` (String, optional — Bundesland/Region für "Verwandte Städte"-Logik)
  - `latitude` (numeric, für Geocoding-Pre-Load im Editor)
  - `longitude` (numeric, für Geocoding-Pre-Load im Editor)
  - `population` (integer, für Sortier-/Auswahl-Logik)
  - `aliases` (Array<String>, optional — z. B. `["Frankfurt am Main", "Frankfurt/Main"]` für Disambiguierung)
  - `created_at`, `updated_at` (timestamptz)
- [ ] Index auf `country_code`, `region` für Verwandte-Städte-Queries.
- [ ] `slug_base` ist eindeutig pro `(country_code)` — zwei Hamburgs in DE wäre invalid; Hamburg-DE und Hamburg-US dürfen koexistieren.
- [ ] RLS-Policy: Anonymous SELECT erlaubt (Stadt-Liste ist öffentlich); INSERT/UPDATE nur für Admin (Service-Role).
- [ ] Seed-Daten: 10 DE-Phase-1-Städte initial via Migration (mit korrekten Geocodes von MapTiler-Geocoding-API).

### Sanity-Schema `cityPage`
- [ ] Neues Schema `cityPage` mit folgenden Feldern:
  - `language` (Pflicht, Locale-Code aus `de|en|fr|it|es`) — folgt PROJ-29-Pattern.
  - `cityId` (Pflicht, Reference oder String-FK auf `cities.id` — exakte Bindung TBD in Architecture).
  - `slug` (Pflicht, String, slug-format-validiert) — keyword-reicher Slug pro Locale (z. B. `stadtkarte-hamburg`, `city-map-london`).
  - `previousSlugs` (optional, Array von Strings) — für 301-Redirects nach Umbenennung.
  - `pageTitle` (Pflicht, String) — H1 der Seite (z. B. "Stadtkarte Hamburg als Poster").
  - `pageSubline` (optional, String) — Sub-Headline unter H1.
  - `bodySections[]` (Pflicht, 1–4 Einträge) — Storytelling-Sektionen mit Sub-Heading + Portable-Text-Body. Ziel-Wortmenge gesamt: ~200–300 Wörter.
  - `metaTitle` (Pflicht, String, max 60 Zeichen) — `<title>` und OG-Title (z. B. "Stadtkarte Hamburg als Poster — personalisiert ab €X | petite-moment").
  - `metaDescription` (Pflicht, String, max 160 Zeichen) — konkretes Versprechen mit Format/Versand/CTA-Hook.
  - `aiDraftStatus` (optional, String enum `draft|reviewed|published`) — Marketing-Workflow-Status, default `draft` nach AI-Generation.
- [ ] Studio-Structure-Eintrag "Stadt-Seiten" gruppiert die Dokumente sichtbar nach Locale + Stadt.
- [ ] Validierung: Slug-Format (`^[a-z0-9-]+$`), keine Slug-Duplikate pro Locale, `previousSlugs` enthält keinen Eintrag, der dem aktuellen `slug` entspricht.
- [ ] Eindeutigkeits-Constraint: `(language, cityId)` darf nur einmal vorkommen.

### Routing & Slugs
- [ ] Routing-Pattern pro Locale:
  - DE: `/de/stadtkarte/[slug]` (z. B. `/de/stadtkarte/stadtkarte-hamburg`)
  - EN: `/en/city-map/[slug]` (z. B. `/en/city-map/city-map-london`)
  - FR: `/fr/carte-de-ville/[slug]` (z. B. `/fr/carte-de-ville/carte-de-paris`)
  - IT: `/it/mappa-citta/[slug]`
  - ES: `/es/mapa-ciudad/[slug]`
- [ ] Slug-Pattern V1: `stadtkarte-{cityname}` (DE), `city-map-{cityname}` (EN), `carte-de-{cityname}` (FR), etc. — Keyword-Front-Loading. Marketing kann pro Stadt im Sanity überschreiben.
- [ ] URL-Segment pro Locale ist Code-Konstante, nicht Sanity-Feld (analog PROJ-29-Entscheidung).
- [ ] 301-Redirect: Anfragen auf einen Slug aus `previousSlugs` werden auf den aktuellen Slug umgeleitet (Implementierung im Page-Handler, gleicher Mechanismus wie PROJ-29).
- [ ] Anfragen auf nicht existierende Slugs (kein aktueller, kein previous) geben 404.

### Hero-Render-Pipeline (PROJ-30-Integration)
- [ ] Admin-UI-Erweiterung: "Stadt-Renders generieren"-Button pro Stadt, der für die 3 global definierten Featured-Styles je ein Hero-Poster rendert (3 Renders pro Stadt-Aufruf).
- [ ] **3 Featured-Styles** sind global im Code/Admin-Setting definiert (z. B. `modern-black`, `vintage-sepia`, `minimalist-white`) — nicht pro Stadt unterschiedlich. Konfiguration via Admin-Settings-Tabelle oder Code-Konstante (Architecture-Phase entscheidet).
- [ ] Rendering-Output landet in Supabase Storage unter Pfad-Schema z. B. `city-renders/{cityId}/{styleId}.png`.
- [ ] Stadt-Render-Tabelle (oder JSON-Spalte auf `cities`) hält pro `(cityId × styleId)` die Storage-URL.
- [ ] Render-Job ist **idempotent**: erneuter Aufruf überschreibt das vorherige Bild (für Style-Updates oder neue Format-Variante).
- [ ] Bulk-Trigger: Admin-UI-Button "Alle Phase-1-Renders generieren" startet alle 30 Renders (10 Städte × 3 Styles) als Background-Job.
- [ ] Render-Status-Sichtbarkeit: pro Stadt sieht der Admin, welche der 3 Styles bereits gerendert sind (Status-Indikator).
- [ ] Stadt-Seite rendert Hero-Picker nur, wenn alle 3 Renders existieren — fehlt einer, ist die Stadt-Seite **nicht live** (Doc-Existenz allein reicht nicht; auch Visuals müssen da sein, sonst 404 oder Build-Fehler — Architecture-Phase entscheidet).

### Body-Content-AI-Draft-Pipeline
- [ ] Admin-UI: "Body-Draft generieren"-Button pro Stadt × Locale, der eine LLM-API (Claude oder OpenAI) mit einem Prompt-Template aufruft:
  - Input: Stadt-Name, Land, Bevölkerung, Region, Locale.
  - Prompt-Template definiert Body-Sektionen (z. B. "Wahrzeichen", "Geschichte & Charakter", "Stadtviertel & Atmosphäre"), ~200–300 Wörter total.
  - Output: strukturiertes JSON mit Sub-Heading + Body-Text pro Sektion + Vorschlag für `pageTitle`, `pageSubline`, `metaTitle`, `metaDescription`.
- [ ] Generierter Draft wird **automatisch in das Sanity-Doc geschrieben** (oder als Sanity-Draft, das Marketing freigibt — Architecture-Phase entscheidet zwischen "direkt in Doc" vs. "Sanity-Draft-Mechanismus").
- [ ] `aiDraftStatus`-Feld im Sanity-Doc startet bei `draft`, Marketing setzt es nach Review auf `reviewed`. Sanity-Doc gilt als "live" auch ohne `reviewed`-Status — die Sichtbarkeit hängt nur an Doc-Existenz, nicht am Status. Status ist Marketing-internes Tracking-Tool.
- [ ] Re-Generation möglich: erneuter Draft-Klick überschreibt nur, wenn Marketing das im UI bestätigt (Schutz vor Verlust manueller Edits).
- [ ] LLM-Cost-Schutz: Admin-UI zeigt Token-/Cost-Schätzung vor Bulk-Generation.

### Seiten-Aufbau (Frontend)
- [ ] Seiten-Layout (Server Component, ISR mit 1h-Revalidate):
  1. `LandingNav` (bestehend)
  2. **Hero-Sektion** — `pageTitle` (H1), optional `pageSubline`, **Style-Picker mit 3 Render-Cards** (jeder Card zeigt eines der 3 Styles dieser Stadt; bei Hover/Selection visuell hervorgehoben). Cards sind klickbar → CTA in den Editor mit Stadt + ausgewähltem Style.
  3. **Body-Sektionen** — pro Eintrag in `bodySections[]` ein Block mit Sub-Heading (H2) + Portable-Text-Body.
  4. **CTA-Block** — primärer Button "Eigene Stadtkarte gestalten" → `/[locale]/map?city={cityId}&style={selectedStyleId}` (Default-Style: erster im Style-Picker, falls User nicht klickt).
  5. **"Weitere Stadtkarten"-Sektion** — 6 Cards verwandter Städte. Auswahl-Logik: Same `country_code` + `region` falls vorhanden, sortiert nach `population` DESC; Fallback auf Same-Country wenn Region nichts liefert. Cards verlinken auf jeweilige Stadt-Seite in derselben Locale; falls Ziel-Locale-Doc nicht existiert, Card wird ausgeblendet.
  6. `LandingFooter` (bestehend, NEU mit "Stadtkarten"-Link-Block — siehe Cross-Linking).
- [ ] Style-Picker rendert die 3 Storage-URLs als `next/image` mit `loading="eager"` für die initial sichtbare Card, `lazy` für die anderen.
- [ ] Style-Picker-Selection ist **client-side state** (kein Page-Reload), CTA-Button-Link aktualisiert sich entsprechend.

### Editor-Handoff
- [ ] CTA-Link-Format: `/[locale]/map?city={cityId}&style={styleId}`.
- [ ] Editor-Page liest `?city=`-Param, lädt aus `cities`-Tabelle Geocode + Anzeigename, setzt Map-Center entsprechend, rendert Map.
- [ ] Editor-Page liest `?style=`-Param, wendet entsprechenden Style direkt an (analog `PresetUrlApplier`-Pattern, eventuell als neuer Mechanismus oder Erweiterung — Architecture-Phase).
- [ ] Falls `cityId` oder `styleId` ungültig: Editor lädt Default-State + zeigt Toast "Stadt/Style konnte nicht geladen werden". Kein Hard-Failure.
- [ ] URL-Cleanup nach Editor-Apply (analog `PresetUrlApplier`): `?city=` und `?style=` werden aus URL entfernt nach erfolgreichem Apply, damit Reload nicht erneut triggert.

### SEO-Anforderungen
- [ ] Pro Seite werden gesetzt: `<title>` (aus `metaTitle`), `<meta name="description">` (aus `metaDescription`), Open Graph (`og:title`, `og:description`, `og:image` aus erstem Hero-Render, `og:type=article`), Twitter Card (`summary_large_image`).
- [ ] **Hreflang-Tags**: für jede Stadt-Seite werden nur Locales verlinkt, deren `cityPage`-Doc existiert. `x-default` zeigt auf die DE-Variante (Hauptmarkt), falls vorhanden; sonst auf die erste verfügbare Locale.
- [ ] **Canonical-Tag** zeigt auf die eigene Locale-Version der Seite.
- [ ] Schema.org-Markup: `BreadcrumbList` (Home > Stadtkarten > {Stadt}) + `Place` (Stadt mit Geocode) als JSON-LD im `<head>`.
- [ ] Sitemap (`/sitemap.xml`) listet alle Stadt-Seiten aller Locales mit existierendem Sanity-Doc auf, inkl. `<xhtml:link hreflang="...">`-Verweisen zu Locale-Varianten.
- [ ] Lighthouse-SEO-Score ≥ 95 pro Seite.
- [ ] Page-Performance: TTFB < 500 ms (ISR mit 1h-Revalidate, Sanity-Query gecacht, Storage-URLs als CDN-Asset).

### Cross-Linking
- [ ] **`LandingFooter`** (PROJ-11) bekommt einen neuen Link-Block "Beliebte Stadtkarten" mit Links zu den Top-6-Stadt-Seiten der aktuellen Locale (sortiert nach `population`, gefiltert auf existierende Sanity-Docs).
- [ ] **Anlass-Seiten (PROJ-29)** bekommen optional einen "Beliebte Stadtkarten"-Block am Ende — Architektur-Phase entscheidet, ob V1 oder V2.
- [ ] **Blog-Posts (PROJ-14)**: Internal Linking ist redaktionelle Aufgabe, kein Code-Feature. Marketing verlinkt manuell aus Blog-Texten auf Stadt-Seiten.
- [ ] Ein Galerie-Cross-Link (PROJ-11) ist **nicht** Teil von V1 — Galerie ist Anlass-getrieben, keine offensichtliche Stadt-Verknüpfung.

### i18n
- [ ] Page-Level-Strings (Style-Picker-Heading, "Eigene Stadtkarte gestalten"-CTA, "Weitere Stadtkarten"-Section-Heading, "Beliebte Stadtkarten"-Footer-Block-Heading) in allen 5 Locale-JSONs (`src/locales/{de,en,fr,it,es}.json`) unter Namespace `cityPage` und `nav`.
- [ ] Stadt-spezifischer Content (`pageTitle`, `pageSubline`, `bodySections`, `metaTitle`, `metaDescription`) kommt **ausschließlich aus Sanity** — keine Hardcoded-Fallbacks.
- [ ] Route-Segment-Mapping (`stadtkarte`/`city-map`/`carte-de-ville`/`mappa-citta`/`mapa-ciudad`) als Code-Konstante.

## Edge Cases
- **Stadt im DB, kein Sanity-Doc in Locale** → Route gibt 404, taucht nicht in Sitemap, hreflang verweist nicht darauf. Identisch zu PROJ-29.
- **Sanity-Doc existiert, aber Hero-Renders fehlen (PROJ-30 noch nicht durchgelaufen)** → Stadt-Seite gibt 404 oder rendert mit Placeholder-Bildern? **Decision: 404, weil Visuals integral zum SEO-Wert sind.** Architecture-Phase verfeinert Implementation.
- **User ruft alten Slug auf, der jetzt in `previousSlugs` steht** → 301-Redirect auf neuen Slug.
- **Stadt-Slug-Kollision zwischen Locales** (z. B. DE-`stadtkarte-koeln` und EN-`city-map-cologne` für dieselbe `cities.id`) → koexistieren auf unterschiedlichen Locale-Pfaden, kein Konflikt.
- **Disambiguierungs-Stadt-Namen** (Frankfurt am Main vs. Frankfurt an der Oder; Springfield US-mehrfach) → `cities.aliases`-Feld + eindeutige `slug_base` pro `(country_code)`. Marketing entscheidet bewusst, welche Frankfurt zuerst eine Seite bekommt; die andere bekommt eine eigene mit disambiguiertem Slug-Base (z. B. `frankfurt-am-main` vs. `frankfurt-oder`).
- **AI-Draft erzeugt Halluzinationen / Fakten-Fehler** → Marketing-Review ist Pflicht-Schritt vor Live-Schaltung. `aiDraftStatus`-Feld trackt das, ist aber nicht hart durchgesetzt — Marketing kann theoretisch ohne Review live schalten. Mitigation: Studio-Onboarding-Doku + Hinweis im Doc.
- **AI-Draft enthält generische Floskeln, die Google als Boilerplate erkennt** → Risiko-Mitigation: Prompt-Template fordert konkrete Stadt-Spezifika (Wahrzeichen-Namen, Stadtviertel-Namen). Bei AI-Generation wird Output stichprobenartig auf Boilerplate-Patterns geprüft (V2-Add-on, V1: Marketing-Review fängt das).
- **User wechselt Locale auf einer Stadt-Seite** (z. B. DE → FR auf `/de/stadtkarte/stadtkarte-hamburg`) → Falls FR-Doc für Hamburg existiert: Redirect auf FR-Slug derselben Stadt. Falls FR-Doc nicht existiert: Redirect auf `/fr/` (Homepage), nicht auf eine 404-Seite.
- **Verwandte-Städte-Sektion findet < 6 passende Städte** (z. B. nur 3 weitere Städte in derselben `region`) → Auffüllen mit Top-Cities aus demselben Land bis 6 erreicht. Falls auch das nicht reicht: zeige nur was vorhanden ist (kein Padding mit fremden Ländern).
- **Stadt aus DB gelöscht, Sanity-Doc bleibt** → Sanity-Doc verweist auf nicht-existente `cityId` → Build-Fehler oder 404 mit Warning. Mitigation: Studio-Custom-Action verhindert City-Delete bei aktiver Sanity-Reference (V2); V1: Marketing-Disziplin.
- **Render-Pipeline fällt aus, alte Renders bleiben** → Stadt-Seite zeigt veraltete Renders. Akzeptiert für 1h-ISR-Lag; bei längerem Pipeline-Ausfall Marketing-Eingriff nötig.
- **Bot scrapet `/de/stadtkarte/<random-slug>`** → 404. Sitemap signalisiert klar valide Slugs.
- **Editor erhält `?city=invalid-uuid`** → Toast + Default-Editor-State.
- **AI-Generation-API fällt aus oder ist rate-limited** → Admin-UI zeigt Fehler, Marketing kann manuell schreiben oder später retry-en.
- **Slug-Änderung ohne `previousSlugs`-Eintrag** → alter Slug gibt 404, SEO-Saft verloren. Mitigation: Studio-Description-Hinweis am Slug-Feld.

## Non-Goals
- **Keine automatische DB-Insert-Pipeline für neue Städte** aus externen Quellen (z. B. OpenStreetMap-Bulk-Import). V1 = manuelles `cities`-Insert via Migration oder Admin-UI.
- **Keine User-generierten Stadt-Seiten** — Marketing kuratiert.
- **Keine Star-Map-Stadt-Seiten** in V1 — `stadtkarte`-Keywords sind Map-Editor-spezifisch. Star-Map-Pendant könnte später als PROJ-43+ kommen.
- **Keine Per-Stadt-Editor-Konfigurationen** über Style-Picker hinaus (z. B. "Hamburg → Editor öffnet mit Schiff-Pin"). CTA führt in Standard-Map-Editor mit `?city`+`?style`-Pre-Load.
- **Keine A/B-Tests** auf Stadt-Seiten in V1.
- **Keine Echt-Zeit-Statistik** (Bevölkerung, Wetter etc.) auf der Stadt-Seite.
- **Keine eigene Stadt-Übersichts-Index-Seite** (`/de/stadtkarte/` ohne Slug) — kann V2-Add-on werden, in V1 nicht gebraucht weil Footer-Links + Sitemap die Discovery erledigen.
- **Keine FAQ-Sektion pro Stadt** in V1 (im Gegensatz zu PROJ-29 Anlass-Seiten) — Stadt-Body-Content + Style-Picker reichen für SEO. FAQ-Add-on möglich in V2.
- **Keine Hero-Image-Variation pro Stadt-Seite über die 3 Render hinaus** (z. B. zusätzliches Stadtfoto). Renders sind die einzigartigen Visuals.
- **Keine automatische Re-Generation der Renders bei Style-Änderung** — Admin triggert manuell.
- **Keine sofortige Mehr-Locale-Live-Schaltung**: V1 = nur DE.
- **Keine Galerie-Integration** in V1 — Galerie ist Anlass-getrieben, Stadt-Logik ist orthogonal.

## Decisions (vor Architecture festgelegt)
- **Stadt-Inventar in Supabase, Body-Content in Sanity** — Skalierung der Liste vs. CMS-UX für Body. (Frage 1)
- **Sanity-Schema `cityPage` analog `occasionPage`** — gleiches Pattern, Marketing-Konsistenz, hreflang-Logik wiederverwendbar. (Frage 2)
- **Slug-Pattern `stadtkarte-{cityname}`** keyword-front-loaded — maximaler SEO-Wert auch bei redundanter Pfad/Slug-Wiederholung. (Frage 3)
- **404 ohne Sanity-Doc**, kein Auto-Template-Fallback — Thin-Content-Schutz, Marketing-Gate-Logik analog PROJ-29. (Frage 4)
- **Multi-Locale-Rollout (DE → EN → FR/IT/ES)** — Phasen-Approach analog PROJ-29. (Q-Round-1 Frage 1)
- **3 Hero-Renders pro Stadt als Style-Picker-Carousel** — visueller Wert + Style-Hint vor Editor-Eintritt. (Q-Round-1 Frage 3)
- **Style-Picker auf LP, dann Editor mit pre-loaded Style** — User-Investment vor Editor erhöht Conversion + reduziert Editor-Friction. (Q-Round-1 Frage 4)
- **V1 = Infra + 10 DE-Städte live** — schlanker MVP, klare Skalierungs-Roadmap. (Q-Round-3 Frage 1)
- **3 Featured-Styles global** (nicht pro Stadt) — Pipeline-Einfachheit + UX-Konsistenz. (Q-Round-3 Frage 2)
- **AI-Body-Draft via Admin-Tool, Marketing reviewt im Sanity** — Skalierung + Qualitätsschutz. (Q-Round-3 Frage 3)
- **"Verwandte Städte" mit 6 Cards aus gleicher Region/Land** — SEO-Internal-Linking-Boost + Engagement. (Q-Round-3 Frage 4)
- **CTA-Link-Format `/[locale]/map?city={cityId}&style={styleId}`** — analog `?preset=`-Pattern aus PROJ-1/PROJ-8.
- **301-Redirect via `previousSlugs`-Array im Sanity-Doc** — analog PROJ-29.
- **URL-Segment pro Locale ist Code-Konstante** (`stadtkarte`/`city-map`/...) — Routing-Konvention, keine Marketing-Entscheidung.
- **Nur Map-Editor-CTAs**, kein Star-Map — `stadtkarte`-Keyword ist Map-spezifisch.

## Open Questions
- **Sanity-Doc-Reference vs. String-FK auf `cities.id`**: Sanity ist nicht Postgres-aware. Reference-Feld auf eine externe ID braucht eine Custom-Validierung oder einen Sync-Mechanismus. → Architektur-Phase entscheidet zwischen (a) String-FK mit manueller Validierung, (b) Sanity-eigene Stadt-Stub-Docs, die mit DB-Daten gesynced werden, (c) Hybrid-Lookup im Build-Step.
- **Render-Pipeline-Trigger-UI**: Wo lebt der "Renders generieren"-Button — im PROJ-30-Admin oder neuer Stadt-Admin-Bereich? → Architektur-Phase, Tendenz: erweitern des PROJ-30-UIs.
- **Render-Storage-Struktur**: Eine Spalte `render_urls` (JSON) auf `cities` vs. eigene Tabelle `city_renders` (cityId × styleId × url) → Architektur-Phase. Tendenz: eigene Tabelle für saubere Audit-Logs.
- **AI-Draft-Schreibziel**: Direkt ins Sanity-Doc oder als Sanity-Draft-Mechanismus, der Marketing explizit publishen muss? → Architektur-Phase.
- **AI-Provider**: Claude (analog Blog-Automation PROJ-14) oder OpenAI? → Architektur-Phase, Tendenz: Claude für Konsistenz.
- **Featured-Styles-Konfiguration**: In `app_settings`-Tabelle, Code-Konstante oder Sanity-`siteSettings`? → Architektur-Phase, Tendenz: Code-Konstante, weil Style-IDs eng mit Code-Logik gekoppelt sind.
- **Style-IDs für Style-Picker**: Was sind die konkreten 3 Featured-Styles für V1? → Marketing-Entscheidung, sollte vor V1-Launch geklärt sein. Vorschlag: `modern-black`, `vintage-sepia`, `minimalist-white` — Marketing prüft.
- **CTA-Tracking**: UTM-Tags oder interne Click-IDs auf den Editor-CTAs, damit Marketing CTR pro Stadt-Seite messen kann? → Tracking-Infrastruktur ist orthogonal, eventuell separates Feature.
- **Sitemap-Skalierungsgrenze**: Bei 100+ Städten × 5 Locales = 500+ Einträge — wann brauchen wir Sitemap-Index-Splitting? → Architektur-Phase, V1 unkritisch.
- **Editor-Reduction-Pass-Interaktion**: Wenn `?city`+`?style` gesetzt sind, soll der Editor in einer noch reduzierteren UI starten ("Nur Text ändern, Format wählen, Kaufen")? → Tangiert PROJ-36, separate Klärung.

## Technical Requirements
- **Performance**: Stadt-Seite TTFB < 500 ms (ISR mit 1h-Revalidate, Sanity-Query gecacht, Storage-URLs als CDN-Asset).
- **SEO-Performance**: Lighthouse-SEO-Score ≥ 95 pro Seite. Core Web Vitals "good" (LCP < 2.5s, CLS < 0.1, FID < 100ms).
- **Accessibility**: H1/H2-Hierarchie sauber, Alt-Texte für Hero-Renders aus Sanity oder Auto-Generated (`{Style-Name} Stadtkarte {Stadt}`), Style-Picker keyboard-bedienbar (`<button>`-Elemente, Focus-Indikatoren).
- **Server-Side-Rendering**: Page ist Server Component für Hero/Body/Verwandte-Städte. Style-Picker-Selection-State ist Client-Component-Insel.
- **ISR**: `revalidate: 3600` (1h). On-Demand-Revalidation per Sanity-Webhook ist V2-Add-on.
- **Render-Pipeline-SLA**: Bulk-Render von 30 Bildern (10 Städte × 3 Styles) muss in < 10 min durchlaufen, sonst Pipeline-Backpressure-Issue.
- **AI-Generation-Cost**: Body-Draft pro Stadt < $0.05 (Claude Haiku oder vergleichbar). Bulk-Generation für 100 Städte × 5 Locales = ~500 Calls = ~$25 Budget-Annahme.
- **Backwards-Compatibility**: Existierende Routes (`/map`, `/star-map`, `/gallery`, Anlass-Seiten) werden nicht verändert. Editor erhält additive `?city`+`?style`-Parameter-Handling.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Bestehende Bausteine, auf denen wir aufsetzen

PROJ-42 ist zu ~70 % eine Variante von PROJ-29 mit drei zusätzlichen Bausteinen (Stadt-Inventar, Render-Pipeline-Integration, AI-Draft-Tool). Wir bauen kein neues Fundament — wir kombinieren bestehende Patterns.

| Baustein | Was es schon kann | Wo es lebt |
|---|---|---|
| **PROJ-29 Routing-Pattern** | Locale-spezifisches URL-Segment + dynamischer Slug + 301-Redirect via `previousSlugs` + `notFound()` ohne Doc | `src/lib/occasion-routing.ts`, `src/app/[locale]/poster|posters/[slug]/page.tsx` |
| **PROJ-29 Sanity-Schema-Pattern** | `language` + `slug` + `previousSlugs` + `metaTitle`/`metaDescription` + `bodySections[]` mit Portable-Text | `src/sanity/schemas/occasionPage.ts` |
| **PROJ-29 Query-Helfer** | Slug-Lookup, Locale-Varianten für Hreflang, Footer-Liste, Sitemap-Liste | `src/sanity/queries.ts` |
| **PROJ-29 Hreflang-Generator** | Pro Anlass alle Locale-Varianten holen, `<link rel="alternate">`-Tags ausgeben, `x-default` auf DE | `src/lib/occasion-page-metadata.ts` |
| **PROJ-30 Render-Worker** | Playwright-Headless rendert ein Editor-Setup, Mockup-Compositing via Dynamic-Mockups-API, Upload nach Supabase Storage | `scripts/render-worker.ts`, Bucket `preset-renders` |
| **PROJ-30 Worker-Trigger** | GitHub-Actions-Endpoint, der Worker im Drain-Modus startet | `src/app/api/admin/render-worker/trigger/route.ts` |
| **MapTiler-Geocoding** | Server-Endpoint nimmt `?query=`, gibt Geocoding-Treffer mit Koordinaten zurück | `src/app/api/geocode/route.ts` |
| **PresetUrlApplier-Pattern** | Liest URL-Parameter, lädt aus DB, setzt Editor-State, räumt URL auf | `src/components/editor/PresetUrlApplier.tsx` |
| **LandingNav / LandingFooter** | Marketing-Layout mit dynamischen Link-Blöcken pro Locale | `src/components/landing/` |
| **PortableText-Renderer** | Sanity-Rich-Text mit Headings, Listen, Bildern, Links | bestehend, im Blog im Einsatz |
| **Sitemap-Generator** | Sammelt statische + Blog-Routen pro Locale, baut Hreflang-Subelemente | `src/app/sitemap.ts` |
| **Claude-API-Client (PROJ-14)** | Anthropic-SDK-Setup, Spend-Tracking gegen Monatsbudget, `messages.create()`-Wrapper | `scripts/blog-automation/lib/claude.ts` |
| **next-intl Locale-Routing** | `localePrefix: 'always'`, 5 Locales (de/en/fr/it/es) | `src/i18n/routing.ts` |

**Was wir NEU bauen:**
1. Eine neue Supabase-Tabelle `cities` für strukturelle Stadt-Metadaten (Geocode, Bevölkerung, Region).
2. Eine neue Supabase-Tabelle `city_renders` für die 3 Hero-Visuals pro Stadt × Style.
3. Ein neues Sanity-Schema `cityPage` (analog `occasionPage`, aber mit `cityId`-String-FK statt `occasion`-Code).
4. Ein Sanity-Custom-Validator, der `cityId` gegen die `cities`-Liste prüft (per API-Call beim Speichern).
5. Eine Erweiterung des PROJ-30-Render-Workers um einen "Job-Type"-Schalter, damit er auch `city_renders`-Jobs abarbeiten kann (gleiche Render-Engine, andere Datenquelle und anderes Storage-Ziel).
6. Ein neues Admin-Tool "Stadt-Body-Draft generieren", das Claude aufruft und das Resultat in das Sanity-`cityPage`-Doc schreibt.
7. Drei neue Locale-Routing-Ordner: `/[locale]/stadtkarte/[slug]`, `/[locale]/city-map/[slug]`, etc. (analog `poster`/`posters`-Ordner-Pattern aus PROJ-29).
8. Eine "Verwandte Städte"-Komponente mit DB-Query (Same-Region-Same-Country-Logik).
9. Eine Editor-Erweiterung: `?city=`+`?style=`-Param-Handler analog zum `PresetUrlApplier`.

### B) Aufbau einer Stadt-Seite (Visual Tree)

```
/[locale]/stadtkarte/[slug]   <- DE: /de/stadtkarte/stadtkarte-hamburg
/[locale]/city-map/[slug]     <- EN: /en/city-map/city-map-london
/[locale]/carte-de-ville/[slug]  <- FR
/[locale]/mappa-citta/[slug]     <- IT
/[locale]/mapa-ciudad/[slug]     <- ES
|
+-- LandingNav (bestehend)
|
+-- CityHero
|   +-- H1 (pageTitle aus Sanity)
|   +-- Sub-Headline (pageSubline, optional)
|   +-- Style-Picker (Client-Component-Insel)
|       +-- Card 1: Render Style "Modern Schwarz" (klickbar)
|       +-- Card 2: Render Style "Vintage Sepia" (klickbar)
|       +-- Card 3: Render Style "Minimalist Weiss" (klickbar)
|       (Auswahl ist client-state; bei Klick Visual-Highlight,
|        CTA-Button-Link aktualisiert sich)
|
+-- CityBody
|   +-- 1-4 Storytelling-Sektionen (Portable-Text aus Sanity)
|       (Sub-Heading + Body-Text, ~200-300 Woerter total)
|
+-- CityCta
|   +-- Headline + Sub-Headline (i18n)
|   +-- Primary-Button "Eigene Stadtkarte gestalten"
|       Link: /[locale]/map?city={cityId}&style={selectedStyleId}
|
+-- RelatedCities
|   +-- H2 (i18n: "Weitere Stadtkarten")
|   +-- Grid mit 6 Cards
|       +-- Card pro verwandter Stadt mit Hero-Render-Thumbnail + Stadtname
|       (Auswahl: same country_code + region, sortiert nach population;
|        nur Cards verlinken, deren Sanity-Doc in der Locale existiert)
|
+-- LandingFooter (bestehend, NEU mit "Beliebte Stadtkarten"-Block)
```

**Server-Component-Struktur:** Hero, Body, RelatedCities, CTA und Footer sind Server-Components. Nur der Style-Picker ist eine Client-Component-Insel (kleines State-Management für Auswahl + CTA-Link-Update).

### C) Was wo gespeichert ist (Datenmodell in Klartext)

**Supabase — strukturelle Daten (skalierbar auf 500+ Städte):**

`cities`-Tabelle:
- Eindeutige Stadt-ID
- Slug-Base (z. B. `hamburg`, `koeln`, `frankfurt-am-main`) — eindeutig pro Land
- Anzeigename ("Hamburg")
- Land (ISO-Code: DE, AT, CH, FR, IT, ES, GB, US, ...)
- Region (optional: Bundesland für "Verwandte Städte")
- Geokoordinaten (Latitude, Longitude für Editor-Pre-Load)
- Einwohnerzahl (für Sortierung & Top-N-Auswahl)
- Aliasse (Liste alternativer Schreibweisen)
- Created/Updated-Timestamps

`city_renders`-Tabelle:
- Eindeutige Render-ID
- Stadt-Referenz (FK auf `cities.id`)
- Style-Code (z. B. `modern-black`, `vintage-sepia`, `minimalist-white`)
- Storage-URL des fertigen Renders (PNG-Pfad in Supabase Storage)
- Bildmaße (Breite, Höhe)
- Render-Status (`pending`, `rendering`, `done`, `failed`)
- Render-Fehlerprotokoll (bei Fehlern)
- Letzter Render-Zeitstempel
- Index auf `(cityId, styleId)` — eindeutige Kombination, ein Render pro Stadt × Style

**Supabase Storage — Bilder:**
- Bucket `city-renders` (separat von `preset-renders`).
- Pfad-Schema: `{cityId}/{styleId}.png`.
- Public-Read, Service-Role-Write.

**Sanity — Marketing-Content (was Marketing schreibt):**

`cityPage`-Schema:
- Sprache (eine der 5 Locales)
- City-ID (String-Feld, validiert gegen `cities.slug_base` per API-Call beim Speichern)
- Slug (URL-Bestandteil pro Locale)
- Liste alter Slugs (für 301-Redirects nach Umbenennung)
- Seiten-Headline (H1)
- Optionale Sub-Headline
- Body-Sektionen-Liste (1–4 Einträge mit Sub-Heading + Rich-Text)
- Meta-Title + Meta-Description (für SEO/`<head>`)
- AI-Draft-Status (`draft`/`reviewed`/`published`) — Marketing-internes Tracking-Feld

**Eindeutigkeit:** Pro `(language, cityId)` darf nur ein Sanity-Doc existieren (Sanity-Validator).

**Code-Konstanten:**
- URL-Segment-Mapping pro Locale (`stadtkarte`/`city-map`/`carte-de-ville`/`mappa-citta`/`mapa-ciudad`) — Code-Konstante analog `OCCASION_URL_SEGMENT`.
- Liste der **3 Featured-Styles** als Code-Konstante (`modern-black`, `vintage-sepia`, `minimalist-white`) — Architektur-Entscheidung: Style-IDs sind eng mit Render-Logik gekoppelt, das gehört nicht in CMS.

### D) Routing-Strategie

**Pattern:** `/[locale]/[city-segment]/[slug]`

Drei Ebenen, von außen nach innen:

1. **`[locale]`** kommt aus next-intl → bereits gelöst.
2. **`[city-segment]`** ist locale-abhängig (`stadtkarte` für DE, `city-map` für EN, etc.) → wir bauen für jede Locale einen eigenen statischen Routen-Ordner, der dieselbe Page-Komponente lädt. Identisches Pattern wie PROJ-29.
3. **`[slug]`** ist dynamisch → der Page-Handler nimmt den Slug, baut Locale aus Context und sucht in Sanity nach dem passenden `cityPage`-Doc.

**Slug-Lookup-Pfad (analog PROJ-29):**

```
URL kommt rein  ->  Locale aus Context  +  Slug aus URL
                              |
                              v
              Sanity-Query: cityPage mit
              language == locale  AND
              (slug.current == requestedSlug
               OR previousSlugs[] contains requestedSlug)
                              |
                ┌─────────────┴──────────────┐
                v                            v
     Treffer auf aktuellem Slug    Treffer in previousSlugs
                |                            |
                v                            v
       Stadt-Daten aus DB laden    301-Redirect auf aktuellen Slug
       (geocode, render-urls)
                |
                v
       Wenn alle 3 city_renders == 'done':
           Page rendern
       Sonst:
           notFound()  ->  404

     Kein Sanity-Treffer  ->  notFound()  ->  404
```

**Doppelter Live-Gate:** Stadt-Seite ist live, **wenn (1) Sanity-Doc existiert UND (2) alle 3 city_renders Status `done` haben**. Fehlt eines, gibt die Route 404. Begründung: Visuals sind integral zum SEO-Wert, eine Seite mit fehlenden Render-Cards rankt schlecht und sieht halbfertig aus.

**301-Redirect-Implementierung:** Im Page-Handler (nicht Edge-Middleware), gleicher Mechanismus wie PROJ-29.

### E) Sanity-Stadt-Validator (String-FK-Mechanismus)

**Problem:** Sanity weiß nichts von Postgres. Wenn Marketing im Doc `cityId = "hamburg"` eintippt, soll Sanity prüfen: existiert diese Stadt in der DB?

**Lösung:** Sanity-Custom-Validator-Funktion, die beim Speichern eine API-Anfrage an unseren neuen Endpoint `/api/cities/validate-slug-base` schickt:
- Endpoint nimmt `slug_base`, fragt Supabase, antwortet `{ valid: true/false, name: "Hamburg", country_code: "DE" }`.
- Validator lehnt das Speichern ab, wenn `valid: false`.

**UX im Studio:** Marketing tippt nicht frei — wir bauen ein **Custom-Sanity-Input-Component**, das beim Fokus die `cities`-Liste (top 100 sortiert nach Bevölkerung) als Dropdown lädt. Marketing wählt aus, Validator bleibt als Schutznetz.

**Vorteil:** Kein Sync-Job nötig, keine doppelten Stub-Docs in Sanity, keine Drift zwischen DB und CMS.

### F) Render-Pipeline-Integration (PROJ-30 erweitert)

**Konzept:** Der bestehende Render-Worker macht heute genau einen Job-Type: "preset rendern". Wir erweitern ihn um einen zweiten Job-Type: "city rendern". Code-Reuse für Playwright/Storage/Mockup-Compositing, klare Trennung der Daten.

**Worker-Erweiterung (parametrisiert):**

```
Worker-Schleife
+-- pollt 'pending'-Jobs aus zwei Quellen
|   +-- presets (alt, unveraendert)
|   +-- city_renders (neu)
|
+-- pro Job, je nach Type:
|   +-- preset-Job: Editor mit Preset-Setup laden, rendern, in
|   |               preset-renders Bucket speichern (alt)
|   +-- city-Job: Editor mit Stadt-Geocode + Featured-Style laden,
|                 rendern, in city-renders Bucket speichern (neu)
|
+-- Status zurueckschreiben (pending -> rendering -> done/failed)
```

**Trigger-Pfade für City-Renders:**

1. **Single-City-Trigger:** Admin-UI-Button "Stadt-Renders generieren" pro Stadt → 3 Einträge in `city_renders` mit Status `pending` → Worker-Trigger.
2. **Bulk-Trigger:** Admin-UI-Button "Alle ausstehenden Stadt-Renders" → erstellt Pending-Einträge für alle Städte ohne komplette Render-Sets → Worker-Trigger.
3. **Re-Render bei Style-Update:** Wenn der Code für einen Style sich ändert, Admin markiert die betroffenen `city_renders` als `stale` → bei nächstem Trigger werden sie neu gerendert.

**Render-Setup pro City-Job:** Worker nimmt `cityId` + `styleId`, baut Editor-State zusammen (Stadt-Geocode aus DB → Map-Center, Featured-Style → Style-Konfiguration, Default-Format A3 oder festgelegtes Hero-Format → Page-Setup), rendert via Playwright, lädt in Storage.

**Storage-Trennung:** Separater Bucket `city-renders` mit Pfad-Schema `{cityId}/{styleId}.png`. Vorteile: andere Cache-Header, andere Public-Read-Policies möglich, klarer Audit-Pfad.

**Idempotenz:** Erneuter Render überschreibt das Bild im selben Pfad. URL bleibt stabil → kein CDN-Cache-Bust nötig (oder bewusst Versionierung über Query-Param `?v=timestamp`, falls nötig).

### G) AI-Body-Draft-Workflow

**Konzept:** Marketing klickt im Admin-Tool auf "Body-Draft generieren" für eine Stadt × Locale. Tool ruft Claude (via vorhandenem Setup aus PROJ-14), schreibt Resultat direkt in das Sanity-`cityPage`-Doc, setzt `aiDraftStatus = 'draft'`.

**Ablauf:**

```
Admin-UI: "Body-Draft generieren"
   |
   v
Tool baut Prompt aus:
  - Stadt-Name, Land, Region, Bevoelkerung (aus DB)
  - Locale (Sprache des Outputs)
  - Prompt-Template (Wahrzeichen, Geschichte/Charakter,
    Stadtviertel/Atmosphaere; ~200-300 Woerter)
   |
   v
Claude API call (Modell: Haiku oder Sonnet -
  Architektur-Default: Sonnet fuer Qualitaet)
   |
   v
Output-JSON parsed:
  - pageTitle, pageSubline, metaTitle, metaDescription
  - bodySections[] (1-4 Abschnitte)
   |
   v
Sanity-API write:
  - Falls Doc existiert: Felder ueberschreiben (mit Confirm-UI),
    aiDraftStatus auf 'draft' setzen
  - Falls Doc nicht existiert: neues Doc anlegen mit
    cityId + language vorausgefuellt
   |
   v
Marketing oeffnet Studio, sieht Doc mit "DRAFT"-Badge
   |
   v
Marketing editiert -> setzt Status auf 'reviewed' oder 'published'
   |
   v
Frontend rendert das Doc unabhaengig vom Status
   (Live-Gate ist Doc-Existenz, nicht Status)
```

**Wichtig — Status ist Marketing-Tracking, nicht Live-Gate:** Frontend prüft nicht `aiDraftStatus`. Doc-Existenz allein entscheidet über Live-Schaltung. Marketing kann theoretisch ungeprüfte Drafts live haben — Disziplin + Onboarding-Doku.

**LLM-Cost-Schutz:** Spend-Tracking aus PROJ-14 wird wiederverwendet (`recordSpend`). Pre-Generation-Estimate wird im Admin-UI gezeigt. Bulk-Generation für 100 Städte × 5 Locales ≈ 500 Calls × ~$0.05 = ~$25 Budget-Annahme.

**Token-Limits:** 200–300 Wörter Output ≈ ~500 Tokens, mit Prompt-Overhead ~2000 Tokens total pro Call. Unkritisch für Modell-Limits.

### H) Hreflang / SEO / Sitemap

**Hreflang:** Wiederverwendung des bestehenden Mechanismus aus `src/lib/occasion-page-metadata.ts`. Pro Stadt-Seite:
1. Aktuelle Locale + Stadt-ID bekannt.
2. Neue Sanity-Query `getCityPageVariants(cityId)` holt alle Locale-Varianten.
3. Pro existierender Variante ein `<link rel="alternate" hreflang="...">`-Tag.
4. `x-default` zeigt auf DE, falls vorhanden.
5. Canonical zeigt auf die eigene Locale-Version.

**Open Graph / Twitter Cards:** `og:image` zeigt auf den ersten der 3 Hero-Renders (z. B. `modern-black`-Style). Auflösung Storage-Bild ist hoch genug für OG-Anforderungen (≥1200×630).

**Schema.org-Markup:** Zwei JSON-LD-Blöcke im `<head>`:
1. **`BreadcrumbList`** — Home > Stadtkarten > {Stadt}.
2. **`Place`** — Stadt mit `name`, `address.addressCountry`, `geo.latitude`/`longitude`.

**Sitemap-Erweiterung:** `src/app/sitemap.ts` bekommt eine zusätzliche Schleife:
- Sanity-Query `listAllCityPages()` liefert alle live-Doc + Locale-Kombinationen.
- Pro Eintrag: URL bauen, Hreflang-Subelemente für alle Locale-Varianten.

**Indexing-Sicherheit:** Stadt-Seiten ohne Sanity-Doc oder ohne komplette Renders tauchen weder in der Sitemap noch im Hreflang auf. Google sieht nur "fertige" Seiten.

### I) Cross-Linking

**LandingFooter (bestehend, erweitert):**
- Neuer Link-Block "Beliebte Stadtkarten" mit den Top-6-Stadt-Seiten der aktuellen Locale.
- Auswahl-Logik: Sanity-Query `listCityPagesForLocale(locale)` → Sortierung nach `population` (Lookup in `cities`-Tabelle) → Top 6.
- Link-Build via `buildCityPagePath(locale, slug)` analog PROJ-29.

**Anlass-Seiten (PROJ-29) — optional V2:**
- Anlass-Seiten könnten einen "Beliebte Stadtkarten"-Block am Ende bekommen. **V1: ausgelassen** — saubere Separation der zwei Konzepte. Wenn Internal-Linking-Bedarf da ist, in PROJ-43+ separat.

**Blog (PROJ-14) — manuell:**
- Marketing verlinkt manuell aus Blog-Texten auf Stadt-Seiten. Kein Code-Feature.

**Stadt-Seiten untereinander:**
- "Verwandte Städte"-Sektion am Ende jeder Stadt-Seite. Auswahl-Logik:
  - Same `country_code` + same `region` (falls vorhanden), sortiert nach `population` DESC, Top 6.
  - Falls < 6: auffüllen mit Same-Country-only.
  - Cards verlinken nur, wenn das Ziel-Stadt-Sanity-Doc in der aktuellen Locale existiert (Filter via Sanity-Query).
- Query-Effizienz: einmal pro Page-Render, im ISR-Cache.

### J) Phasen-Reihenfolge (Bauplan)

```
Phase 1: Datenbank-Setup (Backend, ohne Frontend-Sichtbarkeit)
   +-- Migration: cities-Tabelle anlegen
   +-- Migration: city_renders-Tabelle anlegen
   +-- Storage-Bucket city-renders einrichten
   +-- Seed-Migration: 10 DE-Phase-1-Staedte mit Geocodes
   +-- API-Endpoint: GET /api/cities/validate-slug-base (fuer Sanity-Validator)
   +-- API-Endpoint: GET /api/cities (Liste fuer Sanity-Dropdown)
            |
            v
Phase 2: Sanity-Schema + Studio-Setup (Backend)
   +-- Schema cityPage anlegen
   +-- Custom-Input-Component fuer cityId-Dropdown
   +-- Custom-Validator fuer cityId-Existenz
   +-- Slug-/previousSlugs-Validierung
   +-- Studio-Structure-Eintrag "Stadt-Seiten"
            |
            v
Phase 3: Render-Pipeline-Erweiterung
   +-- Worker-Skript um Job-Type-Schalter erweitern
   +-- City-Job-Renderer (Editor mit Stadt-Geocode + Style)
   +-- Admin-UI: "Stadt-Renders generieren" pro Stadt
   +-- Admin-UI: "Bulk-Trigger fuer alle ausstehenden Stadt-Renders"
   +-- Render-Status-Anzeige pro Stadt
            |
            v
Phase 4: Sanity-Queries + URL-Segment-Konstante
   +-- getCityPageBySlug(locale, slug)
   +-- getCityPageVariants(cityId) -> Locale -> Slug-Map fuer Hreflang
   +-- listCityPagesForLocale(locale) -> Footer + Verwandte-Staedte
   +-- listAllCityPages() -> Sitemap
   +-- URL-Segment-Konstante pro Locale (stadtkarte/city-map/...)
   +-- buildCityPagePath() Helper
            |
            v
Phase 5: AI-Draft-Tool (Admin)
   +-- Admin-UI: "Body-Draft generieren" pro Stadt x Locale
   +-- Prompt-Template mit Stadt-Kontext + Locale
   +-- Claude-API-Call (Sonnet, Spend-Tracking aktiv)
   +-- Sanity-API-Write (Felder schreiben, aiDraftStatus='draft')
   +-- Confirm-UI bei Ueberschreiben bestehender Inhalte
            |
            v
Phase 6: Frontend (Stadt-Seite)
   +-- Routing-Ordner pro Locale (5 Ordner mit identischer Page-Komponente)
   +-- Page-Komponente: Slug-Lookup, Render-Existenz-Check, 301-Redirect, notFound()
   +-- CityHero, CityBody, CityCta, RelatedCities Komponenten
   +-- Style-Picker-Client-Insel
   +-- generateMetadata (Title, Description, OG, Twitter, Canonical, Hreflang)
   +-- Schema.org-JSON-LD (BreadcrumbList + Place)
            |
            v
Phase 7: Editor-Integration
   +-- CityUrlApplier-Component (analog PresetUrlApplier)
   +-- ?city=-Param: Stadt aus DB laden, Map-Center setzen
   +-- ?style=-Param: Featured-Style anwenden
   +-- URL-Cleanup nach Apply
   +-- Toast bei invaliden Params
            |
            v
Phase 8: Cross-Linking + Sitemap
   +-- LandingFooter: "Beliebte Stadtkarten"-Block
   +-- sitemap.ts: Stadt-Seiten + Hreflang-Subelemente
            |
            v
Phase 9: i18n-Strings + Verifikation
   +-- Page-Level-Strings in allen 5 Locales (cityPage-Namespace + nav)
   +-- Smoke-Test pro Locale (404 ohne Doc, Render mit Doc, Redirect, Style-Picker)
   +-- SEO-Audit (Lighthouse, Hreflang-Validator, Schema.org-Rich-Results-Test)
   +-- Phase-1-Launch-Inhalte: 10 DE-Staedte * Sanity-Doc + AI-Draft + Review
            |
            v
Phase 10 (optional, V2): On-Demand-Revalidation
   +-- Sanity-Webhook auf cityPage-Aenderung
   +-- /api/revalidate-city-page-Endpoint
   +-- Auto-Revalidation bei Render-Pipeline-Done
```

**Reihenfolge-Hinweis:** Phasen 1–4 sind reines Backend, kein User-Impact. Phase 5 (AI-Tool) kann parallel zu 4 laufen. Phase 6 (Frontend) braucht 1+2+4. Phase 7 (Editor) ist additiv und kann parallel zu 6 laufen. Phase 9 (Content) ist redaktionelle Begleitung. Live-Schaltung erst nach Phase 9.

### K) Tech-Entscheidungen mit Begründung

| Entscheidung | Begründung |
|---|---|
| **Cities in Supabase, Body in Sanity** | Skalierung der Stadt-Liste (100+ Einträge) ist im Studio mühsam; DB-Bulk-Inserts + Geocoding-Pipeline sind dort natürlicher. Body bleibt im CMS, weil Marketing dort lebt. |
| **String-FK `cityId` statt Sanity-Reference auf Stub-Doc** | Kein Sync-Job, keine doppelte Wahrheit, keine Drift. Custom-Input-Component + API-Validator geben dieselbe UX wie Reference-Field, ohne den Stub-Overhead. |
| **Eigene `city_renders`-Tabelle, nicht in `presets`** | Cities sind keine Customer-Presets — sie sind Marketing-Visuals. Trennung verhindert Pollution des Preset-Inventars und macht Admin-UIs sauberer. |
| **Worker-Erweiterung statt zweiter Worker** | Render-Engine, Storage-Logik, Mockup-Compositing sind dieselben — nur Datenquelle und Storage-Pfad ändern sich. Code-Reuse ohne Komplexitätsexplosion. |
| **Doppelter Live-Gate (Sanity-Doc + alle 3 Renders done)** | SEO-Sicherheit: eine halb-fertige Stadt-Seite (Renders fehlen) sieht für Google wie Thin Content aus. Hard-Gate verhindert das. |
| **3 Featured-Styles als Code-Konstante** | Style-IDs sind eng mit Render-Logik gekoppelt (Layer-Setup, Farb-Logik). Konfiguration im CMS würde das auseinanderreißen. |
| **CityId via Custom-Input-Dropdown im Studio** | Marketing tippt sich keine Slugs aus den Fingern, Auto-Complete aus DB-Liste. Validator als Schutznetz. |
| **AI-Draft direkt ins Sanity-Doc, kein Sanity-Drafts-Mechanismus** | Sanity-Drafts-API + Preview-Token + Publish-Button-UX sind Komplexität, die ein Solo-Operator-Setup nicht braucht. `aiDraftStatus`-Feld + Studio-Filter "Drafts to Review" reichen als Workflow-Hilfe. |
| **Claude Sonnet als Default-Modell** | Höhere Qualität als Haiku bei akzeptablen Kosten ($0.03–0.05/Stadt). Stadt-Body soll für Google nicht nach AI-Boilerplate aussehen — Sonnet liefert hier deutlich bessere Spezifika. |
| **`og:image` aus erstem Render (`modern-black`-Style)** | Konsistent über alle Stadt-Seiten, eine vorhersehbare Wahl, keine Marketing-Pflege nötig. |
| **Style-Picker als Client-Component-Insel, Rest Server-Component** | Selection-State braucht Client-Side; alles andere ist statisch und profitiert von ISR + SSR-Performance. |
| **CTA-URL-Format `?city=` + `?style=`, analog `?preset=`** | Etabliertes Pattern, der Editor versteht es bereits — minimale Erweiterung des `PresetUrlApplier`-Konzepts. |
| **"Verwandte Städte" mit DB-Query, nicht Sanity** | Sortierlogik (Population, Region) lebt in der DB; Sanity hätte hier nichts beizutragen. Query ist günstig (eine SELECT pro Page-Render im ISR-Cache). |
| **Eigener Storage-Bucket `city-renders`** | Cache-Strategie, Public-Read-Policy und Audit-Logs separat von Preset-Renders. Klare Trennung. |
| **Routing-Ordner pro Locale (5 statische Ordner mit gleicher Page-Komponente)** | next-intl-Konvention, identisch zu PROJ-29. Catch-All wäre fehleranfälliger. |
| **ISR mit 1h-Revalidate** | Marketing-Updates sind nicht sekundenkritisch, gleiche SLA wie PROJ-29. On-Demand-Webhook ist V2-Add-on. |
| **Wiederverwendung Hreflang-/Sitemap-/Footer-Logik aus PROJ-29** | Code-Konsistenz, geringer Wartungsaufwand, keine duplizierten Pattern. |

### L) Neue Dateien / berührte Dateien (Übersicht)

```
supabase/
+-- migrations/
    +-- 20260511000000_proj42_cities_table.sql        NEU
    +-- 20260511000001_proj42_city_renders_table.sql  NEU
    +-- 20260511000002_proj42_seed_top10_de.sql       NEU
    +-- 20260511000003_proj42_storage_bucket.sql      NEU

src/
+-- sanity/
|   +-- schemas/
|   |   +-- cityPage.ts                NEU: Schema mit cityId-FK + previousSlugs
|   +-- inputs/
|   |   +-- CityIdInput.tsx            NEU: Custom-Input mit DB-Dropdown
|   +-- schema.ts                      ergaenzt (Schema-Liste)
|   +-- structure.ts                   ergaenzt (Studio-Eintrag "Stadt-Seiten")
|   +-- queries.ts                     ergaenzt (4 neue Query-Helfer)
|
+-- lib/
|   +-- city-routing.ts                NEU: URL-Segment + buildCityPagePath
|   +-- city-page-metadata.ts          NEU: Hreflang/Canonical/OG-Generator
|   +-- featured-styles.ts             NEU: 3 Styles als Code-Konstante
|
+-- app/
|   +-- [locale]/
|   |   +-- stadtkarte/[slug]/page.tsx     NEU: DE-Route
|   |   +-- city-map/[slug]/page.tsx       NEU: EN-Route
|   |   +-- carte-de-ville/[slug]/page.tsx NEU: FR-Route
|   |   +-- mappa-citta/[slug]/page.tsx    NEU: IT-Route
|   |   +-- mapa-ciudad/[slug]/page.tsx    NEU: ES-Route
|   +-- api/
|   |   +-- cities/
|   |   |   +-- route.ts                       NEU: GET-Liste fuer Sanity-Input
|   |   |   +-- validate-slug-base/route.ts    NEU: Sanity-Validator-Endpoint
|   |   +-- admin/
|   |       +-- city-renders/
|   |       |   +-- route.ts                   NEU: Pending-Jobs erstellen
|   |       +-- city-body-draft/
|   |           +-- route.ts                   NEU: AI-Generation triggern
|   +-- sitemap.ts                              ergaenzt (Stadt-Seiten + Hreflang)
|
+-- components/
|   +-- landing/
|   |   +-- CityHero.tsx                 NEU
|   |   +-- CityStylePicker.tsx          NEU (Client-Component-Insel)
|   |   +-- CityBody.tsx                 NEU
|   |   +-- CityCta.tsx                  NEU
|   |   +-- RelatedCities.tsx            NEU
|   |   +-- LandingFooter.tsx            ergaenzt (Beliebte Stadtkarten-Block)
|   +-- editor/
|       +-- CityUrlApplier.tsx           NEU (analog PresetUrlApplier)
|
+-- locales/
    +-- de.json, en.json, fr.json, it.json, es.json   ergaenzt (cityPage-Namespace)

scripts/
+-- render-worker.ts                     ergaenzt (City-Job-Type)
+-- city-content/
    +-- prompt-template.ts               NEU: Claude-Prompt fuer Body-Draft
```

### M) Abhängige Packages

**Keine neuen Dependencies.** Alle Bausteine sind bereits installiert:
- `next-sanity` + `@sanity/image-url` — Sanity-Queries
- `@portabletext/react` — Rich-Text-Render im Body
- `next-intl` — Locale-Routing
- `next/image` — optimierte Bilder
- `@anthropic-ai/sdk` — Claude API (aus PROJ-14)
- `playwright` — Headless Render-Engine (aus PROJ-30)
- `@supabase/supabase-js` — DB + Storage

### N) Risiken & offene Punkte

- **Marketing-Onboarding-Last:** Stadt-Seiten gehen erst live, wenn pro Stadt × Locale ein Sanity-Doc existiert UND alle 3 Renders fertig sind. Phase-1-Launch heißt: 10 DE-Städte × (1 Sanity-Doc + 3 Renders) = 10 Docs + 30 Renders + 10 Marketing-Reviews. Mitigation: AI-Draft-Tool reduziert Schreibaufwand auf 5–10 min pro Stadt; Bulk-Trigger erledigt die 30 Renders über Nacht.
- **AI-Halluzinationen / Boilerplate:** Claude-generierter Stadt-Body kann faktisch falsch sein (falsche Stadtteil-Namen, erfundene Wahrzeichen) oder nach AI-Boilerplate klingen. Mitigation: Marketing-Review-Pflicht (`aiDraftStatus`-Feld trackt das, ist aber nicht hart durchgesetzt). V2-Idee: stichprobenartige Pattern-Detection auf typische AI-Phrasen.
- **Render-Pipeline-Skalierung bei Locale-Rollout:** Phase 3 (EN-Locale) bedeutet weitere ~30 Cities × 3 Renders = 90 Render-Jobs. Worker bleibt linear, aber Storage-Volumen wächst. Mitigation: Storage-Cleanup-Routine für ungenutzte/stale Renders ist V2-Add-on.
- **Sanity-Custom-Validator-Performance:** Beim Speichern eines Docs schlägt der Validator gegen unsere API zurück. Latenz-spürbar bei jedem Save. Mitigation: API-Endpoint trivial (1 SELECT, < 50 ms); falls Sanity Save-Latenz problematisch wird, Caching der Cities-Liste im Studio-Browser-Side.
- **Slug-Konflikt mit anderen App-Routen:** `stadtkarte/abc` darf nicht mit anderen Routen kollidieren. Mitigation: Routing-Konvention dokumentieren, regelmäßige Sitemap-Validierung.
- **Cross-Locale-Stadt-Identität:** Eine Sanity-`cityPage` hat `cityId = "hamburg"` für DE und `cityId = "hamburg"` für EN — beide referenzieren dieselbe DB-Stadt, aber haben unterschiedliche Slugs. Hreflang-Logik braucht das. Mitigation: Sanity-Query gruppiert nach `cityId` + listet pro Locale → Standard-Pattern, identisch zu PROJ-29.
- **Stadt aus DB gelöscht, Sanity-Doc bleibt:** Sanity-Doc verweist auf nicht-existente `cityId`. Mitigation: Frontend-Page-Handler prüft DB-Existenz vor Render → 404 + Console-Warning. Studio-Custom-Action "Stadt sicher löschen" mit Sanity-Reference-Check ist V2.
- **Featured-Styles-Drift:** Wenn der Code für `modern-black` sich ändert, sehen alte Renders anders aus als neue. Mitigation: `city_renders.render_status = 'stale'`-Markierung + Bulk-Re-Render-Tool.
- **`previousSlugs`-Pflege:** Marketing muss daran denken — analog PROJ-29-Risiko. Mitigation: Studio-Description, Onboarding-Doku, V2-Custom-Action.
- **Sitemap-Volumen bei Vollausbau:** 500 Städte × 5 Locales = 2500 Sitemap-Einträge. Aktuelle Sitemap ist eine Datei. Mitigation: V2-Sitemap-Index-Splitting falls > 5000 Einträge.
- **`og:image`-Größe:** Storage-Renders sind hochauflösend (Print-Qualität). Für OG reichen 1200×630. Mitigation: bei Bedarf Image-Variant via Supabase-Storage-Transform (oder dauerhaft separat speichern als V2).
- **Editor-`?city=`-Apply-Konflikt mit Map-State:** Wenn der Editor schon eine Stadt geladen hat (aus localStorage o. ä.) und gleichzeitig `?city=` kommt, gewinnt der URL-Param. Mitigation: explizite Priority-Regel in `CityUrlApplier`, identisch zu `PresetUrlApplier`-Pattern.
- **AI-Cost-Eskalation bei voller Skalierung:** 500 Städte × 5 Locales × $0.05 = $125 einmalig + Re-Generations. Mitigation: Spend-Cap aus PROJ-14 + Pre-Generation-Estimate-UI.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

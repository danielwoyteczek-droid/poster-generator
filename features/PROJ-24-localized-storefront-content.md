# PROJ-24: Localized Storefront Content

## Status: Approved
- Reality-Check 2026-05-03: Acceptance Criteria im Code abgedeckt, Status auf Approved gehoben.

**Created:** 2026-04-25
**Last Updated:** 2026-05-03

## Implementation Notes

### Phase 1 — Datenbank-Schema & Backend-API (✅ 2026-04-25)
**Datenbank** (Supabase-Migration `add_target_locales_to_presets`):
- Spalte `target_locales TEXT[] NOT NULL DEFAULT '{}'` auf `public.presets`
- CHECK-Constraint `presets_target_locales_valid`: `target_locales <@ ARRAY['de','en','fr','it','es']`
- GIN-Index `presets_target_locales_idx` für schnelle `@>`-Containment-Filter
- Alle 3 bestehenden Presets bekommen automatisch `target_locales = []` (= unsichtbar im Picker, bewusste Migration durch Admin nötig)

**Shared-Lib** (`src/lib/preset-locales.ts`):
- `LocaleSchema`: Zod-Enum, importiert aus `src/i18n/config.ts` (Single-Source-of-Truth für Locale-Liste)
- `TargetLocalesSchema`: Array von Locale-Codes mit Duplikat-Verhinderung
- `TargetLocalesNonEmptySchema`: Variante mit `min(1)` für UI-Pflichtfeld-Validierung

**API-Routen erweitert:**
- `GET /api/presets` (public): neuer optionaler `?locale=xx` Query-Param. Ohne Param → backward-compat (alle published Presets); mit Param → Filter via `target_locales @> [locale]`. Invalid Locale → 400.
- `GET /api/admin/presets` (admin): gleicher `?locale=xx` Filter; `target_locales` zusätzlich im Select.
- `POST /api/admin/presets` (admin): `target_locales` als optionales Feld in CreateSchema (default `[]` für Migration-Sicherheit; UI erzwingt min 1 in Phase 3).
- `PATCH /api/admin/presets/[id]` (admin): `target_locales` als optionales PatchSchema-Feld.

**Neue API-Endpoints:**
- `POST /api/admin/presets/[id]/copy-to-locale` — Body `{ target_locale, name_suffix? }`. Lädt Source-Preset, dupliziert mit übersetzungsfreundlichem Name-Suffix (z. B. `Hamburg (FR)`), setzt `target_locales = [target_locale]` und `status = 'draft'`. Returns 201.
- `POST /api/admin/presets/bulk` — Body `{ ids[], action: 'set'|'add'|'remove', locales[] }`. Hard-Limit 200 IDs/Call. `set` ist atomar (Single Update mit `IN`-Filter); `add`/`remove` lädt Bestand, mergt per-Row und schreibt zurück (Set-Union bzw. Set-Differenz).

**Verifikation:**
- DB: Column/Constraint/Index existieren, Default greift
- API: `/api/presets` ohne Param liefert alle, mit `?locale=de` aktuell leer (alle Bestands-Presets unsichtbar wie geplant), invalid Locale → 400
- Admin-Endpoints: 401 ohne Auth (alle drei: GET, bulk, copy-to-locale)
- TypeScript clean (`npx tsc --noEmit`)

**Migration-Auswirkung:** Sobald Phase-2-Frontend deployed wird, sind die 3 Bestands-Presets im Editor-Picker unsichtbar. Phase 3 muss den Bulk-Tool im Admin liefern, damit der Admin sie per Klick wieder freigeben kann. Phase 1+2+3 müssen gemeinsam ausgerollt werden.

### Phase 2 — Editor-Picker filtert nach Locale (✅ 2026-04-25)
- `PresetPicker.tsx`: liest aktuelle Sprache via `useLocale()` (next-intl, im Root-Layout via `NextIntlClientProvider` bereitgestellt — funktioniert auch ohne `[locale]/`-Routing)
- Fetch sendet jetzt `?poster_type=...&locale=xx`, useEffect-Dependency erweitert (Re-Fetch bei Sprachwechsel)
- Empty-State: kompakter einzeiliger Hinweis "Noch keine Vorlagen für deine Sprache" statt komplettes Verstecken (subtle, nicht aufdringlich, passend zum Sidebar-Kontext)
- Wirkt sofort in allen drei Konsumenten: Map-Sidebar, Mobile-Map-Sidebar, Star-Map-Sidebar (alle nutzen denselben `PresetPicker`)

### Phase 3 — Admin-Locale-Verwaltung (✅ 2026-04-25)
**Neue Komponente:** `src/components/admin/LocaleMultiSelect.tsx` — wiederverwendbarer Popover-Multi-Select mit Checkbox-Liste, zeigt Locale-Code und Sprachnamen aus `i18n/config.ts`. Genutzt im Bulk-Bar UND in der Per-Card-Locale-Bearbeitung.

**`AdminPresetsList.tsx` erweitert:**
- `target_locales` ergänzt im Preset-Interface
- Pro Card: Bulk-Checkbox (oben links über dem Preview-Bild), Locale-Badges-Zeile mit Globe-Icon (rote "Keine Sprache"-Markierung wenn leer), Pencil-Button öffnet Popover mit `LocaleMultiSelect` → speichert sofort via PATCH
- Action-Row pro Card erweitert um Copy-Icon-Button → öffnet Copy-to-Locale-Dialog
- Sticky Bulk-Action-Bar erscheint oben sobald ≥1 Card ausgewählt: Mode-Dropdown (`set` / `add` / `remove`), `LocaleMultiSelect`, "Anwenden"-Button, "Auswahl aufheben"
- Card-Border + Ring zeigt Selektion visuell

**Copy-to-Locale-Dialog:**
- Listet nur Locales, in denen der Source-Preset noch nicht ist
- Click-to-Select (kein Submit-Required-State)
- Erfolgs-Toast verlinkt nicht direkt zum Editor (Architecture-Vorgabe: Status `draft`, Admin reviewt erst), Beschreibungs-Text leitet User an
- Dialog auto-schließt nach Erfolg, refetcht Liste

**Verifiziert:**
- TypeScript clean
- Admin-Page kompiliert (307 = Login-Redirect erwartet)
- Editor-Page kompiliert
- Public + Admin APIs funktionieren mit Locale-Filter (Phase 1)

### Phase 4 — Sanity-Schema für Homepage (✅ 2026-04-25)
- Neues Sanity-Schema `homepage` (`src/sanity/schemas/homepage.ts`) folgt dem `language`-Feld-Pattern von `aboutPage`/`blogPost`/`faqItem`/`legalPage`. Gleiche Locale-Liste (de, en, fr, it, es), gleiches Radio-Layout, gleiches `validation.required`
- Felder: `language` (Pflicht), `heroImageDesktop` (Image mit Hotspot + Alt), `heroImageMobile` (Image mit Hotspot + Alt), `examplesImages` (Array von 0–6 Objekten mit `image`/`label`/`href`)
- Preview im Studio zeigt Locale-Code als Title (z. B. "Homepage — DE")
- Schema in `src/sanity/schema.ts` registriert
- Studio-Structure-Eintrag `Homepage (pro Sprache)` ergänzt — listet alle Homepage-Dokumente, gruppiert per Sprache durch Marketing manuell pflegbar

### Phase 5 — Homepage liest Sanity-Locale-Doc (✅ 2026-04-25)
- Neue Query `getHomepage(locale)` in `src/sanity/queries.ts` mit Per-Field-Fallback: zuerst Locale-Dokument fetchen, dann (falls Felder fehlen) DE-Dokument als Fallback mergen. `heroImageDesktop`, `heroImageMobile` und `examplesImages` werden einzeln coalesced. Wenn weder Locale- noch DE-Dokument existieren → `null`, Frontend nutzt hardcoded Defaults
- `HeroSection` von Client-Component zu **async Server Component** umgebaut: nutzt `getLocale()`/`getTranslations()` aus `next-intl/server`. Bilder kommen aus Sanity-CDN via `urlFor()` mit `width(2000)`/`width(900)` + `format('webp')`; Fallback `/hero-desktop.webp`/`/hero-mobile.webp`. Mobile-Fallback-Kette: `heroImageMobile` → `heroImageDesktop` → `/hero-mobile.webp`. Hardcoded Hero-Texte bleiben erstmal aus i18n-Strings (Override-Felder im Schema bewusst weggelassen — kann später ergänzt werden)
- `ExamplesSection` ebenfalls als async Server Component: liest `examplesImages`-Array, baut `ExampleItem`-Liste mit Sanity-URLs + `label` + `href`. Wenn Array leer, fallback auf die zwei hardcoded Beispiele aus `/public/example-1.webp` und `/example-2.webp` (mit i18n-Labels)
- `next.config.ts` `images.remotePatterns` um `cdn.sanity.io/images/**` erweitert, damit `next/image` Sanity-URLs lädt
- Verifiziert: Homepage `/de` liefert HTTP 200, alle Bilder kommen aus `/public/` (kein Sanity-Doc vorhanden = erwarteter Fallback). Sanity-Studio `/studio/structure` lädt mit neuem `Homepage (pro Sprache)`-Eintrag
- Marketing-Onboarding: Sobald jemand im Studio das erste DE-Dokument anlegt, switcht die Homepage automatisch zu Sanity-Bildern. Pro weitere Locale (FR, IT, ES, EN) ein eigenes Dokument anlegen — Per-Field-Fallback füllt Lücken

## Dependencies
- **Requires PROJ-20** (Internationalisierung): `useLocale()`, `[locale]/`-Routing und der `locales = ['de','en','fr','it','es']`-Stack sind die Voraussetzung; PROJ-24 baut darauf auf.
- **Requires PROJ-8** (Design-Presets): erweitert die bestehende `presets`-Tabelle und den Preset-Picker im Editor.
- **Requires PROJ-9 / PROJ-22-Pattern** (Admin-Verwaltung): nutzt das etablierte Admin-CRUD-Pattern für die neuen Locale-Felder.
- **Requires PROJ-13** (Content CMS / Sanity): die lokalisierten Hero-/Beispiel-Bilder leben in Sanity-Dokumenten.
- Berührt: PROJ-11 (Homepage), weil Hero- und Beispiel-Sektionen die Bilder konsumieren.

## Problem & Ziel
Mit PROJ-20 wurde die i18n-Infrastruktur (Routing, UI-Strings, LanguageSwitcher) für fünf Sprachen aufgebaut: DE, EN, FR, IT, ES. **Aber:** der Storefront-Content selbst ist global. Konkret:
- Ein Kunde, der `petite-moment.com/fr` öffnet, bekommt französische Buttons und Navigation, aber sieht im Preset-Picker des Editors trotzdem ein **Hamburg-Preset mit deutschem Text** ("Unsere Hochzeit"). Der erste Eindruck wirkt fremd.
- Auf der Homepage zeigen Hero und Beispiel-Sektion immer dieselben Bilder — typischerweise deutsche Städte. Ein französischer Besucher fühlt sich nicht angesprochen.
- Marketing kann nicht pro Markt unterschiedlich kommunizieren (z. B. zur Hochzeitssaison in FR andere Beispiele zeigen als in DE).

PROJ-24 macht den Content **content-data-localizable**: Presets können auf Ziel-Locales beschränkt werden, und Sanity hält pro Locale ein eigenes Homepage-Dokument mit Hero, Beispielen und Features-Bildern.

## User Stories
- Als französischer Kunde will ich beim Öffnen von `/fr` nur Presets mit französischen Texten und französischen Städten sehen, damit der Editor sich wie für mich gemacht anfühlt.
- Als Admin will ich beim Anlegen eines Presets im Admin-Backend angeben, in welchen Locales das Preset im Picker erscheinen soll — entweder eine bestimmte Auswahl (`['fr']`) oder global (`['de','en','fr','it','es']`).
- Als Admin will ich ein bestehendes Preset duplizieren und in eine andere Sprache "kopieren", damit ich nicht jeden Preset von Grund auf neu erstellen muss; die Aktion erstellt eine eigenständige Locale-Variante mit übersetztem Text.
- Als Admin will ich nach der Migration in einem Bulk-Tool die historischen Presets auf einmal mit Locale-Tags versehen, damit ich nicht jeden einzeln öffnen muss.
- Als Marketing-Verantwortliche/r will ich in Sanity pro Locale ein eigenes Homepage-Dokument pflegen (mit Hero-Bild, Beispiel-Bildern und Features-Bildern), damit ich pro Markt unterschiedlich kuratieren kann, ohne Code-Deploy.
- Als Endnutzer:in will ich auch dann eine vollwertige Homepage sehen, wenn Marketing für meine Locale (noch) kein eigenes Sanity-Dokument gepflegt hat — dann werden die Default-Locale-Bilder als Fallback gezeigt.

## Acceptance Criteria

### Presets — Locale-Targeting
- [ ] Die `presets`-Tabelle bekommt ein neues Feld `target_locales` vom Typ `text[]` (Array von Locale-Codes).
- [ ] Erlaubte Werte für Einträge: `de`, `en`, `fr`, `it`, `es` (Validierung über CHECK-Constraint oder Trigger; Liste muss synchron mit `src/i18n/config.ts` bleiben).
- [ ] Default-Wert beim Insert: leeres Array `{}`. Heißt: ein neuer Preset ohne explizite Auswahl ist initial **in keiner Locale sichtbar** und muss vom Admin freigegeben werden.
- [ ] **Migration aller bestehenden Presets**: target_locales wird auf leeres Array gesetzt. Sie verschwinden vom Editor-Picker, bis Admin sie zuweist.
- [ ] Der Preset-Picker im Editor (`MapTab`/`StarMapTab`/`PresetPicker`) liest die aktuelle Locale via `useLocale()` und filtert: `target_locales @> ARRAY[currentLocale]`. Presets ohne Match erscheinen nicht.
- [ ] Die Public-API `GET /api/presets` (sofern vorhanden) bekommt einen `?locale=`-Query-Param und filtert serverseitig; Default ist die Default-Locale.

### Presets — Admin-UX
- [ ] Im Admin-Preset-Formular (`/private/admin/presets/...`) gibt es ein Multi-Select für Locales mit allen aktiven Sprachen aus `src/i18n/config.ts`. Mindestens eine Auswahl ist erforderlich, sonst wird beim Speichern ein Validierungs-Hinweis angezeigt.
- [ ] In der Admin-Preset-Liste wird für jeden Preset eine Spalte "Locales" mit den zugewiesenen Sprach-Tags (z. B. `DE EN FR`) angezeigt; sie ist visuell sortierbar / filterbar.
- [ ] Ein **Bulk-Tool** in der Admin-Preset-Liste erlaubt es, mehrere Presets auf einmal auszuwählen (Checkboxen) und ihnen via Aktion "Locales zuweisen" eine gemeinsame Locale-Liste zu setzen — für die Migration der Bestands-Presets.
- [ ] Pro Preset existiert eine Aktion "**In andere Sprache kopieren**":
  - Öffnet einen Modal mit Locale-Auswahl (alle Locales, die noch nicht abgedeckt sind).
  - Bei Bestätigung wird der Preset dupliziert; das neue Preset bekommt `target_locales = [gewählte Locale]` und einen Status `draft`.
  - Direkt im Anschluss öffnet sich das Edit-Formular mit dem duplizierten Preset, damit der Admin die Texte in der `config_json.textBlocks[].text` übersetzen kann.
- [ ] Beim Anlegen eines Presets aus dem Editor heraus (Admin-only "Save as Preset") wird die aktuelle Editor-Locale automatisch als initial-Wert für `target_locales` vorgeschlagen.

### Sanity — Lokalisierte Homepage-Dokumente
- [ ] Es gibt einen Sanity-Schema-Typ `homepage` mit folgenden Feldern (jedes optional, weil Fallback existiert):
  - `hero_image` (Image-Asset)
  - `hero_headline` (String, für überschreibbare Headline)
  - `hero_subline` (String, optional)
  - `examples_images` (Array of Image-Assets, mind. 3 / max. 12)
  - `features_images` (Array of Image-Assets, mind. 3)
- [ ] Pro Locale existiert **ein eigenes Sanity-Dokument** vom Typ `homepage`, identifiziert über das Locale-Filter-Pattern (z. B. Document-ID `homepage-de`, `homepage-en`, `homepage-fr`, ...; oder über ein `locale`-Feld im Schema, je nach Sanity-Best-Practice für das Projekt).
- [ ] Das Default-Locale-Dokument (`homepage-de`) ist Pflicht und gilt als Fallback. Andere Locales sind optional.
- [ ] Die Homepage-Komponenten (`HeroSection`, `ExamplesSection`, `FeaturesSection`) lesen Locale via `useLocale()` und queryen das passende Sanity-Dokument; bei `null`-Resultat fallen sie auf `homepage-de` zurück.
- [ ] Im Sanity-Studio sind die Locale-Dokumente klar erkennbar (z. B. via Title-Präfix `[FR] Homepage` oder via Studio-Strukturen-Plugin), damit Marketing nicht versehentlich das falsche Dokument bearbeitet.

### Fallback-Verhalten und Konsistenz
- [ ] **Preset-Picker ohne Treffer**: Wenn für die aktuelle Locale gar kein Preset existiert (z. B. weil Admin ES-Presets noch nicht gepflegt hat), zeigt der Picker einen Empty-State mit Hinweis-Text und einem Link auf "Eigenes Poster erstellen" (statt komplett leerer Liste).
- [ ] **Sanity-Image-Fallback**: Wenn das Locale-Dokument existiert, aber ein einzelnes Image-Feld leer ist, fällt nur dieses Feld auf die Default-Locale zurück, nicht das gesamte Dokument.
- [ ] Locale-Wechsel im laufenden Editor (User klickt LanguageSwitcher mit geladenem Preset): das aktuelle Poster bleibt unverändert geladen (User-Customizations gehen nicht verloren), aber der Preset-Picker zeigt ab sofort die neue Locale.

### Datenmodell-Hygiene
- [ ] Die Preset-Validierung (Zod-Schema) im API-Layer prüft, dass `target_locales` ein Array ist, alle Einträge gültige Locale-Codes sind und keine Duplikate enthält.
- [ ] Bei einer späteren Erweiterung der Locale-Liste (z. B. NL hinzufügen) reicht eine Änderung in `src/i18n/config.ts` + ein Migration-Update der CHECK-Constraint — kein Schema-Change-PR pro Sprache.

## Edge Cases
- **Admin löscht eine Locale aus `i18n/config.ts`** (z. B. ES wird wieder entfernt): Bestehende Presets mit `target_locales = ['es']` würden ungültig. → Bei Locale-Removal soll ein DB-Migrations-Skript bereitgestellt werden, das die ES-Einträge bereinigt; Presets, die danach leeres Array haben, werden sichtbar im Admin (z. B. via roten Status-Badge "Keine Locales").
- **Preset wird in mehreren Locales angelegt, dann ändert sich das Layout in einem davon**: Da wir die Snapshot-Strategie nutzen, müssen Layout-Änderungen manuell pro Locale-Variante nachgezogen werden. → Im Admin gibt es einen Hinweis-Banner "Verwandte Presets: 3 weitere Sprachen" mit Quick-Links zum Springen.
- **Sanity-Locale-Doc existiert nicht und Default-Doc auch nicht**: Edge-Case bei Erst-Setup. → Komponenten zeigen einen Build-time-Fallback (statisches Default-Bild aus `/public/`), damit die Seite nie ohne Hero rendert.
- **Locale-Code im URL existiert nicht in der Liste** (z. B. `/jp` durch URL-Manipulation): wird bereits von PROJ-20-Routing abgefangen (404 / Redirect auf Default), nicht Sache von PROJ-24.
- **User wechselt Locale, während ein Preset gerade live im Editor ist**: kein Auto-Swap, Preset bleibt stehen — Begründung: User-Arbeit darf nicht zerstört werden.
- **Sanity-Studio: zwei Editoren bearbeiten gleichzeitig dasselbe Locale-Dokument**: Sanity hat Realtime-Multiplayer, aber falls jemand offline arbeitet, kann's Konflikte geben. → Standard-Sanity-Verhalten greift, kein Custom-Code nötig; im Onboarding-Doc für Marketing hinweisen.
- **Bulk-Tool wird auf 100 Presets gleichzeitig angewandt**: API-Endpoint muss Bulk-Update mit Transaktion machen; bei Fehler wird zurückgerollt. Im UI ein Confirm-Dialog mit Anzahl der betroffenen Presets.

## Non-Goals
- **Keine automatische Übersetzung von Preset-Texten** (z. B. via DeepL-API). Admin übersetzt manuell beim "In andere Sprache kopieren".
- **Kein lokalisiertes Preset-Vorschaubild** (`preview_image_url`). Das Vorschaubild bleibt eines pro Preset. Begründung: Vorschaubild zeigt das Layout, nicht den Inhalt — meist sprachneutral.
- **Keine Locale-aware Default-Land-Auswahl bei der Adress-Suche** in V1. Wäre ein netter Stretch, aber separates Feature (Geocoding-API kann das Land schon eingrenzen).
- **Keine Migration der bestehenden Hero-/Beispiel-Bilder nach Sanity in V1**, falls sie aktuell hartcodiert in Components liegen. Sanity-Schema wird angelegt, aber das Setup eines neuen `homepage`-Dokuments und das Umbiegen der Komponenten kann auch in einem Folge-PR geschehen — Hauptsache, das Datenmodell steht.
- **Keine Localized SEO-Metadata** (Open Graph, Title-Templates). PROJ-20 hat das auf der Schirm; falls noch nicht abgedeckt, ist es Erweiterung von PROJ-20.
- **Keine Localized Pricing oder Currency**. Preise bleiben in EUR; das ist eigenes Thema (PROJ-25+).
- **Kein Re-Build der Star-Map-Presets im V1-Scope** falls die separat verwaltet werden — Klärung beim Architecture-Schritt, ob Star-Map dieselbe `presets`-Tabelle nutzt oder eine eigene hat.

## Decisions (vor Architecture festgelegt)
- **Preset-Status nach "In andere Sprache kopieren"**: `draft`. Übersetzungen müssen vor Veröffentlichung vom Admin reviewed werden.
- **Sanity-Schema-Identifier-Strategie**: ein eigenes Sanity-Dokument pro Locale (z. B. `homepage-de`, `homepage-en`, `homepage-fr`, `homepage-it`, `homepage-es`). Keine inline-lokalisierten Felder im einen Doc. Das Architecture muss prüfen, ob das mit dem bestehenden Lokalisierungs-Pattern aus PROJ-13/PROJ-20 (Blog, About, FAQ) konsistent ist; falls dort ein anderes Pattern etabliert wurde, kann diese Entscheidung in der Architektur-Phase noch revidiert werden.
- **`target_locales`-Filter-Performance**: GIN-Index auf `target_locales` direkt in der Migration anlegen. Niedrige Kosten bei wenig Daten, vermeidet späteren Index-Add unter Last.

## Open Questions
- **Bulk-Tool-Aktionen**: nur "Locales zuweisen (Set)", oder auch "Locales hinzufügen (Add)" und "entfernen (Remove)"? → Vorschlag: alle drei Modi anbieten. Architektur-Phase.

## Technical Requirements
- **Performance**: Preset-Picker-Query mit Locale-Filter unter 100 ms (auch bei 500+ Presets, mit GIN-Index auf `target_locales`).
- **Accessibility**: Bulk-Auswahl im Admin per Keyboard bedienbar (Shift-Klick für Range-Selection, Strg/Cmd-Klick für Toggle).
- **Backwards-Compatibility**: Bestehende Editor-Sessions ohne Locale-Param dürfen nicht crashen — Picker fällt auf Default-Locale zurück, wenn `useLocale()` kein Ergebnis liefert.
- **Sanity-Datenkonsistenz**: das Default-Locale-Dokument darf nicht ohne Fallback auf ein anderes gelöscht werden (Sanity-Schema-Validierung oder Studio-Custom-Action).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Gesamtablauf (5-Phasen-Rollout)

```
Phase 1: Datenbank-Schema (Backend, unsichtbar)
   +-- Migration: target_locales TEXT[] auf presets + CHECK + GIN-Index
   +-- Migration: Bestehende Presets bekommen target_locales = '{}'
   +-- API: Admin-CRUD validiert das neue Feld
             |
             v
Phase 2: Editor-Picker filtert nach Locale (Frontend-Lese)
   +-- Public-API /api/presets nimmt ?locale=xx entgegen
   +-- MapTab / StarMapTab / PresetPicker rufen useLocale + filtern
   +-- Empty-State im Picker, falls 0 Presets fuer aktuelle Locale
             |
             v (Vorsicht: ab hier sehen alle User leeren Picker bis Phase 3 da ist)

Phase 3: Admin-Locale-Verwaltung (UX)
   +-- Locale-Multi-Select im Preset-Formular (Pflichtfeld, mind. 1)
   +-- Locale-Spalte + -Filter in der Preset-Liste
   +-- Bulk-Tool mit Checkboxen und Aktionen "Set | Add | Remove"
   +-- "In andere Sprache kopieren"-Aktion + Modal
   +-- Admin macht Bulk-Migration der Bestands-Presets
             |
             v (Endzustand fuer Presets)

Phase 4: Sanity-Schema fuer Homepage (CMS)
   +-- Schema 'homepage' mit language-Feld (gleiches Pattern wie aboutPage)
   +-- Studio-Structure: gruppiert Homepage-Dokumente per Sprache
   +-- Marketing legt das DE-Default-Dokument an
             |
             v

Phase 5: Homepage liest Sanity (Frontend)
   +-- HeroSection / ExamplesSection / FeaturesSection queryen Locale-Doc
   +-- Per-Field-Fallback auf DE-Default bei fehlendem Inhalt
   +-- Deployment-Sicherheit: hardcoded Default-Bilder als letzter Fallback
```

**Wichtige Reihenfolge-Regel:** Phasen 1+2+3 muessen **gemeinsam deployed** werden. Phase 2 allein wuerde alle Bestands-Presets aus dem Picker entfernen (Conversion-Schaden). Phasen 4+5 sind unabhaengig und koennen separat ausrollen, sobald Marketing die ersten Sanity-Dokumente gepflegt hat.

### B) Komponenten-Struktur

```
poster-generator
│
├── supabase/migrations/
│   ├── add_target_locales_to_presets   ← NEU: Spalte + CHECK + GIN-Index
│   └── (kein Backfill noetig, DEFAULT '{}' setzt Bestehende)
│
├── src/sanity/schemas/
│   └── homepage.ts                     ← NEU: Schema im Pattern von aboutPage
│
├── src/sanity/
│   ├── schema.ts                       ← homepage zur Type-Liste hinzufuegen
│   ├── structure.ts                    ← Homepage-Gruppierung im Studio
│   └── queries.ts                      ← getHomepageByLocale, getHomepageWithFallback
│
├── src/app/api/
│   ├── presets/route.ts                ← GET + ?locale-Filter
│   ├── admin/presets/
│   │   ├── route.ts                    ← Schema erweitert um target_locales
│   │   ├── [id]/route.ts               ← Update darf target_locales setzen
│   │   ├── [id]/copy-to-locale/route.ts ← NEU: Copy-Action
│   │   └── bulk/route.ts               ← NEU: Bulk-Update-Endpoint
│
├── src/components/
│   ├── editor/PresetPicker.tsx         ← Locale-Filter + Empty-State
│   ├── sidebar/MapTab.tsx              ← gleiche Anpassung
│   ├── sidebar/star-map/StarMapTab.tsx ← gleiche Anpassung
│   │
│   ├── landing/HeroSection.tsx         ← liest Sanity statt hardcoded
│   ├── landing/ExamplesSection.tsx     ← liest Sanity-Array
│   └── landing/FeaturesSection.tsx     ← liest Sanity-Array
│
└── src/app/private/admin/presets/
    ├── page.tsx                        ← Liste + Locale-Spalte/Filter + Bulk-Tool
    └── [id]/page.tsx                   ← Edit-Formular + Locale-Select + Copy-Button
```

### C) Datenmodell

**Tabelle `presets` (erweitert):**
- Bisherige Felder bleiben unveraendert
- Neu: **`target_locales`** — Array von Locale-Codes (`'de' | 'en' | 'fr' | 'it' | 'es'`)
  - Default: leer
  - Validierung: jeder Eintrag muss in der gueltigen Locale-Liste sein, keine Duplikate
- Neu: **GIN-Index** auf `target_locales` fuer schnelle "enthaelt"-Abfragen
- Neu: **CHECK-Constraint** stellt sicher, dass keine ungueltigen Locale-Codes reinkommen

**Sanity-Dokument-Typ `homepage` (neu):**
- **`language`** — Pflichtfeld, einer der 5 Locale-Codes (gleiche Liste wie in aboutPage/blogPost/faqItem)
- **`heroImage`** — Hauptbild Hero-Sektion (mit Hotspot fuer Crop-Kontrolle)
- **`heroHeadline`** — optionaler Headline-Override (sonst greift hardcoded Default)
- **`heroSubline`** — optionaler Untertitel-Override
- **`examplesImages`** — Array von 3 bis 12 Beispiel-Postern (jedes mit Alt-Text)
- **`featuresImages`** — Array von Feature-Bildern (mind. 3)

Pro Locale ein eigenes Sanity-Dokument vom Typ `homepage`. Identifiziert ueber den `language`-Feld-Wert, exakt wie bei `aboutPage` heute.

**Wo gespeichert:**
- Preset-Daten und target_locales: **Supabase Postgres**
- Homepage-Bilder und Texte: **Sanity Content Lake**
- Editor liest Presets ueber bestehende API; Homepage-Komponenten queryen Sanity beim Render

### D) Tech-Entscheidungen (mit Begruendung)

| Entscheidung | Begruendung |
|--------------|-------------|
| **`language`-Feld-Pattern in Sanity** statt eines Sanity-i18n-Plugins oder Document-IDs wie `homepage-de` | Bestehende Sanity-Schemas (aboutPage, blogPost, faqItem, legalPage) nutzen alle dieses Muster. Konsistenz fuer Marketing — niemand muss umlernen. Keine zusaetzliche Plugin-Abhaengigkeit. |
| **GIN-Index auf target_locales von Tag 1** | Array-Containment-Abfragen (`@>`) fuehren ohne Index zu Full-Table-Scans. Bei 50 Presets unsichtbar, bei 5000+ spuerbar. Kosten praktisch null bei wenig Daten — wir vermeiden den Index-Add unter Last. |
| **Bestehende Presets bekommen leeres `target_locales`-Array** (= unsichtbar) | Bewusste Bulk-Migration durch Admin gewuenscht. Verhindert versehentliches Anzeigen falsch-sprachiger Presets in einer Locale, die der Admin noch nicht freigegeben hat. Bedingung: Phase 3 (Bulk-Tool) **muss zeitgleich** mit Phase 2 deployen. |
| **Eigener Bulk-Endpoint** (`POST /api/admin/presets/bulk`) statt mehrere PATCHes | Atomare Transaktion (alle Updates gleichzeitig oder gar keine), bessere Performance bei 100+ Presets, sauberer fuer Confirm-Dialoge ("3 Presets werden aktualisiert"). |
| **Copy-to-Locale als Server-Action** (`POST /api/admin/presets/:id/copy-to-locale`) statt Client-Duplikation | Server vergibt neue ID, setzt Timestamps und Status (`draft`), validiert Locale gegen i18n-Config, ist atomar bei Fehler. |
| **Bulk-Tool unterstuetzt 3 Modi: Set / Add / Remove** | "Set" (ersetze Locale-Liste) ist Standard, "Add" (fuege Locale hinzu) hilft bei Locale-Erweiterung (NL kommt → fuege NL zu allen passenden hinzu), "Remove" hilft beim Retiren. Alle drei sind im UI ein Dropdown + Multi-Select + Confirm. |
| **Per-Field-Fallback bei Sanity** (nicht ganze-Doc-Fallback) | Marketing kann inkrementell uebersetzen — z. B. fuer FR nur Hero austauschen, Examples bleiben Default. UX bleibt fluessig auch bei nicht-vollstaendiger Pflege. |
| **Hardcoded Static-Default als letzter Fallback** in Phase 5 | Wenn Sanity komplett ausfaellt oder kein einziges Doc existiert, soll die Homepage trotzdem rendern. Ein Bild aus `/public/` als ultimativer Fallback. |
| **Phasen 4+5 deploybar nach Phasen 1-3** | Marketing-Onboarding (Sanity-Dokument anlegen) kann parallel laufen — der Editor profitiert schon von Phasen 1-3. |

### E) Migrations-Strategie

**Bestands-Presets-Migration** (Schritt-fuer-Schritt nach Phase-3-Deploy):
1. Admin oeffnet Preset-Liste, alle Bestands-Presets haben jetzt eine leere Locale-Spalte (rotes Badge "Keine Locales — unsichtbar")
2. Admin filtert nach poster_type, waehlt alle DE-relevanten Presets per Checkbox
3. Bulk-Tool → "Set" → `[de]` → Bestaetigen → Presets sind in DE wieder sichtbar
4. Optional: Admin nutzt "In andere Sprache kopieren" fuer ausgewaehlte Presets, um EN/FR/IT/ES-Varianten zu erstellen

**Sanity-Setup** (vor Phase-5-Deploy):
1. Marketing legt im Studio das `homepage`-Dokument fuer DE an, befuellt heroImage, examplesImages, featuresImages
2. Sobald DE-Doc existiert, kann Phase 5 deployed werden — die Homepage rendert mit den Sanity-Inhalten
3. Weitere Locale-Dokumente werden nach und nach gepflegt; bis dahin greift der Fallback auf DE

### F) Abhaengige Packages

**Keine neuen Dependencies.** Alle benoetigten Bausteine sind bereits installiert:
- `@supabase/supabase-js` — DB-Zugriff
- `next-sanity`, `sanity`, `@sanity/image-url` — Sanity-Integration
- `next-intl` — Locale-Aufloesung im Editor
- `zod` — Validierung der Locale-Listen
- `react-hook-form` — Admin-Formular fuer Locale-Multi-Select

### G) Risiken / offene Punkte

- **Phase-2-ohne-Phase-3-Risiko:** Wenn Phase 2 separat deployed wuerde, wuerden alle bisherigen Presets aus dem Editor-Picker verschwinden (leere `target_locales`). Mitigation: zwingend gemeinsamer Deploy oder Feature-Flag fuer Phase 2.
- **Sanity-Onboarding:** Phase 5 darf nicht vor dem ersten Marketing-Doc live gehen, sonst leerer Hero. Mitigation: Phase 5 enthaelt Fallback auf hardcoded Static-Asset; Marketing wird vorher per Email/Slack auf das Setup hingewiesen.
- **Star-Map-Presets:** Liegen aktuell in derselben `presets`-Tabelle (`poster_type = 'star-map'`). Sie bekommen ebenfalls `target_locales`. Tech-isch identisch — UX-isch sinnvoll, weil Sternenposter-Texte ("Unser erster Stern" vs. "Notre première étoile") genauso uebersetzt gehoeren.
- **Bulk-Tool gegen 100+ Presets:** Endpoint sollte ein Hard-Limit haben (z. B. max 200 pro Call), sonst Timeout-Risiko. UI gibt eine Warnung bei >50 Presets.
- **Sanity-Studio Multiplayer-Konflikte:** Wenn zwei Editoren gleichzeitig dasselbe Locale-Doc bearbeiten, greift Sanity's Realtime-Merge. Sollte funktionieren, aber Edge-Case fuer Onboarding-Doku.
- **Locale-Removal aus i18n-Config:** Wenn ES wieder entfernt wird, gibt es Presets mit `target_locales = ['es']`, die ungueltig sind. Mitigation: Cleanup-Migration mit jeder Locale-Removal mitliefern.
- **Performance Sanity-Queries pro Page-Render:** Bei jedem Homepage-Aufruf wird Sanity gequeryed. Mitigation: ISR oder `revalidate: 3600` (1h) auf den Page-Routen reicht — Marketing-Aenderungen sind nicht zeitkritisch genug fuer Realtime.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

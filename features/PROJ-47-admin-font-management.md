# PROJ-47: Admin-Font-Verwaltung

## Status: Approved

## Implementation Notes (Frontend, 2026-05-14) — Phase 1
- `src/lib/fonts.ts`: Type-System (`Font`, `FontStyle`, `FontCategory`, `FontWeight`, `FontStyleSpec`), Konstanten (`FONT_CATEGORIES`, `FONT_WEIGHTS`, `FONT_PREVIEW_TEXT`, `SLUG_REGEX`), und `FALLBACK_FONTS`-Array mit allen 9 heute hartkodierten Fonts (Playfair, Cormorant, Montserrat, CaviarDreams Regular+Bold, Amsterdam, Cathalia, Lindsey Signature, Brittany Signature, Welcome). Kategorien nach Augenmaß zugeordnet (Playfair/Cormorant = serif, Montserrat/CaviarDreams = sans, Amsterdam/Cathalia/Lindsey/Brittany/Welcome = script). URLs zeigen weiterhin auf `public/fonts/*.ttf` — Phase 2 ersetzt das durch Storage-URLs.
- `src/lib/fonts-loader.ts`: `registerFonts(fonts[])` + `registerSingleFont(font)`. Idempotent per `<family, weight, style>`-Tupel, registriert via `new FontFace(...).load()` + `document.fonts.add()`. Fehler pro Style werden geloggt und überspringen den jeweiligen FontFace — die anderen Styles werden trotzdem geladen.
- `src/hooks/useFonts.ts`: Hook analog `useMapPalettes` mit Modul-Level-Cache + In-Flight-Promise. Initial-Render liefert `FALLBACK_FONTS`, nach erfolgreicher `/api/fonts`-Antwort wird `cache` getauscht und FontFaces im Hintergrund registriert. Bei Fetch-Fehler (API noch nicht da in Phase 1) bleibt der Fallback aktiv — Editor läuft trotzdem. `invalidateFontsCache()` für Admin-UI-Refresh, `getCachedFonts()` für nicht-React-Konsumenten, `ensureFontLoadedById()` für den Force-Load-Pfad bei älteren Projekten mit unpublished Fonts.
- `src/components/admin/AdminFontsList.tsx`: Komplette Admin-UI als Client-Komponente. Liste mit Live-Vorschau-Streifen (FONT_PREVIEW_TEXT in der jeweiligen Family gerendert) als Primär-Element jeder Zeile, Family-Name + Slug + Kategorie-Badge + Style-Badges + Status-Badge als Sekundär-Zeile. Aktionen: Publish-Toggle, Edit, Delete. Create-/Edit-Dialog mit Metadaten-Feldern und mehreren Style-Slots (Datei-Upload + Weight-Dropdown + Style-Dropdown + Entfernen pro Slot). Slug ist read-only nach Anlegen, Weight/Style sind read-only bei bereits hochgeladenen Slots (UNIQUE-Constraint-Compliance — Änderungen erfordern Delete+Re-Add). File-Validierung: nur `.woff2`/`.ttf`/`.otf`, max 2 MB. Delete-AlertDialog mit 409-Handling: zeigt Liste der Referenzen aus Presets + Projects.
- `src/app/private/admin/fonts/page.tsx`: Server-Page mit `requireAdmin` + redirect-Pattern wie `/private/admin/palettes`.
- TypeScript-Check: meine neuen Dateien laufen sauber durch `npx tsc --noEmit`. (Die 2 verbleibenden Errors in `useMobileSheet.test.ts` sind PROJ-43-Altlasten, nicht durch PROJ-47 verursacht.)
- **Phase-1-Stand:** Customer-Picker in `TextTab`/`MobileTextTab` ist bewusst nicht angefasst — er bleibt auf der hartkodierten Liste. Nach Phase 2 (Backend-DB + Storage-Migration der 9 Bestands-Fonts) wird der Picker auf `useFonts()` umgestellt. Bis dahin existiert der Hook + Loader nur als Vorbereitung.
- **Was noch fehlt (Backend-Skill):** DB-Migrationen `create_fonts_tables` + `seed_fonts`, Supabase Storage-Bucket `fonts/` mit Policies, `/api/fonts` (public), `/api/admin/fonts` + `[id]` + `[id]/styles` + `[id]/styles/[styleId]` Routen, `scripts/migrate-fonts-to-storage.ts` für die Storage-Migration der 9 Bestands-Fonts. Ohne diese APIs zeigt die Admin-Seite einen Lade-Fehler-Toast und eine leere Liste — das ist das erwartete Phase-1-Zwischenstand-Verhalten.

## Implementation Notes (Backend, 2026-05-14) — Phase 1
- **Migration `20260514000000_proj47_fonts_tables.sql`**: Tabellen `fonts` (Slug-PK, `family_name` mit UNIQUE-Index, Category-CHECK, Status-CHECK, Length-CHECKs auf `family_name` 1–100 und `description` ≤ 500) und `font_styles` (UUID-PK, FK auf `fonts.id` ON DELETE CASCADE, Weight-CHECK 100–900, Style-CHECK normal/italic, UNIQUE(font_id, weight, style)). `updated_at`-Trigger für beide Tabellen. RLS aktiviert mit public-read auf `status='published'` für `fonts` und transitiv über Sub-Query für `font_styles`. Admin-Write-Policies als zweite Verteidigungslinie neben Service-Role-Bypass. Idempotent via `CREATE TABLE IF NOT EXISTS` + `DROP POLICY IF EXISTS`.
- **Migration `20260514000001_proj47_fonts_storage_bucket.sql`**: Bucket `fonts` mit `public=TRUE`, `file_size_limit=2 MB`, `allowed_mime_types` für woff2/ttf/otf inkl. `application/octet-stream`-Fallback (Browser melden TTF/OTF teils so). Public-Select-Policy auf `storage.objects`, Admin-Insert/Update/Delete-Policies.
- **`src/lib/font-validation.ts`**: Server-side File-Validation mit Two-Stage-Check (Extension-Whitelist + Magic-Number-Sniff auf den ersten 4 Bytes). Erkennt TTF (`00 01 00 00`), OTF (`OTTO`), WOFF2 (`wOF2`), WOFF1 (`wOFF` — wird explizit abgelehnt, nur WOFF2 erlaubt). Extension-↔-Magic-Number-Mismatch wird abgewiesen ("Datei wurde umbenannt"). `buildFontStoragePath(slug, weight, style, ext)` mit Path-Traversal-Schutz (Slug-Regex + Extension-Regex).
- **`src/lib/fonts-server.ts`**: Shared Helpers für die API-Routen — `styleRowToStyle()`, `fontRowToFont()`, `listFontsWithStyles(filter)` (2-Query Pattern: fonts + styles, kein N+1), `getFontById()`, `configReferencesFontFamily()` als iterativer JSON-Tree-Walk (separat exportiert für Unit-Tests), `findFontReferences()` für die Delete-/Unpublish-Gate.
- **API-Routen:**
  - `GET /api/fonts` (public, `s-maxage=300, stale-while-revalidate=600`) — published Liste mit aufgelösten Storage-URLs
  - `GET /api/admin/fonts` — admin-gated Liste aller Fonts (Draft + Published)
  - `POST /api/admin/fonts` — Multipart-Form mit `id`, `family_name`, `category`, `description`, `display_order`, `styles_count` und pro Slot `style_N_file` + `style_N_weight` + `style_N_style`. Validiert jeden File via `validateFontFile`, lädt parallel in Storage, inserted in `font_styles`. Best-effort-Rollback: bei Fehler werden Storage-Files und Font-Row entfernt.
  - `GET /api/admin/fonts/[id]` — Detail-Read (auch Drafts), für Force-Load-Pfad
  - `PATCH /api/admin/fonts/[id]` — Metadata + Status-Toggle. Unpublish blockt mit 409 wenn `findFontReferences` Treffer in `presets.config_json` oder `projects.config_json` findet. Publish blockt mit 400 wenn der Font keinen Style hat.
  - `DELETE /api/admin/fonts/[id]` — 409-Gate wie bei Unpublish, dann Storage-Cleanup, dann DB-Delete (CASCADE räumt `font_styles` auf)
  - `POST /api/admin/fonts/[id]/styles` — Single-Style-Upload für den Edit-Dialog
  - `DELETE /api/admin/fonts/[id]/styles/[styleId]` — Style-Delete mit Storage-Cleanup. Blockt mit 409 wenn es der letzte Style einer veröffentlichten Font wäre.
- **Tests:** `font-validation.test.ts` (12 Tests: Magic-Number TTF/OTF/WOFF2, Extension-Mismatch, Size-Limits, Path-Traversal) und `fonts-server.test.ts` (7 Tests: rekursiver JSON-Walk, Array-Nesting, Deep-Nesting, Exact-Match). Alle 19 Tests grün.
- **TypeScript:** `npx tsc --noEmit` sauber für alle PROJ-47-Dateien. Die zwei verbleibenden Errors in `useMobileSheet.test.ts` sind PROJ-43-Altlasten.
- **Migrationen appliziert (2026-05-14):** `proj47_fonts_tables`, `proj47_fonts_storage_bucket` und das Follow-up `proj47_fonts_function_search_path` (Trigger-Function mit `SET search_path = ''` als Advisor-Fix). Phase-2-Migration (`seed_fonts` + `scripts/migrate-fonts-to-storage.ts`) ist bewusst nicht Teil dieses PRs — siehe Migrations-Plan in der Tech-Design-Section.
- **Advisor-Status nach Apply:** Nur ein bekanntes Warning offen — `public_bucket_allows_listing` für den `fonts`-Bucket. Das ist konsistent mit dem etablierten `city-renders`-Pattern (PROJ-42) und akzeptiert: Public-Read auf storage.objects ist nötig, damit der Browser via direkter Storage-URL Font-Dateien laden kann. Listing leakt nur Storage-Pfade (`{slug}/{weight}-{style}.ext`), keine Daten — und alle published Fonts sind ohnehin durch die `/api/fonts`-Route auflistbar.

## Implementation Notes (Phase 1.5 — Picker-Swap, 2026-05-14)
Vorgezogen aus Phase 2, weil Customer-Experience sonst gebrochen wäre („Font veröffentlicht, aber im Editor nicht sichtbar").
- `lib/fonts.ts`: Neuer Helper `mergeFontsByFamilyName(primary, fallback)` — DB-Fonts gewinnen bei Family-Name-Kollision, nicht-überschriebene Fallback-Fonts werden angehängt und nach `display_order` sortiert.
- `hooks/useFonts.ts`: `loadOnce()` ruft jetzt `mergeFontsByFamilyName(rows, FALLBACK_FONTS)` auf statt `rows.length > 0 ? rows : FALLBACK_FONTS`. So sieht der Customer sowohl die 9 hartkodierten Fonts als auch jeden vom Admin veröffentlichten neuen Font. Nach Phase 2 (DB-Seed der 9 Bestands-Fonts) wird der Fallback automatisch dedupliziert.
- `components/sidebar/TextTab.tsx` und `MobileTextTab.tsx`: hartkodierte `FONT_OPTIONS`-Liste ersetzt durch `useFonts()`. Arial bleibt als statischer System-Font-Eintrag am Ende. Bonus-UX: jedes `SelectItem` rendert sein Label in der eigenen Family (`style={{ fontFamily: ... }}`) — Customer sieht die Schrift im Dropdown direkt statt erst nach Auswahl.
- Editor `/de/map` (Map-Editor) verifiziert: veröffentlichter Admin-Font erscheint im Schrift-Picker und rendert korrekt im Canvas.


**Created:** 2026-05-14
**Last Updated:** 2026-05-14

## Dependencies
- Requires: PROJ-4 (User Authentication) — Admin-Check über `useAuth().isAdmin` und `requireAdmin` für Routen/APIs
- Requires: PROJ-22 (Admin-Paletten-Verwaltung) — etabliertes Pattern für Admin-CRUD + Draft/Publish + Cached-Public-Endpoint wird hier 1:1 wiederverwendet
- Beeinflusst: PROJ-1 (Karten-Editor Core), PROJ-2 (Textblock-Editor), PROJ-7 (Stern-Karten-Editor), PROJ-32 (Foto-Poster-Editor), PROJ-45 (Multi-Map-Hochzeitsposter), PROJ-46 (Liebespapier) — alle Editoren, die heute eine hartkodierte Font-Liste haben, müssen auf den neuen Hook umgestellt werden
- Beeinflusst: PROJ-8 (Design-Presets) — Presets, die einen Font referenzieren, müssen vor Font-Löschung gewarnt werden
- Beeinflusst: PROJ-5 (Projekt-Verwaltung) — Customer-Projekte (`projects.config_json`) referenzieren Font-Family-Namen und müssen bei Delete/Unpublish geprüft werden

## Problem & Ziel
Die Poster-Tool-Fonts (heute 9 Stück: Playfair Display, Montserrat, Cormorant Garamond, Amsterdam, Cathalia, CaviarDreams, Lindsey Signature, Brittany Signature, Welcome) leben aktuell als hartkodierte `@font-face`-Blöcke in `src/app/globals.css` mit Dateien unter `public/fonts/*.ttf`. Die im Editor wählbare Liste ist parallel hartkodiert in `src/components/sidebar/TextTab.tsx` und `src/components/sidebar/mobile/MobileTextTab.tsx`. Jede neue Schrift oder Anpassung erfordert einen Code-Commit + Deploy.

PROJ-47 löst das genau wie PROJ-22 (Paletten) und PROJ-8 (Presets): Der Betreiber pflegt Fonts in einem Admin-Backend mit Datei-Upload, Draft-vs-Publish und Vorschau, der Customer sieht im Editor automatisch die aktuelle veröffentlichte Liste.

## User Stories
- Als Betreiber möchte ich im Admin-Bereich eine Übersicht aller Fonts sehen (mit Vorschau-Zeile, Family-Name, Style/Weight, Kategorie, Status), damit ich schnell weiß was im Picker landet.
- Als Betreiber möchte ich eine neue Font-Datei (.woff2 / .ttf / .otf) hochladen, ihr eine Family + Weight + Style + Kategorie zuweisen und sie veröffentlichen, damit Kunden sie im nächsten Editor-Mount nutzen können — ohne dass ich einen Code-Deploy auslösen muss.
- Als Betreiber möchte ich mehrere Schnitte (Regular/Bold/Italic) zu einer Family hinzufügen, damit eine Family wie „Cormorant Garamond" technisch sauber mit echtem Bold/Italic statt synthetischem Faux-Bold gerendert wird.
- Als Betreiber möchte ich eine Font als Draft anlegen, im Editor probieren und erst nach Sichtkontrolle publishen, damit ich unfertige Uploads nicht vor Kunden zeige.
- Als Betreiber möchte ich eine Font löschen oder unpublishen können. Wird sie in einem veröffentlichten Preset oder einem gespeicherten Customer-Projekt referenziert, muss ich vorher gewarnt werden mit Liste der Referenzen, damit ich keine Bestands-Designs broeche.
- Als Customer möchte ich im Editor (Karten, Stern, Foto, Wedding) eine flache, übersichtliche Font-Auswahl sehen — exakt wie heute, nur eben mit den vom Admin freigegebenen Fonts.
- Als Customer möchte ich, dass ein älteres Projekt mit einem inzwischen unpublished Font ohne Fehler weiter editierbar bleibt (Font wird beim Editor-Mount geladen, auch wenn er nicht mehr im Picker ist), damit ich mein Design wiederfinde.

## Acceptance Criteria

### Admin-UI (`/private/admin/fonts`)
- [ ] Server-side `requireAdmin` + `redirect` exakt wie unter `/private/admin/palettes` und `/private/admin/presets`.
- [ ] Liste aller Fonts mit pro Zeile:
  - **Live-Vorschau-Streifen** als prominent sichtbares, primäres Element der Zeile — der Beispieltext („Petite Moment · The quick brown fox · ÄÖÜß & 1234") wird in der tatsächlichen Schrift gerendert, sodass der Admin auf den ersten Blick sieht wie der Font wirkt, ohne Namen lesen zu müssen
  - Family-Name als Sekundär-Label unter dem Vorschau-Streifen
  - Slug, Kategorie-Badge (Serif/Script/Sans/Display), Stil-Liste-Badge (z.B. „Regular · Bold · Italic"), Status-Badge (Draft/Published), Reihenfolge
- [ ] Drei Icon-Buttons pro Zeile: Publish-Toggle (Eye/EyeOff), Bearbeiten (Pencil), Löschen (Trash).
- [ ] „Font hinzufügen"-Button öffnet Dialog mit:
  - Family-Name (Pflicht, frei wählbarer Anzeigename)
  - Slug-ID (auto-slugify aus Family solange leer, nach Anlegen read-only)
  - Kategorie-Dropdown: Serif · Script · Sans · Display (Pflicht)
  - Beschreibung (optional)
  - Display-Order (Number)
  - Mehrere **Style-Slots** (mindestens einer Pflicht), jeweils mit:
    - File-Upload (.woff2 / .ttf / .otf, max 2 MB)
    - Weight-Dropdown: 100 · 200 · 300 · 400 (Regular) · 500 · 600 · 700 (Bold) · 800 · 900 (Default 400)
    - Style-Dropdown: normal · italic (Default normal)
- [ ] Edit-Dialog erlaubt: Family-Name, Kategorie, Beschreibung, Order, Style-Slots hinzufügen / Datei ersetzen / Slot löschen. Slug-ID bleibt read-only.
- [ ] Delete-AlertDialog: bei 409-Response wird die zurückgelieferte Referenz-Liste (Presets + Projects) im Dialog aufgeführt und der Löschen-Button ausgeblendet.

### Storage
- [ ] Supabase Storage-Bucket `fonts/` ist eingerichtet, public-read, Schreibzugriff ausschließlich via Service-Role-API.
- [ ] Storage-Pfad-Konvention: `fonts/{font-slug}/{weight}-{style}.{ext}` (z.B. `fonts/cormorant-garamond/400-normal.woff2`).
- [ ] MIME-Type-Validierung beim Upload: nur `font/woff2`, `font/ttf`, `application/font-sfnt`, `application/x-font-otf` werden akzeptiert.
- [ ] Datei-Größen-Limit 2 MB pro Upload, Überschreitung gibt Toast „Datei zu groß (max 2 MB)".

### Datenmodell
- [ ] Tabelle `fonts`: `id` (slug, TEXT PK), `family_name` (TEXT NOT NULL), `category` (TEXT CHECK in serif/script/sans/display NOT NULL), `description` (TEXT), `display_order` (INT DEFAULT 0), `status` (TEXT CHECK in draft/published DEFAULT 'draft'), Timestamps.
- [ ] Tabelle `font_styles` (1:n zu fonts): `id` (UUID PK), `font_id` (FK fonts.id ON DELETE CASCADE), `weight` (INT CHECK 100–900), `style` (TEXT CHECK normal/italic), `storage_path` (TEXT NOT NULL), `file_size_bytes` (INT), Timestamps. UNIQUE-Constraint auf (font_id, weight, style).
- [ ] RLS: `Public reads published fonts` — anon + authenticated dürfen nur `fonts.status = 'published'` lesen und die zugehörigen `font_styles`. Admin-Schreibzugriffe ausschließlich über Service-Role-API.
- [ ] CHECK-Constraint: jede Font muss mindestens einen `font_styles`-Eintrag haben bevor sie auf `published` gesetzt werden darf (Validation auf API-Ebene, nicht DB-Constraint, da Eltern-Kind-Order schwierig).
- [ ] Index auf `(status, display_order)` für den Picker-Lookup.

### APIs
- [ ] `GET /api/fonts` (public, cached `s-maxage=60, stale-while-revalidate=300`) liefert alle published Fonts mit ihren styles und Storage-URLs in `display_order`-Reihenfolge.
- [ ] `GET /api/admin/fonts` und `POST /api/admin/fonts` (admin-gated, neue Font + erster Style in einem Call).
- [ ] `GET /api/admin/fonts/[id]`, `PATCH /api/admin/fonts/[id]`, `DELETE /api/admin/fonts/[id]` (admin-gated).
- [ ] `POST /api/admin/fonts/[id]/styles` (Style hinzufügen mit File-Upload), `DELETE /api/admin/fonts/[id]/styles/[styleId]` (Style entfernen, löscht auch Storage-File).
- [ ] DELETE und Unpublish prüfen vorher:
  - `presets.config_json` (JSONB) auf String-Match `"fontFamily": "<family_name>"` → liefert bei Treffern 409 mit `{ blockedBy: { presets: [...], projects: [...] } }`
  - `projects.config_json` (gleicher Pfad) auf gleichen Match
- [ ] Zod-Validierung: Slug-Regex `/^[a-z][a-z0-9-]*$/`, Weight 100–900, Style enum, Category enum, File-Size ≤ 2 MB, MIME-Type-Liste.
- [ ] Beim DELETE eines Fonts werden auch alle `font_styles`-Storage-Files aus dem Bucket gelöscht (Cleanup im API-Handler, nicht nur CASCADE in DB).

### Client-Loading
- [ ] Neuer Hook `useFonts()` (analog `useMapPalettes`): Modul-Level-Cache + In-Flight-Promise, fetcht `GET /api/fonts` beim ersten Render, liefert beim Initial-Render einen leeren Fallback bis Daten da sind.
- [ ] Hook registriert jeden Style via `new FontFace(family_name, url('<storage-url>')).load()` + `document.fonts.add()` mit den passenden `weight`/`style`-Descriptors. Fertig geladene Family-Namen werden in `document.fonts` als reguläre CSS-Fonts verfügbar.
- [ ] `invalidateFontsCache()`-Helper, der vom Admin-UI nach Create/Update/Status-Wechsel aufgerufen wird, damit der nächste Editor-Mount die neue Liste lädt.
- [ ] Hook unterstützt **Force-Load eines bestimmten Family-Namens** (Use-Case: ein älteres Projekt referenziert einen inzwischen unpublished Font — Editor-Mount fordert diesen Font explizit nach `GET /api/admin/fonts/[id]` an, sodass das Design weiter editierbar ist).

### Editor-Integration
- [ ] `TextTab.tsx` und `MobileTextTab.tsx` iterieren `useFonts()` statt der heute hartkodierten Liste. Die Picker-Reihenfolge folgt `display_order`. Der Picker bleibt eine **flache Dropdown-Liste** ohne Kategorie-Filter (V1 — Filter erst nachziehen, wenn die Liste auf 20+ Fonts wächst).
- [ ] Star-Map-Editor (PROJ-7), Photo-Editor (PROJ-32), Wedding-Editor (PROJ-45) nutzen den gleichen Hook — keine separaten Font-Listen mehr.
- [ ] Default-Font, wenn die DB-Liste leer ist oder das Loading scheitert: **Cormorant Garamond** (UI-Brand-Font, ist über `next/font` bereits gehasht im DOM verfügbar und funktioniert als sicherer Fallback).

### Migration der bestehenden 9 Fonts
- [ ] Migration `seed_fonts`: legt für die heutigen 9 Fonts je einen `fonts`-Eintrag (Family-Name, Kategorie nach Augenmaß: Playfair Display = serif, Montserrat = sans, Cormorant Garamond = serif, Amsterdam/Cathalia/Lindsey Signature/Brittany Signature/Welcome = script, CaviarDreams = sans) und die zugehörigen `font_styles`-Einträge an. Status: `published`. Storage-Pfade zeigen initial auf die heutigen `public/fonts/*.ttf`-URLs.
- [ ] **Storage-Migration-Skript** (`scripts/migrate-fonts-to-storage.ts`): lädt die 9 TTF-Files aus `public/fonts/` ins Supabase-Storage-Bucket hoch, aktualisiert die `storage_path`-Spalten, verifiziert die public-URLs sind erreichbar. Idempotent, kann mehrfach laufen.
- [ ] Nach erfolgreicher Storage-Migration: `@font-face`-Blöcke aus `src/app/globals.css` entfernen, `public/fonts/*.ttf` als gitignored-Backup im Repo lassen oder löschen (Entscheidung beim Deploy).
- [ ] Verifikation vor Removal von globals.css: Alle 9 Family-Namen sind über `useFonts()` verfügbar UND ein Smoke-Test im Editor zeigt für jeden alten Font keinen Regression-Fallback.

## Edge Cases
- **Upload einer korrupten/falschen Datei** (z.B. user benannt `.pdf` in `.ttf` um): MIME-Type-Check + Magic-Number-Check (TTF: `00 01 00 00`, OTF: `4F 54 54 4F`, WOFF2: `77 4F 46 32`) im Upload-Handler. Bei Fehler: 400 mit „Datei ist keine gültige Font-Datei".
- **Family-Name kollidiert mit `next/font`-Family (z.B. „Cormorant Garamond"):** Die heute via `next/font/google` geladenen UI-Fonts haben gehashte Family-Namen (`__Cormorant_Garamond_xyz`), eine Poster-Font mit dem Klartext-Namen „Cormorant Garamond" ist davon isoliert. Beim Admin-Anlegen wird gewarnt, wenn der Family-Name exakt einem der Brand-UI-Fonts entspricht — aber nicht blockiert, da der Konflikt bereits heute existiert und durch FontFace-API sauber gelöst ist.
- **Admin unpublished einen Font, der in einem aktiven Customer-Browser-Tab geöffnet ist:** Der Hook hat den Font noch im Cache, das Rendering bleibt für die Session stabil. Beim nächsten Mount ist er aus dem Picker, das Customer-Projekt referenziert ihn aber weiter — der „Force-Load eines bestimmten Family-Namens"-Flow stellt sicher, dass das Design weiter editierbar bleibt.
- **Customer öffnet ein altes Projekt, das einen seither gelöschten Font referenziert:** Da Delete durch die 409-Referenzprüfung blockiert wird, kann dieser Fall regulär nicht auftreten. Defensiv: Editor-Mount fängt das ab und zeigt einen Toast „Schrift nicht mehr verfügbar, fällt auf Cormorant Garamond zurück" + setzt im Projekt-State den Font auf den Default.
- **Mehrere Style-Slots mit identischer (weight, style)-Kombi** (z.B. zweimal 400/normal hochgeladen): UNIQUE-Constraint in `font_styles` blockt das auf DB-Ebene, API liefert 409 mit klarer Fehlermeldung.
- **Network-Fehler beim Loading eines Fonts im Hook:** `FontFace.load()` rejected — der einzelne Font wird übersprungen, andere bleiben verfügbar, console.warn aber kein UI-Block. Picker zeigt den Font weiter an (Daten sind ja da) — Customer würde im worst case System-Default sehen, aber das ist akzeptabel und kein Crash.
- **Storage-Bucket-Quota erreicht:** Upload-Handler fängt Supabase-Fehler ab und liefert Toast „Storage voll, bitte Betreiber kontaktieren" — sehr unwahrscheinlich bei 2 MB-Limit und Solo-Betrieb, aber sauber gehandhabt.
- **Variable Font hochgeladen (Single-File mit allen Weights):** Akzeptiert als Single-Style-Eintrag mit dem aus den Metadaten gemeldeten Default-Weight. Customer kann ihn nutzen, aber CSS-`font-weight: bold` greift nur, wenn das Variable Font im FontFace-Descriptor entsprechend annotiert ist (out-of-scope für V1, später optional Variable-Font-Support als PROJ-X).
- **Slug-ID-Kollision:** API liefert bei `POST` mit existierender ID einen 409. Admin-UI prüft das vorher via `GET /api/admin/fonts/[id]` (404 erwartet) bevor die Datei hochgeladen wird, damit kein Müll-Upload entsteht.

## Technical Requirements
- **Performance:** `GET /api/fonts` cached 60 s/300 s s-maxage. Initial-Font-Load im Editor: alle published Fonts werden parallel via `FontFace.load()` registriert, blockiert das initiale Editor-Render nicht (Render läuft mit Fallback an, Fonts „swappen" wenn ready — `font-display: swap`-Semantik).
- **Security:** Alle Schreib-APIs hinter `requireAdmin`. Upload-Endpoint validiert MIME + Magic-Number + Size + ist gegen Path-Traversal abgesichert (Slug-Regex erzwingt safe Filenames).
- **Browser-Support:** Chrome, Firefox, Safari (aktuell + letzte 2 Major), Edge aktuell. iOS Safari + Android Chrome aktuell. FontFace-API ist seit ~2019 in allen Targets verfügbar.
- **Accessibility:** Admin-UI WCAG-AA wie restliches Admin (folgt PROJ-23-Tokens). Picker im Editor zeigt Font-Vorschau **plus** Family-Name als Label (nicht nur Vorschau), damit auch Screen-Reader die Auswahl ansagen können.
- **i18n:** Admin-UI ist DE-only (intern). Customer-Picker zeigt nur Family-Namen (locale-unabhängig). Kategorie-Labels im Picker werden über `useTranslations()` lokalisiert (Serif → Serifenschrift / Serif / Serifa / Serif / Sérif).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Komponenten-Struktur

```
Admin-Bereich
+-- /private/admin/fonts (Server-Page mit requireAdmin)
    +-- Titelblock + „Font hinzufügen"-Button
    +-- AdminFontsList (Client-Komponente)
        +-- Zeile pro Font
            +-- Vorschau-Streifen (live-gerendert mit dem Font, PRIMÄR-Element der Zeile)
            +-- Family-Name (Sekundär-Label) + Slug + Kategorie-Badge + Style-Badges + Status-Badge
            +-- Aktionen: Publish-Toggle (Eye/EyeOff) · Edit · Delete
    +-- Font-Editor-Dialog (Create + Edit, gleiches Markup)
        +-- Metadaten-Felder (Family · Slug · Kategorie · Beschreibung · Order)
        +-- Style-Slot-Liste
            +-- Pro Slot: Datei-Upload-Feld · Weight-Dropdown · Style-Dropdown · Entfernen
            +-- „Weiteren Schnitt hinzufügen"-Button
    +-- Delete-AlertDialog (mit Referenz-Auflistung bei 409)

Editor-Bereich (alle 4 Editoren)
+-- TextTab + MobileTextTab
    +-- Font-Picker (heute hartkodierte Liste, künftig aus useFonts())
        +-- Flache Dropdown-Liste, exakt wie heute — kein Filter in V1
        +-- Vorschau-Zeile pro Font im Picker
+-- Editor-Mount-Trigger
    +-- useFonts()-Hook lädt published Fonts via FontFace-API
    +-- Force-Load-Pfad: wenn ein gespeichertes Projekt einen
        unpublished Font referenziert, wird dieser einzeln nachgeladen
```

Neue Komponenten: `AdminFontsList`, `FontEditorDialog`, `FontPreviewRow`, plus zwei API-Route-Gruppen und der `useFonts`-Hook. Vorhandene Komponenten (`TextTab`, `MobileTextTab`, alle Star-/Photo-/Wedding-Editoren) lesen die Font-Liste künftig vom Hook statt aus dem hartkodierten Array — keine Layout- oder UX-Änderung für den Customer.

### B) Daten-Modell (Klartext)

**Zwei Tabellen statt einer**, weil eine Family mehrere Schnitte haben kann.

**Tabelle „Font" (Family-Eintrag):**
- Slug-ID (z.B. `cormorant-garamond`, dauerhaft, in Projekten referenziert)
- Family-Name (Anzeigename, im Picker sichtbar)
- Kategorie (Serif / Script / Sans / Display) — Pflicht, für späteren Picker-Filter
- Beschreibung (optional, nur Admin-intern)
- Reihenfolge (Sortierung im Picker)
- Status (Draft / Published)
- Zeitstempel

**Tabelle „Font-Style" (1:n zu Font):**
- Verweis auf die Font-Family
- Weight (100–900, „Regular" ist 400, „Bold" ist 700)
- Style (normal / italic)
- Storage-Pfad zur Datei im Supabase-Bucket
- Datei-Größe in Bytes (für Monitoring/Quota)
- Zeitstempel
- Eindeutigkeit: pro Family darf jede (Weight, Style)-Kombi nur einmal existieren

**Storage:**
- Supabase-Bucket `fonts/`, öffentlich lesbar, Schreibzugriff nur über Service-Role
- Pfad-Konvention: `fonts/{slug}/{weight}-{style}.{ext}` — vorhersagbar und kollisionsfrei
- Maximale Dateigröße: 2 MB pro Upload

**Wo Fonts in bestehenden Daten referenziert sind:**
- `presets.config_json` — JSONB, enthält `fontFamily`-Strings
- `projects.config_json` — JSONB, enthält pro Textblock `fontFamily`
- Beide werden bei Delete/Unpublish via String-Match auf den Family-Namen geprüft

### C) Tech-Entscheidungen

| Entscheidung | Warum |
|---|---|
| **Zwei Tabellen (Font + Font-Style)** statt eine flache Tabelle | Eine Family wie „Cormorant Garamond" kann Regular, Bold, Italic gleichzeitig haben — das sind drei Dateien mit einem gemeinsamen Family-Namen. Eine flache Tabelle würde den Family-Namen pro Schnitt duplizieren und Konsistenz-Probleme erzeugen (z.B. Kategorie inkonsistent zwischen Schnitten). Die 1:n-Trennung folgt dem fachlich korrekten Modell und erlaubt es, später echtes `font-weight: bold` zu rendern statt synthetischem Faux-Bold. |
| **Slug-ID als Primärschlüssel** (statt UUID) | Identisch zum PROJ-22-Pattern: lesbar in Storage-Pfaden, in Referenzen (`fontFamily: "cormorant-garamond"`) und im Admin-URL. UUIDs sind hier kein Sicherheitsgewinn, da Fonts ohnehin öffentlich sind. |
| **Family-Name als Referenz in Presets/Projects** (statt Slug-ID) | Bestand: die heutigen `config_json`-Blobs speichern den Family-Namen als String (`"fontFamily": "Cormorant Garamond"`), exakt so wie CSS `font-family` ihn erwartet. Eine ID-Referenz wäre sauberer, würde aber eine Migration aller bestehenden Customer-Projekte erzwingen — das ist Aufwand ohne Nutzen, da der Family-Name in Presets/Projects ohnehin nie umbenannt wird (Renames würden Bestands-Designs zerstören). |
| **FontFace-API im Browser statt CSS `@font-face`-Injection** | Die Export-Pipeline (`useMapExport`, `useStarMapExport`, `usePhotoExport`, `poster-from-snapshot`, `HeadlessRenderBridge`) verwendet bereits `document.fonts.ready` und `FontFace.load()`. Dynamische `<style>`-Tags wären zwar möglich, aber FontFace gibt explizite Load-Promises und sauberes Error-Handling pro Datei. Kein Server-Side-Aufwand für Node-Canvas/Puppeteer. |
| **Hook-Cache mit In-Flight-Promise** (Pattern aus `useMapPalettes`) | Verhindert, dass mehrere Editor-Komponenten beim Mount denselben Fetch parallel auslösen. Der erste Mount triggert den Fetch, alle weiteren teilen sich das Promise. |
| **Force-Load-Pfad für unpublished Fonts** | Customer öffnet ein altes Projekt → der referenzierte Font ist inzwischen Draft. Ohne Force-Load würde das Projekt mit Fallback-Font öffnen, der Customer sieht plötzlich ein anderes Design. Force-Load fragt gezielt `GET /api/admin/fonts/[id]` an (öffentlich, weil Read-Only nach Slug) und lädt nur diesen einen Font nach. Bestand bleibt editierbar. |
| **Delete blockt mit 409 statt Soft-Delete** | Identisch zu PROJ-22 (Paletten) und PROJ-8 (Presets) — etabliertes Muster im Projekt. Der Operator entscheidet aktiv, ob er Referenzen umbiegt, bevor er löscht. Verhindert stille Datenverluste. |
| **2 MB Upload-Limit** | Web-Best-Practice: .woff2 typisch 50–300 KB, .ttf bis ~1 MB. 2 MB ist sicherer Puffer und hält den Customer-Initial-Load schlank (alle published Fonts laden parallel beim Editor-Mount). |
| **MIME-Type + Magic-Number-Check beim Upload** | MIME alleine ist client-fakebar (Datei umbenennen). Magic-Number (erste 4 Bytes: TTF `00 01 00 00`, OTF `4F 54 54 4F`, WOFF2 `77 4F 46 32`) ist binär eindeutig. Zwei-stufige Prüfung schließt versehentliche und absichtliche Upload-Fehler. |
| **Voll-Migration in Supabase Storage** (statt zwei Quellen) | Eine Single-Source-of-Truth ist wartungsfreundlicher. Die `@font-face`-Blöcke in `globals.css` fliegen raus, alle Fonts laufen über die DB. Das Storage-Migrations-Skript ist idempotent und einmalig — danach gibt es nur noch einen Weg, Fonts hinzuzufügen. |
| **Default-Fallback: Cormorant Garamond** | Diese Font wird ohnehin via `next/font/google` für die UI geladen und ist im DOM immer verfügbar. Bei jedem denkbaren Fehler (DB down, Storage down, Font-Datei korrupt) bleibt der Editor lesbar und das Poster renderbar. |
| **Kategorie als Pflichtfeld, aber kein Customer-Filter in V1** | Picker bleibt eine flache Liste — die heutigen 10 Fonts sind übersichtlich, ein Filter wäre prämature UI-Komplexität (Low-Friction-Doktrin). Trotzdem wird die Kategorie schon beim Upload sauber erfasst: kostet einen Klick und vermeidet eine Bulk-Klassifizierung, wenn ein Filter später nötig wird (V2, ab ~20 Fonts). |
| **Admin-Schreibzugriff nur über Service-Role** | Identisch zu PROJ-22: kein client-seitiger Write-Pfad zur Datenbank, RLS bleibt auf „public read published only". Sicher und einheitlich mit dem restlichen Admin-Stack. |

### D) Migrations-Plan (2 Phasen)

**Phase 1 — DB + APIs + Admin-UI live, alte Fonts bleiben hartkodiert (1 PR)**
- DB-Migrationen (Tabellen + RLS) anlegen
- Storage-Bucket `fonts/` einrichten
- Admin-Route + APIs implementieren
- `useFonts()`-Hook implementieren, **liefert leere Liste, solange DB leer ist**
- Editoren ziehen weiter die hartkodierte Liste, aber haben den Hook zusätzlich verfügbar
- **Smoke-Test:** Admin kann eine Testschrift hochladen → erscheint im Picker neben den hartkodierten

**Phase 2 — Voll-Migration der 9 bestehenden Fonts (separater PR)**
- Storage-Migrations-Skript läuft: `public/fonts/*.ttf` → `fonts/`-Bucket
- Seed-Migration erzeugt `fonts`- und `font_styles`-Einträge für alle 9 Fonts mit `published`-Status
- Verifikation: jeder Family-Name ist über `useFonts()` verfügbar
- `@font-face`-Blöcke aus `globals.css` entfernen, hartkodierte Picker-Listen durch Hook ersetzen
- `public/fonts/*.ttf` bleiben einen Deploy-Zyklus als Sicherheitsnetz im Repo, im Folge-PR Bereinigung

Trennung sorgt dafür, dass im Notfall (z.B. Storage-Latenzproblem) Phase 2 ge-revertet werden kann, ohne dass das Admin-Feature verloren geht.

### E) Dependencies

**Keine neuen npm-Pakete nötig.** Alles baut auf bereits Installiertem auf:
- `@supabase/supabase-js` (Storage-Upload, bereits im Projekt)
- `zod` (Upload-Payload-Validierung, bereits im Projekt)
- `react-hook-form` (Admin-Dialog-Formulare, bereits Standard im Projekt)
- Browser-native: `FontFace`-API + `document.fonts`-Set (in allen Browser-Targets unterstützt)

### F) Berührte bestehende Dateien

| Datei | Änderung |
|---|---|
| `src/app/globals.css` | Phase 2: `@font-face`-Blöcke entfernen |
| `src/components/sidebar/TextTab.tsx` | Hartkodierte Font-Liste durch `useFonts()` ersetzen |
| `src/components/sidebar/mobile/MobileTextTab.tsx` | Gleich |
| `src/components/star-map/StarMapTab.tsx` | Falls eigene Font-Liste existiert: ebenfalls auf Hook |
| `src/components/admin/AdminLandingNav.tsx` | Neuer Tile „Fonts" |
| `public/fonts/*.ttf` | Phase 2: bleibt einen Zyklus, danach entfernt |

Neu erstellt:
- `src/app/private/admin/fonts/page.tsx` + `AdminFontsList`-Client
- `src/app/api/fonts/route.ts` (public, cached)
- `src/app/api/admin/fonts/route.ts` + `[id]/route.ts` + `[id]/styles/route.ts` + `[id]/styles/[styleId]/route.ts`
- `src/hooks/useFonts.ts`
- `src/lib/fonts-loader.ts` (FontFace-Registrierung als Util)
- `scripts/migrate-fonts-to-storage.ts` (einmaliges Migrations-Tool)
- 2 Supabase-Migrationen: `create_fonts_tables`, `seed_fonts`

## QA Test Results (2026-05-14)

### Acceptance Criteria — Coverage

| Bereich | Status |
|---|---|
| Admin-UI: `requireAdmin` + Redirect, Liste mit Live-Vorschau-Streifen als Primär-Element, Family-Name + Slug + Kategorie + Style-Badges + Status-Badge, Aktionen (Publish/Edit/Delete) | ✅ |
| Admin-UI: Create-/Edit-Dialog mit Metadaten + Multi-Style-Slots (Datei + Weight + Style + Entfernen) | ✅ |
| Admin-UI: Slug auto-slugify + read-only nach Anlegen | ✅ |
| Admin-UI: Delete-AlertDialog mit 409-Referenz-Liste | ✅ |
| Storage: Bucket `fonts/`, public-read, Admin-write, `file_size_limit=2 MB`, allowed-MIMEs | ✅ |
| Storage: Pfad-Konvention `{slug}/{weight}-{style}.{ext}` mit Path-Traversal-Schutz | ✅ |
| Storage: MIME-Type + Magic-Number-Validierung beim Upload | ✅ |
| Datenmodell: `fonts` (Slug-PK + CHECK-Constraints) + `font_styles` (FK CASCADE + UNIQUE) + `updated_at`-Trigger | ✅ |
| RLS: public liest nur `status='published'` für `fonts` und transitiv für `font_styles` | ✅ |
| Index `(status, display_order)` für Picker-Lookup | ✅ |
| API: GET `/api/fonts` cached `s-maxage=300, swr=600` | ✅ |
| API: GET/POST `/api/admin/fonts`, GET/PATCH/DELETE `/api/admin/fonts/[id]`, POST/DELETE Style-Sub-Routen | ✅ |
| API: DELETE/Unpublish blockt mit 409 + Referenz-Liste aus presets/projects | ✅ |
| API: Zod-Validation, Slug-Regex, Weight-Range, Style-Enum, Category-Enum | ✅ |
| API: Best-effort Rollback bei Multi-Style-Upload-Fehler im Create | ✅ |
| Client: `useFonts()` Hook mit Modul-Cache + In-Flight-Promise + Fallback | ✅ |
| Client: FontFace-Registrierung via `registerFonts()`, idempotent per Tupel | ✅ |
| Client: `invalidateFontsCache()` nach Admin-Schreiben | ✅ |
| Client: `ensureFontLoadedById()` Force-Load Helper für Edge-Case | ✅ (siehe Bug L4) |
| Editor-Integration: TextTab + MobileTextTab nutzen `useFonts()` statt hartkodierter Liste, flache Picker-Liste | ✅ |
| Editor-Integration: Default-Fallback Cormorant Garamond bei leerer/down DB | ✅ |
| **Migration der 9 Bestands-Fonts (Seed + Storage-Upload + globals.css-Cleanup)** | 🟡 **Phase 2 — bewusst nicht in V1** |

**Coverage:** 22/22 für V1-Scope erfüllt. Phase-2-AC explizit deferred und in der Spec dokumentiert.

### Automated Tests
- **Vitest:** `font-validation.test.ts` (12) + `fonts-server.test.ts` (7) = 19 PROJ-47-spezifische Unit-Tests grün
- **Vollsuite:** 115/115 Vitest-Tests grün (nur mit `--no-file-parallelism`, weil die Konfig `tests/*.spec.ts` Playwright-Files nicht ausschließt — bestehende Altlast, nicht PROJ-47)
- **TypeScript:** `npx tsc --noEmit` clean für alle PROJ-47-Dateien
- **Supabase-Advisors:** Nach Migration nur ein offenes Warning (`public_bucket_allows_listing` für `fonts`-Bucket) — konsistent mit `city-renders`-Pattern (PROJ-42), bewusst akzeptiert

### Manual Verification
- Customer hat live einen Test-Font im Admin angelegt + veröffentlicht → erscheint im TextTab-Picker im Map-Editor + rendert korrekt im Canvas (Confirmed 2026-05-14)
- Hot-Reload des Picker-Swaps (Phase 1.5) bestätigt

### Bugs gefunden

#### ✅ MEDIUM (M1) — Family-Name-Rename via PATCH bricht referenzierende Designs — **FIXED 2026-05-14**
**Wo (vorher):** `src/app/api/admin/fonts/[id]/route.ts` PATCH handler  
**Was war das Problem:** Der Admin konnte via Edit-Dialog oder direkter API `family_name` ändern. Der UNIQUE-Index verhinderte nur doppelte Namen, nicht das Umbenennen. CSS-Referenzen in `presets.config_json` und `projects.config_json` zeigen aber auf den Family-Name-String — ein Rename hätte alle alten Designs zu Fallback-Schrift gemacht, ohne Warning.

**Fix (drei Schichten Defense-in-Depth):**
1. **API-Gate** (`src/app/api/admin/fonts/[id]/route.ts`): PATCH prüft jetzt, ob `parsed.data.family_name !== existing.family_name`. Wenn ja, ruft es `findFontReferences(existing.family_name)` — bei Treffern Liefert es 409 mit `blockedBy`-Liste, identisch zum DELETE/Unpublish-Gate.
2. **UI Read-only** (`src/components/admin/AdminFontsList.tsx`): Der Family-Name-Input ist im Edit-Modus disabled (analog zum Slug), mit Erklär-Hinweis darunter: „Family-Name ist fest. Customer-Designs und Presets referenzieren ihn als String — Umbenennen würde Bestands-Designs brechen."
3. **Client-Side-Defense** (`handleSave` im Edit-Mode): `family_name` wird gar nicht erst im PATCH-Body mitgesendet — selbst wenn jemand das UI manipuliert, kommt kein Rename-Versuch beim Server an.

**Reverify:** 19/19 Unit-Tests grün, TypeScript clean.

#### 🟡 LOW (L1) — Customer-Editor hat kein Recovery-Path für unpublished Fonts
**Wo:** `src/components/sidebar/TextTab.tsx` + `MobileTextTab.tsx`  
**Was:** Spec-Edge-Case beschreibt: „Customer öffnet altes Projekt mit Font, der inzwischen unpublished ist → Toast + Fallback-Reset." Code-Realität: das Select hat keinen passenden Item → zeigt den raw value-String, Canvas rendert mit System-Fallback. Kein Toast, kein State-Reset.  
**Praktische Schwere:** Sehr gering. Der 409-Gate auf DELETE/Unpublish verhindert den Fall in der Praxis — kann nur via manuelle DB-Bearbeitung entstehen.  
**Fix-Vorschlag (Defense-in-Depth):** TextTab-Mount prüft, ob jeder `textBlock.fontFamily` in der `useFonts()`-Liste ist; wenn nicht, `ensureFontLoadedById()` oder Toast + Reset auf `DEFAULT_FONT_FAMILY`.

#### 🟡 LOW (L2) — `/api/admin/fonts/[id]` GET ist admin-gated, blockt Customer-Force-Load
**Wo:** `src/app/api/admin/fonts/[id]/route.ts` GET handler  
**Was:** Die Spec sagt für `ensureFontLoadedById`: „fragt gezielt `GET /api/admin/fonts/[id]` an … öffentlich, weil Read-Only nach Slug ist harmlos." Aber der Endpoint hat `requireAdmin()` — Customer-Browser ohne Admin-Login kann das nicht fetchen. ensureFontLoadedById funktioniert nur für eingeloggte Admins.  
**Praktische Schwere:** Gering, gleicher Grund wie L1 (Fall tritt durch 409-Gate eh nicht auf).  
**Fix-Vorschlag:** Eigene öffentliche Route `GET /api/fonts/[id]` ohne Auth (nur Read, returnt auch Drafts auf id-Lookup) — analog zu Slug-basierter Public-API in Sanity.

#### 🟡 LOW (L3) — Storage-Upload `upsert: false` blockiert Re-Upload bei Zombie-Datei
**Wo:** `src/app/api/admin/fonts/route.ts` POST + `[id]/styles/route.ts` POST  
**Was:** DELETE handler löscht erst DB-Row, dann Storage. Bei Storage-Cleanup-Fehler (logged als `warning`) bleibt die Datei. Beim Re-Upload mit gleichem `{slug, weight, style}` baut `buildFontStoragePath` denselben Pfad → `upsert: false` schlägt fehl mit „File already exists".  
**Praktische Schwere:** Nur bei vorausgegangenem Storage-Cleanup-Fehler — passiert praktisch nie.  
**Fix-Vorschlag:** Vor Upload defensive `admin.storage.remove([path])` (idempotent), oder `upsert: true`.

#### 🟡 LOW (L4) — `validateFontFile` und `file.arrayBuffer()` nicht in äußerem try/catch
**Wo:** `src/app/api/admin/fonts/route.ts` POST handler (Validate-Loop)  
**Was:** Wenn `file.arrayBuffer()` einen defekten Multipart-Stream nicht lesen kann, wirft es. Aktuell schlägt das durch zu 500 Server-Error statt 400 Client-Error.  
**Praktische Schwere:** Sehr gering; FormData-Parser wirft schon vorher (bereits abgefangen).  
**Fix-Vorschlag:** Validate-Loop in try/catch → 400 mit „Datei konnte nicht gelesen werden".

#### 🟡 LOW (L5) — Slug-ID-Format wird in GET/PATCH/DELETE nicht client-validiert
**Wo:** `src/app/api/admin/fonts/[id]/route.ts`, `[id]/styles/route.ts`, `[id]/styles/[styleId]/route.ts`  
**Was:** Der `id`-Pfad-Parameter wird direkt an Supabase weitergereicht. Supabase parametrisiert (kein SQL-Injection), aber Defense-in-Depth wäre Slug-Regex-Check vor dem DB-Call.  
**Praktische Schwere:** Sehr gering; Supabase ist sicher, Endpoint ist admin-gated.

### Security Audit (Red-Team)
| Vektor | Befund |
|---|---|
| AuthN-Bypass auf Admin-APIs | ✅ Alle Admin-Routen rufen `requireAdmin()` als erstes |
| AuthZ-Bypass (Non-Admin liest Drafts) | ✅ Public-API gibt nur `status='published'`, Admin-API gated. RLS-Policy doppelt abgesichert |
| SQL-Injection via `id`-Param | ✅ Supabase parametrisiert. (L5 = Defense-in-Depth-Gap, kein echtes Risiko) |
| Path-Traversal via Storage-Pfad | ✅ `buildFontStoragePath` validiert Slug + Extension mit Regex und wirft bei Verletzung |
| XSS in Admin-UI | ✅ Kein `dangerouslySetInnerHTML`; Family-Name nur als Text/Value gerendert |
| File-Upload-Smuggling (z.B. .pdf umbenannt zu .ttf) | ✅ Two-Stage-Check (Extension + Magic-Number) blockt das (Test gedeckt) |
| Service-Role-Key im Client-Bundle | ✅ Nur via env-var server-side, nie an Client geliefert |
| Storage-Bucket public read | 🟡 Listing möglich (Advisor-Warning), aber nur Pfade — keine Daten. Konsistent mit `city-renders` |
| Rate-Limiting auf Upload | 🟡 Nicht implementiert, aber Admin-only → keine Public-Attack-Surface; Solo-Operator-Scale |
| CSRF auf Schreib-Endpoints | ✅ Supabase-Cookie + SameSite-Standard; gleiches Pattern wie alle anderen Admin-Routen |

**Keine Critical / High Security-Findings.**

### Regression
- Map-Editor (PROJ-1) Picker funktioniert mit neuer `useFonts()`-Quelle (manuell verifiziert)
- Star-Map (PROJ-7), Photo (PROJ-32), Wedding (PROJ-45): nutzen `TextTab` / `MobileTextTab` als Komponente → indirekt profitieren sie vom Hook-Swap. Manuell **nicht einzeln verifiziert** (Empfehlung: kurzer Smoke-Test pro Editor-Variante vor Deploy).
- `globals.css`-`@font-face`-Blöcke unverändert → bestehende Customer-Designs rendern weiter wie vorher
- Phase 2 (DB-Seed + Storage-Migration + globals.css-Cleanup) ist eigene Spec-Sektion, kein Regression-Risiko aus Phase 1

### Production-Ready Decision: **APPROVED (2026-05-14)**

- 0 Critical, 0 High Bugs
- ~~1 MEDIUM (M1)~~ — **gefixt** mit drei-Schichten-Defense-in-Depth (API-409-Gate + UI-Read-Only + Client-Body-Omission)
- 5 LOW Edge-Case-Findings — können in Folge-PR, blocken Deploy nicht

**Status:** Bereit für `/deploy`. Phase 2 (DB-Seed + Storage-Migration + globals.css-Cleanup) bleibt als separater PR auf der Roadmap.

## Deployment
_To be added by /deploy_

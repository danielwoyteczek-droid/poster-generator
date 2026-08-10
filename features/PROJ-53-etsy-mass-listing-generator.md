# PROJ-53: Etsy Mass-Listing-Generator (Paletten-Varianten-Matrix + Vela-CSV)

## Status: Planned
**Created:** 2026-05-31
**Last Updated:** 2026-05-31

## Dependencies
- Requires: PROJ-30 (Preset-Render-Pipeline) — nutzt Render-Worker, `preset_renders`, Storage-Schema
- Requires: PROJ-52 (Local-Mockup-Provider) — diese Spec ist die dort als Folge-Spec angekündigte „Paletten-/Textur-Variantenmatrix als Bulk-Trigger"
- Requires: PROJ-22 (Admin-Paletten-Verwaltung) + PROJ-15 (Dynamische Map-Farbschemen) — Paletten = die „Farbe"-Variante
- Relates to: PROJ-49 (Etsy-Integration) — Etsy-API ist dauerhaft abgelehnt; Listings entstehen per CSV-Upload bei Vela (getvela). Diese Spec liefert das Listing-CSV. Texte/Preise stammen aus `etsy_listings.csv` + `docs/etsy/`.

## Context
Etsy hat den API-Zugang dauerhaft verweigert (siehe Memory `project_proj49_etsy_api_denied`). Listings werden daher **manuell über Vela (getvela) per CSV-Import** angelegt. Ziel dieser Spec: **massenhaft Etsy-Listings für unterschiedliche Designs automatisiert vorbereiten** — Bilder + Mockups generieren, sauber in Supabase ablegen, und eine import-fertige Vela-CSV erzeugen. Der Operator lädt die CSV dann manuell bei Vela hoch.

Kerngedanke: Ein Design ist ein **Preset** (Map-/Star-Config). Pro Design sollen mehrere **Farb-Looks** entstehen — und Farb-Looks sind im System **Paletten** (PROJ-15/22), die beim Headless-Render angewandt werden, NICHT nachträgliches Umfärben eines PNGs. Texte, Preise und Varianten-Struktur bleiben über alle Design-Listings **konstant** (es sind „nur unterschiedliche Designs"); variabel sind Design + Farb-Looks + die zugehörigen Bilder.

Die Render-Pipeline (PROJ-30) nimmt heute **ein** Preset und rendert es in alle zugewiesenen Mockup-Sets. Für N Farb-Looks braucht es heute N Presets. Diese Spec automatisiert genau diese Vervielfältigung + die CSV-Ausgabe.

## User Stories
1. Als **Operator** möchte ich pro Master-Design eine Liste von Paletten (= Farb-Looks, z. B. Original/Pink/Dark/Blue-Water) auswählen, damit das Tool je Palette einen Render-Job erzeugt — ohne jedes Preset von Hand zu klonen.
2. Als **Operator** möchte ich, dass pro (Design × Palette) die gewünschten Bilder entstehen — flaches Poster-Render, gerahmtes Wand-Mockup (Local-Magenta), Lifestyle-Mockup (Dynamic Mockups) — und sauber in Supabase Storage abgelegt werden.
3. Als **Operator** möchte ich pro Design ein Farb-Vergleichs-Grid (alle Looks nebeneinander) als zusätzliches Listing-Bild, damit Käufer die Auswahl auf einen Blick sehen.
4. Als **Operator** möchte ich eine import-fertige **Vela-/Etsy-CSV** im exakten Spalten-Format der Vela-Vorlage, gefüllt mit konstanten Texten/Preisen/Varianten + den generierten Bild-URLs, damit ich sie ohne Nacharbeit in Vela hochladen kann.
5. Als **Operator** möchte ich, dass das Tool bei >500 Listings automatisch in mehrere CSV-Dateien splittet (Vela-Empfehlung).
6. Als **Operator** möchte ich, dass fehlende/fehlgeschlagene Renders klar berichtet werden (welches Design/welche Palette), damit ich gezielt nachrendern kann, statt eine halbe CSV zu übersehen.

## Acceptance Criteria

### Variant-Matrix / Render-Trigger
- [ ] Eine Listing-Definition (Quelle: TBD — JSON/CSV-Konfig oder Admin-UI) verknüpft pro Listing: Basis-Design, Palettenliste, Mockup-Set-IDs (Local-Frame + DM-Lifestyle), Listing-Template (Stadtkarte/Herz/Sternenkarte)
- [ ] Pro (Design × Palette) wird ein Render-Job mit korrekt gesetzter Palette + `mockup_set_ids` + `render_status='pending'` erzeugt (Ansatz A: Preset-Klon pro Palette — siehe Tech-Entscheidung)
- [ ] Der bestehende Render-Worker rendert die Jobs unverändert; keine Regression an PROJ-30/52
- [ ] Idempotenz: erneuter Lauf erzeugt keine Duplikat-Presets/-Renders, sondern erkennt bestehende (stabiler Key aus Design+Palette)

### Bilder
- [ ] Flaches Poster-Render pro (Design × Palette) verfügbar (`preset-renders/<id>/format-a4.jpg`)
- [ ] Gerahmtes Mockup via Local-Provider (`composeLocalMockup`) pro (Design × Palette)
- [ ] Lifestyle-Mockup via Dynamic Mockups (das vorhandene 1 Template) pro (Design × Palette)
- [ ] Farb-Vergleichs-Grid pro Design via `scripts/build-etsy-compare-grid.ts` aus den flachen Renders der Looks
- [ ] Alle Bilder liegen public erreichbar (Vela/Etsy zieht Bilder per direkter URL)

### Vela-CSV
- [ ] Ausgabe im EXAKTEN Spalten-Format der Vela-Etsy-Vorlage (Title, Description, Category, Who/What/When made, Tags, Materials, Price, Quantity, SKU, Variation 1/V1 Option/Variation 2/V2 Option/Var Price/Var Quantity/Var SKU/Var Visibility/Var Photo, Shipping, Maße, Photo 1–10, Video 1, Digital file 1–5)
- [ ] Variante 1 = „Format & Ausführung" mit echter Preismatrix: Digital 4,90 · A4 9,90 · A3 14,99 · A2 19,99 · A4+Rahmen 14,90 · A3+Rahmen 24,99 (kein A2-Rahmen) — `Var Price` je Zeile gesetzt
- [ ] Variante 2 = „Farbe" = die gewählten Paletten-Looks; eine CSV-Zeile pro (Format × Farbe)-Kombination; Listing-Felder nur in der ersten Zeile
- [ ] `Var Photo` je Farb-Look = das jeweilige Look-Render; `Photo 1–10` = Mockups (flach, gerahmt, lifestyle, grid) des Default-Looks
- [ ] Konstante Texte/Tags/Materialien aus `etsy_listings.csv` (Compliance: nur Aluminiumrahmen, keine g/m², keine exakten Lieferzeiten — siehe `feedback_haftbare_marketing_claims`, `project_frame_material`)
- [ ] CSV UTF-8 mit BOM + CRLF; Split in ≤500 Listings/Datei
- [ ] Report am Ende: #Designs, #Listings, #Zeilen, fehlende Bilder, Titel >140 Zeichen

## Edge Cases
- **Palette existiert nicht / ist inaktiv:** Job wird übersprungen + im Report gelistet, andere Looks laufen weiter.
- **Render eines Looks schlägt fehl:** Die CSV-Zeile dieses Looks bekommt keine Bild-URL → Listing/Look klar im Report markiert; CSV wird nicht „still" unvollständig.
- **Preset-Orientation hat kein passendes Local-Overlay:** wie PROJ-52 — sauberer Fehler, andere Mockup-Sets unberührt.
- **Titel > 140 Zeichen (Etsy-Limit):** Report-Warnung mit Liste.
- **>13 Tags / >13 Materialien:** auf 13 kappen + warnen.
- **Doppelter Design+Palette-Key:** Idempotenz greift, kein Duplikat.

## Out of Scope (V1)
- Personalisierungs-Felder (Ort/Titel/Untertitel): im Etsy-Import-Template nicht enthalten, werden in Etsy separat gesetzt (PROJ-49 Phase 3 / `listing-field-conventions.md`).
- „Ein Preset → N Renders ohne Klonen" (Worker-Loop über Paletten): V1 nutzt Klone (Ansatz A); der klon-freie Trigger ist die Ausbaustufe (Ansatz B).
- Automatischer Upload zu Vela (keine Vela-API) — bleibt manueller CSV-Upload.
- Mehrsprachige Listings (EN): konstantes DE-Template in V1, EN als Folge.
- Automatisches Umfärben eines flachen PNG (vom Operator verworfen — Looks kommen aus Paletten).

## Technical Requirements
- **Scripts:** `tsx`-Scripts in `scripts/`, Stil wie `render-worker.ts`/`build-etsy-compare-grid.ts`; `.env.local` via dotenv.
- **Keine neuen Dependencies** angestrebt (sharp, @supabase/supabase-js, playwright vorhanden).
- **Reuse:** `renderAndStoreFormatPreview`/`compositeViaMockup`-Pfade (PROJ-30), `composeLocalMockup` (PROJ-52), `dynamic-mockups-client`, `build-etsy-compare-grid.ts`, `createAdminClient` (`src/lib/supabase-admin.ts`).
- **Security:** Falls Admin-UI-Trigger ergänzt wird → `requireAdmin()`.

## Entscheidungen (2026-05-31)
1. **Steuerung: Admin-UI** im poster-generator (nicht nur Config-Script). Operator wählt Basis-Design, klickt Paletten an, weist Mockup-Sets + Listing-Template zu, löst Render + CSV-Export per Button aus. → DB-getriebene Listing-Definitionen.
2. **Render-Ansatz A (Klone):** pro (Design × Palette) wird ein Preset-Klon mit der jeweiligen Palette erzeugt + `render_status='pending'`. Kein Worker-Umbau. Klon-freier Worker-Loop (B) bleibt spätere Optimierung.

### Noch in /architecture zu verifizieren
3. **Exaktes `config_json`-Feld für Palette** beim Preset-Klon — gegen Editor-Headless-Bridge / ein Beispiel-Preset prüfen (vermutlich `palette` / `palette_id`).
4. **Mapping Mockup-Set → Bildtyp** (welcher Set = gerahmt vs. lifestyle) + welcher Look ist „Default" für `Photo 1–10`.

## Admin-UI (zusätzliche Acceptance Criteria)
- [ ] Neue Admin-Seite (z. B. `/private/admin/etsy-listings`) hinter `requireAdmin()`, gelistet im Admin-Nav
- [ ] Listing-Definition anlegen/bearbeiten: Basis-Design (Preset-Auswahl), Palettenliste (Multi-Select aus aktiven Paletten), Mockup-Sets (Multi-Select), Listing-Template (Stadtkarte/Herz/Sternenkarte)
- [ ] Button „Render starten" erzeugt die (Design × Palette)-Klone + Render-Jobs; Status pro Look sichtbar (pending/rendering/done/failed)
- [ ] Button „Vela-CSV exportieren" lädt die fertige CSV herunter (nur wenn alle benötigten Renders `done`, sonst Warnung mit fehlender Liste)
- [ ] Persistenz: neue Tabelle für Listing-Definitionen (Design + Paletten + Mockup-Sets + Template + erzeugte Preset-Klon-IDs)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Big Picture
Keine neue Render-/Mockup-Pipeline. Wir setzen eine **Operator-Schicht** obendrauf, die (a) pro Master-Design je Palette einen Preset-Klon + Render-Job erzeugt (Ansatz A, nutzt PROJ-30/52 unverändert) und (b) aus den fertigen `preset_renders` + konstanten Listing-Daten eine Vela-CSV baut. Bedienung über eine neue Admin-Seite.

### A) Datenmodell — neue Tabellen (Migration `YYYYMMDDHHmmss_proj53_etsy_mass_listings.sql`)

**`etsy_listing_defs`** — eine Listing-Definition = ein Master-Design + Look/Mockup-Auswahl:
- `id uuid pk`, `name text`, `template_key text` (`stadtkarte` | `herz` | `sternenkarte` — wählt Texte/Preise/Tags aus dem konstanten Template)
- `base_preset_id uuid` (das Master-Design)
- `palette_ids text[]` (die Farb-Looks; referenzieren `map_palettes.id`)
- `mockup_set_ids uuid[]` (gerahmt/lifestyle)
- `status text default 'draft'`, `created_at`, `updated_at` (Trigger)

**`etsy_listing_variants`** — generierte (Design × Palette)-Klone, für Idempotenz + Statusanzeige:
- `id uuid pk`, `listing_def_id uuid fk`, `palette_id text`, `cloned_preset_id uuid` (der erzeugte Preset-Klon)
- `unique(listing_def_id, palette_id)` → Re-Run klont nicht doppelt
- RLS: an, keine anon/authenticated-Policies (admin-only via Service-Role).

### B) API-Routes (`src/app/api/admin/etsy-listings/...`, alle `requireAdmin()` + zod)
- `GET/POST /api/admin/etsy-listings` — Liste / neue Definition
- `GET/PATCH/DELETE /api/admin/etsy-listings/[id]` — CRUD
- `POST /api/admin/etsy-listings/[id]/render` — pro `palette_id` ohne bestehende `etsy_listing_variants`-Zeile: Basis-Preset laden, `config_json.paletteId` auf die Palette setzen, `name` = `<def.name> · <palette>`, `mockup_set_ids` = def.mockup_set_ids, `status='draft'`, `render_status='pending'` + `render_status_a4/a3/a2='pending'` → insert (Klon-Logik analog `copy-to-locale`), Variant-Zeile anlegen. Render-Worker rendert dann.
- `GET /api/admin/etsy-listings/[id]/status` — aggregierter Render-Status je Look (für Live-Polling, Muster aus AdminPresetsList)
- `GET /api/admin/etsy-listings/[id]/csv` — baut die Vela-CSV (Response `text/csv`, Content-Disposition attachment). 409 + Liste, wenn nicht alle benötigten Renders `done`.

### C) Vela-CSV-Builder (`src/lib/etsy/vela-csv.ts`)
- Konstante Spalten-Reihenfolge der Vela-Etsy-Vorlage (46 Spalten) als Konstante.
- `template_key` → konstante Texte/Preise/Tags/Materialien/Maße (aus `etsy_listings.csv` übernommen, als typisierte Objekte in `src/lib/etsy/listing-templates.ts`; Compliance: Alu-Rahmen, keine g/m²).
- Variante 1 „Format & Ausführung" = Preismatrix (6 Optionen, `Var Price` je Zeile). Variante 2 „Farbe" = die Paletten-Looks (Anzeigename aus `map_palettes.name`).
- Eine Zeile pro (Format × Farbe); Listing-Felder nur Zeile 1. `Var Photo` je Look = dessen flaches Render; `Photo 1–10` = Mockups des Default-Looks (flach, gerahmt, lifestyle, grid). Bild-URLs aus `preset_renders` (join über `cloned_preset_id`).
- UTF-8 BOM + CRLF; CSV-Escaping; Split ≤500 Listings (mehrere Defs in einem Export → mehrere Dateien als ZIP oder einzeln, V1: pro Def eine Datei).
- Compare-Grid: V1 manuell via `scripts/build-etsy-compare-grid.ts`; Grid-Auto-Trigger als Folge.

### D) Admin-UI (`src/app/private/admin/etsy-listings/page.tsx` + `src/components/admin/AdminEtsyListingsList.tsx`)
- Seitengerüst + `requireAdmin()`-Redirect wie `presets/page.tsx`; Nav-Eintrag in `LandingNavClient.tsx` (admin-Block).
- Liste der Definitionen; Anlege-Dialog mit: Name, Template-Select, Basis-Preset-Picker, Paletten-Multi-Select (Muster `LocaleMultiSelect`, Quelle `/api/admin/palettes?status=published` → `map_palettes`), Mockup-Set-Multi-Select.
- Pro Def: Button „Render starten" → `/render`, Live-Status je Look (Polling 3 s wie AdminPresetsList), Button „Vela-CSV" → `/csv`-Download (Blob-Download-Muster).
- shadcn/sonner durchgängig.

### E) Tech-Entscheidungen
- **Ansatz A (Klone) statt Worker-Loop:** null Risiko für die live Render-Pipeline; `etsy_listing_variants.unique` macht Re-Runs idempotent. Worker-Loop (B) = spätere Optimierung, wenn Klon-Menge stört.
- **`config_json.paletteId` setzen** (verifiziert gegen `apply-preset.ts`) — gegen eine echte Preset-Zeile final prüfen, bevor Klon-Insert scharf geschaltet wird.
- **Konstante Templates als Code** (`listing-templates.ts`) statt Live-Parsing von `etsy_listings.csv` — typsicher, reviewbar, Compliance an einer Stelle.
- **CSV serverseitig** (Route) statt Client — gleiche Logik später für evtl. Cron/Batch nutzbar.

### F) Implementierungs-Reihenfolge
1. Migration (Tabellen + RLS + updated_at-Trigger)
2. `listing-templates.ts` (konstante Daten) + `vela-csv.ts` (Builder, unit-testbar ohne DB)
3. API-Routes (CRUD → render → status → csv)
4. Admin-Seite + Komponente + Nav-Eintrag
5. Verifikation: echte Preset-`config_json` prüfen, ein Mini-Lauf (1 Design × 2 Paletten) end-to-end

### G) Out of Scope (V1, bestätigt)
Klon-freier Worker-Loop, Personalisierungs-Felder, EN-Listings, Vela-Auto-Upload, Compare-Grid-Auto-Trigger.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

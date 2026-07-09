# PROJ-54: Listing-Image-Sets (Etsy-Bild-Vorlagen pro Produkttyp)

## Status: In Progress
**Created:** 2026-06-02
**Last Updated:** 2026-06-02

## Dependencies
- **Requires PROJ-30** (Preset-Render-Pipeline) — Poster-Erzeugung pro Preset, Compositing-Primitive.
- **Requires PROJ-52** (Local-Mockup-Provider) — `composeLocalMockup`, dem in dieser Spec ein optionaler dritter Annotation-Layer hinzugefügt wurde.
- **Berührt PROJ-49** (Etsy-Integration) — der API-freie Pivot will pro Listing eine konsistente Bild-Galerie liefern; PROJ-54 ist genau dieses Bild-Rezept.
- **Berührt PROJ-53** (Etsy Mass-Listing-Generator) — PROJ-53 ist der einzige Konsument; die Mass-Listing-Pipeline wendet pro Produkttyp das passende Listing-Image-Set an.

## Problem & Ziel

Etsy-Listings brauchen 5–10 Galerie-Bilder pro Eintrag — Hero, Personalisierungs-Pfeil, Premium-Detail, Größenvergleich, Lifestyle etc. Bisher gab es zwei Optionen, beide schmerzhaft:

1. **Pro Listing in Photoshop malen** — skaliert nicht über 200+ Stadtkarten-Presets.
2. **Mockup-Sets duplizieren** (`rahmen-wand-hero`, `rahmen-wand-personalisierung`, `rahmen-wand-premium`) — bläht den Mockup-Set-Bereich auf, vermischt Bühnenbild (Mockup) mit Erzähl-Logik (Annotation), und die Annotations sind nicht zentral wartbar.

**Lösung:** Listing-Image-Set als eigene Schicht. Ein Set definiert N Slots; jeder Slot kombiniert ein bestehendes Mockup-Set mit einer optionalen Annotation. **Eine** Vorlage pro Produkttyp (Stadtkarte, Sternenkarte, Foto-Poster) sichert konsistente Brand-Identity über alle Presets desselben Typs.

```
                    Listing-Image-Set "stadtkarte-standard"
                    ├─ Slot 01-hero            (mockup=rahmen-wand,    annotation=∅)
                    ├─ Slot 02-personalisierung (mockup=rahmen-wand,    annotation=pfeil-deine-karte.png)
                    ├─ Slot 03-premium         (mockup=rahmen-wand,    annotation=pfeil-druck.png)
                    ├─ Slot 04-detail          (mockup=closeup-rahmen, annotation=∅)
                    └─ Slot 05-lifestyle       (mockup=desk-szene,     annotation=∅)
                                       │
                                       │ angewendet auf Preset "Berlin"
                                       ▼
                    Output: 5 Bilder unter listing-images/<preset-id>/stadtkarte-standard/
                              01-hero.png, 02-personalisierung.png, 03-premium.png, 04-detail.png, 05-lifestyle.png
```

Slot 1 und 2 nutzen **dasselbe** Mockup-Set — der Wand-Rahmen bleibt gleich, nur der Annotation-Layer wechselt. Das ist im aktuellen Mockup-Set-Modell nicht ohne Duplikate möglich.

## Scope-Entscheidung (Variante C)

**Konsument:** ausschließlich die PROJ-53 Mass-Listing-Pipeline. Der reguläre Marketing-Render (Render-Button pro Preset, `preset_renders`-Tabelle) ist **nicht** angepasst. Marketing- und Listing-Bilder bleiben getrennte Pfade.

## Acceptance Criteria

### Datenmodell
- [x] Tabelle `listing_image_sets` (slug, name, description, poster_type-Binding, is_active)
- [x] Tabelle `listing_image_set_items` (FK → Set, FK → Mockup-Set, annotation-URLs pro Orientation, maschinen-Label, display_name, display_order)
- [x] Unique-Constraint (set_id, label) verhindert Output-Dateinamen-Kollision
- [x] RLS Admin-only (kein Customer-Access)

### Compositing-Pipeline
- [x] `composeLocalMockup` akzeptiert optionalen 3. Layer (`annotationBuffer`)
- [x] `composeListingImagesForPreset` (in [src/lib/listing-image-sets.ts](src/lib/listing-image-sets.ts)) iteriert Items, lädt Layer parallel, composite, lädt nach Storage hoch
- [x] Storage-Schema: `preset-renders/listing-images/<preset_id>/<listing_set_slug>/<item_label>.png`
- [x] V1-Constraint: nur `provider='local'` Mockup-Sets (DM-Composites bräuchten Post-DM-Annotation-Layer als eigene Story)

### Admin-UI
- [x] Neue Seite `/private/admin/listing-image-sets` — Listenansicht, Inline-CRUD mit aufklappbarem Items-Editor
- [x] Items-Editor mit Mockup-Set-Picker (nur `provider='local'`), Annotation-Upload pro Orientation, Label/Display-Name/Order
- [x] Endpoint `POST /api/admin/listing-image-sets/upload-annotation` (analog zu PROJ-52 upload-overlay, ohne Magenta-Strip)
- [x] Endpoints CRUD: GET/POST `/api/admin/listing-image-sets`, GET/PATCH/DELETE `/api/admin/listing-image-sets/[id]`, POST `/api/admin/listing-image-sets/[id]/items`, PATCH/DELETE `/api/admin/listing-image-sets/[id]/items/[itemId]`

### PROJ-53-Integration
- [x] Migration `etsy_listing_defs.listing_image_set_id` (optional FK)
- [x] PATCH-Schema in `/api/admin/etsy-listings/[id]` akzeptiert `listing_image_set_id`
- [x] Endpoint `POST /api/admin/etsy-listings/[id]/render-listing-images` iteriert Varianten, lädt jeweils das schon gerenderte A4-Poster aus Storage, ruft `composeListingImagesForPreset` und meldet ok/skipped/failed pro Variante
- [x] AdminEtsyListingsList: Listing-Image-Set-Picker im Edit-Form, „Listing-Bilder"-Button pro Def-Karte (sichtbar wenn `listing_image_set_id` gesetzt UND alle Looks fertig)
- [ ] Vela-CSV enthält die generierten Listing-Bild-URLs (separater Schritt — V1 erzeugt die Bilder, CSV-Hook kommt wenn Layout der Vela-CSV-Spalten klar ist)

## Implementation Notes

### Phase 1 — Backend-Foundation (2026-06-02, dieser Build)

**Migration:** [supabase/migrations/20260602000000_proj54_listing_image_sets.sql](supabase/migrations/20260602000000_proj54_listing_image_sets.sql)

**Library:** [src/lib/listing-image-sets.ts](src/lib/listing-image-sets.ts) — `composeListingImagesForPreset(supabase, presetId, posterBuffer, orientation, listingImageSet)` produziert die geordnete Liste von Composites und legt sie im Storage ab. Fail-fast: bei jedem fehlenden Mockup-Set / Overlay wirft die Funktion, der Aufrufer entscheidet über Resilience.

**Compositor:** [src/lib/local-mockup-processor.ts](src/lib/local-mockup-processor.ts) — `composeLocalMockup` hat einen optionalen `annotationBuffer`-Parameter; wenn gesetzt, wird er als oberste Sharp-Composite-Ebene nach (Poster, Mockup-Overlay) gestapelt.

**Bewusst NICHT in Phase 1:**
- Admin-UI (kommt mit Phase 2)
- DM-Mockups-Support (würde Post-DM-Annotation-Compositing brauchen)
- Wiederverwendbare Annotation-Library über Listing-Sets hinweg — aktuell ist jede Annotation einem Item zugeordnet; falls später viele Sets dieselben Annotations teilen, wird das eigene Tabelle (`annotation_assets` mit M:N).
- Customer-sichtbares Anzeigen der Listing-Bilder — sind ausschließlich für Etsy-Upload

### Phase 2 — Admin-UI (2026-06-02)
- Neue Seite [/private/admin/listing-image-sets](src/app/private/admin/listing-image-sets/page.tsx) mit [AdminListingImageSetsList](src/components/admin/AdminListingImageSetsList.tsx)
- Single-Page-Pattern (kein Detail-Subpath): Liste mit ausklappbarer Item-Editor-Sektion pro Set
- Mockup-Set-Picker filtert auf `provider='local'` (V1-Constraint der Library)
- Annotation-Upload pro Item × Orientation: lädt PNG → PATCH der Item-Zeile mit der Storage-URL
- 5 neue API-Routen (CRUD + upload-annotation)

### Phase 3 — PROJ-53-Integration (2026-06-02)
- Migration: `etsy_listing_defs.listing_image_set_id` (nullable FK)
- Neuer Endpoint [`render-listing-images`](src/app/api/admin/etsy-listings/[id]/render-listing-images/route.ts):
  - Lädt def + verknüpftes Listing-Image-Set
  - Iteriert `etsy_listing_variants`, fetcht `preview_image_url_a4` der jeweiligen geklonten Preset, ruft `composeListingImagesForPreset`
  - Synchron, `maxDuration=60` — bei großen Sets (z.B. 10 Paletten × 10 Items = 100 composites) ggf. später Async-Queue
- AdminEtsyListingsList: Dropdown im Form, „Listing-Bilder"-Button per Card (sichtbar nur wenn Set + alle Looks `done`)
- **Bewusst NICHT in Phase 3:** automatische Verknüpfung mit der Vela-CSV. Output-URLs sind im Endpoint-Response. CSV-Hook kommt wenn klar ist welche Vela-Spalten welche Image-Slots erwarten.

### Phase 3.5 — Annotation > Mockup-Canvas + Anchor (kurzlebig, 2026-06-02 → 2026-06-03 zurückgerollt)
**Auslöser:** Operator-Feedback — Etsy-Listings haben Erklärtexte typischerweise *neben* oder *über/unter* dem gerahmten Poster.

**Initial-Idee:** Annotation darf größer als Mockup-Canvas sein; `mockup_anchor`-Enum steuert Position des Mockups darin. Kurz gebaut (Migration + Compositor + API + UI-Dropdown).

**Verworfen am 2026-06-03:** Operator-Insight — statt den Compositor flexibler zu machen, gehört die Skalierung + Positionierung in den **Mockup-PSD selbst**. Wer einen kleineren Rahmen oder versetzten Mockup-Bereich braucht, baut sich das eigene Mockup-Set (Smart-Object kleiner, Hintergrund größer ums Smart-Object herum). Compositor bleibt eine reine 1:1-Same-Size-Maschine. Cleaner mental model, kein UI-Knopf der den Output verändert.

**Zurückgerollt:** Migration `mockup_anchor` Spalte gedroppt, alle Code-Referenzen entfernt. Pipeline ist wieder Same-Size-only.

### Phase A — Palette-Mode pro Item (2026-06-04)
**Auslöser:** Etsy-Listings haben pro Listing meist eine **Haupt-Palette** für Hero + Annotations und **N Variant-Bilder** (eins pro angebotener Palette), die Etsy beim Variant-Picker zeigt. Bisher rendert das System jedes Item pro Palette → unnötige Duplikate + falsches mentales Modell.

- Migration: `listing_image_set_items.palette_mode` (Enum `main`/`all`, Default `all`) + `etsy_listing_defs.main_palette_id` (TEXT, nullable, Fallback auf `palette_ids[0]`)
- Library: `composeListingImagesForPreset` akzeptiert optional vorgefilterte Items (Caller routet je nach mode)
- `/api/admin/etsy-listings/[id]/render-listing-images` neu: trennt `main`- von `all`-Items, rendert Main-Items **einmal** gegen den Main-Variant-Preset, `all`-Items pro Palette
- API-Schemas (POST/PATCH von etsy_listing_defs und listing_image_set_items) erweitert
- `/api/admin/etsy-listings/[id]/images` (Preview-Endpoint) liefert `mainListingImages` separat plus `listingImageSet.items[].palette_mode`
- UI: pro Item-Dropdown „Main" vs „Pro Palette"; im Etsy-Listings-Form ein „Haupt-Palette"-Dropdown (sichtbar nur wenn Set + Paletten gewählt)
- Vorschau-Dialog: Main-Bilder oben separiert, pro Look nur noch die `all`-Items

### Phase 4 — Vela-CSV + ZIP-Export (2026-06-04)

**Auslöser:** Operator-Workflow Etsy-Upload — Browser-Claude braucht die URLs in der Vela-CSV, manueller Upload braucht alle Bilder als ZIP mit klarer Struktur.

**ZIP-Endpoint** [`POST /api/admin/etsy-listings/[id]/listing-images-zip`](src/app/api/admin/etsy-listings/[id]/listing-images-zip/route.ts):
- Struktur:
  - `gallery/<label>.png` — Main-Items (Haupt-Palette)
  - `variants/<palette-slug>/<label>.png` — 'all'-Items pro Palette
  - `manifest.json` — Mapping label/palette/role pro Datei
- Verwendet `jszip` (neue Dependency), streamt ZIP direkt zurück, kein Storage-Zwischenschritt
- UI: „Bilder-ZIP"-Button neben „Listing-Bilder" auf der Def-Karte

**Vela-CSV** [`GET /api/admin/etsy-listings/[id]/csv`](src/app/api/admin/etsy-listings/[id]/csv/route.ts) erweitert:
- `Photo 1..10` ist jetzt: Main-Items (in display_order) → dann 'all'-Items pro Palette gestapelt → Fallback auf bare Poster + raw Mockup-Composites bis Limit 10
- `Var Photo` pro Palette: das erste 'all'-Item für diese Palette (statt der bare Poster) — so passen Galerie-Bild und Variant-Picker-Bild bei Etsy auf demselben Look zusammen
- Backwards-compatible: ohne `listing_image_set_id` greift die alte Logik (bare Poster + raw Composites)

**Dependency:** `jszip` (~1.5 MB unpacked) — etabliert, zero-dep, server-side OK.

### Phase 4.5 — Set ist alleinige Bild-Quelle + DM-Mockups erlaubt (2026-06-05)

**Auslöser:** Operator-Insight — wenn ein Listing-Image-Set zugewiesen ist, sollen ALLE Bilder eines Etsy-Listings aus dem Set kommen. Kein Mix-Look mit Fallback-Raw-Renders. Außerdem will der Operator Lifestyle/perspektivische DM-Mockups im selben Workflow nutzen können.

**A. CSV-Fallback weg**: `GET /api/admin/etsy-listings/[id]/csv` füllt nur noch dann mit raw Renders auf, wenn KEIN Listing-Image-Set zugewiesen ist (Backwards-Compat für Defs vor PROJ-54). Mit Set: nur exakt die Set-Outputs.

**B. DM-Mockups im Compositor:**
- `composeListingImagesForPreset` routet nach `provider`:
  - `local` → sharp-Composite (wie gehabt)
  - `dynamic_mockups` → lädt vorhandenes DM-Composite aus `preset_renders` (für preset × mockup × variant='desktop'), legt optional Annotation per sharp drüber. Wirft mit klarer Meldung wenn nicht vorgerendert.
- `POST /api/admin/etsy-listings/[id]/render` inkludiert DM-Mockups aus den Listing-Image-Set-Items **automatisch** in den effektiven `mockup_set_ids` der geklonten Variant-Presets. Operator muss die DM-Mockups nicht zusätzlich auf der Def pflegen.
- UI: Dropdown im Items-Editor zeigt jetzt alle Mockups mit `[DM]`/`[local]`-Prefix, statt nur lokale.

### Phase B — Compare-Grid-Modus (2026-06-05)

**Auslöser:** Operator will Übersichtsbild fürs Etsy-Listing mit allen Paletten in einem Bild (z. B. 2×2-Grid bei 4 Farben). Erste Idee war ein multi-slot Mockup-PSD, eleganter ist aber: vorhandenes Mockup für jede Palette einmal komponieren und die N Composites in einem Grid tilen.

- Migration: `palette_mode`-Enum um `'compare'` erweitert (zusätzlich zu `main`/`all`)
- `composeCompareGridForItem`: neue Library-Funktion mit Auto-Layout (`computeCompareGridLayout`: 1→1×1, 2→1×2, 3-4→2×2, 5-6→2×3, 7-9→3×3). Cell-Größe = Mockup-Canvas ÷ Grid-Dimensionen. Sharp resize `fit: 'contain'` pro Tile, weißer Hintergrund für leere Zellen. Optional Annotation 1:1 oben drüber (in Mockup-Canvas-Größe).
- `composeListingImagesForPreset` ignoriert Compare-Items (werden separat behandelt)
- Endpoint `render-listing-images`: neuer Block für Compare-Items, nutzt main_palette's Variant-Preset als Storage-Anker (`listing-images/<main_preset>/<set_slug>/<label>.png`)
- CSV + Preview: Compare-Items werden wie Main behandelt (1 Photo aus Main-Folder), palette_id im Preview als `'all-tiled'` mit Label „Compare-Grid"
- UI Items-Editor: dritte Modus-Option „Compare-Grid (alle Paletten in einem Bild)"

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

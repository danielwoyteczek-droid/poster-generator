# PROJ-52: Local-Mockup-Provider

## Status: In Progress (Backend done, Frontend pending)
**Created:** 2026-05-27
**Last Updated:** 2026-05-27

## Dependencies
- Requires: PROJ-30 (Preset-Render-Pipeline) — erweitert dessen `mockup_sets`-Datenmodell und Render-Worker

## Context
Die bestehende Render-Pipeline aus PROJ-30 komponiert Poster-PNGs mit Mockup-Hintergründen ausschließlich über die externe Dynamic-Mockups-API (sync, kostet pro Render). Für den Etsy-Workflow rendert der Operator viele Variationen desselben Designs (verschiedene Paletten, Texturen) und braucht jedes Mal ein neues Mockup — das skaliert in den Kosten.

Diese Spec führt einen zweiten Mockup-Provider ein: **"local"**. Der Operator lädt einmalig ein transparentes Overlay-PNG hoch (Rahmen + Schatten, Smart-Object-Bereich freigestellt), das anschließend serverseitig mit `sharp` über das Poster-PNG komponiert wird — ohne API-Call, ohne Kosten pro Render. Dynamic Mockups bleibt parallel verfügbar für komplexe Lifestyle-Szenen, die wir lokal nicht günstig nachbauen können.

## User Stories
1. Als **Operator** möchte ich ein lokales Mockup einmalig hochladen (transparentes Overlay-PNG), damit ich es danach unbegrenzt und ohne Pro-Render-Kosten in der Render-Pipeline verwenden kann.
2. Als **Operator** möchte ich beim Hochladen den Smart-Object-Bereich entweder automatisch per Magenta-Marker (#FF00FF) oder manuell als Rechteck (x/y/w/h) definieren, damit ich PSD-Exports beider Varianten verwenden kann.
3. Als **Operator** möchte ich pro Local-Mockup-Set jeweils ein Hochformat- und ein Querformat-Overlay hinterlegen können, damit Presets beider Orientierungen denselben Eintrag verwenden.
4. Als **Operator** möchte ich beim Erstellen eines Mockup-Sets zwischen Dynamic Mockups und Local wählen können, damit ich beide Provider in der bestehenden Admin-Liste verwalte.
5. Als **Operator** möchte ich, dass die Render-Library Composites aus lokalen Mockups identisch behandelt wie Dynamic-Mockups-Composites (gleiche Storage-Struktur, gleiche `preset_renders`-Tabelle), damit nachgeschaltete Verbraucher (Anlass-Landing-Pages, Galerie) keine Sonderbehandlung brauchen.
6. Als **Operator** möchte ich, dass das Replace eines Overlays alle bisherigen Renders explizit als „stale" markiert, damit ich kontrolliert neu rendern kann (wie bei Dynamic-Mockups-Template-Wechsel).

## Acceptance Criteria

### Datenmodell
- [ ] Migration ergänzt `mockup_sets` um Spalte `provider` (Enum: `'dynamic_mockups'`, `'local'`), Default `'dynamic_mockups'` für Bestandsdaten
- [ ] Migration ergänzt `mockup_sets` um Spalten für lokale Overlays: `local_portrait_overlay_url`, `local_landscape_overlay_url`, `local_portrait_slot` (jsonb mit `{x,y,width,height,canvasWidth,canvasHeight}`), `local_landscape_slot` (jsonb)
- [ ] Die Dynamic-Mockups-Spalten (`*_template_uuid`, `*_smart_object_uuid`) werden bei `provider = 'local'` als nullable behandelt — eine DB-Check-Constraint stellt sicher, dass entweder DM-UUIDs ODER mindestens ein lokales Overlay-Paar gesetzt ist
- [ ] Bestehende `version`-Trigger-Logik wird so erweitert, dass auch Änderungen an `local_*_overlay_url` oder `local_*_slot` `version` hochzählen

### Admin-UI (`AdminMockupSetsList.tsx`)
- [ ] Neuer Provider-Selector beim Anlegen eines Mockup-Sets (Radio: „Dynamic Mockups" / „Lokal")
- [ ] Bei „Lokal": Upload-Felder für Hochformat-PNG und Querformat-PNG (mindestens eines erforderlich)
- [ ] Beim Upload mit Magenta-Marker: Backend extrahiert automatisch Bounding-Box und tauscht Magenta gegen Transparenz (analog `scripts/build-frame-mockup.ts`)
- [ ] Optional: Admin kann Slot-Rechteck manuell überschreiben (4 Zahleneingaben x/y/w/h) — z. B. bei Overlays ohne Magenta-Marker
- [ ] Test-Render-Button funktioniert für lokale Sets analog zu Dynamic-Mockups-Sets (zeigt Vorschau mit Platzhalter-Poster)
- [ ] Liste zeigt Provider-Badge pro Mockup-Set („DM" vs. „Lokal")

### Render-Worker (`scripts/render-worker.ts`)
- [ ] `compositeViaMockup()` verzweigt auf `mockup_set.provider`
- [ ] Pfad `'local'`: Lädt Overlay-PNG aus Storage, komponiert mit sharp (Poster ins Slot-Rect skalieren mit cover-fit, Overlay darüberlegen), schreibt Composite ins gleiche Storage-Schema wie der DM-Pfad
- [ ] Pfad `'local'` wählt Overlay anhand `preset.orientation`; wenn nur eine Orientierung hinterlegt ist und das Preset die andere braucht, schlägt der Render mit klarem Fehler fehl (`render_error_*` Spalte gesetzt)
- [ ] Ausgabe-Auflösung: identisch zur Canvas-Größe des Overlays (typischerweise 1500×1500 für quadratische Frame-Mockups)

### Storage & Versionierung
- [ ] Overlay-PNGs liegen in Supabase Storage Bucket (z. B. `mockup-overlays/<mockup-set-slug>/<orientation>.png`) — nicht in `public/`, damit auch sensible Mockups möglich sind
- [ ] Bei Overlay-Replace: alle abhängigen `preset_renders` für dieses Mockup-Set werden auf `'stale'` gemarkt; Admin entscheidet, wann neu gerendert wird
- [ ] Slug-Konflikt verhindert: Provider gehört nicht in den Slug; gleicher Slug für DM- und Local-Set bleibt verboten

### Render-Library
- [ ] Composites aus lokalen Mockups erscheinen in `/private/admin/render-library` identisch zu DM-Composites, mit Provider-Filter zur Selektion

## Edge Cases
- **Magenta-Detection findet keinen Marker:** Upload schlägt mit klarer Fehlermeldung fehl; Admin kann Slot-Rechteck manuell eingeben und nochmal speichern (ohne Re-Upload).
- **Slot-Rect ragt über das PNG hinaus:** Validierung beim Speichern (sowohl Auto- als auch Manual-Pfad), klare Fehlermeldung.
- **Overlay-PNG ist nicht transparent (kein Alpha-Channel):** Validierung beim Upload, ablehnen mit Hinweis „PNG-24 mit Transparenz erforderlich".
- **Preset hat Orientation, die der Local-Set nicht anbietet:** Render schlägt mit Hinweis fehl, Admin kann fehlendes Overlay nachreichen oder anderen Mockup-Set wählen — das blockiert nicht die anderen Mockup-Sets dieses Presets.
- **Admin ändert nachträglich Provider von DM zu Local oder umgekehrt:** Aktion ist verboten — der Admin muss den Eintrag löschen und neu anlegen (verhindert inkonsistenten Zustand bei abhängigen Renders).
- **Concurrent-Render läuft, während Admin Overlay ersetzt:** Worker hat bereits das alte Overlay geladen — abgeschlossene Renders werden zwar in DB geschrieben, der Replace markiert sie aber sofort danach `stale` → konsistenter Endzustand.
- **Sehr großes Overlay-PNG (z. B. >10 MB):** Upload-Limit von 5 MB pro Overlay (sharp kann auch große PNGs verarbeiten, aber Storage- und Render-Performance werden sonst unnötig schlecht).
- **Operator möchte eine zweite Frame-Variante (z. B. weißer Rahmen):** Wird als zweites Mockup-Set angelegt (eigener Eintrag mit eigenem Slug). Kein „Color-Variant"-Mechanismus innerhalb eines Sets in V1.

## Out of Scope (V1)
- Rotierte/perspektivische Slot-Geometrien (Lifestyle-Mockups mit schräg an der Wand hängenden Postern) — bleibt bei axis-aligned Rechtecken
- Paletten-/Textur-Variantenmatrix als Render-Trigger (ein Preset → N Renders ohne Klonen) — eigene Folge-Spec
- Migration bestehender DM-Mockups zu Local — Admin legt parallel neue Local-Sets an, alte DM-Sets bleiben unverändert
- Frontend-Editor-Integration (ein „PNG mit Rahmen"-Button im Editor) — bewusst abgelehnt, gehört in Admin-Pipeline

## Technical Requirements
- **Performance:** Local-Mockup-Compositing mit sharp ≤ 1 s pro Render (Faktor ≥10 schneller als Dynamic-Mockups-Roundtrip)
- **Security:** Provider-Selector und Upload-Endpoints nur für Admins (`requireAdmin()`-Guard wie bei restlichem Mockup-Set-Endpoint)
- **Kompatibilität:** Bestandsdaten in `mockup_sets` müssen ohne Migration-Backfill weiter funktionieren (Default `'dynamic_mockups'`)
- **Storage-Bucket:** Neuer Supabase-Bucket `mockup-overlays` mit Admin-RLS

## Wiederverwendung vorhandener Bausteine (uncommitted, 2026-05-27)
- `scripts/build-frame-mockup.ts` — Magenta→transparent + Bounding-Box-Pipeline; wird zum Server-Side-Helper für den Upload-Endpoint umgebaut
- `src/lib/frame-mockup.ts` — Browser-Composing-Util, kann für Admin-Preview im Test-Render-Modal wiederverwendet werden (Architektur entscheidet)
- `assets/mockups/frame-portait.psd` + `assets/mockups/frame-portait.png` — Source-of-Truth des ersten Local-Mockups, wird im Zuge des Rollouts hochgeladen
- `public/mockups/frame-portrait.png` + `src/lib/frame-mockup-config.json` — fallen weg, sobald Overlay in Storage liegt

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Big Picture

Wir setzen **keinen neuen Renderer** und **keine zweite Pipeline** auf. Stattdessen erweitern wir die existierende PROJ-30-Render-Pipeline um einen zweiten *Mockup-Anbieter*. Ein Mockup-Set entscheidet beim Anlegen, ob es seine Composites über Dynamic Mockups holt (heutiger Stand) oder lokal aus einer hochgeladenen Bilddatei erzeugt. Alles andere — Preset-Bindung, Render-Auslöser, Storage-Layout, Render-Library, Verbraucher auf Anlass-/Galerie-Seiten — bleibt unverändert.

Aus PM-Sicht: ein neuer Mockup-Typ im selben Verwaltungs-Tool. Aus Operator-Sicht: einmal ein PNG hochladen statt drei UUIDs aus Dynamic Mockups zu kopieren.

### A) Komponentenstruktur

**Admin-UI** (erweitert `AdminMockupSetsList`):
```
Mockup-Sets-Übersicht
+-- Anlege-Dialog
|   +-- Auswahl: Provider (Dynamic Mockups / Lokal)
|   +-- Bei "Dynamic Mockups": Felder wie bisher (UUIDs)
|   +-- Bei "Lokal":
|       +-- Upload Hochformat-PNG
|       |   +-- Slot-Vorschau (Auto-Magenta oder manuelle Eingabe)
|       +-- Upload Querformat-PNG (optional)
|       |   +-- Slot-Vorschau (analog)
|       +-- Test-Render-Button (Platzhalter-Poster + neues Overlay)
+-- Listen-Eintrag
    +-- Provider-Badge ("DM" oder "Lokal")
    +-- Aktionen: Test-Render, Replace-Overlay, Set löschen
```

**Render-Pipeline** (erweitert `scripts/render-worker.ts`):
```
Render-Worker
+-- Headless-Poster-Rendering (unverändert)
+-- Mockup-Compositing (Weiche nach Provider)
|   +-- Provider = "dynamic_mockups"  → API-Call (unverändert)
|   +-- Provider = "lokal"            → lokales Compositing
|       +-- Overlay laden (Supabase Storage)
|       +-- Poster ins Slot-Rechteck einpassen
|       +-- Overlay darüberlegen → fertiges JPG
+-- Storage-Upload (unverändert: gleicher Bucket, gleiches Pfad-Schema)
+-- preset_renders-Eintrag schreiben (unverändert)
```

**Render-Library** (`AdminRenderLibrary`):
- Liste bleibt unverändert
- Optional: Provider-Filter („alle / nur DM / nur Lokal")

### B) Datenmodell (Klartext)

**Bestehende `mockup_sets`-Tabelle** bekommt drei Sorten neuer Felder:

1. **Provider-Kennzeichen:** Ein Feld „Anbieter", entweder „Dynamic Mockups" oder „Lokal". Default für alle Bestandsdaten ist „Dynamic Mockups" — kein Backfill nötig.

2. **Overlay-Referenzen:** Zwei optionale Verweise auf die hochgeladenen PNGs (eines für Hochformat, eines für Querformat). Bei Dynamic-Mockups-Sets bleiben sie leer.

3. **Slot-Koordinaten:** Zwei optionale Datensätze, die für jede Orientierung das Smart-Object-Rechteck im Overlay beschreiben (x, y, Breite, Höhe, plus die Gesamtgröße der Overlay-Leinwand für korrekte Skalierung). Werden beim Upload entweder automatisch aus dem Magenta-Marker gelesen oder vom Admin manuell eingegeben.

Eine DB-seitige Konsistenzregel stellt sicher, dass entweder UUIDs (DM) oder mindestens ein Overlay-Paar (Lokal) gesetzt sind — nie beides, nie keins.

Die bestehende Versions-Logik der Tabelle (die heute schon bei UUID-Änderungen den Versionsstand hochzählt) wird erweitert: jede Änderung an einem Overlay oder Slot zählt ebenfalls hoch und bewirkt automatisch, dass alle abhängigen Renders auf „stale" wechseln. So bleibt das Verhalten konsistent zum heutigen DM-Pfad.

**Neuer Storage-Bucket** in Supabase: `mockup-overlays`. Admin-only-Zugriff per RLS. Pro Mockup-Set bis zu zwei PNG-Dateien (Hoch- + Querformat).

**Tabelle `preset_renders`** bleibt **unverändert**. Die Frage „welcher Provider hat dieses Bild erzeugt" lässt sich über den Foreign-Key zum Mockup-Set rückwärts erschließen — keine Duplizierung des Provider-Felds in den Renders.

### C) Tech-Entscheidungen (Begründungen)

**Warum sharp für lokales Compositing, nicht ein neues Tool?**
sharp ist bereits im Projekt (wird u. a. in `scripts/build-frame-mockup.ts` benutzt), läuft serverseitig in Node, hat keine externen Abhängigkeiten und ist um Faktor 10–50 schneller als ein API-Roundtrip. Es kann transparente PNG-Overlays nativ über Bilder legen und größenmäßig anpassen — genau das, was wir brauchen.

**Warum getrennte Hoch-/Querformat-Overlays statt ein PSD mit zwei Layouts?**
PSD-Parsing im Worker wäre fragil (Memory, Layer-Reihenfolge, Fonts). Zwei vorgerenderte PNGs sind die Pflicht-Mindestform, die sharp performant verarbeiten kann. Quellen-PSDs bleiben optional im `assets/`-Ordner als Source-of-Truth, sind aber kein Datenbank-Citizen.

**Warum Magenta-Marker statt sofort manuelle Rechteck-Eingabe?**
Magenta-Detection ist im Repo bereits erprobt (`scripts/build-frame-mockup.ts`), inklusive Anti-Aliasing-Toleranz und Dilation. Für den typischen Workflow „Designer exportiert flach aus Photoshop mit gefülltem Smart Object" ist das ein Klick statt Lineal. Manuelle Eingabe ist Fallback für Overlays, die keinen Marker tragen können (z. B. wenn der Slot ohnehin schon transparent ist).

**Warum Provider-Wechsel verbieten?**
Ein Mockup-Set hat in der Render-Library eine Vergangenheit (n Composites in Storage). Provider-Wechsel würde diese Composites semantisch ungültig machen (das gleiche Mockup-Set hat plötzlich anderes Aussehen) und schafft Race-Conditions zwischen alten/neuen Renders. „Löschen + Neu anlegen" ist sauberer als ein Migrations-Switch, der ohnehin selten vorkommen wird.

**Warum Supabase Storage statt `public/`-Folder?**
Konsistenz mit anderen Admin-Uploads (Palette-Thumbnails, Preset-Renders selbst). RLS-Schutz, falls in Zukunft auch Mockups eingestellt werden, die nicht öffentlich sein sollen. Worker liest mit Service-Role-Key, Performance-Impact gegenüber `public/` ist marginal (Single-Image-Read pro Render).

**Warum die Editor-Buttons nicht doch wieder einbauen?**
Wir hatten sie schon (siehe rolled-back Code dieser Session). Sie lösen einzelne Mockups aus, blockieren den Editor während des Renders und verteilen das Mockup-Wissen über drei Editor-Komponenten. Etsy-Variantenrender wollen aber bulk laufen, Operator-getrieben, nicht editor-getrieben. Die Pipeline ist genau dafür da.

### D) Dependencies (Packages)

**Keine neuen Pakete erforderlich.**

- `sharp` ist bereits Bestandteil des Projekts (Image-Pipeline)
- `@supabase/supabase-js` (Worker und Admin-API) ist bereits da
- Magenta-Detection-Logik und Slot-Extraktion existieren bereits in `scripts/build-frame-mockup.ts` und werden zum gemeinsamen Helper umgebaut

### E) Migrationen und Rollout

1. **Schema-Migration:** Neue Spalten auf `mockup_sets` + Konsistenz-Constraint + Erweiterung des Versions-Triggers
2. **Storage-Bucket:** `mockup-overlays` mit Admin-RLS
3. **Worker-Erweiterung:** Provider-Weiche in der Mockup-Compositing-Funktion
4. **Admin-UI-Erweiterung:** Provider-Selector + Upload-Felder + Auto-Magenta-Vorschau + manuelle Rechteck-Eingabe als Fallback
5. **Erst-Upload des Frame-Mockups:** Operator legt den ersten Local-Mockup-Set an (Frame portrait + landscape, sobald letzteres als PSD vorliegt)
6. **Optional Aufräumen:** Die jetzt unreferenced gebliebenen Dateien aus dieser Session (`src/lib/frame-mockup.ts`, `src/lib/frame-mockup-config.json`, `public/mockups/frame-portrait.png`) werden entfernt oder als reine Build-Vorstufe ins Helper-Skript verschoben — wird in `/frontend` / `/backend` entschieden.

### F) Was nicht in diese Architektur gehört (Hinweise für später)

- **Paletten-/Textur-Variantenmatrix** als Bulk-Trigger ist eine eigene Folge-Spec. Architektur dieser Spec ist davon unabhängig — der Worker bekommt heute schon einen Preset rein und rendert in alle zugewiesenen Mockup-Sets.
- **Editor-interner Mockup-Button** ist bewusst ausgeschlossen (siehe Tech-Entscheidung oben).
- **Perspektivische Slot-Geometrien** (Lifestyle-Mockups) sind weiterhin Dynamic-Mockups-Domäne — sharp.composite() kann nur axis-aligned.

---

## Implementation Notes (Backend, 2026-05-27)

### Migrations
- `supabase/migrations/20260527000000_proj52_local_mockup_provider.sql` — `provider`-Spalte mit CHECK-Constraint, 4 neue lokale Spalten (Overlay-URLs + Slot-JSONB pro Orientation), JSONB-Form-Check-Constraint pro Slot, Provider-Konsistenz-CHECK, erweiterte `mockup_sets_bump_version()` Trigger-Function. DM-UUID-Spalten von NOT NULL → NULL (durch Constraint trotzdem erzwungen wenn `provider='dynamic_mockups'`).
- `supabase/migrations/20260527000001_proj52_mockup_overlays_bucket.sql` — Storage-Bucket `mockup-overlays` (5 MB, nur `image/png`), Public-Read + Admin-RLS-Policies analog `fonts`-Bucket.

### Server-Side Lib
- `src/lib/local-mockup-processor.ts` — vier Exports:
  - `validateOverlayBuffer(buf)` — Bytes-Limit, PNG-Magic, Min/Max-Dimensions
  - `detectMagentaSlotAndStrip(buf)` — Magenta-Heuristik (R+B-Mindesthelligkeit + relativer G-Anteil), Dilation +2 px gegen Antialiasing-Säume, ersetzt durch volle Transparenz, liefert verarbeitetes PNG + Slot-Rect
  - `applyManualSlot(buf, slot)` — Fallback ohne Magenta-Marker, Bounds-Check
  - `composeLocalMockup({posterBuffer, overlayBuffer, slot})` — sharp-Compositing: Poster auf Slot scalen (cover), Overlay drüber, JPEG-Output

### Render-Worker
- `scripts/render-worker.ts` — `MockupSetRow` um `provider` + 4 lokale Spalten erweitert. `compositeViaMockup()` als Top-Level-Weiche zwischen `renderDmComposite()` (DM-API, bestehender Pfad) und `renderLocalComposite()` (sharp, neu). Local-Pfad liest `preset.config_json.orientation`, wählt entsprechendes Overlay, wirft mit klarer Fehlermeldung wenn Overlay fehlt. Mobile-Crop und Storage-Layout bleiben für beide Provider identisch.

### API-Endpoints
- `POST /api/admin/mockup-sets/upload-overlay` — neu. Multipart: `file` + `slug` + `orientation` + optional `slot_override`. Validiert PNG, führt Magenta-Detection oder manuellen Slot-Pfad aus, lädt nach Storage, gibt URL + Slot zurück.
- `POST/GET /api/admin/mockup-sets` — Zod-Schema umgebaut auf `discriminatedUnion('provider', [DynamicMockupsSchema, LocalSchema])`, vorgeschaltetes `preprocess` defaultet fehlendes `provider`-Feld auf `'dynamic_mockups'` (Backwards-Compat für Bestands-Frontend). `LocalSchema` mit Refinements: mind. eine Orientation, Overlay-URL und Slot zusammen.
- `PATCH /api/admin/mockup-sets/[id]` — Provider-Wechsel explizit abgelehnt (400, vor Zod-Parse). Alle anderen Felder beider Provider patchbar.
- `POST /api/admin/mockup-sets/[id]/test-render` — verzweigt auf `mockupSet.provider`. Local-Pfad rendert ein generiertes SVG-Platzhalter-Poster gegen die hinterlegten Overlays (portrait + landscape, falls beide gesetzt), speichert Thumbnails in `preset-renders/_thumbnails/{set-id}/{orientation}.jpg` und schreibt die URLs in die bestehenden Felder `desktop_thumbnail_url` (portrait) / `mobile_thumbnail_url` (landscape) — Reuse vorhandener UI-Felder ohne neue Spalten.

### Tests (34 grün)
- `src/lib/local-mockup-processor.test.ts` — 14 Unit-Tests für Validation, Magenta-Detection (inkl. tolerantem Photoshop-G=13), Dilation, manuelle Slots, Compositing-Pipeline (synthetische PNGs per sharp im Test)
- `src/app/api/admin/mockup-sets/route.test.ts` — 7 Tests für POST: Auth, beide Provider, Zod-Refinements (Orientation-Pflicht, Overlay+Slot-Paar)
- `src/app/api/admin/mockup-sets/[id]/route.test.ts` — 5 Tests für PATCH: Auth, Provider-Wechsel-Verbot, Updates erlaubter Felder
- `src/app/api/admin/mockup-sets/upload-overlay/route.test.ts` — 8 Tests (mit `// @vitest-environment node` wegen FormData), Magenta-Pfad, Manual-Slot-Pfad, alle Validation-Fehler
- Bestehende 194 Tests weiterhin grün (228 total, 0 Regressions)

### Open Items für /frontend
- `AdminMockupSetsList.tsx`: Provider-Radio im Anlege-Dialog, Upload-Felder + Slot-Vorschau, Provider-Badge im Listen-Eintrag
- Erst-Upload des bestehenden Frame-PSD über die neue Pipeline ausführen (löscht die Zwischendateien `src/lib/frame-mockup.ts`, `src/lib/frame-mockup-config.json`, `public/mockups/frame-portrait.png`)

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

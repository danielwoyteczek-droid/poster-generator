# PROJ-30: Preset-Render-Pipeline (Bulk-Preview-Generierung mit Mockup-Compositing)

## Status: Approved
- Reality-Check 2026-05-03: Acceptance Criteria im Code abgedeckt, Status auf Approved gehoben.

**Created:** 2026-04-27
**Last Updated:** 2026-05-03 (Compositor von Adobe Photoshop API auf Dynamic Mockups umgestellt — Adobe ist Enterprise-only, Dynamic Mockups ist self-serve und PSD-Smart-Object-fähig)

## Dependencies
- **Requires PROJ-1** (Karten-Editor Core) — Render-Pipeline öffnet die bestehenden `/map`- und `/star-map`-Routen mit `?preset=<id>` und nutzt den existierenden Editor-Code-Pfad als Render-Engine.
- **Requires PROJ-3** (Poster-Export) — die Pipeline ruft `buildPosterCanvas()` aus [src/hooks/useMapExport.ts](src/hooks/useMapExport.ts) bzw. den dort definierten Export-Flow auf, um aus dem Editor-State ein PNG zu erzeugen.
- **Requires PROJ-7** (Stern-Karten-Generator) — Star-Map-Presets werden über denselben Pipeline-Pfad gerendert (Editor-URL `/star-map?preset=<id>`).
- **Requires PROJ-8** (Design-Presets) — bestehendes Datenmodell `presets` (Supabase) mit `config_json`, `target_locales`, `occasions`, `display_order` ist die Grundlage. Wir erweitern es um Render-State-Felder.
- **Requires PROJ-9** (Admin-Editor-Werkzeuge) — Admin-Auth via [requireAdmin()](src/lib/admin-auth.ts) und der bestehende `/private/admin/presets`-Bereich werden als Host-UI verwendet.
- **Requires PROJ-22** (Admin-Paletten-Verwaltung) — Stale-Detection muss erkennen, wenn eine Palette geändert wurde, die ein gerendertes Preset verwendet.
- **Berührt PROJ-29** (Anlass-Landing-Pages) — `OccasionPresetGrid` zeigt die fertig gerenderten Bilder. Anlass-Seiten sind der primäre Konsument der Pipeline.
- **Berührt PROJ-11** (Homepage / Galerie) — Galerie zeigt ebenfalls die gerenderten Preset-Bilder.

## Problem & Ziel
Für die Skalierung der Anlass-Landing-Pages (PROJ-29) und der Galerie (PROJ-11) braucht es eine **große Menge fertiger Preset-Bilder pro Land** — geschätzt 30–40 Presets × 5 Locales = ~200 Presets, jedes davon visualisiert in einem Frame-Mockup ("Raumansicht"-Look) auf Desktop UND Mobile. Das sind ~400+ Einzelbilder.

Manuell wäre das:
- 200× Editor öffnen, Ort suchen, Style/Maske wählen, Texte eintragen
- 400× PNG exportieren
- 400× in Photoshop in ein Mockup-Frame einsetzen
- 400× zuschneiden und Pfad-konsistent benennen
- Bei jedem Palette-Wechsel oder Mockup-Update wieder von vorne

PROJ-30 baut deshalb eine **End-to-End-Automatisierung**, die das alles ohne Designarbeit ablaufen lässt:
- **CSV-Import** legt Presets in Bulk an (Marketing pflegt Tabelle, lädt hoch)
- **Headless-Browser-Worker** rendert pro Preset über die bestehende Editor-Pipeline ein nacktes Poster-PNG
- **Dynamic Mockups API** ersetzt das Smart Object einer in Dynamic Mockups gehosteten PSD durch das Poster-PNG und rendert das fertige Composite — Desktop + Mobile, inkl. Schatten/Lichteffekte/Perspektive aus der PSD
- **Job-Row-Pattern in Supabase** (`render_status`-Spalte) ersetzt eine externe Queue
- **Admin-UI** triggert Render-Jobs, zeigt Progress, und erkennt automatisch, wenn Presets durch Palette-/Mockup-Änderungen veraltet sind

Resultat: Eine neue Locale auszurollen heißt CSV pflegen → hochladen → Bulk-Render-Knopf drücken → 30 Min später sind alle Bilder live.

## User Stories
- Als Solo-Operator möchte ich pro Land eine CSV-Tabelle mit 30–40 Preset-Zeilen hochladen, sodass die Presets in Supabase angelegt werden, ohne dass ich jedes einzeln im Editor erstelle.
- Als Operator möchte ich einen "Duplizieren"-Button am Preset, damit ich ein gut kuratiertes Preset für einen anderen Ort/Anlass schnell klonen und anpassen kann.
- Als Operator möchte ich pro Mockup-Set (z. B. "Holzrahmen Wohnzimmer", "Modernrahmen Schlafzimmer") eine PSD-Datei hochladen, deren Smart Object den Poster-Platzhalter markiert — die Adobe API ersetzt den Inhalt automatisch beim Rendern, ich brauche keine Pixel-Koordinaten zu pflegen.
- Als Operator möchte ich pro Preset auswählen, in welchen Mockup-Sets es gerendert werden soll, sodass ich auf der Anlass-Landing-Page unterschiedliche Frame-Stile spielen kann.
- Als Operator möchte ich pro Preset zwei Bildvarianten erzeugen — Desktop (z. B. quer/groß) und Mobile (z. B. hoch/kompakt) — damit Frontend pro Viewport das passende Format laden kann.
- Als Operator möchte ich nach dem CSV-Import alle neuen Presets per Knopfdruck "Bulk-Render" in die Render-Queue setzen, damit der Worker beim nächsten Lauf sie alle abarbeitet.
- Als Operator möchte ich auf einer Status-Seite sehen, welche Presets gerade rendern, welche fertig sind und welche fehlgeschlagen sind, damit ich Fehler gezielt nachverfolgen kann.
- Als Operator möchte ich einen Render-Worker via `npm run render-worker` lokal starten — und denselben Worker später ohne Code-Anpassungen in einem Docker-Container laufen lassen, falls Render-Volume es erfordert.
- Als Operator möchte ich, dass das System automatisch erkennt, wenn ich eine Palette oder ein Mockup-Set geändert habe, und mir zeigt, welche Presets jetzt veraltet sind — sodass ich gezielt Re-Render triggere.
- Als Endnutzer:in (Anlass-Landing-Page-Besucher:in) möchte ich Preset-Bilder in einem ansprechenden Raumansicht-Look sehen statt nüchterner Poster-Plakate, damit das Produkt sich emotional fertig anfühlt.

## Acceptance Criteria

### Datenmodell-Erweiterungen (Supabase)
- [ ] `presets`-Tabelle bekommt neue Spalten:
  - `render_status` (Enum: `pending` | `rendering` | `done` | `failed` | `stale`, Default: `pending`)
  - `render_error` (Text, nullable) — Letzter Fehler-String, wenn `failed`
  - `render_started_at` (Timestamp, nullable) — Worker-Lock-Marker für Concurrency
  - `render_completed_at` (Timestamp, nullable)
  - `render_worker_id` (Text, nullable) — Identifiziert den Worker, der gerade rendert (für Multi-Worker-Cleanup)
  - `render_inputs_hash` (Text) — Hash über `(config_json, mockup_set_ids, palette_version)` zum Stale-Detection
- [ ] Neue Spalte `mockup_set_ids` (UUID[], default `[]`) auf `presets` — Liste der Mockup-Sets, in denen das Preset gerendert werden soll.
- [ ] `preview_image_url` bleibt das primäre Vorschaubild (z. B. Desktop-Variante des ersten Mockup-Sets); zusätzliche Bilder leben in einer neuen Tabelle `preset_renders`.

### Neue Tabelle `preset_renders`
- [ ] Eine Zeile pro `(preset_id × mockup_set_id × variant)` — variant ∈ `desktop` | `mobile`.
- [ ] Spalten: `id`, `preset_id` (FK), `mockup_set_id` (FK), `variant`, `image_url`, `image_width`, `image_height`, `rendered_at`, `inputs_hash`.
- [ ] Unique-Constraint auf `(preset_id, mockup_set_id, variant)` — eine Zeile pro Kombination, Re-Render überschreibt sie.
- [ ] Beim Löschen eines Presets oder eines Mockup-Sets werden zugehörige `preset_renders`-Zeilen + Storage-Files automatisch entfernt (Cascade + Storage-Cleanup-Hook).

### Neue Tabelle `mockup_sets`
- [ ] Spalten: `id` (UUID), `slug` (Text, unique), `name` (Text), `description` (Text, optional), `desktop_template_uuid` (Text — `mockup_uuid` aus Dynamic Mockups für die Desktop-Variante), `desktop_smart_object_uuid` (Text — UUID des zu ersetzenden Smart Objects), `mobile_template_uuid` (Text), `mobile_smart_object_uuid` (Text), `desktop_thumbnail_url` (Text — Public-URL eines Vorschau-Bildes mit Platzhalter-Poster, vom Operator beim Anlegen einmalig generiert oder vom Dynamic-Mockups-Preview kopiert), `mobile_thumbnail_url` (Text), `is_active` (Boolean), `created_at`, `updated_at`, `version` (Integer, +1 bei jeder Änderung der UUIDs — für Stale-Detection).
- [ ] **PSDs leben in Dynamic Mockups, nicht in Supabase** — wir speichern nur die UUIDs der dort gehosteten Templates. Operator lädt PSDs einmalig im Dynamic-Mockups-Dashboard hoch und überträgt die beiden UUIDs in unser Admin-UI.
- [ ] Mockup-Sets können nicht gelöscht werden, solange sie von Presets referenziert sind — UI zeigt Warnung mit Liste der referenzierten Presets, alternativ "deaktivieren" (`is_active = false`) statt Löschen.
- [ ] Mindestens ein Mockup-Set muss zum Launch existieren (PSD im Dynamic-Mockups-Dashboard hochgeladen + UUIDs im Admin eingetragen).

### CSV-Import
- [ ] Admin-UI auf `/private/admin/presets` bekommt Tab/Sektion "Bulk-Import (CSV)".
- [ ] CSV-Format (UTF-8, Komma- oder Semikolon-getrennt, erste Zeile = Header):
  - `name` (Pflicht) — z. B. "Berlin · Brandenburger Tor"
  - `poster_type` (Pflicht) — `map` oder `star-map`
  - `location_query` (Pflicht für `map`) — Suchstring für MapTiler-Geocoder, z. B. "Brandenburger Tor, Berlin"
  - `location_lat`, `location_lng`, `location_zoom` (optional) — Override, falls Geocoder ungenau ist
  - `palette_id` (Pflicht) — UUID einer existierenden Palette, oder `palette_slug` als alternative Spalte
  - `mask_key` (optional) — Default: `none` für Fullbleed
  - `style_id` (optional, nur `map`) — Default aus globalem App-Default
  - `layout_id` (optional)
  - `text_main`, `text_sub`, `text_coords` (optional) — Vorbelegung der Standard-Textblöcke
  - `target_locales` (Pflicht, Komma-getrennt) — z. B. `de,en`
  - `occasions` (Pflicht, Komma-getrennt) — z. B. `heimat,geschenk`
  - `mockup_set_slugs` (Pflicht, Komma-getrennt) — z. B. `wohnzimmer-holz,schlafzimmer-modern`
  - `display_order` (optional, Integer, Default: 100)
  - `show_in_editor` (optional, Boolean, Default: false)
- [ ] Import-Workflow:
  1. CSV-Upload → Server-side Parsen + Validierung.
  2. Pre-Flight-Check zeigt Validierungs-Report: pro Zeile entweder ✓ "wird angelegt" oder ✗ "Fehler: …" (z. B. unbekannte Palette, ungültiger Anlass, fehlende Pflichtfelder).
  3. Operator bestätigt → angelegt werden nur valide Zeilen, fehlerhafte werden überspringend gemeldet.
  4. Geocoding via MapTiler passiert serverseitig pro `location_query` (es sei denn, lat/lng sind explizit gesetzt) und ist Teil des Import-Schritts.
  5. Neue Presets bekommen automatisch `render_status = 'pending'`.
- [ ] CSV-Import ist **idempotent über `name`-Spalte**: existiert ein Preset mit demselben Namen, wird es **aktualisiert** (außer der Operator wählt explizit "nur Neue anlegen, Updates überspringen").
- [ ] Beispiel-CSV mit 5 deutschen Beispiel-Presets ist als Download-Link im Import-UI verfügbar.

### Duplicate-Workflow
- [ ] In der Preset-Liste hat jede Zeile einen "Duplizieren"-Button.
- [ ] Klick öffnet einen modalen Dialog mit Vorbelegung aller Felder; Operator passt typischerweise nur Name + Location an.
- [ ] Beim Speichern wird ein neues Preset erzeugt mit `render_status = 'pending'`, gleichen Mockup-Sets, gleicher Palette, gleichem Style, gleichen Texten — Operator hat ein neues Preset für einen neuen Ort in unter 30 Sekunden angelegt.

### Mockup-Verwaltung (`/private/admin/mockup-sets`)
- [ ] Neue Admin-Sub-Seite `/private/admin/mockup-sets` (Admin-Only via `requireAdmin()`).
- [ ] Listenansicht: alle Mockup-Sets mit Thumbnail (Desktop), Name, Slug, Anzahl referenzierender Presets, Aktiv-Status, Edit/Deaktivieren-Buttons.
- [ ] **Operator-Workflow vor dem Anlegen** (steht als Hinweistext im UI):
  1. PSD im **Dynamic-Mockups-Dashboard** unter "Adobe Photoshop → Custom Mockups" hochladen (8-Bit, Smart Object enthalten, < 100 MB).
  2. Im Template-Detail die **`mockup_uuid`** + **`smart_object.uuid`** kopieren (zu finden im "Use API"-Code-Snippet).
  3. Diese Werte im Admin-UI ins Mockup-Set-Form eintragen.
- [ ] "Neues Mockup-Set"-Button öffnet Editor-Form mit folgenden Feldern:
  - Name (Pflicht), Slug (auto aus Name, editierbar), Beschreibung (optional)
  - **Desktop-Template-UUID** (Pflicht, `mockup_uuid` aus Dynamic Mockups)
  - **Desktop-Smart-Object-UUID** (Pflicht)
  - **Mobile-Template-UUID** (Pflicht)
  - **Mobile-Smart-Object-UUID** (Pflicht)
  - Desktop-Thumbnail-URL (optional — sonst wird automatisch generiert)
  - Mobile-Thumbnail-URL (optional)
- [ ] **Validierung beim Save:** Test-Render-Aufruf an Dynamic Mockups mit einem statischen Platzhalter-Poster (z. B. `/public/mockup-test-poster.png`):
  - Wenn die UUIDs gültig sind und der Render funktioniert, wird die zurückgelieferte `export_path`-URL als Thumbnail gespeichert.
  - Wenn Dynamic Mockups einen Fehler zurückgibt (UUID nicht gefunden, Smart Object passt nicht zum Template, Plan überschritten), wird Save abgelehnt mit der Fehlermeldung aus der API-Response.
- [ ] Nach Speichern wird `version`-Spalte des Mockup-Sets +1, was Stale-Detection für referenzierende Presets triggert.

### Render-Worker (`scripts/render-worker.ts`)
- [ ] Worker-Script wird per `npm run render-worker` gestartet (lokal) oder per `docker run` (Cloud-ready).
- [ ] Worker-Loop:
  1. Polling-Intervall: 5 Sekunden.
  2. Worker schreibt eine `worker_id` (UUID, generiert beim Start) und einen `worker_started_at`-Timestamp in eine `render_workers`-Tabelle (für Sichtbarkeit + Heartbeat).
  3. Pro Poll: Atomic-Claim einer `pending`-Row via `UPDATE presets SET render_status = 'rendering', render_worker_id = ?, render_started_at = NOW() WHERE id = (SELECT id FROM presets WHERE render_status = 'pending' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`.
  4. Wenn keine Row da: weiterschlafen.
  5. Wenn Row gefunden: Render-Pipeline für dieses Preset (siehe nächster Punkt).
  6. Bei Erfolg: `render_status = 'done'`, `render_completed_at = NOW()`, `render_inputs_hash` aktualisiert.
  7. Bei Fehler: `render_status = 'failed'`, `render_error = <message>`. Failed-Rows werden NICHT automatisch retried (Operator muss sie manuell erneut auf `pending` setzen).
- [ ] Stale-Worker-Cleanup: alle 60 Sekunden prüft jeder Worker, ob es Rows mit `render_status = 'rendering'` und `render_started_at < NOW() - 10 minutes` gibt → diese werden zurück auf `pending` gesetzt (Worker ist gecrasht / Container neu gestartet).
- [ ] Concurrency: mehrere Worker können parallel laufen, atomare `FOR UPDATE SKIP LOCKED`-Claim verhindert Doppel-Render.
- [ ] Worker-Konfiguration via Env-Variablen:
  - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY` (Pflicht)
  - `RENDER_WORKER_ID` (optional, generiert sonst)
  - `APP_BASE_URL` (Pflicht, z. B. `http://localhost:3000` lokal, `https://staging.app.com` Cloud)
  - `RENDER_HEADLESS_TOKEN` (Pflicht) — Token, mit dem der Worker `?headless=1`-Endpoints aufruft
  - `RENDER_PARALLEL_BROWSERS` (optional, Default 1, max 4) — wie viele Playwright-Browser parallel
  - `RENDER_BROWSER_TIMEOUT_MS` (optional, Default 60000) — pro-Render-Timeout
  - `DYNAMIC_MOCKUPS_API_KEY` (Pflicht) — API-Key aus dem Dynamic-Mockups-Dashboard (Format: `<uuid>:<hash>`)
  - `DYNAMIC_MOCKUPS_API_URL` (optional, Default `https://app.dynamicmockups.com/api/v1`) — Base-URL der API
  - `DYNAMIC_MOCKUPS_TIMEOUT_MS` (optional, Default 60000) — HTTP-Timeout pro Render-Call (Sync-API antwortet typischerweise in 5–15s)
- [ ] Worker startet sauber bei `Ctrl+C` (graceful shutdown: aktuelle Renders zu Ende, dann exit).
- [ ] Logging: pro Render eine Zeile mit `preset_id`, `duration_ms`, `status`. Bei Fehler: Stack-Trace.

### Render-Pipeline (pro Preset)
Der Worker führt für jedes Preset die folgende Sequenz durch:

1. **Editor-Render via Playwright (Poster-PNG):**
   - [ ] Worker startet einen Headless-Chromium (Playwright).
   - [ ] Worker navigiert zu `${APP_BASE_URL}/${defaultLocale}/${editorPath}?preset=<id>&headless=1` mit `X-Render-Token`-Header — wobei `editorPath = poster_type === 'star-map' ? 'star-map' : 'map'`.
   - [ ] Editor erkennt `?headless=1`-Param + Token, lädt Preset, wartet bis `window.__posterReady === true`.
   - [ ] Worker ruft `window.__renderPosterPng({ format: 'A4' })` auf und bekommt das nackte Poster als PNG-Blob.
   - [ ] Worker lädt dieses Poster-PNG temporär nach Supabase Storage hoch (Bucket `preset-renders-temp`, Pfad `<preset-id>/poster.png`) und generiert eine pre-signed URL (Gültigkeit 1h) — Adobe API braucht eine HTTPS-erreichbare URL als Input.
2. **Mockup-Compositing via Dynamic Mockups (synchron):**
   - [ ] Pro Mockup-Set in `preset.mockup_set_ids` und pro Variante (`desktop`, `mobile`):
     - **POST `https://app.dynamicmockups.com/api/v1/renders`** mit Headers `x-api-key: <DYNAMIC_MOCKUPS_API_KEY>`, `Content-Type: application/json`, `Accept: application/json` und Body:
       ```
       {
         "mockup_uuid": "<mockup_set.<variant>_template_uuid>",
         "smart_objects": [
           {
             "uuid": "<mockup_set.<variant>_smart_object_uuid>",
             "asset": { "url": "<pre-signed-poster-url>" }
           }
         ]
       }
       ```
     - Dynamic Mockups antwortet **synchron** (~5–15s) mit `{ success: true, data: { export_path: "https://..." } }` oder `{ success: false, message: "..." }`.
     - Bei Erfolg: Worker GETtet `export_path`, lädt das fertige Composite-Bild in einen Buffer.
     - Bei Fehler: `render_status = 'failed'`, `render_error = response.message`.
3. **Re-Upload zu Supabase Storage:**
   - [ ] Worker lädt den Buffer aus Schritt 2 nach Supabase Storage hoch.
   - [ ] Bucket-Struktur: `preset-renders/<preset-id>/<mockup-set-id>/<variant>.png`.
   - [ ] Public-URL via `getPublicUrl()` ermitteln.
4. **DB-Update:**
   - [ ] Pro `(preset_id × mockup_set_id × variant)` wird eine `preset_renders`-Zeile via UPSERT geschrieben (Unique-Constraint auf der Kombination).
   - [ ] `presets.preview_image_url` wird auf die Desktop-Variante des ersten Mockup-Sets gesetzt (für Galerie-Quick-Display).
   - [ ] `presets.render_status = 'done'`, `render_inputs_hash` aktualisiert.
5. **Cleanup:**
   - [ ] Temporäre Poster-PNG aus `preset-renders-temp` wird nach erfolgreichem Composite-Upload entfernt (oder per TTL nach 24h automatisch).

### Stale-Detection
- [ ] **Hash-Berechnung:** `render_inputs_hash` ist SHA-256 über JSON-stringify von `{ config_json, mockup_set_ids, palette_version (aus Palette gelookt), mockup_set_versions (aus Mockup-Sets gelookt) }`.
- [ ] **Stale-Mark-Trigger:**
  - Beim Save einer Palette: alle Presets, die diese Palette referenzieren, bekommen `render_status = 'stale'` (wenn vorher `done` waren).
  - Beim Save eines Mockup-Sets: alle Presets, die dieses Set in `mockup_set_ids` referenzieren, bekommen `render_status = 'stale'` (wenn vorher `done` waren).
- [ ] Admin-UI auf `/private/admin/presets` zeigt einen Status-Banner: "X Presets veraltet — [Bulk-Re-Render]-Button". Klick setzt alle stale auf `pending`.
- [ ] Pro Preset zeigt die Liste den `render_status` als Badge (Done = grün, Pending = gelb, Rendering = blau-pulse, Failed = rot, Stale = orange).

### Admin-UI-Erweiterungen
- [ ] [/private/admin/presets](src/app/private/admin/presets/page.tsx) bekommt:
  - Filter: Status (alle/pending/rendering/done/failed/stale), Locale, Anlass, Mockup-Set, poster_type
  - Per-Zeile-Aktionen: Edit, Duplizieren, "Render jetzt" (setzt Status `done` → `pending`), "Bilder anzeigen" (öffnet Lightbox mit allen Renders pro Mockup-Set/Variante), Löschen
  - Bulk-Aktionen (Multi-Select): "Alle ausgewählten in Render-Queue", "Stale-Presets re-rendern", Locale/Anlass/Mockup-Set ändern, Löschen
  - Live-Polling: alle 3 Sekunden Status-Refresh, solange mindestens eine Row in `rendering` oder `pending` ist (sonst keine Polls)
  - Progress-Anzeige: "47 / 200 gerendert" + Fortschritts-Bar
- [ ] Render-Status-Dashboard auf `/private/admin/render-status` (eigene Seite oder Tab):
  - Aktive Worker (mit Heartbeat-Time und gerade laufendem Preset)
  - Letzte 50 Render-Events (Erfolg/Fehler) mit Duration
  - Failed-Presets mit Fehlermeldung + One-Click "Erneut versuchen"-Button

### Editor-Anpassungen für Headless-Rendering
- [ ] Editor erkennt `?headless=1`-URL-Param (sowohl `/map` als auch `/star-map`):
  - UI-Chrome (Toolbar, Sidebar, Modals) wird ausgeblendet.
  - Nur die Poster-Canvas wird gerendert, zentriert auf weißem Hintergrund.
  - Nach komplettem Render-Stable (Map idle, Fonts geladen, Bilder geladen) wird `window.__posterReady = true` gesetzt.
- [ ] Globale `window.__renderPosterPng({ format })`-Funktion wird im Headless-Modus exposed:
  - Aufruf triggert `buildPosterCanvas()` aus `useMapExport`.
  - Gibt PNG als DataURL oder Blob zurück.
- [ ] Headless-Modus ist nur lokal/intern erreichbar — Production-Domain blockt `?headless=1` von externen Referrern, oder schützt es per IP-Allowlist / Header-Token. Architektur entscheidet.

### Cloud-Ready-Setup
- [ ] `Dockerfile.worker` im Repo, baut ein Image mit:
  - Node 20 + Playwright + Chromium-Dependencies
  - Worker-Code + dependencies
  - Entry: `node scripts/render-worker.js`
- [ ] `docker-compose.yml` (oder Beispiel-Snippet in der README) zeigt, wie Worker + lokale App zusammen laufen.
- [ ] Worker liest Konfiguration ausschließlich aus Env-Variablen — keine harcoded Pfade, keine localhost-Annahmen außer per Default.
- [ ] Worker-Image baut deterministisch (Lockfile committed, keine network-time-Race-Conditions).

### Storage-Setup
- [ ] Neuer Supabase-Storage-Bucket `preset-renders` mit Public-Read-Access (Bilder werden auf Marketing-Seiten ausgespielt).
- [ ] Bucket-Lifecycle-Policy: nichts wird automatisch gelöscht; Cleanup geschieht per Cascade aus Datenbank-Delete-Hooks.
- [ ] Mockup-Bilder werden im Bucket `mockup-sets` gespeichert (auch public, weil sie ggf. im Drag-Box-Editor angezeigt werden müssen).

## Edge Cases
- **CSV enthält Pflichtspalten nicht oder hat falsches Format** → Pre-Flight-Validierung schlägt vor dem Anlegen fehl, Operator sieht Fehler-Report mit Zeilennummer und Begründung. Kein Teilimport, alles oder nichts pro Datei (außer Operator wählt "valide Zeilen importieren, fehlerhafte überspringen").
- **CSV verweist auf eine Palette/Mockup-Set, das nicht existiert** → Zeile als Fehler markiert, kein Anlegen. Operator muss zuerst Palette anlegen oder Slug korrigieren.
- **Geocoding für `location_query` schlägt fehl** → Zeile bekommt `location_geocoded = false`-Flag, wird trotzdem angelegt mit Default-Koordinaten (Berlin) UND `render_status = 'failed'` mit klarem Fehler "Location nicht gefunden". Operator muss lat/lng manuell setzen oder Query korrigieren.
- **Headless-Render-Page lädt nicht in 60s** → Worker bricht mit Timeout ab, `render_status = 'failed'`, Fehler "Render-Timeout: Editor lud nicht innerhalb von 60s". Wird typischerweise von langsamen Map-Tiles oder Netzwerk-Issues ausgelöst.
- **Smart-Object-UUID gehört nicht zum angegebenen Mockup-Template** → Dynamic Mockups antwortet mit `success: false` und einer Fehlermeldung. Worker setzt `render_status = 'failed'` mit der API-Message. Beim Mockup-Save wird das durch den Test-Render schon vorab validiert.
- **Mockup-Template wurde im Dynamic-Mockups-Dashboard gelöscht oder umbenannt** → API antwortet mit Not-Found-Fehler. Worker markiert Render als `failed` mit klarer Meldung, Operator muss UUID im Mockup-Set updaten.
- **Dynamic Mockups antwortet nicht in `DYNAMIC_MOCKUPS_TIMEOUT_MS`** → Worker bricht ab, `render_status = 'failed'`, Fehler "Dynamic-Mockups-Timeout". Kein automatischer Retry; Operator entscheidet.
- **Dynamic-Mockups-Credits erschöpft (Free-Tier 50 Renders, oder bezahltes Volumen)** → API antwortet mit 402/Quota-Error oder ähnlichem. Worker setzt `render_status = 'failed'` mit klarer Meldung, hört auf, weitere Dynamic-Mockups-Calls zu machen für die nächsten 60 Sekunden, und versucht dann den nächsten Job. Operator sieht im Dashboard "Dynamic-Mockups-Credits aufgebraucht".
- **Pre-signed URL für Poster-PNG läuft ab, bevor Dynamic Mockups sie fetcht** → Sehr unwahrscheinlich, weil der Sync-Call innerhalb 30s passiert und URLs 1h gültig sind. Falls doch: API gibt Asset-Fetch-Error, Worker markiert als `failed`.
- **Preset hat keine Mockup-Sets gewählt (`mockup_set_ids = []`)** → Worker speichert das nackte Poster-PNG (aus Editor-Render) direkt als Fallback unter `preset-renders/<id>/_naked/<variant>.png`. UI zeigt Warnung "Kein Mockup-Set zugewiesen — Fallback-Render ohne PSD-Composite verwendet".
- **Worker stürzt mitten im Render** → `render_status` bleibt auf `rendering`, `render_started_at` zeigt alten Timestamp. Cleanup-Loop (alle 60s) erkennt `rendering > 10 Minuten` und setzt zurück auf `pending`.
- **Mehrere Worker greifen denselben Preset** → `FOR UPDATE SKIP LOCKED` verhindert das atomar; nur ein Worker bekommt die Row, andere finden im selben Poll eine andere oder schlafen.
- **Operator klickt "Bulk-Re-Render" während Worker läuft** → Bestehende `rendering`-Rows werden NICHT angefasst (Worker arbeitet sie ab). Nur `done`/`failed`/`stale`-Rows werden auf `pending` gesetzt. UI zeigt Warnung "12 Presets rendern aktuell, nur 188 wurden in die Queue gesetzt".
- **Palette wird gelöscht, die von Presets referenziert wird** → Foreign-Key-Constraint verhindert das, oder UI bietet "Auf Default-Palette migrieren"-Option an. Konsistenz mit PROJ-22 — wahrscheinlich existiert die Logik dort schon.
- **Mockup-Set wird deaktiviert (`is_active = false`), während Presets es referenzieren** → Bestehende Renders bleiben gültig, aber Preset-Edit-UI warnt, dass das Mockup-Set inaktiv ist; Re-Render würde fehlschlagen oder das deaktivierte Set überspringen. Empfehlung: deaktiviertes Set bleibt für Render verfügbar, wird nur in der "Neue Auswahl"-Liste ausgeblendet.
- **Smart-Object-Aspect-Ratio passt nicht zum Poster** → Adobe ersetzt Smart-Object-Inhalt unter Beibehaltung der Smart-Object-Bounds; Poster wird automatisch in das Smart-Object-Rechteck gefittet (Adobe-Default ist Fit-Within-Smart-Object). Wenn Operator das Verhalten anders möchte, ist das im PSD-Setup zu lösen (Smart-Object so designen, dass das Aspect-Ratio zum Poster passt) — keine API-Konfiguration nötig.
- **Render-Inputs-Hash kollidiert (theoretisch)** → SHA-256-Kollision ist astronomisch unwahrscheinlich; ignorieren.
- **CSV mit 1000+ Zeilen** → Server-side Streaming-Parser (z. B. `papaparse` mit Streaming-Mode), kein Memory-Issue. Geocoding-Stage ist rate-limited (MapTiler erlaubt n Requests/s — Worker fügt Throttle ein).
- **Operator tauscht eine PSD aus** → `version` wird +1, Presets sind stale. Auto-Thumbnail wird neu generiert. Operator sieht im neuen Thumbnail, ob das gewünschte Ergebnis erzielt wird, bevor Bulk-Re-Render der referenzierenden Presets getriggert wird.
- **Bestehende Presets ohne `render_inputs_hash`** (Migration-Backwards) → werden initial als `stale` markiert, damit beim ersten Lauf alles neu gerendert wird.
- **Storage-Bucket-Quota überschritten** → Worker setzt `render_status = 'failed'` mit klarem Fehler. Operator muss alte Renders aufräumen oder Quota erhöhen.
- **Preset mit Photo-Integration (PROJ-19)** → Headless-Render lädt das User-Photo aus dem Preset-State; falls nicht erreichbar, `failed` mit "Photo-Asset nicht erreichbar".

## Non-Goals
- **Keine PSD-Bearbeitung im Browser.** PSDs werden als Asset hochgeladen und unverändert verwendet. Operator editiert PSDs in Photoshop und lädt die neue Version hoch — kein In-App-PSD-Editor.
- **Kein Re-Build vorhandener PSDs.** Operator nutzt seine bestehenden PSDs mit Smart Objects ohne Anpassung; die App passt sich an die PSD-Struktur an, nicht umgekehrt.
- **Keine automatische Re-Render-Queue.** Stale-Detection markiert nur, Operator triggert Re-Render manuell. Auto-Re-Queue ist als V2-Option offen (siehe Open Questions).
- **Kein Multi-Tenancy.** Genau ein Operator-Team verwaltet alle Presets/Mockups. Kein Per-User-Scoping.
- **Keine Sharp-Compositing-Logik in V1.** Dynamic Mockups ist der einzige Compositor — kein Fallback auf flache PNG-Composition. Wenn Dynamic-Mockups-Account/Credits fehlen, läuft die Pipeline nicht (V2-Sharp-Fallback wäre eine separate Entscheidung).
- **Kein Echtzeit-Render-Stream.** Operator wartet auf Status-Polling, kein WebSocket / SSE.
- **Kein Auto-Crop / Auto-Smart-Composition.** Operator muss Poster-Rect pro Mockup manuell festlegen — keine ML/CV-basierte Frame-Erkennung.
- **Kein Mockup-Marketplace.** Mockup-Sets sind ein internes Asset, das Operator pflegt; keine User-generated-Mockups.
- **Keine Render-Versionierung.** Re-Render überschreibt alte Bilder im Storage; keine Historisierung. Falls nötig, Operator macht Storage-Backup bevor er Bulk-Re-Render macht.
- **Kein i18n im Admin-UI.** Admin ist nur Deutsch (Operator-Sprache), wie der Rest des Admin-Bereichs.
- **Kein automatisches Posten in Anlass-Landing-Pages.** Verteilung der Presets auf Anlass-Seiten geschieht über das bestehende `presets.occasions[]`/`target_locales[]`-Tagging — PROJ-29 zeigt automatisch passende Presets, sobald sie gerendert sind.
- **Kein Star-Map-spezifisches Mockup-Format-Handling.** Mockups sind generisch; Star-Maps nutzen dieselben Mockup-Sets und Aspect-Ratios. Operator wählt passende Mockups aus.
- **Keine animierten Mockups (GIF/Video).** Statisches PNG only.

## Decisions (vor Architecture festgelegt)
- **Render-Trigger: Manuell + Bulk** (kein Auto-on-Save). Operator behält Kontrolle über Worker-Last; Save speichert nur Daten.
- **Mockup-Compositor: Dynamic Mockups (Self-Serve, Sync-API)**, kein sharp-Compositing, kein Adobe (Adobe Photoshop API ist Enterprise-only). Begründung: Operator hat bestehende PSDs mit Smart Objects, Dynamic Mockups ersetzt Smart-Object-Inhalt nativ inkl. Schatten/Perspektive; Self-Serve mit ~$19/mo + ~$0.02/Render; einfache `x-api-key`-Auth statt OAuth.
- **PSD-Storage: Dynamic Mockups (extern), nicht Supabase**. Begründung: Dynamic Mockups hostet die hochgeladenen PSDs in deren System, vergibt UUIDs. Wir speichern nur die UUIDs in unserer Datenbank, kein Datei-Handling auf unserer Seite — schlanker und ein System weniger.
- **Mockup-Konfiguration: Template-UUID + Smart-Object-UUID** statt Layer-Name. Begründung: Dynamic Mockups identifiziert Smart Objects per UUID (robust gegenüber Umbenennungen in der PSD).
- **Mockup-Anzahl: Mehrere Mockup-Sets pro Preset** (`mockup_set_ids[]`). Maximale Marketing-Flexibilität; Datenmodell etwas komplexer (extra Tabelle `preset_renders` statt 2 URL-Spalten auf `presets`).
- **Stale-Detection: Stale-Flag + manueller Re-Render**. Operator entscheidet, wann Worker laufen soll.
- **Preset-Anlage: CSV-Import + Duplicate-Button**. Bulk-Speed via CSV, gezielte Pflege via Duplicate.
- **Worker: Lokal + Cloud-ready** (Dockerfile von Anfang an). Migrations-Aufwand zu Hetzner/Fly.io = nur Deployment.
- **Spec-Scope: Render-Pipeline + Mockup-Verwaltung + CSV + Stale-Detection** in einer Spec, weil zusammenhängender Workflow.
- **`preset_renders` als eigene Tabelle** statt JSONB-Spalte auf `presets`. Begründung: pro `(mockup × variant)` eine Zeile mit eigener URL/Hash erlaubt sauberes Cascade-Delete und Filter-Queries.
- **Editor-Headless-Mode via `?headless=1`-URL-Param** statt eigene Render-API. Wiederverwendet bestehenden Editor-Code, kein Duplizieren von Render-Logik.
- **Atomic-Claim via `FOR UPDATE SKIP LOCKED`** für Multi-Worker-Concurrency. Standard-Postgres-Pattern, keine externe Queue nötig.
- **Failed-Renders werden NICHT auto-retried.** Operator muss manuell `pending` setzen — verhindert endlose Retry-Schleifen bei Daten-Fehlern.
- **`render_inputs_hash` als SHA-256 über (config_json + mockup_versions + palette_version)** als Stale-Indikator. Kein Wall-Clock-Compare nötig.
- **Dynamic-Mockups-Auth via einfachem `x-api-key`-Header**, kein OAuth-Flow. Worker hat nur einen API-Key in der Env.

## Open Questions
- **Headless-Mode-Schutz**: Wie verhindern wir, dass `?headless=1` von Externen abgerufen wird (das würde User-Browser kaputt machen)? Optionen: (a) Nur in Development/Staging erreichbar, Production blockt; (b) Header-Token, das nur Worker kennt; (c) IP-Allowlist. → Architektur-Phase entscheidet.
- **Browser-Pool im Worker**: Soll der Worker pro Render einen frischen Chromium starten (sauber, langsam: ~10s Cold-Start), oder einen Browser-Pool wiederverwenden (schnell, möglicherweise State-Leak zwischen Renders)? → Architektur-Phase, Tendenz Pool mit `context.close()` zwischen Renders.
- **Auto-Retry für Failed Renders**: Wir haben `kein Auto-Retry` als Default — soll es trotzdem eine Konfig geben, dass z. B. nach 5 Min ein retry passiert für transiente Fehler (Network-Timeout)? → Architektur, Tendenz: V1 ohne, V2-Konfig.
- **Pre-Render-Stylesheet**: Der Editor lädt heute mehrere Stylesheets / Fonts. Sollen wir im Headless-Modus eine "minimal CSS"-Variante laden, um Render-Determinismus zu erhöhen? → Architektur prüft Risiko.
- **Aspect-Ratio-Mismatch**: Smart-Object-Bounds in der PSD bestimmen das Aspect-Ratio. Adobe API fittet das Poster-PNG in das Smart-Object-Rechteck (Adobe-Default: Stretch-to-fit). Wenn das Aspect-Ratio nicht passt, ist das ein PSD-Designfehler — kein App-Konfigurationsproblem. Operator löst das in Photoshop.
- **Adobe-Volumen-Plan**: Free-Tier (~25 Calls/Tag) reicht für Tests. Für 800-Bild-Bulk-Lauf wird ein bezahlter Adobe-Plan benötigt. → Operator-Entscheidung vor erstem Bulk-Lauf, Tendenz: Pay-as-you-go testen, falls Volumen wächst dann Subscription.
- **Adobe-Output direkt nach Supabase oder Adobe-Storage als Zwischenstep?** Adobe API kann direkt PUT auf eine pre-signed Supabase-URL machen (saubere Pipeline). Alternative: Adobe legt in Adobe-Storage ab, Worker kopiert. → Architektur entscheidet, Tendenz: direkt nach Supabase per pre-signed PUT-URL.
- **Palette-Versions-Tracking**: Hat die `palettes`-Tabelle heute schon eine `version` oder `updated_at`? Wenn nicht, müssen wir das in PROJ-22 nachziehen. → Architektur prüft Bestand.
- **Sitemap-Update für gerenderte Preset-Bilder**: Sollen die Bild-URLs in einer separaten Image-Sitemap (`/sitemap-images.xml`) auftauchen, damit Google Bilder-Search sie findet? → SEO-Erweiterung, kann V2 sein.
- **Bandbreiten-Last**: 200 Presets × 2 Mockups × 2 Varianten × ~500KB ≈ 400MB Storage initial, plus Re-Renders. Reicht der Standard-Supabase-Plan, oder müssen wir früh upgraden? → Operator-Entscheidung, nicht spec-relevant.
- **Mobile-Variante: anderes Aspect-Ratio oder nur kleinere Auflösung?** Aktuelle Annahme: anderes Aspect-Ratio (Mobile-Mockup ist hochformatig, z. B. Smartphone-Mockup; Desktop ist quer, z. B. Wohnzimmer-Wand). → Architektur prüft, ob das mit Mockup-Set-Konzept (zwei separate Bilder pro Set) sauber abgebildet ist.

## Technical Requirements
- **Render-Performance**: Pro Preset (Editor-Render + Adobe-Composite + Upload) < 60s im Schnitt — Adobe-API ist async und braucht 15–30s Verarbeitung pro Call. Bei 4 parallelen Browsern und 4 parallelen Adobe-Jobs: 200 Presets × 2 Mockups × 2 Varianten = 800 Adobe-Calls in ~60 Min. (Sharp wäre schneller gewesen, aber Bildqualität ist hier ausschlaggebend.)
- **Worker-Robustheit**: Worker übersteht Crash eines einzelnen Renders ohne Gesamt-Abbruch. Ein Crash → Failed-Status + nächste Row.
- **Storage-Effizienz**: PNGs werden in Adobe-Default-Kompression gespeichert. Optional JPG-Output für kleineren Footprint (Adobe API unterstützt beides per `outputs.type`).
- **DB-Performance**: Polling-Query (`SELECT FROM presets WHERE render_status = 'pending'`) muss indiziert sein (`CREATE INDEX ON presets (render_status) WHERE render_status IN ('pending', 'rendering')`).
- **Admin-UI-Performance**: Liste mit 200+ Presets paginiert (50 pro Page) oder via virtualisiertem Table.
- **Browser-Support**: Admin-UI funktioniert in aktuellen Chromium/Firefox/Safari. Worker-Headless ist Chromium-only (Playwright-Default).
- **Security**: Admin-Routes via `requireAdmin()`. Storage-Buckets sind public-read, aber write-only via Service-Role-Key (Worker hat Key, Frontend nicht). CSV-Import sanitized alle String-Spalten gegen Injection.
- **Idempotency**: CSV-Re-Upload mit gleichen `name`-Werten ist idempotent (Update statt Insert). Render-Worker-Re-Run für `done`-Rows ist no-op (skipped).
- **Backwards-Compatibility**: Bestehende Presets ohne Render-State-Felder funktionieren weiter (Migration setzt Default-Werte). Galerie und Anlass-Landing-Pages zeigen entweder die neuen `preset_renders` oder den alten `preview_image_url`-Fallback.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Bestehende Bausteine, auf denen wir aufsetzen

Das Projekt hat sehr viele Patterns, die wir hier wiederverwenden — wir bauen kein neues Fundament, sondern eine neue Pipeline auf bestehender Infrastruktur.

| Baustein | Was es schon kann | Wo es lebt |
|---|---|---|
| **`buildPosterCanvas()`** | Render-Engine: nimmt Editor-State, baut HTMLCanvas, gibt PNG zurück. Funktioniert offscreen. Bereits getestet im Browser. | [src/hooks/useMapExport.ts](src/hooks/useMapExport.ts):412–785 |
| **`renderPreview()`** | Gibt das fertige Poster bereits als PNG-DataURL zurück — ist der direkte Aufhänger für `window.__renderPosterPng()`. | [useMapExport.ts](src/hooks/useMapExport.ts):779–785 |
| **`waitForMapStable()`** | Wartet bis MapTiler `load`+`idle`-Events feuern. Ist die Logik, an die wir `window.__posterReady = true` hängen. | [useMapExport.ts](src/hooks/useMapExport.ts):222–230 |
| **`PresetUrlApplier`** | Liest `?preset=<id>` aus URL, lädt via `/api/presets/{id}`, applied via `applyPreset()`. Cross-Type-Redirect schon eingebaut. | [src/components/editor/PresetUrlApplier.tsx](src/components/editor/PresetUrlApplier.tsx) |
| **`createAdminClient()`** | Server-side Supabase-Client mit Service-Role-Key (`SUPABASE_SECRET_KEY`). Worker nutzt diesen direkt. | [src/lib/supabase-admin.ts](src/lib/supabase-admin.ts) |
| **`requireAdmin()`** | Auth-Gate für alle Admin-Routen. Neue Admin-Sub-Pages nutzen denselben Hook. | [src/lib/admin-auth.ts](src/lib/admin-auth.ts) |
| **`AdminPresetsList`** | Bestehende UI mit Multi-Select, Bulk-Aktionen, Filter-Dropdowns. Wir erweitern statt neu bauen. | [src/components/admin/AdminPresetsList.tsx](src/components/admin/AdminPresetsList.tsx) |
| **`AdminPalettesList`** | Vorbild für CRUD-Admin-Sub-Pages (Dialog/AlertDialog-Pattern, Form-Handling). | [src/components/admin/AdminPalettesList.tsx](src/components/admin/AdminPalettesList.tsx) |
| **Storage-Bucket-Pattern** | `preset-previews` als Vorbild: Upload via `admin.storage.from(bucket).upload()`, Public-URL via `getPublicUrl()`. | [src/app/api/admin/presets/upload-preview/route.ts](src/app/api/admin/presets/upload-preview/route.ts) |
| **`MapTiler SDK v3.8.0`** | WebGL-basierter Map-Renderer mit `preserveDrawingBuffer`. Headless via Playwright funktioniert ohne Workarounds. | [package.json](package.json) + [MapPreviewInner.tsx](src/components/editor/MapPreviewInner.tsx) |

**Was wir NEU bauen:** Editor-Headless-Mode-Erweiterung, Worker-Script, Dynamic-Mockups-API-Client (sehr schlank, Sync-Call mit `x-api-key`-Header), neue Admin-Sub-Pages für Mockup-Verwaltung + CSV-Import + Render-Status, neue Tabellen `preset_renders` + `mockup_sets` + `render_workers`, neue Spalten auf `presets` und `palettes`.

**Was wir NEU integrieren (extern):** [Dynamic Mockups](https://dynamicmockups.com) — Self-Serve-API für PSD-Smart-Object-Replacement. Auth: einfacher `x-api-key`-Header. Endpoint: `POST https://app.dynamicmockups.com/api/v1/renders`. Operator lädt PSDs einmalig im Dynamic-Mockups-Dashboard hoch, kopiert die UUIDs ins Admin-UI. API-Response ist synchron (`export_path` zeigt auf das fertige Composite, ~5–15s Wartezeit pro Call).

### B) System-Übersicht (was läuft wo)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Browser (Operator)                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  Admin-UI auf /private/admin/                                       │ │
│  │  ├── /presets        Bulk-Import-CSV, Duplicate, Render-Trigger     │ │
│  │  ├── /mockup-sets    Eintragen von Dynamic-Mockups-UUIDs            │ │
│  │  └── /render-status  Live-Progress, Worker-Heartbeats               │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │ HTTPS
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Next.js App (Vercel oder lokal)                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  /api/admin/presets/*        CRUD + Bulk-Status-Updates             │ │
│  │  /api/admin/mockup-sets/*    CRUD + Test-Render gegen Dynamic Mockups│ │
│  │  /api/admin/csv-import       Pre-Flight + Anlegen                    │ │
│  │  /api/admin/render-status    Live-Status-Polling-Endpoint            │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  /[locale]/map  und  /[locale]/star-map                             │ │
│  │   ├── ?preset=<id>           normaler Editor-Modus                   │ │
│  │   └── ?preset=<id>&headless=1 + X-Render-Token-Header               │ │
│  │       → UI-Chrome aus, exposed window.__renderPosterPng()           │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└────────────────┬──────────────────────────────────┬──────────────────────┘
                 │                                  │
                 │ Read/Write                        │ HTTPS
                 ▼                                  │
┌──────────────────────────────────────┐            │
│  Supabase (PostgreSQL + Storage)     │            │
│  ├── Tabellen                         │            │
│  │   ├── presets (+ render_status)   │            │
│  │   ├── preset_renders (NEU)        │            │
│  │   ├── mockup_sets (NEU)           │            │
│  │   ├── palettes (+ version)        │            │
│  │   └── render_workers (NEU)        │            │
│  └── Storage-Buckets                  │            │
│      ├── preset-previews (bestehend) │            │
│      ├── preset-renders (NEU, Public)│ ◄── Worker lädt fertiges Composite hoch
│      └── preset-renders-temp (NEU)   │ ◄── Worker legt Poster-PNG ab,
│         (privat, mit pre-signed URLs)│     URL geht zu Dynamic Mockups
└──────────────────────────────────────┘            │
                 ▲                                  │
                 │ Read/Write via Service-Role-Key   │
                 │                                  ▼
                 │       ┌──────────────────────────────────────────────────┐
                 │       │  Render-Worker (lokal oder Docker)               │
                 │       │  scripts/render-worker.ts                        │
                 └───────┤  ├── Polling-Loop (5s)                          │
                         │  ├── Atomic-Claim FOR UPDATE SKIP LOCKED        │
                         │  ├── Playwright-Browser-Pool (1-4 parallel)     │
                         │  │     ▼                                         │
                         │  │   Browser → /map?preset=X&headless=1          │
                         │  │     ▼                                         │
                         │  │   window.__renderPosterPng() → PNG-Buffer    │
                         │  ├── Upload Poster-PNG → preset-renders-temp    │
                         │  ├── pre-signed URL für Poster generieren       │
                         │  ├── ┌───────────────────────────────────┐      │
                         │  │   │  Dynamic Mockups API               │      │
                         │  │   │  POST /api/v1/renders (sync ~10s)  │      │
                         │  │   │  Smart-Object-Replace + Render     │      │
                         │  │   └───────────────────────────────────┘      │
                         │  │             │                                 │
                         │  │             ▼                                 │
                         │  │   { export_path: "https://..." }              │
                         │  ├── GET export_path → Image-Buffer              │
                         │  ├── Upload → preset-renders                     │
                         │  └── DB-Update preset_renders + presets         │
                         └──────────────────────────────────────────────────┘
```

**Datenfluss-Kern:** Operator triggert Status-Wechsel `done → pending` in der DB. Worker pollt, claimt Row atomar, rendert via Browser-im-Worker, speichert Bild in Storage, updated DB. Admin-UI pollt Status für Live-Progress.

**Trennung:** Web-App und Worker teilen nur die Datenbank, kein direkter HTTP-Channel zwischen ihnen — bewusst entkoppelt, damit der Worker beliebig oft starten/stoppen kann ohne den App-Server zu beeinflussen.

### C) Datenmodell in Klartext

#### Erweiterungen an `presets` (bestehend)

| Spalte | Typ | Default | Bedeutung |
|---|---|---|---|
| `render_status` | Enum | `pending` | Aktueller Render-Zustand: `pending` \| `rendering` \| `done` \| `failed` \| `stale` |
| `render_error` | Text (nullable) | `null` | Fehler-String beim letzten Render-Versuch |
| `render_started_at` | Timestamp (nullable) | `null` | Wann hat ein Worker mit dem Render begonnen (für Stale-Worker-Cleanup) |
| `render_completed_at` | Timestamp (nullable) | `null` | Wann fertig (oder fehlgeschlagen) |
| `render_worker_id` | Text (nullable) | `null` | UUID des Workers, der gerade rendert |
| `render_inputs_hash` | Text (nullable) | `null` | SHA-256 über `(config_json + mockup_versions + palette_version)` — Stale-Indikator |
| `mockup_set_ids` | UUID-Array | `[]` | Liste der Mockup-Sets, in denen das Preset gerendert wird |

**Indizes:** Partial-Index auf `render_status` (nur für `pending`/`rendering`) — Polling-Query ist Hot-Path.

#### Erweiterungen an `palettes` (bestehend)

| Spalte | Typ | Default | Bedeutung |
|---|---|---|---|
| `version` | Integer | `1` | Wird +1 bei jedem Edit (per Application-Logic in Save-Handler oder DB-Trigger). Geht in `render_inputs_hash` ein. |

**Hinweis:** `palettes` hat heute nur `updated_at`, kein `version`. Wir fügen die Spalte hinzu — Wall-Clock-Compare wäre fragiler (Migrations, Klock-Skew, Restore-Operationen).

#### Neue Tabelle `mockup_sets`

| Spalte | Typ | Bedeutung |
|---|---|---|
| `id` | UUID PK | Interne UUID in unserer DB |
| `slug` | Text, unique | URL-/CSV-freundlicher Identifier (z. B. `wohnzimmer-holz`) |
| `name` | Text | Anzeigename im Admin |
| `description` | Text (nullable) | Optional |
| `desktop_template_uuid` | Text | `mockup_uuid` aus Dynamic Mockups für die Desktop-PSD |
| `desktop_smart_object_uuid` | Text | UUID des Smart Objects im Desktop-Template |
| `mobile_template_uuid` | Text | `mockup_uuid` aus Dynamic Mockups für die Mobile-PSD |
| `mobile_smart_object_uuid` | Text | UUID des Smart Objects im Mobile-Template |
| `desktop_thumbnail_url` | Text | Public-URL eines Vorschau-Bildes (entweder die `export_path`-URL aus dem Test-Render bei Save, oder eine kopierte Variante in unserem Bucket) |
| `mobile_thumbnail_url` | Text | Analog Mobile |
| `is_active` | Boolean | Default `true`. Inaktiv = aus Auswahllisten ausgeblendet, bestehende Renders bleiben |
| `version` | Integer | Default `1`. +1 bei jeder Änderung der UUIDs. Geht in `render_inputs_hash` ein |
| `created_at` / `updated_at` | Timestamp | Standard |

**Indizes:** Unique auf `slug` (für CSV-Lookup), Index auf `is_active`.

**Externes PSD-Hosting:** Die PSD-Dateien selbst liegen **bei Dynamic Mockups**, nicht bei uns. Das vereinfacht das Datenmodell deutlich: keine PSD-Datei-Verwaltung, kein privater Bucket, keine pre-signed-URL-Logik für PSDs. Operator pflegt PSDs einmalig im Dynamic-Mockups-Dashboard und überträgt nur die UUIDs in unser System.

#### Neue Tabelle `preset_renders`

Eine Zeile pro `(preset × mockup_set × variant)`-Kombination — d. h. wenn ein Preset 2 Mockup-Sets in Desktop+Mobile bekommt, sind das 4 Zeilen.

| Spalte | Typ | Bedeutung |
|---|---|---|
| `id` | UUID PK | |
| `preset_id` | UUID FK → `presets.id` ON DELETE CASCADE | |
| `mockup_set_id` | UUID FK → `mockup_sets.id` ON DELETE CASCADE | |
| `variant` | Enum | `desktop` \| `mobile` |
| `image_url` | Text | Public-URL im Storage-Bucket |
| `image_width` | Integer | |
| `image_height` | Integer | |
| `inputs_hash` | Text | SHA-256 zum Zeitpunkt des Renders — verglichen mit aktuellem Hash auf `presets`, um Stale zu erkennen |
| `rendered_at` | Timestamp | |

**Indizes:** Unique auf `(preset_id, mockup_set_id, variant)` — Re-Render macht UPSERT auf der Kombination. Index auf `preset_id` für schnelle Liste pro Preset.

**Cascade-Verhalten:** Beim Löschen eines Presets oder Mockup-Sets werden Zeilen automatisch entfernt. Storage-Files müssen separat per API-Hook gelöscht werden (Trigger ruft Edge-Function oder Worker-Cleanup-Job — siehe Risiken).

#### Neue Tabelle `render_workers`

Sichtbarkeit für Operator: welche Worker laufen gerade?

| Spalte | Typ | Bedeutung |
|---|---|---|
| `id` | UUID PK | Worker-eigene ID, beim Start erzeugt |
| `started_at` | Timestamp | |
| `last_heartbeat_at` | Timestamp | Worker schreibt alle 30s einen Heartbeat |
| `current_preset_id` | UUID (nullable) | Worker zeigt, was er gerade rendert |
| `hostname` | Text | Anzeige im Dashboard |
| `parallel_browsers` | Integer | Konfigurierter Wert |

**Cleanup:** Worker mit `last_heartbeat_at < NOW() - 5 min` werden im Dashboard als "tot" markiert; nach 30 min werden sie automatisch gelöscht (DB-Cron oder Worker-Self-Cleanup beim Start).

#### Schema-Migration ohne SQL-Files

**Wichtige Beobachtung:** Das Repo hat keine `supabase/migrations/*.sql` — Schema wird heute über das Supabase-Dashboard gepflegt. Für PROJ-30 schlagen wir vor:

- **Option A (empfohlen):** Migration via Supabase CLI (`supabase migration new add_render_pipeline`) und ab sofort Migrations im Repo committen. Saubere Versionierung, reproducible Setup. Setup-Aufwand: einmalig 30 Min.
- **Option B:** Weiter Dashboard-pflege, Architektur dokumentiert die Schema-Änderungen in einer Markdown-Datei (`docs/migrations/PROJ-30.md`) als Operator-Anleitung.

Entscheidung **bei Backend-Implementation** (PROJ-30 Backend-Phase) — Tendenz Option A für Long-Term-Sauberkeit, ist aber kein Spec-Blocker.

### D) CSV-Import-Flow

Operator-Sicht in 4 Schritten:

```
Operator wählt CSV-Datei in Admin-UI
              │
              ▼
   Server-side Parser (papaparse mit Streaming)
              │
              ▼
   Pre-Flight-Validierung pro Zeile:
      - Pflichtspalten gesetzt?
      - Palette-Slug existiert?
      - Anlass-Codes valide?
      - Mockup-Set-Slugs existieren?
      - Locales valide?
              │
              ▼
   Validierungs-Report wird angezeigt:
      - X gültige Zeilen, Y Zeilen mit Fehlern (mit Zeilennummer + Begründung)
              │
              ▼
   Operator entscheidet:
      a) Alle gültigen importieren, fehlerhafte überspringen
      b) Abbrechen, CSV reparieren, neu hochladen
              │
              ▼
   Bei Bestätigung: pro gültiger Zeile
      - Geocoding via MapTiler (wenn lat/lng nicht gesetzt)
      - Insert oder Update auf presets-Tabelle (idempotent über `name`)
      - render_status auf `pending` setzen
              │
              ▼
   Erfolgs-Report: "X Presets neu, Y aktualisiert, alle in Render-Queue"
```

**Idempotenz über `name`:** Re-Upload überschreibt bestehende Rows mit gleichem Namen. Erlaubt iteratives Pflegen der CSV-Datei.

**Streaming-Parsing:** CSV wird zeilenweise gelesen, nicht komplett im Speicher gehalten. Erlaubt 1000+ Zeilen ohne Memory-Issues.

**Beispiel-CSV:** Statisch im Repo unter `docs/examples/preset-import-example.csv` mit 5 deutschen Beispiel-Zeilen — Download-Link in der Admin-UI.

### E) Editor-Headless-Modus

Der Editor lernt einen neuen Modus, der vom normalen Editor abzweigt:

```
URL: /[locale]/map?preset=<id>&headless=1
HTTP-Header: X-Render-Token: <env-secret>
              │
              ▼
   Middleware prüft Token:
      Token-Vergleich gegen RENDER_HEADLESS_TOKEN
      Token fehlt oder falsch → 403 Forbidden
              │
              ▼ Token OK
   Page-Komponente erkennt headless=1
      → setzt globales Flag in App-State
              │
              ▼
   Layout rendert nur die PosterCanvas
      (keine Sidebar, keine Toolbar, keine Modals)
              │
              ▼
   PresetUrlApplier lädt Preset aus DB
              │
              ▼
   MapTiler initialisiert + lädt Tiles
      waitForMapStable() wartet auf 'idle'-Event
              │
              ▼
   Fonts geladen (document.fonts.ready)
              │
              ▼
   window.__posterReady = true
   window.__renderPosterPng = (opts) => Promise<Blob>
              │
              ▼
   Worker (Playwright) ruft window.__renderPosterPng({ format: 'A4' })
   bekommt PNG-Blob als Antwort
```

**Schutz vor externen Aufrufen:**

- `?headless=1` ohne `X-Render-Token`-Header oder mit falschem Token → 403.
- Token wird über Env-Variable `RENDER_HEADLESS_TOKEN` (Server-Side, niemals im Client-Bundle) verwaltet.
- Worker konfiguriert denselben Token über seine eigene Env-Variable `RENDER_HEADLESS_TOKEN`.
- Dieselbe App kann gleichzeitig User-Browser bedienen (ohne Token, normaler Modus) und Worker (mit Token, Headless-Modus) — Token ist nur für Headless.

**Pre-Render-CSS-Strategie:** Wir laden die volle App-CSS, weil der Editor-Render exakt so aussehen muss wie ein User-Browser-Render — Konsistenz schlägt Geschwindigkeit. Cold-Start eines Headless-Browsers (~10s) dominiert ohnehin gegenüber CSS-Parse.

### F) Render-Worker-Architektur

Der Worker ist ein eigenständiges Node-Programm. Drei Schichten:

#### F1) Outer-Loop: Job-Acquisition

```
beim Start:
   - Worker generiert eine UUID (worker_id)
   - schreibt Row in render_workers (heartbeat startet)
   - startet Browser-Pool (1-4 Playwright-Chromium-Instanzen)

main loop (alle 5s):
   ┌─ Atomic-Claim:
   │   UPDATE presets SET render_status='rendering',
   │      render_worker_id=<my-id>, render_started_at=NOW()
   │   WHERE id = (SELECT id FROM presets
   │               WHERE render_status='pending'
   │               ORDER BY created_at LIMIT 1
   │               FOR UPDATE SKIP LOCKED)
   │   RETURNING *
   │
   │  → liefert 0 oder 1 Row
   │
   ├─ wenn 0 Rows: 5s schlafen, Heartbeat schreiben, Loop
   │
   └─ wenn 1 Row: an einen freien Browser im Pool weiterreichen
                  → Render-Pipeline startet (siehe F2)
                  → Worker greift sofort die nächste Row
                    (parallele Verarbeitung bis Pool voll)

stale-cleanup (alle 60s):
   - prüft render_status='rendering' UND render_started_at < NOW() - 10 min
   - setzt zurück auf 'pending'
   - räumt die Row für andere Worker auf

graceful shutdown auf SIGTERM:
   - keine neuen Jobs mehr nehmen
   - aktuelle Jobs zu Ende führen
   - Heartbeat-Loop stoppen, Worker-Row entfernen
   - Browser-Pool sauber schließen
```

#### F2) Render-Pipeline (pro Job)

```
Job: preset-Row aus DB
   │
   ▼
1. Browser-Context aus Pool nehmen
   - frischer browser.newContext() pro Job
   - Headless-Token wird als Extra-HTTP-Header gesetzt

2. Page navigiert zu
   ${APP_BASE_URL}/${defaultLocale}/${editorPath}?preset=<id>&headless=1

3. page.waitForFunction("window.__posterReady === true", timeout: 60s)

4. PNG holen:
   const blob = await page.evaluate(() =>
     window.__renderPosterPng({ format: 'A4' })
   )

5. Browser-Context schließen (clean state für nächsten Job)

6. PNG-Buffer hat das nackte Poster — geht weiter ins Compositing (G)

7. Bei jedem Fehler:
   - render_status='failed'
   - render_error = stack
   - Browser-Context trotzdem sauber schließen
   - nächster Job
```

**Browser-Pool-Reuse:** Browser-Instanz wird wiederverwendet, aber jeder Job bekommt einen frischen `context` (entspricht "Inkognito-Tab"). Vorteil: Cold-Start zahlt sich nur 1× pro Worker-Lifetime, kein State-Leak zwischen Jobs.

**Token-Übergabe:** `browser.newContext({ extraHTTPHeaders: { 'X-Render-Token': process.env.RENDER_HEADLESS_TOKEN } })` — alle Requests des Contexts tragen den Token automatisch.

#### F3) Worker-Lifecycle

| Event | Verhalten |
|---|---|
| Worker startet | Schreibt `render_workers`-Row, startet Heartbeat alle 30s |
| Worker fängt Job | `current_preset_id` setzen, Job ausführen |
| Worker beendet Job | `current_preset_id` zurück auf `null` |
| Worker SIGTERM | Aktuelle Jobs zu Ende, dann `render_workers`-Row löschen, Browser zu |
| Worker crasht | `render_workers`-Row bleibt, läuft nach 5 min "tot", nach 30 min Auto-Cleanup |

### G) Mockup-Compositing-Flow (Dynamic Mockups, sync)

Pro Render-Job geht das nackte Poster-PNG durch folgende Schritte — pro Mockup-Set in `preset.mockup_set_ids` einmal komplett, einmal Desktop und einmal Mobile:

```
Input:
   - posterPng (Buffer aus Playwright-Render)
   - mockupSet (mit desktop_template_uuid + desktop_smart_object_uuid,
     mobile_template_uuid + mobile_smart_object_uuid)
   - variant ∈ ('desktop' | 'mobile')
              │
              ▼
1. Poster-PNG zu Supabase Storage hochladen
   Bucket: preset-renders-temp (privat)
   Pfad: <preset_id>/<job-uuid>/poster.png
   → 1h pre-signed GET-URL generieren (für Dynamic Mockups als Asset-URL)

2. POST https://app.dynamicmockups.com/api/v1/renders
   Header: x-api-key: <DYNAMIC_MOCKUPS_API_KEY>,
           Content-Type: application/json,
           Accept: application/json
   Body:
     {
       "mockup_uuid": "<mockup_set.<variant>_template_uuid>",
       "smart_objects": [
         {
           "uuid": "<mockup_set.<variant>_smart_object_uuid>",
           "asset": { "url": "<pre-signed-poster-url>" }
         }
       ]
     }

   → Sync-Response (~5-15s):
     {
       "success": true,
       "data": {
         "export_label": "...",
         "export_path": "https://<dynamic-mockups-cdn>/<file>.png"
       }
     }

   Bei { success: false }: render_status='failed', render_error = response.message

3. GET export_path → Image-Buffer

4. Upload des Buffers nach Supabase Storage:
   Bucket: preset-renders (öffentlich)
   Pfad: <preset_id>/<mockup_set_id>/<variant>.png

5. Public-URL via supabase.storage.from('preset-renders').getPublicUrl(...)

6. UPSERT preset_renders-Row:
   (preset_id, mockup_set_id, variant) →
   image_url, dimensions (aus dem geladenen Buffer), inputs_hash, rendered_at

7. Wenn dies das ERSTE (Mockup × Variant)-Paar des Jobs ist:
   presets.preview_image_url = image_url (Desktop, erstes Mockup)

8. Cleanup: Poster-PNG aus preset-renders-temp entfernen
   (oder per Bucket-TTL nach 24h automatisch)
```

**Dynamic-Mockups-API-Architektur:**

- **Auth: einfacher `x-api-key`-Header**. Kein OAuth, kein Token-Refresh, keine JWT-Generation. Worker hat einen API-Key in der Env-Variable `DYNAMIC_MOCKUPS_API_KEY`.
- **Synchron**: jeder Render-Call blockiert ~5-15s und liefert direkt die `export_path`-URL. Kein Polling, kein Job-Tracking.
- **Asset-URL**: Dynamic Mockups fetcht das Poster-PNG selbst aus der pre-signed Supabase-URL. Wir geben nur die URL in der Anfrage mit.
- **Re-Upload nach Supabase**: Dynamic Mockups hostet das Composite auf deren CDN unter `export_path`. Wir laden es einmalig nach Supabase Storage rüber, damit unsere Marketing-Seiten unter unserer Domäne ausgeliefert werden (DSGVO + CDN-Kontrolle + Cache-Stabilität).

**Aspect-Ratio-Verhalten:** Smart Objects in der PSD definieren das Aspect-Ratio. Dynamic Mockups ersetzt den Smart-Object-Inhalt unter Beibehaltung der Smart-Object-Bounds; Operator löst Aspect-Ratio-Konflikte beim PSD-Design (kein In-App-Konfigurations-Switch nötig).

**Perspektivische Mockups:** funktionieren out-of-the-box, weil Smart Objects in Photoshop transformiert sein können (Skalierung, Rotation, perspektivische Verzerrung). Dynamic Mockups behält die Transform beim Inhalt-Replace bei — das nackte Poster wird automatisch in die schräge Wand-Perspektive gemappt.

### H) Stale-Detection-Logik

`render_inputs_hash` macht aus dem aktuellen "Was geht in diesen Render ein?"-Snapshot einen 64-Zeichen-String:

```
Hash-Eingabe (in dieser Reihenfolge JSON-serialisiert):
   {
     "config_json": <preset.config_json>,
     "palette_version": <palette.version>,         // pro referenzierter Palette
     "mockup_versions": [                           // pro mockup_set in Reihenfolge
        { "id": "<uuid>", "version": <int> },
        ...
     ]
   }
              │
              ▼
   SHA-256 → 64-char hex
```

**Wann wird verglichen?**

- **Beim Render-Start:** Worker berechnet Hash, schreibt ihn in `presets.render_inputs_hash` und in alle `preset_renders`-Zeilen, die er macht.
- **Bei Palette-Save oder Mockup-Set-Save:** Backend-Hook setzt `render_status='stale'` für alle betroffenen Presets, deren Status vorher `done` war.

**Wie identifizieren wir die "betroffenen" Presets?**

- **Palette-Save:** `UPDATE presets SET render_status='stale' WHERE render_status='done' AND config_json @> '{ "paletteId": "<id>" }'` (auf JSONB indizierbar via GIN).
- **Mockup-Set-Save:** `UPDATE presets SET render_status='stale' WHERE render_status='done' AND <id> = ANY(mockup_set_ids)`.

**Initial-Migration:** Bestehende Presets ohne `render_inputs_hash` bekommen direkt `render_status='stale'` — beim ersten Re-Render-Trigger werden sie korrekt verarbeitet.

### I) Admin-UI-Erweiterungen

#### I1) `/private/admin/presets` (bestehend, erweitert)

Neue Elemente in der bestehenden Liste:

- **Status-Banner oben:** "X Presets veraltet (stale) — [Bulk-Re-Render]". Sichtbar nur, wenn ≥1 stale-Row existiert.
- **Status-Spalte/Badge:** pro Zeile farbiger Badge (grün/gelb/blau-pulse/rot/orange für done/pending/rendering/failed/stale).
- **Per-Zeile-Aktionen:** "Render jetzt" (`done` → `pending`), "Bilder anzeigen" (Lightbox), "Duplizieren".
- **Bulk-Aktionen:** "Stale-Presets re-rendern", "Ausgewählte in Render-Queue".
- **Live-Polling:** alle 3s Status-Abfrage, solange ≥1 Row in `pending`/`rendering`. Bei allen `done` → Polling stoppt.
- **Progress-Bar oben rechts:** "47/200 gerendert" wenn aktiv.
- **Filter-Dropdown "Status":** Auswahl pending/rendering/done/failed/stale.

#### I2) `/private/admin/presets/import` (neu, als Tab oder Sub-Page)

- Dateiauswahl-Feld + "CSV-Beispiel herunterladen"-Link
- Pre-Flight-Tabelle: pro Zeile Status (✓/✗) + Begründung
- Bestätigungs-Button: "Importieren" oder "Abbrechen"
- Erfolgs-Meldung mit Counts und Link zur Liste

#### I3) `/private/admin/mockup-sets` (neu)

- **Listenansicht:** Karten-Grid mit Desktop-Thumbnail, Name, Anzahl referenzierender Presets, Aktiv-Toggle, Edit-Button.
- **Editor-Form (Dialog):**
  - Name, Beschreibung, Slug (auto aus Name, editierbar)
  - **Hinweistext oben**: "PSDs werden im [Dynamic-Mockups-Dashboard](https://app.dynamicmockups.com) verwaltet. Lade die PSD dort hoch (Adobe Photoshop → Custom Mockups), öffne das Template und kopiere die UUIDs aus dem 'Use API'-Snippet."
  - **Desktop-Template-UUID** (Pflicht, Text-Input, UUID-Format-Validierung)
  - **Desktop-Smart-Object-UUID** (Pflicht, Text-Input, UUID-Format-Validierung)
  - **Mobile-Template-UUID** (Pflicht)
  - **Mobile-Smart-Object-UUID** (Pflicht)
  - Beim Save passiert serverseitig:
    1. UUID-Format-Validierung (RFC 4122).
    2. **Test-Render-Aufruf** an Dynamic Mockups mit einem statischen Platzhalter-Poster (z. B. `/public/mockup-test-poster.png`) — einmal pro Variante (Desktop + Mobile). Verbraucht 2 Credits.
    3. Wenn beide Renders Erfolg haben: `export_path`-URLs werden direkt als `desktop_thumbnail_url` / `mobile_thumbnail_url` gespeichert (Dynamic Mockups CDN dient als Thumbnail-Hosting für Admin-UI — keine Notwendigkeit, sie nach Supabase zu kopieren).
    4. Wenn ein Render fehlschlägt: Save wird abgelehnt, UI zeigt die Adobe-Mockups-API-Fehlermeldung an (z. B. "Smart Object UUID not found in template").
    5. `version` wird +1 (Stale-Detection für referenzierende Presets triggert).
  - Im UI wird nach Save das Thumbnail-Preview prominent angezeigt — Operator sieht direkt, ob die UUIDs korrekt waren.

#### I4) `/private/admin/render-status` (neu)

- **Aktive Worker:** Karten-Grid, pro Worker: ID, Hostname, parallel_browsers, last_heartbeat (live-Indikator grün/gelb/rot), aktuell rendernde preset_id (mit Link zur Preset-Edit-Page).
- **Letzte 50 Render-Events:** Tabelle mit Timestamp, Preset-Name, Worker-ID, Status (done/failed), Duration. Failed-Rows haben "Erneut versuchen"-Button, der sie auf `pending` setzt.
- **Failed-Presets-Sektion:** alle aktuell auf `failed` stehenden Presets, mit voller Fehlermeldung.

### J) Storage & Buckets

| Bucket | Zugriff | Inhalt | Pfad-Schema |
|---|---|---|---|
| `preset-renders` (NEU) | Public-Read, Admin-Write | Composited Final-Bilder (vom Worker hochgeladen, nachdem er sie von Dynamic Mockups gefetcht hat) | `<preset-id>/<mockup-set-id>/<variant>.png` |
| `preset-renders-temp` (NEU) | Privat, pre-signed GET für Dynamic Mockups (1h-TTL) | Temporäre nackte Poster-PNGs während eines Render-Jobs | `<preset-id>/<job-uuid>/poster.png` |
| `preset-previews` (bestehend) | Public-Read, Admin-Write | Bestehender preview_image_url-Pfad | bleibt unverändert |

**Trennung Public vs. Privat:**

- **Privat** (`preset-renders-temp`): keine Public-URLs, nur via Service-Role-Key oder pre-signed URL erreichbar. Temporäre Poster-PNGs sind interne Assets. Dynamic Mockups bekommt eine zeitlich begrenzte pre-signed URL.
- **Public** (`preset-renders`): direkt verlinkbar auf Marketing-Seiten und im Admin-UI.
- **Mockup-Thumbnails** und **PSDs** liegen extern bei Dynamic Mockups (kein eigener Bucket nötig).

**Bucket-TTL für `preset-renders-temp`:** Supabase Storage Lifecycle-Rule (sofern verfügbar) auf 24h gesetzt — falls nicht verfügbar, ein Cleanup-Subcommand des Workers kümmert sich.

**Cleanup beim Delete:** DB-Cascade löscht nur DB-Zeilen, nicht Storage-Files. Lösung:

- API-Route, die Preset/Mockup löscht, ruft vor dem DB-Delete auch `storage.from('preset-renders').remove([paths])` auf.
- Falls vergessen oder Fehler: ein wöchentlicher Cleanup-Job (Worker-Subcommand `npm run render-worker -- --cleanup-orphans`) findet Storage-Files ohne DB-Referenz und löscht sie.

### K) Cloud-Ready-Setup (Dockerfile)

Worker bekommt von Anfang an einen Container — dieselbe Code-Basis läuft lokal (`npm run render-worker`) wie in einem Container (`docker run`).

```
Dockerfile.worker (root des Repos)
├── FROM mcr.microsoft.com/playwright:v1.x-jammy
│   (Playwright + Chromium + Dependencies vorinstalliert)
├── WORKDIR /app
├── COPY package.json package-lock.json
├── RUN npm ci --omit=dev (oder mit Build-Schritt für TypeScript)
├── COPY scripts/ src/lib/ ...
├── ENV NODE_ENV=production
└── CMD ["node", "dist/scripts/render-worker.js"]
```

**Konfiguration ausschließlich über Env-Vars:**

| Env-Variable | Pflicht | Default |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | — |
| `SUPABASE_SECRET_KEY` | ✓ | — |
| `APP_BASE_URL` | ✓ | — |
| `RENDER_HEADLESS_TOKEN` | ✓ | — |
| `RENDER_PARALLEL_BROWSERS` | ✗ | 1 |
| `RENDER_BROWSER_TIMEOUT_MS` | ✗ | 60000 |
| `RENDER_WORKER_ID` | ✗ | uuid() |
| `RENDER_POLL_INTERVAL_MS` | ✗ | 5000 |

`docker-compose.yml`-Beispiel für lokale Entwicklung (App + Worker zusammen) liegt im Repo-Root.

### L) Phasen-Reihenfolge (Bauplan)

```
Phase 1: Schema-Migration + Dynamic-Mockups-Setup (Backend)
   +-- Dynamic-Mockups-Account angelegt, API-Key in .env.local
   +-- Mind. 1 Test-PSD im Dynamic-Mockups-Dashboard hochgeladen
       (UUIDs notiert für späteres Smoke-Testing)
   +-- Env-Vars (DYNAMIC_MOCKUPS_*) eingetragen
   +-- presets: render_*-Spalten + mockup_set_ids
   +-- palettes: version-Spalte + Trigger oder Save-Hook
   +-- neue Tabellen: mockup_sets, preset_renders, render_workers
   +-- Storage-Buckets: preset-renders (public), preset-renders-temp (privat)
   +-- Indizes (partial auf render_status, GIN auf occasions/locales/mockup_set_ids)
            |
            v
Phase 2: Editor-Headless-Modus (Frontend)
   +-- Middleware-Check fuer X-Render-Token bei ?headless=1
   +-- Headless-Layout (UI-Chrome ausblenden)
   +-- waitForMapStable + Fonts.ready -> window.__posterReady
   +-- window.__renderPosterPng() expose
   +-- manueller Test mit Playwright-Skript "render eins zu PNG"
            |
            v
Phase 3: Dynamic-Mockups-API-Client (Backend-Library)
   +-- src/lib/dynamic-mockups-client.ts (renderMockup(), validateUuids())
   +-- pre-signed-URL-Helpers für Supabase Storage
   +-- Probe-Test mit Test-Template-UUID + Demo-Poster-PNG
            |
            v
Phase 4: Worker-Script + Browser-Pool (Backend)
   +-- scripts/render-worker.ts mit Polling, Atomic-Claim
   +-- Browser-Pool mit Context-Reuse-Pattern
   +-- Dynamic-Mockups-API-Aufruf-Layer (nutzt Phase-3-Client)
   +-- Storage-Upload (Poster-Temp) + GET export_path + Re-Upload preset-renders
   +-- DB-Update preset_renders + presets
   +-- Stale-Worker-Cleanup-Loop
   +-- Heartbeat in render_workers
   +-- Dockerfile + docker-compose-Snippet
            |
            v
Phase 5: Admin-UI Mockup-Sets (Frontend + Backend)
   +-- /private/admin/mockup-sets Liste + CRUD
   +-- Form mit UUID-Eingabefeldern für Desktop+Mobile (Template + Smart Object)
   +-- Validierung via Test-Render gegen Dynamic Mockups beim Save
   +-- export_path aus Test-Render als Thumbnail-URL speichern
   +-- API-Routen /api/admin/mockup-sets/*
   +-- mindestens ein Mockup-Set seeden (mit Test-PSD-UUIDs aus Phase 1)
            |
            v
Phase 6: Admin-UI Preset-Erweiterung (Frontend + Backend)
   +-- AdminPresetsList: Status-Badges, Render-Buttons, Bulk-Aktionen, Live-Polling
   +-- /api/admin/presets/render-status (Polling-Endpoint)
   +-- Duplicate-Button + API
   +-- Stale-Banner + Bulk-Stale-Re-Render
            |
            v
Phase 7: CSV-Import (Frontend + Backend)
   +-- /private/admin/presets/import Page
   +-- API /api/admin/csv-import (Pre-Flight + Anlegen)
   +-- Streaming-CSV-Parser (papaparse)
   +-- Geocoding-Stage mit MapTiler
   +-- Beispiel-CSV im Repo + Download-Link
            |
            v
Phase 8: Render-Status-Dashboard
   +-- /private/admin/render-status Page
   +-- Worker-Heartbeat-Anzeige
   +-- Failed-Liste + Retry-Button
            |
            v
Phase 9: Smoke-Test + Operator-Doku
   +-- End-to-End-Test: 5 Presets via CSV importieren, rendern, Bilder validieren
   +-- README oder docs/ mit Operator-Anleitung (inkl. Dynamic-Mockups-Workflow:
       PSD hochladen → UUIDs kopieren → Mockup-Set anlegen)
   +-- Rollout-Plan: Phase-1 für DE, dann iterativ
```

**Reihenfolge-Hinweis:** Phase 2 (Editor-Headless) ist Voraussetzung für Phase 3 (Worker), aber Phase 4 (Mockup-UI) und Phase 6 (CSV-Import) sind unabhängig und können parallel laufen. Phase 5 baut auf Phase 3+4 auf. Phase 7 ist optional Quality-of-Life und kann später kommen.

### M) Tech-Entscheidungen mit Begründung

| Entscheidung | Begründung |
|---|---|
| **Playwright + Headless-Editor statt eigene Render-API** | Wiederverwendung des bestehenden Editor-Codes — `buildPosterCanvas()` ist 1500+ Zeilen mit Mask-Compositing, Text-Drawing, Style-Handling. Re-Implementation in Node wäre hochriskant; Playwright trifft denselben Code-Pfad wie ein User-Browser. |
| **Browser-Pool mit Context-Reuse** | Cold-Start eines Chromium kostet ~10s pro Job. Pool spart 90 % der Zeit bei 200 Jobs. Frische Contexts pro Job verhindern State-Leak. |
| **Job-Row-Pattern in Postgres statt externe Queue** | Bei 200 Jobs/Lauf braucht es keinen Inngest/BullMQ — `FOR UPDATE SKIP LOCKED` ist Standard-Postgres und atomar. Eine Dependency weniger. |
| **`X-Render-Token`-Header statt Production-Block** | Token-Lösung erlaubt Production-Renders (z. B. wenn Worker später in Cloud läuft und gegen Production-App rendert) ohne Staging-Duplikat aufzubauen. Token + ENV reicht; Defense-in-Depth ist Overkill für ein internes Tool. |
| **Dynamic Mockups als Compositor (Self-Serve, Sync-API)** | Smart Objects bewahren PSD-Effekte beim Replace. Self-Serve, einfache `x-api-key`-Auth, ~$0.02/Render. Adobe Photoshop API wäre qualitativ vergleichbar, ist aber Enterprise-only — für Indie nicht realistisch. Sharp könnte keine perspektivischen Mockups. |
| **PSDs gehostet bei Dynamic Mockups, nicht Supabase** | Datenmodell-Vereinfachung: kein PSD-Bucket, keine pre-signed URLs für PSDs, kein Datei-Handling auf unserer Seite. Wir speichern nur die UUIDs. |
| **Sync-API + Re-Upload nach Supabase** | Dynamic Mockups antwortet sync mit `export_path`-URL (eigenes CDN). Wir laden das Bild einmalig nach Supabase, damit unsere Marketing-Seiten unter unserer Domäne ausliefern (Cache-Stabilität, DSGVO-Kontrolle, kein Vendor-Hosting im Frontend-Pfad). |
| **`x-api-key`-Header-Auth** | Kein OAuth-Flow nötig. Worker bekommt nur eine Env-Variable. Simpel und robust. |
| **UUID-basierte Smart-Object-Adressierung** statt Layer-Name | Dynamic Mockups vergibt UUIDs für Smart Objects; robust gegen Umbenennen in Photoshop. Operator kopiert UUIDs aus dem "Use API"-Snippet ins Admin-UI. |
| **Test-Render beim Mockup-Save** | Statt UUIDs blind zu akzeptieren, validieren wir mit einem echten Render-Call gegen Dynamic Mockups. Schlägt Save fehl → Operator sieht die API-Fehlermeldung sofort, statt erst beim ersten echten Render. Verbraucht 2 Credits pro Mockup-Save (akzeptiert, Mockup-Saves sind selten). |
| **`mockup_sets` als eigene Tabelle, nicht JSONB auf Preset** | Re-Use über viele Presets hinweg. Stale-Detection per `version`-Spalte sauber pro Set. UUIDs zentral pflegbar. |
| **`preset_renders` als eigene Tabelle, nicht JSONB-Map auf Preset** | UPSERT pro `(preset × mockup × variant)` mit Unique-Constraint. Cascade-Delete erlaubt sauberes Aufräumen. Filter-Queries (z. B. "alle Renders mit altem Hash") via Standard-SQL. |
| **`palette.version`-Integer hinzufügen** | Wall-Clock-Compare via `updated_at` ist fragil bei Restore-Operationen oder Klock-Skew. Integer-Bump pro Edit ist deterministisch. |
| **SHA-256 als Hash-Algorithmus** | Standard-Bibliothek (Node `crypto`), kollisionssicher genug, schnell. MD5 wäre auch ok, SHA-256 ist Default-Wahl. |
| **Manueller Re-Render bei Stale, kein Auto-Re-Queue** | Operator-Kontrolle über Worker-Last. Bei großen Palette-Updates könnten 200+ Re-Renders auf einmal getriggert werden — Operator entscheidet, wann das laufen soll. |
| **Failed-Renders nicht auto-retried** | Retry bei Daten-Fehlern (z. B. unbekannte Maske) führt zu Endlos-Schleifen. Operator muss manuell `pending` setzen. Transient-Fehler wären V2-Topic. |
| **CSV-Import mit Idempotenz auf `name`** | Operator kann CSV iterativ pflegen und mehrfach hochladen. Klarer Identifier ohne extra Schlüsselspalte. |
| **Streaming-CSV-Parser (papaparse)** | 1000+ Zeilen ohne Memory-Issues. Bibliothek ist Standard. |
| **Storage-Pfad-Schema `<preset>/<mockup>/<variant>.png`** | Lesbar, kollisionsfrei, einfaches Cascade-Cleanup über Pfad-Prefix. |
| **`AdminPresetsList` erweitern statt neu bauen** | Bestehende Filter, Bulk-Aktionen, Multi-Select sind 80 % der UI. Wir fügen Status-Badges, Render-Buttons und Live-Polling hinzu. |
| **Token-Schutz, kein Production-Block** | Ein Code-Pfad für Dev/Staging/Production; Token-Konfig ist Standard-Pattern. |
| **Schema-Migration via Supabase CLI ab PROJ-30** | Ab jetzt versionierte Migrations. Long-Term-Wartbarkeit, reproducible Setup. |
| **Worker-Heartbeat in eigener Tabelle `render_workers`** | Gibt Operator Sichtbarkeit über aktive Worker. Kein Dependency-Bedarf, einfache CRUD-Logik. |

### N) Neue Dateien / berührte Dateien (Übersicht)

```
src/
+-- app/
|   +-- [locale]/
|   |   +-- map/page.tsx                  ergänzt: ?headless=1-Detection
|   |   +-- star-map/page.tsx             ergänzt: ?headless=1-Detection
|   +-- private/admin/
|   |   +-- mockup-sets/page.tsx          NEU: Liste
|   |   +-- mockup-sets/[id]/page.tsx     NEU: Edit-Form
|   |   +-- presets/import/page.tsx       NEU: CSV-Import-UI
|   |   +-- render-status/page.tsx        NEU: Worker-Dashboard
|   +-- api/admin/
|       +-- mockup-sets/route.ts            NEU: List + Create (Test-Render bei Save)
|       +-- mockup-sets/[id]/route.ts       NEU: Get + Update + Delete
|       +-- presets/[id]/render/route.ts    NEU: Trigger-Render-Endpoint
|       +-- presets/bulk-render/route.ts    NEU: Bulk-Trigger
|       +-- presets/[id]/duplicate/route.ts NEU: Duplicate
|       +-- presets/csv-import/route.ts     NEU: CSV-Import + Pre-Flight
|       +-- render-status/route.ts          NEU: Polling-Endpoint
|
+-- components/
|   +-- editor/
|   |   +-- HeadlessLayoutGuard.tsx       NEU: ?headless=1-Erkennung + UI-Hide
|   +-- admin/
|       +-- AdminPresetsList.tsx          ergänzt: Status-Badges, Render-Aktionen
|       +-- AdminMockupSetsList.tsx       NEU
|       +-- MockupSetEditor.tsx           NEU: Form mit UUID-Eingabefeldern (Desktop+Mobile)
|       +-- CsvImportForm.tsx             NEU: Upload + Pre-Flight-Tabelle
|       +-- RenderStatusDashboard.tsx     NEU
|       +-- StaleBanner.tsx               NEU: "X Presets veraltet"
|
+-- hooks/
|   +-- useMapExport.ts                   ergänzt: window.__renderPosterPng-Expose
|   +-- useRenderStatus.ts                NEU: Polling-Hook
|
+-- lib/
|   +-- render-headless-token.ts          NEU: Token-Validation-Middleware-Helper
|   +-- render-inputs-hash.ts             NEU: SHA-256-Hash-Berechnung
|   +-- dynamic-mockups-client.ts         NEU: API-Wrapper (renderMockup, validateUuids)
|   +-- supabase-presigned-urls.ts        NEU: pre-signed GET-URL-Helper für Poster-PNG (Asset für Dynamic Mockups)
|   +-- csv-parser.ts                     NEU: Streaming-CSV mit Validierung
|
+-- middleware.ts                          ergänzt: X-Render-Token-Check bei ?headless=1
|
scripts/
+-- render-worker.ts                       NEU: Hauptscript
+-- render-worker-cleanup-orphans.ts       NEU: Storage-Cleanup-Subcommand
|
docker/
+-- Dockerfile.worker                      NEU
+-- docker-compose.yml                     NEU (oder Update bestehender)
|
docs/
+-- examples/
|   +-- preset-import-example.csv          NEU
+-- migrations/
|   +-- PROJ-30-render-pipeline.md         NEU: Schema-Migration-Anleitung
+-- operator/
|   +-- preset-render-pipeline.md          NEU: Operator-Anleitung

package.json                               ergänzt: Dependencies (siehe O)
```

### O) Abhängige Packages

**Neue Dependencies:**

| Package | Zweck |
|---|---|
| `playwright` | Headless-Browser-Automatisierung im Worker |
| `papaparse` | CSV-Streaming-Parser für Bulk-Import |

**Eingebaute Node-APIs:**

- `fetch` (Node 18+) — HTTP-Client für Dynamic-Mockups-Calls; keine Extra-Library nötig.
- `crypto` — SHA-256-Hash für Stale-Detection.

**Externe Service-Dependencies (kein Package, aber Setup):**

- **Dynamic Mockups Account** ([dynamicmockups.com](https://dynamicmockups.com)) — API-Key in `.env.local` als `DYNAMIC_MOCKUPS_API_KEY`
- **Mind. 1 PSD im Dynamic-Mockups-Dashboard hochgeladen**, UUIDs in Mockup-Set-Konfiguration eingetragen

**Bereits installiert (wiederverwendet):**

- `@supabase/supabase-js` — Worker, Server-Routes, pre-signed URLs
- `@maptiler/sdk` — Editor und Render-Pipeline
- shadcn/ui-Komponenten — Admin-UI

**Entwicklung-only:**

- `@playwright/test` (optional) — falls Worker-Tests implementiert werden

**NICHT verwendet (bewusst nicht eingeführt):**

- `sharp` — Dynamic Mockups übernimmt das Compositing. V2-Fallback wäre eine separate Entscheidung.
- `jsonwebtoken` — kein OAuth, einfacher API-Key reicht.
- `cropperjs` / `react-cropper` — kein In-App-Mockup-Editor mehr (PSD-Smart-Object definiert Position).

### P) Risiken & offene Punkte

- **Playwright-Cold-Start im Container ist langsam (~15s).** Browser-Pool-Reuse mildert das. Wenn der Container nach jedem Job neu startet (z. B. Serverless), ist das Problem hart — daher der dedizierte Worker-Container, der lange läuft.
- **MapTiler-API-Limits bei Bulk-Render.** 200 Renders × ~30 Tile-Requests pro Render = 6000 Requests in 30 Min. MapTiler-Free-Tier hat 100k/Monat — reicht, aber Operator muss auf Quota achten. Mitigation: Worker-Throttle-Konfiguration.
- **Schema-Migrations-Pflege.** Da bisher keine SQL-Migrations im Repo sind, ist die Entscheidung "Supabase CLI vs. Dashboard" ein erst-jetzt-zu-machender Schritt. Architektur empfiehlt CLI, Backend-Phase entscheidet final.
- **Storage-Cleanup-Race-Conditions.** Wenn ein Render-Job läuft, während Operator das Preset löscht, könnte ein Storage-Upload nach dem DB-Delete passieren → Orphan-File. Mitigation: Cleanup-Subcommand findet sie, löscht sie. Akzeptiert.
- **Dynamic-Mockups-Quota.** Free-Tier 50 Renders, Pro-Plan ab ~$19/mo. 800 Bilder pro Vollrender × ~$0.02 ≈ $16/Lauf. Wenn der Plan-Inkludiert-Kontingent überschritten wird, fallen Pay-as-you-go-Kosten an. Mitigation: Worker erkennt 402/Quota-Errors und stoppt sauber; Operator-Dashboard zeigt aktuelle Credits.
- **Dynamic-Mockups-Latenz.** Pro Render-Call ~5–15s Sync-Wait. Bei 4 parallelen Workern: 800 Bilder in ~30–60 Min. Akzeptiert für Bulk-Tool.
- **Dynamic-Mockups-Vendor-Lock-in.** Wenn der Service ausfällt oder Preise drastisch erhöht, ist die Pipeline blockiert. Mitigation: PSDs sind im Original beim Operator (lokale Kopien), Migration zu einem anderen Service oder sharp-Fallback wäre Tagesarbeit (Compositor-Schicht ist isoliert in `dynamic-mockups-client.ts`).
- **Dynamic-Mockups-Smart-Object-Erkennung.** Komplexe PSDs (verschachtelte Smart Objects, Adjustment Layers) werden eventuell nicht sauber unterstützt. Mitigation: Test-Render beim Mockup-Save validiert die UUIDs sofort; Fehler werden vor Production sichtbar.
- **API-Key-Leak.** Wenn der API-Key in Logs oder versehentlich im Repo landet, könnte er von Dritten genutzt werden (auf deine Kosten). Mitigation: Key niemals in Logs; bei Verdacht im Dynamic-Mockups-Dashboard "Regenerate" klicken (Self-Service rotation).
- **Pre-signed URL-Expiry.** Wenn ein Render aus irgendeinem Grund länger dauert als die 1h-URL-Gültigkeit, schlägt der Asset-Fetch fehl. Bei Sync-API mit 5-15s ist das praktisch unmöglich; Mitigation nur theoretisch.
- **Privacy.** Poster-PNGs werden temporär an Dynamic Mockups gesendet (via pre-signed URL). Da es nur Marketing-Mockups sind (keine User-Daten), unkritisch. Falls später User-Photo-Integration (PROJ-19) durch die Pipeline läuft, müsste das geprüft werden.
- **Worker-Crash mid-job.** Cleanup-Loop räumt nach 10 Minuten auf — ein Job kann also 10 Min "gefangen" sein. Akzeptabel für ein Bulk-Tool. Falls Operator es schneller braucht, manueller Status-Reset auf `pending`.
- **Headless-Token-Leak.** Wenn der Token in Logs landet (z. B. in Playwright-Debug-Logs), könnte er extrahiert werden. Mitigation: Token-Header niemals in Logs ausgeben; bei Verdacht Token rotieren (einfach Env-Var ändern, App + Worker neu starten).
- **Preset-Photo-Integration (PROJ-19).** Falls ein Preset ein User-Photo referenziert, das nicht mehr existiert → Render schlägt fehl. Ist im Spec als Edge-Case aufgenommen, im Worker als `failed`-Behandlung.
- **`mockup_sets`-Versionierung beim Bild-Replacement.** Wenn Operator nur das Mobile-Bild austauscht, wird `version` +1, aber das alte Rect könnte noch passen. Dadurch werden alle Presets stale, die das Set referenzieren — was korrekt ist, aber Re-Render-Last erzeugt. Akzeptiert; falls problematisch, kann V2 die Versionierung pro Variante feiner machen.
- **Konkurrenz zwischen App-Save und Worker-Render.** Wenn Operator ein Preset im Editor speichert, während Worker es gerade rendert, kann das alte `config_json` rendern. Mitigation: Worker liest `config_json` zu Job-Start, Save-Hook setzt `render_status='pending'` → Worker erkennt, dass Race passierte (Status nicht mehr `rendering` für seinen `worker_id`), verwirft Output. Edge-Case selten, aber sauber.


## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

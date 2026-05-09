# PROJ-39: Multi-Format Preset-Renders + Inspiration Format-Switcher

## Status: Planned
**Created:** 2026-05-09
**Last Updated:** 2026-05-09

## Dependencies
- **Requires PROJ-30** (Preset-Render-Pipeline) — erweitert den Headless-Worker, dass er pro Preset über drei Formate iteriert. Stale-Detection-Hash + Re-Render-Trigger werden um eine Format-Dimension erweitert.
- **Requires PROJ-37** (Format-gekoppelter Editor-Viewport) — der Editor unterstützt bereits A4/A3/A2 als Logical-Canvas. Die Render-Pipeline öffnet den Editor mit `?preset=<id>&format=<a4|a3|a2>` und nutzt diese Logical-Canvas-Dimensionen, sodass das gerenderte Bild dem entspricht, was der Customer im Editor sieht.
- **Requires PROJ-29** (Anlass-Landing-Pages) — `OccasionPresetGrid` und die Hero-Card müssen das Format-Switching aufnehmen können.
- **Requires PROJ-11** (Homepage / Galerie / Inspiration-Tab) — die Galerie-Listen-Komponenten (`GallerySection`, `GalleryPresetCard`, `PresetCarousel`) müssen das Format-Switching unterstützen.
- **Berührt PROJ-8** (Design-Presets) — `presets`-Datenmodell bekommt Spalten für die drei Format-Render-URLs und drei Format-Render-Statūs.

## Problem & Ziel
Aktuell zeigt jede Preset-Karte (Inspiration-Tab, Galerie, Anlass-Landing-Pages) genau **ein Vorschau-Bild** — gerendert in A4 Hochkant. Mit PROJ-37 weiß der Editor aber, dass A3 und A2 nicht einfach nur größer sind, sondern **mehr Karte zeigen** (größerer Logical Canvas → mehr Geografie bei gleichem Zoom). Wer ein Preset im Customer-Browser sieht, bekommt also einen falschen Eindruck, sobald sie ein größeres Format kaufen wollen.

PROJ-39 schließt die Lücke:
- **Pipeline rendert pro Preset alle drei Hochkant-Formate** (A4, A3, A2). Querformat folgt später als separates Feature, weil es eigene Layout-Anpassungen braucht (Text-Position, Map-Zoom-Anpassung).
- **Inspiration-Karten zeigen einen Format-Switcher** — Customer sieht im Default A3 (mittleres Format mit mehr Karte als A4, aber nicht so dominant wie A2) und kann pro Karte zwischen A4/A3/A2 wechseln. Das gewählte Format wird in den Editor mitgenommen, damit die Customer-Erwartung 1:1 erfüllt wird.
- **Bestehende Presets werden nachgerendert** — beim Deploy läuft ein Bulk-Job, der jedes existierende Preset um die fehlenden Format-Renders ergänzt.

Resultat: Customer sieht im Inspiration-Tab exakt was er kauft, egal welches Format. Operator muss keine manuellen Render-Runden mehr fahren.

## User Stories
- Als Customer möchte ich auf der Inspiration-/Galerie-Seite pro Preset-Karte zwischen A4, A3 und A2 wechseln können, sodass ich vor dem Kauf sehe, wie meine Wunsch-Größe aussieht (A2 zeigt z. B. mehr Stadt-Geografie als A4).
- Als Customer möchte ich, dass beim Klick auf eine Preset-Karte der Editor direkt im gewählten Format öffnet — wenn ich A3 in der Vorschau gewählt habe, soll der Editor in A3 starten, nicht in A4.
- Als Customer auf Mobile möchte ich nicht von drei Format-Pills auf jeder Grid-Karte erschlagen werden — der Switcher soll erst im Detail-Modal/Vorschau auftauchen, damit der Grid sauber bleibt.
- Als Operator möchte ich, dass der Render-Worker pro Preset über alle drei Hochkant-Formate iteriert, damit ich beim Bulk-Render nicht dreimal eine Job-Liste durchschicken muss.
- Als Operator möchte ich pro Preset und Format einen separaten **Re-Render-Button** im Admin sehen, sodass ich gezielt nur A2 neu rendern kann, wenn nur dort ein Bug ist — ohne A4 und A3 nochmal anzustoßen.
- Als Operator möchte ich nach dem Deploy einen einmaligen **Backfill-Job** triggern, der alle bestehenden A4-only-Presets um A3- und A2-Renders ergänzt, sodass die Inspiration-Karten direkt komplett sind.
- Als Operator möchte ich, dass Presets, bei denen ein Format-Render fehlschlägt, im Customer-View **nur die erfolgreichen Format-Buttons zeigen** — kaputte Formate werden komplett ausgeblendet, damit der Customer keinen falschen Eindruck oder kaputten Switcher sieht.
- Als Operator möchte ich auf der Admin-Preset-Übersicht pro Preset sehen, welche der drei Formate gerendert sind und welche nicht — damit Status auf einen Blick erkennbar ist.

## Acceptance Criteria

### Datenmodell-Erweiterungen (Supabase)
- [ ] `presets`-Tabelle bekommt **drei** Render-Status-Spalten:
  - `render_status_a4`, `render_status_a3`, `render_status_a2` (Enum: `pending` | `rendering` | `done` | `failed` | `stale`, Default: `pending`)
- [ ] `presets`-Tabelle bekommt **drei** Render-URL-Spalten:
  - `preview_image_url_a4`, `preview_image_url_a3`, `preview_image_url_a2` (Text, nullable)
- [ ] Bestehende Spalten `preview_image_url`, `render_status`, `render_error` etc. bleiben **temporär parallel bestehen** (Compat-Modus während Migration). Eine spätere Cleanup-Migration räumt die obsoleten Spalten weg, sobald alle Konsumenten umgestellt sind.
- [ ] `render_inputs_hash` wird in drei Format-Hashes erweitert (`render_inputs_hash_a4`, `_a3`, `_a2`) — Stale-Detection vergleicht pro Format.
- [ ] DB-Migration ist idempotent (`IF NOT EXISTS`), kann ohne Datenverlust angewendet werden.

### Render-Pipeline (Worker)
- [ ] Worker iteriert pro Preset über die Formate `a4`, `a3`, `a2` (in dieser Reihenfolge).
- [ ] Worker öffnet den Editor mit `/{locale}/map?preset=<id>&format=<a4|a3|a2>` (bzw. analog `/star-map`, `/photo`) und ruft `window.__renderPosterPng()` mit dem Format auf.
- [ ] Render-Outputs werden in den existierenden `preset-previews` Bucket geschrieben, mit Format-Suffix im Pfad: `<preset-id>-a4.jpg`, `-a3.jpg`, `-a2.jpg`.
- [ ] Pro Format wird `render_status_<format>` separat aktualisiert (`rendering` während Lauf, `done` bei Erfolg, `failed` bei Fehler — mit `render_error` separat pro Format).
- [ ] Wenn ein Format-Render fehlschlägt, läuft die Schleife weiter: die anderen beiden Formate werden trotzdem versucht.
- [ ] `render_inputs_hash_<format>` wird pro Format aus `(config_json, mockup_set_ids, palette_version, format)` berechnet — weil das Format selbst Bestandteil des Inputs ist.

### Admin-UI
- [ ] In `/private/admin/presets` Übersicht: pro Preset-Zeile gibt's drei Format-Status-Badges (A4, A3, A2) mit Farbcode (grün=done, gelb=pending/rendering, rot=failed).
- [ ] In der Preset-Detail-Ansicht: drei separate **„Re-Render A4 / A3 / A2"-Buttons** statt einem einzigen Render-Button. Klick triggert nur das gewählte Format.
- [ ] Bestehender Bulk-Render-Knopf rendert weiterhin alle Presets, jetzt aber implizit über alle drei Formate (also 3× mehr Worker-Jobs).
- [ ] Neuer **„Backfill A3+A2"-Button** auf der Bulk-Render-Seite — triggert nur die Presets, denen A3 oder A2 fehlt (Status ≠ `done`).

### Inspiration-/Galerie-/Anlass-UI (Customer-facing)
- [ ] Default-Format-Anzeige auf **A3** (zeigt mehr Geografie als A4, ist aber nicht so dominant wie A2).
- [ ] Auf Desktop (≥ 1024px): Pro Preset-Karte werden drei kleine Format-Pills unter dem Vorschau-Bild gerendert (A4 | A3 | A2). Aktiver Pill ist hervorgehoben.
- [ ] Auf Mobile (< 1024px): **Keine** Format-Pills auf der Grid-Karte. Der Switcher erscheint erst im Detail-Modal / nach Tap auf eine Karte.
- [ ] Format-Pills zeigen sich **nur für Formate mit `render_status_<format> = done`** — Formate mit `failed`/`pending` werden ausgeblendet (nicht ausgegraut, nicht versteckt mit Fallback-A4-Bild).
- [ ] Wenn ein Preset für **kein** Format `done` hat → Karte wird gar nicht angezeigt (für Customer; Admin sieht sie weiterhin).
- [ ] Click auf einen Format-Pill wechselt das angezeigte Vorschau-Bild ohne Neuladen der Seite (clientseitiges State-Update).
- [ ] Click auf den primären Call-to-Action der Karte („Auswählen" / Hero-Click) leitet zum Editor mit `?preset=<id>&format=<a4|a3|a2>` weiter — Editor öffnet im gewählten Format.
- [ ] `applyPreset` und `PresetUrlApplier` setzen den `printFormat` aus dem URL-Parameter (Fallback A4 wenn kein Param).

### Konsistenz / Migration
- [ ] Alle Stellen im Code, die `preset.preview_image_url` referenzieren, werden zu einer Helper-Funktion umgestellt: `getPreviewUrl(preset, format)` — fällt auf das nächste verfügbare Format zurück, falls das Wunschformat nicht vorhanden ist (während Migrations-Phase).
- [ ] Galerie-Komponenten (`GallerySection`, `GalleryPresetCard`, `PresetCarousel`, `OccasionPresetGrid`) werden alle umgestellt.
- [ ] CSV-Import (PROJ-30) bleibt unverändert — bestimmt nicht das Format, der Worker rendert eh alle drei.

## Edge Cases
- **Worker-Crash mitten in Format-Iteration:** Wenn der Worker während dem A3-Render abstürzt, soll beim nächsten Lauf nur A3 (status=`rendering` mit altem `render_started_at`) wieder aufgenommen werden, nicht alle drei Formate. Worker-Lock-Cleanup orientiert sich an `render_started_at_<format>`.
- **Customer wechselt Format-Pill, hat aber langsame Verbindung:** Bild-Load braucht Zeit. UI zeigt während Image-Load ein Skeleton oder Blur-up auf der vorhandenen Vorschau, nicht weißes Loch.
- **Preset hat alle 3 Formate, aber Admin ändert das `config_json`:** Stale-Detection markiert alle 3 als `stale`. Customer sieht weiterhin die alten Bilder bis Re-Render läuft (kein leerer Card-Slot).
- **Customer wechselt zwischen Karten mit unterschiedlich viel verfügbaren Formaten** (z. B. Karte 1 hat alle 3, Karte 2 nur A4): Der zuletzt gewählte Format-State wird **nicht** karten-übergreifend übertragen — jede Karte zeigt initial den Default (A3) bzw. das nächste verfügbare Format. Sonst hätten Karten mit nur A4 plötzlich „kein Format aktiv".
- **A3 als Default, aber für ein Preset ist nur A4 fertig:** Karte zeigt automatisch A4 als initiales Bild und blendet A3/A2-Pills aus.
- **Inspiration-Karte im Hero-Carousel:** Hero zeigt das größtmögliche verfügbare Format (Priorität A2 > A3 > A4) — größeres Bild für Hero-Wirkung. Switcher trotzdem dieselbe Logik.
- **Storage-Volume:** 3 JPGs à ~80–150 KB pro Preset × ~200 Presets ≈ 60 MB pro Locale. Bei 5 Locales = 300 MB. Vertretbar in Supabase Storage.
- **Backfill-Job läuft auf Production:** Worker läuft seriell (1 Render gleichzeitig), Backfill blockiert nicht den Editor. Aber Render dauert je ~15–30 Sek; bei 200 Presets × 2 fehlende Formate = 400 Renders × 20 Sek = ~2 h Gesamtdauer. Operator muss dies wissen, läuft idealerweise nachts.
- **Querformat-Wahl-Click im Editor:** Nicht Teil dieses Features. Customer im Editor kann auf Querformat schalten, der Live-Render im Editor passt sich an, aber die Inspiration-Vorschauen bleiben Hochkant-only. Das wird in einem separaten PROJ-X (Querformat-Render) gehandhabt.

## Technical Requirements
- **Performance:** Format-Wechsel auf der Karte muss flüssig sein (Bildwechsel, kein Page-Reload). Image-Preload für die anderen zwei Formate ist erlaubt aber nicht zwingend.
- **Storage:** JPG-Format mit ~85% Quality, max ~150 KB pro Bild. Existing Pipeline-Setting bleibt.
- **Security:** Bucket bleibt public, RLS-mäßig keine Änderungen nötig. URL-Parameter `format` muss server-/client-seitig gegen Whitelist (`a4`/`a3`/`a2`) validiert werden, damit kein offener Redirect/SSRF entsteht.
- **Browser Support:** Wie bisher (Chrome, Firefox, Safari ≥ iOS 15.4 für `dvh` aus PROJ-37).
- **Mobile:** Keine zusätzliche Render-Variante für Mobile — der Switcher ist auf Mobile schlicht woanders platziert (Modal statt Card).

## Out of Scope (für späteres Feature)
- **Querformat-Renders:** Wird ein separates PROJ-X. Aktuelle Designs sind primär in Hochkant gedacht; Querformat braucht eigene Layout-Anpassungen (Text-Position, Pin-Skalierung), die nicht trivial sind.
- **A1 / A0 / B-Formate:** Aktuell nicht im Produkt-Katalog (siehe `lib/print-formats.ts` und Stripe-Catalog).
- **Per-Format-Mockup-Compositing-Variation:** Falls in Zukunft pro Format eine andere PSD-Mockup-Vorlage genutzt werden soll (z. B. größeren Wand-Frame für A2). Aktuell wird die gleiche PSD für alle drei Formate genutzt.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

# PROJ-34: Star-Map Aquarell-Texturen

## Status: Deployed
**Created:** 2026-04-30
**Last Updated:** 2026-04-30

## Hintergrund

Bisher rendert der Star-Map-Editor (PROJ-7) den Sterne-Hintergrund als flachen Hex-Farbwert (Radial-Gradient von `skyBgColor`-Mitte zu `skyBgColor`-Rand). Das wirkt im Druck billig im Vergleich zu Mitbewerbern, die mit Aquarell- oder Tusche-Texturen arbeiten.

User-Reaktion auf einen ersten Test mit einer gemalten Wand-Textur war stark positiv — der Look hebt die wahrgenommene Wertigkeit des Posters deutlich und passt zur Brand-Richtung (zeitlos-minimalistisch, warmer Petrol-Ton).

PROJ-34 ergänzt **gemalte Hintergrund-Texturen** als optionalen Layer im Star-Map-Editor: Customer wählt zwischen „Keine Textur" (bisheriger flacher Hintergrund) und einer Auswahl von Tusche-/Aquarell-Texturen, mit Opacity-Slider zur Feinjustierung. Texturen werden beim Wählen als Layer **zwischen** Radial-Gradient-Sky-Background und den Sternen gezeichnet, innerhalb des Sky-Circle-Clips.

## Problem & Ziel

- **Problem:** Flacher Sky-Background im Star-Map-Editor wirkt unedel, gerade auf größeren Print-Formaten.
- **Ziel:** Customer kann mit einem Klick zwischen Texturen wählen, ohne dass das Editor-Modell komplexer wird (keine zusätzliche Style-Achse, keine zusätzliche Auswahl-Seite). Texturen sind reine Visuals, beeinflussen Sternpositionen und Konstellationslinien nicht.

## User Stories

### Customer
- Als Kunde will ich im Star-Map-Editor unter „Farben" eine **Himmel-Textur** auswählen können (Tusche Blau, Tusche Schwarz, …), um meinem Poster einen gemalten Look zu geben.
- Als Kunde will ich die **Sichtbarkeit der Textur** über einen Slider regeln können (30–100 %), damit ich die Mischung mit der Himmel-Farbe selbst feinjustieren kann.
- Als Kunde will ich **„Keine"** wählen können, wenn ich den klassischen flachen Look bevorzuge.
- Als Kunde will ich, dass die gewählte Textur auch im **PNG/PDF-Export** und im **bestellten Druck-Poster** sichtbar ist — nicht nur im Editor-Vorschau.
- Als Kunde will ich, dass meine gewählte Textur beim **Speichern und Wiederöffnen** des Star-Map-Posters erhalten bleibt.

### Admin
- Als Admin will ich neue Texturen über das Filesystem hinzufügen können (`public/star-textures/`) und mit einem `labelKey` im Manifest registrieren.
- Als Admin will ich Texturen in **Star-Map-Presets** vorbelegen können — wenn der Customer ein Preset wählt, wird die Textur mit allen anderen Preset-Eigenschaften gesetzt.

## Acceptance Criteria

### Editor
- [x] Neue „Himmel-Textur"-Sektion im Star-Map-`Moment`-Tab unterhalb der „Farben"-Sektion
- [x] Picker zeigt „Keine" als ersten Eintrag (Kreis mit aktueller `skyBgColor` als Füllung), gefolgt von Thumbnail-Kreisen pro verfügbarer Textur
- [x] Selektion visuell hervorgehoben (Foreground-Ring)
- [x] Opacity-Slider 30–100 % erscheint nur bei aktiver Textur, Default 90 %
- [x] Live-Update im Editor-Canvas bei Auswahl/Slider-Änderung

### Render-Pipeline
- [x] [star-map-renderer.ts](src/lib/star-map-renderer.ts) zeichnet Textur **innerhalb** des Circle-Clips, nach Radial-Gradient, vor Stern-Layer
- [x] Center-Cropped Square aus rechteckigen Quellbildern (Hochformat-Texturen werden mittig angeschnitten)
- [x] Editor-Canvas, Editor-Export (PNG/PDF), Preset-Vorschau, Cart-Snapshot-Render und Order-Fulfillment-Render zeigen die Textur konsistent

### Persistenz
- [x] Snapshot-Felder `textureKey: string | null` + `textureOpacity: number` in:
  - `useStarMapStore` (Editor-State, inkl. Reset über `getStarMapInitialState`)
  - Cart-Item-Snapshot (`StarMapExportTab.tsx`)
  - Preset-`config_json` (`SaveAsPresetButton.tsx`)
  - Apply-Preset Snapshot/Restaurierung (`apply-preset.ts`)
- [x] Backwards-Compat: Snapshots ohne diese Felder fallen sauber auf `null` / `0.9` zurück

### Manifest & Assets
- [x] [src/lib/star-textures.ts](src/lib/star-textures.ts) als Single Source of Truth für verfügbare Texturen — `key`, `labelKey`, `path`
- [x] `loadStarTexture(key)` lädt promisifiziert, schluckt Errors, gibt `null` zurück wenn Key unbekannt oder Load fehlschlägt
- [x] V1 Texture-Set: 4 PNG-Texturen (Tusche Blau, Tusche Schwarz, Tusche Grün, Tusche Rosé) in `public/star-textures/`

### i18n
- [x] Customer- und Admin-Strings im `Moment`- und `Himmel`-Tab über `useTranslations('starMapEditor')`
- [x] Texture-Labels über `t(\`textures.${labelKey}\`)`
- [x] `starMapEditor`-Namespace in allen 5 Locales (de/en/es/it/fr) mit ~46 Keys
- [x] Komponenten und Texture-Manifest verwenden Translation-Keys, keine hardcoded UI-Strings

### Mobile
- [x] Browser-Test auf `/de/star-map` Mobile bestanden — Performance der zusätzlichen `drawImage` pro Frame ist unauffällig, Picker bedienbar (User-Verifikation 2026-04-30)
- [x] Touch-Targets: 36 px Thumbnail-Picker passt PROJ-18-Pattern, kein Vergrößerungsbedarf

### Native-Speaker-Review (offen)
- [ ] EN/ES/IT/FR `starMapEditor.*` von Native-Speaker auf Stil prüfen lassen — die initial-Übersetzungen sind technisch korrekt, aber von einem deutschsprachigen Entwickler verfasst (nicht release-blockierend)

## Edge Cases

- Customer wechselt zwischen mehreren Texturen schnell hintereinander → `loadStarTexture` Race ist durch Promise-Cleanup im `StarMapCanvas`-`useEffect` abgesichert (cancel-Flag)
- Texture-Datei fehlt (404 / Storage-Issue) → `loadStarTexture` fängt `onerror`, gibt `null` zurück → Renderer fällt auf flachen Hintergrund zurück, kein Crash
- Customer öffnet altes Star-Map-Projekt ohne Textur-Felder → `textureKey` undefined → flacher Look wie vor PROJ-34
- Customer öffnet Star-Map-Preset, dessen Admin eine Textur eingebacken hat → `applyPreset` setzt `textureKey` korrekt im Store
- Order-Fulfillment-Render läuft serverseitig in Puppeteer-Kontext → `Image()` ist verfügbar, `loadStarTexture` funktioniert dort genauso
- A3-Print mit 1500-px-Texturquelle → Textur leicht weichgezeichnet, fällt bei Aquarell-Look kaum auf; Admin sollte für A3-Premium-Druck 3000-px-Quellen vorhalten (nicht hart erzwungen)
- Customer aktiviert Konstellationslinien + helle Textur → Default-Linien-Opacity (0.4) kann zu zart wirken; offen, ob das in einem Folge-Pass dynamisch nachgezogen wird

## Non-Goals

- **Keine Customer-Upload-Funktion** — Texturen sind kuratiert, kommen aus dem Manifest
- **Keine Admin-UI zur Textur-Verwaltung** im V1 — Texturen werden über Code/Filesystem hinzugefügt, nicht über die DB (parallel zu PROJ-22 wäre denkbar, aber nicht für V1)
- **Kein animierter Hintergrund** — nur statische Bild-Texturen
- **Kein per-Konstellation-Stil-Anpassung** — Linien-Opacity bleibt global, wird in einem Folge-Pass evtl. dynamisch
- **Kein Square-Print-Format** in dieser Spec — wäre eigenes Ticket; Texturen funktionieren sofort, sobald `square` als Print-Format ergänzt ist

## Technische Anforderungen

- **Render-Reihenfolge:** Poster-BG → Outer-Backdrop (optional) → Sky-Circle-Clip → Radial-Gradient → **Textur (neu)** → Grid → Milky Way → Constellations → Stars → Planets → Moon → Sun → Compass → Frames
- **Texture-Loading:** asynchron, parallel zu Stern-Daten-Loading, kein Blocker für initialen Render
- **Performance:** zusätzliches `drawImage` pro Render-Frame ist auf Desktop kein Bottleneck (gemessen bei Pass-1-Test). Auf Mobile QA noch ausstehend.
- **Snapshot-Schema:** `textureKey: string | null` (`null` = keine Textur) + `textureOpacity: number` (0.3–1.0). Beide optional in DB-`config_json` für Backwards-Compat.

## Implementation Notes

### Was gebaut wurde
- **Renderer:** [src/lib/star-map-renderer.ts](src/lib/star-map-renderer.ts) — `skyTextureImage?` + `skyTextureOpacity?` Optionen, gezeichnet innerhalb Circle-Clip nach Radial-Gradient
- **Manifest + Loader:** [src/lib/star-textures.ts](src/lib/star-textures.ts) — `STAR_TEXTURES`, `getStarTexture(key)`, `loadStarTexture(key)`
- **Store-Felder:** [src/hooks/useStarMapStore.ts](src/hooks/useStarMapStore.ts) — `textureKey`, `textureOpacity`, Setter, Reset-State
- **Editor-Canvas:** [src/components/star-map/StarMapCanvas.tsx](src/components/star-map/StarMapCanvas.tsx) — lädt Textur-Bild dynamisch nach `textureKey`, Cleanup-Flag gegen Race
- **Sidebar-UI:** [src/components/star-map/StarMapTab.tsx](src/components/star-map/StarMapTab.tsx) — neue „Himmel-Textur"-Sektion mit Thumbnail-Picker + Opacity-Slider
- **Editor-Export:** [src/hooks/useStarMapExport.ts](src/hooks/useStarMapExport.ts) — lädt Textur parallel zu Sterndaten, reicht an Renderer
- **Snapshot-Render:** [src/lib/poster-from-snapshot.ts](src/lib/poster-from-snapshot.ts) — Schema-Erweiterung + Texture-Load + Render-Aufruf
- **Persistenz:** Cart-Snapshot ([StarMapExportTab.tsx](src/components/star-map/StarMapExportTab.tsx)), Preset-Save/Apply ([SaveAsPresetButton.tsx](src/components/editor/SaveAsPresetButton.tsx) + [apply-preset.ts](src/lib/apply-preset.ts))
- **i18n:** Komplett-Migration der Star-Map-Sidebar nach `starMapEditor`-Namespace in 5 Locales; Texture-Labels über `labelKey`-Pattern

### Verifikation
- `npx tsc --noEmit` → grün nach jedem Pass
- Alle 5 Locale-JSONs parsen
- Browser-Test auf Desktop bestanden (User-Verifikation, „deutlich besser" 2026-04-30)
- Browser-Test auf Mobile bestanden (User-Verifikation 2026-04-30)
- Auto-Deploy via Vercel auf petite-moment.com

### Offene Punkte (nicht release-blockierend)
- **Native-Speaker-Translation-Review**: EN/ES/IT/FR — initial von DE-Entwickler verfasst
- **Canvas-Compass-Labels** (N/O/S/W) sind weiterhin hardcoded Deutsch — separater Folge-Fix (echter Bug für ES, weil dort "O" = Westen)

## Dependencies

- Builds on: **PROJ-7** (Star-Map-Generator) — erweitert dessen Renderer + Sidebar
- Builds on: **PROJ-3** (Poster-Export) — erweitert die Snapshot-Render-Pipeline
- Builds on: **PROJ-8** (Design-Presets) — Texture-Felder reisen über `presets.config_json` mit
- Builds on: **PROJ-20** (i18n) — `starMapEditor`-Namespace lebt im bestehenden i18n-Setup
- Touches: **PROJ-22** (Admin-Paletten) — separat, könnte Vorbild für Admin-UI im V2 sein
- Touches: **PROJ-30** (Preset-Render-Pipeline) — Headless-Render in Puppeteer rendert Texturen automatisch durch Pass-4-Verdrahtung in `useStarMapExport`

## QA Test Results
_To be added by /qa nach Mobile-Browser-Test_

## Deployment
_To be added by /deploy_

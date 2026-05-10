# PROJ-40 — Masks (Form-Picker) für Sternenposter-Editor

**Status:** In Review
**Created:** 2026-05-10
**Last Updated:** 2026-05-10

## Implementation Notes (2026-05-10)

### Backend
- DB-Migration `20260510000000_proj40_custom_masks_applicable_poster_types.sql`: neue Spalte `applicable_poster_types text[]` (Default `['map']`), Check-Constraint auf `{map, star-map, photo}`, GIN-Index für Filter-Queries.
- `lib/poster-types.ts`: zentrale `PosterType`-Definition + Default-Konstante + Labels (DE).
- `lib/map-masks.ts`: jede Built-in-Mask trägt jetzt `applicableTo: PosterType[]`. Single-Forms (`circle`, `heart-single`, `house`, `frame1`) sind für `map` und `star-map` freigeschaltet; Splits + `text-below` bleiben map-only.
- `/api/masks` (GET): optionaler Query-Param `?posterType=map|star-map|photo` filtert via `applicable_poster_types @> ARRAY[…]`. Default ohne Param = wie bisher (alle).
- `/api/admin/masks` (POST): nimmt mehrfaches `applicable_poster_types` aus FormData, fällt auf `['map']` zurück bei leerer Auswahl.
- `/api/admin/masks/[id]` (PATCH): Zod-Schema akzeptiert `applicable_poster_types: PosterType[]` (mind. 1 Eintrag).

### Admin-UI
- `AdminMasksList.tsx`: 3 Checkboxen "Karten-Editor / Sternenposter / Foto-Poster" sowohl im Upload-Dialog als auch pro Row (Inline-Toggle, optimistic update mit Rollback).
- Default neue Maske: `['map']` — Operator opt-in für Sternenposter/Foto explizit nötig.

### Customer-Side Star-Map
- `useStarMapStore`: neues Feld `maskKey: string` (Default `'circle'`) + `setMaskKey` Setter.
- `StarMapTab.tsx`: Form-Picker direkt nach Date-Time, vor Presets. Zeigt Built-ins mit `applicableTo.includes('star-map')` plus `useCustomMasks('star-map')`.
- `useCustomMasks(posterType)`: optionaler Filter-Param, Default `'map'`. Filtert `applicable_poster_types`.

### Renderer-Integration
- `lib/star-map-renderer.ts`: neuer optionaler `skyMaskImage` Param. Wird VOR `ctx.restore()` des Sky-Circle-Clip-Blocks via `globalCompositeOperation = 'destination-in'` angewendet — der existierende Clip beschränkt den Effekt auf den Sky-Bereich, Frame + Compass bleiben unangetastet.
- `lib/load-mask-image.ts`: zentraler async Helper `loadSkyMaskImage(maskKey)`, geteilt von Live-Canvas, Export und Snapshot.
- `StarMapCanvas.tsx`, `useStarMapExport.ts`, `lib/poster-from-snapshot.ts`: laden das Mask-Image vorab und reichen es an `renderStarMap`.

### Persistenz
- `useProjectSync`, `apply-preset`, `SaveAsPresetButton`: `maskKey` parallel zu `textureKey` in Snapshot, Restore und Preset-Save eingehängt.

### Iteration-1-Trade-off (zu beobachten in QA)
- Sky-Circle-Geometrie unverändert (Sterne werden weiterhin im kanonischen Kreis projiziert, `skyR = 0.41 × min(w,h)`). Bei Masken, die größer als oder verschoben gegenüber dem Sky-Circle sind (z.B. Heart, das sich nach unten ausdehnt), sieht der Customer nur die Schnittmenge `circle ∩ mask` mit Sternen gefüllt — der Rest der Mask-Silhouette bleibt im Posterhintergrund. Funktional korrekt, visuell nicht perfekt für nicht-rund-zentrierte Masken. Bounding-Box-aware Sky-Resize wäre Iteration 2 falls Daniel das anspricht.
- Compass-Labels und der Default-Sky-Circle-Border werden nach dem Mask-Composite gerendert und sind daher außerhalb der Mask-Silhouette weiterhin sichtbar. Bei nicht-rund Maskenformen sieht das eventuell seltsam aus — ggf. später Compass beim nicht-circle-Mask automatisch ausblenden.

### Deploy-Hinweis
- DB-Migration muss VOR dem Frontend-Deploy via `supabase db push` (oder Production-CLI) ausgeführt werden, sonst crashen Mask-API und Admin-UI mit "column does not exist".

## Problem

Der Karten-Editor (PROJ-1) bietet seit jeher einen Form-Picker (Kreis, Herz, Couples, Splits, Custom-Masks etc.), der den sichtbaren Karten-Bereich auf eine Silhouette zuschneidet. Der Sternenposter-Editor zeigt den Sternenhimmel aktuell ausschließlich als Vollkreis — Customer kann die Form nicht ändern.

Damit fehlen dem Sternenposter genau die Discovery-Vektoren, die den Karten-Editor erlebbar machen: das Heart-Mask für Hochzeit/Liebe, Couple-Masks für Paar-Geschenke, Custom-Masks für Anlass-Kampagnen. Stattdessen sieht jedes Sternenposter strukturell gleich aus, was den Customer zwingt, alle Differenzierung über Datum/Ort/Text zu erzeugen.

## User Stories

- Als Kunde will ich für mein Sternenposter eine Herz- oder Couple-Form wählen können, damit es zu Anlass und Beschenktem passt (Hochzeitstag, Verlobung, Erinnerung).
- Als Kunde erwarte ich denselben Form-Picker wie im Karten-Editor — Wiedererkennungswert, gleiche UX-Patterns, dieselben Custom-Masks.
- Als Operator möchte ich die existierenden Custom-Masks (PROJ-35) ohne Doppelaufwand auch für Sternenposter freischalten können.

## Acceptance Criteria

- [ ] Im Sternenposter-Editor (Desktop + Mobile) erscheint ein Form-Picker analog zum Karten-Editor in der "Himmel"-Sidebar (oder eigener "Form"-Sektion, je nach IA-Entscheidung).
- [ ] Single-Form-Masks (Kreis, Herz, Couple-1, Couple-2, House, Custom-Masks etc.) sind unterstützt — der Sternenhimmel wird auf die Silhouette zugeschnitten, der Außenbereich folgt den bestehenden Außenbereich-Modi (Leer/Faded/Glow/Voll).
- [ ] Der heutige Vollkreis bleibt Default (kein Bruch für Bestandsprojekte und Presets).
- [ ] Split-Masks (zwei Karten nebeneinander) sind **nicht** Teil dieses Features — Sternenposter haben kein Split-Modell. Werden im Picker entweder ausgeblendet oder als "Nicht verfügbar" markiert.
- [ ] Die Compass-Roses (N/O/S/W) und das Koordinaten-Grid passen sich an die Maskenform an oder werden bei nicht-runden Formen sauber abgeschnitten — keine überstehenden Linien.
- [ ] Decoration-Layer (PROJ-35: Custom-Masks mit Decoration-SVG) funktioniert auch für Sternenposter.
- [ ] Export (PNG + PDF, useStarMapExport / poster-from-snapshot) berücksichtigt die Maskenform exakt wie der Live-Preview.
- [ ] Mobile-Variante zeigt denselben Picker — keine Optionen-Drift (siehe PROJ-25).

## Offene Fragen für Architecture-Phase

- Wo wohnt die Maskenform im State — eigener Feld-Name `starMapMaskKey` im `useStarMapStore`, oder geteilt mit `useEditorStore.maskKey`?
- Wie verhält sich der Sternenhimmel-Texture-Layer (PROJ-34) bei nicht-runden Masks — wird die Aquarell-Textur ebenfalls geclippt oder läuft sie unter der Maske durch?
- Gibt es Masks, die für Sternenposter **nicht** sinnvoll sind (z.B. House) und nur für Karten freigegeben bleiben? → Maybe ein Schema-Feld `applicablePosterTypes: ['map' | 'star-map' | 'photo']` auf der Mask-Definition.

## Dependencies

- Setzt PROJ-1 (Karten-Editor mit funktionierendem Mask-System) und PROJ-7 (Star-Map-Generator) voraus.
- Setzt PROJ-35 (Custom-Masks mit Decoration) voraus für die Custom-Mask-Wiederverwendung.
- Berührt PROJ-25 (UX Consistency Pass) — Picker-Layout sollte schon der dort definierten konsistenten Reihenfolge folgen.
- Sollte vor PROJ-29 (Anlass-Landing-Pages) finalisiert sein, weil viele Anlässe auf Hochzeit/Couple zielen und Sternenposter mit Heart-Mask das natürliche Format dafür wäre.

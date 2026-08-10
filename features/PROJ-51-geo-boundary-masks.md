# PROJ-51: Geo-Grenzen-Masken (Länder/Regionen/Städte als Posterform)

## Status: In Progress
**Created:** 2026-05-17
**Last Updated:** 2026-05-17

## Summary
Eine neue Kartenform-Option „Grenzen", mit der die echte amtliche Grenze einer
administrativen Region (Land, Bundesland/Region, Stadt/Gemeinde) als Clip-Maske
über die Karte gelegt wird. Anders als die statischen SVG-Masken (Herz, Haus,
Kreis) ist die Form hier **geografisch verankert**: Das Maskenpolygon folgt der
Karte 1:1 bei Pan und Zoom (vgl. [[feedback_pin_tracks_map]] — Geo-Referenz hat
Priorität). Der Nutzer sucht eine Region per offener Suche; das Grenz-Polygon
wird live aus einer OSM-basierten Quelle (Nominatim/Overpass) geladen.

## Dependencies
- Requires: PROJ-1 (Karten-Editor Core) — Editor-Canvas, Karten-Layer, Mask-Picker
- Requires: PROJ-3 (Poster-Export) — Export-Pipeline muss die projizierte Form übernehmen
- Related: PROJ-35 (Customer-sichtbare Custom-Masks) — neue Form reiht sich in den Mask-Picker ein
- Related: PROJ-38 (Admin Mask Transform Editor) — Geo-Masken sind NICHT transform-editierbar (Form = Geografie)

## Context
Wettbewerber bieten Länder-/Stadt-Umrisse als Posterform an. Im Editor erscheint
die Option als fünfte Kachel „Grenzen" im **KARTENFORM**-Picker, neben
Ohne / Herz / Haus / Kreis. Bei Auswahl klappt darunter ein Bereich auf:
„Wähle Deine Grenze aus" mit der aktuell gewählten Region als Chip
(z. B. „Deutschland") und einem Eintrag „+ Weitere Grenzen anzeigen…", der die
Regionssuche öffnet.

## User Stories
- Als Nutzer möchte ich im KARTENFORM-Picker eine Option „Grenzen" wählen, damit
  mein Poster die echte Form eines Landes/einer Stadt bekommt statt einer
  generischen Form.
- Als Nutzer möchte ich eine Region (z. B. „Bayern", „Berlin", „Frankreich")
  über ein Suchfeld finden, damit ich nicht auf eine vorgegebene Liste
  beschränkt bin.
- Als Nutzer möchte ich nach Auswahl einer Region die Karte innerhalb der
  Grenze weiter verschieben und zoomen können, ohne dass die Grenzform
  „verrutscht" — die Grenze bleibt geografisch korrekt über der Karte liegen.
- Als Nutzer möchte ich die gewählte Grenze wieder entfernen (×-Button am Chip)
  und zu einer anderen Form oder „Ohne" zurückkehren.
- Als Käufer möchte ich, dass der exportierte PNG/PDF-Druck exakt die im Editor
  sichtbare Grenzform zeigt — pixelgenau, ohne Versatz oder Treppenkanten.

## Acceptance Criteria
- [ ] Der KARTENFORM-Picker zeigt eine fünfte Kachel „Grenzen" mit eigenem Icon.
- [ ] Bei Auswahl von „Grenzen" erscheint darunter der Abschnitt „Wähle Deine
      Grenze aus" mit (a) Chip der aktiven Region inkl. ×-Button und
      (b) Eintrag „+ Weitere Grenzen anzeigen…".
- [ ] „+ Weitere Grenzen anzeigen…" öffnet ein Suchfeld; Eingabe ab 2 Zeichen
      liefert Treffer aus einer Geo-Quelle, gruppiert/erkennbar nach Typ
      (Land / Region / Stadt).
- [ ] Auswahl eines Treffers lädt dessen Grenz-Polygon und legt es sofort als
      Clip-Maske über die Karte.
- [ ] Das Maskenpolygon ist geografisch verankert: Bei Pan/Zoom bleibt die
      Grenze deckungsgleich mit der darunterliegenden Geografie (kein Clamp auf
      eine feste Box).
- [ ] Beim Wechsel der Region wird die Karte automatisch so positioniert/gezoomt,
      dass die neue Grenze vollständig im sichtbaren Bereich liegt.
- [ ] Der ×-Button am Region-Chip setzt die Form auf „Ohne" zurück.
- [ ] Der Marker-Pin bleibt sichtbar und folgt weiterhin der Karte, auch wenn er
      außerhalb der Grenzform liegt (Konsistenz mit [[feedback_pin_tracks_map]]).
- [ ] Der PNG-/PDF-Export zeigt exakt dieselbe projizierte Grenzform wie der
      Editor, mit sauberer Kante (Anti-Aliasing, kein Versatz).
- [ ] Sehr detaillierte Polygone (z. B. Küsten-/Stadtgrenzen) werden so weit
      vereinfacht, dass Editor-Interaktion flüssig bleibt, ohne die Form sichtbar
      zu verfälschen.
- [ ] Die Region-Auswahl wird im Projekt gespeichert/geladen (PROJ-5) und
      überlebt einen Reload.
- [ ] Die UI-Texte des neuen Bereichs sind in allen Locales (de/en/es/fr/it)
      lokalisiert.

## Edge Cases
- Was passiert, wenn die Geo-Quelle keinen Treffer liefert oder offline ist?
  → Klare Leer-/Fehlermeldung im Suchfeld, vorhandene Auswahl bleibt erhalten.
- Was passiert bei Regionen mit mehreren getrennten Flächen (z. B. Inseln,
  Exklaven)? → Multi-Polygon muss als eine zusammengesetzte Maske gerendert
  werden, nicht nur die größte Fläche.
- Was passiert, wenn das Polygon extrem groß (Russland) oder extrem klein
  (kleine Gemeinde) ist? → Auto-Zoom muss beide Fälle sinnvoll einrahmen.
- Was passiert, wenn der Nutzer aus der Grenze herauszoomt/-pannt, sodass die
  Form teilweise/ganz aus dem Poster läuft? → Erlaubt; die Karte regiert, die
  Grenze wird einfach am Poster-Rand abgeschnitten (kein Re-Center erzwingen).
- Was passiert beim Format-Wechsel A4/A3/A2 (PROJ-37)? → Grenzform skaliert
  proportional mit dem Viewport, bleibt geografisch korrekt.
- Was passiert bei einem alten gespeicherten Projekt ohne Geo-Maske? → Abwärts­
  kompatibel, bestehende SVG-Masken unverändert.
- Wie verhält sich der Admin Mask Transform Editor (PROJ-38)? → Geo-Masken sind
  dort nicht editierbar; die Form ergibt sich allein aus der Geografie.

## Open Questions (für /architecture)
- Konkrete Geo-Quelle & Lizenz: Nominatim/Overpass live vs. eigenes gehostetes
  GeoJSON-Set; Rate-Limits, Caching, ODbL-Attribution.
- Polygon-Vereinfachung: Algorithmus (z. B. Douglas-Peucker) und Toleranz pro
  Zoomstufe.
- Rendering-Technik der Clip-Maske (SVG clip-path über Karten-Layer vs.
  MapLibre-Layer-Maskierung) und wie der Export sie pixelgenau übernimmt.
- Persistenz-Format der Region im Projekt: nur Referenz-ID/Query vs.
  eingebettetes (vereinfachtes) Polygon.

## Technical Requirements (optional)
- Performance: Region-Suche < 500 ms Antwort; Masken-Anwendung < 200 ms nach
  Auswahl; Pan/Zoom flüssig (≥ 50 fps) auch bei vereinfachten Stadt-Polygonen.
- Export: Druckauflösung pixelgenau, Kanten sauber anti-aliased.
- Mobile: voll bedienbar ab 375 px Viewport ([[feedback_mobile_first]]).
- Lizenz: OSM-Daten ODbL-konform attributieren.
- Browser-Support: Chrome, Firefox, Safari (inkl. iOS).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Kernentscheidung: warum Geo-Masken anders funktionieren
Alle heutigen Masken (Herz, Kreis, Haus, Custom-SVGs) sind **feste SVG-Formen**,
die als CSS-Maske über die Karte gelegt und auf die Kartenfläche gestreckt
werden. Sie sind unabhängig von Ort und Zoom. Eine Länder-/Stadtgrenze ist
dagegen ein **geografisches Polygon** — ihre Form auf dem Bildschirm hängt von
Kartenausschnitt und Zoom ab und ändert sich bei jedem Pan/Zoom.

Statt die Grenze bei jedem Frame per JavaScript neu in eine SVG-Maske
umzurechnen, wird sie **direkt als Karten-Ebene in die Karte selbst gelegt**.
Die Karten-Engine (MapTiler/MapLibre) projiziert geografische Ebenen ohnehin bei
jedem Pan/Zoom automatisch korrekt — d. h. die Grenze „klebt" ohne Zusatzcode an
der Geografie. Zwei Ebenen werden ergänzt:
1. **Außen-Übermalung:** eine Fläche „ganze Welt minus Region" wird in der
   Poster-Hintergrundfarbe übermalt → nur die Region bleibt sichtbar.
2. **Konturlinie:** die Grenzlinie selbst als dünne Linie → ergibt automatisch
   die „Formkontur" der Region.

Vorteil: Der **Export funktioniert ohne Sonderbehandlung** — die Export-Pipeline
rendert dieselbe Karte headless, die Geo-Ebenen sind automatisch dabei und
pixelgenau. Das war ein Akzeptanzkriterium.

### Außenbereich & Formkontur — über die SVG-Masken-Pipeline
Der **Außenbereich** (Leer / Verblassen / Leuchten / Posterrand) und die
**anpassbare Formkontur** funktionieren für Geo-Masken — über genau denselben
Code-Pfad wie die Form-Masken (Herz/Kreis):

1. Das Grenz-Polygon wird bei jeder Kartenbewegung per `map.project()` in den
   A4-viewBox-Koordinatenraum projiziert (siehe `src/lib/geo-shape.ts`).
2. Das Ergebnis ist eine dynamische `ShapeDefinition`, die in einem winzigen
   Store (`useGeoShape`) gehalten wird.
3. PosterCanvas reicht diese Form als `mask.shape` in den bestehenden
   Composer (`composeMaskSvg` / `composeFrameSvg`) — wie eine Form-Maske.
4. Weil die Geo-Form bereits 1:1 auf den Viewport projiziert ist, übergibt
   PosterCanvas `layoutMapHeight = 1`; damit ist der Einpass-Schritt des
   Composers eine Identität, Form und Karte bleiben deckungsgleich.

**Was deshalb „geschenkt" geht:** Verblassen / Leuchten / Posterrand,
Formkontur (Farbe/Dicke), Hintergrund-Farbabgleich, Export — alles über den
erprobten Composer-Code, ohne Sonderweg.

Geo-Masken sind im Admin Mask Transform Editor (PROJ-38) nicht editierbar —
die Form ist die Geografie.

### Komponenten-Struktur (UI)
```
Karten-Tab (MapTab)
+-- KARTENFORM-Picker (bestehend)
|   +-- Kacheln: Ohne · Herz · Haus · Kreis · [NEU] Grenzen
|
+-- Grenz-Auswahl-Block  [NEU, nur sichtbar wenn "Grenzen" aktiv]
    +-- Aktive-Region-Chip ("Deutschland")  + ×-Button (zurück auf "Ohne")
    +-- "+ Weitere Grenzen anzeigen…"  -> öffnet Such-Dialog
        +-- Regionssuche-Dialog
            +-- Suchfeld (ab 2 Zeichen)
            +-- Trefferliste (gruppiert: Land / Region / Stadt)

Poster-Canvas (PosterCanvas / MapPreview)
+-- Karte (bestehend)
    +-- [NEU] Geo-Ebene "Außen-Übermalung"  (Welt minus Region)
    +-- [NEU] Geo-Ebene "Konturlinie"       (Grenzlinie der Region)
```

### Datenquelle & Backend-Proxy
Der Editor spricht **nicht** direkt mit einer fremden Geo-API, sondern mit
einem eigenen Backend-Endpunkt. Gründe: die freie OSM-Quelle (Nominatim) hat
strenge Nutzungslimits (ca. 1 Anfrage/Sek.), verlangt eine korrekte
Absender-Kennung und ODbL-Namensnennung — das gehört serverseitig gekapselt.

Der Backend-Proxy macht dreierlei:
1. **Suche:** Anfrage zuerst gegen die eigene Datenbank-Tabelle, sonst gegen
   Nominatim; gibt schlanke Treffer zurück (Name, Typ, grobe Bounding-Box).
2. **Geometrie laden:** liefert das Grenz-Polygon einer Region — vereinfacht
   (Polygon-Punkte reduziert, Genauigkeit gekappt), damit Editor und Export
   flüssig bleiben.
3. **Cache & Katalog:** jede einmal geladene Region wird in der eigenen
   Datenbank zwischengespeichert. Beliebte Regionen kommen danach aus der
   eigenen DB (schnell, kein fremdes Limit) — und die Tabelle wächst
   nebenbei zu einem kuratierbaren Katalog (spätere Admin-Pflege möglich).

### Datenmodell (in Klartext)
**Neue Tabelle „Geo-Grenzen" (Cache + Katalog), je Eintrag:**
- Eindeutige ID
- Herkunfts-Kennung der Quelle (OSM-Typ + OSM-ID) — zum Wiederfinden/Aktualisieren
- Name + lokalisierte Namen (de/en/es/fr/it)
- Ebene: Land / Region / Stadt
- Bounding-Box (für Auto-Zoom)
- Vereinfachtes Grenz-Polygon (Geometrie)
- Quelle + Attributions-Text, Zeitstempel

**Im gespeicherten Projekt (PROJ-5) wird abgelegt:**
- Dass die Kartenform „Grenzen" aktiv ist
- Die Region-ID **und** das vereinfachte Polygon selbst (eingebettet)

Begründung fürs Einbetten: Das Poster bleibt exakt reproduzierbar und der
Export unabhängig davon, ob die fremde API gerade erreichbar ist oder die
Region später anders geschnitten wird. Reine ID-Referenz wäre fragil.

### Tech-Entscheidungen (Begründung)
- **Geo-Ebene in der Karte statt CSS-Maske:** automatische, ruckelfreie
  Reprojektion bei Pan/Zoom und kostenloser, pixelgenauer Export — kein
  fehleranfälliger Pro-Frame-Sync-Code.
- **Eigener Backend-Proxy + DB-Cache:** umgeht Fremd-API-Limits, kapselt die
  ODbL-Attribution, macht die Suche schnell und legt den Grundstein für einen
  kuratierten Katalog.
- **Polygon-Vereinfachung serverseitig:** einmal beim Cachen vereinfachen
  statt bei jedem Editor-Aufruf; Editor bekommt nur leichte Geometrie.
- **Polygon im Projekt einbetten:** reproduzierbarer Export, offline-robust.
- **Auto-Zoom über Bounding-Box:** nach Regionswahl rahmt die Karte die Region
  automatisch ein (vorhandene „fitBounds"-Fähigkeit der Karten-Engine).

### Backend-Bedarf
**Ja** — diese Feature braucht Backend-Arbeit:
- Neue Tabelle „Geo-Grenzen" inkl. Zugriffsregeln (öffentlich lesbar,
  schreibend nur Server/Admin).
- API-Endpunkte: Regionssuche und Regions-Geometrie (mit Nominatim-Proxy +
  Caching).
Reihenfolge: erst `/frontend` (Picker, Such-Dialog, Geo-Ebenen-Rendering gegen
einen Mock), dann `/backend` (Proxy, Tabelle, Caching).

### Abhängigkeiten (Pakete)
- **@turf/turf** — Geo-Helfer zum serverseitigen Vereinfachen von Polygonen und
  zum Berechnen der Bounding-Box.
- Keine neue Karten-Bibliothek nötig — MapTiler/MapLibre-SDK ist bereits im
  Projekt und kann GeoJSON-Ebenen nativ.
- Keine neue UI-Bibliothek — Dialog/Input/Button etc. sind bereits vorhanden
  (shadcn/ui).

### Offene Punkte für /backend
- Vereinfachungs-Toleranz final festlegen (Balance Detailtreue ↔ Performance);
  ggf. zwei Stufen (Land grob / Stadt feiner).
- Nominatim-Nutzungsbedingungen: korrekte Absender-Kennung, ggf. später
  Wechsel auf eine selbst gehostete Geo-Quelle bei höherem Volumen.

## Implementation Notes (Frontend)

Frontend implemented per the Tech Design. Files:
- `src/lib/geo-boundaries.ts` — types, `searchGeoBoundaries`/`fetchGeoBoundary`
  client functions (call `/api/geo-boundaries/...`, fall back to a **direct
  OpenStreetMap Nominatim query** so the editor already shows the real,
  detailed administrative borders), and `buildInverseMaskPolygon` (world-rect
  with the region's rings as holes — the "over-paint everything outside"
  geometry, shared by editor preview + export).
- `src/lib/map-masks.ts` — new `geo-boundary` mask key/entry. Deliberately has
  **no `shape` and no `svgPath`** so PosterCanvas applies no CSS mask; the
  masking happens inside MapLibre.
- `src/hooks/useEditorStore.ts` — `geoBoundary` (selected region incl.
  embedded simplified polygon) + `pendingFitBounds` state, `setGeoBoundary` /
  `clearPendingFitBounds` actions; wired into `EditorConfig` + `loadFromConfig`
  for project persistence. `useProjectSync` includes `geoBoundary` in the
  saved snapshot.
- `src/components/editor/GeoBoundarySearch.tsx` — **inline** region search
  (debounced, AbortController-cancelled, results dropdown) mirroring the
  location search; no modal. Sits directly under "Wähle Deine Grenze aus".
- `src/components/sidebar/MapTab.tsx` — fifth "Grenzen" tile in the Kartenform
  picker (inline country-outline glyph) + the Grenz-Auswahl block (inline
  search + picked region as a removable ×-chip). The Außenbereich picker is
  NOT shown for geo-masks (only for shape masks).
- `src/components/editor/MapPreviewInner.tsx` — geo-boundary rendered as two
  MapLibre layers: an "overmask" fill (region masked out, painted in the
  poster background colour, always fully opaque) and a fixed contour line.
  Re-attached via the `idle` event after a layout/palette swap. Auto-fits the
  camera to the region's bounding box via `pendingFitBounds`.
- `src/components/editor/PosterCanvas.tsx` — geo-boundary excluded from the
  fullbleed inset-rect mask (its masking lives entirely in MapLibre).
- `src/hooks/useMapExport.ts` — `renderMapOffscreen` accepts an optional
  `geoOverlay`; the overmask + contour layers are baked into the offscreen
  export map so the print matches the editor.
- i18n keys `geoBoundary*` added to all five locales.

**Deviations / notes:**
- Until `/backend` ships the geo-boundaries API, search + geometry resolve via
  a **direct browser query to OpenStreetMap Nominatim** (`polygon_geojson=1`,
  `polygon_threshold=0.002`) — real, detailed admin borders, lightly
  simplified. This is a dev stopgap; the server-side proxy must take over for
  rate-limit compliance, ODbL attribution and caching. Nominatim returns the
  geometry inline with the search results, so it is cached client-side and
  `fetchGeoBoundary` reads it back without a second request.
- Verified: `tsc --noEmit` clean for all PROJ-51 files.

**Außenbereich + Formkontur — umgesetzt (zweite Iteration):**
- Neu: `src/lib/geo-shape.ts` — projiziert das Grenz-Polygon per
  `map.project()` in den A4-viewBox-Raum, gibt eine `ShapeDefinition` zurück.
- Neu: `src/hooks/useGeoShape.ts` — winziger Zustand für die projizierte Form
  (separat vom Editor-Store, damit nur PosterCanvas auf Pan-Frames reagiert).
- `MapPreviewInner` — die alten MapLibre-Geo-Ebenen sind raus; stattdessen
  wird pro Karten-Bewegung (rAF-throttled) projiziert und in `useGeoShape`
  geschrieben.
- `PosterCanvas` — splict die projizierte Form als `mask.shape` ein und
  übergibt `layoutMapHeight = 1`, damit der Composer 1:1 rendert. Außenbereich
  + Formkontur laufen jetzt über `composeMaskSvg`/`composeFrameSvg` — exakt
  derselbe Code wie für Herz/Kreis.
- `MapTab` — Außenbereich + Formkontur werden für Geo-Masken wieder
  eingeblendet (`shapeSupported || maskKey === 'geo-boundary'`).
- `useMapExport` — das alte `geoOverlay` (MapLibre-Karten-Ebenen-Bake) ist
  entfernt; der Export greift dieselbe projizierte Form aus `useGeoShape` ab
  (A4-normalisiert → auflösungsunabhängig identisch) und nutzt
  `applyComposedMask` + `composeFrameSvg`-Block — wie Form-Masken.

## Tech Design — Außenbereich + Formkontur für Geo-Masken (Follow-up)

### Warum der erste Ansatz scheiterte
Der Außenbereich wurde zunächst über **eigene MapLibre-Karten-Ebenen**
nachgebaut (Overmask-Fläche, Glow-Linie, Konturlinie). Das war instabil:
Flackern beim Regler-Ziehen, „distant style could not be loaded"-Fehler,
Updates kamen visuell nicht an. Die Karten-Ebenen-Methode ist ein Sonderweg,
der nichts mit dem bewährten Masken-Code teilt — jeder Effekt musste neu und
fehleranfällig nachgebaut werden.

### Der neue Ansatz: dieselbe Pipeline wie Herz/Kreis
Form-Masken (Herz, Kreis, Haus) funktionieren tadellos, weil sie alle durch
**einen** erprobten Weg laufen:
1. Jede Maske hat eine `ShapeDefinition` — eine feste SVG-Form (viewBox +
   Pfad-Markup).
2. `composeMaskSvg(shape, …)` baut daraus die Maske **inklusive Außenbereich**
   (Leer / Verblassen / Leuchten / Posterrand) — fertig komponiert.
3. `composeFrameSvg(shape, …)` baut daraus die **Formkontur** (innerer Rahmen).
4. Das Ergebnis wird als CSS-Maske / Overlay über die Karte gelegt.

Die Geo-Grenze bekommt **keinen Sonderweg mehr** — sie wird einfach zu einer
`ShapeDefinition` gemacht und durch genau dieselben Funktionen geschickt.
Dann gibt es Außenbereich **und** Formkontur „geschenkt", weil sie über
denselben, bereits funktionierenden Code laufen.

### Der Kern: die Geo-Form in eine ShapeDefinition übersetzen
Eine Form-Maske ist ein fester Pfad. Die Geo-Grenze ist ein geografisches
Polygon — ihre Bildschirmform hängt von Kartenausschnitt + Zoom ab. Lösung:

1. Bei Kartenbewegung jeden Polygon-Punkt (lng/lat) per `map.project()` in
   Bildschirm-Pixel umrechnen.
2. Diese Pixel in den **A4-viewBox-Koordinatenraum** (595,3 × 841,9)
   umrechnen, in dem der Composer ohnehin arbeitet.
3. Daraus einen SVG-Pfad bauen → eine `ShapeDefinition`, deren `viewBox` und
   `width`/`height` **exakt der A4-Leinwand entsprechen**.

**Wichtige Erkenntnis aus der Composer-Analyse:** Wenn die ShapeDefinition
genau die A4-Maße hat, ist der „Einpass-/Zentrier"-Schritt des Composers eine
**Identität** (Skalierung = 1, Versatz = 0). Der Composer behandelt die
Geo-Form also wie jede andere Maske — **es ist voraussichtlich keine
Composer-Änderung nötig.** (Falls beim Bau ein Sonderfall auftaucht, bekommt
der Composer einen einfachen „Pfad-1:1-übernehmen"-Schalter — kein Umbau.)

### Komponenten-Struktur / Datenfluss
```
Karte bewegt sich (pan / zoom)
  └─ Geo-Shape-Projektor  [NEU]
       ├─ projiziert das Grenz-Polygon → SVG-Pfad im A4-Raum
       └─ legt eine dynamische ShapeDefinition in den Editor-Store

PosterCanvas (bestehend)
  └─ liest mask.shape  →  für Geo: die dynamische ShapeDefinition
       ├─ composeMaskSvg(shape, shapeConfig)   → Maske + Außenbereich
       └─ composeFrameSvg(shape, shapeConfig)  → Formkontur
       (exakt derselbe Pfad wie Herz/Kreis)

→ Die bisherigen MapLibre-Geo-Ebenen (Overmask/Kontur) entfallen.
```

### Kartenbewegung — Trade-off
Die Karten-Ebenen-Methode reprojizierte automatisch pro Frame (GPU). Der
SVG-Weg muss bei Kartenbewegung in JavaScript neu projizieren und die Maske
neu rastern. Empfehlung: **bei jeder Bewegung neu projizieren, auf einen
Frame pro Anzeige-Tick gedrosselt** (`requestAnimationFrame`). Für ein
moderat vereinfachtes Polygon ist das performant genug. Fallback, falls es
ruckelt: nur am Ende der Bewegung aktualisieren (minimale Verzögerung beim
Pannen). Diese Entscheidung fällt final in der Umsetzung anhand echter
Messung.

### Was wegfällt / sich ändert
- Die MapLibre-Geo-Ebenen in `MapPreviewInner` (Overmask + Kontur) entfallen —
  ersetzt durch den Composer-Weg in `PosterCanvas`.
- `MapTab`: der Außenbereich-Picker + die Formkontur-Sektion werden für
  Geo-Masken wieder eingeblendet (sie funktionieren dann über den Composer).
- `useMapExport`: nutzt den bestehenden `applyComposedMask`-Pfad (den
  Form-Masken schon verwenden) statt der Geo-Sonderbehandlung — der Export
  muss dieselbe Projektion verwenden wie die Editor-Vorschau.

### Datenmodell
Keine neuen gespeicherten Felder. Die dynamische ShapeDefinition ist ein
**Laufzeit-Wert** (aus `geoBoundary.geometry` + aktueller Kartenprojektion
abgeleitet) — nicht persistiert. `geoBoundary` selbst (Region + Polygon)
wird wie bisher im Projekt gespeichert.

### Abhängigkeiten
Keine neuen Pakete — `composeMaskSvg`/`composeFrameSvg`, der Editor-Store und
die MapLibre-Projektion sind alle bereits vorhanden.

### Risiken
- **Performance** der Pro-Frame-Neuprojektion (siehe Trade-off oben) — über
  Drosselung beherrschbar.
- **Editor-Vorschau vs. Export** müssen exakt dieselbe Projektion verwenden,
  sonst weicht der Druck ab — der Export rendert die Karte headless mit eigener
  Größe, die Projektion muss auf dessen Viewport gerechnet werden.
- Empfehlung: Umsetzung mit **stabiler Verbindung und direkter Browser-Sicht**
  — das Live-Debugging eines Masken-Renderings über einen reinen Chat-Kanal
  hat sich als untauglich erwiesen.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

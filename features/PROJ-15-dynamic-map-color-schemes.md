# PROJ-15: Dynamische Map-Farbschemen

## Status: Planned
**Created:** 2026-04-21
**Last Updated:** 2026-04-21

## Dependencies
- Requires: PROJ-1 (Karten-Editor Core) — nutzt den bestehenden MapTiler-SDK-Renderer

## Problem & Ziel
Aktuell muss der Betreiber für jede Farbvariante einer Karte in MapTiler Studio einen kompletten neuen Style entwerfen und als Datei hinterlegen. Das skaliert nicht: jede zusätzliche Farbkombination (Mint, Sand, Navy, …) bedeutet manuelle Arbeit, Versionierung, Upload.

PROJ-15 entkoppelt **Layout** (was wird dargestellt: Straßen, Wasser, Labels, Liniendicken) von **Farbgebung** (welche Farbe hat Land, Wasser, Straße, Label). Das Layout bleibt in wenigen Basis-Styles definiert. Farben werden zur Laufzeit angewendet, entweder über voreingestellte Paletten oder freie Farbwahl.

## User Stories
- Als Betreiber will ich ein Basis-Layout einmal in MapTiler Studio designen und im Editor beliebig viele Farbvarianten freischalten, ohne einen neuen Style zu erstellen.
- Als Betreiber will ich eine Galerie von vordefinierten Farbpaletten (z. B. "Mint", "Sand", "Navy", "Terracotta") anbieten, aus der Nutzer wählen können.
- Als End-Nutzer will ich neben dem Basis-Style eine Farbe wählen und sofort sehen, wie Land, Wasser, Straßen und Labels in dieser Farbe aussehen.
- Als End-Nutzer will ich optional eine freie Farbe (Farbwähler) wählen, wenn die Paletten nicht reichen.
- Als End-Nutzer will ich Straßennamen ein- oder ausblenden können, damit ich je nach Poster-Stimmung mehr oder weniger Detail auf der Karte habe.
- Als Betreiber will ich neue Paletten ergänzen können, ohne das MapTiler-Backend anzufassen — idealerweise nur via Code oder später Admin-UI.

## Acceptance Criteria
- [ ] Mindestens zwei Basis-Layouts (z. B. *Minimal*, *Detailliert*) liegen als MapTiler-Style-JSONs im Repo und bleiben rein auf Layout/Typografie fokussiert — keine bindenden Farben für Land/Wasser/Straßen/Labels.
- [ ] Ein Transformer-Modul akzeptiert: Basis-Style + Farbpalette → liefert fertigen Style-JSON, bei dem die Land-, Wasser-, Straßen- und Label-Layer die gewählten Farben haben.
- [ ] Der Editor zeigt zwei Auswahlreihen: zuerst **Layout**, dann **Farbpalette** (oder freie Farbwahl).
- [ ] Mindestens **6 vordefinierte Paletten** stehen zur Auswahl, passend zur Marke petite-moment.
- [ ] Der Editor zeigt eine kleine Farbvorschau pro Palette (z. B. 4 Farbkreise für Land/Wasser/Straße/Label).
- [ ] Die Farbwahl überlebt Reload und wird im `projectId`-Snapshot mitgespeichert, damit Projekte später identisch wiederhergestellt werden können.
- [ ] Die Farbwahl fließt in den Export (PNG/PDF) unverändert mit ein.
- [ ] Ein freier Farbwähler (Hex) ist unter einer Accordion-Zeile "Eigene Farbe" verfügbar — Änderung dort setzt eine neue „custom"-Palette basierend auf einer Heuristik (z. B. Grundton wählt sofort Land + passende Wasser-/Straßen-Töne).
- [ ] Ein Toggle **"Straßennamen anzeigen"** im Editor blendet alle textbasierten Straßenlabels der Karte ein/aus. Standard: aus (klareres Posterbild), der Nutzer kann explizit einschalten. Einstellung wird im Projekt-Snapshot mitgespeichert und fließt in den Export ein.

## Edge Cases
- Farbpalette passt nicht zum Basis-Layout (z. B. Schwarz auf Dunkelblau → Labels unlesbar) → Heuristik stellt sicher, dass Labels immer ausreichend Kontrast zum Land haben; zur Not wird Label-Farbe auf Weiß/Schwarz gesetzt.
- Transformer wird mit ungültigem Hex-Wert aufgerufen → Fallback auf neutrale Default-Palette, keine Exception an den User.
- User speichert ein Projekt mit einer Palette, die später aus dem Code entfernt wird → Projekt behält die alten RGB-Werte (werden mitgespeichert, nicht nur die Palette-ID).
- MapTiler-SDK erhält einen sehr großen Style-JSON → Transformer soll idempotent sein und bei erneuter Anwendung nichts doppelt färben.

## Non-Goals
- Kein vollständiger Style-Editor für End-User (keine Liniendicken, keine Font-Wahl, kein Layer-Toggle außer Straßennamen).
- Kein Upload eigener MapTiler-Styles via Admin-UI in V1 — das wäre PROJ-16+.
- Keine automatische Farbextraktion aus einem Bild ("Lade Foto hoch, wir generieren Palette") — kann später als V2 dazukommen.

## Open Questions
- Soll der freie Farbwähler nur den Grundton erfassen (Land), oder mehrere Farben einzeln? Entscheidung beim Architecture-Schritt.
- Welche Layer im Style-JSON werden konkret transformiert? Abhängig von den Basis-Layouts, die der Betreiber designt — muss im Architecture-Schritt zusammen mit einem konkreten Beispiel-Style geklärt werden.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Gesamtablauf

```
[User wählt Preset + Farbpalette + Straßen-Toggle]
              |
              v
[Editor-Store speichert: base_style_id, palette_id, streets_visible]
              |
              v
[Style-Transformer]
   liest: Basis-Style-JSON (aus /public/map-styles/*.json)
   wendet an: Palette → Farben auf getaggte Layer
   setzt: Sichtbarkeit der Straßennamen-Layer
              |
              v
[Transformer gibt fertigen Style-JSON zurück]
              |
              v
[MapTiler SDK rendert die Karte mit diesem Style-Objekt]
```

Wichtig: das SDK akzeptiert Style-JSON **direkt**, nicht nur eine URL. Heißt: keine eigenen Tile-Server, kein Build-Schritt — Transformation passiert in-memory bei jedem Style-/Farb-Wechsel.

### B) Komponenten-Struktur

```
poster-generator
│
├── public/map-styles/              ← Basis-Layouts (einmalig in MapTiler Studio designt, als JSON exportiert)
│   ├── minimal.json
│   └── detailed.json
│
├── src/lib/map-palettes.ts         ← Farbpaletten-Definitionen (6 vordefinierte)
├── src/lib/map-style-transformer.ts ← Core-Logik: Basis-Style + Palette → finaler Style
├── src/hooks/useEditorStore.ts     ← erweitert um paletteId + streetsVisible
└── src/components/sidebar/MapTab.tsx ← neue UI-Elemente (Palette-Picker, Straßen-Toggle)
```

### C) Datenmodell

**Palette** (in Code):
- ID (z. B. `mint`, `sand`, `navy`)
- Label (Anzeigename: "Mint", "Sand", "Navy")
- Farben: Land, Wasser, Straße, Label (je als Hex-String)

**Basis-Style-JSON** (in MapTiler Studio erstellt, im Repo abgelegt):
- Vollständiger MapTiler-Style (Mapbox-Style-Spec kompatibel)
- Jede für Farbe relevante Layer bekommt in der `metadata`-Property einen **Rollen-Tag**, z. B. `"petite-moment:role": "water"`
- So weiß der Transformer, welche Farbe auf welche Layer soll — unabhängig von den konkreten Layer-Namen

**Editor-Store-Zustand** (neu):
- `paletteId` (string, Palette-ID oder `"custom"`)
- `customPaletteColors` (falls free-color-picker)
- `streetsVisible` (boolean, default `false`)
- All das landet zusätzlich im Projekt-Snapshot, damit gespeicherte Projekte reproduzierbar bleiben

### D) Tech-Entscheidungen

| Entscheidung | Begründung |
|-------------|-----------|
| **Transformation clientseitig** (nicht serverseitig) | Keine Latenz, keine Server-Kosten, Style wird schon beim Farbwechsel in <10 ms neu berechnet. MapTiler SDK rendert den Style-Object direkt. |
| **Basis-Styles als JSON im Repo**, nicht von MapTiler-URL | Versionierung via Git, atomare Änderungen, kein Vendor-Lock auf MapTiler's Style-Hosting. Kann später gegen eigenen CDN getauscht werden. |
| **Rollen-Tagging in Layer-Metadata** statt Layer-Name-Matching | Robust gegen Style-Änderungen — wenn du einen Layer umbenennst oder splittest, musst du nur das Tag korrekt setzen, der Transformer bleibt gleich. |
| **Freie Farbe nur als Grundton**, Rest wird per Heuristik abgeleitet | Keine 4 Color-Picker, sondern ein Grundton → Transformer leitet komplementäre Farben ab (z. B. Grundton = Wasser, Land als hellere Variante, Label als dunkle kontrastreiche Variante). Weniger Friction im UI. |
| **Straßen-Toggle default: aus** | Poster-typische Nutzung bevorzugt klares Bild. User kann explizit anschalten. |

### E) Paletten-Vorschläge (6 für V1)

1. **Mint** — frisches Grün-Weiß, hochzeits-geeignet
2. **Sand** — warme Beigetöne, südlich-entspannt
3. **Navy** — tiefes Blau + Creme, klassisch maritim
4. **Terracotta** — warmes Ziegelrot + Beige, italienisch
5. **Slate** — kühles Grau + Weiß, minimalistisch
6. **Forest** — dunkles Grün + Creme, outdoor-verbunden

Der freie Farbwähler erzeugt eine 7. "custom"-Palette on-demand.

### F) Abhängige Packages

Keine neuen. `@maptiler/sdk` ist bereits installiert und kann Style-JSON direkt konsumieren.

### G) Migrations-Schritte

1. Bestehende Map-Stile-Einbindung (aktuell via `styleId` → MapTiler-URL) prüfen und auslesen.
2. Vom Betreiber in MapTiler Studio 2 neue farb-neutrale Basis-Styles designen, mit `metadata."petite-moment:role"` auf den 4 Ziel-Layern.
3. Basis-Styles als JSON nach `public/map-styles/` exportieren.
4. Transformer-Code + Paletten-Lib schreiben.
5. MapTab-UI erweitern (Palette-Picker + Straßen-Toggle).
6. Editor-Store + Projekt-Snapshot erweitern.
7. Export-Pipeline (PROJ-3) prüfen: nutzt sie den gleichen transformierten Style? Ja — kein extra Fix nötig, falls sie beim Export die aktive Map-Instanz referenziert.

### H) Risiken / offene Punkte

- **MapTiler-Layer-Struktur** der neuen Basis-Styles muss geplant werden. Bevor der Transformer gebaut wird, braucht es den **fertigen JSON-Export eines ersten Basis-Styles** — sonst wissen wir nicht, welche Layer-Rollen wir überhaupt abdecken müssen.
- **Font-Farben für Labels**: Bei dunklen Paletten muss Label-Farbe automatisch auf hell schalten, sonst unlesbar. Heuristik: Luminanz des Land-Tons bestimmt Label-Farbe.
- **Performance**: bei Farb-Slider-Bewegung entsteht viel Style-Update-Traffic — Transformer muss idempotent und schnell sein (<5 ms), Style-Updates sollten via `map.setStyle(newStyle)` gehen, nicht via Neu-Mount.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

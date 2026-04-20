# PROJ-7: Stern-Karten-Generator

## Status: In Review
**Created:** 2026-04-19
**Last Updated:** 2026-04-19

## Dependencies
- Requires: PROJ-2 (Textblock-Editor) — gleiche Text-Overlay-Logik
- Requires: PROJ-3 (Poster-Export) — gleiche Export-Pipeline
- Optional: PROJ-5 (Projekt-Verwaltung) — Sternkarten als Projekte speichern
- Optional: PROJ-6 (Stripe-Payments) — Sternkarten-Export kostenpflichtig

## User Stories
- Als Nutzer möchte ich eine Sternkarte für einen bestimmten Ort und Zeitpunkt generieren können (z.B. Hochzeitsnacht)
- Als Nutzer möchte ich Datum und Uhrzeit für die Sternkarte wählen können
- Als Nutzer möchte ich den Nachthimmel in meinem Poster als romantische Alternative zur Stadtkarte verwenden
- Als Nutzer möchte ich Textblöcke auf der Sternkarte positionieren können (wie beim Karten-Editor)
- Als Nutzer möchte ich die Sternkarte als PNG oder PDF exportieren können

## Acceptance Criteria
- [ ] Eingabe: Ort (Adresse/Koordinaten) + Datum + Uhrzeit
- [ ] Sternfeld wird prozedural generiert basierend auf Echtdaten (bright-stars.json mit Helligkeit, Position)
- [ ] Mindestens 2.000 Sterne werden gerendert (Helligkeit beeinflusst Größe/Opacity)
- [ ] Sternbild-Linien optional sichtbar (On/Off Toggle)
- [ ] Hintergrundfarbe anpassbar (typisch: Dunkelblau, Schwarz)
- [ ] Sternfarbe anpassbar (Weiß, Gold, etc.)
- [ ] Textblock-Editor integriert (gleiche Komponente wie PROJ-2)
- [ ] PNG- und PDF-Export (gleiche Pipeline wie PROJ-3)
- [ ] Separate Seite (/star-map) oder Tab im gleichen Editor

## Edge Cases
- Was passiert, wenn der Nutzer kein Datum eingibt? → Aktuelles Datum/Uhrzeit als Standard
- Was passiert für Koordinaten nahe den Polen? → Sternfeld zeigt korrekte Projektion (oder Fallback-Hinweis)
- Was passiert bei sehr kleinem Viewport? → Sternfeld skaliert proportional
- Was passiert, wenn star-data nicht geladen werden kann? → Fallback-Fehlermeldung

## Technical Requirements
- Sterndaten: bright-stars.json aus `/public/data/` (equatoriale Koordinaten)
- Projektion: Azimutale Gleichabstandsprojektion (oder vereinfachte Version)
- Rendering: Canvas-basiert oder SVG
- Seeded Random: Sternpositionen deterministisch aus lat/lon/date (reproduzierbare Ergebnisse)
- Export: gleiche Canvas-Rendering-Pipeline wie PROJ-3

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten
```
/star-map (Seite)
└── EditorLayout (gleiche Struktur wie /map)
    ├── Sidebar (shadcn Tabs)
    │   ├── StarMapTab
    │   │   ├── LocationSearch    (Geocoding, gleich wie MapTab)
    │   │   ├── DateTimePicker    (shadcn + native datetime-local Input)
    │   │   ├── ColorControls     (Hintergrund + Sternfarbe)
    │   │   └── ConstellationToggle (Sternbild-Linien an/aus)
    │   ├── TextTab               (PROJ-2 Komponente, unverändert)
    │   └── ExportTab             (PROJ-3 Komponente, unverändert)
    └── StarMapCanvas
        └── StarField             (Canvas-Element, prozedurales Rendering)
```

### Rendering-Pipeline
```
Eingabe: lat, lng, datetime, bgColor, starColor, showConstellations
  → bright-stars.json laden (einmalig, gecacht)
  → Äquatoriale Koordinaten (RA/Dec) → Horizontale Koordinaten (Az/Alt)
  → Azimutale Projektion → 2D Canvas-Koordinaten
  → Canvas: Hintergrund füllen → Sterne zeichnen (Radius ∝ Helligkeit)
  → Optional: Sternbild-Linien
  → Export: gleiche Canvas-Snapshot-Pipeline wie PROJ-3
```

### Sterndaten
- `bright-stars.json` aus `/public/data/` (aus dem alten Projekt übernehmen)
- Format: Array von [RA, Dec, Magnitude, Name?]
- Projektion: Standardmathematik, kein externes Paket nötig

### Keine neuen Packages
- Canvas-Rendering: native Browser Canvas API
- Datum/Zeit: native JS Date-Objekte
- Projektion: eigene Utility-Funktion in `lib/star-projection.ts`

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

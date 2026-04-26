# PROJ-1: Karten-Editor Core

## Status: In Progress
**Implementation Notes:** MapTiler SDK v3.8.0 (nicht v4 — Breaking Changes). Verwendet `next/dynamic` mit `ssr: false` da MapTiler Browser-only ist. PosterCanvas berechnet Poster-Dimensionen via ResizeObserver für zuverlässiges Rendering.

**2026-04-26 — Outer-Mode `glow` ergänzt:** Neben den bestehenden Außenbereich-Modi (`none` / `opacity` / `full`) gibt es jetzt einen vierten Modus `glow`, der eine geblurrte Kopie der Form als Halo unter die solide Form rendert (`feGaussianBlur` in der Mask-SVG). Erzeugt einen weichen radialen Übergang entlang der Form-Kontur statt eines gleichmäßigen Rechtecks. Zwei neue Parameter im `outer`-Config: `glowRadius` (mm, 1–30, Default 8) und `glowIntensity` (0..1, Default 0.5). UI in `MapTab.tsx` (Desktop) und `MobileLayoutTab.tsx` (Mobile); Mode-Picker wechselt von 3-Spalten auf 2×2-Grid. Funktioniert sowohl im Preview-Pfad (CSS `maskImage`) als auch im Export-Pfad (Canvas `destination-in`) ohne Pipeline-Änderungen, da Browser SVG-Filter beim Image-Load rasterisieren. iOS Safari bei `mask-image` mit Filtern noch nicht verifiziert — falls Probleme auftreten, alternativen Render-Pfad mit zwei separaten Masken-Layern bauen.

**Created:** 2026-04-19
**Last Updated:** 2026-04-26

## Dependencies
- None (Einstiegspunkt der App)

## User Stories
- Als Nutzer möchte ich einen Ort per Name/Straße/Stadt suchen können, damit die Karte automatisch auf diesen springt
- Als Nutzer möchte ich die Karte zoomen und verschieben können, damit ich genau den richtigen Ausschnitt wähle
- Als Nutzer möchte ich zwischen verschiedenen Karten-Stilen wählen können (z.B. klassisch, dunkel, minimal), um die Ästhetik an meinen Geschmack anzupassen
- Als Nutzer möchte ich einen Formausschnitt (Herz, Kreis, Oval, etc.) auf die Karte anwenden können, damit das Poster einzigartig aussieht
- Als Nutzer möchte ich einen optionalen Marker-Pin auf der Karte platzieren können, um einen konkreten Punkt hervorzuheben

## Acceptance Criteria
- [ ] Suchfeld mit Autocomplete gibt Ortsvorschläge via MapTiler Geocoding API zurück
- [ ] Bei Auswahl eines Orts springt die Karte auf die korrekten Koordinaten
- [ ] Karte ist interaktiv: Pan und Zoom per Maus/Touch
- [ ] Mindestens 8 Karten-Stile zur Auswahl (streets, basic, bright, toner, backdrop + mindestens 3 weitere)
- [ ] Mindestens 6 Formmasken: none, circle, heart, soft-circle, arched-window, vintage-oval (+ weitere)
- [ ] Masken-Vorschau in der Sidebar zeigt Icons/Thumbnails zur Auswahl
- [ ] Marker-Pin kann aktiviert/deaktiviert werden (Typ: klassisch oder Herz, Farbe anpassbar)
- [ ] Alle Änderungen am Karten-Ausschnitt werden in Echtzeit in der Vorschau angezeigt
- [ ] Papierformat-Auswahl (A4, A3, A2) beeinflusst das Seitenverhältnis der Vorschau

## Edge Cases
- Was passiert, wenn die Geocoding API kein Ergebnis liefert? → Fehlermeldung "Kein Ort gefunden" anzeigen
- Was passiert bei sehr langen Ortsnamen im Suchfeld? → Texteingabe kürzen, UI bricht nicht
- Was passiert, wenn der Nutzer auf maximalen/minimalen Zoom-Level stößt? → Karte hört auf zu zoomen, kein Fehler
- Was passiert bei schlechter Internetverbindung? → Karte zeigt leere Kacheln, Toast-Benachrichtigung
- Was passiert, wenn der Nutzer die Maske auf "none" setzt? → Karte wird als vollständiges Rechteck angezeigt

## Technical Requirements
- MapTiler SDK v3+ für interaktive Karte
- MapTiler Geocoding API für Ortssuche
- SVG-Masken in `/public/masks/` (CSS mask-image Technik)
- Kein Drag-Rotate (ästhetische Gründe für Poster)
- Viewport-Dimensionen (Breite/Höhe/Zoom/Bounds) als State für den Export-Schritt

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten
```
/map (Seite)
└── EditorLayout
    ├── Sidebar (shadcn Tabs: Karte / Text / Export)
    │   └── MapTab
    │       ├── SearchInput       (Combobox + Autocomplete via /api/geocode)
    │       ├── StylePicker       (Grid mit Vorschau-Thumbnails, RadioGroup)
    │       ├── MaskPicker        (Grid mit SVG-Icon-Vorschau, RadioGroup)
    │       ├── MarkerControls    (Switch + Select Typ + ColorPicker)
    │       └── FormatSelector    (ToggleGroup: A4 / A3 / A2)
    └── PosterCanvas
        ├── MapPreview            (MapTiler SDK Wrapper, "use client")
        ├── MaskOverlay           (div mit CSS mask-image auf SVG aus /public/masks/)
        └── MarkerPin             (absolut positioniert, inline SVG)
```

### State
- Zustand Store (`useEditorStore`): lng, lat, zoom, bounds, viewport, styleId, maskKey, marker, printFormat
- MapPreview meldet ViewState-Änderungen an Store (onMove Callback)
- Alle Sidebar-Controls lesen/schreiben direkt in den Store

### Datenhaltung
- Kein Backend für dieses Feature — reiner Client-State
- ViewState wird an PROJ-3 (Export) und PROJ-5 (Speichern) weitergegeben

### Neue Packages
- `@maptiler/sdk` — interaktive Karte + Geocoding API
- `zustand` — globaler Editor-Store

### API-Routen
- `GET /api/geocode?query=…` — Proxy zu MapTiler Geocoding (API-Key server-seitig)

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

# PROJ-3: Poster-Export (PNG & PDF)

## Status: Approved
**Reality-Check 2026-05-03:** useMapExport, ExportTab, /api/static-map, /api/products, Cart + Checkout-Flow vorhanden — Admin-Free-Export und Customer-Produktauswahl beide implementiert. Auf Approved gehoben.

**Created:** 2026-04-19
**Last Updated:** 2026-05-03

## Dependencies
- Requires: PROJ-1 (Karten-Editor Core) — Karten-State wird für Export verwendet
- Requires: PROJ-2 (Textblock-Editor) — Textblöcke werden auf Export gerendert
- Requires: PROJ-4 (User Authentication) — Rollenprüfung (Admin vs. Kunde)

## User Stories

### Admin
- Als Admin möchte ich mein Poster kostenlos als PNG herunterladen können
- Als Admin möchte ich mein Poster kostenlos als PDF herunterladen können
- Als Admin möchte ich das Papierformat wählen können (A4, A3, A2)

### Kunde (eingeloggt oder Gast)
- Als Kunde möchte ich im Export-Tab drei Produkte sehen: Digitaler Download, Poster, Bilderrahmen
- Als Kunde möchte ich den Preis je Produkt und gewählter Größe sehen können
- Als Kunde möchte ich ein Produkt auswählen und zum Warenkorb hinzufügen können
- Als Kunde möchte ich nach dem Hinzufügen zum Warenkorb direkt zum Checkout weitergeleitet werden können

## Acceptance Criteria

### Rendering (gilt für Admin-Export und interne Nutzung)
- [ ] PNG-Export mit mindestens 300 DPI Auflösung für das gewählte Papierformat
- [ ] PDF-Export als einseitiges, druckfertiges PDF im gewählten Format
- [ ] Papierformate: A4 (210×297mm), A3 (297×420mm), A2 (420×594mm)
- [ ] Exportiertes Bild enthält: Karte mit angewendeter Maske, alle Textblöcke korrekt positioniert und skaliert
- [ ] Marker-Pin wird im Export korrekt gerendert (wenn aktiviert)
- [ ] Formmaske wird im Export korrekt angewendet (SVG compositing auf Canvas)
- [ ] Während des Exports: Ladeanzeige mit Fortschrittsindikator
- [ ] Dateiname enthält den Ortsnamen (z.B. "muenchen-poster.png")

### Admin-Export-UI (nur für eingeloggte Admins)
- [ ] Export-Tab zeigt PNG- und PDF-Download-Button (kostenfrei, kein Warenkorb)
- [ ] Export-Buttons deaktiviert während aktiver Generierung

### Kunden-Produkt-UI (für alle Nicht-Admins)
- [ ] Export-Tab zeigt drei Produktkarten: Digitaler Download, Poster, Bilderrahmen
- [ ] Jede Produktkarte zeigt Name, kurze Beschreibung und Preis für die gewählte Größe
- [ ] Preis aktualisiert sich dynamisch wenn der Nutzer das Papierformat wechselt
- [ ] Auswahl eines Produkts hebt die Karte visuell hervor
- [ ] Button "In den Warenkorb – X€" zeigt den Preis des gewählten Produkts
- [ ] Klick auf Button fügt Produkt + Format + Poster-State dem Warenkorb hinzu

## Edge Cases
- Was passiert, wenn die MapTiler API während des Exports nicht erreichbar ist? → Fehlermeldung, Export abbrechen
- Was passiert, wenn der Nutzer das Browserfenster während des Exports schließt? → Download geht verloren
- Was passiert bei sehr langen Texten? → Text wird abgeschnitten oder umgebrochen (wie in Vorschau)
- Was passiert, wenn ein Nicht-Admin die Admin-Export-URL direkt aufruft? → Produkt-UI wird angezeigt, kein freier Download
- Was passiert, wenn noch kein Produkt gewählt wurde und der Nutzer auf "In den Warenkorb" klickt? → Button inaktiv, Hinweis "Bitte Produkt wählen"

## Technical Requirements
- Offscreen MapTiler Map-Instanz für sauberes High-DPI-Rendering
- Canvas API für Bildkomposition (Karte + Maske + Text + Marker)
- pdf-lib für PDF-Generierung aus PNG-Bytes
- Pixel-Ratio Berechnung: outputWidth / previewWidth
- Export läuft client-seitig (kein Server-Rendering nötig für Basis-Export)
- SVG-Maske via globalCompositeOperation: "destination-in" auf Canvas

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten
```
Sidebar › ExportTab
├── FormatInfo          (Auflösung in px bei gewähltem Format + DPI)
├── ExportButton (PNG)  (Button + Progress-Anzeige)
└── ExportButton (PDF)  (Button + Progress-Anzeige)
```

### Export-Pipeline (client-seitig)
```
1. useMapExport Hook aufrufen
2. Offscreen MapTiler Map-Instanz erstellen (hidden div)
3. Warten bis Karte stabil geladen (waitForMapStable)
4. Canvas extrahieren (map.getCanvas())
5. Skalieren auf Export-Auflösung (pixelRatio = outputW / previewW)
6. SVG-Maske anwenden (globalCompositeOperation: destination-in)
7. Footer-Bereich zeichnen (weißer Hintergrund)
8. Textblöcke zeichnen (skalierte Positionen + Schriftgrößen)
9. Marker-Pin zeichnen (wenn aktiviert)
10. PNG: canvasToBlob → download
    PDF: pngBytes → pdf-lib → PDFDocument → download
```

### Auflösungen
- A4 @ 300 DPI: 2480 × 3508 px
- A3 @ 300 DPI: 3508 × 4961 px
- A2 @ 300 DPI: 4961 × 7016 px

### Neue Packages
- `pdf-lib` — PDF-Generierung aus PNG-Bytes

### API-Routen
- `GET /api/static-map` — Proxy zu MapTiler Static Maps (für hochauflösende Kacheln)

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

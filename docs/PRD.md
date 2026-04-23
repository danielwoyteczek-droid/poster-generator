# Product Requirements Document

## Vision
Ein webbasierter Karten-Poster-Generator, mit dem Nutzer ohne Designkenntnisse professionelle Poster ihrer Lieblingsorte erstellen können. Nutzer suchen einen Ort, passen die Karte mit Stilen und Formausschnitten an, fügen Text hinzu und exportieren das fertige Poster als PNG oder PDF.

## Target Users
**Hauptzielgruppe: Nicht-Designer (Verbraucher)**
- Menschen, die einen besonderen Ort (Heimatstadt, Urlaubsort, Hochzeitsort) als Wanddeko festhalten möchten
- Keine Designerfahrung erforderlich
- Suchen nach einer schnellen, intuitiven Lösung mit professionellem Ergebnis
- Bereit, für hochauflösende Druckdateien zu bezahlen

## Core Features (Roadmap)

| Priority | Feature | Status |
|----------|---------|--------|
| P0 (MVP) | Karten-Editor (Suche, Stile, Masken) | Planned |
| P0 (MVP) | Textblock-Editor (Drag & Drop) | Planned |
| P0 (MVP) | Poster-Export (PNG & PDF) | Planned |
| P0 (MVP) | User Authentication | Planned |
| P0 (MVP) | Projekt-Verwaltung (Speichern/Laden) | Planned |
| P1 | Stripe-Bezahlsystem (3 Produkte: Download, Poster, Bilderrahmen) | Planned |
| P1 | Admin-Bestellverwaltung (Fulfillment für physische Produkte) | Planned |
| P2 | Stern-Karten-Generator | Planned |
| P1 | Homepage (Landing Page) | Planned |
| P1 | Layout-Presets (Textposition + Innenrand) | Planned |

## Success Metrics
- Conversion Rate: >5% der anonymen Nutzer erstellen ein Konto
- Export Rate: >20% der registrierten Nutzer kaufen einen Export
- Session Duration: Ø >5 Minuten auf der Editor-Seite
- Poster-Erstellungen pro Tag: >50 innerhalb von 3 Monaten

## Constraints
- Technisch: MapTiler API für Karten und Geocoding (kostenpflichtig nach Volumen)
- Budget: Indie-Projekt, minimale laufende Kosten
- Timeline: Schrittweiser Aufbau, MVP zuerst
- Team: Solo-Entwickler

## Non-Goals
- Kein vollständiger Designeditor (kein Canva-Klon)
- Keine mobilen nativen Apps (nur Web, responsive)
- Kein externer Print-on-Demand-Dienst (Druck & Versand erfolgt manuell durch den Betreiber)
- Kein Social-Sharing oder Community-Features in MVP

---

Use `/requirements` to create detailed feature specifications for each item in the roadmap above.

# PROJ-19: Foto-Integration im Poster

## Status: Planned
**Created:** 2026-04-21
**Last Updated:** 2026-04-21

## Dependencies
- Requires: PROJ-1 (Karten-Editor Core) — Masken- und Split-Layout-System existiert bereits
- Requires: PROJ-3 (Poster-Export) — Bilder müssen in den PNG/PDF-Export einfließen
- Requires: PROJ-5 (Projekt-Verwaltung) — hochgeladene Bilder müssen im Projekt-Snapshot persistieren

## Problem & Ziel
Heute kann ein Kunde nur Kartendaten auf sein Poster bringen. Emotional starke Poster entstehen aber, wenn zusätzlich **ein persönliches Foto** in die Gestaltung einfließt — z. B. das Paar auf der linken Posterhälfte, die Karte des Kennenlern-Orts auf der rechten. Aktuell ist das technisch nicht möglich.

PROJ-19 öffnet den Editor für **Bild-Uploads** und lässt diese in vordefinierten Foto-Masken platzieren, analog zur bestehenden Karten-Masken-Logik. Ergebnis: Split-Poster (Karte + Foto), Bildkreis im Textblock-Bereich, oder frei platzierbare Foto-Elemente.

## User Stories
- Als Kunde will ich ein Foto von meinem Handy/Computer hochladen und in meinem Poster platzieren.
- Als Kunde will ich eine Split-Variante wählen (z. B. Karte links, Foto rechts), die die bestehenden Split-Masken aus dem Maskensystem erweitert.
- Als Kunde will ich das hochgeladene Foto innerhalb seiner Maske verschieben, zoomen und zuschneiden, damit der relevante Bildausschnitt sichtbar ist.
- Als Kunde will ich das Bild in einer anderen Maskenform (Kreis, Herz, Rechteck) zusätzlich zur Karte platzieren — z. B. ein kleiner Portrait-Kreis zwischen den Textblöcken.
- Als Kunde will ich beim Re-Öffnen meines gespeicherten Projekts das Bild unverändert wiederfinden.
- Als Kunde will ich sicher sein, dass mein privates Foto nicht öffentlich zugänglich ist und nach dem Druck gelöscht wird.
- Als Betreiber will ich Bilder nach Fulfillment aus dem Storage entfernen können, um Storage-Kosten unter Kontrolle zu halten.

## Acceptance Criteria
- [ ] **Upload-Komponente** im Editor:
  - Drag-and-Drop + Click-to-Browse
  - Akzeptierte Formate: JPG, PNG, HEIC (iPhone)
  - Max. Dateigröße: 10 MB, Warnung bei größeren Dateien
  - Client-seitige Kompression auf Druck-tauglich (z. B. max. 2400 px lange Kante, 85 % JPEG-Qualität) bevor Upload
- [ ] **Storage**: Upload landet in Supabase Storage (Bucket `user-photos`, privat, signed URLs)
- [ ] **Foto-Masken-System**: parallel zu `map-masks`, neue Sammlung für Foto-Platzhalter
  - Mindestens: Vollbild, Kreis, Herz, Quadrat, Hochformat, Querformat
  - Split-Varianten (Karte + Foto): vertikaler Split, horizontaler Split, Kreise-Split, Herzen-Split
- [ ] **Inner-Crop**: Bild innerhalb der Maske kann verschoben/gezoomt werden, damit der richtige Ausschnitt gezeigt wird. Crop-State wird im Snapshot gespeichert.
- [ ] **Snapshot-Integration**: Hochgeladene Foto-Referenz (Storage-URL + Crop-State) ist Teil des Projekt-Snapshots, überlebt Speichern/Laden.
- [ ] **Export**: Foto wird in voller hochgeladener Auflösung in den PNG/PDF-Export eingebettet, beschnitten wie im Editor.
- [ ] **DSGVO**:
  - Foto-Uploads sind privat (RLS auf Bucket: Owner = Uploader)
  - In der Datenschutzerklärung explizit erwähnt: Speicherort, Aufbewahrungsdauer, Löschung nach Fulfillment
  - Admin-Funktion: Fotos zu abgeschlossenen Bestellungen können nach **X Tagen** (konfigurierbar, Default 30) automatisch gelöscht werden
- [ ] **Mobile-Upload**: Auf dem Handy öffnet der Upload-Button direkt Foto-Mediathek oder Kamera (via `<input type="file" accept="image/*" capture>`).

## Edge Cases
- Upload schlägt fehl (Netzwerk, Dateigröße, Format) → klare Fehlermeldung, Retry-Button
- User lädt 5 MB + 3 MB + 2 MB Bilder, Projekt wird zu groß → Limit: max. 3 Fotos pro Poster, Rest erst nach Löschen möglich
- HEIC-Datei von iOS → clientseitig zu JPEG konvertieren (via `heic2any` o. ä.), Format-Parität auf allen Geräten
- User hat kein Foto, sondern nur Karte → Foto-Masken sind **optional** und verbergen sich, solange kein Bild da ist
- Bild hat ungünstiges Seitenverhältnis (sehr schmal/lang) → Crop-Werkzeug greift automatisch, aber Nutzer muss aktiv bestätigen, damit nichts Wichtiges abgeschnitten wird

## Non-Goals
- Keine KI-Bildbearbeitung (kein Hintergrund-Entfernen, keine Retuschierung) — das ist eigene Welt und überflüssig für petite-moment in V1.
- Keine Galerie von Stock-Fotos — Kunde bringt eigenes Foto mit.
- Keine automatische Gesichts-Zentrierung im Crop — User macht das manuell.
- Kein Text-über-Foto-Editor (Schriften direkt auf dem Foto) — dafür gibt's bereits die regulären Textblöcke außerhalb der Foto-Maske.
- Keine permanenten Foto-Alben im User-Account — Fotos existieren nur solange das Projekt oder die Bestellung aktiv ist.

## Technische Anforderungen
- **Storage**: Supabase Storage Bucket `user-photos`, RLS (Owner-only), signed URLs für den Editor
- **Kompression**: `browser-image-compression` oder `pica` für clientseitige Verkleinerung
- **HEIC-Konvertierung**: `heic2any` für iOS-Kompatibilität
- **Neue Sanity-/Lib-Struktur**: `photo-masks.ts` analog zu `map-masks.ts`, mit vertikalem/horizontalem Split
- **Editor-UI**: neue Tab-Seite "Foto" im Sidebar-Bottom-Sheet mit Upload-Area + Masken-Auswahl
- **Export-Renderer** (`poster-from-snapshot.ts`): erweitert um Foto-Rendering-Pipeline (Canvas / PDF-Einbindung)
- **Admin-Cleanup**: Cron-Job (GitHub Action, 1×/Woche), löscht Fotos von Bestellungen, die älter als 30 Tage & Status `paid/shipped/done` sind

## Open Questions
- Welche Foto-Masken-Varianten sind Must-Have für V1? Entscheidung im Architecture-Schritt mit konkreten Sketches.
- Aufbewahrungsdauer nach Fulfillment fest 30 Tage oder konfigurierbar pro Bestellung?

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

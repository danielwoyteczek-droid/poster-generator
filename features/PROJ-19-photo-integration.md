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

### A) Gesamtablauf

```
[User lädt Bild hoch] → clientseitige Kompression + HEIC-Umwandlung
       ↓
[Upload zu Supabase Storage: Bucket user-photos, Owner-only via RLS]
       ↓
[Storage-URL (signed) landet im Editor-Store → im Projekt-Snapshot]
       ↓
[Foto wird im Editor in einer Foto-Maske gerendert (Crop/Pan/Zoom per Touch)]
       ↓
[Beim Export: Foto in voller Auflösung ins PNG/PDF eingefügt]
       ↓
[Cron: nach 30 Tagen + Bestellung abgeschlossen → Foto aus Bucket löschen]
```

### B) Komponenten-Struktur

```
poster-generator
│
├── src/lib/photo-masks.ts             ← NEW: Foto-Masken analog zu map-masks.ts
├── src/lib/photo-upload.ts            ← NEW: Kompression + HEIC → Supabase-Upload
├── src/hooks/useEditorStore.ts        ← erweitert um `photos: PhotoState[]`
├── src/components/editor/PhotoMaskOverlay.tsx  ← NEW: zeigt Fotos auf dem Poster
├── src/components/sidebar/PhotoTab.tsx         ← NEW: Upload-UI + Masken-Auswahl
├── src/app/api/photos/upload/route.ts          ← optional, wenn serverseitig signiert wird
└── scripts/cleanup-photos/                     ← NEW: Cron-Script zum Aufräumen
    └── purge.ts
```

### C) Datenmodell (Editor-Store & Snapshot)

**PhotoState** (pro hochgeladenem Foto):
- `id` (UUID)
- `storagePath` (Pfad im Supabase-Bucket, z. B. `user-photos/2026/04/abc.jpg`)
- `maskKey` (z. B. `circle`, `heart`, `full`, `split-left`, `split-right`)
- `crop` — Position + Zoom innerhalb der Maske: `{ x: 0.5, y: 0.5, scale: 1.0 }`
- `uploadedAt` (ISO-Datum)

**Snapshot-Erweiterung:**
```
snapshot.photos: PhotoState[]
```

**Supabase Storage:**
- Bucket `user-photos`, privat
- RLS-Policy: Owner-only (authenticated User darf nur eigene Fotos lesen/schreiben)
- Ordnerstruktur: `{userId | 'anon'}/{yyyy-mm}/{uuid}.jpg`

### D) Tech-Entscheidungen

| Entscheidung | Begründung |
|-------------|-----------|
| **Supabase Storage** (nicht Vercel Blob / AWS S3) | Schon aufgesetzt, RLS vorhanden, konsistent mit Auth-Flow. |
| **Client-Upload direkt in Storage** (signed URL) | Vermeidet, dass Bilder durch unseren API-Endpoint müssen → kein Next.js-Function-Timeout, keine Bandbreite auf Vercel. |
| **Kompression clientseitig** via `browser-image-compression` | ~15 KB Lib, verkleinert 10 MB iPhone-Foto auf ~1-2 MB in < 2 s. |
| **HEIC-Konvertierung** via `heic2any` | Apple speichert iPhone-Fotos standardmäßig als HEIC — andere Browser verstehen das nicht. Client-Umwandlung → kompatibles JPEG überall. |
| **Crop-State im Snapshot**, nicht im Bild | Wir beschneiden nicht das hochgeladene Bild, sondern rendern zur Laufzeit mit CSS/Canvas-Clip. Original bleibt intakt, User kann Crop ändern ohne Re-Upload. |
| **Photo-Masken analog zu Map-Masken** | Gleiche SVG-Mask-Technik, gleiche Interaktion — konsistent für den User. |
| **Auto-Cleanup 30 Tage nach Bestellung** | Storage-Kosten unter Kontrolle, rechtlich sauber (DSGVO-Löschpflicht). |

### E) Foto-Masken (V1-Set)

Minimal 6 Formen für Einzelbild, plus Split-Varianten mit Karte:

**Einzelbild-Masken** (Foto füllt die gewählte Form auf dem Poster):
- `full` — Vollbild (Foto statt Karte)
- `circle` — rund
- `heart` — Herz
- `square` — Quadrat
- `portrait` — Hochformat-Rechteck
- `landscape` — Querformat-Rechteck

**Split-Masken** (Karte + Foto nebeneinander):
- `split-vertical-left` / `split-vertical-right` — Karte links/rechts, Foto gegenüber
- `split-horizontal-top` / `split-horizontal-bottom` — analog oben/unten
- `split-circles-photo` — zwei Kreise, einer Karte, einer Foto
- `split-hearts-photo` — analog Herz-Paar

### F) Interaktion im Editor

- **Upload-Button** im neuen Tab "Foto": öffnet Datei-Picker (Desktop) oder direkt Kamera/Galerie (Mobile via `<input capture>`).
- Nach Upload erscheint ein **Thumbnail** mit "Entfernen"-Button.
- Maske wählen: gleiche Grid-Galerie wie bei Karten-Masken, inkl. Split-Varianten.
- **Crop-Interaktion:**
  - Desktop: Bild anklicken → Drag verschiebt, Scrollen zoomt
  - Mobile: Bild antippen → Drag verschiebt, Pinch zoomt
  - Crop-Änderungen updaten `snapshot.photos[i].crop`

### G) Export-Pipeline

`src/lib/poster-from-snapshot.ts` wird erweitert:
- Beim Rendern auf Canvas: für jedes Foto im Snapshot…
  - Fetch Bild (signed URL)
  - Rechne Crop + Maske → Canvas-Clip-Pfad
  - Zeichne Bild in der Maske an der richtigen Stelle
- PDF analog via `pdf-lib`-Image-Embed.

### H) DSGVO-Sicherheiten

- Bucket-RLS: nur Owner des Fotos liest/schreibt; anonymer Upload nur mit Session-gebundenem Pfad (Cookie-Session-ID als Ordner).
- **Datenschutz-Seite** erweitert um "Foto-Uploads":
  - Speicherort (Supabase EU-Frankfurt)
  - Zweck (Erstellung + Druck des Posters)
  - Aufbewahrung (30 Tage nach Fulfillment, dann Auto-Löschung)
  - Recht auf sofortige Löschung via Kunden-Anfrage

### I) Auto-Cleanup (Cron)

- GitHub Action, wöchentlich (Sonntag 03:00 UTC)
- Script `scripts/cleanup-photos/purge.ts`:
  - Liest alle `photos` aus `orders`, deren `status in ('paid', 'shipped', 'done')` und `updated_at < NOW() - 30 days`
  - Löscht entsprechende Objekte aus dem Bucket
  - Markiert im Order-Snapshot `photos.deleted_at`

### J) Migrations-Schritte

1. Supabase: Bucket `user-photos` anlegen, RLS-Policies setzen (Supabase MCP oder SQL-Snippet)
2. Packages installieren: `browser-image-compression`, `heic2any`
3. `src/lib/photo-masks.ts` mit 6+ Masken + Split-Varianten
4. `src/lib/photo-upload.ts` mit Kompression + Upload-Helper
5. Editor-Store erweitern (`photos`-Array + Actions)
6. `PhotoMaskOverlay`-Komponente rendert Fotos auf dem Poster
7. Neue Sidebar-Tab `PhotoTab.tsx` mit Upload + Masken-Picker + Crop
8. `poster-from-snapshot.ts` für Export erweitern
9. Datenschutz-Seite aktualisieren
10. Cleanup-Cron-Job + GitHub Action
11. Test: Upload, Crop, Save-Load, Export

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

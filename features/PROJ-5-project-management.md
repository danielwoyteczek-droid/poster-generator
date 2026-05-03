# PROJ-5: Projekt-Verwaltung (Speichern & Laden)

## Status: Approved
**Reality-Check 2026-05-03:** /api/projects (POST/GET/PATCH/DELETE), list, duplicate, bulk-delete, useProjectSync-Hook, /private-Dashboard alle vorhanden. Auf Approved gehoben.

**Created:** 2026-04-19
**Last Updated:** 2026-05-03

## Dependencies
- Requires: PROJ-1 (Karten-Editor Core)
- Requires: PROJ-2 (Textblock-Editor)
- Requires: PROJ-4 (User Authentication)

## User Stories
- Als Gast möchte ich meinen Entwurf im Browser zwischenspeichern können (localStorage), damit ich ihn nach einem Refresh wiederherstellen kann
- Als eingeloggter Nutzer möchte ich mein Projekt in der Cloud speichern können
- Als eingeloggter Nutzer möchte ich eine Übersicht meiner gespeicherten Projekte sehen
- Als eingeloggter Nutzer möchte ich ein gespeichertes Projekt öffnen und weiterbearbeiten können
- Als eingeloggter Nutzer möchte ich ein Projekt löschen können

## Acceptance Criteria
- [ ] Gast-Entwurf wird automatisch in localStorage gespeichert (Debounce: nach 1s Inaktivität)
- [ ] Nach Login: Gast-Entwurf wird automatisch als neues Supabase-Projekt angelegt
- [ ] "Speichern"-Button für eingeloggte Nutzer im Editor
- [ ] Projekt-Speicherung enthält: Karten-ViewState (lng, lat, zoom), gewählter Stil, Maske, Marker, Textblöcke, Papierformat
- [ ] Dashboard-Seite (/private) zeigt alle gespeicherten Projekte als Karten
- [ ] Projekt-Karte zeigt: Titel, Erstellungsdatum, Vorschau-Bild (optional)
- [ ] Klick auf Projektkarte öffnet den Editor mit geladenem Zustand
- [ ] Löschen-Button pro Projekt (mit Bestätigungsdialog)
- [ ] Manuelles Speichern per Button UND Auto-Save (alle 30s bei Änderungen)

## Edge Cases
- Was passiert, wenn localStorage voll ist? → Graceful Fehlerhandling, Nutzer informieren
- Was passiert, wenn zwei Tabs dasselbe Projekt bearbeiten? → Letztes Speichern gewinnt (kein Merge-Konflikt in MVP)
- Was passiert beim Laden eines Projekts mit veralteter Struktur (z.B. fehlende Felder)? → Fehlende Felder mit Standardwerten auffüllen
- Was passiert, wenn ein Projekt geladen wird und der Kartenservice nicht erreichbar ist? → Metadaten laden, Karte zeigt leere Kacheln
- Was passiert, wenn ein Nutzer 100+ Projekte hat? → Pagination oder "Zuletzt bearbeitet"-Sortierung

## Technical Requirements
- Supabase `projects`-Tabelle: id, user_id, title, location_name, config_json, created_at, updated_at
- Row Level Security (RLS): Nutzer sieht nur eigene Projekte
- config_json enthält den vollständigen Editor-State als JSON
- API-Routen: POST /api/projects, PATCH /api/projects/[id], GET /api/projects/list, GET /api/projects/[id], DELETE /api/projects/[id]

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten
```
EditorLayout (Header-Bereich)
├── SaveButton          (eingeloggt: POST/PATCH /api/projects)
└── SaveStatus          (gespeichert vor X Minuten / wird gespeichert...)

/private (Dashboard)
└── ProjectGrid
    └── ProjectCard     (shadcn Card: Titel, Datum, Bearbeiten/Löschen)
        └── DeleteDialog (shadcn AlertDialog zur Bestätigung)
```

### Datenhaltung
```
Gast:
  EditorStore → localStorage (JSON-Snapshot, Debounce 1s)

Eingeloggt:
  EditorStore → useProjectSync Hook
    → Auto-Save alle 30s (wenn dirty)
    → Manuell: SaveButton → PATCH /api/projects/[id]
    → Erster Save: POST /api/projects → projectId in Store speichern

Beim Login mit Gast-Draft:
  localStorage lesen → POST /api/projects → localStorage löschen
```

### Datenbank (Supabase)
- Tabelle `projects`: id, user_id, title, location_name, config_json, created_at, updated_at
- RLS Policy: `user_id = auth.uid()` für SELECT, INSERT, UPDATE, DELETE
- config_json = serialisierter EditorStore (Zod-Schema für Migration)

### API-Routen
- `POST /api/projects`
- `GET /api/projects/list`
- `GET /api/projects/[id]`
- `PATCH /api/projects/[id]`
- `DELETE /api/projects/[id]`

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

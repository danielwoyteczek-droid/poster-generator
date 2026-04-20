# PROJ-8: Design-Presets (Admin → Kunde)

## Status: In Progress
**Created:** 2026-04-20
**Last Updated:** 2026-04-20

## Dependencies
- Requires: PROJ-1 (Karten-Editor), PROJ-2 (Textblock-Editor), PROJ-7 (Sternkarten-Editor)
- Requires: PROJ-4 (User Authentication) — Admin-Rolle
- Requires: PROJ-9 (Admin-Backend) — diesem Feature vorangehend gebaut (hier)

## User Stories

### Admin
- Als Admin möchte ich im existierenden Editor ein Design entwickeln und als Preset speichern können
- Als Admin möchte ich alle Presets verwalten (Liste, bearbeiten, veröffentlichen, zurückziehen, löschen)
- Als Admin möchte ich ein Preset zunächst als Draft speichern und erst bei Zufriedenheit veröffentlichen
- Als Admin möchte ich Presets nach Typ trennen: Stadtposter vs. Sternenposter

### Kunde
- Als Kunde möchte ich veröffentlichte Presets als Startpunkt für mein Poster verwenden können
- Als Kunde möchte ich eine Vorschau vor der Auswahl sehen

## Acceptance Criteria
- [ ] Tabelle `presets` mit `status` ('draft' | 'published'), `poster_type` ('map' | 'star-map'), `config_json` (jsonb), `preview_image_url`, `display_order`
- [ ] Admin-Button "Als Preset speichern" im Editor (Map + Star-Map), nur für Admins sichtbar
- [ ] Admin-Seite `/private/admin/presets` mit Liste (gefiltert nach Typ + Status), Actions: Bearbeiten / Veröffentlichen / Zurückziehen / Löschen
- [ ] "Bearbeiten" lädt das Preset wieder in den Editor
- [ ] Kunde sieht im Editor eine "Von Vorlage starten"-Option mit nur veröffentlichten Presets
- [ ] Preview-Bild wird beim Speichern automatisch gerendert (wiederverwendet Logik aus dem Export)
- [ ] RLS: Nur Admins können schreiben; alle können veröffentlichte lesen

## Edge Cases
- Preset löschen, das schon von Kunden verwendet wurde → keine Auswirkung, Kunde hat den Snapshot bereits übernommen
- Preset bearbeiten nach Veröffentlichung → Draft-Kopie oder direkt veröffentlicht ändern? MVP: direkt veröffentlicht
- Preset "Bearbeiten" im Editor überschreibt nicht den aktuellen User-Stand → eigener Editor-Mode "Admin editing preset"

## Technical Requirements
- Neue Tabelle `presets` (UUID PK, RLS)
- API-Routen: `GET/POST /api/admin/presets`, `GET/PATCH/DELETE /api/admin/presets/[id]`, `GET /api/presets` (public, nur published)
- Preview-Bild: Canvas rendern (wie beim Cart-Preview), downsizen, in Supabase Storage speichern
- Bucket `preset-previews` (public), oder private + signed URL
- Route: `/private/admin/presets` (admin-only)

---

## Tech Design (Solution Architect)
_Entfällt — direkt während Implementation geklärt_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

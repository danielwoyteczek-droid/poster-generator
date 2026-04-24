# PROJ-22: Admin-Paletten-Verwaltung

## Status: Planned
**Created:** 2026-04-24
**Last Updated:** 2026-04-24

## Dependencies
- Requires: PROJ-4 (User Authentication) — Admin-Check über `useAuth().isAdmin`
- Requires: PROJ-15 (Dynamische Map-Farbschemen) — die Palette-Architektur (`MAP_PALETTES`, `MapPaletteColors`, Transformer) existiert bereits
- Beeinflusst: PROJ-8 (Design-Presets) — Presets referenzieren `paletteId`; gelöschte/umbenannte Paletten müssen sauber behandelt werden

## Kontext
Die sechs vordefinierten Farbpaletten (Mint, Sand, Navy, Terracotta, Slate, Forest)
leben aktuell als hardcoded Array in `src/lib/map-palettes.ts`. Jede neue Palette
oder Farb-Anpassung erfordert einen Code-Commit + Deploy. Der Betreiber soll
Paletten direkt im Admin-Backend verwalten können — genau wie aktuell schon
Design-Presets (PROJ-8) und Custom-Masks verwaltet werden.

Dieses Feature stellt die Paletten unter der gleichen Admin-UX-Philosophie
bereit: ein `/admin/palettes` Dashboard mit Liste, Vorschau, Draft-vs-Publish,
und der Kunde bekommt automatisch nur veröffentlichte Paletten im Picker.

## User Stories
- Als Betreiber möchte ich im Admin-Bereich eine Übersicht aller existierenden
  Farbpaletten sehen, damit ich schnell beurteilen kann welche ich schon habe.
- Als Betreiber möchte ich eine bestehende Palette bearbeiten können (alle 8
  Farbwerte), damit ich Farben feintunen kann ohne Entwickler zu involvieren.
- Als Betreiber möchte ich neue Paletten anlegen und benennen können, damit ich
  saisonale oder thematische Sets (z.B. "Herbst", "Pastell", "Winter-Monochrom")
  ergänzen kann.
- Als Betreiber möchte ich Paletten als Draft anlegen, im Editor probieren und
  erst dann veröffentlichen, damit ich unfertige Entwürfe nicht vor Kunden zeige.
- Als Betreiber möchte ich Paletten löschen können. Ist eine Palette in einem
  Preset referenziert, muss ich vorher gewarnt werden (nicht stillschweigend
  kaputt machen).
- Als Kunde möchte ich den gleichen Palette-Picker wie bisher sehen, jetzt nur
  gefüllt aus der Datenbank inklusive der vom Betreiber hinzugefügten Sets.

## Acceptance Criteria
- [ ] Neue Admin-Route `/admin/palettes` zeigt eine Tabelle aller Paletten
      (Status, Name, Swatch-Vorschau, Aktionen)
- [ ] Tabelle ist nur für User mit `isAdmin === true` zugänglich, andere
      bekommen 403 / Weiterleitung
- [ ] "Neue Palette"-Dialog nimmt Name, Beschreibung, 8 Farbwerte als
      Hex-Inputs und legt die Palette als `status: 'draft'` an
- [ ] Jeder der 8 Farbwerte hat eine Live-Vorschau (kleines Farbquadrat neben
      dem Input) und eine Label (Background, Land, Water, Road, Building,
      Border, Label, Label-Halo)
- [ ] Edit-Dialog lädt eine bestehende Palette und erlaubt alle Felder zu
      ändern; speichern schreibt zurück in die DB
- [ ] "Veröffentlichen"/"Zurückziehen"-Toggle setzt `status` zwischen
      `draft` und `published`
- [ ] Kunden-Editor (MapTab Paletten-Picker) zeigt nur Paletten mit
      `status === 'published'`, sortiert nach `display_order`
- [ ] Löschen einer Palette: wenn die Palette von mindestens einem Preset
      referenziert wird, kommt ein Bestätigungsdialog mit Liste der betroffenen
      Presets. Nach Löschen fallen die Presets zurück auf die Default-Palette
- [ ] Seed-Migration: die sechs bestehenden hardcoded Paletten (Mint, Sand,
      Navy, Terracotta, Slate, Forest) werden beim Deployment einmalig in die
      DB übernommen mit `status: 'published'`, und die hardcoded `MAP_PALETTES`
      Konstante bleibt als Fallback erhalten wenn die DB nicht erreichbar ist
- [ ] Palette-IDs sind slug-basiert (z.B. `mint`, `herbst-rot`), nicht UUIDs —
      damit bestehende Presets ihre `paletteId`-Referenzen behalten und der
      Picker stabile URLs hat
- [ ] Reihenfolge im Picker ist über `display_order` (int) steuerbar; Drag &
      Drop oder einfache Pfeiltasten im Admin reichen
- [ ] Änderungen an einer veröffentlichten Palette werden live ohne Redeploy
      sichtbar (React-Query/SWR-Revalidate beim Editor-Mount)
- [ ] "Original" und "Eigene Farbe" bleiben Sonderfälle im Picker, kommen
      nicht aus der DB

## Edge Cases
- **Palette umbenannt**: paletteId (slug) ist immutable nach Erstellung; nur
  `name` und `description` sind editierbar. Verhindert Referenz-Bruch.
- **Palette existiert in DB aber Transformer erwartet 8 Farben**: bei fehlenden
  Feldern fallen Defaults aus `MAP_PALETTES[0]` ein, die Palette bleibt benutzbar.
- **DB nicht erreichbar**: Editor fällt transparent auf die hardcoded
  `MAP_PALETTES` zurück, Toast-Benachrichtigung "Paletten-Dienst nicht
  erreichbar, Fallback aktiv".
- **Duplicate Slug**: UI verhindert Anlegen mit bereits vergebenem Slug, zeigt
  "Name bereits vergeben".
- **Admin löscht Palette die gerade im Editor ausgewählt ist**: Editor merkt
  das beim nächsten Fetch und springt auf Default zurück, Toast-Meldung.
- **Alte Presets mit gelöschter paletteId**: beim Preset-Anwenden wird der
  Fallback (erste published Palette) benutzt, nicht Absturz.
- **Konkurrierende Edits**: Admin A editiert, B speichert — letzter Write
  gewinnt (last-writes-wins), keine Conflict-UI nötig für MVP.

## Technical Requirements
- Admin-Writes über dedizierte Admin-API-Routes (analog zu
  `/api/admin/presets`) mit Service-Role-Key serverseitig
- RLS auf `map_palettes`: `published` lesbar für alle, alles sonst nur für
  Admin-Rolle
- Frontend-Fetch im Editor mit `useSWR` oder `useQuery`, Cache-Invalidierung
  beim Tabwechsel zurück in den Editor
- Farb-Validierung: Hex-Format, 3 oder 6 Zeichen erlaubt, sonst 400

## Non-Goals
- Kein Farbpicker-Widget mit Eyedropper oder Palette-Generator — einfache
  Hex-Inputs genügen
- Keine Versionshistorie der Paletten; Admin kann selbst Backups anlegen
  indem er Drafts clonet
- Keine Palette-Kategorisierung (Themes, Tags) — `display_order` reicht
- Kein öffentlicher Palette-Marktplatz; nur Admin darf anlegen

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

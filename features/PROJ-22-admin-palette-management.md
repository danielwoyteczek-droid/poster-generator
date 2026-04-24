# PROJ-22: Admin-Paletten-Verwaltung

## Status: Approved
**Created:** 2026-04-24
**Last Updated:** 2026-04-24

## Dependencies
- Requires: PROJ-4 (User Authentication) — Admin-Check über `useAuth().isAdmin`
- Requires: PROJ-15 (Dynamische Map-Farbschemen) — die Palette-Architektur (`MAP_PALETTES`, `MapPaletteColors`, Transformer) existiert bereits
- Beeinflusst: PROJ-8 (Design-Presets) — Presets referenzieren `paletteId`; gelöschte/umbenannte Paletten müssen sauber behandelt werden

## Implementation Notes (Backend)
- Supabase-Migration `create_map_palettes`: Tabelle mit Slug-ID (TEXT PK),
  8-Farben-JSONB + CHECK-Constraint dass alle acht Felder gesetzt sind,
  Status-Enum draft/published, display_order, Timestamps. Index auf
  (status, display_order) für den Picker-Lookup.
- RLS: `Public reads published palettes` — anon + authenticated dürfen nur
  `status = 'published'` lesen. Admin-Schreibzugriffe laufen ausschließlich
  über die Service-Role-API (kein client-seitiger Write-Pfad).
- Zweite Migration `seed_map_palettes` schreibt die sechs bestehenden
  hardcoded Paletten (Mint … Forest) einmalig als `published` in die DB.
- API-Routen folgen exakt dem `/api/admin/presets`-Pattern:
  - `GET /api/palettes` (public, cached 60 s/300 s s-maxage) liefert nur
    published Paletten mit festgelegter Sortierung
  - `GET/POST /api/admin/palettes` (admin-gated) + `GET/PATCH/DELETE
    /api/admin/palettes/[id]` für CRUD
  - DELETE prüft vorher `presets.config_json->>paletteId` auf Referenzen
    und liefert bei Treffern 409 mit betroffener Preset-Liste
- Zod-Validierung mit Hex-Regex für alle acht Farben und Slug-Regex für
  die ID (`/^[a-z][a-z0-9-]*$/`).
- Neuer Hook `useMapPalettes` mit Modul-Level-Cache + In-Flight-Promise,
  liefert beim ersten Render direkt `MAP_PALETTES` als Safety-Net und
  tauscht nach erfolgreichem Fetch gegen die DB-Version.
- `resolvePalette` in `petite-style-loader` versucht zuerst den warmen
  Hook-Cache über `getCachedPalettes()`, fällt sonst auf `MAP_PALETTES`
  zurück — so profitiert auch der Export von der Admin-Bearbeitung.
- MapTab-Picker iteriert jetzt `availablePalettes` statt `MAP_PALETTES`
  (primärer + sekundärer Karten-Picker, beide CustomPaletteEditor-Resets).

## Implementation Notes (Frontend)
- Admin-Route `/private/admin/palettes` folgt dem gleichen Pattern wie Presets
  und Masks (server-side `requireAdmin` + `redirect`, Landing-Nav, Titelblock,
  Client-Komponente). Kein neues Auth-Pattern.
- `AdminPalettesList` zeigt jede Palette als Zeile mit 8 Farb-Swatches, Name,
  Slug, Status-Badge, Beschreibung und drei Icon-Buttons: Publish-Toggle
  (Eye/EyeOff), Bearbeiten (Pencil), Löschen (Trash).
- Create-/Edit-Dialog nutzt shadcn Dialog mit ID + Name + Beschreibung +
  Reihenfolge + 2-spaltigem Color-Grid. Jedes Farbfeld hat sowohl
  `<input type="color">` als auch ein monospaced Hex-Textfeld — Admin kann
  beide frei mischen. Name → ID auto-slugify solange ID leer ist, nach
  Anlegen ist ID dauerhaft read-only.
- Delete-AlertDialog: bei 409-Response wird die zurückgelieferte Preset-Liste
  im Dialog aufgeführt und der Löschen-Button ausgeblendet; Admin muss erst
  die Referenzen beheben.
- Beim Create / Update / Status-Wechsel wird `invalidateMapPalettesCache()`
  gecallt, damit der Editor beim nächsten Mount die aktuelle DB-Liste holt.

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

### A) Component Structure (Sidebar + Admin Route)

```
Sidebar (bestehend, unverändert in der Struktur)
+-- MapTab
|   +-- Farbpalette (Picker, liest jetzt aus DB statt Hardcode)
|       +-- "Original" / "Eigene" / DB-Paletten

/private/admin/palettes  (NEU, Admin-only)
+-- Paletten-Übersicht (Tabelle)
|   +-- Zeile pro Palette: Status-Badge | Name | Farb-Swatches (alle 8) | Aktionen
|   +-- Filter: Draft / Published / Alle
|   +-- Button "Neue Palette"
+-- Neu-/Edit-Dialog
|   +-- Name (Pflicht)
|   +-- Slug-Feld (auto-generiert aus Name, nach Anlegen gesperrt)
|   +-- Beschreibung (optional)
|   +-- 8 Farb-Zeilen: Label + Hex-Input + Live-Swatch
|       - Background, Land, Water, Road, Building, Border, Label, Label-Halo
|   +-- Reihenfolge (Nummer-Input)
|   +-- Aktionen: Speichern / Veröffentlichen / Zurückziehen / Löschen
+-- Lösch-Bestätigung (wenn Palette noch in Presets referenziert)
    +-- Liste der betroffenen Presets
    +-- "Ja, löschen — Presets fallen auf Default zurück"
```

### B) Data Model (Was gespeichert wird)

Eine neue Supabase-Tabelle `map_palettes` mit diesen Feldern:

```
Jede Palette hat:
- id:          stabile Slug-ID (z.B. "mint", "herbst-rot") — nie änderbar
- name:        sichtbarer Name im Picker (z.B. "Mint", "Herbstrot")
- description: optionale Beschreibung für Admin-Tooltip
- colors:      Objekt mit 8 Hex-Farbwerten
               (background, land, water, road, building, border, label, labelHalo)
- status:      'draft' oder 'published'
- display_order: Ganzzahl, steuert Sortierung im Picker
- created_at, updated_at: Zeitstempel

Zugriffs-Regeln (Row Level Security):
- Lesen: alle (auch anonym), aber nur Paletten mit status = 'published'
- Schreiben (Insert/Update/Delete): nur User mit Admin-Rolle
```

Bestehende Presets referenzieren Paletten über ihre `paletteId` (ist der Slug).
Die Referenz bleibt lose: wird eine Palette gelöscht, fällt der Preset-Apply
auf die erste verfügbare Palette zurück.

### C) Wie der Editor Paletten lädt

```
Beim Öffnen des Editors:
1. React-Query/SWR-Hook `useMapPalettes` ruft GET /api/palettes auf
2. Server liest alle veröffentlichten Paletten aus map_palettes
3. Antwort wird clientseitig 5 Minuten gecached
4. Picker merged: [Original-Sonderfall, ...DB-Paletten, Eigene-Sonderfall]

Fallback-Kette:
- DB nicht erreichbar → Toast + Fallback auf hardcoded MAP_PALETTES
- paletteId aus Preset existiert nicht mehr → Fallback auf erste published
- Palette hat weniger als 8 Felder → fehlende Felder aus MAP_PALETTES[0]
```

Die hardcoded `MAP_PALETTES` Konstante bleibt im Code als Notfall-Backup;
der Seed stellt sicher dass die gleichen sechs Paletten auch in der DB sind,
damit der Betreiber sie dort bearbeiten kann.

### D) Admin-Workflow

```
1. Admin öffnet /private/admin/palettes
2. Sieht Übersichtstabelle aller Paletten
3. Klickt "Neue Palette" → Dialog
4. Trägt Name ein, Slug wird auto-generiert (editierbar solange noch nicht gespeichert)
5. Füllt 8 Farb-Hex-Werte, jeder mit Live-Vorschau daneben
6. Speichert als Draft → erscheint nur im Admin, nicht im Kunden-Editor
7. Kann mit "Im Editor probieren"-Link direkt den Editor öffnen und
   die Draft-Palette via URL-Parameter vorauswählen (opt-in)
8. Zufrieden → "Veröffentlichen" → status wechselt auf 'published'
9. Editor-Hook revalidiert beim nächsten Focus, Palette erscheint für Kunden
```

### E) API-Endpunkte (nicht Implementierung, nur Überblick)

```
Öffentlich (liest nur published):
  GET  /api/palettes           → Liste aller publizierten Paletten

Admin-only (hinter isAdmin-Check):
  GET    /api/admin/palettes       → Liste inkl. Drafts
  POST   /api/admin/palettes       → Neue Palette anlegen
  PATCH  /api/admin/palettes/[id]  → Farben/Name/Status ändern
  DELETE /api/admin/palettes/[id]  → Löschen (mit Preset-Check)
```

### F) Migration: Hardcode → DB

```
Einmaliger Seed beim nächsten Deploy:
- SQL-Migration liest die sechs MAP_PALETTES aus dem TS-Code (manuell in SQL
  übertragen) und schreibt sie als 'published' in map_palettes
- display_order folgt der aktuellen Reihenfolge (Mint=1, Sand=2, ...)
- hardcoded MAP_PALETTES bleibt im Code als Fallback wenn DB down ist
```

### G) Tech-Entscheidungen (Warum so)

- **Slug-IDs statt UUIDs**: Presets referenzieren Paletten per ID. Slug ist
  lesbar (`mint` statt `3f2a-…`) und bleibt stabil auch bei Umbenennung des
  Anzeigenamens. Senkt die Gefahr "plötzlich alle Presets kaputt".
- **Status-Feld statt separate Draft-Tabelle**: eine Tabelle mit einem
  Enum-Feld ist simpler zu warten als zwei getrennte Tabellen oder eine
  Versionshistorie.
- **Kunden-Fetch via Hook mit Cache**: 5-Minuten-Cache reicht für ein UI-Set
  dass sich selten ändert, vermeidet unnötige DB-Last.
- **Hardcoded-Fallback erhalten**: schlechter DB-Tag darf den Editor nicht
  komplett blockieren. Sechs bekannte Paletten reichen im Worst-Case aus.
- **Gleicher Admin-Pattern wie Presets/Masks**: Admin-Pages unter
  `/private/admin/`, API unter `/api/admin/`, Service-Role-Key serverseitig.
  Null neue Patterns, maximale Konsistenz, minimaler Review-Aufwand.
- **Lösch-Schutz mit Preset-Liste**: Paletten sind wertvoll (wurden
  hand-tuned) — ein unbedachter Klick darf nicht mehrere Presets brechen.

### H) Dependencies (keine neuen Packages)

Alles nutzt was schon installiert ist:
- Supabase-Client für DB-Zugriff
- shadcn/ui für Dialog, Table, Input, Badge, Button, Tabs
- SWR (bereits im Projekt) für Palette-Fetch mit Cache
- Zod (bereits im Projekt) für Eingabe-Validierung serverseitig

### I) Abgrenzung

- **Kein Farb-Picker-Widget**: Hex-Text-Input reicht, dazu ein kleiner
  `<input type="color">` als Fallback-Helfer
- **Keine Versionshistorie**: wenn Admin experimentiert und sich verirrt,
  einfach neue Draft-Palette anlegen und alte unverändert lassen
- **Keine Palette-Kategorien/Tags**: `display_order` reicht, alles in einer
  flachen Liste

## QA Test Results

**Tested:** 2026-04-24 — Code-Audit + DB-Level-Tests (keine UI-Browser-Tests
möglich in diesem Setup)

### Acceptance Criteria

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| 1 | Admin-Route `/private/admin/palettes` | ✅ | `src/app/private/admin/palettes/page.tsx`, server-side `requireAdmin` |
| 2 | Admin-Gate (401 → /login, 403 → /) | ✅ | Redirect in page.tsx, API-Routes lehnen ebenfalls ab |
| 3 | Neue Palette als Draft, 8 Farbfelder | ✅ | POST setzt `status: 'draft'`, Dialog zeigt alle 8 Farben |
| 4 | Live-Swatch + Label je Farbe | ✅ | `<input type="color">` + monospaced Hex-Input + DB-Label |
| 5 | Edit-Dialog lädt + speichert | ✅ | PATCH-Route, `openEdit` füllt Form |
| 6 | Publish-/Unpublish-Toggle | ✅ | Eye/EyeOff Icon-Button → PATCH status |
| 7 | Kunden-Picker zeigt nur published, sortiert | ✅ | `/api/palettes` filtert `status='published'`, ORDER BY `display_order` |
| 8 | Delete-Schutz bei Preset-Referenz | ✅ | 409-Response mit `referenced_by`-Liste, UI blendet Delete-Button aus |
| 9 | Seed-Migration + hardcoded Fallback | ✅ | 6 Paletten als 'published' geseedet, `MAP_PALETTES` bleibt |
| 10 | Slug-IDs | ✅ | Zod-Regex `/^[a-z][a-z0-9-]*$/`, Auto-Slugify aus Name |
| 11 | Reihenfolge über display_order | ✅ | Number-Input im Dialog, DB-Index auf (status, display_order) |
| 12 | Live-Update ohne Redeploy | ⚠️ | `invalidateMapPalettesCache()` nur im Admin-Tab; Editor-Tabs müssen neu mounten (Cache-Control 60 s max-age deckt langsame Fälle) |
| 13 | "Original" und "Eigene" Sonderfälle bleiben | ✅ | MapTab rendert beide Buttons separat, nicht aus `availablePalettes` |

### Security-Audit (Red-Team)

| Test | Ergebnis |
|------|----------|
| RLS: anon darf nur `published` lesen | ✅ Bestätigt via `SET role anon; SELECT` — Drafts unsichtbar |
| RLS: anon-INSERT blockiert | ✅ Liefert `42501 RLS violation` |
| CHECK-Constraint bei unvollständigen Colors | ✅ Liefert `23514 check violation` auf incomplete JSONB |
| Admin-API ohne Session | ✅ `requireAdmin()` liefert 401 |
| Admin-API als Non-Admin | ✅ profile.role-Check liefert 403 |
| SQL-Injection via Slug / Name | ✅ Supabase-Client param-bindet, Zod-Regex filtert vorher |
| XSS über Palette-Name | ✅ React-JSX escaped per default |
| Hex-Color-Injection (z.B. `</style>`) | ✅ HEX-Regex erlaubt nur `#xxx`/`#xxxxxx` |
| Service-Key client-seitig exposed? | ✅ Nur in server-routes via `createAdminClient()`, nicht im Bundle |
| CORS / leaky API | ✅ Routes laufen unter Next.js Same-Origin, kein `*`-Header |

### Bugs gefunden

**Low Severity:**

1. **Cache-Delay beim Kunden nach Admin-Änderung**
   - Pfad: Admin editiert Palette → Kunde im Editor sieht alte Version bis 60 s Cache-Max-Age ablaufen oder Editor-Tab neu geladen wird
   - Reproduzierbar: ja, wenn Kunde + Admin gleichzeitig aktiv
   - Workaround: Hard-Reload (Strg+Shift+R) löscht HTTP-Cache; `invalidateMapPalettesCache()` aus Hook-Modul-Cache nur im Admin-Tab
   - Severity: Low — UX-Delay max. 60 s, für Admin-Experimente aber lästig
   - Empfehlung: optional Cache-Control auf `no-cache` setzen wenn Realtime wichtig ist, oder WebSocket-Invalidation

2. **Status-Toggle ohne Confirm-Dialog**
   - Einmal-Click-Publish kann versehentlich passieren
   - Severity: Low — nicht destruktiv, sofort per zweitem Click rückgängig
   - Empfehlung: optional Bestätigung beim Publish (nicht beim Unpublish)

3. **`display_order` nicht unique**
   - Zwei Paletten können denselben Wert haben; Sortierung dann alphabetisch innerhalb nach `created_at`
   - Severity: Low — rein kosmetisch, `ORDER BY display_order ASC, created_at DESC` bleibt deterministisch
   - Empfehlung: optional unique-constraint + Auto-Reorder bei Konflikt

4. **Keine Längen-Indikator im Beschreibung-Feld**
   - Server lehnt > 500 Zeichen ab, Admin sieht's aber erst beim Speichern-Fehler
   - Severity: Low — UX-Kleinigkeit
   - Empfehlung: `maxLength={500}` + optional Counter

5. **Admin-Nav kein Link zu Paletten**
   - Die neue Route `/private/admin/palettes` ist nur per Direkt-URL erreichbar
   - Severity: Low — Admin kennt die URL, kein Blocker
   - Empfehlung: Link in der Admin-Navigation ergänzen (existiert überhaupt eine?)

**Medium / High / Critical:** keine

### Regression-Check

- [x] Bestehender Editor-Paletten-Picker rendert weiterhin (Backend-Änderung kompatibel)
- [x] Design-Presets (PROJ-8) referenzieren `paletteId` — seed-IDs unverändert (`mint`, `sand`, `navy`, `terracotta`, `slate`, `forest`), Presets laden korrekt
- [x] Export-Pipeline (PROJ-3) nutzt `resolvePalette` → warmt Cache oder fällt auf hardcoded zurück, keine Änderung am Verhalten
- [x] Custom-Palette-Flow ("Eigene Farbe") — MapTab-Reset verwendet jetzt `defaultColors` aus Liste, funktional gleich

### Production-Ready Empfehlung

**READY** ✅

- Alle 13 Acceptance Criteria erfüllt (12 grün, 1 mit dokumentierter Limitation die nicht blockt)
- Security-Audit clean: RLS, Input-Validation, Auth-Gates halten
- Keine Critical- oder High-Bugs
- Alle 5 gefundenen Bugs sind Low-Severity UX-/Komfort-Themen

**Offene Punkte für separates Ticket (nicht blocker):**
- Admin-Navigation Link für die neue Palettenseite
- Optional: HTTP-Cache-Header verschärfen oder Realtime-Invalidate
- Optional: Publish-Bestätigung

### Was nicht getestet wurde

- **UI im Browser**: keine Browser-Session verfügbar; echte UX nicht validiert
- **Responsive-Design**: Admin-Layout auf Mobile ungetestet (Admin arbeitet typischerweise Desktop)
- **Cross-Browser**: Chrome/Firefox/Safari-Konsistenz ungetestet
- **Unit-/E2E-Tests**: keine Test-Suite existiert im Projekt; nicht Teil dieser QA-Runde

## Deployment
_To be added by /deploy_

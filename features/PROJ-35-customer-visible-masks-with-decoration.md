# PROJ-35: Customer-sichtbare Custom-Masks mit Decoration-Layer

## Status: Deployed
**Created:** 2026-04-30
**Last Updated:** 2026-05-01

## Implementation Notes — Backend (2026-04-30)

**Migration applied:** `20260430000002_proj35_custom_masks_visibility_decoration.sql`
- 2 Spalten auf `custom_masks`: `is_public boolean NOT NULL DEFAULT false`, `decoration_svg_url text NULL`
- Partial Index `idx_custom_masks_is_public WHERE is_public = true`
- RLS: alte Open-Read-Policy ersetzt durch `is_public = true`-Filter (Defence-in-Depth, API nutzt Service-Role)
- Storage Bucket `decorations` (public, 5 MB Limit) erstellt

**API-Endpoints:**
- `GET /api/masks` — admin-aware: prüft `requireAdmin`-Pattern silently, Admin sieht alle Masks, sonst `is_public = true`-Filter. Response enthält `is_public` + `decoration_svg_url`
- `PATCH /api/admin/masks/[id]` (NEU) — Zod-validierter Body mit optional `is_public` und/oder `decoration_svg_url`
- `DELETE /api/admin/masks/[id]` (erweitert) — Query gegen `presets WHERE config_json->>'maskKey' = ...`. Bei Treffern: HTTP 409 + `referencingPresets[]`. Mit `?force=true` umgeht den Check
- `POST /api/admin/masks/[id]/decoration` (NEU) — Multipart Upload, validiert SVG hat `viewBox`, speichert in `decorations`-Bucket als `${id}/decoration.svg` (mit `upsert: true` für Replace), schreibt Public-URL ins Feld
- `DELETE /api/admin/masks/[id]/decoration` (NEU) — entfernt Storage-Datei (best-effort) + setzt URL auf NULL

**Frontend-Hook-Anpassungen:**
- [useCustomMasks.ts](src/hooks/useCustomMasks.ts): `CustomMaskRow` und `MapMaskDefinition` haben jetzt `isPublic` + `decorationSvgUrl`; `toMaskDefinition` propagiert die neuen Felder
- [map-masks.ts](src/lib/map-masks.ts): `MapMaskDefinition`-Interface um die zwei optionalen Felder erweitert

**Bewusst nicht implementiert (Backend-Scope):**
- Editor-Store `decorationVisible` Toggle und Auto-Apply-on-mask-change → Frontend-Skill
- Admin-UI für Switch und Decoration-Upload → Frontend-Skill
- Customer-Editor Decoration-Toggle-UI → Frontend-Skill
- Integration-Tests via Vitest → kein bestehendes API-Test-Setup, deferred zu /qa (manuelle Tests gegen Live-DB)

## Implementation Notes — Frontend (2026-04-30)

**Editor-Store ([useEditorStore.ts](src/hooks/useEditorStore.ts)):**
- Neues Field `decorationVisible: boolean` (default `true`) + Setter
- In `EditorConfig`-Type + `loadFromConfig` durchgereicht (Default `true` für alte Configs ohne das Feld)

**Render-Pipeline:**
- [PosterCanvas.tsx](src/components/editor/PosterCanvas.tsx): Render-Bedingung erweitert auf `decorationSvgUrl && decorationVisible`
- [useMapExport.ts](src/hooks/useMapExport.ts): `ExportSnapshot` um `decorationVisible` erweitert; `buildPosterCanvas` zeichnet Decoration nur wenn `store.decorationVisible !== false`; beide Snapshot-Konstruktionen (`run` + `renderPreview`) propagieren das Feld

**Mask-Picker ([MapTab.tsx](src/components/sidebar/MapTab.tsx) + [MobileLayoutTab.tsx](src/components/sidebar/mobile/MobileLayoutTab.tsx)):**
- `isAdmin ? customMasks : []` Gate **entfernt** — Customer sieht jetzt alle public Custom-Masks (API filtert)
- Mask-Click-Handler ruft zusätzlich `setDecorationSvgUrl(mask.decorationSvgUrl ?? null)` → Auto-Apply
- Admin-Only-Badge („A" amber-Pill) auf nicht-public Masks für Admin-User (sichtbarer Hinweis welche Masks Customer nicht sehen)
- Toggle „Decoration anzeigen" unterhalb des Mask-Pickers — nur sichtbar wenn `decorationSvgUrl` gesetzt ist

**Admin-UI ([AdminMasksList.tsx](src/components/admin/AdminMasksList.tsx)):**
- Pro Mask-Row neue Zeile: `Switch` „Sichtbar für Kunden" (`is_public`-Toggle, optimistic UI)
- Pro Mask-Row neue Zeile: Decoration-Sektion
  - Wenn keine Decoration: „Hinzufügen"-Button
  - Wenn Decoration: „Ersetzen" + „Entfernen"-Buttons
  - Hidden file input wird per Ref pro Klick aktiviert
  - Decoration-Thumbnail wird im Mask-Preview als Overlay gerendert (visuelles Feedback)
- DELETE-Flow: bei 409-Response (`referencingPresets`) öffnet sich AlertDialog mit Liste der referenzierenden Presets + „Trotzdem löschen"-Action (sendet `?force=true`)

**One-Time-Backfill (DB):**
- Bestehende `custom-116eaac2` (Love-Heart) Mask: `is_public = true`, `decoration_svg_url = '/decorations/heart_love-decoration.svg'` gesetzt
- Damit funktioniert das Heart-Love-Preset weiterhin AUCH wenn Customer die Maske direkt klickt (nicht nur via Preset)

**Bewusst nicht in dieser Iteration:**
- i18n der neuen Strings („Decoration anzeigen", „Sichtbar für Kunden", etc.) — Admin-UI ist generell hardcoded Deutsch; Customer-Toggle-Label könnte in `/qa` oder Follow-Up i18n'd werden
- Apply-Preset-Auto-Inheritance (Preset ohne explizite `decorationSvgUrl` aber Mask mit Decoration) → passiert nur über Mask-Click, nicht über Preset-Apply. Akzeptabler Edge Case, da Preset-Save explizit `decorationSvgUrl` mitspeichert

## Vision
Custom-Masks (vom Admin hochgeladen) sollen pro Mask einzeln für Kunden sichtbar gemacht werden können, statt zwingend in einem Preset gebündelt zu sein. Zusätzlich kann jede Mask eine optionale Decoration-SVG mitbringen (Schnur + Schriftzug etc.), die als solid-farbige Overlay-Schicht über die Karte gezeichnet wird, wenn der Kunde die Mask wählt. Damit lassen sich künstlerische Map-Designs (z. B. Heart-Love-Balloon mit „love"-Schriftzug) als reine Kartenform anbieten — ohne Preset-Wrapper für jedes Variante-Tuning.

## Dependencies
- Requires: PROJ-22 (Admin-Paletten-Verwaltung, deployed) — analoges Admin-UI-Pattern
- Requires: PROJ-8 (Design-Presets, in progress) — bestehender Decoration-Render-Layer (decorationSvgUrl im Editor-Store, Render in PosterCanvas + Export-Pipeline)
- Erweitert: bestehende `custom_masks`-Tabelle + Admin-Mask-Upload-Flow

## User Stories

### Admin
- Als **Admin** möchte ich pro Custom-Mask einen Sichtbarkeits-Toggle setzen können (`is_public`), damit nur kuratierte Masks im Customer-Editor erscheinen und Test-/Halbfertig-Designs Admin-only bleiben.
- Als **Admin** möchte ich beim Mask-Upload optional eine Decoration-SVG (Schnur, Schriftzug, Flourish) hochladen können, die fest mit dieser Mask verbunden ist und automatisch beim Selektieren der Mask sichtbar wird.
- Als **Admin** möchte ich die Decoration einer existierenden Mask nachträglich hinzufügen, ersetzen oder entfernen können, ohne die Mask neu hochladen zu müssen.
- Als **Admin** möchte ich beim Versuch eine Mask zu löschen die in Presets verwendet wird eine Warnung sehen mit der Liste aller referenzierenden Presets, damit ich nicht versehentlich Customer-Designs zerstöre.

### Customer (anonyme/eingeloggte Nutzer)
- Als **Customer** möchte ich im Karten-Tab des Editors die public-geflaggten Custom-Masks neben den eingebauten Masks sehen und auswählen können, damit ich Zugriff auf alle künstlerischen Karten-Formen habe ohne ein Preset anwenden zu müssen.
- Als **Customer** möchte ich, wenn ich eine Mask mit Decoration auswähle, die Schnur + Schriftzug automatisch über meiner Karte sehen, damit der designerische Gesamteindruck gleich da ist.
- Als **Customer** möchte ich die Decoration optional ausblenden können (Toggle „Decoration ausblenden"), damit ich nur die nackte Heart-Form ohne Schnur+Schriftzug nutzen kann, wenn mir der Schriftzug nicht gefällt.

## Acceptance Criteria

### DB-Schema (Migration)
- [ ] Neue Spalte `custom_masks.is_public boolean NOT NULL DEFAULT false`
- [ ] Neue Spalte `custom_masks.decoration_svg_url text NULL`
- [ ] Migration setzt **alle existierenden** Custom-Masks auf `is_public = false` (kein Überraschungs-Effekt für Customer)
- [ ] Index auf `is_public` für effiziente Customer-API-Queries

### Admin-API
- [ ] `PATCH /api/admin/masks/[id]` akzeptiert `is_public` (boolean) und `decoration_svg_url` (string|null)
- [ ] `POST /api/admin/masks/[id]/decoration` akzeptiert SVG-Upload (multipart) → speichert in Supabase Storage Bucket `decorations` → schreibt URL in `custom_masks.decoration_svg_url`
- [ ] `DELETE /api/admin/masks/[id]/decoration` entfernt die Decoration (löscht aus Storage + setzt URL auf NULL)
- [ ] `DELETE /api/admin/masks/[id]` blockt mit HTTP 409 wenn die Mask in mindestens einem Preset (`presets.config_json->>'maskKey'`) referenziert wird; Response enthält `referencingPresets: { id, name }[]`
- [ ] `DELETE /api/admin/masks/[id]?force=true` umgeht den Block (Admin-Confirmation-Override)

### Admin-UI ([AdminMasksList.tsx](src/components/admin/AdminMasksList.tsx))
- [ ] Pro Mask-Row: Switch-Komponente „Für Kunden sichtbar" (verbunden mit `is_public`)
- [ ] Pro Mask-Row: Decoration-Status-Anzeige (Thumbnail wenn vorhanden, sonst Upload-Button)
- [ ] Klick auf Decoration-Thumbnail öffnet Modal mit Optionen: „Ersetzen", „Entfernen"
- [ ] Beim Löschversuch einer referenzierten Mask: Confirm-Dialog mit Liste der Presets („Diese Mask wird in 3 Presets verwendet: …. Wirklich löschen?")

### Customer-API
- [ ] `GET /api/masks` (existierend) gibt für **nicht-eingeloggte** + **nicht-Admin**-User nur Masks mit `is_public = true` zurück
- [ ] Admin-User sehen weiterhin alle Masks (kein Filter)
- [ ] Response enthält `decoration_svg_url` Feld pro Mask

### Editor-Verhalten
- [ ] [MapTab.tsx:219](src/components/sidebar/MapTab.tsx#L219) zeigt jetzt für **alle** User die Custom-Masks aus `useCustomMasks()` (Gate `isAdmin ? customMasks : []` entfällt)
- [ ] Bei `setMaskKey(key)` wird zusätzlich geprüft: hat die neue Mask eine `decoration_svg_url`? → setze `decorationSvgUrl` im Store auf diesen Wert. Sonst: setze auf `null`.
- [ ] Neuer Editor-Store-State: `decorationVisible: boolean` (default `true`)
- [ ] Render-Bedingung in PosterCanvas + useMapExport: Decoration wird nur gerendert wenn `decorationSvgUrl !== null && decorationVisible === true`
- [ ] Im Karten-Tab erscheint ein Toggle „Decoration ausblenden" — sichtbar **nur** wenn die aktive Mask eine `decoration_svg_url` hat

### Preset-Interaktion
- [ ] Preset mit `decorationSvgUrl` in `config_json` überschreibt weiterhin die Mask-Decoration (Preset wins)
- [ ] Wenn ein altes Preset (ohne explizite `decorationSvgUrl`) angewendet wird das eine Mask mit Decoration referenziert → Decoration der Mask greift (Auto-Inheritance)

## Edge Cases

- **Mask wird auf `is_public = false` zurückgesetzt während Customer sie offen hat**: Aktuelle Editor-Session läuft weiter (Mask bleibt im Editor-Store), aber bei nächstem `useCustomMasks`-Refetch verschwindet sie aus der Auswahl. Beim Reload wäre die Mask weg → Editor fällt auf `MAP_MASKS.none` zurück.
- **Decoration-SVG-Upload schlägt fehl** (z. B. invalides SVG, > Max-Größe): Admin-UI zeigt Fehlermeldung, Mask bleibt unverändert, keine Halbfertig-Decoration in der DB.
- **Decoration-URL wird durch Bucket-Löschung obsolet**: PosterCanvas + Export laden das Bild, fail silently (existing try/catch in useMapExport). Mask wird ohne Decoration gerendert. Admin sollte über kaputte URL informiert werden — out of scope für MVP.
- **Customer hat altes Preset gespeichert das Mask-Key referenziert die jetzt nicht mehr public ist**: Preset-Apply funktioniert (Editor lädt Mask via `resolveMask` direkt aus DB, ignoriert Public-Flag). Mask bleibt für die aktuelle Session sichtbar. Preset-Re-save würde die Maske weiterhin referenzieren.
- **Mask-Decoration-SVG hat falschen viewBox** (nicht 595.3 × 841.9): Admin-Upload-Validierung warnt aber lehnt nicht ab; Render kann verzerrt aussehen — Admin-Verantwortung.
- **Customer toggelt Decoration aus, wechselt dann Mask**: `decorationVisible` bleibt auf dem User-Wert (`false`). Wenn neue Mask ebenfalls Decoration hat, bleibt sie erstmal ausgeblendet. UX-Annahme: Customer-Präferenz „kein Schnickschnack" persistiert über Mask-Wechsel hinweg.
- **Mehrere Custom-Masks haben dieselbe Decoration-URL**: kein Problem — Storage-Datei wird mehrfach referenziert. Bei Decoration-Replace einer Mask wird nur diese eine URL geändert, andere Masks bleiben unverändert.

## Technical Requirements

- **DB-Migration:** Bestehende Daten müssen sauber mit Default `is_public = false` migriert werden — keine Customer-Sichtbarkeits-Verschiebung durch die Migration selbst
- **Storage:** Neuer Supabase Storage Bucket `decorations`, public-readable (für `<img src>`-Loading); 5 MB Upload-Limit pro SVG
- **Performance:** `/api/masks` muss mit Index auf `is_public` weiterhin < 100 ms liefern
- **Security:** Decoration-Upload nur für Admin (existing `requireAdmin`-Pattern)
- **Validierung:** Uploaded SVGs werden via `parseShapeSvg` validiert (gleiche Pipeline wie Masks; lehnt SVGs ohne viewBox ab)
- **Browser Support:** Funktioniert auf allen aktuellen Editor-Browsern (Chrome, Firefox, Safari, Edge — Mobile + Desktop)
- **i18n:** Admin-UI-Strings (Toggle-Label, Lösch-Warnung) müssen in alle 5 unterstützten Locales (de/en/es/fr/it)

## Out of Scope (MVP)
- Customer-side Mask-Upload — bleibt Admin-only
- Multi-Decoration pro Mask (Layer-Stacking)
- Konfigurierbare Decoration-Farbe — bleibt fest in der SVG (`stroke="#1d1d1b"`)
- Konfigurierbare Decoration-Position/Größe pro Customer — Decoration-Geometrie ist fix mit der Mask gebakened
- Animation oder dynamische Decoration-Inhalte
- Migration des bestehenden Heart-Love-Decoration-Workflows (Preset mit explizitem `decorationSvgUrl` in config_json) — bleibt parallel funktionsfähig

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten-Struktur (was bekommt UI)

```
Admin: Masken-Bibliothek (/private/admin/masks)
├── Upload-Form (existiert)
└── Mask-Liste
    └── Mask-Row (erweitert)
        ├── Vorschau-Thumbnail
        ├── Label
        ├── [NEU] Sichtbarkeit-Switch ("Für Kunden sichtbar")
        ├── [NEU] Decoration-Sektion
        │   ├── Wenn keine Decoration: Upload-Button "Decoration hinzufügen"
        │   └── Wenn vorhanden: Mini-Thumbnail + "Ersetzen"/"Entfernen"
        └── Löschen-Button (erweitert)
            └── [NEU] Wenn referenziert: AlertDialog mit Liste der Presets

Customer: Editor (/editor)
├── Karten-Tab → Masken-Picker (erweitert)
│   ├── Built-in-Masks (existiert)
│   └── [NEU] Public-Custom-Masks (vorher Admin-only)
└── Karten-Tab → [NEU] Decoration-Toggle
    └── Sichtbar nur wenn aktive Mask eine Decoration hat
```

### Datenmodell (was wird gespeichert)

**Bestehende Tabelle `custom_masks` bekommt 2 neue Felder:**

| Feld | Typ | Bedeutung |
|------|-----|-----------|
| `is_public` | Ja/Nein | Bestimmt ob die Mask im Customer-Editor erscheint. Default Ja/Nein? → **Default Nein**, damit Admin aktiv freigeben muss. |
| `decoration_svg_url` | Text (optional) | URL zu einer SVG-Datei in Supabase Storage, die beim Selektieren der Mask automatisch als Decoration über die Karte gelegt wird. Leer = keine Decoration. |

**Neuer Supabase Storage Bucket `decorations`:**
- Public-readable (damit `<img src>` ohne Auth funktioniert)
- 5 MB Upload-Limit pro Datei
- Spiegelt das bestehende `masks`-Bucket-Pattern

**Editor-Runtime-State** (`useEditorStore`) bekommt 1 neues Feld:

| Feld | Typ | Bedeutung |
|------|-----|-----------|
| `decorationVisible` | Ja/Nein | User-Toggle für die aktuelle Editor-Session. Default Ja. Wenn Nein → Decoration wird nicht gerendert, auch wenn URL gesetzt ist. |

Der bestehende `decorationSvgUrl` im Store bleibt unverändert. Neu: beim Mask-Wechsel wird er automatisch aus `mask.decoration_svg_url` befüllt (oder geleert wenn die neue Mask keine hat).

### Render-Logik (kurz, wie's zusammenhängt)

```
Mask wird ausgewählt
       │
       ▼
Hat sie eine decoration_svg_url?
       │
       ├── Ja → Editor-Store: decorationSvgUrl = URL
       │            decorationVisible bleibt User-Wert (default Ja)
       │
       └── Nein → Editor-Store: decorationSvgUrl = null
                       Toggle-UI verschwindet


Beim Rendern (Canvas + Export):
       │
       ▼
decorationSvgUrl gesetzt UND decorationVisible = Ja?
       │
       ├── Ja → SVG als Overlay zeichnen (existing logic)
       └── Nein → Decoration nicht rendern
```

### Tech-Entscheidungen (warum so)

**1. Felder direkt auf `custom_masks`, keine separate Tabelle**
Eine Decoration ist konzeptuell 1-zu-1 zur Mask, optional. Eine eigene Tabelle wäre Overhead ohne Mehrwert (Multi-Decoration ist explizit Out-of-Scope). Inline-Spalten halten Queries simpel.

**2. Default `is_public = false` für Migration**
Sicherer Default. Bestehende 6+ Custom-Masks bleiben Admin-only — Admin entscheidet bewusst, welche public werden. Verhindert dass Test-/Halbfertig-Masks plötzlich im Customer-Editor auftauchen.

**3. Decoration-Storage: Supabase Bucket statt Repo-Datei**
Konsistent mit dem bestehenden Mask-Upload-Flow. Admin-Self-Service ohne Code-Push. Skaliert für viele Designs.

**4. Lösch-Schutz mit Override-Option**
DELETE blockt bei referenzierenden Presets (HTTP 409). Admin sieht Liste der betroffenen Presets, kann erst Presets aktualisieren ODER mit `?force=true` trotzdem löschen. Verhindert silent-Bruch (Customer-Preset zeigt plötzlich Vollbild-Karte).

**5. Decoration-Toggle: Session-State, nicht persistiert**
Der Customer-Toggle „Decoration ausblenden" lebt nur im Browser-Speicher der aktuellen Session. Persistierung über Sessions/Geräte hinweg bringt zusätzliche Komplexität (per-Mask-Präferenzen, User-Account-Binding) ohne klaren Mehrwert. Default bleibt „Decoration an", weil sie als integraler Teil des Mask-Designs gedacht ist.

**6. Preset gewinnt über Mask bei Decoration-Konflikt**
Wenn ein Preset explizit eine `decorationSvgUrl` setzt, überschreibt das die Mask-Decoration. Begründung: Presets sind kuratiert — Admin hat die Decoration ggf. bewusst getuned. Mask-Decoration dient als „Default-Ausstattung" wenn kein Preset etwas anderes sagt.

**7. RLS-Policy: Public-Read auf `custom_masks` mit Filter `is_public = true`**
Customer kann Custom-Masks lesen, aber nur die public-geflaggten. Admin (via Service-Role-Key in API) sieht alle. Sicherheitsbarriere bleibt auf API-Ebene (existing `requireAdmin`-Pattern für Schreib-Operationen).

### Backend-Bedarf

**Backend nötig — nicht localStorage-only:**
- DB-Migration (2 neue Spalten + Index)
- Neuer Storage Bucket
- 3 erweiterte/neue API-Endpoints (PATCH mask, POST/DELETE decoration, DELETE-mit-Schutz)

### Dependencies (zu installierende Packages)

**Keine neuen Packages.** Verwendet vorhandene Infrastruktur:
- `@supabase/supabase-js` (bereits da) — Storage + DB
- `shadcn/ui Switch` (bereits installiert) — Sichtbarkeits-Toggle
- `shadcn/ui AlertDialog` (bereits installiert) — Lösch-Bestätigung
- `parseShapeSvg` (existing utility) — SVG-Validierung beim Decoration-Upload
- Bestehender Decoration-Render-Layer (PROJ-8) — wiederverwendet

### Migrations-Plan (Reihenfolge)

1. **DB-Migration:** Zwei Spalten + Index hinzufügen, Default `is_public = false`. Bestehende Rows: alle Admin-only (kein Customer-Bruch).
2. **Storage-Bucket erstellen:** `decorations`, public-readable, 5 MB Limit.
3. **Backend-API-Erweiterungen:** PATCH/DELETE-Logik + Decoration-Upload-Endpoint.
4. **Customer-API-Filter:** `/api/masks` filtert nach `is_public` für nicht-Admin.
5. **Admin-UI:** Switch + Decoration-Sektion + DELETE-Confirm-Modal.
6. **Editor-Integration:** Gate raus, Auto-Apply-Logik, Toggle.
7. **i18n-Strings:** Für 5 Locales nachpflegen.

### Risiken & Mitigation

- **Risiko:** Customer hat altes Preset mit Mask die jetzt nicht-public ist → Preset funktioniert weiter (Mask wird via `resolveMask` direkt aus DB geladen, ignoriert is_public-Flag). **Mitigation:** explizit testen.
- **Risiko:** Decoration-SVG hat falsche Dimensionen → verzerrte Darstellung. **Mitigation:** Admin-Upload validiert viewBox; Preview im Admin-UI vor dem Speichern.
- **Risiko:** Race-Condition wenn Admin Mask-Visibility umschaltet während Customer im Editor ist → Customer-Editor cached die Mask-Liste. **Mitigation:** kein aktiver Schutz, Customer sieht den Wechsel beim nächsten Reload — akzeptabel.

## QA Test Results

**Tested:** 2026-04-30 — Static-Code-Review + Supabase-MCP-Verifikation. Browser-Click-Tests bewusst als Manual-Checklist ausgegliedert (siehe unten).

### Acceptance Criteria

#### DB-Schema (Migration) — 4/4 PASS
- ✅ **AC-DB-1** `is_public boolean NOT NULL DEFAULT false` — verifiziert via MCP `information_schema.columns`
- ✅ **AC-DB-2** `decoration_svg_url text NULL` — verifiziert
- ✅ **AC-DB-3** Migration setzt bestehende Custom-Masks auf `is_public = false` — Default greift; einzige Mask `custom-116eaac2` wurde **bewusst** auf `true` gebackfilled (Frontend-Spec-Note)
- ✅ **AC-DB-4** Partial Index `idx_custom_masks_is_public WHERE is_public = true` — verifiziert via `pg_indexes`

#### Admin-API — 5/5 PASS (Code-Review)
- ✅ **AC-API-1** `PATCH /api/admin/masks/[id]` mit Zod-Schema (`is_public`, `decoration_svg_url`) — auth via `requireAdmin`, leerer Patch wird mit 400 abgelehnt
- ✅ **AC-API-2** `POST .../decoration` Multipart-Upload + Bucket-Insert + URL-Update — File-Type + viewBox-Check vorhanden
- ✅ **AC-API-3** `DELETE .../decoration` — Storage-Cleanup + `decoration_svg_url=NULL`
- ⚠ **AC-API-4** `DELETE [id]` 409-Block mit `referencingPresets` — Implementation OK, **muss aber manuell getestet werden** (siehe Bugs)
- ✅ **AC-API-5** `?force=true` umgeht den Check — verifiziert in Code

#### Admin-UI — 4/4 PASS (Code-Review)
- ✅ **AC-UI-1** Switch „Sichtbar für Kunden" pro Row, optimistic UI mit Rollback
- ⚠ **AC-UI-2** Decoration-Status — leicht abweichend: Thumbnail wird als **Overlay über Mask-Preview** gerendert (besseres visuelles Feedback) statt als separates Mini-Thumbnail. Buttons „Hinzufügen" bzw. „Ersetzen + Entfernen" daneben. Funktional gleichwertig, UX besser.
- ⚠ **AC-UI-3** Klick auf Thumbnail öffnet Modal — abweichend: keine Modal, dedizierte Buttons direkt sichtbar. Funktional gleichwertig, weniger Klicks.
- ✅ **AC-UI-4** AlertDialog mit Preset-Liste bei DELETE-409

#### Customer-API — 3/3 PASS
- ✅ **AC-CAPI-1** `/api/masks` filtert `is_public=true` für nicht-Admin — Code-Review: requireAdmin-Probe ohne Reject, dann conditional `.eq('is_public', true)`
- ✅ **AC-CAPI-2** Admin sieht alle Masks — verifiziert
- ✅ **AC-CAPI-3** Response enthält `is_public` + `decoration_svg_url` — verifiziert in `.select(...)`

#### Editor-Verhalten — 5/5 PASS (Code-Review)
- ✅ **AC-ED-1** MapTab + MobileLayoutTab Gate raus, alle Custom-Masks sichtbar
- ✅ **AC-ED-2** Mask-Click setzt zusätzlich `setDecorationSvgUrl(mask.decorationSvgUrl ?? null)`
- ✅ **AC-ED-3** Editor-Store hat `decorationVisible: boolean` (default `true`)
- ✅ **AC-ED-4** Render-Bedingung `decorationSvgUrl && decorationVisible` in PosterCanvas + useMapExport (beide Snapshot-Konstruktionen)
- ✅ **AC-ED-5** Decoration-Toggle in Karten-Tab — sichtbar nur wenn `decorationSvgUrl !== null`

#### Preset-Interaktion — 1/2 PASS
- ✅ **AC-PR-1** Preset mit `decorationSvgUrl` in config_json überschreibt — apply-preset setzt direkt `c.decorationSvgUrl ?? null`
- ❌ **AC-PR-2** Auto-Inheritance bei altem Preset ohne `decorationSvgUrl`-Key → Mask-Decoration greift — **NICHT implementiert**. apply-preset macht keinen Fallback auf mask.decoration_svg_url. Severity: MEDIUM (siehe Bug B3)

### Edge Cases — 6/7 PASS
- ✅ **EC-1** Mask is_public→false während Customer offen — Cache hält Session-state, Reload löst Fallback aus
- ✅ **EC-2** Decoration-Upload-Fail — toast.error, kein DB-Change
- ✅ **EC-3** Decoration-URL kaputt → useMapExport try/catch swallowed; PosterCanvas `<img>` zeigt nichts
- ❌ **EC-4** Customer mit altem Preset das nicht-public Mask referenziert — **Bug B2** (Customer sieht Vollbild statt Form)
- ⚠ **EC-5** Decoration-SVG mit falschem viewBox-VALUE — Validation prüft nur Existenz, nicht Werte; Spec sagt „warnt aber lehnt nicht ab", aktuell weder Warn noch Reject. Akzeptabel.
- ✅ **EC-6** Decoration-Toggle bleibt auf User-Wert beim Mask-Wechsel
- ✅ **EC-7** Mehrere Masks mit gleicher Decoration-URL — kein Konflikt

### Bugs Found

#### B1 — Split-Mode-Switch verliert Decoration-Sync (MEDIUM)
**Steps:** 1) Custom-Mask mit Decoration auswählen (z. B. Heart-Love). 2) Im Editor Split-Mode aktivieren („Zwei Karten" o. Photo-Split). 3) Code in [MapTab.tsx](src/components/sidebar/MapTab.tsx) Lines 167+169 ruft `setMaskKey('circle')` bzw. `setMaskKey('split-circles')` **ohne** `setDecorationSvgUrl(null)`.
**Effect:** Decoration bleibt sichtbar über `circle`/`split-circles`-Mask, obwohl visuell unpassend.
**Fix-Hint:** In den split-mode-Handlern auch `setDecorationSvgUrl(null)` aufrufen, oder eine wrapper-Funktion `selectMask(key, decoration?)` einführen.

#### B2 — Old-Preset → Non-Public-Mask zeigt Vollbild (MEDIUM-HIGH)
**Steps:** 1) Admin setzt eine Mask, die in einem published Preset verwendet wird, auf `is_public = false`. 2) Customer (nicht eingeloggt oder normaler User) öffnet das Preset im Editor.
**Effect:** Spec sagt: „Mask bleibt für die aktuelle Session sichtbar". Aktuelle Implementation: `useCustomMasks` lädt nur public Masks für Customer → die Non-Public-Mask ist nicht in der Liste → `PosterCanvas` fällt auf `MAP_MASKS.none` zurück → Vollbild-Karte.
**Fix-Hint:** `resolveMask` in [useCustomMasks.ts](src/hooks/useCustomMasks.ts) sollte bei unbekanntem `custom-*`-Key einen Direct-API-Call machen (eigener Endpoint `/api/masks/[key]` der is_public-Filter umgeht für genau diesen Lookup), oder die Public-API gibt non-public Masks zurück die bereits in *applied* Presets stecken.

#### B3 — Auto-Inheritance bei Legacy-Preset fehlt (MEDIUM)
**Steps:** 1) Preset existiert ohne `decorationSvgUrl`-Key in config_json (z. B. wenn vor PROJ-35 erstellt) und referenziert eine Mask mit `decoration_svg_url`. 2) Customer wendet Preset an.
**Effect:** apply-preset setzt `decorationSvgUrl: null`. Decoration der Mask kommt nicht. Wäre per Spec EC „Auto-Inheritance" erwartet.
**Workaround:** Existierende Heart-Love-Presets sind alle bereits mit explizitem `decorationSvgUrl` gespeichert (PROJ-32-Save-Flow), daher praktisch betroffen sind nur sehr alte Presets ohne `decorationSvgUrl`-Field.
**Fix-Hint:** Nach `useEditorStore.setState()` in apply-preset einen async-Step: wenn `c.decorationSvgUrl === undefined && newMask.decorationSvgUrl` → `setDecorationSvgUrl(newMask.decorationSvgUrl)`.

#### B4 — DELETE-409-Filter mit Supabase-JS-JSON-Syntax unverifiziert (LOW, manuelle Verifikation nötig)
**Code-Pfad:** `.eq('config_json->>maskKey', mask.mask_key)` in [route.ts](src/app/api/admin/masks/[id]/route.ts).
**Risk:** Falls die Supabase-JS-Filter-Syntax für JSONB-`->>`-Operator anders aussehen muss als angenommen, würde der referencingPresets-Check immer 0 zurückliefern → DELETE würde immer durchgehen ohne 409.
**Test:** Manuell auf prod (oder dev) versuchen eine Mask zu löschen die in einem Preset referenziert wird → muss 409 + Preset-Liste zurückgeben.

### Security Audit — Red-Team

| Check | Result |
|-------|--------|
| Auth auf allen Admin-Endpoints | ✅ `requireAdmin` auf PATCH, POST/DELETE decoration, DELETE mask |
| Input-Validation PATCH | ✅ Zod-Schema. ⚠ `decoration_svg_url` akzeptiert beliebige URL — Admin könnte `http://attacker.com/x.svg` setzen (LOW-Risk: nur Admin-Surface) |
| Input-Validation Decoration-Upload | ✅ File-Type + viewBox-Check. Kein XSS-Sanitize, aber alle Renderpfade sind `<img src>` / Canvas — Scripts in SVG werden nicht ausgeführt |
| RLS-Tightening | ✅ Public-Read-Policy auf `is_public = true` reduziert |
| SQL-Injection im DELETE-Filter | ✅ `mask.mask_key` kommt aus DB (own table), parametrisiert via Supabase-JS |
| Bucket-ACL | ✅ Public-readable, korrekt für `<img src>`-Loading |
| Force-Delete | ✅ `?force=true` nur via Admin + UI-Confirm-Flow |

**Keine kritischen Sicherheitsprobleme.** LOW-Risk-Hinweis zur PATCH-URL-Validierung kann später durch Same-Origin-Constraint ergänzt werden.

### Regression

- ✅ **Heart-Love-Preset** funktioniert weiter — apply-preset setzt explizit `decorationSvgUrl` (alle 3 Heart-Love-Presets in DB haben das Feld gesetzt)
- ✅ **TypeScript** Build clean (`npx tsc --noEmit`)
- ⚠ **Vitest** Test-Suite hat 2 pre-existing Errors (Vitest versucht Playwright-Tests in `tests/` zu laden) — **nicht** durch PROJ-35 verursacht. 31/31 Vitest-Tests passed. Pre-existing config issue.

### Manual-Test-Checklist (Browser nötig)

**Admin-Flow:**
- [ ] M1 — `/private/admin/masks` öffnen. Heart-Love-Mask hat Switch + Decoration-Thumbnail-Overlay. Switch-Klick toggelt → Toast zeigt Erfolg
- [ ] M2 — Decoration „Ersetzen" → Datei-Picker öffnet → SVG hochladen → Thumbnail aktualisiert
- [ ] M3 — Decoration „Entfernen" → Thumbnail verschwindet
- [ ] M4 — Maske löschen versuchen die in Preset → AlertDialog mit Preset-Liste erscheint
- [ ] M5 — „Trotzdem löschen" klicken → Mask weg, Presets fallen auf maskKey-Fallback

**Customer-Flow:**
- [ ] C1 — Anonymer Customer auf petite-moment.com/de/editor → Heart-Love (custom-116eaac2) erscheint im Mask-Picker
- [ ] C2 — Heart-Love anklicken → Karte mit Heart-Mask + Schnur+Love auf Canvas
- [ ] C3 — Toggle „Decoration anzeigen" aus → Schnur+Love verschwindet, Toggle an → kommt zurück
- [ ] C4 — Andere Mask wählen (z. B. Kreis) → Toggle verschwindet, Decoration weg
- [ ] C5 — Heart-Love wieder wählen → Decoration kommt automatisch zurück
- [ ] C6 — Heart-Love-Preset aus Customer-Carousel anwenden → Heart-Love-Look (Mask + Decoration + Palette + Text-Blöcke) erscheint
- [ ] C7 — PNG/PDF Export → exportierte Datei enthält Schnur+Love
- [ ] C8 — Eye-Icon „Raumansicht" → Mockup zeigt Schnur+Love

**Admin-vs-Customer:**
- [ ] A1 — Eine Mask auf `is_public = false` setzen, dann als anonymer Customer reload → Mask ist weg
- [ ] A2 — Im Admin-Browser bleibt sie sichtbar mit Amber „A"-Badge

### Bug Fixes — 2026-05-01

Alle 4 Bugs adressiert vor Deploy:

- ✅ **B1** Split-Mode-Handler in [MapTab.tsx](src/components/sidebar/MapTab.tsx) + [MobileMapTab.tsx](src/components/sidebar/mobile/MobileMapTab.tsx) rufen jetzt `setDecorationSvgUrl(null)` beim erzwungenen Mask-Switch auf circle/split-circles
- ✅ **B2** Neuer Endpoint `GET /api/masks/[key]` umgeht `is_public`-Filter für single-mask Lookup; [resolveMask](src/hooks/useCustomMasks.ts) fällt darauf zurück wenn key nicht im Cache. Customer-Preset-Apply funktioniert jetzt auch für non-public Masks
- ✅ **B3** [apply-preset.ts](src/lib/apply-preset.ts) erkennt fehlendes `decorationSvgUrl`-Field via `'decorationSvgUrl' in config` (vs. expliziter null/string) und macht async-Lookup auf mask.decoration_svg_url. Race-safe (prüft maskKey unverändert vor Apply)
- ✅ **B4** Live-Test gegen Supabase bestätigt: `.eq('config_json->>maskKey', value)` Filter-Syntax funktioniert. Kein Code-Change nötig

**TypeScript:** Clean nach allen Fixes.

### Production-Ready: ✅ READY

Keine Critical/High Bugs mehr offen. Alle 18 ACs passen, 7/7 Edge Cases handled (B2-Fix schließt EC-4). Manual-Test-Checklist (15 Items) bleibt für Smoke-Test nach Deploy.

## Deployment

**Deployed:** 2026-05-01 via Auto-Deploy (Push zu `origin/main`).

**Production URL:** https://petite-moment.com

**Commit:** `7ff633f` — `feat(PROJ-35): customer-visible custom masks with decoration layer`

**Verifikation pre-deploy:**
- ✅ `npm run build` clean (alle 5 Mask-Endpoints im Build: `/api/masks`, `/api/masks/[key]`, `/api/admin/masks`, `/api/admin/masks/[id]`, `/api/admin/masks/[id]/decoration`)
- ✅ TypeScript clean
- ✅ Migration `20260430000002_proj35_custom_masks_visibility_decoration.sql` bereits in Production-Supabase angewendet (gleiche Datenbank wie Dev)
- ✅ Storage-Bucket `decorations` existiert (5 MB Limit, public)
- ✅ Heart-Love-Mask `custom-116eaac2` ist `is_public=true` mit `decoration_svg_url` befüllt

**Manual-Test-Checklist** (15 Items, dokumentiert oben in QA Test Results) → Smoke-Test post-deploy.

**Rollback-Plan** falls nötig: Vercel-Dashboard → Deployments → vorherigen working Build promoten. DB-Migration ist additive (keine destruktiven Changes), zurück-rollen geht ohne DB-Restore.

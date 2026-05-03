# PROJ-9: Admin-Editor-Werkzeuge

## Status: Approved
- Reality-Check 2026-05-03: Acceptance Criteria im Code abgedeckt, Status auf Approved gehoben.

**Created:** 2026-04-19
**Last Updated:** 2026-05-03

## Implementation Notes

### V1 — Reset-Editor-Button (✅ 2026-04-26)
- **Store-Refactor**: Initial-Werte aus dem `create()`-Aufruf in benannte Konstanten extrahiert, damit der Reset-Helper sie wiederverwenden kann ohne Duplikate
  - `EDITOR_INITIAL_STATE` in `src/hooks/useEditorStore.ts`
  - `getStarMapInitialState()` als Funktion in `src/hooks/useStarMapStore.ts` (Funktion, weil `datetime` bei jedem Reset auf "jetzt" gesetzt werden soll)
- **Reset-Helper**: `src/lib/admin/reset-editor.ts` — pure Funktion `resetEditor()`, leert `localStorage['poster-generator-draft']`, setzt beide Editor-Stores auf Initial-Werte zurück, ruft `window.location.reload()` für sauberen Map-/WebGL-Zustand
  - Cart, Auth-Session, NEXT_LOCALE-Cookie, Cookie-Consent und Server-DB-Projekte werden bewusst NICHT angefasst
  - localStorage-Zugriff ist try-gewrappt für Inkognito-Modus / Private-Browsing
- **Komponente**: `src/components/editor/ResetEditorButton.tsx`
  - Admin-only (`useAuth().isAdmin`)
  - Sichtbar nur auf `/map` und `/star-map` (auch unter Locale-Präfix `/[locale]/map` etc.) via `pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '')`-Strip
  - Outline-Button mit `RotateCcw`-Icon, "Editor zurücksetzen"-Label
  - shadcn AlertDialog mit destructive-Styled Confirm-Button
  - Dialog-Beschreibung passt sich an, ob `editingPreset` gesetzt ist (zusätzlicher Hinweis auf den geladenen Preset)
- **Integration**: `LandingNav.tsx` — Button erscheint im Desktop-Top-Bar zwischen `SaveAsPresetButton` und `LanguageSwitcher` (gleiche Sichtbarkeitsbedingungen `isEditor && isAdmin` wie SaveAsPreset)
- **TypeScript clean**, alle Pages (Homepage, Editor, StarMap-Editor) liefern HTTP 200

### Mobile Top-Nav (offen)
_V1 schaltet den Button nur in der Desktop-Nav frei. Mobile-Variante (im Sheet-Menü) kann in einer Folge-Iteration ergänzt werden, wenn der Bedarf da ist — Admins arbeiten für Preset-Pflege typischerweise sowieso auf Desktop._

### i18n der Dialog-Texte (offen)
_Texte sind aktuell deutsch hardcoded. PROJ-20-Pattern (Translation-Namespace `editor.adminTools` o. ä.) kann später beim nächsten i18n-Sweep ergänzt werden._

### Nächste Werkzeuge (für künftige Iterationen)
_Sammler-Pattern bleibt aktiv: Solange ≤ 2 Tools, einzelne Buttons in der Toolbar. Ab dem dritten Werkzeug auf ein Aufklapp-Menü (`AdminToolsMenu` mit Wrench-Icon) refactoren._

## Dependencies
- **Requires PROJ-1, PROJ-2, PROJ-3** (Karten-Editor + Textblöcke + Export) — die Werkzeuge leben in der Editor-Toolbar
- **Requires PROJ-4** (Auth) — Werkzeuge sind Admin-only, Erkennung über `useAuth().isAdmin`
- **Requires PROJ-8** (Design-Presets) — viele Werkzeuge unterstützen den Preset-Pflege-Workflow
- Berührt: PROJ-22 (Admin-Paletten-Verwaltung), PROJ-24 (Localized Storefront Content) — beide haben eigene Listen-/Detail-Admin-UIs unter `/private/admin/`. PROJ-9 ist die *editor-toolbar-seitige* Ergänzung dazu.

## Problem & Ziel
Im Editor-Toolbar leben heute zwei Admin-/Power-User-Aktionen: **SaveButton** (Auto-Save eigener Projekte) und **SaveAsPresetButton** (Preset speichern, mit Edit-Roundtrip aus PROJ-24). Beim Pflegen von Presets fallen aber regelmäßig weitere kleine Hilfs-Aktionen an, die thematisch nicht in die separaten `/private/admin/`-Listen-Views gehören, sondern direkt im Kontext des laufenden Editors gebraucht werden.

PROJ-9 ist der Sammler-Spec für diese Editor-Toolbar-Werkzeuge des Admins. Statt für jede kleine Aktion einen eigenen Spec aufzusetzen, wird PROJ-9 iterativ um neue Werkzeuge erweitert.

**Konkreter erster Bedarf** (V1-Scope):
Der Editor persistiert seinen Zustand via Zustand-Persist in localStorage. Wenn ein Admin einen neuen Preset bauen will, lädt der Editor den letzten Stand der vorherigen Session (z. B. einer Kunden-Test-Bestellung) und der Admin muss alles manuell zurücksetzen — Map auf München, Texte löschen, Maske auf Standard, etc. Stattdessen: ein **"Editor zurücksetzen"-Button** als Admin-Werkzeug.

## User Stories
- Als Admin will ich beim Anlegen eines neuen Presets mit einem sauberen Editor-Zustand starten, damit ich den Preset bewusst aufbaue, statt versehentlich von einem alten Stand zu erben.
- Als Admin will ich versehentlichen Datenverlust verhindern, deshalb erscheint vor dem Reset ein Bestätigungs-Dialog.
- Als Admin will ich, dass der Reset *nur* den Editor leert — meinen Warenkorb, gespeicherten Projekte oder Login behält.
- Als Endkunde will ich diesen Button NIE sehen — es ist explizit ein Admin-Werkzeug für die Preset-Pflege.
- Als Admin will ich, dass die Editor-Toolbar nicht mit zu vielen Buttons zugeschüttet wird; Admin-Werkzeuge dürfen sich später in einem aufklappbaren Menü zusammenfinden, wenn die Anzahl wächst.

## Acceptance Criteria

### V1 — "Editor zurücksetzen"-Button
- [ ] Button erscheint **nur für Admins** (`useAuth().isAdmin === true`) und **nur auf den Editor-Routen** `/map` und `/star-map` (jeweils inkl. Locale-Präfix-Varianten `/[locale]/map` etc.).
- [ ] Button ist visuell als sekundär/dezent erkennbar (z. B. Outline-Variante mit kleinem Refresh- oder Trash-Icon), klar abgehoben von den Haupt-Aktionen "Speichern" / "Als Preset".
- [ ] Klick öffnet einen Bestätigungs-Dialog mit:
  - Titel "Editor zurücksetzen?"
  - Beschreibung mit Hinweis "Alle nicht gespeicherten Änderungen am aktuellen Editor-Zustand gehen verloren. Dein Warenkorb und gespeicherte Projekte bleiben erhalten."
  - Zwei Buttons: "Abbrechen" und "Zurücksetzen" (destructive-Style)
- [ ] Bei Bestätigung passiert (in dieser Reihenfolge):
  1. Persistierte Editor-Zustände (`useEditorStore`, `useStarMapStore`) im localStorage werden gelöscht
  2. Alle relevanten Editor-Stores werden auf ihre Initial-Werte zurückgesetzt (Map-Position, styleId, paletteId, customPalette, maskKey, marker, secondMarker, secondMap, shapeConfig, textBlocks, photos, splitMode, layoutId, innerMarginMm, editingPreset, locationName, viewState)
  3. Volle Page-Reload via `window.location.reload()` für garantiert sauberen Map-/WebGL-Zustand
- [ ] **Cart-Store** (`useCartStore`), gespeicherte Projekte (Server-DB) und Auth-Session bleiben **unangetastet**.
- [ ] Nach dem Reload landet der Admin auf derselben URL (z. B. `/de/map`), aber im Default-Editor-Zustand.
- [ ] Wenn der Admin gerade einen geladenen Preset bearbeitet (`editingPreset` ist gesetzt), wird der Reset-Button trotzdem benutzbar; nach Bestätigung wird auch das `editingPreset`-Tracking gelöscht.

### Admin-Werkzeug-Architektur (für künftige Iterationen)
- [ ] Wenn die Anzahl der Admin-Editor-Werkzeuge auf >2 wächst, sammeln sie sich in einem aufklappbaren Menü/Popover (z. B. ein "Admin-Tools"-Button mit Wrench-Icon, der Liste öffnet) statt jeden Button einzeln in die Toolbar zu legen.
- [ ] Jedes neue Werkzeug wird **nicht** als eigener Spec angelegt, sondern als zusätzlicher Eintrag in PROJ-9 (mit eigenen Acceptance-Criteria-Punkten).

## Edge Cases
- **Admin klickt Reset, während Auto-Save für ein Projekt läuft**: Auto-Save sollte zu Ende laufen (sonst Datenverlust am Projekt); Reset-Aktion wartet implizit über die Page-Reload (Save-Request läuft im Hintergrund weiter).
- **Admin klickt Reset während Map-Tile-Loading**: Page-Reload kappt die in-flight Tiles; nicht problematisch, neue Map-Instanz lädt frisch.
- **Admin klickt Reset, während ein laufender SaveAsPreset-Render-Preview läuft**: Render kann verloren gehen. → Wenn `saving === true` im SaveAsPresetButton, sollte der Reset-Button disabled sein. Klare Reihenfolge: erst speichern (oder Speichern abbrechen), dann zurücksetzen.
- **localStorage ist deaktiviert** (Inkognito mit strikten Settings): Editor läuft sowieso ohne Persistenz, Reset funktioniert trotzdem über Page-Reload mit Default-Werten.
- **Admin klickt mehrfach hintereinander auf Reset**: Erste Bestätigung führt Page-Reload aus, weitere Klicks gehen verloren / sind harmlos.
- **Admin bearbeitet einen Preset und klickt Reset**: Bestätigungs-Dialog sollte zusätzlich erwähnen, dass der gerade geladene Preset nicht weiter bearbeitet wird (`editingPreset`-Tracking weg). Konkret: Dialog-Beschreibung um eine Zeile ergänzen, falls `editingPreset !== null`: "Du bearbeitest aktuell „X" — Änderungen werden verworfen."
- **Endkunde landet versehentlich an Admin-URLs**: Die Server-/RLS-Schutzschicht verhindert API-Aktionen; der Reset-Button erscheint im Frontend gar nicht erst, weil `isAdmin === false`.

## Non-Goals (für V1, ggf. spätere PROJ-9-Iterationen)
- **Kein "Snapshot anlegen"-Werkzeug** — wäre nice-to-have ("nimm den aktuellen Editor-Zustand als rückrufbaren Snapshot"), aber kein V1-Bedarf.
- **Kein "Letzten gespeicherten Stand wiederherstellen"** — kommt erst, wenn Snapshots existieren.
- **Kein Rückgängig-Stack über Sessions hinweg** — der Editor hat seinen eigenen Undo-Mechanismus, PROJ-9 erweitert ihn nicht.
- **Kein "Diesem Preset eine Locale zuweisen direkt aus dem Editor"** — die Locale-Verwaltung passiert in der Admin-Liste (PROJ-24, Inline-Locale-Edit-Popover). Aus dem Editor wird nicht querverwaltet.
- **Keine Migration des SaveButton/SaveAsPresetButton-Verhaltens** — die existieren weiter wie sie sind, PROJ-9 ergänzt nur weitere Werkzeuge.
- **Keine User-facing Reset-Funktion** — End-Kunden brauchen keinen Reset-Button. Wenn jemand neu starten will, kann er die Seite refreshen oder ein anderes Projekt anlegen.

## Open Questions
- **Visuelle Position in der Toolbar**: zwischen den Speicher-Buttons, oder am rechten Rand abgesetzt? → UX-Detail für `/frontend`.
- **Icon-Wahl**: `RotateCcw` (Rückwärts-Pfeil) signalisiert "wiederherstellen", `Trash2` ist destruktiver. → `/frontend`.

## Technical Requirements
- **Performance**: Reset + Reload sollten <1 s spürbar sein (Page-Reload + erste Map-Tiles).
- **Sicherheit**: Server-seitig keine Schutzlücke nötig — der Reset wirkt nur auf Client-State; keine Daten werden gelöscht/erstellt. Frontend-Sichtbarkeit reicht (`isAdmin`-Check).
- **Browser-Support**: alle aktuellen Browser (Chrome, Firefox, Safari, Edge), Mobile Safari + Android Chrome.
- **localStorage-Verhalten**: muss mit dem Zustand-Persist-Schlüsselformat (`editor-store`, ggf. `star-map-store`) konsistent leeren — nicht alle localStorage-Keys pauschal löschen (würde Cart, Cookie-Consent, Auth-Tokens betreffen).

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Gesamtablauf

PROJ-9 startet bewusst klein — V1 = ein einzelner "Editor zurücksetzen"-Button. Architektur ist als **Sammler-Pattern** angelegt: spätere Werkzeuge schlüpfen in dieselbe Toolbar-Position bzw. (sobald >2 Tools) in ein gemeinsames Aufklapp-Menü.

```
V1-Implementation (eine Phase):
   +-- Reset-Logik als wiederverwendbare Funktion in src/lib/admin/
   +-- ResetEditorButton.tsx (Admin-only) in der Editor-Top-Nav
   +-- Inline-AlertDialog für Bestätigung
   +-- Hook in /map und /star-map Layouts (oder direkt in der Top-Nav)
             |
             v
Sammler-Pattern für künftige Werkzeuge:
   +-- Solange ≤2 Tools: jedes als eigener Button in der Toolbar
   +-- Ab 3+ Tools: AdminToolsMenu (Wrench-Icon → Dropdown) als Container
```

### B) Komponenten-Struktur

```
poster-generator
│
├── src/lib/admin/
│   └── reset-editor.ts                   ← NEU: pure Reset-Logik
│       Aufgabe:
│        1. localStorage-Key 'poster-generator-draft' löschen
│           (von useProjectSync verwendet)
│        2. useEditorStore auf Initial-Werte zurücksetzen
│        3. useStarMapStore auf Initial-Werte zurücksetzen
│        4. window.location.reload() für sauberen
│           Map/WebGL-Zustand
│
├── src/components/editor/
│   └── ResetEditorButton.tsx             ← NEU: Admin-only Button + AlertDialog
│       Verhalten:
│        - useAuth().isAdmin === true → render, sonst null
│        - Klick öffnet shadcn AlertDialog
│        - Beschreibung passt sich an, ob editingPreset gesetzt ist
│        - Bestätigung ruft reset-editor.ts auf
│
└── Eingebunden in (V1):
    src/components/landing/LandingNav.tsx ← MODIFIZIERT
       (zwischen SaveAsPresetButton und LanguageSwitcher;
        sichtbar nur auf /map und /star-map via pathname-Check)
```

### C) Datenmodell

**Kein** neues Datenmodell — PROJ-9 V1 berührt nur Client-State und localStorage.

**Was geleert wird:**
| Quelle | Was | Methode |
|---|---|---|
| `useEditorStore` | Map-Position, styleId, paletteId, customPalette, maskKey, marker, secondMarker, secondMap, shapeConfig, textBlocks, photos, splitMode, splitPhoto, splitPhotoZone, layoutId, innerMarginMm, projectId, **editingPreset**, locationName, viewState | `useEditorStore.setState({ /* alle Initial-Werte */ })` — die Initial-Werte werden direkt aus dem Store-Modul exportiert, damit sie nicht doppelt gepflegt werden |
| `useStarMapStore` | posterBgColor, skyBgColor, starColor, showConstellations, showMilkyWay, showSun, showMoon, showPlanets, frameConfig | analog `useStarMapStore.setState(...)` |
| `localStorage['poster-generator-draft']` | Persistierter Editor-Snapshot von `useProjectSync` | `localStorage.removeItem(...)` |

**Was NICHT angefasst wird** (explizit):
| Was | Begründung |
|---|---|
| `useCartStore` (`localStorage['poster-cart']`) | User-Spec: Cart bleibt erhalten |
| Auth-Session (Supabase Cookies / IndexedDB) | Admin bleibt eingeloggt |
| `NEXT_LOCALE` Cookie | Sprache bleibt erhalten |
| Cookie-Consent | Bleibt gespeichert |
| Server-DB-Projekte | Reset ist client-only |

### D) Tech-Entscheidungen

| Entscheidung | Begründung |
|--------------|-----------|
| **Reset-Logik als pure Funktion** in `lib/admin/reset-editor.ts` (nicht in der Komponente inline) | Testbar (Vitest), wiederverwendbar von künftigen Admin-Tools, klare Trennung von UI und Logik |
| **Page-Reload via `window.location.reload()`** statt React-State-only-Reset | Spec-Entscheidung — robust gegen Edge-Cases (Map-Tile-Cache, WebGL-Context, Sanity-Query-Cache, useProjectSync-Effect-Schleifen). Geringer Performance-Hit (~1 s) ist akzeptabel für eine seltene Admin-Aktion |
| **Initial-Werte aus dem Store-Modul exportieren** statt im Reset-Helper duplizieren | DRY — wenn jemand später die Editor-Store-Defaults ändert, geht der Reset automatisch mit. Kleiner Refactor an `useEditorStore.ts`, aber sauber |
| **shadcn AlertDialog** für Bestätigung statt eigenem Modal | Existiert schon (z. B. in `AdminPresetsList`-Delete-Action), gleiche UX-Konsistenz, destructive-Style auf "Zurücksetzen"-Button |
| **Button-Position: zwischen SaveAsPresetButton und LanguageSwitcher** in `LandingNav` | Liegt logisch in der "Speichern + Tools"-Gruppe; visuell etwas abgesetzt vom Save-Button durch leichten Spacing |
| **Sichtbarkeit nur auf `/map` und `/star-map`** | Spec-Anforderung; einfacher `usePathname()`-Check, gleiche Stelle wie `SaveAsPresetButton` (der schon `pathname` liest) |
| **Disabled-State, wenn SaveAsPresetButton aktuell speichert** | Edge-Case aus Spec — verhindert, dass der Admin mitten im Save den Editor leert. Zugriff auf das `editingPreset`/`saving`-State über bestehende Editor-Store-Felder |
| **Nur ein Button in V1** statt direkt das Aufklapp-Menü zu bauen | YAGNI. Aufklapp-Menü erst wenn ≥3 Werkzeuge existieren. Refactor ist später trivial |
| **Icon: `RotateCcw`** (Rückwärts-Pfeil) statt `Trash2` | Visuell weniger destruktiv-aggressiv ("zurücksetzen", nicht "löschen"); der AlertDialog macht die Konsequenzen ohnehin klar |

### E) Stripped-down Datenfluss

```
[Admin klickt "Editor zurücksetzen" in der Top-Nav]
              |
              v
[shadcn AlertDialog öffnet]
   Inhalt:
    - Titel: "Editor zurücksetzen?"
    - Beschreibung statisch + dynamisch:
       Statisch: "Alle nicht gespeicherten Änderungen am
                  Editor-Zustand gehen verloren. Dein Warenkorb
                  und gespeicherte Projekte bleiben erhalten."
       Dynamisch (wenn editingPreset gesetzt):
                  "Du bearbeitest aktuell „X" — Änderungen
                   werden verworfen."
    - Buttons: "Abbrechen" + "Zurücksetzen" (destructive)
              |
              v
[Bestätigung: Klick auf "Zurücksetzen"]
              |
              v
[resetEditor() aus lib/admin/reset-editor.ts]
   1. localStorage.removeItem('poster-generator-draft')
   2. useEditorStore.setState(EDITOR_INITIAL_STATE)
   3. useStarMapStore.setState(STAR_MAP_INITIAL_STATE)
   4. window.location.reload()
              |
              v
[Page lädt frisch — Editor in Default-State, Cart bleibt]
```

### F) Abhängige Packages

**Keine neuen Dependencies.** Alles existiert:
- `zustand` — Editor-Stores
- `lucide-react` — `RotateCcw`-Icon
- `@/components/ui/alert-dialog` (shadcn) — Bestätigungs-Dialog
- `@/components/ui/button` (shadcn) — Trigger-Button
- `next-intl` — Lokalisierung der Dialog-Texte
- `next/navigation` — `usePathname` für Editor-Routen-Check

### G) Risiken / Offene Punkte

- **Race-Condition zwischen Reset und laufendem Auto-Save**: Wenn `useProjectSync` gerade einen DB-Save in Flight hat, wird die Page-Reload diesen abbrechen. Da der Save nur den Editor-State überträgt (der gleich gelöscht wird), ist das harmlos — der Save-Request läuft im Hintergrund weiter und schließt mit dem alten Stand ab. Beim nächsten Page-Reload sieht der Admin den frischen Default-State.
- **Mobile-Editor (PROJ-18)**: Sollte der Reset-Button auch in der Mobile-Top-Nav erscheinen? V1 — ja, gleiche Sichtbarkeitslogik (admin + auf /map oder /star-map), Position ggf. im Mobile-Sheet-Menü statt direkt in der Top-Nav, weil Mobile weniger horizontalen Platz hat. Klärung beim `/frontend`-Schritt.
- **Initial-State-Export aus Store**: Aktuell sind die Initial-Werte in `useEditorStore.ts` und `useStarMapStore.ts` als Inline-Default-Werte im `create()`-Aufruf definiert. Für DRY müssten sie als benannte Konstanten exportiert werden. Kleiner Refactor, sollte beim `/frontend`-Schritt mit gemacht werden.
- **i18n der Dialog-Texte**: PROJ-20 hat die Übersetzungs-Infrastruktur. Für PROJ-9 V1 reicht es, die deutschen Strings hardcoded zu setzen oder gleich einen neuen Translation-Namespace `editor.adminTools` aufzumachen. Klärung beim `/frontend`-Schritt.
- **Spätere Werkzeuge**: Wenn künftig 3+ Tools dazukommen, refaktorisieren wir auf ein Aufklapp-Menü (`AdminToolsMenu` mit Wrench-Icon). V1 ignoriert das bewusst, um nicht in Vorleistung zu gehen.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

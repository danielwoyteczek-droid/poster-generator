# PROJ-9: Admin-Editor-Werkzeuge

## Status: Planned
**Created:** 2026-04-19
**Last Updated:** 2026-04-25

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
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

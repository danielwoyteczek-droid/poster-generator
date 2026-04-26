# PROJ-27: Mobile-Editor für Stern-Karten (`/star-map`)

## Status: Approved
**Created:** 2026-04-26
**Last Updated:** 2026-04-26

## Dependencies
- Requires: PROJ-7 (Stern-Karten-Generator) — die Desktop-Inhalte werden gespiegelt
- Requires: PROJ-18 (Mobile-Editor Karten-Editor) — alle Patterns (`useIsMobileEditor`, `font-scale.ts`, Eye-Button, Touch-Isolation) sind etabliert

## Problem & Ziel
PROJ-18 hat den Mobile-Editor für `/map` gebaut, `/star-map` blieb explizit Desktop-only. Mobile-Nutzer:innen sehen aktuell auf `/star-map` weiterhin die schmale Desktop-Sidebar neben einer winzigen Canvas. Da die Patterns aus PROJ-18 etabliert sind (Layout-Switching via `useIsMobileEditor`, fixe Vorschau + Tab-Bar + Tool-Container, font-scale, Touch-Isolation, Eye-Button für Zimmeransicht), ist das hier ein **strukturelles Klonen** mit Star-Map-spezifischen Tab-Inhalten.

## Scope
- `StarMapEditorShell` parallel zu `EditorShell` — entscheidet Desktop vs. Mobile
- `MobileStarMapLayout` — Drei-Zonen-Layout (Vorschau / Tab-Bar / Tool-Container) wie `MobileEditorLayout`
- **4 Mobile-Tabs** (statt 6 für /map): `Stars` / `Himmel` / `Text` / `Export` — identisch zu den Desktop-Tabs
- Eye-Button auf Vorschau, öffnet Zimmeransicht via `useStarMapExport.renderPreview`
- Text-Tab erlaubt Drag-on-Canvas (analog PROJ-18-Update)
- Touch-Isolation: Textblock-Drag nur im Text-Tab; Stars/Himmel/Export sind preview-only
- `StarMapCanvas` bekommt eine optionale `padding`-Prop (analog `PosterCanvas`)

## Out of Scope
- Keine eigenen Star-Map-Mobile-Presets (wenn überhaupt, dann wie /map über das bestehende Preset-System)
- Keine zusätzlichen Mobile-only Features
- Kein neuer State, kein neues Datenmodell

## Acceptance Criteria
- [ ] Auf Viewports < 1024 px wird statt `StarMapLayout` ein `MobileStarMapLayout` gerendert (selber Breakpoint wie /map)
- [ ] 4 Tabs sichtbar: Stars / Himmel / Text / Export — alle tap-bar, aktiver Tab markiert
- [ ] Vorschau (StarMapCanvas) ist auf jedem Tab dauerhaft sichtbar
- [ ] Eye-Button oben links auf Vorschau, von jedem Tab erreichbar, öffnet Zimmeransicht
- [ ] Drag-on-Canvas für Textblöcke nur aktiv, wenn Text-Tab aktiv ist
- [ ] Auf Desktop (≥ 1024 px) bleibt das bestehende `StarMapLayout` unverändert
- [ ] Build grün, Playwright-Smoke-Tests laufen analog PROJ-18

## Implementation Notes
_Wird während der Implementation ausgefüllt._

## QA Test Results

**Date:** 2026-04-26
**Reviewer:** Claude (Code-Audit + Playwright-Smoke-Tests)

### Methodik & Beschränkungen
PROJ-27 ist ein **strukturelles Klonen** der PROJ-18-Patterns für `/star-map`. Die zugrundeliegenden Bausteine (`useIsMobileEditor`, `font-scale.ts`, `TextBlockOverlay` mit `interactive`-Prop, `PosterFrameModal`) wurden in PROJ-18 bereits real auf iPhone getestet und sind durch die Live-Iteration gehärtet. Diese QA-Runde bestätigt, dass das Klonen sauber durchgezogen wurde — sie ersetzt keine erneute Geräte-Test-Session.

### Acceptance Criteria Audit

| AC | Status | Anmerkung |
|---|---|---|
| Auf < 1024 px wird `MobileStarMapLayout` statt `StarMapLayout` gerendert | **PASS** | `StarMapEditorShell` nutzt `useIsMobileEditor`-Hook, identisch zu `EditorShell` für /map. Verifiziert in [tests/PROJ-27-mobile-star-map-editor.spec.ts](../tests/PROJ-27-mobile-star-map-editor.spec.ts) (Mobile-Tab-Bar mit 4 Tabs nur auf iPhone-13-Project sichtbar). |
| Vier Tabs sichtbar (Sterne/Himmel/Text/Export), tap-bar, aktiver Tab markiert | **PASS** | Playwright-Test "shows every labelled tab" + "Sterne tab selected by default" + "switches the selected tab when another tab is tapped". |
| Vorschau (StarMapCanvas) auf jedem Tab dauerhaft sichtbar | **PASS** | `h-[58vh] shrink-0` Container, Tool-Inhalte scrollen separat. Identisch zu PROJ-18-Pattern. |
| Eye-Button oben links, von jedem Tab erreichbar, öffnet Zimmeransicht | **PASS** | Playwright-Test "Eye button is visible from any tab" — verifiziert auf 3 Tabs (Default Sterne, Text, Export). Renderpfad nutzt `useStarMapExport.renderPreview`. |
| Drag-on-Canvas für Textblöcke nur im Text-Tab aktiv | **PASS** | `StarMapCanvas` propagiert `textInteractive={activeTab === 'text'}` an `TextBlockOverlay`. Mechanik bereits durch PROJ-18 abgedeckt + getestet. |
| Desktop (≥ 1024 px) unverändert | **PASS** | Playwright-Test "Desktop tab bar has four tabs" — bestätigt, dass Desktop weiter `StarMapLayout` mit Sidebar-Tabs zeigt, kein Eye-Button. Zusätzlich: PROJ-18-Regressionstests grün → keine Quereffekte. |
| Build grün, Tests laufen analog PROJ-18 | **PASS** | `npx tsc --noEmit` + `npx playwright test tests/PROJ-27-mobile-star-map-editor.spec.ts` → 7 passed, 7 cross-project-skipped, 0 failed. PROJ-18-Regression: 8 passed, 0 failed. |

### Code-Audit-Highlights

**Sauber implementiert:**
- `StarMapCanvas` bekommt jetzt `padding`-Prop (analog `PosterCanvas`) → Mobile übergibt 16, Desktop bleibt bei 64.
- `computeFontScale(posterSize.width)` wird auch in StarMapCanvas verdrahtet → Schrift-Konsistenz Mobile ↔ Desktop ↔ Druck nun auch für Star-Map.
- Vier Mobile-Tab-Wrapper (`MobileStarMapTab`, `MobileHimmelTab`, `MobileStarMapExportTab`) sind dünne Pass-throughs — nutzen Desktop-Tabs unverändert. Das ist genau das richtige Niveau, weil die Inhalte (Datepicker, Toggles, Color-Inputs) bereits formularbasiert und touch-tauglich sind.
- `MobileTextTab` aus PROJ-18 wird in /star-map **wiederverwendet** — keine Duplikation, weil `textBlocks` im selben `useEditorStore` liegen wie auf /map. Das ist der saubere DRY-Move.

**Bewusste Vereinfachungen:**
- Kein `activeMobileTool`-Enum auf StarMapCanvas (wie PosterCanvas hat) — auf Star-Map gibt's nur **eine** interaktive Overlay-Schicht (Textblöcke), also reicht ein einzelnes `textInteractive`-Boolean. Macht das Interface enger und richtiger.
- Spec hat bewusst keine eigenen Edge-Cases dokumentiert — sie erbt sie von PROJ-18. Das ist fair, weil das Klonen die Patterns 1:1 übernimmt.

### Bugs gefunden

**Keine.** Code-Audit + automatisierte Tests + Regressions-Run zeigen sauberes Zusammenspiel.

| Severity | Anzahl | Liste |
|---|---|---|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 0 | — |
| Low | 0 | — |

### Security Audit

PROJ-27 ist genau wie PROJ-18 ein **Frontend-only Feature** — keine neuen API-Endpoints, keine Datenbank-Änderungen, keine neuen Env-Variablen, keine neuen Auth-Pfade. Wiederverwendet ausschließlich die existierenden Hooks und Komponenten. **Kein neuer Angriffsoberfläche.**

### Manuelle Verifikation (durch dich auf realem Gerät — übertragen aus PROJ-18, identische Punkte)

- [ ] iPhone Safari: `/de/star-map` öffnen, alle 4 Tabs antippen, jeweils Vorschau sichtbar?
- [ ] Eye-Button auf jedem Tab tippen → Zimmeransicht zeigt Stern-Karten-Render?
- [ ] Text-Tab: Block hinzufügen, im Sheet bearbeiten, dann auf der Canvas verschieben? Andere Tabs: kein Drag möglich?
- [ ] Cross-Device-Round-trip: Stern-Karten-Projekt auf Desktop speichern → auf iPhone öffnen → identisch?
- [ ] Mobile PDF-Download für Sternen-Poster: Text-Größe + Position identisch zu Desktop-PDF?

### Production-Ready-Entscheidung

**APPROVED** — keine Critical/High Bugs, alle ACs erfüllt, automatisierte Tests grün, keine Regression auf PROJ-18.

## Deployment
_Nach /deploy zu ergänzen._

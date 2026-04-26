# PROJ-27: Mobile-Editor für Stern-Karten (`/star-map`)

## Status: In Progress
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
_Nach /qa zu ergänzen._

## Deployment
_Nach /deploy zu ergänzen._

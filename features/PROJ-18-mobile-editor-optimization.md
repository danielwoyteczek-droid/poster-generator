# PROJ-18: Mobile-Editor-Optimierung

## Status: Planned
**Created:** 2026-04-21
**Last Updated:** 2026-04-21

## Dependencies
- Requires: PROJ-1 (Karten-Editor Core) — baut auf bestehendem Editor auf
- Requires: PROJ-2 (Textblock-Editor) — Textplatzierung muss touch-tauglich werden
- Requires: PROJ-7 (Stern-Karten-Generator) — gleiche Mobile-Anforderungen

## Problem & Ziel
Der Editor ist aktuell für Desktop gebaut und auf dem Handy praktisch unbenutzbar: Touch-Events funktionieren nur teilweise, Panels nehmen den ganzen Bildschirm ein, der Pin lässt sich nicht präzise bewegen, Textblöcke sind zu klein zum Greifen. Ein signifikanter Anteil des organischen + Meta-/TikTok-Traffics wird mobile kommen — ohne funktionierende Mobile-Experience verlieren wir diese Conversions.

PROJ-18 macht den Editor **vollständig mobil bedienbar**, ohne die Desktop-Erfahrung zu verschlechtern.

## User Stories
- Als mobile Nutzer:in will ich auf dem Handy einen Ort suchen, ohne dass das Keyboard die halbe Karte verdeckt.
- Als mobile Nutzer:in will ich den Map-Pin mit dem Finger präzise verschieben, ohne dass ich versehentlich die Karte panne.
- Als mobile Nutzer:in will ich Textblöcke per Touch greifen, verschieben und skalieren.
- Als mobile Nutzer:in will ich Stil-, Maske- und Text-Einstellungen über ein Bottom-Sheet-Panel aufrufen, das ich auch wieder zuklappen kann.
- Als mobile Nutzer:in will ich das Poster in voller Breite sehen und nicht hinter UI-Elementen versteckt haben.
- Als mobile Nutzer:in will ich nicht in Endlosschleifen in Panels navigieren, sondern maximal 2–3 Tap-Ebenen bis zu meinem Ziel brauchen.

## Acceptance Criteria
- [ ] Der Editor funktioniert auf **Smartphone (375–430 px Breite)** und **Tablet (768–1024 px)** genauso zuverlässig wie auf Desktop.
- [ ] **Bottom-Sheet-Panel** statt Seitenleiste auf Mobile:
  - Hoch-/Runter-Swipe zum Öffnen/Schließen
  - 3 Snap-Positionen (collapsed, half, fullscreen)
  - Transition ist flüssig (< 150 ms)
- [ ] Touch-Events auf dem Poster sind sauber getrennt:
  - Ein-Finger-Drag auf **leerer Stelle** = Karte panning (MapTiler-Default)
  - Ein-Finger-Drag auf **Pin** = Pin verschieben
  - Ein-Finger-Drag auf **Textblock** = Textblock verschieben
  - Zwei-Finger-Pinch = Karten-Zoom
- [ ] Textblock-Interaktion auf Touch:
  - Tap = auswählen
  - Lang-Tap (300 ms) = in Edit-Modus
  - Drag = verschieben
  - Pinch auf selektiertem Block = skalieren (Ersatz für Resize-Griff, der auf Touch zu klein ist)
- [ ] Ort-Suche: Suchfeld rutscht **über** die Keyboard (nicht dahinter), Ergebnisliste ist scrollbar.
- [ ] Sprache-/Layout-/Text-Tab-Navigation innerhalb des Bottom-Sheets als horizontale Tab-Leiste oder Segmented Control.
- [ ] Alle Hit-Targets (Buttons, Tabs, Pins) mindestens **44×44 px** (Apple HIG) / **48×48 dp** (Material).
- [ ] Performance: kein merkbares Ruckeln bei Panning oder Pin-Drag auf einem **3 Jahre alten Mittelklasse-Gerät** (z. B. iPhone 11, Pixel 5).
- [ ] Der Export (PNG/PDF-Download) ist ebenfalls mobil bedienbar — Download landet regulär im iOS-/Android-Downloads-Ordner oder öffnet ein Share-Sheet.
- [ ] **Sternenposter-Editor** (PROJ-7) wird analog mobil umgebaut — beide Editoren nutzen dieselben Mobile-Primitives (Bottom-Sheet, Touch-Gesten).

## Edge Cases
- User dreht das Gerät im laufenden Editor (Portrait ↔ Landscape) → Layout passt sich an, Poster und Auswahl bleiben erhalten.
- iOS Safari address bar schiebt sich rein/raus → Layout-Shift darf den Editor nicht "springen" lassen.
- Kleines iPhone (SE, 375×667) → alles muss auch hier passen, notfalls mit vertikalem Scrolling im Bottom-Sheet.
- User hat zweite Hand nicht frei (nur ein Daumen) → alle wichtigen Aktionen (Pin setzen, Textblock platzieren, Export) mit einem Daumen erreichbar.

## Non-Goals
- Keine native iOS-/Android-App — wir bleiben Progressive Web App.
- Kein separater "Mobile-Builder" mit reduzierten Features — **Feature-Parität** zum Desktop ist Ziel.
- Kein Offline-Modus (kommt ggf. als eigenes Spec später).

## Technische Anforderungen
- Neue Library für Bottom-Sheet, z. B. `vaul` (Drei, Hendrik Wester) oder Eigenbau auf Radix-Primitives
- Touch-Event-Refactoring in DraggablePin + TextBlockOverlay (Pointer-Events sauber diskriminieren)
- Viewport-Meta-Tag prüfen (`viewport-fit=cover` für iPhone-Notch)
- Performance-Budget: Lighthouse Mobile Performance Score ≥ 85
- Test-Matrix: iPhone (Safari), Android (Chrome), iPad (Safari), Mid-range Android (Chrome)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

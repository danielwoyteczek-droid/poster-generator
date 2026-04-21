# PROJ-15: Dynamische Map-Farbschemen

## Status: Planned
**Created:** 2026-04-21
**Last Updated:** 2026-04-21

## Dependencies
- Requires: PROJ-1 (Karten-Editor Core) — nutzt den bestehenden MapTiler-SDK-Renderer

## Problem & Ziel
Aktuell muss der Betreiber für jede Farbvariante einer Karte in MapTiler Studio einen kompletten neuen Style entwerfen und als Datei hinterlegen. Das skaliert nicht: jede zusätzliche Farbkombination (Mint, Sand, Navy, …) bedeutet manuelle Arbeit, Versionierung, Upload.

PROJ-15 entkoppelt **Layout** (was wird dargestellt: Straßen, Wasser, Labels, Liniendicken) von **Farbgebung** (welche Farbe hat Land, Wasser, Straße, Label). Das Layout bleibt in wenigen Basis-Styles definiert. Farben werden zur Laufzeit angewendet, entweder über voreingestellte Paletten oder freie Farbwahl.

## User Stories
- Als Betreiber will ich ein Basis-Layout einmal in MapTiler Studio designen und im Editor beliebig viele Farbvarianten freischalten, ohne einen neuen Style zu erstellen.
- Als Betreiber will ich eine Galerie von vordefinierten Farbpaletten (z. B. "Mint", "Sand", "Navy", "Terracotta") anbieten, aus der Nutzer wählen können.
- Als End-Nutzer will ich neben dem Basis-Style eine Farbe wählen und sofort sehen, wie Land, Wasser, Straßen und Labels in dieser Farbe aussehen.
- Als End-Nutzer will ich optional eine freie Farbe (Farbwähler) wählen, wenn die Paletten nicht reichen.
- Als End-Nutzer will ich Straßennamen ein- oder ausblenden können, damit ich je nach Poster-Stimmung mehr oder weniger Detail auf der Karte habe.
- Als Betreiber will ich neue Paletten ergänzen können, ohne das MapTiler-Backend anzufassen — idealerweise nur via Code oder später Admin-UI.

## Acceptance Criteria
- [ ] Mindestens zwei Basis-Layouts (z. B. *Minimal*, *Detailliert*) liegen als MapTiler-Style-JSONs im Repo und bleiben rein auf Layout/Typografie fokussiert — keine bindenden Farben für Land/Wasser/Straßen/Labels.
- [ ] Ein Transformer-Modul akzeptiert: Basis-Style + Farbpalette → liefert fertigen Style-JSON, bei dem die Land-, Wasser-, Straßen- und Label-Layer die gewählten Farben haben.
- [ ] Der Editor zeigt zwei Auswahlreihen: zuerst **Layout**, dann **Farbpalette** (oder freie Farbwahl).
- [ ] Mindestens **6 vordefinierte Paletten** stehen zur Auswahl, passend zur Marke petite-moment.
- [ ] Der Editor zeigt eine kleine Farbvorschau pro Palette (z. B. 4 Farbkreise für Land/Wasser/Straße/Label).
- [ ] Die Farbwahl überlebt Reload und wird im `projectId`-Snapshot mitgespeichert, damit Projekte später identisch wiederhergestellt werden können.
- [ ] Die Farbwahl fließt in den Export (PNG/PDF) unverändert mit ein.
- [ ] Ein freier Farbwähler (Hex) ist unter einer Accordion-Zeile "Eigene Farbe" verfügbar — Änderung dort setzt eine neue „custom"-Palette basierend auf einer Heuristik (z. B. Grundton wählt sofort Land + passende Wasser-/Straßen-Töne).
- [ ] Ein Toggle **"Straßennamen anzeigen"** im Editor blendet alle textbasierten Straßenlabels der Karte ein/aus. Standard: aus (klareres Posterbild), der Nutzer kann explizit einschalten. Einstellung wird im Projekt-Snapshot mitgespeichert und fließt in den Export ein.

## Edge Cases
- Farbpalette passt nicht zum Basis-Layout (z. B. Schwarz auf Dunkelblau → Labels unlesbar) → Heuristik stellt sicher, dass Labels immer ausreichend Kontrast zum Land haben; zur Not wird Label-Farbe auf Weiß/Schwarz gesetzt.
- Transformer wird mit ungültigem Hex-Wert aufgerufen → Fallback auf neutrale Default-Palette, keine Exception an den User.
- User speichert ein Projekt mit einer Palette, die später aus dem Code entfernt wird → Projekt behält die alten RGB-Werte (werden mitgespeichert, nicht nur die Palette-ID).
- MapTiler-SDK erhält einen sehr großen Style-JSON → Transformer soll idempotent sein und bei erneuter Anwendung nichts doppelt färben.

## Non-Goals
- Kein vollständiger Style-Editor für End-User (keine Liniendicken, keine Font-Wahl, kein Layer-Toggle außer Straßennamen).
- Kein Upload eigener MapTiler-Styles via Admin-UI in V1 — das wäre PROJ-16+.
- Keine automatische Farbextraktion aus einem Bild ("Lade Foto hoch, wir generieren Palette") — kann später als V2 dazukommen.

## Open Questions
- Soll der freie Farbwähler nur den Grundton erfassen (Land), oder mehrere Farben einzeln? Entscheidung beim Architecture-Schritt.
- Welche Layer im Style-JSON werden konkret transformiert? Abhängig von den Basis-Layouts, die der Betreiber designt — muss im Architecture-Schritt zusammen mit einem konkreten Beispiel-Style geklärt werden.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

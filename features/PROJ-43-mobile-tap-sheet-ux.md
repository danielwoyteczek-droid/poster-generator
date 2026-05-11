# PROJ-43: Mobile Editor Tap-Sheet UX

## Status: Planned
**Created:** 2026-05-11
**Last Updated:** 2026-05-11

## Context & Motivation

Mobile-Conversion stagniert. Aktuell muss der Customer das Editor-Bottom-Sheet (Tabs: Karte / Text / Design / Export) mit dem Finger hoch- und runter-sliden, um Editor-Funktionen zu erreichen. User-Tests zeigen: das Pattern ist nicht entdeckbar, fühlt sich "klemmig" an, und Customer brechen ab bevor sie auch nur eine Editor-Aktion ausgeführt haben. Ziel dieses Features ist ein klares, Apple-Maps-artiges Tap-Pattern, das eine bekannte UX-Konvention nutzt und keine versteckten Gesten verlangt.

## Dependencies

- **Modifiziert:** PROJ-18 (Mobile-Editor Map) — ersetzt den aktuellen Drag-Handle-/Swipe-Pattern.
- **Modifiziert:** PROJ-27 (Mobile Star-Map Editor) — gleiches Pattern für Konsistenz.
- **Modifiziert:** PROJ-32 (Foto-Poster-Editor, In Progress) — wird direkt mit dem neuen Pattern gebaut, kein zweistufiger Umbau.
- **Verwandt (nicht blockierend):** PROJ-25 (Editor UX Consistency Pass) — kann nach diesem Feature die Sidebar-Inhalte vereinheitlichen.

## User Stories

- **Als Mobile-Customer** möchte ich die Editor-Funktionen mit einem klaren Tap erreichen, **damit** ich nicht erst eine Geste lernen muss bevor ich mein Poster anpassen kann.
- **Als Mobile-Customer** möchte ich das Canvas weiterhin sehen während ich edititere, **damit** ich sofortiges visuelles Feedback bekomme.
- **Als Mobile-Customer** möchte ich mit einem Tap auf den Canvas zurück zum vollen Vorschau-Modus, **damit** ich mein Zwischenergebnis bewundern und Screenshots machen kann.
- **Als Mobile-Customer** möchte ich zwischen Tabs direkt wechseln (z. B. Text → Design), **damit** ich nicht jedes Mal über einen Zwischen-Collapse muss.
- **Als Mobile-Customer** im Text-Tab möchte ich beim Tippen mein Eingabefeld sehen, **damit** ich nicht blind tippen muss wenn die iOS-Tastatur aufploppt.

## Acceptance Criteria

### Initial State

- [ ] AC1: Beim Öffnen des Editors auf mobilen Viewports (< 1024 px) ist das Bottom-Sheet **geschlossen** und der Canvas (Map-Vorschau / Star-Map / Foto) füllt die volle Höhe abzüglich der Tab-Leiste.
- [ ] AC2: Die Tab-Leiste (Karte / Text / Design / Export bzw. die jeweiligen Editor-spezifischen Tabs) ist **immer am unteren Bildschirmrand sichtbar**, auch wenn das Sheet geschlossen ist.
- [ ] AC3: Auf Desktop-Viewports (≥ 1024 px) bleibt das bestehende Sidebar-Pattern aktiv — das neue Tap-Sheet greift nur unterhalb 1024 px (Breakpoint identisch zu `useIsMobileEditor`).

### Tab-Tap → Sheet öffnen

- [ ] AC4: Ein Tap auf einen Tab in der Tab-Leiste öffnet das Bottom-Sheet auf **fix 50% der Viewport-Höhe** mit dem Inhalt des angetappten Tabs.
- [ ] AC5: Der Canvas bleibt in den oberen 50% des Viewports sichtbar und interaktiv (Pan, Pinch-Zoom, Marker-Drag funktionieren wie gewohnt).
- [ ] AC6: Das Öffnen-Animation läuft sanft (≤ 250 ms, ease-out); kein "Snap" oder visueller Sprung.
- [ ] AC7: Der aktive Tab in der Tab-Leiste ist visuell hervorgehoben (highlight / fill-Variante) sobald das Sheet offen ist.

### Tab-Wechsel bei offenem Sheet

- [ ] AC8: Tap auf einen anderen Tab in der Tab-Leiste während das Sheet offen ist, **swappt den Sheet-Inhalt direkt** in place — kein Zwischen-Collapse, keine erneute Slide-Animation.
- [ ] AC9: Der Tab-Highlight wandert beim Wechsel ohne Verzögerung mit.

### Canvas-Tap → Sheet schließen

- [ ] AC10: Ein **kurzer Tap** (< 300 ms Dauer UND ≤ 10 px Bewegung vom Touch-Start) auf den sichtbaren Canvas-Bereich schließt das Sheet (Slide-Down-Animation ≤ 250 ms).
- [ ] AC11: Pan-Gesten (Bewegung > 10 px) und Long-Press werden an MapLibre / Canvas durchgereicht und schließen das Sheet **nicht**.
- [ ] AC12: Pinch-Zoom-Gesten schließen das Sheet **nicht**.
- [ ] AC13: Ein Tap direkt auf einen Marker oder Text-Block (interaktives Canvas-Element) schließt das Sheet **nicht** — die Aktion gehört dem Element.

### iOS-Keyboard im Text-Tab

- [ ] AC14: Sobald ein Textfeld im Sheet den Fokus bekommt und die iOS-Tastatur erscheint, **wächst das Sheet auf ~90% Viewport-Höhe** (bzw. so weit, dass das fokussierte Feld klar über der Tastatur sichtbar ist).
- [ ] AC15: Wenn das Textfeld den Fokus verliert und die Tastatur verschwindet, **kehrt das Sheet auf 50% zurück**.
- [ ] AC16: Der Customer kann das vergrößerte Sheet weiterhin durch Canvas-Tap (auf den sichtbaren Canvas-Streifen oben, ~10% Höhe) schließen — der Tap dismissed gleichzeitig auch die Tastatur.

### Removal des alten Patterns

- [ ] AC17: Der aktuelle Drag-Handle (kleine Linie am oberen Sheet-Rand) ist **entfernt**.
- [ ] AC18: Vertikale Swipe-Gesten auf dem Sheet-Header öffnen / schließen das Sheet **nicht** mehr (nur Tap auf Tabs / Canvas).
- [ ] AC19: Das alte `snap-zu-25-50-90%`-Verhalten (falls implementiert) ist entfernt; einziger Open-State ist 50% (bzw. ~90% bei aktiver Tastatur).

### Editor-Parität

- [ ] AC20: Das Pattern verhält sich identisch im **Map-Editor** (`/[locale]/map`).
- [ ] AC21: Das Pattern verhält sich identisch im **Star-Map-Editor** (`/[locale]/star-map`).
- [ ] AC22: Das Pattern verhält sich identisch im **Foto-Editor** (`/[locale]/photo`).

## Edge Cases

- **Sheet-Content überläuft 50%:** Inhalt scrollt vertikal **innerhalb des Sheets**; die 50%-Sheet-Höhe selbst ändert sich nicht (außer durch das Keyboard-Verhalten, AC14).
- **Tap-Cluster im interaktiven Canvas-Bereich:** Wenn ein Customer mehrere kurze Taps auf Marker/Text-Blocks ausführt (z. B. einen Block auswählt und dann verschiebt), darf keine versehentliche Sheet-Schließung passieren — die Tap-Heuristik (10 px / 300 ms) zählt nur auf nicht-interaktivem Canvas.
- **Pull-to-Refresh des Browsers:** Eine vertikale Swipe-down-Geste am oberen Canvas-Rand darf den Browser-Reload nicht triggern (CSS `overscroll-behavior: contain` o. ä.). Sheet-Schließen passiert nur per Tap.
- **Schnelles Wechseln zwischen Tabs während Animation läuft:** Wenn Tap-A → Tap-B in <100 ms passiert, soll Tab-B den Vorrang haben (kein Animations-Stau).
- **Modal-Overlays (z. B. Color-Picker, Confirm-Dialoge, Image-Upload-Picker):** Bleiben unverändert — sie liegen über dem Sheet. Tap auf das Modal schließt das Sheet **nicht**.
- **Nativer Foto-Picker (iOS):** Beim Foto-Editor öffnet ein Tap auf "Bild hochladen" den nativen iOS-Picker. Nach Picker-Dismiss bleibt das Sheet im selben State (50% offen, gleicher Tab).
- **Orientierungswechsel (Portrait ↔ Landscape):** Bei Landscape-Mode unterhalb 1024 px Breite: Pattern bleibt aktiv, Sheet weiterhin 50% der Höhe (kurzer Sheet bei kleinem Landscape-Viewport ist akzeptiert; alternative: oberhalb 600 px Breite das Pattern abschalten — wird in /architecture entschieden).
- **Vorhandene Customer mit gelerntem Drag-Pattern:** Erste Session nach Deploy zeigt keinen Onboarding-Hinweis (das neue Pattern soll selbsterklärend sein; falls in QA hier Drop-off auffällt, wird in einem Follow-up ein einmaliger Coach-Mark-Tooltip nachgezogen).
- **Sheet öffnen während Map noch lädt:** MapLibre kann beim ersten Frame langsam sein. Tab-Tap muss trotzdem sofort reagieren; der Sheet-Inhalt rendert auch wenn der Canvas noch lädt.

## Non-Goals

- **Kein Drag-Handle-Fallback** — das alte Manuell-Swipe-Pattern wird vollständig entfernt, nicht parallel beibehalten.
- **Keine Custom-Snap-Heights** — die Höhe ist 50% (bzw. ~90% mit Tastatur). Kein Tab-spezifisches "Export-Tab nur 40%".
- **Keine horizontale Tab-Wisch-Geste** — Tab-Wechsel nur per Tap auf den Tab-Label.
- **Kein neues Onboarding / Coach-Mark in der ersten Iteration** — das Pattern muss ohne Anleitung funktionieren.
- **Keine Änderung am Desktop-Sidebar-Layout** — nur Viewports < 1024 px sind betroffen.

## Technical Requirements

- **Performance:** Sheet-Open-Animation ≤ 250 ms (ease-out); kein Frame-Drop bei 60 fps.
- **Touch-Latenz:** Tap → Sheet-Open ≤ 100 ms vom touchend bis Animations-Start (sonst wirkt der Editor träge).
- **Breakpoint:** `useIsMobileEditor` (< 1024 px) — gleicher Breakpoint wie bestehende PROJ-18-Logik.
- **Browser-Support:** iOS Safari (16+), Chrome Mobile (letzte 2 Major), Samsung Internet (letzte 2 Major), Firefox Mobile.
- **Accessibility:** Tab-Buttons haben `aria-expanded` (true wenn Sheet offen) und `aria-controls` auf das Sheet-Panel. Tastatur-Navigation auf Mobile out-of-scope (kein physisches Keyboard zu erwarten).
- **Animations-Respekt:** `prefers-reduced-motion: reduce` → Sheet-Open ohne Animation (sofortiger Sprung).

## Success Metrics (Conversion-Hypothese)

- **Editor-First-Action-Rate:** Anteil der Mobile-Customer, die innerhalb der ersten Session **mindestens eine Editor-Aktion** ausführen (Suchfeld-Eingabe, Style-Wechsel, Text-Edit, Format-Wechsel). Baseline aus Sentry / Analytics vor Deploy festhalten; Ziel: **+15 % relativ** nach 2 Wochen.
- **Mobile-Editor-Bounce-Rate:** Anteil Customer, die den Editor binnen < 30 s wieder verlassen. Ziel: **−10 % relativ** nach 2 Wochen.
- **Mobile-Conversion-zur-Bestellung:** wenn die Sample-Größe es zulässt, klares Ziel; sonst Beobachtungs-Metrik.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

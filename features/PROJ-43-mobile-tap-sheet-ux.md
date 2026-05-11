# PROJ-43: Mobile Editor Tap-Sheet UX

## Status: In Progress
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

### A) Was wird gebaut — Bildaufbau

```
Mobile Editor (alle drei Editoren — Map / Star-Map / Foto)
│
├── Canvas-Bereich       ◄── nimmt fast den ganzen Bildschirm ein
│   │                        wenn das Sheet geschlossen ist
│   ├── PosterCanvas / Star-Map / Foto-Vorschau
│   └── (Marker, Text-Blöcke, interaktive Layer wie heute)
│       ▼ Tap auf leeren Canvas (kurz + still) → Sheet schließt
│       ▼ Marker-Drag / Pan / Pinch → Sheet bleibt offen
│
├── Tab-Leiste           ◄── IMMER sichtbar am unteren Rand,
│   ├── Karte                 auch wenn Sheet geschlossen ist
│   ├── Text
│   ├── Design / Layout
│   ├── (editor-spezifisch …)
│   └── Export
│       ▼ Tap → Sheet öffnet sich auf 50% mit Inhalt dieses Tabs
│       ▼ Tap auf anderen Tab bei offenem Sheet → Inhalt swappt direkt
│
└── Bottom-Sheet         ◄── liegt visuell über dem Canvas;
    │                        translate-Y-Animation 250 ms
    └── Aktiver Tab-Inhalt
        ├── Geschlossen → komplett unterhalb des Bildschirms (off-screen)
        ├── Offen        → 50% der Höhe (Standard)
        └── Tastatur an  → wächst auf ~90% (damit Eingabefeld sichtbar)
```

**Was sich ändert gegenüber heute:**

- Der **Drag-Handle** zwischen Canvas und Tab-Leiste wird **entfernt**. Es gibt keine manuelle Höhen-Anpassung mehr.
- Die **drei Snap-Höhen** (12/30/58 vh) sind weg. Es gibt nur zwei Zustände: geschlossen (Canvas voll) und offen (50%, mit Sonderfall 90% bei Tastatur).
- Das **separate "Anpassen"-Sheet** (PROJ-36) und der **"Anpassen"-Footer-Button** werden im Mobile-Layout **entfernt**. Sämtliche Settings — auch die früher als "Profi" klassifizierten — sind jetzt im normalen 50%-Sheet sichtbar und scrollen bei Bedarf. Auf Desktop bleibt PROJ-36 unverändert; nur Mobile wird vereinfacht.

### B) Datenmodell

Es gibt **keine Datenbank-Änderungen** und keine neuen Tabellen. Das Feature ist rein visuell/interaktiv. Alle bestehenden Editor-States (aktives Tool, ausgewähltes Preset, Marker, Text usw.) bleiben unverändert.

**Neuer kurzlebiger State (nur im Browser, geht beim Reload verloren):**

- "Ist das Sheet aktuell offen?" — ja/nein.
- "Welcher Tab ist aktuell aktiv?" — der bestehende `activeTab`-State der drei Layout-Komponenten wird wiederverwendet, nur die Bedeutung erweitert ("aktiv" heißt jetzt auch "wird im offenen Sheet angezeigt").
- "Ist die iOS-Tastatur sichtbar?" — abgeleitet aus dem Browser-API `visualViewport` (Stand bei jeder Sheet-Render-Phase neu gemessen). Dieser Zustand entscheidet ob das Sheet 50% oder 90% hoch ist.

### C) Tech-Entscheidungen — was und warum

**1. Eigenes Lightweight-Bottom-Sheet statt shadcn-Sheet oder Vaul.**

Begründung: Das shadcn-Sheet (das wir für `EditorAnpassenSheet` schon nutzen) ist für Modal-Dialoge gebaut — es bringt einen abdunkelnden Backdrop mit, hat eingebaute Close-Buttons und eine feste Höhe. Wir brauchen aber: keinen Backdrop (Canvas muss sichtbar bleiben), kein Close-Button (Tap auf Canvas schließt), und zwei Höhen (50% / 90%) mit Tastatur-Reaktion. Eine externe Library (Vaul) würde diese Verhalten mitbringen, aber für drei Zustände und eine Slide-Animation lohnt sich die zusätzliche Dependency nicht. Wir bauen das Sheet als kleine, dedizierte Komponente — komplette Kontrolle, weniger Wartungsoberfläche, kein neuer Abhängigkeits-Pfeil im Projekt.

**2. Tap-vs-Drag-Erkennung am Canvas mit einem zentralen Hook.**

Der Canvas erkennt selbst, ob eine Berührung ein kurzer Tap (Sheet schließen) oder eine Pan/Pinch-Geste (durchreichen an MapLibre / Drag-Handler der Marker) ist. Schwellwerte gemäß Spec: ≤ 10 px Bewegung UND < 300 ms Dauer = Tap. Alles andere = nicht-Tap und wird ignoriert. Diese Logik lebt zentral in einem Hook, der von allen drei Editor-Layouts genutzt wird — keine Duplikation.

Wichtig für die Verlässlichkeit: Wenn der Finger auf einem **interaktiven Canvas-Element** landet (Marker, Text-Block, Custom-Mask-Decoration), zählt das **nicht** als Canvas-Tap. Das wird über die `target`-Information des Touch-Events gelöst: die interaktiven Elemente werden anhand eines CSS-Marker-Klassen-Tags erkannt.

**3. Tastatur-Erkennung über das `visualViewport`-Browser-API.**

iOS Safari blendet die Tastatur ein und reduziert dadurch die sichtbare Viewport-Höhe. Statt diese Höhe selbst zu raten oder einen Focus-Listener pro Eingabefeld zu setzen, hört das Sheet zentral auf das `visualViewport.resize`-Event. Wenn die Höhe unter einen Schwellwert fällt, expandiert das Sheet auf 90%. Wenn die Höhe wieder normal wird, fährt es auf 50% zurück. Dieser Ansatz funktioniert unabhängig davon, welches Eingabefeld im Sheet fokussiert ist — wir müssen keine `focus`/`blur`-Listener verteilen.

**4. Sheet als Overlay über dem Canvas, nicht als Flex-Slot daneben.**

Heute teilt sich der Bildschirm vertikal in Canvas + Drag-Handle + Tab-Inhalt (Flex-Layout). Das Canvas-Größe ändert sich beim Sliden, MapLibre muss `triggerRepaint()` aufrufen. Im neuen Pattern bleibt der Canvas **immer gleich groß** (volle Höhe minus Tab-Leiste); das Sheet liegt visuell **über** dem unteren Canvas-Drittel. Das hat zwei Vorteile: (a) keine MapLibre-Repaints mehr nötig wenn Sheet auf-/zugeht; (b) der Customer sieht **immer** den voll-fokussierten Canvas und nur eine kleine "Klappe" die hoch- oder runterfährt — visuell ruhiger.

**5. Tab-Leiste bleibt strukturell wo sie ist — bekommt nur neuen Z-Index und aria-Annotation.**

Sie liegt nicht "in" dem Sheet sondern oberhalb (oder, technisch: mit höherem Z-Index). So bleibt sie auch bei offenem Sheet anklickbar und der Tab-Wechsel ist einfach ein State-Change ohne Animation. `aria-expanded` zeigt Screenreadern an, ob das Sheet offen ist; `aria-controls` verlinkt auf das Sheet-Panel.

**6. `prefers-reduced-motion`-Respekt.**

Customer mit aktivierter Bewegungs-Reduktion bekommen das Sheet ohne Slide-Animation (es springt sofort in den neuen Zustand). Standard-Webaccessibility-Pflicht, keine zusätzliche Arbeit — nur eine CSS-Media-Query.

**7. iOS-Address-Bar-Quirk: 100dvh statt 100vh.**

Mobile Safari zeigt die Adressleiste ein und aus, das ändert `100vh`. Wir nutzen `100dvh` (dynamic viewport height) für Sheet-Höhe und Canvas-Höhe — die App fühlt sich konsistent an, egal ob die Adressleiste gerade sichtbar ist oder nicht.

**8. Komponenten-Wiederverwendung.**

Die existierenden Mobile-Tab-Komponenten (`MobileMapTab`, `MobileTextTab`, `MobileLayoutTab`, `MobileMarkerTab`, `MobilePhotoTab`, `MobileExportTab` — und ihre Pendants in Star-Map / Foto) werden **unverändert wiederverwendet**. Sie rendern jetzt einfach innerhalb des neuen Sheets statt innerhalb eines flex-Slots. Das macht den Umbau lokal und risikoarm: kein Tab-Inhalt muss neu geschrieben werden. Wir tauschen nur die "Hülle" (Layout + Drag-Handle) gegen die neue "Hülle" (Sheet + Tap-Logik) aus.

### D) Was wird gelöscht

Das Pattern ist eine echte Ersetzung, kein Parallel-Mode. Folgende Bausteine verschwinden im Mobile-Kontext:

- Der `useCanvasResize`-Hook (war für die 12/30/58-vh-Snap-Logik zuständig).
- Die `CanvasResizeHandle`-Komponente (visueller Drag-Handle).
- Der `EditorAnpassenFooter`-Button im Mobile-Layout (auf Desktop bleibt er, falls dort genutzt).
- Die Mobile-Variante des `EditorAnpassenSheet`-Aufrufs (auf Desktop bleibt das Sheet erhalten).

Das vereinfacht den Mobile-Code spürbar — drei Komponenten weniger plus eine Hook-Datei weniger.

### E) Dependencies

**Keine neuen Pakete nötig.** Alles wird mit den vorhandenen Bausteinen gebaut: React + Tailwind + Browser-APIs (`visualViewport`, Pointer-Events). Keine Bottom-Sheet-Library, keine Animations-Library — eine CSS-Transition auf `transform: translateY(...)` reicht.

### F) Risiken & offene Punkte für die Implementierung

- **MapLibre / Star-Map-Renderer:** Da der Canvas seine Größe nicht mehr ändert, entfällt die bisherige `triggerRepaint`-Sorge. Aber: das Sheet überlagert den unteren Canvas-Bereich; wenn ein Marker dort liegt, ist er zwar gerendert aber für den Customer nicht sichtbar. Frontend-Implementierung muss prüfen, ob der Customer "Pan-to-Marker"-Logik nutzt um wichtige Inhalte aus dem unteren Bereich nach oben zu schieben, oder ob das im normalen Editor-Flow nicht relevant ist (vermutlich nicht — Customer kann die Karte selbst panen, oder das Sheet kurz schließen).
- **Foto-Editor mit nativem iOS-Picker:** Wenn der Customer "Bild hochladen" tappt, öffnet der native Picker. Beim Schließen sollte das Sheet im gleichen Zustand bleiben — das fällt aus dem React-State raus, sollte aber out-of-the-box korrekt sein. /qa muss das prüfen.
- **Landscape unterhalb 1024 px:** Ein iPhone-Landscape (375×812 → 812×375) hat ~187 px Sheet-Höhe — mehrere Tabs werden eng. Frontend kann optional einen Breakpoint bei ~600 px Breite einbauen, wo das Pattern auf "Sheet 70% statt 50%" wechselt. Ist ein Implementierungs-Detail, kein Spec-Block.
- **Customer mit gelerntem alten Pattern:** Spec hat das bewusst nicht als Onboarding aufgenommen. Nach Deploy beobachten wir die Editor-First-Action-Rate; wenn ein Coach-Mark nötig wird, ist das ein eigenes Folgefeature.

## Implementation Notes (Frontend)

**New files:**

- `src/hooks/useMobileSheet.ts` — central state machine. Returns `isOpen`, `sheetState` (`closed` / `open` / `open-keyboard`), `activeTab`, `openTab(tab)`, `close()`, and `canvasTapHandlers` (Pointer-Event handlers to spread on the canvas wrapper). Tap detector uses 10 px movement + 300 ms duration thresholds and bails on targets matching `[data-canvas-interactive]`. Keyboard branch listens to `visualViewport.resize` and flips to `open-keyboard` when the visible viewport shrinks by > 150 px (proxy for soft-keyboard appearing).
- `src/components/editor/mobile/MobileBottomSheet.tsx` — lightweight presentational sheet. Absolutely positioned with `bottom-14` (above the 56 px tab bar), height `50%` or `90%` of the editor area depending on state. `translate-y-full` when closed; CSS transition 250 ms ease-out; `motion-reduce:transition-none` for accessibility. No backdrop, no drag-handle, no header — just content with `overflow-y-auto overscroll-contain`.

**Refactored layouts:**

- `src/components/editor/mobile/MobileEditorLayout.tsx` (Map editor) — flex column collapsed to two slots: `flex-1` canvas wrapper (with `canvasTapHandlers`) and `h-14` tab bar (`z-40` so it stays above the sheet). All six tabs (`map`, `layout`, `text`, `marker`, `photo`, `export`) render their existing `Mobile*Tab` components inside the new sheet. `EditorAnpassenFooter` + `EditorAnpassenSheet` removed per the doctrine flip (all settings now visible directly in the 50% sheet on mobile).
- `src/components/star-map/mobile/MobileStarMapLayout.tsx` — same pattern with 4 tabs (`stars` / `sky` / `text` / `export`). Eye-Button for the Zimmer-Ansicht gets `data-canvas-interactive` so the canvas-tap detector doesn't close the sheet when the customer taps it.
- `src/components/photo-editor/mobile/MobilePhotoEditorLayout.tsx` — same pattern with 3-or-4 tabs (`word` shown only in letter-mask mode). Touch-tool routing (`TAB_TO_TOOL`) preserved as-is.

**Deleted:**

- `src/hooks/useCanvasResize.ts` (the 12 / 30 / 58 vh snap-resize hook).
- `src/components/editor/mobile/CanvasResizeHandle.tsx` (the visual drag-handle).
- Mobile-side usage of `EditorAnpassenFooter` + `EditorAnpassenSheet` (Desktop usage stays untouched in `EditorLayout.tsx`).

**Smoke-tested via Playwright** (`tests/PROJ-43-mobile-tap-sheet.spec.ts`): all three editor URLs load with the sheet closed, drag-handle gone, tab bar visible. Map editor opens on tab-tap, swaps content on second tab-tap (aria-expanded follows correctly), and closes when the visible canvas area is tapped.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

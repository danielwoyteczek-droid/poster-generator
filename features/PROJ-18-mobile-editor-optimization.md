# PROJ-18: Mobile-Schnellbestellung via Presets

## Status: Planned
**Created:** 2026-04-21
**Last Updated:** 2026-04-21

## Dependencies
- Requires: PROJ-1 (Karten-Editor Core) — bestehender Editor bleibt für Desktop
- Requires: PROJ-7 (Stern-Karten-Generator) — gleiche Mobile-Strategie
- Requires: PROJ-8 (Design-Presets) — Presets sind das Rückgrat der Mobile-UX
- Requires: PROJ-15 (Dynamische Farbschemen) — vereinfacht Farbwahl auf Mobile

## Problem & Ziel
Mobile Nutzer:innen wollen nicht 20 Minuten Textblöcke verschieben. Sie wollen in 2–3 Minuten ein Geschenk bestellen — unterwegs, im Bus, im Wartezimmer. Aktuell hat der Editor auf dem Handy **zu viele Freiheitsgrade** und die Touch-Interaktion ist ohnehin fummelig.

Statt eine Touch-optimierte Kopie des Desktop-Editors zu bauen (aufwändig, fehleranfällig, verwirrend), bietet Mobile **einen ganz anderen Flow**: Preset wählen → ausfüllen → bestellen. Freies Editing bleibt Desktop vorbehalten. Mobile ist der **Schnellkauf-Pfad**, Desktop ist der **Designer-Pfad**.

## User Stories
- Als mobile Nutzer:in will ich in unter 3 Minuten ein fertiges Poster bestellen können.
- Als mobile Nutzer:in will ich zwischen fertigen **Layout-Vorlagen** wählen, statt alles selbst zu komponieren.
- Als mobile Nutzer:in will ich nach Wahl eines Presets nur noch **den Ort, Text-Felder und ggf. Farbe** anpassen — keine Drag-and-Drops, keine Block-Verschiebung.
- Als mobile Nutzer:in will ich eine klare Vorschau des finalen Posters sehen, bevor ich bestelle.
- Als mobile Nutzer:in will ich zwischen Preset wechseln können, ohne meine Eingaben zu verlieren.
- Als Betreiber will ich die Auswahl der Mobile-Presets kuratiert halten (keine 50 Varianten), damit die Entscheidung schnell bleibt.
- Als Desktop-Nutzer:in will ich weiterhin den vollen Editor nutzen — er bleibt unverändert.

## Acceptance Criteria
- [ ] Auf Viewports **< 768 px** zeigt `/map` und `/star-map` einen **vollständig anderen Flow** (Mobile-Flow), nicht den Desktop-Editor.
- [ ] Mobile-Flow in Schritten:
  1. **Ort suchen** — ein einfaches Suchfeld mit Autocomplete, nichts sonst sichtbar.
  2. **Preset wählen** — horizontal scrollbare Galerie mit Preview-Bildern, jedes Preset bereits mit Beispieltext gefüllt.
  3. **Text anpassen** — max. 3 vordefinierte Textfelder (z. B. Titel, Datum, Untertitel). Keine Blöcke verschiebbar.
  4. **Farbe wählen** — 6 Paletten als Button-Reihe (aus PROJ-15), eine ist preselected.
  5. **Vorschau** — finales Poster in voller Breite mit Format-Toggle (A4/A3).
  6. **Produkt + Checkout** — Download/Poster/Rahmen als Kacheln, direkt in den Checkout.
- [ ] Der Wechsel zwischen Presets lässt den ausgewählten Ort, die Textinhalte und die Farbwahl erhalten (Mapping erfolgt automatisch).
- [ ] Keine Drag-and-Drop-Interaktion im Mobile-Flow.
- [ ] Touch-Targets mindestens 44×44 px (Apple HIG).
- [ ] Ein Banner/Link "Mehr Details? Am Desktop editieren" verweist auf die Desktop-URL, falls Nutzer:in wirklich frei gestalten will. Projektzustand wird für spätere Desktop-Bearbeitung serverseitig gespeichert (nur wenn eingeloggt).
- [ ] Mobile-Flow funktioniert auf iPhone (Safari), Android (Chrome), iPad (Safari). Portrait + Landscape.
- [ ] Lighthouse Mobile Performance Score ≥ 85 auf der Mobile-Start-Seite.
- [ ] Checkout-Schritt nutzt dieselbe Stripe-Integration wie Desktop — keine Duplikation.

## Edge Cases
- User rotiert ins Landscape → Preset-Galerie passt sich flüssig an, keine Ort-/Text-Verluste.
- User kommt vom Desktop-Flow (z. B. via Link einer gespeicherten Vorschau) auf dem Handy an → wir zeigen die Desktop-Preview read-only plus CTA "Am Computer bearbeiten" oder "Mit Preset neu starten".
- Preset hat 3 Textfelder, aber User will nur 1 füllen → leere Felder werden im gerenderten Poster einfach ausgelassen, kein Platzhalter-Text.
- Foto-Integration (PROJ-19) auf Mobile → Presets, die ein Foto erwarten, bieten einen großen "Foto hochladen"-Button als Schritt.

## Non-Goals
- **Keine vollständige Feature-Parität mit Desktop auf Mobile.** Mobile ist bewusst reduziert.
- Keine Block-Verschiebung, keine frei skalierbaren Texte, keine Masken-Auswahl im Mobile-Flow.
- Keine Touch-optimierte Version des Desktop-Editors — wer frei designen will, geht an den Desktop.
- Keine Native App (bleibt PWA).

## Technische Anforderungen
- **Viewport-Detection**: serverseitig (User-Agent) **oder** clientseitig via CSS-Breakpoint (`< 768px`) → bei Match wird Mobile-Flow-Komponente gerendert statt Desktop-Editor.
- Mobile-Flow-UI: **neuer React-Komponentenbaum** parallel zum Desktop-Editor, nicht mit ihm verschachtelt. Gemeinsam genutzte Primitiven: Stripe-Checkout, Order-API, Supabase-Auth.
- Presets aus PROJ-8 werden in einer "mobile-ready"-Teilmenge markiert (Flag im Preset-Datenmodell).
- Hit-Targets, Font-Sizes, Spacings nach iOS-HIG / Material-3.
- Texteingaben zentriert als Form (keine Canvas-Overlays), Preview wird server- oder clientseitig **aus Preset + Inputs** gerendert.

## Open Questions
- Mobile-Flow auf der gleichen URL (`/map`) oder separate Route (`/mobil`)? Entscheidung beim Architecture-Schritt. Gleiche URL ist SEO-freundlicher, separate Route macht Testing einfacher.
- Wird der Mobile-Flow auch auf Tablet verwendet, oder bleibt Tablet auf Desktop? Vorschlag: bis 1024 px Mobile-Flow, darüber Desktop.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

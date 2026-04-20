# PROJ-11: Homepage (Landing Page)

## Status: In Progress
**Created:** 2026-04-19
**Last Updated:** 2026-04-19

## Dependencies
- Requires: PROJ-3 (Poster-Export) — Beispiel-Poster stammen aus dem Editor
- Requires: PROJ-4 (User Authentication) — Login-Button im Nav

## User Stories
- Als potenzieller Kunde möchte ich auf der Startseite sofort verstehen, was der Poster Generator ist und kann, damit ich entscheide ob ich ihn ausprobiere
- Als Besucher möchte ich fertige Beispiel-Poster sehen, damit ich mir das Ergebnis vorstellen kann
- Als Besucher möchte ich die Funktionen des Generators auf einen Blick sehen, damit ich weiß was ich bekomme
- Als Besucher möchte ich die Preise und Produkte sehen, bevor ich mich registriere, damit ich keine Überraschungen erlebe
- Als Besucher möchte ich mit einem Klick direkt in den Editor gelangen, ohne mich zuerst registrieren zu müssen
- Als eingeloggter Nutzer möchte ich im Nav-Header meinen Account-Status sehen (Avatar oder „Mein Konto")

## Acceptance Criteria
- [ ] Route `/` zeigt die Homepage (ersetzt den Next.js-Placeholder)
- [ ] Eigener Landing-Page-Header mit Logo, Anker-Links (Features, Beispiele, Preise) und Login/Signup-Button
- [ ] Hero-Sektion: prägnante Headline, kurze Subline, primärer CTA-Button „Poster erstellen" → `/map`; Hintergrundbild `public/hero-desktop.webp` (Desktop) und `public/hero-mobile.webp` (Mobile, Breakpoint ≤ 768px)
- [ ] Beispiel-Poster-Sektion: mindestens 3 Poster-Beispiele; aktuell als Platzhalter-Cards (grauer Hintergrund + Aspect Ratio); echte Bilder werden als `public/example-1.webp` etc. nachgeliefert (Zielgröße: 600 × 850 px, Hochformat 2:3)
- [ ] Feature-Sektion: mindestens 4 Features als Icon-Cards (z.B. Kartenauswahl, Texte, Formate, Export)
- [ ] Preis-Sektion: 3 Produktkarten (Digital Download, Poster, Bilderrahmen) mit Preisen je Format (A4/A3/50×70)
- [ ] Footer mit Impressum-Link (Platzhalter)
- [ ] Seite ist statisch gerendert (kein `'use client'` auf Root-Level) für SEO
- [ ] Meta-Title und Meta-Description gesetzt (`<head>`)
- [ ] Responsive: Mobile (375px), Tablet (768px), Desktop (1440px)
- [ ] Anker-Links im Header scrollen smooth zur jeweiligen Sektion

## Edge Cases
- Eingeloggter Nutzer sieht im Nav „Mein Konto" statt „Anmelden" → Header-Komponente muss auth-aware sein ohne SSR-Probleme (Hydration)
- Beispiel-Bilder fehlen (noch nicht geliefert) → Platzhalter-Cards mit Aspect Ratio, kein broken image
- Preis-Sektion muss konsistent zu ExportTab (PROJ-3) sein — bei Preisänderungen nur eine Stelle anpassen
- Mobile: Hamburger-Menü oder kollabierter Nav (Anker-Links im Dropdown)

## Technical Requirements
- Statisches Rendering: `export const dynamic = 'force-static'` oder Default (kein fetch/auth auf Seitenebene)
- SEO: `<title>`, `<meta name="description">`, Open Graph Tags
- Performance: Hero-Bilder mit `next/image` und `priority` (`/hero-desktop.webp`, `/hero-mobile.webp`)
- Preise als Konstante in einer zentralen Datei (nicht hartcodiert im JSX), damit sie einmal gepflegt werden

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

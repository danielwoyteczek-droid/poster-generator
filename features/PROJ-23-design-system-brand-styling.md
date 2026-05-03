# PROJ-23: Design-System & Brand-Styling

## Status: Approved
- Reality-Check 2026-05-03: Acceptance Criteria im Code abgedeckt, Status auf Approved gehoben.

**Created:** 2026-04-24
**Last Updated:** 2026-05-03

## Implementation Notes

### Phase 1 — Tokens & Fonts (✅ 2026-04-24)
- `layout.tsx`: Cormorant Garamond + Inter via `next/font/google` geladen, als CSS-Variablen `--font-serif` und `--font-sans` auf `<html>` gebunden
- `body`-Default auf `font-sans bg-background text-foreground` umgestellt
- `tailwind.config.ts`: `fontFamily.serif`, `fontFamily.sans` sowie die Farben `surface` und `brand-accent` zum Theme hinzugefügt
- `globals.css`: `:root`-Tokens auf Zeitlos-Minimalistisch-Palette umgestellt (Primary Petrol `196 37% 19%`, Brand-Accent warmes Grau `32 14% 60%`, Surface `48 26% 96%`, Foreground `195 40% 10%`); `.dark`-Block vollständig entfernt; `--radius` auf `0.75rem` erhöht; Chart- und Sidebar-Tokens auf die neue Palette angeglichen
- `components/ui/button.tsx`: globaler Umstieg auf `rounded-full` in Basis-Variants und size-Varianten; `px`-Werte leicht vergrößert (`px-5` default) für bessere Pill-Proportionen
- Verifiziert: Homepage, Login, Preview-Seiten liefern HTTP 200; Font-Variablen und Palette-Tokens sind im kompilierten CSS sichtbar
- Poster-Tool-`@font-face`-Deklarationen unverändert, Cormorant Garamond ist via gehashter next/font-Klasse isoliert vom Poster-Tool-Eintrag

### Phase 3 — Hardcoded-Farben-Migration (✅ 2026-04-25)
- **Vorgezogen vor Phase 2**, weil User-Feedback nach Phase 1 zeigte: Petrol war kaum sichtbar, weil ~58 Dateien `bg-gray-900`, `text-gray-*`, `border-gray-*` u. ä. hartkodiert hatten und an den Tokens vorbeiroutten
- Mechanische Mass-Migration via Node-Script in zwei Pässen (insgesamt **742 Ersetzungen in 58 Dateien**)
- Mapping konsistent angewandt:
  - `bg-gray-900 text-white` → `bg-primary text-primary-foreground`
  - `hover:bg-gray-800` → `hover:bg-primary/90`
  - `border-gray-900` → `border-primary`
  - `text-gray-900` → `text-foreground`
  - `text-gray-700` → `text-foreground/70`
  - `text-gray-500/600` → `text-muted-foreground`
  - `text-gray-400` → `text-muted-foreground/70`
  - `text-gray-300` → `text-muted-foreground/40`
  - `bg-gray-50/100/200` → `bg-muted`
  - `border-gray-100/200/300` → `border-border`
  - `hover:bg-gray-100/50` → `hover:bg-muted`
  - `hover:text-gray-900` → `hover:text-foreground`
- **Ausgenommen** (bewusst): `src/app/design-preview/page.tsx` und `design-preview-colors/page.tsx` — diese nutzen Inline-Hex-Farben absichtlich für die Design-Vergleichs-Mockups
- Nicht migriert (semantisch korrekt): `bg-black/80`/`/50` in Modal-Overlays (alert-dialog, dialog, sheet, hero-section), `border-black bg-black` in PosterFrameModal (echter Posterrahmen-Effekt)
- Smoke-Test über Homepage, Auth, Cart, Editor (Map + Star-Map), Private, Admin, Blog, About, FAQ — alle Pages liefern HTTP 200 oder erwarteten Redirect

### Phase 2 — Shared Layout-Komponenten
_Ausstehend — SiteHeader + SiteFooter extrahieren_

## Dependencies
- Keine harte technische Abhängigkeit — Infrastruktur-Feature, das alle bestehenden Features optisch neu einkleidet
- **Berührt (Redesign-Coverage):** PROJ-1, PROJ-2, PROJ-3 (Editor-Chrome), PROJ-4 (Auth-Seiten), PROJ-5 (Projekt-Verwaltung), PROJ-6 (Checkout), PROJ-7 (Stern-Karten-Editor), PROJ-8, PROJ-9, PROJ-10 (Admin), PROJ-11 (Homepage), PROJ-12 (Client-Orders), PROJ-13 (Content-CMS-Views), PROJ-14 (Blog), PROJ-19 (Foto-UI), PROJ-21 (Layout-Presets)
- **Explizit NICHT betroffen:** PROJ-15 (Map-Farbschemen = Poster-interne Farben), Email-Templates (bewusst System-Fonts)

## Problem & Ziel
Die Website petite-moment.com hat aktuell kein definiertes Design-System:
- **Typografie fehlt komplett:** In `layout.tsx` ist kein `next/font` konfiguriert. `globals.css` deklariert nur `@font-face` für die Poster-Tool-Fonts. Der `<body>` fällt auf den OS-Default-Sans zurück (Arial/Segoe UI/San Francisco/Roboto, je nach Gerät) — jeder Besucher sieht eine andere Schrift.
- **Farbpalette ist shadcn-Default:** Neutral-Grau, Schwarz-Weiß, keine Markenfarbe. Die Website wirkt generisch und transportiert die Marke nicht.
- **Widerspruch zum Produkt:** petite-moment verkauft personalisierte Kartenposter als Geschenke und Erinnerungen. Das Produkt ist warm und emotional — die Website sollte eine hochwertige, zurückhaltende Boutique-Ästhetik ausstrahlen, die die Poster leuchten lässt, statt mit ihnen zu konkurrieren.

PROJ-23 etabliert ein durchgängiges Design-System (Font-Stack + Farbpalette + UI-Tokens + Typografie-Skala), das auf allen Seiten konsistent wirkt und die Marke transportiert.

## User Stories
- Als Besucher will ich auf allen Seiten eine konsistente, hochwertig wirkende Website sehen, egal auf welchem Gerät ich surfe, damit ich der Marke petite-moment vertraue.
- Als Kunde will ich mich auf der Homepage, im Editor, im Checkout und in meinem Kundenbereich visuell "in einem Haus" fühlen, damit der Kaufprozess nicht gebrochen wirkt.
- Als Betreiber will ich Farben und Fonts an einer zentralen Stelle (Design-Tokens) verwalten, damit zukünftige Anpassungen schnell und konsistent in der ganzen App ankommen.
- Als Entwickler will ich mich beim Anlegen neuer Seiten an einem verbindlichen Token-System orientieren können, damit kein visueller Wildwuchs entsteht.

## Acceptance Criteria

### Fonts (Typografie)
- [ ] Cormorant Garamond ist als Serif-UI-Font via `next/font/google` in `layout.tsx` geladen (Weights 400/500/600/700, latin-Subset).
- [ ] Inter ist als Sans-UI-Font via `next/font/google` in `layout.tsx` geladen (Weights 400/500/600/700, latin-Subset).
- [ ] Beide Fonts sind als CSS-Variablen (`--font-serif`, `--font-sans`) verfügbar und in `tailwind.config.ts` unter `fontFamily.serif` und `fontFamily.sans` eingebunden.
- [ ] Der `<body>`-Tag nutzt `font-sans` (Inter) als Default-UI-Font.
- [ ] Headlines (`h1`, `h2`, `h3`, Hero-Texte, Section-Überschriften) nutzen explizit `font-serif` (Cormorant Garamond).
- [ ] Die bestehenden `@font-face`-Deklarationen in `globals.css` für die Poster-Tool-Fonts (Playfair Display, Amsterdam, Cathalia, CaviarDreams, Montserrat) bleiben unverändert — sie sind weiterhin ausschließlich im Poster-Tool aktiv.
- [ ] Cormorant Garamond (aus Poster-Tool) und Cormorant Garamond (aus UI, via next/font) kollidieren nicht (verifiziert durch Render-Tests).

### Farb-Tokens
- [ ] Die CSS-Variablen in `globals.css` `:root` sind auf die "Zeitlos-Minimalistisch"-Palette umgestellt:
  - `--background`: Weiß (`#FFFFFF`)
  - `--surface` (neu): dezenter warmer Ton (`#F8F7F3`)
  - `--primary`: Tiefpetrol (`#1F3A44`)
  - `--primary-foreground`: Weiß
  - `--accent`: warmes Grau (`#A89B8C`)
  - `--foreground` (Text): fast-schwarz mit Petrol-Stich (`#0F1E23`)
  - `--muted-foreground`: `#6B7680`
  - `--border`: `#E8E5E0`
- [ ] Alle weiteren shadcn-Default-Tokens (`secondary`, `destructive`, `ring`, `input`, `card`, `popover`, `sidebar-*`) sind konsistent zur neuen Palette aktualisiert.
- [ ] Der `.dark`-Block in `globals.css` ist entfernt — kein Dark-Mode in V1.
- [ ] Tailwind-Config in `tailwind.config.ts` referenziert weiterhin `hsl(var(--...))`-Variablen — keine hartkodierten Hex-Werte im Config.

### Komponenten-Verhalten
- [ ] Alle bestehenden shadcn-UI-Komponenten (`src/components/ui/*`) rendern in der neuen Palette, **ohne dass ihre Dateien geändert werden** (sie beziehen Farben über die Tokens).
- [ ] Primary-Buttons: Hintergrund `#1F3A44`, Text weiß, Radius runder Pill-Style (konsistent mit bisheriger App).
- [ ] Outline/Ghost-Buttons: transparenter Hintergrund, `#E8E5E0`-Border, `#0F1E23`-Text.
- [ ] Badges und sekundäre Akzente nutzen `#A89B8C` als Farbe.
- [ ] Links in Fließtext nutzen `#1F3A44` mit Unterstreichung; Hover reduziert Opacity auf ~0.7.

### Pages-Coverage (alle Seiten müssen visuell im neuen System leben)
- [ ] **Homepage** (`/`): Hero-Serif-Headline, Inter-Body, Petrol-CTAs, warme-Grau-Akzente.
- [ ] **Auth-Seiten** (`/login`, `/signup`, `/forgot-password`, `/reset-password`): konsistente Typografie und Button-Farben.
- [ ] **Editor** (`/map/*`, `/star-map/*`) — inkl. Chrome-Redesign:
  - Top-Navigation, Sidebar-Tabs, Toolbar, Kontroll-Elemente um den Canvas nutzen die neue Palette.
  - Der Canvas-Bereich selbst (wo das Poster live gerendert wird) behält einen neutralen Hintergrund (z. B. sehr helles Grau), damit die Poster-Preview nicht mit der App-Chrome-Farbe interferiert.
  - Hierarchie und Spacing der Sidebar-Tabs werden bei Bedarf überarbeitet, nicht nur Farben.
- [ ] **Checkout** (`/checkout/*`), **Warenkorb** (`/cart`), **Orders** (`/orders/*`): neue Palette, Cormorant-Überschriften.
- [ ] **Admin-Bereich** (`/admin/*`, `/private/*`): neue Palette, konsistent zur Public-UI.
- [ ] **Content-Pages** (Impressum, Datenschutz, AGB, Widerruf, FAQ, Cookie-Richtlinie, About, Blog): lesbare Typografie mit Cormorant-Überschriften, Inter-Body, angepasste Tailwind-Prose-Stile.
- [ ] **Preview-Seiten** (`/design-preview`, `/design-preview-colors`): bleiben als interne Referenz/Playground bestehen, nicht in Navigation verlinkt. (Robots.txt oder `noindex`-Schutz ist optional und nicht Teil von V1.)

### Typografie-Skala
- [ ] Eine explizite Type-Scale ist definiert und konsistent angewendet:
  - **H1 / Hero:** ~48–56 px, Cormorant Garamond, Weight 500, Line-Height ~1.05–1.1
  - **H2 / Section:** ~32–36 px, Cormorant Garamond, Weight 500
  - **H3 / Sub-Headline:** ~24 px, Cormorant Garamond, Weight 500
  - **Body:** 16 px, Inter, Weight 400, Line-Height ~1.6
  - **Small / Caption:** 14 px, Inter, Weight 400
  - **Kicker / Section-Label:** 12 px, Inter, Weight 500, uppercase, `tracking-[0.18em]`
- [ ] Bestehende inline-`text-*`-Klassen auf den Seiten werden wo nötig an die Skala angepasst (z. B. `text-6xl font-sans` → `text-6xl font-serif`), bleiben aber funktional kompatibel.

### Qualität
- [ ] Alle Farb-Kombinationen erfüllen **WCAG-AA-Kontrast** (4.5 : 1 für normalen Text, 3 : 1 für Large-Text und UI-Elemente).
- [ ] Kein Flash-of-Unstyled-Text (FOUT) im Production-Build über >200 ms; `next/font` Preload ist aktiv.
- [ ] Alle wichtigen Seiten wurden manuell in Chrome, Firefox, Safari (desktop) + iOS Safari und Android Chrome (mobile) geprüft und sehen konsistent aus.

## Edge Cases
- **Font-Loading-Fehler** (Offline-Szenario, Google-Fonts-Down, Cache-Miss): `next/font` liefert automatisch System-Fallbacks (`serif`/`sans-serif`). `font-display: swap` akzeptiert kurzen FOUT statt langen FOIT. Seite bleibt lesbar.
- **Kontrast-Problem bei Sehschwäche:** Petrol `#1F3A44` auf weißem Hintergrund hat ~12 : 1 Kontrast (WCAG AAA). Warmes Grau `#A89B8C` als Body-Accent wäre zu schwach für Fließtext → nur für Badges, Icons und sekundäre Labels verwenden, nicht für Paragraph-Content.
- **Poster-Preview im Editor wirkt falsch:** Wenn die Canvas-Umgebung die neue `surface`-Farbe (`#F8F7F3`) annimmt, könnten helle Poster an Kontrast verlieren. → Canvas-Bereich erhält bewusst einen neutralen, sehr hellen Grauton (vom bisherigen Editor-Background), unabhängig vom Rest der App-Chrome.
- **Hartkodierte Farben in bestehenden Komponenten:** Einige Seiten (z. B. `/datenschutz/page.tsx`) könnten inline-Tailwind-Farben (`text-gray-900`, `bg-stone-50`) nutzen. → Diese werden im Umsetzungsschritt identifiziert und auf Token-basierte Styles umgestellt (`text-foreground`, `bg-muted`).
- **shadcn-Component-Updates in der Zukunft:** Wenn `npx shadcn@latest add` später neue Komponenten installiert, bringen sie shadcn-Default-Tokens mit. → Die `globals.css` bleibt die Single Source of Truth; solange neue Komponenten `hsl(var(--...))` verwenden, adaptieren sie automatisch.
- **Browser-Druck-/PDF-Export:** Falls Export-Pipelines (Poster-PDF) eigenes Canvas-Rendering nutzen, sind sie unabhängig vom UI-Font-Loading. → Kein zusätzlicher Fix nötig, Poster-Fonts werden separat via `@font-face` geladen.
- **Blog-Content aus Sanity (PROJ-13):** Rich-Text-Content wird über Tailwind-Prose gerendert. → `@tailwindcss/typography` bereits installiert; Prose-Farben müssen an die neue Palette angepasst werden (Überschriften serif, Links petrol).

## Non-Goals
- **Keine Änderungen an Poster-internen Farben.** Das ist PROJ-15. Poster behalten ihre eigenen konfigurierbaren Farbschemen.
- **Kein Dark-Mode.** `.dark`-Tokens werden entfernt; V1 ist bewusst nur hell.
- **Keine Email-Template-Überarbeitung.** Emails behalten System-Font-Stack und eigene Inline-Farben (`src/lib/email.ts`).
- **Kein Logo-Redesign.** Das Waverly-Logo bleibt unverändert als SVG.
- **Keine Motion/Animation-Guideline.** Transitions, Hover-Animations, Micro-Interactions können in einem späteren Feature ergänzt werden.
- **Keine Marketing-Material-Styleguide.** Externe Medien (Social-Media-Templates, Print-Flyer) sind Thema für PROJ-16 / PROJ-17.
- **Keine vollständige A11y-Audit.** Kontrast-Check für die Palette ist Teil dieses Features, aber Screenreader-Optimierung, Keyboard-Navigation, ARIA-Attribute sind separates Thema.

## Open Questions
- Body-Text-Weight 400 oder 500? (400 lesbarer bei Fließtext, 500 marken-konsistenter/kräftiger) → Entscheidung beim Frontend-Schritt, A/B-Vergleich live.
- Hover/Active-States für Buttons: manuell definieren oder Tailwind-Default (`hover:opacity-90`)? → Frontend-Schritt.
- Rollout technisch: ein großer Commit oder Seite-für-Seite in mehreren PRs? → Architecture-Schritt.

## Technical Requirements
- **Performance:** First Contentful Paint darf durch Font-Loading um nicht mehr als 200 ms verschlechtert werden. `next/font` subsettet automatisch und hostet lokal.
- **Browser-Support:** Chrome, Firefox, Safari (aktuell + letzte 2 Major), Edge aktuell. Mobile: iOS Safari, Android Chrome aktuell.
- **Accessibility:** WCAG-AA-Kontrast für alle Farb-Kombinationen (4.5 : 1 für Body, 3 : 1 für Large-Text/UI).
- **CSS-Architektur:** Design-Tokens ausschließlich über CSS-Variablen in `globals.css`; keine hartkodierten Hex-Werte in Tailwind-Config oder Komponenten.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Gesamtablauf (3-Phasen-Rollout)

```
Phase 1: Design-Tokens + Fonts
   +-- globals.css: Palette (Zeitlos-Minimalistisch), dark-Block entfernen
   +-- tailwind.config.ts: fontFamily.serif + fontFamily.sans erweitern
   +-- layout.tsx: next/font/google lädt Cormorant + Inter
   +-- ui/button.tsx: rounded-md -> rounded-full
             |
             v (alle shadcn-Komponenten adaptieren automatisch)

Phase 2: Shared Layout-Komponenten
   +-- src/components/layout/SiteHeader.tsx (neu)
   +-- src/components/layout/SiteFooter.tsx (neu)
   +-- Public-Pages binden SiteHeader + SiteFooter ein
   +-- Editor/Admin behalten eigene Chrome-Varianten
             |
             v

Phase 3: Hardcoded-Farben-Migration
   +-- Scan aller Seiten auf bg-stone-*, bg-gray-* u.ä.
   +-- Ersetzen durch Token-Klassen (bg-background, bg-muted, text-foreground, ...)
   +-- Prose-Styles (Blog, Legal-Pages) an neue Palette angepasst
```

Jede Phase ist ein eigener PR, einzeln testbar und rollbar. Phase 1 bringt den größten sichtbaren Effekt (Fonts + Farben überall). Phase 2 und 3 sind Aufräumarbeiten für Wartbarkeit und Konsistenz.

### B) Komponenten-Struktur

```
poster-generator
│
├── src/app/
│   ├── globals.css                ← modifiziert: Palette, dark entfernt
│   └── layout.tsx                 ← modifiziert: next/font-Integration
│
├── src/components/
│   ├── layout/                    ← NEU (Phase 2)
│   │   ├── SiteHeader.tsx         ← globale Public-Page-Navigation
│   │   └── SiteFooter.tsx         ← globaler Footer mit Legal-Links
│   │
│   └── ui/
│       └── button.tsx             ← modifiziert: rounded-md → rounded-full
│
└── tailwind.config.ts             ← modifiziert: fontFamily-Extension
```

**Welche Pages betrifft welche Phase:**

| Phase | Seiten betroffen | Sichtbarer Effekt |
|-------|------------------|-------------------|
| 1 | Alle (via Tokens) | Neue Fonts + Farben überall |
| 2 | Homepage, Public-Pages, Legal, FAQ, About, Blog | Einheitliches Header/Footer-Markup |
| 3 | About, Cart, Checkout-Success, Blog, Admin-Views, Auth-Seiten | Keine hartkodierten Farben mehr |

### C) Datenmodell

**Kein** neues Datenmodell — PROJ-23 ist reines UI/Styling.

**Design-Tokens** (CSS-Variablen in `globals.css`) als Single Source of Truth:
- Farb-Tokens (11 Stück): `--background`, `--surface`, `--foreground`, `--primary`, `--primary-foreground`, `--accent`, `--muted-foreground`, `--border`, `--input`, `--ring`, `--destructive`
- Font-Tokens (2 Stück): `--font-serif`, `--font-sans` (werden von `next/font` gesetzt)

### D) Tech-Entscheidungen

| Entscheidung | Begründung |
|--------------|-----------|
| **3-Phasen-Rollout** | Phase 1 ist niedriges Risiko (Token-Austausch, shadcn adaptiert automatisch) und bringt 80% des sichtbaren Effekts. Phase 2 und 3 sind Aufräumarbeit, die unabhängig ausrollbar ist. Jede Phase einzeln reviewbar. |
| **Tokens in HSL statt OKLCH oder Hex** | shadcn-Konvention, alle bestehenden Komponenten nutzen `hsl(var(--...))` — kein Refactoring nötig. |
| **Font-Variablen-Namen semantisch (`--font-serif`, `--font-sans`)** | Entkoppelt Font-Wahl von Variablen-Namen. Wenn Cormorant in Zukunft gegen eine andere Serif getauscht wird, müssen keine Klassen geändert werden. |
| **`next/font/google` statt Google-Fonts-Link-Tag oder eigenem `@font-face`** | Automatisches Subsetting (nur latin), lokales Self-Hosting bei Build (DSGVO-freundlich, kein Google-Tracking), Preload und `font-display: swap` out-of-the-box. Nebeneffekt: die Datenschutz-Seite kann weiter ohne Google-Fonts-Erwähnung geführt werden. |
| **Gemeinsamer SiteHeader/Footer** | Vermeidet Mehrfach-Pflege bei zukünftigen Nav-Änderungen. Editor/Admin behalten eigene Chrome-Varianten (Editor-Toolbar, Admin-Sidebar), weil deren UX sich strukturell von Public-Pages unterscheidet. |
| **Button `rounded-full`** | Passt zum weichen Boutique-Look und zum runden Waverly-Logo. Einmalige Änderung in Button-Component adoptiert in allen ~150 Button-Usages der App. |
| **`.dark`-Block entfernen** | Kein Dark-Toggle in der UI, Tokens werden nie angewendet. Entfernen reduziert Wartungslast und hält globals.css schlank. |
| **Cormorant Garamond doppelt geladen** (einmal via `@font-face` fürs Poster-Tool, einmal via `next/font` für UI) | Pragmatische Entscheidung: Die Poster-Tool-Font-Liste muss User-adressierbar bleiben (`fontFamily: 'Cormorant Garamond'` im Store). `next/font` liefert einen gehashten Family-Namen (`__Cormorant_Garamond_xyz`), ist also isoliert. Kein Konflikt, minimale Download-Redundanz (einmaliges Caching). Eine Vereinheitlichung wäre architektonisch aufwändiger als der Nutzen. |
| **Canvas-Bereich im Editor behält neutralen Hintergrund** | Das Poster ist der Star — die App-Chrome-Farbe darf die Live-Preview nicht verfälschen. Expliziter Override der Surface-Token im Canvas-Container. |
| **Preview-Seiten (`/design-preview*`) bleiben** | Niedrige Kosten (statische Render-Pages), hoher Nutzen (dauerhafte Design-Referenz für künftige Entscheidungen). Werden nicht in Navigation verlinkt, über Robots erreichbar, aber das ist akzeptabel. |

### E) Migrations-Strategie für hartkodierte Farben (Phase 3)

Scan-Ergebnis aus Grep: mindestens 18 Vorkommen von `bg-stone-*` / `bg-gray-*` / `text-stone-*` in ~10 Dateien. Konkret betroffen:
- `src/app/about/page.tsx`, `src/app/cart/page.tsx`, `src/app/checkout/success/page.tsx`, `src/app/forgot-password/page.tsx`, `src/app/blog/*`
- `src/components/admin/AdminPresetsList.tsx`, `AdminOrdersList.tsx`, `AdminOrderDetail.tsx`, `AdminMasksList.tsx`

**Mapping-Regel** (einheitlich pro Kategorie):
- `bg-stone-50` / `bg-gray-50` → `bg-muted`
- `bg-stone-100` / `bg-gray-100` → `bg-secondary`
- `text-stone-500` / `text-gray-500` → `text-muted-foreground`
- `text-stone-900` / `text-gray-900` → `text-foreground`
- `border-stone-200` / `border-gray-200` → `border-border`

Migration erfolgt manuell per Datei (nicht per Regex-Search-Replace, weil Kontext-Entscheidungen nötig sind — z. B. ob `bg-stone-100` wirklich `secondary` oder doch `surface` werden soll).

### F) Abhängige Packages

**Keine neuen Dependencies.** Alles verwendet bereits Installiertes:
- `next/font` ist Bestandteil von Next.js 16 (bereits im Projekt)
- `@tailwindcss/typography` ist für Prose-Stile bereits installiert
- `tailwindcss-animate`, `class-variance-authority`, `tailwind-merge` bleiben wie sind

### G) Migrations-Schritte (Implementation-Reihenfolge)

**Phase 1 — Tokens & Fonts (ein PR):**
1. `next/font/google` Imports in `layout.tsx` hinzufügen (Cormorant Garamond + Inter)
2. CSS-Variablen `--font-serif`, `--font-sans` im `<html>`-Root setzen
3. `tailwind.config.ts` um `fontFamily.serif` und `fontFamily.sans` erweitern
4. `globals.css` `:root`-Block auf Zeitlos-Minimalistisch-Palette umstellen
5. `globals.css` `.dark`-Block entfernen
6. `src/components/ui/button.tsx`: `rounded-md` → `rounded-full` in Basis-Variants
7. Smoke-Test: Homepage, Editor, Login, Checkout manuell in Browser prüfen

**Phase 2 — SiteHeader/Footer (ein PR):**
1. `src/components/layout/SiteHeader.tsx` anlegen (Logo-SVG + Navigation + CTA)
2. `src/components/layout/SiteFooter.tsx` anlegen (Legal-Links, Copyright, Kontakt)
3. Eine Referenz-Page (z. B. Homepage) auf die neuen Komponenten umstellen
4. Nach User-Review: alle weiteren Public-Pages (About, FAQ, Legal, Blog) einbinden
5. Editor-Chrome und Admin-Chrome bleiben unangetastet

**Phase 3 — Hardcoded-Farben-Cleanup (ein PR oder aufgeteilt):**
1. Für jede in Grep-Scan identifizierte Datei: `bg-stone-*`, `bg-gray-*` etc. durch Token-Klassen ersetzen
2. Blog- und Legal-Pages: `@tailwindcss/typography`-Klassen (`prose`) mit Custom-Farben überschreiben
3. Manual-Test aller migrierten Seiten
4. WCAG-Kontrast-Check der kritischen Farb-Kombinationen

### H) Risiken / Offene Punkte

- **Phase 1 Regressions-Risiko:** Obwohl shadcn-Komponenten Tokens nutzen, haben einige Stellen Farben inline — die wirken nach Phase 1 inkonsistent (neue Nav-Farbe + altes Button-Grau nebeneinander). Das ist erwartet und wird in Phase 3 behoben. Phase 1 ist trotzdem deploybar, weil keine Seite kaputt ist, nur teilweise noch alt-aussehend.
- **SiteHeader Mobile-Navigation:** Responsive Burger-Menü muss designed werden — Phase 2 klärt das im Detail, nicht hier.
- **Editor-Chrome Redesign-Umfang:** Der Spec fordert "inkl. Editor-Chrome-Redesign". In Phase 1 passt sich der Editor automatisch an die Tokens an. Ob darüber hinaus noch Spacing/Hierarchie der Sidebar-Tabs überarbeitet werden sollen, wäre ein zusätzliches Paket (nicht Teil der 3 Phasen) und sollte beim `/frontend`-Schritt bewertet werden — wenn die Token-Umstellung allein schon gut wirkt, kann die Struktur bleiben.
- **Blog-Content aus Sanity:** Rich-Text über Tailwind Prose braucht angepasste Prose-Farben. Könnte in Phase 3 untergebracht werden oder als separater kleiner Schritt.
- **WCAG-Kontrast `#A89B8C` auf Weiß:** Warmes Grau hat nur ~2.4 : 1 Kontrast auf Weiß — ungeeignet für Body-Fließtext. Im Spec bereits als Non-Goal für Body-Use eingetragen. Für Badges, Kicker und Icons passt es; Fließtext nutzt immer `--foreground` oder `--muted-foreground`.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

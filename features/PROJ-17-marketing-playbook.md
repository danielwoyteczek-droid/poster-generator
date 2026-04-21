# PROJ-17: Marketing-Playbook & Kampagnen

## Status: Planned
**Created:** 2026-04-21
**Last Updated:** 2026-04-21

## Dependencies
- Requires: PROJ-16 (Marketing-Infrastruktur) — Pixel + Newsletter + Reviews müssen live sein
- Requires: Stripe Live-Modus + Voucher-System (beides vorhanden)

## Problem & Ziel
Die technische Basis steht. Was fehlt ist die **Go-to-Market-Strategie**: welche Zielgruppen, welche Anlässe, welche Kanäle, welche Budgets. PROJ-17 ist kein Code-Feature, sondern eine **lebende Marketing-Dokumentation** mit Kampagnen-Ideen, Zielgruppen-Clustern, Content-Kalender und Kanal-Mix.

## Struktur des Dokuments

Dieses Spec hält das Playbook strukturiert zusammen — Implementierung erfolgt nicht als Code, sondern durch das Ausführen der hier beschriebenen Kampagnen. Bei Bedarf ergibt sich daraus Code-Aufwand (z. B. neue Landing-Page für eine Kampagne), der als eigenes PROJ-X-Spec ausgelagert wird.

### 1. Zielgruppen-Cluster
Wer kauft überhaupt Kartenposter bei petite-moment? Wahrscheinliche Segmente (zu validieren durch erste Käufe):
- **Paare mit Meilenstein** (1., 5., 10. Hochzeitstag, Jubiläum Kennenlernen, Verlobung)
- **Jung-Eltern / Geburtsgeschenk-Käufer** (oft Großeltern, Paten)
- **Umzügler / Einweihungs-Gäste** (neue Adresse verewigen)
- **Trauernde / Gedenken** (Ort, an dem ein geliebter Mensch lebte)
- **Reise-Nostalgiker** (Lieblings-Urlaubsort, Bucket-List-Orte)

### 2. Kanal-Mix (Priorisierung nach CAC-Annahme)
- **SEO organisch** (Blog + Landing-Pages) — niedriger CAC, braucht 3–6 Monate Anlauf
- **Google Search Ads** (SEA) — Bottom-Funnel ("hochzeitsgeschenk personalisiert"), skalierbar
- **Meta Ads** (Facebook + Instagram) — Mid-Funnel, visuelle Produktdarstellung, Kreativ-intensiv
- **TikTok Ads** — Top-Funnel, jüngere Zielgruppe, Kurzvideo-Content nötig
- **Pinterest** — starkes Einrichtungs-/Inspirations-Umfeld, oft unterschätzt
- **Affiliate / Influencer** — Micro-Influencer im DACH-Hochzeits-/Elternschaft-Space
- **Newsletter** — Retention + Cross-Sell
- **Review-SEO** — Trustpilot/Google Reviews als Trust-Signal

### 3. Kampagnen-Ideen nach Anlass

**Rollende Anlässe (das ganze Jahr):**
- Paare: "Der Ort, an dem alles begann" (Evergreen)
- Eltern: "Der Ort ihrer Geburt" (Evergreen)
- Einweihung: "Neue Adresse, altes Zuhause" (Evergreen)

**Saisonale Peaks:**
- **Valentinstag** (14.02.): Paare
- **Muttertag** / **Vatertag**: Eltern-Geschenk
- **Hochzeits-Saison Mai–September**: Paare, Gast-Geschenke
- **Schulanfang** (Ende August/September): Einschulungsgeschenk-Angle
- **Weihnachten** (Q4): Breit, Gutschein-Geschäft, größter Umsatz-Monat
- **Jahreswechsel**: "Das Jahr, in dem ihr…"-Postkarten-Rückblick

**Guerilla / Social:**
- "Welcher Ort würde dein petite-moment sein?" — Social-Challenge
- Kurzgeschichten von Kund:innen (mit Zustimmung) als Social Stories

### 4. Content-Kalender (grobes Template)

| Monat | SEO-Content (Blog) | Kampagnen-Push | Newsletter-Thema |
|-------|-------------------|----------------|------------------|
| Jan | "Valentinstag-Geschenke" | SEA Valentinstag | Vorschau aufs Jahr |
| Feb | Last-Minute Valentinstag | Meta Valentinstag | Valentinstag-Rabatt |
| Mär | "Muttertag: Wie du ihn besonders machst" | SEA Muttertag | Feature-Update |
| Apr | "Der Ort eurer Hochzeit: Poster-Ideen" | Hochzeit-Ads | Frühjahrsstory |
| … | … | … | … |

(Tabelle wird ausgefüllt, sobald die ersten Kampagnen laufen.)

### 5. Test-Hypothesen

Statt blind Budget zu verbrennen: pro Quartal 3–5 klar formulierte Hypothesen mit messbarem Ziel.
- Beispiel: *"Eine dedicated Landing-Page für 'Hochzeitsgeschenk' konvertiert 2× besser als die generische Homepage."* — Test mit €500 Meta-Budget, Ergebnis dokumentieren.

### 6. KPIs

- **CAC** (Customer Acquisition Cost) pro Kanal, gemessen in GA4 + Meta/TikTok Reports
- **ROAS** (Return on Ad Spend) — Ziel > 2,0 für bezahlte Kanäle
- **Conversion Rate** der Homepage + Produktseiten
- **E-Mail-Opt-in-Rate** auf der Website
- **Review-Quote** (Anteil Bestellungen mit abgegebener Bewertung)

## User Stories (Metha-Ebene)
Dieses Spec hat keine klassischen User Stories — es dient als **Steuerungsdokument für den Betreiber**.

- Als Betreiber will ich eine lebende Übersicht meiner Marketing-Aktivitäten, damit ich sehe was geplant, live, und erfolgreich ist.
- Als Betreiber will ich aus jeder Kampagne klare Learnings dokumentieren können.

## Acceptance Criteria
- [ ] Dieses Dokument dient als Quelle der Wahrheit für alle Marketing-Aktivitäten und wird quartalsweise aktualisiert.
- [ ] Jede ausgeführte Kampagne wird am Ende ihres Zeitraums mit **Budget, Ergebnis, Learning** nachgepflegt.
- [ ] Kampagnen, die eine eigene Technik brauchen (Landing-Page, Feature), bekommen ein eigenes PROJ-Spec.

## Non-Goals
- Kein Ausbau zur vollständigen Marketing-Suite im Code (kein CRM, kein Analytics-Dashboard).
- Keine Automatisierung des Playbooks — bewusst menschlich pflegen, damit strategische Entscheidungen nicht im Tool versanden.

## Lebende Dokumentation
Ab hier wird das Dokument fortlaufend mit konkreten Kampagnen-Einträgen erweitert:

### Aktive Kampagnen
_Noch keine._

### Abgeschlossene Kampagnen
_Noch keine._

### Erkenntnisse / Learnings
_Noch keine._

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_Not applicable — no code feature_

## QA Test Results
_Not applicable_

## Deployment
_Not applicable — this is a living document_

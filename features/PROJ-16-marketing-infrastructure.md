# PROJ-16: Marketing-Infrastruktur

## Status: Planned
**Created:** 2026-04-21
**Last Updated:** 2026-04-21

## Dependencies
- Requires: GTM + GA4 Setup (bereits live seit 2026-04-21) — als Tracking-Hub
- Requires: Resend Domain-Verifikation (bereits aktiv) — für Newsletter + Transaktionsmails
- Requires: PROJ-13 (Sanity CMS) — für UGC-Content wie Testimonials

## Problem & Ziel
petite-moment ist live, Commerce funktioniert, Content steht. Damit bezahlte Kampagnen (SEA, Meta, TikTok) überhaupt sinnvoll messbar sind und Besucher zu Leads/Kunden konvertiert werden, fehlt die Marketing-seitige Infrastruktur: Pixel-Tracking, Lead-Generation, Social Proof. PROJ-16 baut **die Werkzeuge** auf, die PROJ-17 (Playbook) später aktiv einsetzt.

## User Stories
- Als Betreiber will ich Meta- und TikTok-Pixel ohne Code-Deploy per GTM aktivieren, damit Kampagnen auf diesen Netzwerken Conversion-Optimization nutzen können.
- Als Betreiber will ich im Footer und strategisch im Editor-Flow einen Newsletter-Opt-in haben, damit ich Leads auch ohne Kauf einsammle.
- Als Betreiber will ich Newsletter-Abonnenten in einer Liste verwalten und ihnen Broadcast-Kampagnen schicken können (z. B. „10 % Hochzeits-Rabatt", „Neue Sternenposter-Variante").
- Als Besucher will ich **Kundenstimmen/Bewertungen** auf Produkt- und Landing-Seiten sehen, um Vertrauen aufzubauen.
- Als Kunde will ich nach einer Bestellung eine Bewertung abgeben können, ohne mich dafür extra registrieren zu müssen.
- Als Betreiber will ich Server-Side-Tracking für kritische Events (purchase, add_to_cart) zusätzlich zur Client-Seite haben, damit iOS-ATT/Safari-ITP die Attribution nicht kaputtmachen.

## Acceptance Criteria
- [ ] **Meta Pixel** ist via GTM integrierbar (Tag-Template in GTM) und feuert `PageView`, `AddToCart`, `InitiateCheckout`, `Purchase` automatisch, sobald der Betreiber eine Pixel-ID hinzufügt.
- [ ] **TikTok Pixel** analog integrierbar mit TikTok-Events (`PlaceAnOrder`, `AddToCart`, `ViewContent`).
- [ ] Beide respektieren den bestehenden Consent-Mode v2 — Pixel feuern nur bei `ad_storage = granted`.
- [ ] **Newsletter-Opt-in**:
  - Textfeld im Footer auf jeder Seite
  - Optionaler Inline-Opt-in nach Checkout-Success ("Möchtest du bei neuen Styles benachrichtigt werden?")
  - DSGVO-konform: Double-Opt-in, klarer Zweck, Abmelde-Link in jeder Mail
  - Daten landen in Resend-Audience (Contact-Liste) plus optional Supabase-Tabelle für Sync
- [ ] **Newsletter-Versand**: Betreiber kann aus dem Admin-Bereich Broadcast-E-Mails an die Audience schicken (oder wenigstens: Audience ist in Resend-Dashboard sauber verfügbar, dort direkt versenden).
- [ ] **Bewertungs-System**:
  - Nach abgeschlossener Bestellung erhält der Kunde 7 Tage später eine "Bitte bewerten"-Mail mit persönlichem Link
  - Bewertungs-Formular: Sterne (1–5) + optionaler Text + optionales Foto (verknüpft mit seiner Order, kein Login nötig)
  - Bewertungen werden in Sanity (neuer Content-Type `review`) gespeichert
  - Review-Widget auf Landing-Page (zufällige 3 aktuelle Reviews) sowie auf FAQ/About-Seite
  - Betreiber kann Reviews im Studio freigeben/moderieren (Status: `pending`, `published`, `hidden`)
- [ ] **Tracking-Dokumentation**: Alle gesendeten GA4/Meta/TikTok-Events in einer Tabelle (Trigger, Parameter), damit Kampagnen-Setup nachvollziehbar bleibt.

## Edge Cases
- Consent-Banner wurde noch nicht akzeptiert → Pixel feuern nicht, aber GA4-Basis-Signal via Consent-Mode v2 läuft weiter (cookieless ping).
- Newsletter: User meldet sich mehrfach an → Deduplizierung durch Resend / eindeutige E-Mail.
- Bewertung: User kauft etwas, bekommt Review-Mail, klickt Link nach 60 Tagen → Link läuft nach 30 Tagen ab, klare Fehlerseite.
- Review mit Bildern wird hochgeladen → Moderation prüft vor Publikation; Standard: `pending`.

## Non-Goals
- Kein eigenes E-Mail-Automation-System mit Segmentierung/Trigger-Flows (wie ActiveCampaign) — in V1 reicht Resend Broadcast.
- Kein Loyalty-/Punkte-System.
- Keine Reviews-Integration mit Google Shopping (Trustpilot etc.) — erstmal nur eigene Reviews auf der Seite.
- Kein Referral-Programm (ggf. als eigenes PROJ-XX später).
- Kein Abandoned-Cart-Recovery in V1 — kommt wenn Commerce-Basis stabil ist.

## Technische Anforderungen
- GTM-Custom-Tag-Templates für Meta + TikTok (Gesellschaft: es gibt offizielle GTM-Templates, nutzen wenn möglich)
- Neuer Sanity-Schema-Type `review` mit: `rating`, `authorName`, `authorEmail` (nicht public), `text`, `photoUrl`, `orderId`, `status`, `createdAt`
- Review-Formular lebt in einer öffentlichen Route (z. B. `/review/[orderToken]`)
- Resend-Audience-API für Newsletter (oder einfacher: separate Supabase-Tabelle `newsletter_subscribers`, wir exportieren zu Resend on-demand)
- Datenschutz muss ergänzt werden: Meta-Pixel, TikTok-Pixel, Newsletter-Verarbeitung, Review-Veröffentlichung

## Trust-Aufbau in der Früh-Phase (vor echtem Review-Volumen)

Bevor das Review-System echte Einträge hat, ist die Homepage mit Bewertungs-Feldern leer — das wirkt schlechter als kein Review-Widget. Fake-Reviews sind rechtlich problematisch (§5a UWG, DSA) und praktisch riskant. Deshalb sammeln wir hier die legitimen Alternativen, die bis zu den ersten 50 echten Reviews funktionieren:

**1. Früh-Kunden-Programm** — 10-20 Menschen aus deinem Umfeld (Familie, Freunde, Paare im Bekanntenkreis) bekommen ein Poster geschenkt oder mit 50 % Rabatt im Tausch gegen ehrliches Feedback. Sind **echte Transaktionen**, echte Reviews, rechtlich sauber. Zeitrahmen: 2-4 Wochen, dann 10-15 authentische Bewertungen.

**2. Testimonials statt Sterne-Reviews** — kurze Zitate mit Vornamen + Ort ("Wir haben's zur Hochzeit verschenkt, die Reaktion war unglaublich." — Sarah, München). Weniger Conversion-Power als Stern-Reviews, aber rechtlich weniger problematisch und fühlt sich menschlicher an.

**3. "So sieht das bei unseren Kund:innen aus"-Galerie** — Kunden-Poster zeigen (mit schriftlicher Zustimmung), erzeugt Social Proof ohne je das Wort "Review" oder "Rating" zu nutzen. Geeignet sowohl für Homepage als auch für eine dedicated `/inspiration`-Seite.

**4. Offene "We're new"-Haltung** — "Wir sind frisch gestartet. Sei eine der ersten zehn Bestellungen und bekomme 20 % Rabatt, dazu freuen wir uns über dein Feedback." Macht aus der Schwäche (keine Reviews) eine Geste (Frühbucher-Vorteil).

**5. Press-Mentions oder "Als gesehen bei…"** — sobald kleine Blogs, Magazine, Podcasts oder Influencer euch organisch erwähnen, zitieren und mit Logo/Link einbinden.

**Empfohlener Weg:** Kombination aus **#1** (echte Reviews generieren) + **#3** (Kunden-Galerie als sichtbares Vertrauen), dazu optional **#4** als Opt-in-Incentivierung. Das Review-System bleibt im Hintergrund vorbereitet, wird aber erst aktiv sichtbar, wenn mindestens ~10 echte Reviews da sind.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

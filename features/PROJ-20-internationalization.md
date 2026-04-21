# PROJ-20: Internationalisierung (i18n)

## Status: Planned
**Created:** 2026-04-21
**Last Updated:** 2026-04-21

## Dependencies
- Requires: PROJ-13 (Content CMS / Sanity) — Blog-, About- und FAQ-Content muss pro Sprache gepflegt werden
- Requires: PROJ-14 (Blog-Automation) — Generator muss pro Sprache schreiben können
- Requires: PROJ-11 (Homepage) — alle Texte auf Landing müssen übersetzbar sein

## Problem & Ziel
petite-moment ist heute komplett auf Deutsch. Der Markt DACH ist begrenzt; Hochzeits- und Geschenk-Kategorien sind in UK, Frankreich, den Niederlanden und Skandinavien ähnlich groß. Ohne Mehrsprachigkeit bleiben diese Märkte unzugänglich. Gleichzeitig muss i18n sauber von Anfang an strukturiert sein, sonst wird's später teuer umgebaut.

PROJ-20 führt eine **saubere Mehrsprachigkeits-Basis** ein: URL-Struktur, Übersetzungs-Infrastruktur, Content-Pipeline für lokalisierte Inhalte, lokalisierte Transaktions-E-Mails und Rechts-Texte.

## Sprachen-Roadmap
- **V1** (mit diesem Spec): Deutsch (DE), Englisch (EN)
- **V1.1**: Französisch (FR) — sobald V1 stabil
- **V2** (später): NL, ES, IT (Priorität je nach Nachfrage)

Das Spec baut das Framework für beliebige Sprachen, aktiviert aber initial nur DE + EN.

## User Stories
- Als nicht-deutschsprachige Nutzer:in will ich die Seite in meiner Sprache sehen, sobald ich auf petite-moment.com komme.
- Als Nutzer:in will ich jederzeit die Sprache wechseln können (Menü oder Footer), ohne meine Session/Bestellung zu verlieren.
- Als Suchmaschine (Google) will ich über `hreflang`-Tags erfahren, welche Sprach-Version welcher URL entspricht, damit das richtige Resultat für jede Nutzer-Region ausgespielt wird.
- Als Betreiber will ich Blog- und About-Inhalte pro Sprache in Sanity pflegen können, ohne separate Projekte.
- Als Betreiber will ich juristische Texte (Impressum, Datenschutz, AGB, Widerrufsbelehrung) in jeder Sprache haben — auf Deutsch rechtssicher, in anderen Sprachen als informative Übersetzung.
- Als Kunde will ich meine Bestellbestätigungs-E-Mail in meiner Sprache erhalten.
- Als Kunde will ich Preise in meiner üblichen Währung (EUR heute, später CHF/GBP) sehen.

## Acceptance Criteria
- [ ] **URL-Struktur**: Sprach-Präfix im Pfad — `https://petite-moment.com/de/...`, `/en/...`. Alte URL ohne Präfix (`/`) redirected auf die Default-Sprache basierend auf Browser-`Accept-Language` (fallback DE).
- [ ] Sprach-Wechsler im Header (Desktop) und im Mobile-Menü. Wechsel ändert nur den Sprach-Präfix, nicht den weiteren Pfad.
- [ ] **Übersetzungsinfrastruktur** via `next-intl`:
  - Übersetzungs-Strings in `src/locales/{de,en}/common.json` etc.
  - Typsichere Hooks für `useTranslations()`
  - Lokalisierte Formatierung für Datum, Zahlen, Währung
- [ ] **Lokalisierter Content in Sanity**:
  - `blogPost`, `aboutPage`, `faqItem`: jeder Text-Field hat eine `language`-Property oder wir nutzen Sanity Localized Field Pattern (Array mit `_key: locale, value: ...`)
  - Queries berücksichtigen die aktive Sprache
- [ ] **Rechts-Texte**:
  - Aktuelle hardcoded-Seiten bleiben in Deutsch auf `/de/...`
  - Englische Version wird parallel erstellt, mit Hinweis "Verbindlich ist die deutsche Fassung" auf der EN-Seite
- [ ] **E-Mail-Templates**:
  - Bestätigungs-, Versand- und Bewertungs-Mail (aus PROJ-16) existieren pro Sprache
  - Supabase Auth Email Templates werden pro Sprache hinterlegt (Supabase unterstützt das nativ über `user.user_metadata.locale` + Locale-spezifische Templates)
- [ ] **SEO**:
  - `<link rel="alternate" hreflang="de" href="/de/...">` und `hreflang="en"` auf jeder Seite
  - `hreflang="x-default"` zeigt auf die Default-Sprach-Version
  - `sitemap.xml` listet alle Sprach-Versionen jedes Dokuments separat
- [ ] **Checkout** erkennt aktive Sprache und übergibt `locale` an Stripe (`'de'` / `'en'`).
- [ ] **Datenschutz / Cookie-Banner** in beiden Sprachen.
- [ ] **PROJ-14 Blog-Automat** wird erweitert: pro Topic kann die Zielsprache gesetzt werden; Prompt generiert entsprechend DE oder EN.

## Edge Cases
- User mit `Accept-Language: fr-FR` besucht die Seite, aber FR ist nicht aktiviert → Fallback auf EN statt DE (lingua-franca-Regel), erst bei weder FR noch EN dann DE.
- Ein Blog-Artikel existiert nur auf Deutsch, User ist auf `/en/` → Hinweis "Diesen Artikel gibt's noch nicht auf Englisch. Lies die deutsche Fassung." + Link.
- User hat ein gespeichertes Projekt mit deutschem Text und wechselt auf `/en/` → Projekt-Daten sind sprachunabhängig, nur UI-Rahmen ändert sich.
- Bewertungs-Texte (aus PROJ-16): User schreibt auf Deutsch, Betreiber will sie auch auf `/en/` zeigen → in V1 werden Bewertungen nur in der jeweiligen Sprache gezeigt, keine Auto-Übersetzung.

## Non-Goals
- Keine automatische Übersetzung per LLM im Live-Flow (kein On-the-fly "Translate This Page"-Button). Jede Sprache wird von Hand redigiert oder via Batch-LLM-Call im Content-Pflege-Workflow vorbereitet.
- Kein Geolocation-Redirect (Server-seitige Weiterleitung auf EN für IP aus UK) — respektieren stattdessen `Accept-Language`.
- Keine länderspezifischen Preise in V1 (EUR bleibt überall gleich).
- Keine Multi-Währung in V1.
- Keine separaten Domains (`.fr`, `.co.uk`) — Sub-Pfad-Struktur auf der `.com` bleibt.

## Technische Anforderungen
- **Library**: `next-intl` (First-Class Next.js App Router Support, Server + Client Components, Middleware für Locale-Detection)
- **Middleware**: Next.js Middleware erkennt Accept-Language und rewritet zu `/{locale}/...`
- **Sanity-Erweiterung**:
  - Alternative 1 (empfohlen): `i18n-schemas`-Plugin von Sanity mit `localeString`/`localeText` Field-Types
  - Alternative 2: separate Dokument pro Sprache mit Language-Ref
  - Entscheidung beim Architecture-Schritt
- **Transaktions-Mail-Templates** (`src/lib/email.ts`): Template-Objekte per Sprache, Sender-Name ggf. pro Sprache (z. B. `petite-moment` vs. `petite-moment shop`)
- **Datenmodell** `orders`:
  - Neues Feld `locale` (default `de`) — damit Bestätigungsmail in der Sprache gesendet wird, die der User beim Kauf nutzte
- **Blog-Automat** (PROJ-14): `blogTopic`-Schema erhält ein Feld `language` (`de`/`en`); Prompt wird je nach Sprache leicht unterschiedlich gesetzt.

## Migrations-Plan
1. `next-intl` installieren, Ordnerstruktur `src/locales/de/`, `src/locales/en/` anlegen.
2. Middleware + Routing-Präfixe einbauen, alle Seiten ins Präfix bringen (`/map` → `/de/map`, `/en/map`).
3. Alle hardcoded deutschen Strings in Komponenten nach JSON auslagern (vermutlich das größte Arbeitspaket: ~150–300 Strings).
4. Sanity-Schemas lokalisieren (nach Wahl beim Architecture-Schritt).
5. Bestehende Content-Einträge in Sanity bei Bedarf als DE markieren, EN-Versionen anlegen.
6. Hardcoded Legal-Seiten EN-Versionen erstellen.
7. E-Mail-Templates (Order-Bestätigung, Versand, Review) lokalisiert.
8. Supabase Email Templates pro Sprache (Confirm Signup, Reset Password, etc.).
9. SEO: hreflang-Tags, Sitemap-Anpassung, robots.txt bei Bedarf.
10. Smoke-Test beider Sprachen end-to-end (inklusive Checkout, Mail, Download-Link).

## Open Questions
- Sprach-Default: Deutsch (weil Basis-Markt) oder Englisch (weil international inkl. DE-Muttersprachler verstanden)? Einfachste Lösung: DE bleibt Default, `/` redirected auf `/de` außer bei Accept-Language en-*.
- Admin-UI (`/private/admin/...`) übersetzen oder nur Deutsch lassen? Ein-User-Bereich, kann Deutsch bleiben.
- Welche Sanity-Lokalisierungs-Strategie? Entscheidung im Architecture-Schritt.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

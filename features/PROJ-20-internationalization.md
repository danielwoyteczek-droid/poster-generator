# PROJ-20: Internationalisierung (i18n)

## Status: Approved
- Reality-Check 2026-05-03: Acceptance Criteria im Code abgedeckt, Status auf Approved gehoben.

**Created:** 2026-04-21
**Last Updated:** 2026-05-03

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

## Implementation Notes (Frontend — Phase 1A: Foundation only)

Dieser erste Schritt baut nur das Gerüst, KEINE Verschiebung von Pages und
KEINE Extraktion von Strings. Damit bleibt die App sofort lauffähig, und
die nachfolgenden Phasen können kontrolliert nachgeliefert werden.

- `next-intl ^4.9.1` installiert; `next.config.ts` über `createNextIntlPlugin('./src/i18n/request.ts')` gewrappt.
- Neue Module unter `src/i18n/`:
  - `config.ts` — definiert `locales = ['de','en']`, `defaultLocale = 'de'`,
    `localeNames`-Mapping. Single source of truth für künftige Sprach-Erweiterung.
  - `routing.ts` — `defineRouting` mit `localePrefix: 'always'` und
    `localeDetection: true` (Accept-Language).
  - `request.ts` — Server-Side-Loader, lädt `src/locales/<locale>.json` und
    fällt bei unbekanntem Locale auf Default zurück.
  - `navigation.ts` — exportiert die next-intl-Wrapper für `Link`, `redirect`,
    `usePathname`, `useRouter` (werden in Phase 1B beim Page-Move benutzt).
- Locale-JSONs unter `src/locales/de.json` und `src/locales/en.json` mit
  Starter-Strings für Common + Nav. Wird in Phase 2 schrittweise erweitert
  während Komponenten migriert werden.
- `src/components/LanguageSwitcher.tsx` — neue Komponente mit zwei Varianten
  (`compact` für Desktop, `full` für Mobile-Sheet). Erkennt aktiven Locale
  aus URL-Segment ODER `NEXT_LOCALE`-Cookie. Beim Wechsel:
  - Schreibt das Cookie (1 Jahr, root path)
  - Wenn URL bereits einen Sprach-Präfix hat → Pfad in-place tauschen
  - Sonst Reload (Cookie greift beim nächsten Server-Render)
- LandingNav bekommt den Switcher: kompakt im Desktop-Bar (vor Cart-Icon)
  und full-width im Mobile-Sheet (oberhalb der Login-Buttons).

**Was Phase 1A NICHT macht und in Phase 1B/2 folgt:**
- Pages aus `app/` nach `app/[locale]/` verschieben
- `NextIntlClientProvider` ins Root-Layout
- Middleware um Locale-Redirect (`/` → `/de`) erweitern
- Existierende `<Link>`-Pfade auf `next-intl/navigation` umstellen
- UI-Strings in Komponenten durch `useTranslations()`-Calls ersetzen

## Open Questions
- Sprach-Default: Deutsch (weil Basis-Markt) oder Englisch (weil international inkl. DE-Muttersprachler verstanden)? Einfachste Lösung: DE bleibt Default, `/` redirected auf `/de` außer bei Accept-Language en-*.
- Admin-UI (`/private/admin/...`) übersetzen oder nur Deutsch lassen? Ein-User-Bereich, kann Deutsch bleiben.
- Welche Sanity-Lokalisierungs-Strategie? Entscheidung im Architecture-Schritt.

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Geklärte Entscheidungen
- **Default-Sprache**: Deutsch. `/` redirected auf `/de`, außer der Browser
  meldet `Accept-Language: en-*` — dann auf `/en`.
- **Admin-UI** (`/private/admin/*`): bleibt auf Deutsch, einsprachig.
- **Sanity-Pattern**: Plugin `i18n-schemas` mit lokalisierten Feldern (ein
  Dokument pro Inhalt, je Feld eine Sprach-Variante).

### A) Routing-Struktur (URL-Layout)

```
Vorher (heute):
  /             → Landing
  /map          → Editor Stadt
  /star-map     → Editor Sterne
  /blog         → Blog-Liste
  /blog/[slug]  → Blog-Artikel
  /datenschutz  → Rechts-Texte
  /private/...  → Login-only Bereiche
  /private/admin/... → Admin-only Bereiche

Nachher:
  /                    → Server-Redirect auf /de (oder /en bei Accept-Language en-*)
  /de/                 → Landing DE
  /de/map              → Editor DE
  /de/blog/[slug]      → Blog DE
  /de/datenschutz      → Rechts-Texte DE
  /en/                 → Landing EN
  /en/map              → Editor EN
  /en/blog/[slug]      → Blog EN

  /private/...         → bleibt UNVERÄNDERT (kein Sprach-Präfix)
  /private/admin/...   → bleibt UNVERÄNDERT (Admin = nur DE)
  /api/...             → bleibt UNVERÄNDERT (technische Endpunkte)
```

Hinweis: Login-Seiten (`/login`, `/signup`) wandern unter Sprach-Präfix
(`/de/login` etc.), damit Login-Flow lokalisiert ist. Bestehende E-Mails
mit alten Reset-Links bleiben gültig durch Catch-All-Redirect.

### B) Komponenten-Struktur (Sprach-Wechsler)

```
LandingNav (bestehend)
+-- Logo
+-- Nav-Links (lokalisierte Labels)
+-- Sprach-Wechsler  (NEU)
|   +-- Dropdown-Button "DE ▾"
|   +-- Optionen: Deutsch (DE) | English (EN)
|   +-- Klick wechselt nur das Sprach-Präfix, der weitere Pfad bleibt
+-- User-Avatar / Login-Button

Mobile-Menü (Sheet)
+-- Nav-Links
+-- Sprach-Wechsler (gleicher Mechanismus, größer dargestellt)
+-- Login / User
```

### C) Datenmodell-Erweiterungen (was sich in DB / Sanity ändert)

```
Sanity-Schemas (Blog, About, FAQ):
- Vorher:  title (string), body (PortableText), excerpt (string), slug (slug)
- Nachher: alle Text-Felder werden zu  localeString  oder  localeText
           Sanity-Studio zeigt Tabs "DE" / "EN" pro Feld
           Frontend-Query filtert je nach aktiver Sprache

Bestellungen (orders) — neue Spalte:
- locale: TEXT, default 'de', Werte 'de' | 'en'
  → Bestätigungs-Mail wird in dieser Sprache verschickt

User-Profile (profiles) — neue Spalte:
- preferred_locale: TEXT, optional
  → wird beim Anmelden gesetzt (aus aktiver Browser-Sprache)
  → Auth-Mails (Passwort-Reset etc.) folgen dieser Präferenz
```

### D) Tech-Entscheidungen (Warum so)

- **`next-intl` als Library**: einzige aktiv gepflegte Lösung mit nativem
  Next.js 15/16 App-Router-Support, Server- und Client-Components, Locale
  in Middleware, typensichere Translation-Hooks. Alternativen
  (`react-i18next`, `next-i18next`) hinken bei App-Router-Support hinterher.
- **URL-Präfix statt Subdomain**: spart das Setup zweier separater
  Vercel-Deployments, behält gemeinsame Auth-Cookies, vereinfacht den
  Sprach-Wechsler (nur Pfad-Manipulation), und ein einziges SSL-Zertifikat
  reicht. SEO-mäßig sind beide gleichwertig wenn `hreflang` korrekt sitzt.
- **DE als Default mit Accept-Language-Override**: schützt unsere
  bestehenden DE-Nutzer vor unerwarteten Spracheinträgen, gibt aber
  englischen Browsern direkt die EN-Version. Ohne Geo-IP, weil viele
  EU-User VPNs nutzen und das nervig wäre.
- **Plugin `i18n-schemas` (Sanity)**: ein Dokument pro Inhalt, alle
  Sprachen drin. Editor sieht "DE" und "EN" Tabs pro Textfeld. Kein
  Dokumenten-Duplizieren, keine vergessenen Übersetzungen, Bilder/Datum
  bleiben einmal gepflegt. Bei späterer FR/NL/IT-Erweiterung einfach
  Sprache aktivieren — bestehende Inhalte sind sofort bereit für die neue
  Sprache (mit leeren Feldern).
- **Admin auf Deutsch lassen**: einsamer User-Bereich, keine
  Übersetzungs-Pflege rentiert sich, vermeidet 100+ zusätzliche Strings.
- **`locale` in `orders`**: Mail-Versand passiert oft Stunden/Tage später
  (Versand-Mail, Bewertungs-Mail). Ohne gespeichertes Locale wüssten wir
  nicht mehr in welcher Sprache der Kunde gekauft hat.

### E) Migrations-Phasen (Wie wir hin kommen)

```
Phase 1: Routing-Skelett (1–2 Tage)
- next-intl installieren + konfigurieren
- Middleware: Accept-Language-Detection, Redirect / → /de oder /en
- Alle bestehenden Pages unter [locale]/ verschieben (route group)
- Übersetzungs-JSONs anlegen mit Schlüssel-Keys, leeren EN-Werten als TODO
- Sprach-Wechsler in LandingNav

Phase 2: UI-Strings extrahieren (das größte Paket, ~1 Woche)
- Komponente für Komponente alle hardcoded deutschen Strings durch
  useTranslations()-Calls ersetzen
- Englische Werte direkt mitübersetzen (LLM-Vorlage + manuelles Review)
- Lokalisierte Datums-/Zahlen-Formate (Editor-Datum, Preise, Koordinaten)

Phase 3: Sanity-Schemas migrieren (1–2 Tage)
- i18n-schemas-Plugin in Sanity-Studio aktivieren
- Schema-Updates: Felder zu localeString/localeText
- Bestehende DE-Inhalte werden automatisch unter dem 'de'-Tab landen
- Frontend-Queries auf aktive Sprache filtern

Phase 4: Rechts-Texte EN (1 Tag)
- Impressum, Datenschutz, AGB, Widerrufsbelehrung, Cookie-Richtlinie
- Hinweis-Banner auf EN-Versionen: "Verbindlich ist die deutsche Fassung"

Phase 5: E-Mail-Templates (1 Tag)
- Bestätigungs-, Versand-, Bewertungs-Mail je Sprache
- Supabase-Auth-Mails (Confirm, Reset) in EN hinterlegen
- order.locale beim Anlegen aus aktiver Sprache übernehmen

Phase 6: SEO + Sitemap (halber Tag)
- hreflang-Tags in <head> jeder Seite
- sitemap.xml listet jede URL pro Sprache mit hreflang-Querverweisen
- robots.txt unverändert

Phase 7: Stripe Checkout-Locale + Cookie-Banner (halber Tag)
- locale-Parameter an Stripe übergeben
- Cookie-Banner-Text je Sprache, Default-Pfade unverändert

Phase 8: Smoke-Test + Bugs (1 Tag)
- Beide Sprachen Komplett-Durchlauf: Landing → Editor → Checkout → Mail
- hreflang in Google Search Console testen
- Bestehende Cookies/Session bleiben über Sprachwechsel hin erhalten
```

### F) Dependencies (neue Packages)

- `next-intl` — i18n-Library für Next.js App Router
- `@sanity/i18n-schemas` (oder gleichwertiger Plugin-Code) — lokalisierte
  Feldtypen in Sanity Studio
- Sonst keine neuen Runtime-Pakete; vorhandenes Stripe-SDK akzeptiert
  `locale` Parameter direkt.

### G) Abhängigkeiten zwischen Phasen

```
Phase 1 (Routing)        →  unabhängig, kann sofort starten
Phase 2 (UI-Strings)     →  baut auf Phase 1 (next-intl muss laufen)
Phase 3 (Sanity)         →  unabhängig, kann parallel laufen
Phase 4 (Rechts-Texte)   →  parallel zu Phase 2 möglich
Phase 5 (E-Mails)        →  unabhängig, idealerweise nach Phase 1
Phase 6 (SEO)            →  Ende, nachdem alle Routen lokalisiert sind
Phase 7 (Stripe/Cookie)  →  Ende, kurz vor Smoke-Test
Phase 8 (Smoke-Test)     →  letzter Schritt
```

### H) Gegenstände, die NICHT diesem Spec gehören (Abgrenzung)

- Mehr Sprachen als DE+EN — kommen erst in V1.1+
- Multi-Währung / länderspezifische Preise
- Auto-Translate-Buttons im Live-Flow
- Geo-IP-Redirect
- Country-spezifische Domains (`.fr`, `.co.uk`)
- Übersetzung der Map-Labels in Editor — wird über die MapTiler SDK
  `language: Language.AUTO` Einstellung bereits abgedeckt (PROJ-15)

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

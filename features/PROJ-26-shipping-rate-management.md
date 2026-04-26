# PROJ-26: Versandkosten-Management

## Status: Architected
**Created:** 2026-04-26
**Last Updated:** 2026-04-26

## Dependencies
- **Requires PROJ-6** (Stripe-Bezahlsystem) — Versandtarife werden an die Stripe-Checkout-Session als `shipping_options` übergeben
- **Requires PROJ-4** (Auth) — Admin-Tarif-Pflege ist Admin-only
- **Folgt PROJ-22-Pattern** (Admin-Paletten-Verwaltung) — gleiche CRUD-Architektur (Tabelle, Status draft/published, Admin-Liste, Public-Read-API)
- **Berührt PROJ-23** (Design-System) — die Marketing-Aussage "Kostenloser Versand ab X €" auf Hero/Homepage darf nicht von der tatsächlichen Tarif-Konfiguration abweichen

## Problem & Ziel
PROJ-6 hat in V1 die Lieferländer auf DACH beschränkt mit der impliziten Annahme einer einzelnen Versandkosten-Pauschale. Sobald petite-moment in EU-weiten Märkten verkauft (Frankreich, Italien, Skandinavien …), funktioniert das nicht mehr — Versandkosten variieren stark:
- DE/AT/CH ≈ 5–8 €
- FR/IT/BeNeLux ≈ 10–14 €
- Skandinavien/UK ≈ 15–20 €

Zusätzlich hängen die Kosten **vom Cart-Inhalt** ab:
- Digitaler Download: kein Versand
- A4-Poster ≠ A2-Bilderrahmen (unterschiedliches Gewicht/Volumen)

PROJ-26 baut die Versandkosten-Verwaltung als **konfigurierbare Tarif-Matrix** (Land × Produkt × Format) mit Admin-UI auf. Die Tarife fließen dynamisch in die Stripe-Checkout-Session, basierend auf Lieferland und Cart-Inhalt.

## User Stories

### End-Kunde
- Als Kunde will ich beim Hinzufügen eines physischen Produkts in den Warenkorb eine **Versandkosten-Schätzung basierend auf meiner Locale** sehen (FR-Locale → FR-Tarif vorausgewählt), damit ich die Gesamtkosten kenne, bevor ich zum Checkout gehe.
- Als Kunde, der nur **digitale Downloads** im Warenkorb hat, will ich keine Versandkosten angerechnet bekommen.
- Als Kunde, der den **Free-Shipping-Threshold erreicht** ("ab 49 € kostenlos in DE"), will ich das im Cart sehen, mit einem Hinweis "Noch X € bis kostenfreier Versand", solange ich darunter liege.
- Als Kunde will ich beim Stripe-Checkout den **finalen Versandbetrag** für mein konkretes Lieferland sehen, basierend auf der eingegebenen Adresse.

### Admin
- Als Admin will ich Versandtarife pro Land × Produkt × Format **im Admin-Backend pflegen**, ohne dass ein Code-Deploy nötig ist (Konfig-Tabelle in Supabase + Admin-CRUD-UI).
- Als Admin will ich pro Land eine **Free-Shipping-Schwelle** setzen können (z. B. DE = 49 €, AT = 79 €, FR = keine Schwelle).
- Als Admin will ich **Tarife im Status `draft` anlegen** und gezielt veröffentlichen (`published`), damit Test-Tarife nicht versehentlich live im Checkout greifen — analog zu PROJ-22 (Map-Paletten).
- Als Admin will ich **Bulk-Aktionen** (z. B. "alle FR-Tarife um 10% erhöhen", "neue Länder als Kopie eines bestehenden Tarif-Sets anlegen"), damit ich nicht jeden Tarif einzeln klicken muss.

### Marketing
- Als Marketing-Verantwortliche/r will ich, dass die Aussage **"Kostenloser Versand ab X €"** auf Homepage/Hero/Beispiel-Sektionen automatisch zur Default-Locale-Schwelle passt — wenn DE auf 49 € gesetzt ist, soll der DE-Hero "ab 49 €" anzeigen.

## Acceptance Criteria

### Datenmodell
- [ ] Neue Supabase-Tabelle `shipping_rates`:
  - `id` (uuid, PK)
  - `country_code` (text, ISO-3166-2, z. B. 'DE', 'FR'; CHECK against allowed list)
  - `product_type` (text, CHECK in `('poster','frame')` — `download` ist explizit ausgeschlossen, da kein Versand)
  - `format` (text, CHECK in `('a4','a3','a2')`)
  - `price_cents` (integer, > 0)
  - `status` (text, CHECK in `('draft','published')`, default `'draft'`)
  - `display_order` (integer, optional für Sortierung in Admin-UI)
  - `created_at`, `updated_at`, `published_at`
  - Unique-Constraint auf `(country_code, product_type, format, status='published')` — pro Land/Produkt/Format darf maximal **ein** veröffentlichter Tarif existieren
- [ ] Neue Supabase-Tabelle `shipping_thresholds`:
  - `country_code` (text, PK)
  - `free_shipping_threshold_cents` (integer, nullable — null = keine Schwelle für dieses Land)
  - `updated_at`
- [ ] RLS: anon + authenticated dürfen nur `status='published'` lesen; Schreibzugriff nur über Service-Role-API (admin-gated)
- [ ] GIN- bzw. B-Tree-Index auf `country_code` und auf `(country_code, status)` für schnelle Lookup

### Berechnungs-Logik (im Cart und Checkout)
- [ ] Funktion `calculateShipping(cart, countryCode)` liefert Brutto-Versandbetrag in Cents:
  - Filtert digitale Items raus (kein Versand-Beitrag)
  - Pro physisches Item den Tarif `(country_code, product_type, format)` aus DB lesen
  - **Versandkosten-Kombinationsregel V1**: Höchster Item-Tarif gewinnt (es wird in EINER Sendung verschickt; der Logistikpreis richtet sich nach dem schwersten/größten Item). Bei mehrfacher gleicher Position (z. B. 2× A2-Bilderrahmen) zählt der Tarif trotzdem nur einmal — Annahme: ein Karton fasst mehrere Poster.
  - Cart-Total-Wert (alle physischen Items, vor Versand) wird gegen `free_shipping_threshold_cents[country]` geprüft. Wenn überschritten → Versandkosten = 0.
- [ ] Wenn für `(country_code, product_type, format)` **kein Tarif published** ist → Bestellung in dieses Land/Format ist im Frontend deaktiviert ("Lieferung in dieses Land aktuell nicht möglich"). Kein stiller 0-€-Versand.

### Public-API
- [ ] `GET /api/shipping-rates?country=XX` (öffentlich, gecached 60s edge / 300s s-maxage) liefert alle veröffentlichten Tarife für ein Land plus die Free-Shipping-Schwelle. Nutzt der Cart für Schätzungen.
- [ ] `POST /api/shipping/calculate` (öffentlich) — Body `{ items, countryCode }` → returns `{ subtotal_cents, shipping_cents, free_threshold_remaining_cents | null }`. Nutzt Cart und Checkout-Vorbereitung.

### Admin-API + UI
- [ ] CRUD-Routen `GET/POST /api/admin/shipping-rates` + `GET/PATCH/DELETE /api/admin/shipping-rates/[id]` (admin-gated, gleiches Pattern wie `/api/admin/palettes`)
- [ ] CRUD-Routen `GET/PUT /api/admin/shipping-thresholds/[country]` (admin-gated)
- [ ] Admin-Listen-View `/private/admin/shipping/`: Matrix-Ansicht (Zeilen = Länder, Spalten = Produkt/Format-Kombinationen, Zellen = Tarif), inkl. Filter nach Land/Status
- [ ] Pro Tarif-Zeile: Inline-Edit für `price_cents`, Status-Toggle (draft↔published), Delete
- [ ] **"Tarif-Set aus Land kopieren"-Aktion**: Öffnet Modal mit Land-Auswahl als Quelle, kopiert alle Tarife (drafts) ins Ziel-Land — wichtig für schnelles Onboarding neuer Länder
- [ ] **Bulk-Edit**: Selektion mehrerer Tarife + Aktion "Preis um X% erhöhen / um X € erhöhen / setzen auf Y €"
- [ ] Free-Shipping-Threshold-Sektion: pro Land einfaches Eingabefeld + Speichern

### Stripe-Integration
- [ ] `POST /api/checkout/create` ergänzt: bei physischen Items wird `shipping_options` an `stripe.checkout.sessions.create` übergeben mit dem berechneten Versandbetrag, Label = "Standardversand ({country})", display-Name auf Locale des Users.
- [ ] **Free-Shipping-Fall**: `shipping_options.shipping_rate_data.fixed_amount.amount = 0`, Label = "Kostenlos ab {threshold} € — danke!"
- [ ] Webhook `checkout.session.completed` schreibt den tatsächlichen `shipping_total` aus der Stripe-Session in `orders.shipping_cents` (neue Spalte).

### Cart-UI
- [ ] Cart-Komponente zeigt Versandkosten-Schätzung basierend auf User-Locale (z. B. FR-Locale → FR-Tarife). Format: Subtotal, Versand, Total.
- [ ] **Free-Shipping-Hinweis**: Wenn der Cart-Subtotal < Threshold ist und ein Threshold existiert, zeige "Noch X € bis kostenfreier Versand". Wenn überschritten: "✓ Kostenfreier Versand".
- [ ] Mischwarenkorb (digital + physisch): Versandzeile zeigt "0 € auf digitale Downloads" als Hinweis-Text, der Versandbetrag bezieht sich nur auf die physischen Items.
- [ ] **Land-Wechsel im Cart**: optionaler Country-Dropdown ("Lieferung nach: DE ▾") für User, deren Locale-Land vom Lieferland abweicht. Aktualisiert die Schätzung sofort.

### Marketing-/Hero-Konsistenz
- [ ] Die Marketing-Aussage "Kostenloser Versand ab X €" auf Hero / Beispiel-Sektion / Pricing-Sektion wird **dynamisch** aus `shipping_thresholds[currentLocale]` gelesen, nicht hartkodiert. Bei nicht definiertem Threshold für die Locale → Aussage wird ausgeblendet (kein falsches Versprechen).

## Edge Cases
- **Cart enthält Items für mehrere Länder/Lieferadressen** (z. B. zukünftiges Geschenk-Versand an mehrere Adressen): V1 unterstützt nur eine Adresse pro Bestellung; Versand wird gegen diese Adresse berechnet.
- **Admin löscht einen veröffentlichten Tarif, während Bestellungen offen sind**: Bestehende Bestellungen behalten ihren ursprünglich kalkulierten `shipping_cents` (ist in Order-Snapshot festgeschrieben). Neue Bestellungen ins gleiche Land/Format werden ohne diesen Tarif berechnet → fallen ggf. raus. UI-Warnung beim Löschen: "Dieser Tarif wird aktuell von X aktiven Tarif-Konfigurationen genutzt."
- **Free-Shipping-Schwelle wird nach Cart-Hinzufügen aber vor Checkout vom Admin geändert**: Cart zeigt evtl. veralteten Hinweis bis zum nächsten Refresh; Stripe-Checkout nimmt den live-aktuellen Wert. Akzeptabel (Race-Condition unwahrscheinlich).
- **Kunde wechselt im Stripe-Checkout das Lieferland**: Stripe ruft via `shipping_options` (server-rendered) den neuen Betrag auf — V1 nutzt statische `shipping_options` pro Session, daher müsste der Kunde zurück zum Cart und ein neues Land wählen. Dynamische Re-Berechnung im Stripe-Checkout ist eine Verbesserung für V2 (Stripe-Calculated-Shipping-API).
- **Tarif-Inkonsistenz: Tarif für DE+poster+a4 = published, Schwelle für DE = 49 €, Cart hat 60 €** → Versand = 0 €, Bestätigung "Kostenfreier Versand erreicht".
- **Land hat Tarife aber keinen Threshold**: Kein Free-Shipping-Hinweis im Cart, Versand wird immer berechnet. Korrekt.
- **Land hat einen Threshold von 0 (komplett kostenlos)**: Wird unterstützt; jeder Versand in dieses Land = 0 €.
- **Performance bei Cart-Land-Wechsel**: Lookup pro Item (bei vielen Items langsamer). → API gibt alle published Tarife für ein Land in einem Call, Client cached lokal.

## Non-Goals
- **Keine Versanddienstleister-API-Anbindung** (DHL, DPD, Hermes für Label-Generation oder Tracking-Auto-Pflege). Tracking-Number-Pflege bleibt manuell in PROJ-10 (Admin-Bestellverwaltung).
- **Keine Stripe-Calculated-Shipping** (dynamische Re-Berechnung im Stripe-Checkout bei Adressänderung). V1 nutzt statische `shipping_options`. V2-Erweiterung möglich.
- **Keine Steuer-/Zoll-Logik** (z. B. unterschiedliche MwSt-Sätze EU vs. UK, Zollabwicklung Schweiz). MwSt bleibt auf Stripe Tax delegiert (sofern aktiviert), Zollthemen außerhalb V1.
- **Keine Express-Versandmethode**. V1 nur Standard. Datenmodell ließe sich später um `shipping_method` erweitern.
- **Keine Volumen-/Gewichts-Klassifizierung**. Tarif kommt direkt aus `(country, product_type, format)`. Wenn später Tariflogik komplexer wird, kann eine `weight_class` ergänzt werden.
- **Keine Geschenk-Versand-Kombinationen** (mehrere Adressen pro Bestellung).
- **Keine Promo-Codes** für kostenlosen Versand. Das ist Marketing/Coupons-Thema (eigenes späteres Feature).

## Decisions (vor Architecture festgelegt)
- **Länder-Scope V1**: EU-weit (nicht nur DACH). Konkrete Länderliste = alle EU-27-Mitgliedsstaaten plus CH, UK, NO. Gilt im `shipping_address_collection.allowed_countries` der Stripe-Checkout-Session und als CHECK-Allowlist auf `shipping_rates.country_code`. (Zoll-/MwSt-Sonderfälle CH/UK/NO werden in V1 nicht gesondert behandelt — Stripe Tax übernimmt.)
- **Versandkosten-Kombinationsregel V1**: "Höchster Item-Tarif gewinnt" — eine Sendung, der Tarif richtet sich nach dem schwersten/größten Item; mehrfache gleiche Position teilt sich diesen einen Tarif. Wenn die Praxis später zeigt, dass mehrere große Bilderrahmen tatsächlich mehrere Pakete bedeuten, kann die Regel in V2 verfeinert werden (z. B. additiv mit Mengenrabatt).

## Open Questions
_Aktuell keine offenen Fragen — alle architekturrelevanten Entscheidungen sind unter "Decisions" festgehalten. Reihenfolge mit PROJ-6 V1.1: PROJ-26 wird **vor** PROJ-6 V1.1 implementiert, damit die Adress-Erfassung-Erweiterung das fertige Tarif-System nutzen kann (kein Bestandstarif-Backfill nötig)._

## Technical Requirements
- **Performance**: `GET /api/shipping-rates?country=XX` < 100 ms, `POST /api/shipping/calculate` < 200 ms (auch bei 10+ Cart-Items)
- **Caching**: Public-API ist edge-cacheable; Admin-Änderungen invalidieren via Cache-Tag
- **Datenkonsistenz**: Unique-Constraint auf (country_code, product_type, format) bei published-Status — verhindert konkurrierende veröffentlichte Tarife
- **i18n**: Stripe-Checkout-Versand-Label wird in Locale des Users angezeigt (`Standardversand` / `Standard shipping` / `Livraison standard` / `Spedizione standard` / `Envío estándar`)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### A) Gesamtablauf (4-Phasen-Rollout)

```
Phase 1: Datenbank-Schema + Berechnungs-Lib (Backend, unsichtbar)
   +-- Migration: shipping_rates + shipping_thresholds Tabellen + RLS + Indexe
   +-- Migration: orders.shipping_cents Spalte (default 0)
   +-- Lib: calculateShipping(items, country) — pure Funktion, testbar
   +-- Public-API: GET /api/shipping-rates?country=XX
   +-- Public-API: POST /api/shipping/calculate
             |
             v

Phase 2: Admin-CRUD (UI + API)
   +-- Admin-API: /api/admin/shipping-rates (CRUD), /api/admin/shipping-thresholds
   +-- Admin-UI: /private/admin/shipping/ — Länder-Detail-Ansicht
   +-- Bulk-Aktionen: "Tarif-Set kopieren von X", "%-Aufschlag auf Selektion"
   +-- Marketing legt erste Tarife an (mind. DE als Smoke-Test)
             |
             v

Phase 3: Stripe-Integration (Checkout-Flow)
   +-- POST /api/checkout/create erweitert: shipping_options dynamisch generieren
   +-- Webhook checkout.session.completed: orders.shipping_cents schreiben
   +-- Country-Allowlist für shipping_address_collection.allowed_countries
   +-- Damit ist PROJ-26 für Stripe-Checkout funktional einsatzbereit
             |
             v

Phase 4: Cart-UI + Marketing-Konsistenz (Frontend)
   +-- Cart zeigt Versandkosten-Schätzung (Locale-basiert)
   +-- Free-Shipping-Hinweis "Noch X € bis kostenfreier Versand"
   +-- Optionaler Country-Dropdown im Cart
   +-- Hero/Pricing-Sektionen lesen Threshold dynamisch aus DB statt hardcoded
```

**Wichtige Reihenfolge-Regel:** Phase 3 darf erst deployen, **nachdem Phase 2 mindestens für DACH-Länder published Tarife hat**. Sonst würden Stripe-Sessions ohne `shipping_options` erstellt, der Checkout wäre kostenlos. Phase 2 enthält ein Verifikations-Script: "Mindestens DE muss published sein", das Phase 3 als Pre-Deploy-Check nutzt.

### B) Komponenten-Struktur

```
poster-generator
│
├── supabase/migrations/
│   ├── create_shipping_rates              ← NEU: Tabelle + RLS + Indexe
│   ├── create_shipping_thresholds         ← NEU: Tabelle + RLS
│   └── add_shipping_cents_to_orders       ← NEU: Spalte mit default 0
│
├── src/lib/
│   ├── shipping-countries.ts              ← NEU: ISO-Liste EU-27 + CH/UK/NO als TS-Const
│   └── shipping-calculation.ts            ← NEU: pure Funktion calculateShipping(items, country)
│
├── src/app/api/
│   ├── shipping-rates/route.ts            ← NEU: GET ?country=XX (öffentlich, gecached)
│   ├── shipping/
│   │   └── calculate/route.ts             ← NEU: POST { items, countryCode }
│   ├── admin/shipping-rates/
│   │   ├── route.ts                       ← NEU: GET (Liste), POST (Create)
│   │   └── [id]/route.ts                  ← NEU: GET/PATCH/DELETE
│   ├── admin/shipping-rates/bulk/route.ts ← NEU: Bulk-Update (Set/Add/Percent)
│   ├── admin/shipping-rates/copy-from-country/route.ts ← NEU: Tarif-Set kopieren
│   ├── admin/shipping-thresholds/[country]/route.ts    ← NEU: GET/PUT
│   └── checkout/create/route.ts           ← MODIFIZIERT: shipping_options dynamisch
│
├── src/app/private/admin/shipping/
│   └── page.tsx                           ← NEU: Länder-Detail-Ansicht (Master-Detail)
│
├── src/components/admin/shipping/
│   ├── CountryList.tsx                    ← NEU: Linke Liste, Status-Indikator
│   ├── CountryRatesPanel.tsx              ← NEU: Rechtes Detail-Panel
│   ├── ShippingRateInput.tsx              ← NEU: Inline-Edit eines Preises
│   ├── ThresholdInput.tsx                 ← NEU: Inline-Edit der Free-Shipping-Schwelle
│   ├── CopyFromCountryDialog.tsx          ← NEU: Modal "von welchem Land kopieren"
│   └── BulkPriceAdjustDialog.tsx          ← NEU: Modal "%-Aufschlag auf Selektion"
│
├── src/components/cart/
│   └── ShippingEstimate.tsx               ← NEU: Versandkosten-Block im Cart, mit Threshold-Hinweis
│
├── src/components/landing/
│   ├── HeroSection.tsx                    ← MODIFIZIERT: Free-Shipping-Aussage dynamisch
│   └── PricingSection.tsx                 ← MODIFIZIERT: Free-Shipping-Aussage dynamisch
│
└── src/hooks/
    └── useShippingRates.ts                ← NEU: client-seitiger Cache + Country-Resolver
```

### C) Datenmodell

**Zwei getrennte Tabellen** (Empfehlung) statt einer kombinierten — die Kardinalitäten sind unterschiedlich (~180 Tarife vs. ~30 Thresholds), und die Pflege-Frequenz auch (Tarife öfter, Thresholds selten).

**Tabelle `shipping_rates`:**
- `id` (UUID, Primärschlüssel)
- `country_code` (ISO-3166-2 Text, CHECK gegen die EU-27+CH/UK/NO-Liste aus `src/lib/shipping-countries.ts`)
- `product_type` (Text, CHECK in `'poster' | 'frame'` — `'download'` ist explizit ausgeschlossen, da kein Versand)
- `format` (Text, CHECK in `'a4' | 'a3' | 'a2'`)
- `price_cents` (Integer, > 0)
- `status` (Text, CHECK in `'draft' | 'published'`, default `'draft'`)
- `created_at`, `updated_at`, `published_at` (Timestamps)
- **Unique-Constraint** auf `(country_code, product_type, format)` für `status='published'` — pro Kombination max. ein veröffentlichter Tarif

**Tabelle `shipping_thresholds`:**
- `country_code` (Text, Primärschlüssel)
- `free_shipping_threshold_cents` (Integer, nullable — null = keine Schwelle)
- `updated_at`

**Erweiterung `orders` (existing Tabelle):**
- Neue Spalte `shipping_cents` (Integer, nullable, default 0) — wird vom Stripe-Webhook geschrieben

**Indexe:**
- B-Tree auf `shipping_rates.country_code` (Single-Column-Lookup)
- Composite Index auf `(country_code, status)` für die häufige "alle published Tarife für Land X"-Abfrage
- `shipping_thresholds` braucht keinen Extra-Index (PK = country_code)

**RLS-Policies:**
- `shipping_rates`: anon + authenticated dürfen nur `status='published'` lesen; Schreibzugriffe ausschließlich Service-Role (admin-API)
- `shipping_thresholds`: anon + authenticated dürfen alles lesen; Schreibzugriffe Service-Role
- Pattern identisch zu `map_palettes` (PROJ-22)

**Wo gespeichert:**
- Versandtarife + Thresholds: **Supabase Postgres**
- Echte Versandkosten pro Bestellung: **`orders.shipping_cents`**, gefüllt vom Stripe-Webhook
- Cart-Schätzung: berechnet beim Cart-Render, nicht persistiert (immer live aus aktuellen Tarifen)

### D) Tech-Entscheidungen (mit Begründung)

| Entscheidung | Begründung |
|--------------|-----------|
| **Zwei Tabellen statt einer** (rates + thresholds) | Unterschiedliche Kardinalität (~180 vs. ~30) und unterschiedliche Pflege-Frequenz. Eine kombinierte Tabelle würde redundante Threshold-Werte pro Tarif speichern oder Sonderzeilen pro Land brauchen — beides hässlich. |
| **Country-Allowlist als TS-Const** (`src/lib/shipping-countries.ts`) | Single Source of Truth für die unterstützte Länderliste. Wird in DB-CHECK-Constraint verwendet (per Migration), in Zod-Validierung der API, und vom Stripe-Checkout. Kein Sync-Problem, weil zur Build-Zeit eingebunden. |
| **Country-Allowlist für Stripe wird dynamisch aus DB-Tarifen berechnet** (= alle Länder mit mind. einem published Tarif), nicht aus der TS-Const | Trennt "potentiell unterstützt" (TS-Const) von "operativ verfügbar" (DB-Tarife). Marketing kann ein Land "vorbereiten" (Tarife als Draft anlegen) ohne dass Bestellungen reinkommen. |
| **Berechnungs-Logik als pure Funktion** (`calculateShipping`) ohne DB-Zugriff | Testbar in Unit-Tests, deterministisch, trivial zu cachen. Caller laden die Tarife einmal, übergeben sie der Funktion. |
| **"Höchster Tarif gewinnt"-Regel als V1** | User-Decision. Verhindert die "10× A4-Poster zahlen 10× Versand"-Falle, die für Boutique-Volumen unrealistisch wäre. Wenn Praxis das wiederlegt → V2-Regel. |
| **Stripe `shipping_options` statisch pro Session** (V1) | Stripe-Calculated-Shipping (dynamische Re-Berechnung bei Adressänderung) ist eine fortgeschrittene Stripe-Funktion mit eigener Konfiguration. V1 generiert die Optionen einmal beim Session-Create basierend auf dem Cart-Land; bei Land-Wechsel im Stripe-Checkout muss der Kunde zurück zum Cart. Akzeptabel für V1, V2-Verbesserung möglich. |
| **Admin-UI: Länder-Detail-Ansicht** (User-Entscheidung) | Master-Detail-Pattern skaliert auch bei 30+ Ländern und 6 Tarifen pro Land übersichtlich. Linke Liste zeigt Status auf einen Blick (welche Länder sind komplett vs. lückenhaft), rechtes Panel ist fokussiertes Editing. |
| **Bulk-Tools als Phase-2-Add-Ons** (Copy-from-Country, %-Adjust) | Nicht-blockierend für V1 — Marketing kann anfangs jeden Tarif einzeln pflegen. Sobald >5 Länder gepflegt, sparen Bulk-Tools spürbar Zeit. |
| **Free-Shipping-Aussage auf Hero/Pricing dynamisch** | User-Anforderung. Vermeidet Marketing-Versprechen-vs.-Realität-Mismatch. Klein, aber wichtig für Vertrauen. |

### E) Kritische Berechnungs-Details

**`calculateShipping(items, country)` Pseudo-Logik** (zur Klärung, kein Code):

1. Filter Items: nur die mit `product_type ∈ {'poster','frame'}` zählen für Versand
2. Wenn keine physischen Items → return `{ subtotal: 0, shipping: 0, threshold_remaining: null }`
3. Tarife für `country` aus DB laden (alle published, alle Produkt/Format-Kombis)
4. Pro physisches Item den passenden Tarif suchen (`country × product_type × format`)
   - Wenn Tarif fehlt für eine Kombi → Bestellung in dieses Land aktuell nicht möglich, return `{ unavailable: true, reason: 'no_rate_for_X' }`
5. **Höchster Item-Tarif gewinnt**: `shipping = max(rates_per_item)`
6. Threshold für `country` laden
7. Wenn `subtotal_physical >= threshold` → `shipping = 0`, `reason = 'free_shipping_threshold'`
8. Return `{ subtotal_physical, shipping, threshold, threshold_remaining }`

**Performance:** Ein Country-Lookup zieht ~6 Tarife (2 Produkte × 3 Formate); selbst bei 20-Item-Cart ist das in <10 ms machbar. Kein Caching nötig auf Server-Seite, Edge-Cache für Public-API ausreichend.

### F) Stripe-`shipping_options`-Generierung (Phase 3)

Beim `POST /api/checkout/create`:

1. Cart-Inhalt + ausgewähltes Land kommen aus dem Request
2. `calculateShipping(cart, country)` → `{ shipping_cents }`
3. Stripe-Session-Konfig:
   - `shipping_address_collection.allowed_countries` = alle Länder mit mind. einem published Tarif (Liste aus `getSupportedCountries()`)
   - `shipping_options` = ein Eintrag mit:
     - Display-Name lokalisiert (z. B. "Standardversand" / "Standard shipping" / "Livraison standard")
     - `fixed_amount.amount = shipping_cents`, `currency = 'eur'`
     - Optional Estimated-Delivery-Days (kann später ergänzt werden)

**Edge-Case:** Wenn `shipping_cents = 0` (Threshold erreicht), Display-Name wird "Kostenfrei (ab X € Bestellwert)" — visuelles Highlight.

### G) Migrations-Strategie

**Schritt 1 (Phase 1): DB-Migration**
- `shipping_rates` und `shipping_thresholds` werden leer angelegt
- `orders.shipping_cents` Spalte mit default `0` — alle bestehenden Bestellungen bleiben gültig (alte Werte = 0, was historisch stimmt: PROJ-6 V1 hatte keine separat berechneten Versandkosten, alles war im Produktpreis enthalten)
- Keine Backfill-Daten nötig

**Schritt 2 (Phase 2): Marketing pflegt erste Tarife**
- Mindestens DE als Pilot, dann AT/CH, dann EU-Erweiterung
- Vor Phase 3-Deploy: Verifikations-Script prüft "DE muss published sein" — sonst Build-Fail

**Schritt 3 (Phase 3): Stripe-Integration scharfschalten**
- `POST /api/checkout/create` nutzt jetzt das echte Tarif-System
- Stripe-Sessions vor Phase-3-Deploy bleiben ohne `shipping_options` (existing behavior)
- Stripe-Sessions ab Phase-3-Deploy haben `shipping_options` aus Tarif-Berechnung

**Schritt 4 (Phase 4): Cart + Marketing-Komponenten**
- Cart zeigt Schätzung
- Hero/Pricing lesen Threshold dynamisch
- Kann in beliebiger Reihenfolge nach Phase 3 ausgerollt werden

### H) Abhängige Packages

**Keine neuen Dependencies.** Alles nutzt Installiertes:
- `@supabase/supabase-js` — DB-Zugriff
- `stripe` — Checkout-Session-Erstellung
- `zod` — API-Body-Validierung
- `next-intl` — Locale für Cart-Anzeige + Stripe-Display-Names
- shadcn/ui Components — Admin-UI (Card, Dialog, Input, Button, Select)

### I) Risiken / Offene Punkte

- **Stripe-Tax-Konfiguration**: PROJ-26 geht davon aus, dass MwSt. via Stripe Tax separat behandelt wird. Wenn Stripe Tax nicht aktiviert ist, müssen die Tarife inklusive MwSt. eingegeben werden, und der Tarif wird auf der Rechnung als Brutto angedruckt. → Backend-Phase: prüfen, wie PROJ-6 V1 mit MwSt. umgeht; ggf. eine Notiz im Admin-UI ergänzen ("Tarife sind Brutto inkl. MwSt.").
- **Currency**: Alles in EUR. UK/NO/CH zahlen in EUR auf Stripe-Seite. Wenn später Multi-Currency gewünscht → eigenes Feature (würde `price_cents` in `prices` JSONB-Spalte mit Währungs-Keys umbauen).
- **Race-Condition: Tarif geändert während Cart befüllt** — Cart zeigt evtl. veralteten Wert, Stripe nimmt aber live-aktuellen. Akzeptabel; falls relevant, kann Cart-Komponente ein Polling/Revalidate alle paar Minuten machen.
- **Stripe-Session-Refresh bei Land-Wechsel**: Wenn Kunde im Stripe-Checkout das Lieferland wechselt, greift V1 nicht dynamisch nach. Das Stripe-UI zeigt aber eine Warnung. V2 wäre Stripe-Calculated-Shipping mit Webhook für Live-Berechnung.
- **Marketing-Threshold-Aussage in Sanity-Hero**: PROJ-23 hatte "ab 49 € versandkostenfrei" als Beispiel-Aussage. Die Texte aus Sanity sind frei editierbar. → Empfehlung: Sanity-Schema um `useDynamicShipping`-Boolean ergänzen, das die Komponente anweist, statt des Sanity-Texts den DB-Threshold dynamisch zu zeigen. Klärung beim Frontend-Schritt.
- **Verifikations-Script vor Phase-3-Deploy**: Auto-fail wenn keine published-Tarife für DE existieren. Sollte in CI laufen, vorerst manuell prüfbar mit kleinem npm-Script.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

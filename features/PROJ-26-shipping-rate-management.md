# PROJ-26: Versandkosten-Management

## Status: Planned
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

## Open Questions
- **Versandkosten-Kombinationsregel** ("höchster Tarif gewinnt") ist eine V1-Annahme. Wenn das in Praxis nicht passt (z. B. mehrere große Bilderrahmen = mehrere Pakete = höhere Kosten), muss die Regel verfeinert werden. → Operativ klären, sobald erste echte Bestellungen kommen.
- **Auswahl der unterstützten Länder**: V1-Liste exakt definieren (DACH-Erweiterung um welche EU-Länder?). → Sollte beim Architecture-Schritt mit Marketing/Versand-Operations abgestimmt werden.
- **Migration der Bestands-Tarife** (DACH wurde in PROJ-6 evtl. hartkodiert): nach PROJ-26-Deploy ein Backfill-Script, das die DACH-Tarife in `shipping_rates` anlegt.

## Technical Requirements
- **Performance**: `GET /api/shipping-rates?country=XX` < 100 ms, `POST /api/shipping/calculate` < 200 ms (auch bei 10+ Cart-Items)
- **Caching**: Public-API ist edge-cacheable; Admin-Änderungen invalidieren via Cache-Tag
- **Datenkonsistenz**: Unique-Constraint auf (country_code, product_type, format) bei published-Status — verhindert konkurrierende veröffentlichte Tarife
- **i18n**: Stripe-Checkout-Versand-Label wird in Locale des Users angezeigt (`Standardversand` / `Standard shipping` / `Livraison standard` / `Spedizione standard` / `Envío estándar`)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

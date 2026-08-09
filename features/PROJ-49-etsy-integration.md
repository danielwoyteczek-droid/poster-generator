# PROJ-49: Etsy-Integration (Listing-Sync + Bestellungs-Importer)

## Status: In Progress (Strategie-Pivot — siehe unten)
**Created:** 2026-05-14
**Last Updated:** 2026-05-21

---

## ⚠️ Strategie-Pivot 2026-05-21 — Etsy-API permanent abgelehnt

**Etsy hat den API-Zugang am 2026-05-15 endgültig verweigert.** Die ursprünglich
geplante Open-API-v3-Integration (OAuth + Listing-Sync + Receipt-Polling +
Tracking-Submit) ist damit **nicht realisierbar**. Alle Abschnitte unterhalb
dieses Pivots beschreiben das ursprüngliche API-Konzept und bleiben als
historischer Kontext erhalten — falls Etsy je den Zugang öffnet, ist die
Vorarbeit dokumentiert.

### Neue Strategie — vier Säulen ohne Etsy-API

| Säule | Vorgehen | Status |
|-------|----------|--------|
| **A1. Listing-Hülle** | Titel, Beschreibung, Preis, Tags, Personalisierungsfeld werden durch **Browser-Claude** (Claude Chrome Extension / Computer Use) auf etsy.com angelegt — als Draft ohne Bilder. Datenquelle: [etsy_listings.csv](etsy_listings.csv) + [docs/etsy/listing-descriptions.md](docs/etsy/listing-descriptions.md) + [listing-field-conventions.md](docs/etsy/listing-field-conventions.md). | offen — Browser-Workflow noch zu definieren |
| **A2. Listing-Bilder** | Bilder kommen über den **Dynamic-Mockups-Dashboard-Connector**: DM-Account ist per OAuth mit dem Etsy-Shop verbunden (DMs eigene Etsy-App — von der API-Absage an uns *nicht* betroffen). Im DM-Dashboard werden Mockups gebaut und per „Etsy Store Integration" direkt auf die Listings gepusht (bis 10 Bilder/Listing, Draft + Active, Batch-Mode). **Kein Code, kein Browser-Claude für diesen Schritt.** Artwork-Quelle für die DM-Templates: [scripts/export-preset-pngs.ts](scripts/export-preset-pngs.ts) / [render-etsy-style-samples.ts](scripts/render-etsy-style-samples.ts). | DM-Connector verfügbar, Etsy-Shop-Verbindung im DM-Dashboard noch herzustellen |
| **B. Order-Import** | Operator exportiert Etsy-Bestellungen als **CSV** aus dem Etsy-Shop-Manager → manueller Upload ins Admin-UI → Personalisierungs-Parser ([src/lib/etsy/personalization-parser.ts](src/lib/etsy/personalization-parser.ts)) → reguläre Bestellung in PROJ-10-Queue. | Parser-Code da, CSV-Upload-UI fehlt |
| **C. Tracking-Submit** | Operator trägt Tracking-Nummer **manuell im Etsy-Shop-Manager** ein. Keine Automatisierung. | manuell, kein Code |

> **Hinweis zur Dynamic-Mockups-API:** Wir haben einen funktionierenden DM-REST-API-Zugang ([src/lib/dynamic-mockups-client.ts](src/lib/dynamic-mockups-client.ts), genutzt in PROJ-30). Die REST-API **rendert** Mockups, **pusht aber nicht zu Etsy** — der Etsy-Push ist ausschließlich ein Dashboard-Feature. Für PROJ-49 ist die DM-API daher nur relevant, falls Listing-Bilder doch programmatisch erzeugt werden sollen; der gewählte Weg A2 nutzt stattdessen den Dashboard-Connector.

### Was aus dem uncommitted Code obsolet wird

- 🪦 **OAuth + API-Client + Cron-Polling:** [src/lib/etsy/client.ts](src/lib/etsy/client.ts), [oauth.ts](src/lib/etsy/oauth.ts), [order-pull.ts](src/lib/etsy/order-pull.ts), [api/etsy/oauth/](src/app/api/etsy/oauth/), [api/etsy/cron/](src/app/api/etsy/cron/), [api/admin/etsy/oauth-status/](src/app/api/admin/etsy/oauth-status/), [sync-now/](src/app/api/admin/etsy/sync-now/), [private/admin/etsy/oauth/](src/app/private/admin/etsy/oauth/), [AdminEtsyOAuthPanel.tsx](src/components/admin/AdminEtsyOAuthPanel.tsx)
- 🪦 **Workflow:** [.github/workflows/etsy-order-sync.yml](.github/workflows/etsy-order-sync.yml) (Polling-Cron)
- 🪦 **Migration:** Tabellen `etsy_oauth_tokens`, `etsy_sync_runs` aus [supabase/migrations/20260514000003_proj49_etsy_integration.sql](supabase/migrations/20260514000003_proj49_etsy_integration.sql)

### Was wertvoll bleibt

- 🟢 **Listing-Material:** [etsy_listings.csv](etsy_listings.csv), [docs/etsy/listing-descriptions.md](docs/etsy/listing-descriptions.md), [docs/etsy/listing-field-conventions.md](docs/etsy/listing-field-conventions.md) — Source-of-Truth für Browser-Claude
- 🟢 **Asset-Skripte:** [scripts/export-preset-pngs.ts](scripts/export-preset-pngs.ts), [etsy-list-presets.ts](scripts/etsy-list-presets.ts), [render-etsy-style-samples.ts](scripts/render-etsy-style-samples.ts), [build-etsy-compare-grid.ts](scripts/build-etsy-compare-grid.ts) — erzeugen Listing-Bilder
- 🟢 **Order-Import (CSV statt API):** [src/lib/etsy/personalization-parser.ts](src/lib/etsy/personalization-parser.ts), [types.ts](src/lib/etsy/types.ts), [api/admin/etsy/orders/](src/app/api/admin/etsy/orders/), [AdminEtsyOrdersList.tsx](src/components/admin/AdminEtsyOrdersList.tsx), Tabelle `etsy_orders` aus der Migration, `orders`/`presets`-Spalten-Erweiterungen

### Nächste konkrete Schritte

1. **DM-Asset-Push prüfen:** Kann unsere Render-Pipeline Artwork programmatisch in den DM-Account schieben, statt es manuell ins DM-Dashboard zu laden? (siehe offener Punkt unten)
2. **CSV-Upload-UI** für Etsy-Bestellungen bauen (ersetzt Polling-Endpoint)
3. **Spalten-Mapping** Etsy-Order-CSV → `etsy_orders` definieren (Etsy bietet einen "Orders & Shipping"-CSV-Export)
4. **Browser-Claude-Playbook** für die Listing-Hülle (A1) schreiben
5. **Cleanup-Commit** der obsoleten API-Files (separat, nicht jetzt — explizit vertagt)

### Offener Punkt — DM-Asset-Upload via API

Der Bild-Upload über Browser-Claude/Chrome ist zu langsam. Zu prüfen: Bietet die
Dynamic-Mockups-REST-API einen Endpoint, um **Artwork/Design-Assets** in den
DM-Account hochzuladen (nicht: Mockups zu Etsy pushen)? Falls ja, könnte die
Pipeline so laufen: `export-preset-pngs.ts` → Asset-Upload via DM-API →
DM-Dashboard-Connector pusht Mockups zu Etsy. Damit entfiele jeglicher
Browser-Upload. Muss gegen die DM-API-Doku verifiziert werden.

---

## Dependencies
- **Requires PROJ-10** (Admin-Bestellverwaltung) — importierte Etsy-Bestellungen landen als reguläre Bestellungen in der bestehenden Admin-Queue mit `source = 'etsy'`.
- **Requires PROJ-8** (Design-Presets) — jedes Etsy-Listing wird aus einem internen Preset (× Format A4/A3/A2) generiert; Mapping `etsy_listing_id → preset_id` bestimmt, welches Design für die Bestellung gerendert wird.
- **Requires PROJ-30** (Preset-Render-Pipeline) — sowohl Listing-Hauptbilder als auch fertige Bestellungs-Poster werden über die bestehende Render-Pipeline erzeugt.
- **Requires PROJ-1** (Karten-Editor Core) — Editor-Konfiguration aus Personalisierungs-Feldern (Titel/Ort/Koordinaten) wird in den bestehenden Editor-State übersetzt.
- **Requires PROJ-3** (Poster-Export) — finales PNG/PDF wird über die existierende Export-Pipeline generiert.
- **Berührt PROJ-12** (Client-Order-Management) — Etsy-Bestellungen sind nicht Teil des Kunden-Logins (kein Self-Service-Zugriff für Etsy-Käufer), erscheinen aber im Operator-Backend.
- **Berührt PROJ-26** (Versandkosten-Management) — Etsy verwaltet Versandprofile separat; Mapping `versand_profile_id → internes Produkt/Format` muss klar definiert sein.
- **Berührt PROJ-31** (Amazon-Importer) — gleiches Pattern, parallele Multi-Channel-Bestellquelle; gemeinsame Abstraktion `external_order_source` empfehlenswert.

## Problem & Ziel

petite-moment soll personalisierte Karten-Poster zusätzlich über **Etsy** verkaufen. Etsy ist für die Zielgruppe (Nicht-Designer mit Geschenk-Intent) der natürliche Marktplatz, aber zwei Operations-Probleme stehen einem manuellen Etsy-Verkauf im Weg:

1. **Listing-Pflege ist nicht skalierbar.** Wenn jedes Stadt-/Anlass-Preset × Format (A4/A3/A2) ein eigenes Etsy-Listing wird, sind das schnell 50–200 Listings, die manuell mit Bildern, Titeln, Tags, Beschreibungen, Preisen und Varianten gepflegt werden müssten. Bei jeder Preisänderung oder Foto-Update vervielfacht sich der Aufwand.
2. **Bestellungs-Verarbeitung ist fehleranfällig.** Analog zu PROJ-31 (Amazon): Operator müsste in Etsy-Shop-Manager Personalisierungs-Text ablesen → in den petite-moment-Editor tippen → Poster rendern → drucken → versenden → Tracking zurück in Etsy eintragen. ~5–10 Min pro Bestellung, Tippfehler bei Koordinaten/Datum.

**PROJ-49 automatisiert beide Richtungen über die Etsy Open API v3:**

```
RICHTUNG A — Listing-Sync (Outbound)
preset × format (interne Quelle)
    ↓
PROJ-30 Listing-Hauptbild rendern (1:1, Etsy-konform)
    ↓
createDraftListing → uploadListingImage → publishListing
    ↓
etsy_listing_mappings (preset_id, format, etsy_listing_id, status)
    ↓
Re-Sync bei Preis-/Bild-/Beschreibungs-Änderung

RICHTUNG B — Order-Import (Inbound)
Etsy-Bestellung (Receipt)
    ↓
Polling (15 Min) ODER Webhook receipt:create
    ↓
Receipt + Transactions + Personalisierungs-Text
    ↓
Personalisierungs-Parser (strikt zeilenbasiert)
    ↓ [Erfolg]                    ↓ [Fehler]
SKU/Listing → Preset Mapping     manual_review-Queue
    ↓
Editor-State Build (Preset-Defaults + Personalisierungs-Overrides)
    ↓
Auto-Render via PROJ-30 → fertiges Poster-PDF
    ↓
Bestellung erscheint in PROJ-10 Admin-Queue (Status: "Awaiting Print")
    ↓
Operator druckt + verschickt → tracking-Submit an Etsy
```

## User Stories

### Operator (B2C-Workflow)
- Als Operator möchte ich aus jedem petite-moment-Preset mit einem Klick ein Etsy-Listing pro Format (A4/A3/A2) erzeugen lassen, damit ich nicht 50–200 Listings manuell in Etsy anlege.
- Als Operator möchte ich, dass Etsy-Bestellungen automatisch in meinem Admin-Backend (PROJ-10) erscheinen, damit ich nicht zwischen Etsy-Shop-Manager und petite-moment.com wechseln muss.
- Als Operator möchte ich pro Etsy-Listing (oder pro SKU) ein internes Preset hinterlegen können, damit der Importer weiß, welches Design er für eine Bestellung rendern soll.
- Als Operator möchte ich die Personalisierungs-Eingabe des Käufers (Titel, Ort, Datum, optional Koordinaten) automatisch ins Poster übernehmen lassen, ohne sie abzutippen.
- Als Operator möchte ich die Lieferadresse aus der Bestellung im Versand-Workflow sehen, damit ich die Sendung adressieren kann.
- Als Operator möchte ich den Versandstatus mit Tracking-Nummer an Etsy zurückmelden können, damit Etsy den Käufer benachrichtigt und die Bestellung als erfüllt markiert.
- Als Operator möchte ich, dass Bestellungen automatisch alle 10–15 Minuten synchronisiert werden, damit ich nicht manuell Knopf drücken muss.
- Als Operator möchte ich bei Sync-Fehlern (API-Limit, fehlendes Mapping, korrupte Personalisierung) eine Benachrichtigung und einen klaren Status im Admin-UI sehen.
- Als Operator möchte ich Bestellungen mit unbekanntem Listing **nicht** automatisch verwerfen, sondern zur manuellen Bearbeitung in eine Pending-Liste bekommen.
- Als Operator möchte ich neue Importer-Logik im OAuth-Sandbox-Modus testen können, bevor sie auf Production-Bestellungen losgelassen wird.
- Als Operator möchte ich Listings pausieren/reaktivieren können (z.B. saisonal), ohne sie zu löschen.

### End-Kunde (Etsy-Käufer)
- Als Etsy-Käufer möchte ich klare Vorgaben sehen, was ich ins Personalisierungs-Feld schreiben soll (Format-Vorlage in den Hinweistext), damit meine Bestellung nicht manuell nachbearbeitet werden muss.
- Als Etsy-Käufer möchte ich nach Kauf eine Bestätigung sehen, dass meine Bestellung in Produktion geht — Tracking erscheint später wie gewohnt in Etsy.

## Acceptance Criteria

### Etsy API Setup (extern, nicht im Code)
- [ ] Etsy-Developer-Account angelegt (developers.etsy.com)
- [ ] App im Etsy Developer Portal registriert (Name, Beschreibung, Redirect-URIs)
- [ ] **Scopes** angefordert:
  - [ ] `listings_r`, `listings_w`, `listings_d` (Listings lesen/schreiben/löschen)
  - [ ] `transactions_r` (Bestellungen lesen)
  - [ ] `transactions_w` (Tracking/Shipping setzen)
  - [ ] `shops_r` (Shop-Metadaten)
  - [ ] `address_r` (Käuferadresse — PII-relevant)
- [ ] Personal-Access-Token via OAuth2-Flow generiert (eigener Shop)
- [ ] `ETSY_API_KEY`, `ETSY_OAUTH_CLIENT_ID`, `ETSY_OAUTH_CLIENT_SECRET`, `ETSY_REFRESH_TOKEN` sicher in `.env.local` + Vercel-Env-Variablen
- [ ] Refresh-Token-Rotation implementiert (Etsy: Access-Token 1h, Refresh-Token 90 Tage)
- [ ] Sandbox/Testflow durchgespielt (Etsy hat keine echte Sandbox — Test über separates Test-Listing im Live-Shop mit Sofort-Cancel)

### Datenmodell (Supabase)
- [ ] Neue Tabelle `etsy_listing_mappings`:
  - `id` (UUID)
  - `etsy_listing_id` (bigint, unique)
  - `etsy_shop_id` (bigint)
  - `preset_id` (FK → `presets`)
  - `format` (Enum: `a4` | `a3` | `a2`)
  - `state` (Enum: `draft` | `active` | `inactive` | `expired` | `sold_out`) — Spiegel des Etsy-Listing-Status
  - `last_synced_at` (Timestamp) — letzte erfolgreiche Push-Sync
  - `last_remote_updated_at` (Timestamp) — `updated_timestamp` aus Etsy-Response
  - `etsy_url` (Text)
  - `notes` (Text, optional)
  - `created_at`, `updated_at`
  - Unique-Constraint: `(preset_id, format)`
- [ ] Neue Tabelle `etsy_orders`:
  - `id` (UUID)
  - `etsy_receipt_id` (bigint, unique)
  - `etsy_shop_id` (bigint)
  - `purchase_date` (Timestamp)
  - `status` (Enum: `pending_parse` | `pending_mapping` | `pending_render` | `imported` | `failed` | `manual_review`)
  - `raw_receipt_payload` (JSONB) — vollständiges Etsy-Receipt zur Nachverfolgung
  - `raw_transactions_payload` (JSONB) — Etsy-Transactions-Array (kann mehrere Items pro Receipt enthalten)
  - `personalization_raw` (Text) — Original-Personalisierungstext
  - `personalization_parsed` (JSONB, nullable) — geparste Felder (titel/ort/datum/format)
  - `shipping_address` (JSONB, verschlüsselt via pgcrypto) — PII
  - `internal_order_id` (FK → `orders`, nullable bis Import erfolgreich)
  - `error_message` (Text, nullable)
  - `imported_at`, `last_synced_at`
- [ ] Erweiterung `orders` (PROJ-10) um:
  - `source` (Enum: `etsy` | `amazon` | `shop` | `manual`, Default `shop`)
  - `external_order_id` (Text, nullable) — z.B. Etsy-Receipt-ID als String
- [ ] Tabelle `etsy_sync_runs`:
  - `id`, `kind` (Enum: `listing_push` | `order_pull` | `shipping_push`), `started_at`, `completed_at`, `items_processed` (Int), `items_succeeded` (Int), `items_failed` (Int), `error_log` (Text, nullable)

### Listing-Sync (Outbound, Operator-getrieben)
- [ ] Neue Admin-Seite `/private/admin/etsy/listings`:
  - Tabelle aller Presets mit Sync-Status pro Format (A4/A3/A2)
  - Spalten: Preset-Name, Format, Etsy-Status (draft/active/inactive), Etsy-URL, Letzter Sync, Action
  - "Listing erstellen" / "Listing aktualisieren" / "Listing deaktivieren" Aktionen pro Zeile
  - Bulk-Aktion: "Alle Presets × alle Formate erstellen" (Confirm-Dialog wegen API-Volumen)
- [ ] Listing-Erstellung pro Preset × Format:
  1. PROJ-30 Listing-Hauptbild rendern (Etsy verlangt min 2000 px lange Kante, hochformatig)
  2. Bis zu 9 weitere Bilder rendern (Mockup-Composites, Detail-Zoom) — analog PROJ-30 Multi-Format-Renders
  3. `createDraftListing` mit Titel, Beschreibung, Tags (max 13), Material-Liste, Preis, Versandprofil, Sektion
  4. Pro Bild: `uploadListingImage`
  5. `updateListing` → State `active`
  6. Mapping in `etsy_listing_mappings` speichern
- [ ] Listing-Update bei Preset-Änderung:
  - Operator setzt manuell "Re-Sync"-Trigger (kein automatischer Push bei jeder Preset-Bearbeitung)
  - Updates: Titel, Beschreibung, Tags, Preis, Bilder (alle ersetzen, da Etsy keine atomaren Bild-Updates kennt)
- [ ] Listing-Deaktivierung: `updateListing` mit `state=inactive` (nicht löschen — historische Bestellungen brauchen Bezug)
- [ ] **Idempotenz**: Re-Run der Bulk-Erstellung überspringt bereits gemappte Preset×Format-Kombis

### Order-Import (Inbound, Polling)
- [ ] Polling-Job läuft alle 10–15 Min via **Vercel Cron**
- [ ] Pro Sync:
  1. `getShopReceipts` mit `min_created = (last_sync_time - 5min Puffer)`, `was_paid=true`, `was_shipped=false`
  2. Pro Receipt: `getShopReceiptTransactions` → pro Transaction prüfen ob `is_personalizable` → Personalisierungs-Text aus `variations[].formatted_value` ODER `personalization`-Feld auslesen
  3. Käuferadresse aus Receipt-Payload (bereits enthalten, kein separater Call nötig — Etsy liefert Adresse direkt in `getShopReceipts` mit OAuth-Scope `address_r`)
  4. Personalisierungs-Text durch Parser jagen
     - Erfolg: weiter zu Schritt 5
     - Parser-Fehler: Status `manual_review`, in Admin-UI sichtbar, **keine** Auto-Render
  5. Listing-ID → Preset-Mapping nachschlagen
     - Mapping vorhanden: weiter zu Schritt 6
     - Kein Mapping: Status `pending_mapping`, in Admin-UI sichtbar
  6. Editor-State aus Preset-Default + Personalisierungs-Overrides bauen
  7. Render-Job in PROJ-30 Pipeline anstoßen
  8. Datensatz in `orders` anlegen mit `source = 'etsy'`, `external_order_id = etsy_receipt_id`
  9. `etsy_orders.status = imported`, `internal_order_id` setzen
- [ ] **Idempotenz**: Receipt mit existierender `etsy_receipt_id` wird NICHT doppelt importiert
- [ ] **Rate-Limits respektieren**: Etsy = 10 req/s, 10.000 req/Tag pro App — Token-Bucket-Client mit Backoff
- [ ] **Retry-Logik**: Exponential Backoff bei 5xx und Throttling (429), max 3 Retries
- [ ] **PII-Handling**: Lieferadresse verschlüsselt at rest via `pgcrypto`, niemals in Logs schreiben

### Personalisierungs-Parser
- [ ] **Strikter zeilenbasierter Parser** mit erwartetem Format pro Listing-Variante (Beispiel "Stadt-Poster"):
  ```
  Ort: <Stadt, Land>
  Titel: <oberer Text>
  Untertitel: <unterer Text, optional>
  Koordinaten: <optional — sonst per Geocoding aus Ort>
  ```
- [ ] **Format pro Preset konfigurierbar** — nicht hartcodiert, da Hochzeitsposter andere Felder braucht als Stadt-Poster
  - Neue Spalte `presets.etsy_personalization_schema` (JSONB) — Array von `{key, label, required, regex?}`
  - Schema wird im Etsy-Listing-Hinweistext automatisch als Anweisung erzeugt
- [ ] Parser-Verhalten:
  - Erkennt deutsche + englische Feldnamen (Käufer könnten beide nutzen)
  - Trimmt Whitespace, ignoriert Reihenfolge
  - Bei fehlendem `required`-Feld → `manual_review`
  - Bei zusätzlichen unbekannten Feldern → Warnung loggen, aber nicht blockieren
- [ ] Geocoding-Fallback: wenn Koordinaten fehlen, aber Ort vorhanden → MapTiler-Geocoding (bestehende Integration aus PROJ-1) versuchen; bei Mehrdeutigkeit → `manual_review`
- [ ] Unit-Tests für 10+ realistische Käufer-Eingaben (mit Tippfehlern, fehlenden Doppelpunkten, Mehrzeilern, Smart-Quotes)

### Admin-UI für Bestellungs-Imports
- [ ] Neue Admin-Seite `/private/admin/etsy/orders`:
  - Letzter erfolgreicher Sync-Zeitpunkt + Status
  - Tabelle aktueller/letzter Imports mit Status-Badge
  - Drilldown pro Bestellung: Raw-Receipt, Personalisierungs-Original + geparste Felder (mit Edit-Möglichkeit), Render-Status, internes Bestell-Link
  - Manueller "Jetzt synchronisieren"-Knopf (Rate-limit-aware)
  - Filter: nur fehlerhafte / nur `manual_review` / nur `pending_mapping` / alle
- [ ] `manual_review`-Sektion: Bestellungen mit Parser-Fehlern, Operator kann Personalisierungs-Felder direkt im UI nachpflegen + Re-Import triggern
- [ ] `pending_mapping`-Sektion: Bestellungen mit unbekanntem Listing — "Listing jetzt mappen + Reimport"-Action
- [ ] Fehler-Liste: Imports mit `failed`-Status, Retry-Button pro Bestellung

### Versandrückmeldung an Etsy
- [ ] Wenn interne Bestellung in PROJ-10 als `shipped` markiert wird → Etsy API `createReceiptShipment` Aufruf mit:
  - `tracking_code`
  - `carrier_name` (DHL/DPD/Hermes/etc — Etsy-Whitelist)
  - `send_bcc` (true, damit Operator-Kopie geht)
- [ ] Bei Versand-Submit-Fehler: Operator-Benachrichtigung + manueller Retry möglich
- [ ] Sync-Run-Log einträgt jeden Shipping-Push

### Error Handling & Monitoring
- [ ] Strukturelle Fehler (Personalisierungs-Parse-Fail, Listing-Mapping fehlt, Adresse leer) → Status `manual_review` / `pending_mapping`, **nicht** stillschweigend skippen
- [ ] Sentry-Integration: Sync-Fehler werden mit Receipt-ID + Schritt geloggt
- [ ] Admin-Dashboard zeigt Sync-Health (Erfolgsquote letzter 24h pro Job-Typ)
- [ ] Bei drei aufeinanderfolgenden fehlgeschlagenen Sync-Runs: E-Mail-Benachrichtigung an Operator
- [ ] Rate-Limit-Warnung bei Approach an Tageslimit (>8000/10000 req/Tag)

### Sicherheit & Compliance
- [ ] OAuth-Refresh-Token niemals im Repo committen, nur in Vercel-Env
- [ ] PII-Daten (Käufer-Name, Adresse) verschlüsselt in DB via `pgcrypto`
- [ ] Logs maskieren PII-Felder (Name, Straße, Email)
- [ ] Datenaufbewahrung: Etsy-Roh-Payloads nach 30 Tagen archivieren/löschen, sobald Bestellung erfüllt ist (DSGVO-Compliance)
- [ ] Etsy-Käufer-Email kommt nicht in Marketing-Liste (Etsy-AGB verbietet Direkt-Marketing zu Etsy-Käufern außerhalb Etsy)
- [ ] EU-AI-Act-Hinweis: KI-Marketing-Bilder auf Listings müssen ab 2026-08-02 gekennzeichnet werden (siehe Memory `project_eu_ai_act_labeling`)

## Implementation Notes (vorläufig — wird in `/architecture` verfeinert)

### Tech-Stack-Vorschlag
- **Etsy API Client**: Eigener fetch-basierter Client mit Bearer-Token-Refresh-Logik (kein offizielles Node-SDK von Etsy)
- **Cron**: Vercel Cron (analog PROJ-31)
- **Encryption**: Supabase `pgcrypto`-Extension für PII-Felder
- **Queue/Job**: Reuse PROJ-30 Pattern (`render_status`-Spalte als implizite Queue)
- **OAuth-Flow**: Initial-Authorize einmalig manuell via Browser (Operator → callback-URL liefert Authorization-Code → Refresh-Token), dann Auto-Refresh

### Listing-Strategie
- **Pro Preset 3 Listings** (A4/A3/A2) — alternativ Etsy-Listing-Variations (eine Listing-Page, 3 Preisstufen). Variations sind Etsy-nativ besser, aber komplexer in der API.
- **Empfehlung MVP**: Variations (1 Listing pro Preset, 3 Format-Preise) — bessere SEO, weniger Listings, niedrigere Listing-Gebühren (Etsy: 0,20 USD pro Listing × 4 Monate)

### Webhook vs. Polling
- Etsy bietet seit 2024 limitierte Webhooks (`receipt:create`, `listing:update`)
- **Empfehlung MVP**: Polling (analog PROJ-31), Webhook in Phase 2 für niedrigere Latenz
- Polling-Intervall: 15 Min ist für Etsy-Volumen (anfangs <10 Bestellungen/Tag) mehr als ausreichend

### Personalization-Schema-Beispiele
Pro Preset-Kategorie ein Default-Schema, im Admin überschreibbar:
- **Stadt-Poster**: `Ort, Titel, Untertitel, Datum?`
- **Hochzeitsposter** (PROJ-45): `Vorname 1, Vorname 2, Hochzeitsort, Datum`
- **Foto-Poster** (PROJ-32): nicht via Etsy MVP — Foto-Upload ist via Etsy-Personalisierung nicht praktikabel (keine File-Uploads im Personalisierungs-Feld)

### Stornierungen / Refunds
- Etsy meldet Cancel via `was_canceled` Flag im Receipt
- Polling muss Cancel-Übergang erkennen → interne Bestellung als `cancelled` markieren, Render-Job stoppen falls nicht fertig
- Refund-Initiierung MVP nur manuell in Etsy-Shop-Manager

## Open Questions (für `/architecture`)
1. **Listings via Variations oder Multi-Listing?** Variations = 1 Etsy-Page mit 3 Format-Preisen, Multi-Listing = 3 separate Pages. Trade-off: SEO/Gebühren vs. Implementierungs-Komplexität.
2. **Etsy-Webhooks ab MVP oder Phase 2?** Polling reicht initial, aber Webhooks vermeiden Lag bei wachsendem Volumen.
3. **Preview-Link-Flow (Phase 2)?** Käufer klickt vor Kauf auf Link → konfiguriert Poster im petite-moment-Editor → Etsy-Listing zeigt Hinweis "Konfiguration über externen Link". Bessere UX, aber Etsy-AGB-Risiko (Etsy will Personalisierung im Etsy-Flow). Vorher prüfen, ob Top-Seller diesen Pattern fahren.
4. **Versandprofile-Quelle?** Etsy-Versandprofile müssen vorab manuell in Etsy angelegt werden — API kann nur referenzieren. PROJ-26 (Versandkosten-Management) sollte Versandprofil-IDs aus Etsy importieren können.
5. **Mehrere Items pro Receipt?** Etsy-Receipts können mehrere Transactions enthalten (z.B. 2 Poster in einer Bestellung). Wie modellieren wir das im internen `orders`-Schema?
6. **Etsy-Shop-Sektionen automatisch verwalten?** (Stadt-Poster, Hochzeitsposter, Sternenkarten) — entweder als Pflichtfeld bei Listing-Creation oder Operator pflegt händisch.
7. **Test-Strategie**: Mock-Layer für Etsy-API in Vitest. E2E gegen Live-API ist riskant (keine echte Sandbox) — Test-Listing in Live-Shop mit "Sofort-Cancel"-Workflow?
8. **Bestell-Volumen vs. API-Limits**: Bei >1000 Bestellungen/Tag wird das Listing-Re-Sync teuer (Tageslimit 10.000 Calls). Batch-Strategie für Bulk-Listing-Updates?

## Roadmap Phasen
1. **Phase 1 — OAuth + Read-Only** (3–5 Tage)
   - Etsy-App im Developer Portal anlegen
   - OAuth-Flow + Refresh-Token-Rotation
   - Read-Only Polling: `getShopReceipts` + `getShopReceiptTransactions` → Roh-Payloads in `etsy_orders` speichern
   - Admin-UI mit Roh-Receipt-Anzeige
2. **Phase 2 — Personalisierungs-Parser + Auto-Import** (3–5 Tage)
   - `etsy_listing_mappings`-Tabelle + Mapping-UI
   - Parser + Schema-System
   - Auto-Render via PROJ-30
   - Bestellungen erscheinen in PROJ-10
3. **Phase 3 — Listing-Sync Outbound** (5–7 Tage)
   - `createDraftListing` + `uploadListingImage` + `publishListing`
   - Admin-UI für Listing-Bulk-Erstellung
   - Re-Sync bei Preis-/Bild-Updates
4. **Phase 4 — Shipping-Push + Monitoring** (2–3 Tage)
   - `createReceiptShipment`
   - Sync-Health-Dashboard
   - Sentry-Alerts
5. **Phase 5 — Webhooks + Variations** (separates Ticket)
   - Webhook-Endpoint statt Polling
   - Migration zu Listing-Variations falls Phase 3 mit Multi-Listing startet

## Aktueller Status (Stand 2026-05-14)
- ✅ Etsy-Verkäufer-Account aktiviert
- ✅ Backend Phase 1+2 implementiert (siehe Implementation Notes unten)
- ✅ Etsy-Developer-App "petite-moment-integration" angelegt, Keystring + Shared Secret in `.env.local` eingetragen
- ✅ `ETSY_CRON_SECRET` lokal in `.env.local` eingetragen
- 🚫 **Blocker: App-Status "Pending Personal Approval"** — Etsy reviewt manuell, App-Detail-Edit ist gesperrt (Klick auf App-Namen reagiert nicht), Callback-URLs noch nicht setzbar. Erwartete Wartezeit: Stunden bis 3 Tage. Refresh `https://www.etsy.com/developers/your-apps` bis Status auf "Active"/"Approved" wechselt.
- ⏳ Sobald Approval da: Callback-URLs eintragen (`http://localhost:3000/api/etsy/oauth/callback`, `https://petite-moment.com/api/etsy/oauth/callback`), dann OAuth-Setup-Flow durchlaufen
- ⏳ GitHub-Secrets `APP_BASE_URL` und `ETSY_CRON_SECRET` für `etsy-order-sync.yml` Workflow noch zu setzen (vor Deploy)
- ⏳ Phase 2.5: Materialisierung geparster Items in `orders` + Render-Trigger via PROJ-30 (separate Session, blockiert durch fehlende Test-Bestellungen)
- ⏳ Phase 3: Listing-Push (Groups → Etsy mit Variations-API) — separate Session
- ⏳ Phase 4: Shipping-Push + Sync-Health-Dashboard — separate Session

## Implementation Notes (Backend Phase 1+2)

**Implementiert am 2026-05-14:**

### Migrations
- [supabase/migrations/20260514000003_proj49_etsy_integration.sql](../supabase/migrations/20260514000003_proj49_etsy_integration.sql) — 5 neue Tabellen (`etsy_oauth_tokens`, `etsy_listing_groups`, `etsy_listing_group_members`, `etsy_orders`, `etsy_sync_runs`) + 3 neue `orders`-Spalten (`source`, `external_order_id`, `external_line_item_position`) + `presets.etsy_personalization_schema`. Migration ist auf das Live-Projekt angewendet.
- **Korrektur zur Architektur:** Column-Level-Encryption für PII wurde verworfen. Begründung: Supabase verschlüsselt bereits at-rest, RLS schränkt Lese-Zugriff auf Admin ein. Zwei Sicherheitsschichten reichen für MVP. Spart einen ENV-Var und ~50 Zeilen Crypto-Helper.

### Library-Code
- [src/lib/etsy/client.ts](../src/lib/etsy/client.ts) — `createEtsyClient()` mit Bearer-Auth-Refresh, Token-Bucket (170ms steady spacing = 6 req/s), Rate-Limit-Header-Capture, getypte Errors (`EtsyAuthError`, `EtsyRateLimitError`, `EtsyApiError`). Access-Token wird im Memory gecached, Refresh-Token rotiert + persistiert bei jedem Renewal.
- [src/lib/etsy/oauth.ts](../src/lib/etsy/oauth.ts) — PKCE-Helpers: `generatePkcePair()`, `generateState()`, `buildAuthorizeUrl()`, `exchangeAuthorizationCode()`. SHA-256 + Base64url via Node `crypto`. Redirect-URI wird aus Request-Origin abgeleitet, optional via Env überschreibbar.
- [src/lib/etsy/types.ts](../src/lib/etsy/types.ts) — TypeScript-Defs für Etsy-Receipt-/Transaction-Shape + Extraktor-Helper (`getPersonalizationText`, `getReceiptShippingAddress`).
- [src/lib/etsy/personalization-parser.ts](../src/lib/etsy/personalization-parser.ts) — Schema-basierter Parser mit Zod-validiertem Schema. Phase 1: labelled lines (`:`, `=`, em/en-dash, ` - `). Phase 2: positional fallback. Phase 3: required + regex Validation. Robust gegen Tippfehler, Smart-Quotes, Diacritics, EN+DE Feldnamen.

### API-Routen
- [src/app/api/etsy/oauth/start/route.ts](../src/app/api/etsy/oauth/start/route.ts) — Admin-only. Generiert PKCE-Pair + State, setzt 10-Min httpOnly Cookies, redirected zur Etsy-Consent-URL.
- [src/app/api/etsy/oauth/callback/route.ts](../src/app/api/etsy/oauth/callback/route.ts) — Admin-only. CSRF-Check via State-Cookie, Token-Exchange, Shop-ID-Probe via `/users/me` + `/users/{id}/shops`, Upsert in `etsy_oauth_tokens` singleton-Row. Redirected zu `/private/admin/etsy/oauth` mit `status=success|error&reason=...`.
- [src/app/api/etsy/cron/pull-orders/route.ts](../src/app/api/etsy/cron/pull-orders/route.ts) — Bearer-Secret-Auth. Pollt `/shops/{shop_id}/receipts` mit `min_last_modified`, paginiert (100/page, max 1000/Run). Pro Transaction: Listing-Mapping resolven, Personalisierung parsen, Status setzen (`pending_render` / `manual_review` / `pending_mapping` / `cancelled`). Schreibt jeden Lauf in `etsy_sync_runs` mit Rate-Limit-Stand.

### GitHub Actions Workflow
- [.github/workflows/etsy-order-sync.yml](../.github/workflows/etsy-order-sync.yml) — `schedule: */15 * * * *` + `workflow_dispatch`. Curl-Call gegen Pull-Endpoint mit Shared Secret. Timeout 5min.

### Environment-Variablen
Eingetragen in `.env.local.example` mit Setup-Anleitung:
- `ETSY_OAUTH_CLIENT_ID` — Etsy-App Keystring
- `ETSY_OAUTH_CLIENT_SECRET` — Etsy-App Shared Secret (zur Laufzeit nicht benötigt — nur falls Etsy künftig non-PKCE-Flow erzwingt)
- `ETSY_OAUTH_REDIRECT_URI` — optional, sonst aus Request-Origin
- `ETSY_CRON_SECRET` — Shared Secret für GitHub-Actions → API-Route

### Tests
- [src/lib/etsy/personalization-parser.test.ts](../src/lib/etsy/personalization-parser.test.ts) — 18 Tests: clean input, EN/DE labels, Separatoren, Bare-Hyphen-Safety, Case + Diacritics, positional fallback, Required-Failures, Regex-Validation, Edge-Cases.
- [src/lib/etsy/oauth.test.ts](../src/lib/etsy/oauth.test.ts) — 6 Tests: PKCE-Pair-Eigenschaften, State-Randomness, Authorize-URL-Struktur.
- [src/lib/etsy/types.test.ts](../src/lib/etsy/types.test.ts) — 5 Tests: Personalization-Extraktor-Fallbacks, Address-Flattening.
- **Status:** 29/29 Tests grün.

### Was bewusst NICHT in Phase 1+2 steckt
- **Materialisierung in `orders`:** Parsed Etsy-Items werden noch nicht in interne `orders`-Rows kopiert. Phase 2.5 macht den Übergang `etsy_orders.parsed_items → orders + order render trigger`.
- **PROJ-30 Render-Trigger:** Auto-Render der Poster aus Etsy-Bestellungen kommt zusammen mit der Materialisierung.
- **Listing-Push:** Phase 3 (eigene Session) — die Etsy-Inventory-API mit Variations ist komplex genug für einen eigenen Block.
- **Shipping-Push:** Phase 4 (eigene Session) — hängt an PROJ-10 Shipping-State-Transition.

## Implementation Notes (Frontend Phase 1)

**Implementiert am 2026-05-14 nach Backend Phase 1+2:**

### Admin-API-Routen
- [src/app/api/admin/etsy/oauth-status/route.ts](../src/app/api/admin/etsy/oauth-status/route.ts) — `GET` liefert `OAuthStatusResponse` (connected, shop_name, scopes, expires_soon-Flag, client_id_configured). `DELETE` löscht den Token-Eintrag.
- [src/app/api/admin/etsy/orders/route.ts](../src/app/api/admin/etsy/orders/route.ts) — `GET` mit optionalem `status`-Filter, paginiert (limit/offset, max 200), liefert pro Row Item-Counts (ok/failed/no_mapping), Adress-City/Country und Status-Counts für die Filter-Chips. Liest auch den letzten `order_pull`-Run für die Header-Anzeige.
- [src/app/api/admin/etsy/orders/[id]/route.ts](../src/app/api/admin/etsy/orders/[id]/route.ts) — `GET` mit Full-Payload (raw_receipt + raw_transactions + parsed_items + shipping_address) für den Drilldown.
- [src/app/api/admin/etsy/sync-now/route.ts](../src/app/api/admin/etsy/sync-now/route.ts) — `POST` mit Admin-Auth, ruft `runOrderPull()` aus [src/lib/etsy/order-pull.ts](../src/lib/etsy/order-pull.ts). Shared mit der Cron-Route, damit Cron + Manual-Sync identisch laufen.

### Refactor: Cron-Logik in Library
Der Code aus `/api/etsy/cron/pull-orders/route.ts` wurde in [src/lib/etsy/order-pull.ts](../src/lib/etsy/order-pull.ts) extrahiert, damit Cron und Manual-Sync denselben Code nutzen. Die Cron-Route ist jetzt ein dünner Wrapper, der nur die Auth prüft.

### Admin-UI-Seiten
- [src/app/private/admin/etsy/oauth/page.tsx](../src/app/private/admin/etsy/oauth/page.tsx) + [src/components/admin/AdminEtsyOAuthPanel.tsx](../src/components/admin/AdminEtsyOAuthPanel.tsx) — OAuth-Setup mit Status-Card (verbunden/getrennt), Connect-Button (browserseitiger Redirect zu /api/etsy/oauth/start), Disconnect mit AlertDialog-Confirm, Re-Authorize-Button, Sync-Now-Button. Callback-Query-Params (`status=success|error&reason=...&shop_name=...`) werden als Toast ausgespielt und aus der URL gestrippt.
- [src/app/private/admin/etsy/orders/page.tsx](../src/app/private/admin/etsy/orders/page.tsx) + [src/components/admin/AdminEtsyOrdersList.tsx](../src/components/admin/AdminEtsyOrdersList.tsx) — Order-Queue mit Status-Filter-Chips (mit Counts), Last-Sync-Anzeige, Sync-Now-Button, Tabelle mit Drilldown-Dialog. Dialog zeigt Parsed-Items (key/value mit Status-Badge), Adresse, Raw-Receipt-JSON, Etsy-Backlink, Fehler.

### Verwendete shadcn-Components
Button, Card, Badge, Alert, AlertDialog, Dialog, Table, ScrollArea, sonner (toast) — alle bereits installiert (siehe [src/components/ui/](../src/components/ui/)).

### Bewusst noch nicht implementiert (Frontend)
- **Re-Parse-Button** für manuelle Korrektur eines `manual_review`-Items. Form-Design will ich erst sehen, wenn echte Failure-Daten da sind.
- **Pagination-Controls** in der Order-Queue. Default-Limit ist 50; erst nötig, wenn das Volumen das überschreitet.
- **Listing-Groups-Manager** + **Sync-Health-Dashboard** — Folge-Sessions.

### Was zum Testen fehlt
1. Etsy-App-Approval (Status muss von "Pending Personal Approval" auf "Active" wechseln).
2. Callback-URL eintragen in der Etsy-App-Config (geht erst nach Approval).
3. `/private/admin/etsy/oauth` öffnen → "Etsy verbinden" → Etsy-Consent → Zurück → "Verbunden mit petite-moment".
4. "Jetzt synchronisieren" → wenn keine Bestellungen da: leerer Sync-Run; wenn Test-Bestellung vorhanden: erscheint in der Queue.

## Listing-Setup auf Etsy (Konventionen)

Etsy unterstützt seit 2025 bis zu 5 strukturierte Personalisierungs-Felder pro Listing — entweder als "Liste der Optionen" (vordefiniert) oder "Textfeld" (Freitext). Das ist deutlich besser als der frühere Single-Freitext-Ansatz und reduziert `manual_review`-Fälle drastisch.

**Architektur-Konsequenz**: Das ursprüngliche 140-Inventory-Combo-Limit wird größtenteils irrelevant, weil die Design-Auswahl jetzt über Personalisierungs-Listen (keine Inventory-Combos) statt Variationen läuft. Eine Listing-Group kann damit z.B. alle 40+ Featured-Style-Städte in **einem** Etsy-Listing bündeln, statt ~40 Einzel-Listings oder mehrere Groups à 46.

Detaillierte Naming-Konventionen, Feld-Templates pro Listing-Typ (Stadt-Poster, Hochzeitsposter, Sternenkarte) und Schema-Beispiele: siehe [docs/etsy/listing-field-conventions.md](../docs/etsy/listing-field-conventions.md).

## Erfolgs-Kriterien
- Operator legt 50 Listings (10 Presets × 5 Städte oder Hochzeitsmotive) mit einem Bulk-Klick an, statt 50× manuell
- Etsy-Bestellung erscheint in PROJ-10 Queue mit fertigem Render binnen 15 Min nach Kauf
- &lt;10 % der Bestellungen landen in `manual_review` (Parser-Robustheit)
- Versand-Push an Etsy in &gt;95 % der Fälle ohne Retry erfolgreich

---

## Implementation-Reihenfolge

**Backend zuerst, dann Frontend** (entschieden 2026-05-14 beim Start von /frontend).

Grund: Die UI hängt an konkreten API-Response-Shapes (Etsy-Receipt-Struktur, Group-Sync-Status, OAuth-Token-State). Frontend gegen Mock-Daten zu bauen würde Doppelarbeit erzwingen, sobald die echten Endpunkte feststehen. Reihenfolge: `/backend` → `/frontend` → `/qa` → `/deploy`.

---

## Tech Design (Solution Architect)

**Entworfen am 2026-05-14 nach Klärung von drei architekturkritischen Entscheidungen:**
- Listing-Struktur → **Listing-Groups** (1 Etsy-Page bündelt mehrere Presets mit Design × Größe als Variations)
- Multi-Item-Receipts → **N separate `orders` mit gemeinsamer `external_order_id`** (kein PROJ-10-Schema-Refactor; UI gruppiert visuell). *Korrektur 2026-05-14: ursprünglich war `order_items`-Tabelle vorgesehen, wurde verworfen weil Etsy die Bestell-Abwicklung selbst macht und unsere DB nur "was drucken + wohin schicken + Tracking zurück" abbilden muss.*
- Cron-Mechanismus → **GitHub Actions** (analog zum bestehenden Render-Worker-Pattern)

### Architektur-Übersicht

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         petite-moment Vercel App                              │
│                                                                                │
│  ┌─────────────────────────┐    ┌─────────────────────────┐                 │
│  │ Admin-UI                 │    │ Etsy Sync API-Routes    │                 │
│  │ /private/admin/etsy/...  │───>│ (Listing push,           │                 │
│  └─────────────────────────┘    │  Order pull,             │                 │
│                                  │  Shipping push)          │                 │
│                                  └────────┬────────────────┘                 │
│                                           │                                   │
│                                           v                                   │
│                            ┌──────────────────────────┐                      │
│                            │ Etsy API Client          │                      │
│                            │ (OAuth-Refresh,          │                      │
│                            │  Token-Bucket,           │                      │
│                            │  Retry/Backoff)          │                      │
│                            └──────────────┬───────────┘                      │
└───────────────────────────────────────────│──────────────────────────────────┘
                                            │ HTTPS
                                            v
                                  ┌──────────────────┐
                                  │ Etsy Open API v3 │
                                  └────────┬─────────┘
                                           │
                                           │
       ┌───────────────────────────────────┼──────────────────────────────────┐
       │                                   v                                   │
       │     ┌──────────────────────┐                                          │
       │     │ GitHub Actions Cron  │  (alle 15 Min)                           │
       │     │ etsy-order-sync.yml  │                                          │
       │     └──────────┬───────────┘                                          │
       │                │ workflow_dispatch                                    │
       │                v                                                      │
       │     ┌──────────────────────────────────────────┐                     │
       │     │ /api/etsy/cron/pull-orders               │                     │
       │     │  1. fetch new receipts                    │                     │
       │     │  2. parse personalization                 │                     │
       │     │  3. enqueue render via PROJ-30           │                     │
       │     │  4. write N orders (1 per line-item),    │                     │
       │     │     all share same external_order_id     │                     │
       │     └──────────────────────────────────────────┘                     │
       │                                                                       │
       │                       PROJ-30 Render-Pipeline                         │
       │                                  │                                    │
       │                                  v                                    │
       │                       PROJ-10 Admin-Bestellqueue                      │
       │                                  │                                    │
       │                                  │ Operator markiert "shipped"        │
       │                                  v                                    │
       │     ┌──────────────────────────────────────────┐                     │
       │     │ Trigger: Etsy Shipping Push              │                     │
       │     │ /api/etsy/sync/shipping (per order)      │                     │
       │     └──────────────────────────────────────────┘                     │
       └───────────────────────────────────────────────────────────────────────┘
```

### Komponenten-Struktur

```
Admin-UI: /private/admin/etsy/
├── /groups (Listing-Group-Verwaltung)
│   ├── Group-Liste-Tabelle
│   │   └── Pro Group: Name, Anzahl Presets, Etsy-Status, Letzter Sync, Action
│   ├── Group-Neu-Anlegen-Dialog
│   │   ├── Preset-Multi-Select (mit Live-Counter "X von 46 max")
│   │   ├── Größen-Checkboxes (A4/A3/A2)
│   │   ├── Etsy-Titel-Template (z.B. "Stadtkarte Poster — {{stadt}}")
│   │   ├── Beschreibungs-Editor (Markdown)
│   │   ├── Tags-Eingabe (max 13)
│   │   ├── Versandprofil-Auswahl (synced from Etsy)
│   │   └── Personalisierungs-Schema-Editor (Felder definieren)
│   └── Group-Detail-Seite
│       ├── Variations-Vorschau (was Käufer auf Etsy sieht)
│       ├── Bild-Galerie (10 Etsy-Bilder)
│       └── Sync-Action: Erstellen / Aktualisieren / Deaktivieren
│
├── /orders (Bestellungs-Import-Queue)
│   ├── Sync-Status-Header (Letzter Pull, Anzahl Bestellungen, Health)
│   ├── Filter-Bar (alle / pending_parse / manual_review / pending_mapping / imported / failed)
│   ├── Bestell-Tabelle
│   └── Drilldown pro Bestellung
│       ├── Raw-Receipt-JSON-Viewer
│       ├── Personalisierungs-Original (linke Spalte) + geparst (rechte Spalte mit Edit-Form)
│       ├── Internal-Order-Link (zu PROJ-10)
│       ├── Render-Status-Badge
│       └── Action-Buttons (Re-Parse, Re-Import, Manueller Override)
│
├── /sync-health (Dashboard)
│   ├── Letzte-24h-Stats (Pulls/Pushes, Erfolgsquote)
│   ├── Rate-Limit-Gauge (Tagesverbrauch / 10.000)
│   └── Recent-Errors-Liste
│
└── /oauth (Token-Setup, einmalig)
    └── Authorize-Flow (Operator klickt → Etsy-Consent → Callback-Route schreibt Refresh-Token in Env)
```

### Datenmodell (Plain Language)

**Neue Tabellen:**

**`etsy_listing_groups`** — Bündelt mehrere Presets, die als EINE Etsy-Page erscheinen.
- ID, Name (intern, z.B. "Deutsche Großstädte"), Etsy-Titel-Template, Beschreibung, Tags, Sektion-ID, Versandprofil-ID
- Größen-Liste (welche Formate angeboten werden)
- Personalisierungs-Schema (welche Felder Kunde ausfüllen muss — JSON-Struktur)
- Etsy-Listing-ID (nach erfolgreichem Sync), Etsy-Status (draft/active/inactive)
- Letzter Sync-Zeitpunkt

**`etsy_listing_group_members`** — Welche Presets gehören in welche Group (Many-to-Many).
- Group-ID, Preset-ID, Anzeige-Reihenfolge in Variations-Dropdown
- Etsy-Variation-Value-ID (was Etsy als Variation-Option speichert)

**`etsy_orders`** — Eine Zeile pro Etsy-Receipt (auch wenn Receipt mehrere Items hat).
- Etsy-Receipt-ID, Shop-ID, Kaufdatum
- Status (pending_parse / pending_mapping / pending_render / imported / failed / manual_review)
- Roh-Receipt-Payload (JSONB, für Audit)
- Roh-Transactions-Payload (JSONB, Array aller Line-Items)
- Verschlüsselte Lieferadresse (PII)
- Link zur internen Order

**`etsy_sync_runs`** — Audit-Log jeder Cron-Ausführung.
- Run-Kind (listing_push / order_pull / shipping_push), Start/End, Anzahl-Verarbeitet, Anzahl-Erfolgreich, Anzahl-Fehler, Error-Log-Text

**Erweiterungen bestehender Tabellen:**

**`orders`** (PROJ-10) bekommt drei kleine Zusatzspalten — *kein Schema-Refactor*:
- `source` (etsy / amazon / shop / manual, Default shop)
- `external_order_id` (Text, nullable) — Etsy-Receipt-ID als String. Mehrere `orders` können dieselbe Receipt-ID teilen (Multi-Item-Bestellung).
- `external_line_item_position` (Int, nullable) — Position des Items innerhalb der Etsy-Receipt (1, 2, …). Zusammen mit `external_order_id` Unique-Constraint → Idempotenz beim erneuten Polling.

**`presets`** bekommt:
- `etsy_personalization_schema` (JSONB, optional) — fallback, wenn Group kein eigenes Schema überschreibt

**Kein Migration-Impact für Bestand-Orders:** Die drei neuen Spalten sind alle nullable / haben Defaults. Existierende Shop-Bestellungen bleiben unberührt (source=shop, external_order_id=null).

**Speicherort:** Supabase Postgres mit pgcrypto-Extension für PII. Keine Storage-Buckets nötig (Listing-Bilder werden zu Etsy hochgeladen, nicht bei uns gespeichert — PROJ-30 hat sie bereits).

### Tech-Entscheidungen

**1. Listing-Groups statt 1:1-Preset-zu-Listing**

*Was:* Eine Etsy-Page bündelt mehrere thematisch verwandte Presets (z.B. "Stadtkarten Deutschland" mit 30 Städten). Käufer wählt im Etsy-UI Design (Stadt) × Größe.

*Warum:*
- **Etsy-Listing-Gebühren reduzieren**: 30 Städte als 30 Listings = $6/4 Monate; als 1 Group = $0,20/4 Monate.
- **SEO-Konzentration**: Bewertungen, Favoriten, Aufrufe sammeln sich auf einer Page → bessere Etsy-Suchplatzierung.
- **Customer-Browse-UX**: Käufer findet alle Städte in einem Listing, kann Varianten direkt vergleichen.
- **Entspricht dem User-Wunsch** (Bestätigung in Q1).

*Trade-off:*
- **Etsy-Inventory-Limit**: max 140 Kombinationen pro Listing → bei 3 Größen passen max 46 Presets/Group. Group-Editor muss Counter zeigen.
- **Listing-Hauptbild**: kann nur ein Design zeigen → wir nutzen Mockup-Composite mit mehreren Designs als Vorschau.
- **Etsy-Variations-API ist sperrig** (eigene Inventory-Endpoints statt einfacher Listing-Update). Implementierungs-Aufwand +1–2 Tage.

**2. Multi-Item-Receipts → N separate interne Orders (KEIN Schema-Refactor)**

*Was:* Eine Etsy-Receipt mit mehreren Line-Items erzeugt N separate Einträge in der bestehenden `orders`-Tabelle. Alle teilen dieselbe `external_order_id` (Etsy-Receipt-ID). Idempotenz über `(external_order_id, external_line_item_position)` Unique-Constraint.

*Warum:*
- Etsy ist die Bestell-Abwicklung. Wir sind reine Produktion. Unsere DB muss nur "was drucken + wohin schicken + Tracking zurück" abbilden — keine Bundle-Logik, keine Rechnungs-Hierarchie.
- Operator-Workflow ist unverändert: jede Karte in der Print-Queue ist ein Poster. Etsy-Receipt mit 2 Items = 2 Karten mit derselben Adresse und derselben `external_order_id`.
- Keine Berührung von PROJ-10-Schema oder -UI nötig → drastisch reduzierter Scope, kein Migration-Risiko auf produktiven Bestand-Daten.

*Versand-Workflow:*
- Admin-UI gruppiert Karten mit gleicher `external_order_id` visuell (Badge: "Receipt 9988 — 1 von 2").
- Bulk-Action: "Alle Items dieser Receipt drucken + ein Paket + eine Tracking-Nummer".
- Etsy-Shipping-Push: API erlaubt Tracking pro Line-Item ODER pro Receipt — wir senden eine Tracking-Nummer und referenzieren alle Items.

*Trade-off:*
- PROJ-10-Queue zeigt zwei Karten statt einer mit "2 Items"-Pille. Marginal mehr Scroll-Volumen, kein Funktionsverlust.
- PROJ-48 Tier-Pricing-Bundles (Download + Poster + Rahmen) muss seine eigene Bundle-Modellierung lösen, nicht über `order_items` von PROJ-49.

**3. GitHub Actions als Cron-Plattform**

*Was:* Neue Workflow-File `etsy-order-sync.yml` mit `schedule`-Cron alle 15 Min, ruft Vercel-API-Route mit Secret-Header auf.

*Warum:*
- **Bestehendes Pattern**: Render-Worker läuft identisch (siehe [render-worker-trigger:1-60](src/app/api/admin/render-worker/trigger/route.ts#L1-L60)). Operator kennt das Setup.
- **Keine Vercel-Pro-Cron-Limits**: Vercel-Hobby-Tier hat nur 2 Crons/Tag → wäre Show-Stopper.
- **Längeres Timeout**: 6h auf GitHub Actions vs. 60s/300s auf Vercel Functions. Falls Sync mal 200 Bestellungen aufholt, kein Problem.

*Trade-off:*
- ~1–2 Min Drift zur Cron-Zeit (irrelevant bei 15-Min-Intervall).
- GitHub-PAT-Token-Rotation alle 90 Tage (gleicher Pflege-Aufwand wie heute).

**4. Polling statt Webhooks (MVP)**

*Was:* `/api/etsy/cron/pull-orders` fragt aktiv bei Etsy nach neuen Bestellungen.

*Warum:*
- Etsy-Webhooks sind seit 2024 verfügbar, aber Whitelist-basiert und für unseren Use-Case nicht zwingend.
- Polling ist deterministisch, einfacher zu debuggen, kein eingehender Endpoint mit Signatur-Validierung.
- 15-Min-Latenz ist für gedruckte Poster (Versand-Zyklus 1–3 Tage) bedeutungslos.

*Phase 5* migriert auf Webhooks, sobald >50 Bestellungen/Tag Lag spürbar wird.

**5. Personalisierungs-Parser server-side mit Group-Schema**

*Was:* Pro Listing-Group definiert Operator ein strukturiertes Schema (welche Felder Kunde ausfüllen muss). Etsy bekommt dieses Schema als formatierte Anweisung im Hinweistext. Parser matcht die Käufer-Eingabe gegen das Schema.

*Warum:*
- Etsy hat nur EIN Freitextfeld pro Personalisierung → wir müssen Struktur über Hinweistext herbeiführen.
- Schema pro Group statt pro Preset: Hochzeitsposter-Group hat andere Felder als Städte-Group, aber innerhalb einer Group sind die Felder identisch.
- Bei Format-Drift (Käufer-Tippfehler) → `manual_review` statt Auto-Render mit falschen Daten.

*Fallback-Chain:* exakt-match → fuzzy-match (DE+EN Feldnamen, Tippfehler-Toleranz) → manual_review.

**6. OAuth-Token-Storage in Supabase, nicht Env**

*Was:* Refresh-Token in eigener Tabelle `etsy_oauth_tokens` (verschlüsselt), nicht in Vercel-Env-Variable.

*Warum:*
- Token rotiert alle 90 Tage automatisch beim Refresh → Env-Variable müsste manuell gepflegt werden.
- Pro-Sync-Refresh-Logik liest aus DB, schreibt neuen Token zurück.
- Einmaliger Initial-Authorize-Flow (Operator → Etsy-Consent → Callback) schreibt Initial-Token in DB.

### Externe Dependencies

| Package | Zweck |
|---------|-------|
| (Eigener HTTP-Client) | Etsy hat kein offizielles Node-SDK; wir nutzen native `fetch` mit Helper-Wrapper für Auth-Refresh und Rate-Limit |
| `zod` (bereits installiert) | Schema-Validierung Etsy-Responses + Personalisierungs-Parser |
| `pgcrypto` (Supabase-Extension, aktivieren) | PII-Verschlüsselung für Lieferadresse |
| GitHub Actions (`.github/workflows/etsy-order-sync.yml`) | Cron-Trigger, ruft Vercel-API-Route |

### Neue API-Routen

| Route | Zweck | Auth |
|-------|-------|------|
| `/api/etsy/oauth/start` | Operator-Initial-OAuth-Flow starten | Admin |
| `/api/etsy/oauth/callback` | Etsy-Callback, speichert Refresh-Token | Public + State-Validation |
| `/api/etsy/cron/pull-orders` | Bestellungen abfragen + verarbeiten | Cron-Secret |
| `/api/etsy/cron/sync-shipping` | Pending-Shipping-Pushes abarbeiten | Cron-Secret |
| `/api/admin/etsy/groups` (GET/POST) | Group-Liste + Erstellen | Admin |
| `/api/admin/etsy/groups/[id]` (GET/PUT/DELETE) | Group-Detail | Admin |
| `/api/admin/etsy/groups/[id]/sync` (POST) | Group zu Etsy pushen | Admin |
| `/api/admin/etsy/orders` (GET) | Etsy-Order-Queue | Admin |
| `/api/admin/etsy/orders/[id]/reparse` (POST) | Personalisierung re-parsen | Admin |
| `/api/admin/etsy/sync-health` (GET) | Dashboard-Daten | Admin |
| `/api/admin/etsy/shipping-profiles` (GET) | Etsy-Versandprofile auflisten | Admin |

### Migrations (geplant)

1. `etsy_listing_groups` + `etsy_listing_group_members` Tabellen
2. `etsy_orders` Tabelle
3. `etsy_sync_runs` Tabelle
4. `etsy_oauth_tokens` Tabelle (single-row, verschlüsselt)
5. **`orders` minor erweitern**: `source`, `external_order_id`, `external_line_item_position` Spalten (alle nullable, keine Bestand-Migration nötig) + Unique-Constraint auf `(external_order_id, external_line_item_position)` wo nicht-null
6. `presets.etsy_personalization_schema` Spalte (JSONB)
7. RLS-Policies auf allen neuen Tabellen (Admin-only Read/Write)

### Environment-Variablen (neu)

| Variable | Zweck |
|----------|-------|
| `ETSY_API_KEY` | App-Key (öffentlich, für unsignierte Endpoints) |
| `ETSY_OAUTH_CLIENT_ID` | OAuth-Client-ID |
| `ETSY_OAUTH_CLIENT_SECRET` | OAuth-Client-Secret |
| `ETSY_OAUTH_REDIRECT_URI` | Callback-URL (z.B. `https://petite-moment.com/api/etsy/oauth/callback`) |
| `ETSY_SHOP_ID` | Eigener Shop, hard-coded weil nur 1 Shop |
| `ETSY_CRON_SECRET` | Shared Secret zwischen GitHub Action und API-Route |
| `ETSY_PII_ENCRYPTION_KEY` | Symmetric Key für pgcrypto auf Lieferadressen |

### Was die Architektur NICHT abdeckt

- **Foto-Poster (PROJ-32) auf Etsy** — Etsy hat keinen Personalisierungs-Bild-Upload, daher nicht via API automatisierbar. Foto-Poster bleiben Shop-only.
- **Etsy Ads / Promoted Listings** — out-of-scope, manuelle Verwaltung im Etsy-UI.
- **Käufer-Nachrichten** (Etsy Messages) — kein automatisierter Reply, Operator antwortet manuell in Etsy.
- **Refund-Initiierung** — nur manuell im Etsy-Shop-Manager. Refund-Detection beim Polling setzt nur internen Status.

### Risiken & Mitigation

| Risiko | Mitigation |
|--------|------------|
| Etsy lehnt OAuth-App ab (z.B. wegen unklarer Privacy-Policy) | Vorab Datenschutz-Hinweis auf petite-moment.com aktualisieren; Etsy hat keinen formellen Review wie Amazon SP-API, aber Compliance-Hinweise im API-Terms beachten |
| 140-Inventory-Limit zwingt zu sehr großen Groups | Group-Editor zeigt Counter; bei Annäherung an Limit Splits-Vorschlag |
| Personalisierungs-Parser zu strikt → viele `manual_review` | Live-Beobachtung in Phase 2; iterativ Synonyme + Fuzzy-Match erweitern |
| Multi-Item-Receipts korrupt im UI dargestellt | UI-Gruppierung über `external_order_id` ist nice-to-have; auch ohne Gruppierung kein Datenverlust, nur visuell ungruppiert |
| Etsy-API-Outage → Bestellungs-Lag | Cron-Run protokolliert Fehler in `etsy_sync_runs`; nach 3 Fehl-Runs Operator-E-Mail |

### Phasen-Schätzung (revidiert nach Architektur)

| Phase | Aufwand | Inhalt |
|-------|---------|--------|
| Phase 1 | 3–5 Tage | OAuth-Setup, Token-Storage, Read-Only-Polling, Raw-Receipt-Tabelle |
| Phase 2 | 3–4 Tage | `orders`-Spalten-Erweiterung, Personalisierungs-Parser, Auto-Import als N separate Orders |
| Phase 3 | 7–10 Tage | Listing-Groups-Konzept, Group-Editor-UI, Listing-Push mit Variations |
| Phase 4 | 2–3 Tage | Shipping-Push, Sync-Health-Dashboard, Sentry-Alerts, optionale Receipt-Gruppierungs-Pille in PROJ-10 |
| Phase 5 | (Folge-Ticket) | Webhooks, Listing-Re-Sync-Automation, Multi-Marketplace |
| **Gesamt MVP** | **15–22 Tage** | |

### Offene Punkte für `/backend`

1. **Verschlüsselungs-Strategie** für PII: pgcrypto symmetric mit Key in Env vs. Supabase-Vault.
2. **Group-Sync-Atomarität**: Wenn Listing-Push mittendrin scheitert (z.B. 5. Bild-Upload fails), wie rollback? Soft-Delete + Retry vs. Listing in Draft lassen?
3. **Versandprofile-Sync**: Beim ersten Setup Etsy-Versandprofile fetchen + cachen, oder bei jedem Group-Edit live ziehen?

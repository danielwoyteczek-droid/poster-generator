# PROJ-31: Amazon-Bestellungs-Importer (SP-API mit Amazon Custom)

## Status: Planned
**Created:** 2026-04-28
**Last Updated:** 2026-04-28

## Dependencies
- **Requires PROJ-10** (Admin-Bestellverwaltung) — importierte Amazon-Bestellungen landen als reguläre Bestellungen in der bestehenden Admin-Queue mit `source = 'amazon'`.
- **Requires PROJ-8** (Design-Presets) — Mapping Amazon-SKU/ASIN → internes Preset bestimmt, welches Design für die Bestellung gerendert wird.
- **Requires PROJ-30** (Preset-Render-Pipeline) — Auto-Render des fertigen Posters aus Editor-State, der aus Amazon Custom-Feldern gebaut wird.
- **Requires PROJ-1** (Karten-Editor Core) — Editor-Konfiguration aus Custom-Feldern (Titel/Ort/Koordinaten) wird in den bestehenden Editor-State übersetzt.
- **Requires PROJ-3** (Poster-Export) — finales PNG/PDF wird über die existierende Export-Pipeline generiert.
- **Berührt PROJ-12** (Client-Order-Management) — Amazon-Bestellungen sind nicht Teil des Kunden-Logins (kein Self-Service-Zugriff für Amazon-Käufer), erscheinen aber im Operator-Backend.

## Problem & Ziel

petite-moment verkauft personalisierte Karten-Poster auf Amazon mit aktiviertem **Amazon Custom**-Programm: Käufer geben beim Checkout direkt im Amazon-Frontend ihre Personalisierungsdaten ein (Titel, Ort, Koordinaten). Aktuell läuft die Verarbeitung **vollständig manuell**:

1. Operator loggt sich in Amazon Seller Central ein
2. Sucht neue Bestellungen
3. Liest pro Bestellung die Custom-Felder ab (Titel/Ort/Koordinaten)
4. Wechselt zu petite-moment.com Editor
5. Tippt die Daten manuell ein
6. Wählt das passende Design-Preset basierend auf SKU
7. Generiert Poster, exportiert PDF, druckt, versendet
8. Markiert Bestellung in Amazon als versandt mit Tracking-Nummer

Das ist fehleranfällig (Tippfehler bei Koordinaten), zeitintensiv (~5–10 Min pro Bestellung) und blockiert Skalierung.

**PROJ-31 automatisiert diesen End-to-End-Workflow** über die Amazon **Selling Partner API (SP-API)**:

```
Amazon Custom-Bestellung
    ↓
SP-API Polling (alle 10–15 Min)
    ↓
Order-Daten + BuyerCustomizedInfo (ZIP mit JSON) + Lieferadresse (PII via RDT)
    ↓
SKU → Preset Mapping
    ↓
Editor-State Build (Preset-Defaults + Custom-Felder als Override)
    ↓
Auto-Render via PROJ-30 Pipeline → fertiges Poster-PDF
    ↓
Bestellung erscheint in PROJ-10 Admin-Queue (Status: "Awaiting Print")
    ↓
Operator druckt + verschickt → Versand wird zurück an Amazon gemeldet
```

## User Stories
- Als Operator möchte ich, dass Amazon Custom-Bestellungen automatisch in meinem Admin-Backend (PROJ-10) erscheinen, damit ich nicht zwischen Seller Central und petite-moment.com wechseln muss.
- Als Operator möchte ich pro Amazon-SKU/ASIN ein internes Design-Preset hinterlegen können, damit der Importer weiß, welches Design er für eine Bestellung rendern soll.
- Als Operator möchte ich die Custom-Felder des Käufers (Titel, Ort, Koordinaten, ggf. Datum) automatisch ins Poster übernehmen lassen, ohne sie manuell abzutippen.
- Als Operator möchte ich die Lieferadresse aus der Amazon-Bestellung im Versand-Workflow sehen, damit ich die Sendung adressieren kann.
- Als Operator möchte ich den Versandstatus mit Tracking-Nummer an Amazon zurückmelden können, damit der Käufer in Amazon sein Tracking sieht und Amazon den Auftrag als erfüllt markiert.
- Als Operator möchte ich, dass Bestellungen automatisch alle 10–15 Minuten synchronisiert werden, damit ich nicht manuell Knopf drücken muss.
- Als Operator möchte ich bei Sync-Fehlern (API-Limit, fehlende SKU-Mapping, korrupte Custom-Daten) eine Benachrichtigung und einen klaren Status im Admin-UI sehen, damit ich gezielt nachverfolgen kann.
- Als Operator möchte ich Bestellungen mit unbekannter SKU **nicht** automatisch verwerfen, sondern zur manuellen Bearbeitung in eine Pending-Liste bekommen.
- Als Operator möchte ich neue Importer-Logik gegen die Sandbox-API testen können, bevor sie auf Production-Bestellungen losgelassen wird.

## Acceptance Criteria

### Amazon SP-API Setup (extern, nicht im Code)
- [ ] SPP-Identitätsverifizierung abgeschlossen (Gewerbeanmeldung + Ausweisdokument hochgeladen)
- [ ] Lösungsanbieterprofil ausgefüllt (Firmen-Kontaktdaten, Datenschutz-Antworten)
- [ ] Production-App im Solution Provider Portal angelegt
- [ ] Roles approved:
  - [ ] `Orders` (Standard-Bestelldaten)
  - [ ] `Direct-to-Consumer Shipping` (PII / Lieferadresse)
  - [ ] `Product Listing` (SKU-Daten)
- [ ] LWA-Credentials (Client-ID, Client-Secret) sicher in `.env.local` und Vercel-Env-Variablen hinterlegt
- [ ] Refresh-Token via Self-Authorize-Flow generiert und gespeichert
- [ ] Sandbox-Zugriff getestet mit Test-Bestellungen

### Datenmodell (Supabase)
- [ ] Neue Tabelle `amazon_sku_mappings`:
  - `id` (UUID)
  - `amazon_sku` (Text, unique)
  - `amazon_asin` (Text, optional)
  - `marketplace_id` (Text — z. B. `A1PA6795UKMFR9` für DE)
  - `preset_id` (FK → `presets`)
  - `notes` (Text, optional)
  - `created_at`, `updated_at`
- [ ] Neue Tabelle `amazon_orders`:
  - `id` (UUID)
  - `amazon_order_id` (Text, unique)
  - `marketplace_id` (Text)
  - `purchase_date` (Timestamp)
  - `status` (Enum: `pending_mapping` | `pending_render` | `imported` | `failed` | `manual_review`)
  - `raw_order_payload` (JSONB) — vollständiges SP-API-Order-Objekt zur Nachverfolgung
  - `customization_data` (JSONB) — geparste Custom-Felder
  - `shipping_address` (JSONB, verschlüsselt) — PII, RDT-bezogen
  - `internal_order_id` (FK → `orders`, nullable bis Import erfolgreich)
  - `error_message` (Text, nullable)
  - `imported_at`, `last_synced_at`
- [ ] Erweiterung `orders` (PROJ-10) um:
  - `source` (Enum: `amazon` | `shop` | `manual`, Default `shop`)
  - `external_order_id` (Text, nullable) — z. B. Amazon-Order-ID
- [ ] Tabelle `amazon_sync_runs`:
  - `id`, `started_at`, `completed_at`, `orders_fetched` (Int), `orders_imported` (Int), `orders_failed` (Int), `error_log` (Text, nullable)

### Importer-Logik (Backend)
- [ ] Polling-Job läuft alle 10–15 Min via **Vercel Cron** oder **Supabase Edge Function Scheduler**
- [ ] Pro Sync:
  1. `getOrders` mit `LastUpdatedAfter = (last_sync_time - 5min Puffer)`
  2. Pro Order: `getOrderItems` → bei Vorhandensein von `BuyerCustomizedInfo.CustomizedURL` → ZIP herunterladen → `customizationInfo.json` parsen
  3. Restricted Data Token (RDT) via `Tokens API` anfordern für PII-Zugriff
  4. `getOrderAddress` → Lieferadresse mit RDT abrufen
  5. SKU → Preset-Mapping nachschlagen
     - Mapping vorhanden: weiter zu Schritt 6
     - Kein Mapping: Status `pending_mapping`, in Admin-UI sichtbar
  6. Editor-State aus Preset-Default + Custom-Feld-Overrides bauen
  7. Render-Job in PROJ-30 Pipeline anstoßen
  8. Datensatz in `orders` anlegen mit `source = 'amazon'`, `external_order_id = amazon_order_id`
  9. `amazon_orders.status = imported`, `internal_order_id` setzen
- [ ] **Idempotenz**: Bestellung mit existierender `amazon_order_id` wird NICHT doppelt importiert
- [ ] **Rate-Limits respektieren**: Orders 0.0167 req/s steady, max 20 burst — Token-Bucket-Implementierung im Client
- [ ] **Retry-Logik**: Exponential Backoff bei 5xx und Throttling (429), max 3 Retries
- [ ] **PII-Handling**: Lieferadresse verschlüsselt at rest in Supabase (z. B. via `pgcrypto`), niemals in Logs schreiben

### SKU↔Preset-Mapping-UI
- [ ] Neue Admin-Seite `/private/admin/amazon-skus`:
  - Liste aller bekannten SKUs (eingelesen + manuell hinzugefügt)
  - Suchfeld + Filter nach Mapping-Status
  - Pro Zeile: SKU, ASIN, Marketplace, gemapptes Preset (Dropdown), Status
  - "Neue Zuordnung anlegen"-Button
  - Bulk-Import via CSV (analog PROJ-30)

### Admin-UI für Bestellungs-Imports
- [ ] Neue Admin-Seite `/private/admin/amazon-orders`:
  - Letzter erfolgreicher Sync-Zeitpunkt + Status
  - Tabelle aktueller/letzter Imports mit Status-Badge
  - Drilldown pro Bestellung: Raw-Payload, Custom-Daten, Render-Status, internes Bestell-Link
  - Manueller "Jetzt synchronisieren"-Knopf (Rate-limit-aware)
  - Filter: nur fehlerhafte / nur manual_review / alle
- [ ] Pending-Mapping-Sektion: Bestellungen, die wegen unbekannter SKU nicht importiert wurden — mit "SKU jetzt mappen + Reimport"-Action
- [ ] Fehler-Liste: Imports mit `failed`-Status, Retry-Button pro Bestellung

### Versandrückmeldung an Amazon (Phase 2 — kann später)
- [ ] Wenn interne Bestellung in PROJ-10 als `shipped` markiert wird → SP-API `submitFulfillmentData` Aufruf mit:
  - Versanddatum
  - Tracking-Nummer
  - Carrier-Code
- [ ] Bei Versand-Submit-Fehler: Operator-Benachrichtigung + manueller Retry möglich

### Error Handling & Monitoring
- [ ] Strukturelle Fehler (Custom-Felder fehlen, ASIN unbekannt, Adresse leer) → Status `manual_review`, **nicht** stillschweigend skippen
- [ ] Sentry-Integration: Sync-Fehler werden mit Order-ID + Schritt geloggt
- [ ] Admin-Dashboard zeigt Sync-Health (Erfolgsquote letzter 24h)
- [ ] Bei drei aufeinanderfolgenden fehlgeschlagenen Sync-Runs: E-Mail-Benachrichtigung an Operator

### Sicherheit & Compliance
- [ ] Refresh-Token niemals im Repo committen, nur in Vercel-Env
- [ ] PII-Daten (Käufer-Name, Adresse) verschlüsselt in DB
- [ ] Logs maskieren PII-Felder
- [ ] Datenaufbewahrung: Amazon-Roh-Payloads nach 30 Tagen archivieren/löschen, sobald Bestellung erfüllt ist (DSGVO-Compliance)
- [ ] Antworten zum Compliance-Fragebogen im SPP entsprechen den tatsächlichen technischen Maßnahmen

## Implementation Notes (vorläufig — wird in `/architecture` verfeinert)

### Tech-Stack-Vorschlag
- **SP-API Client**: `amazon-sp-api` npm-Paket (offiziell unterstützt) oder direkter HTTP-Client mit AWS-SigV4
- **Cron**: Vercel Cron (gratis im Pro-Tier) oder Supabase pg_cron (falls bereits eingerichtet)
- **Encryption**: Supabase `pgcrypto`-Extension für PII-Felder
- **Queue/Job**: Reuse PROJ-30 Pattern (`render_status`-Spalte als implizite Queue)

### Sandbox-First-Strategie
SP-API hat eine Sandbox mit deterministischen Test-Bestellungen. Vorgehen:
1. Sandbox-App im SPP anlegen (geht **ohne** Identitätsprüfung)
2. Importer komplett gegen Sandbox bauen + testen
3. Erst wenn Production-Roles approved sind → ENV-Variable umstellen → live

### Marktplatz-Scope
- **MVP**: nur DE (`A1PA6795UKMFR9`)
- **Später** (eigenes Feature-Ticket): AT (`A1C3SOZRARQ6R3`), FR (`A13V1IB3VIYZZH`), Multi-Marketplace-Sync

### Stornierungen / Status-Updates
SP-API liefert Order-Status (`Pending`, `Unshipped`, `Shipped`, `Canceled`). Polling muss Status-Änderungen erkennen:
- Neu storniert → interne Bestellung als `cancelled` markieren, Render-Job stoppen falls nicht fertig
- Detail-Logik in `/architecture` festlegen

## Open Questions (für `/architecture`)
1. **Cron-Plattform**: Vercel Cron vs. Supabase Edge Functions vs. dedizierter Worker (analog PROJ-30 render-worker)?
2. **Auth-Modell für Refresh-Token-Rotation**: wo speichern, wie rotieren bei Bedarf?
3. **Amazon-Bestellungen im Kunden-Frontend**: PROJ-12 (Client-Order-Management) zeigt aktuell Bestellungen, die mit dem petite-moment-Account verknüpft sind. Amazon-Käufer haben keinen petite-moment-Account → Amazon-Bestellungen bleiben Operator-only?
4. **Rückerstattung / Refund-Flow**: Operator-initiierte Refunds via SP-API oder weiterhin manuell in Seller Central?
5. **SKU-Mapping-Discovery**: bei einer neuen Amazon-SKU automatisch eine Pending-Zuordnung anlegen, oder Operator soll alle SKUs vorab pflegen?
6. **Test-Strategie**: Mock-Layer für SP-API in Vitest, Sandbox in E2E?

## Roadmap Phasen
1. **Phase 1 — Setup & Sandbox** (1–2 Wochen, blockiert auf Approval)
   - SPP-Verifizierung, Roles-Approval abwarten
   - Sandbox-App anlegen
   - Importer-Skeleton gegen Sandbox bauen (Polling, Order-Fetch, Custom-ZIP-Parsing)
2. **Phase 2 — Mapping & Datenmodell** (3–5 Tage)
   - Supabase-Tabellen anlegen
   - SKU-Mapping-UI bauen
   - Admin-Seite für Imports anlegen
3. **Phase 3 — End-to-End Live** (3–5 Tage)
   - Production-Credentials einbinden
   - PROJ-30 Render-Pipeline anbinden
   - Erster echter Bestellungs-Import
4. **Phase 4 — Versand-Rückmeldung & Monitoring** (2–3 Tage)
   - submitFulfillmentData
   - Sentry-Alerts, Sync-Health-Dashboard
5. **Phase 5 — Multi-Marketplace** (separates Ticket)

## Aktueller Status (Stand 2026-04-28)
- ✅ SPP-Migration vom alten Developer Central abgeschlossen
- ✅ Email-Authentifizierung (`daniel.woyteczek@umoi.de`) durchgelaufen
- ✅ Sandbox-App-Erstellung freigeschaltet
- ⏳ **Identitätsverifizierung im Solution Provider Portal offen** (Gewerbeanmeldung + Ausweis hochladen)
- ⏳ Lösungsanbieterprofil teilweise ausgefüllt — Compliance-Fragebogen offen
- ⏳ Production-Roles noch nicht beantragt

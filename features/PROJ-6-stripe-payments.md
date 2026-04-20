# PROJ-6: Stripe-Bezahlsystem für Exports

## Status: In Review
**Created:** 2026-04-19
**Last Updated:** 2026-04-19

## Dependencies
- Requires: PROJ-3 (Poster-Export)
- Requires: PROJ-4 (User Authentication)
- Requires: PROJ-5 (Projekt-Verwaltung)

## User Stories

### Kunde
- Als Kunde möchte ich zwischen drei Produkten wählen können: Digitaler Download, Poster, Bilderrahmen
- Als Kunde möchte ich den Preis je Produkt und Größe (A4, A3, A2) klar sehen
- Als Kunde möchte ich ein Produkt zum Warenkorb hinzufügen können (auch als Gast)
- Als Kunde möchte ich mehrere Poster-Projekte in einem Warenkorb sammeln und gemeinsam bestellen können
- Als Kunde möchte ich per Kreditkarte oder anderen Stripe-Zahlungsarten bezahlen
- Als Kunde möchte ich nach der Zahlung sofort meinen digitalen Download erhalten (bei Produkt "Digitaler Download")
- Als Kunde möchte ich eine Bestellbestätigung per E-Mail erhalten
- Als Kunde möchte ich meine Bestellhistorie im Dashboard sehen können
- Als Gast möchte ich ohne Konto kaufen können (Guest Checkout)

### Admin
- Als Admin möchte ich bei einer neuen Bestellung für ein physisches Produkt (Poster, Bilderrahmen) per E-Mail benachrichtigt werden
- Als Admin möchte ich die Bestelldetails (Produkt, Größe, Lieferadresse) in einer Übersicht sehen (→ PROJ-10)

## Acceptance Criteria

### Produktkatalog
- [ ] Drei Produkte mit je drei Größen = 9 Stripe Price-Objekte
- [ ] Preise werden via Stripe API geladen (Price IDs in Umgebungsvariablen)
- [ ] Produkt-UI zeigt immer den aktuellen Live-Preis aus Stripe
- [ ] Platzhalterpreise (konfigurierbar): Digitaler Download A4 €9,90 / A3 €12,90 / A2 €16,90 · Poster A4 €24,90 / A3 €34,90 / A2 €49,90 · Bilderrahmen A4 €39,90 / A3 €54,90 / A2 €79,90

### Warenkorb
- [ ] Produkt + Format + Poster-Snapshot (State des Editors zum Kaufzeitpunkt) werden im Warenkorb gespeichert
- [ ] Warenkorb bleibt über Seitenreload erhalten (localStorage für Gäste, Supabase für eingeloggte Nutzer)
- [ ] Warenkorb-Icon im Header zeigt Anzahl der Items
- [ ] Items können aus dem Warenkorb entfernt werden

### Checkout
- [ ] Stripe Checkout-Session wird server-seitig erstellt
- [ ] Guest Checkout möglich (keine Pflicht zur Registrierung)
- [ ] Bei physischen Produkten: Lieferadresse im Checkout-Formular (Stripe Shipping Address Collection)
- [ ] Stripe Checkout auf Deutsch (`locale: "de"`)
- [ ] Nach erfolgreicher Zahlung: Webhook setzt Order-Status auf "paid"

### Nach der Zahlung
- [ ] Digitaler Download: Sofort-Download-Link wird auf der Erfolgsseite angezeigt und per E-Mail verschickt
- [ ] Physische Produkte: Bestellbestätigung per E-Mail, Admin wird benachrichtigt
- [ ] Download-Link für digitale Exporte ist zeitlich begrenzt (signierte URL, 24h gültig)
- [ ] Bereits bezahlte digitale Downloads können im Dashboard erneut generiert werden

## Edge Cases
- Was passiert, wenn der Nutzer den Stripe-Tab schließt ohne zu zahlen? → Order bleibt "pending", Warenkorb bleibt erhalten, Nutzer kann es erneut versuchen
- Was passiert, wenn der Webhook doppelt feuert? → Idempotente Verarbeitung (Status nur einmal setzen)
- Was passiert, wenn Stripe nicht erreichbar ist? → Fehlermeldung "Zahlung derzeit nicht möglich"
- Was passiert, wenn der Editor-State zwischen Warenkorb-Hinzufügen und Bezahlen geändert wird? → Poster-Snapshot aus dem Warenkorb wird gedruckt, nicht der aktuelle Stand
- Was passiert, wenn ein Gast kauft und sich danach registriert? → Bestellung bleibt über Stripe Customer ID verknüpft

## Technical Requirements
- Stripe SDK (server-seitig)
- Stripe Webhook-Verifizierung (`STRIPE_WEBHOOK_SECRET`)
- 9 Stripe Price IDs in `.env` (`STRIPE_PRICE_DOWNLOAD_A4` etc.)
- Supabase Tabellen: `orders` (id, user_id, stripe_session_id, status, created_at), `order_items` (id, order_id, product_type, format, poster_snapshot, price_cents)
- API-Routen: `POST /api/checkout/create`, `POST /api/stripe/webhook`, `GET /api/orders/[id]/download`
- RLS: Nutzer sieht nur eigene Orders

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten
```
ExportTab (Sidebar)
├── PriceDisplay        (PNG: X€ / PDF: X€ / Bundle: X€)
├── PurchaseButton      (POST /api/projects/[id]/exports/[type]/create)
└── DownloadButton      (nur wenn bereits bezahlt, GET /api/projects/[id]/download)

/private (Dashboard)
└── OrderHistory
    └── OrderRow        (shadcn Table: Produkt, Datum, Status, Download-Button)
```

### Zahlungs-Fluss
```
1. Nutzer klickt "PNG kaufen"
2. POST /api/projects/[id]/exports/png/create
   → Supabase: export_orders INSERT (status: pending)
   → Stripe: checkout.session.create({ price_id, metadata })
   → Return: { url: "https://checkout.stripe.com/..." }
3. Browser: Redirect zu Stripe Checkout
4. Nutzer zahlt
5. Stripe: POST /api/stripe/webhook (checkout.session.completed)
   → Webhook-Signatur prüfen
   → Supabase: export_orders UPDATE (status: paid)
6. Stripe: Redirect zu /private?success=true
7. Dashboard zeigt Download-Button
```

### Datenbank (Supabase)
- Tabelle `export_orders`: id, user_id, project_id, product_type, payment_status, stripe_session_id, created_at
- RLS: `user_id = auth.uid()`

### Neue Packages
- `stripe` — Server-seitiges Stripe SDK
- `@stripe/stripe-js` — Client-seitiger Checkout-Redirect (optional)

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_

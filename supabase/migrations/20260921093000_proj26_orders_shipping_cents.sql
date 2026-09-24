-- =====================================================================
-- PROJ-26: Versandkosten auf der Bestellung festhalten
-- =====================================================================
-- Seit an der Stripe-Session eine `shipping_rate` haengt, zahlt der Kunde
-- mehr, als in `orders.total_cents` steht: Die Spalte fuehrt die reine
-- Produktsumme, und niemand glich sie je mit `session.amount_total` ab.
-- Bestaetigungsmail, Bestellseite und das Kauf-Tracking zeigten damit
-- alle zu wenig.
--
-- `total_cents` behaelt bewusst seine Bedeutung (Produktsumme). Wuerde man
-- dort kuenftig den Gesamtbetrag hineinschreiben, haetten Bestellungen vor
-- und nach dieser Aenderung dieselbe Spalte mit verschiedener Bedeutung --
-- jede spaetere Auswertung ueber den Bestand waere still falsch.
--
-- Stattdessen eine eigene Spalte, genau wie `discount_cents`: Stripe ist
-- die Wahrheit, der Webhook schreibt den Wert aus
-- `session.total_details.amount_shipping`. Der Gesamtbetrag ergibt sich als
--
--     total_cents - discount_cents + shipping_cents
--
-- DEFAULT 0 ist fuer Bestandsbestellungen richtig: Vor PROJ-26 wurde kein
-- Versand berechnet, sie haben also tatsaechlich 0 Versandkosten.
--
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- =====================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shipping_cents INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN orders.shipping_cents IS
  'PROJ-26: Vom Kunden gezahlte Versandkosten in Cent, aus '
  'session.total_details.amount_shipping. 0 bei rein digitalen Bestellungen '
  'und bei allen Bestellungen vor PROJ-26.';

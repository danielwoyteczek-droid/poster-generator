-- =====================================================================
-- PROJ-48 — Tier-Pricing & Voucher-Readiness: Order-Discount-Persistierung
-- =====================================================================
-- Erweitert die orders-Tabelle um zwei nullable Spalten für die
-- Persistierung des angewendeten Stripe-Discounts (Promotion Code).
--
-- Beide Werte werden vom Stripe-Webhook (checkout.session.completed)
-- geschrieben — nicht beim Order-Insert. Bestandsorders behalten NULL
-- bzw. 0 (vor PROJ-48 wurden Discounts nicht separat erfasst, sondern
-- waren bereits im total_cents enthalten).
--
-- Quelle der Wahrheit ist die Stripe-Session (autoritative Berechnung).
-- Wir trusten den Client-seitig vorab-validierten Discount-Betrag nicht.
--
-- Idempotent: mehrfach ausführbar via IF NOT EXISTS / DROP-CREATE-Pattern.
-- =====================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS discount_code text,
  ADD COLUMN IF NOT EXISTS discount_cents integer NOT NULL DEFAULT 0;

-- Sanity: discount_cents kann nicht negativ sein (Rabatt-Betrag, kein Aufschlag).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_discount_cents_non_negative'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_discount_cents_non_negative
      CHECK (discount_cents >= 0);
  END IF;
END $$;

-- Optionaler Längen-Cap auf discount_code (Stripe-Promotion-Codes sind
-- typischerweise <40 Zeichen; wir lassen Spielraum).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_discount_code_length'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_discount_code_length
      CHECK (discount_code IS NULL OR char_length(discount_code) <= 100);
  END IF;
END $$;

COMMENT ON COLUMN orders.discount_code IS
  'PROJ-48: Stripe Promotion Code name (e.g. "FRAMEFREE") as entered by the customer. NULL when no voucher was applied.';
COMMENT ON COLUMN orders.discount_cents IS
  'PROJ-48: Authoritative discount amount in cents, written by the Stripe webhook from session.total_details.amount_discount. 0 when no voucher was applied.';

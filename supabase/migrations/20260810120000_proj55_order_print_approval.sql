-- =====================================================================
-- PROJ-55: Druckfreigabe und Rechteinhaber-Bestaetigung an der Bestellung
-- =====================================================================
-- Bei DTF liefert der Kunde die Druckdaten selbst. Bevor er bezahlt,
-- bestaetigt er zweierlei:
--   1. Druckfreigabe — genau diese Darstellung soll gedruckt werden
--   2. Rechteinhaber — er besitzt die Rechte an den hochgeladenen Motiven
--
-- Beides wird mit Zeitstempel an der Bestellung festgehalten, damit im
-- Streitfall nachweisbar ist, wann freigegeben wurde. Genau deshalb sitzen
-- die Spalten auf `orders` und nicht in einer eigenen Tabelle: Die Freigabe
-- gehoert zur Bestellung, nicht neben sie.
--
-- Der Checkout-ABLAUF bleibt unveraendert. Die Bestaetigung wird in einem
-- Dialog im Warenkorb eingeholt, bevor der Kunde zur Kasse geht; der
-- bestehende Checkout-Aufruf schickt die beiden Zeitstempel lediglich mit.
-- Fuer Bestellungen ohne DTF erscheint der Dialog nicht und die Spalten
-- bleiben NULL.
--
-- Additiv und idempotent — zwei nullable Spalten, kein Rewrite.
-- =====================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS dtf_print_approved_at    timestamptz,
  ADD COLUMN IF NOT EXISTS dtf_rights_confirmed_at  timestamptz;

-- Bestellungen mit DTF-Anteil finden, etwa fuer die Fulfillment-Ansicht.
CREATE INDEX IF NOT EXISTS orders_dtf_approved_idx
  ON orders (dtf_print_approved_at DESC)
  WHERE dtf_print_approved_at IS NOT NULL;

COMMENT ON COLUMN orders.dtf_print_approved_at IS
  'PROJ-55: Zeitpunkt der Druckfreigabe. Der Kunde hat bestaetigt, dass die '
  'gezeigte Vorschau genau so gedruckt werden soll. NULL = Bestellung ohne '
  'DTF-Anteil.';

COMMENT ON COLUMN orders.dtf_rights_confirmed_at IS
  'PROJ-55: Zeitpunkt der Rechteinhaber-Bestaetigung. Verlagert die Haftung '
  'fuer fremdes Bildmaterial auf den Kunden. NULL = Bestellung ohne '
  'DTF-Anteil.';

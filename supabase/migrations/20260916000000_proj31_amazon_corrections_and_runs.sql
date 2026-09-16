-- =====================================================================
-- PROJ-31: Handkorrekturen und Abholprotokoll
-- =====================================================================
-- Zwei Ergaenzungen, beide rein additiv.
--
-- 1. field_corrections
--    Bisher schrieb eine Korrektur in der Queue direkt in parse_result.
--    Die naechste Auswertung -- "Neu auswerten" oder das Speichern der
--    SKU-Zuordnung -- ersetzt parse_result aber vollstaendig, und die
--    Korrektur war weg, ohne dass es jemand merkte. Die Korrekturen stehen
--    deshalb getrennt und werden bei jeder Auswertung ueber die erkannten
--    Werte gelegt. Damit kann eine Korrektur auch ein fehlendes Pflichtfeld
--    nachtragen und die Position aus der Pruefung holen.
--
-- 2. amazon_ingest_runs
--    Ein Eintrag je Aufruf des Abholers. Bisher war auf petite-moment nur
--    sichtbar, wann zuletzt eine NEUE Position einging -- ein Lauf ohne
--    Neues, oder einer, bei dem alles scheiterte, blieb unsichtbar. Eigene
--    Tabelle statt etsy_sync_runs: deren kind-Constraint und Spalten
--    (Rate-Limits) sind auf die Etsy-API zugeschnitten.
--
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- =====================================================================

ALTER TABLE amazon_custom_orders
  ADD COLUMN IF NOT EXISTS field_corrections JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN amazon_custom_orders.field_corrections IS
  'PROJ-31: Von Hand korrigierte Feldwerte, Schema-Key -> Wert. Werden bei '
  'jeder Auswertung ueber die erkannten Werte gelegt und ueberleben sie damit.';

COMMENT ON COLUMN amazon_custom_orders.rendered_at IS
  'PROJ-31: Wann zuletzt eine Druckdatei aus der Queue erzeugt wurde. '
  'Die Datei selbst wird nicht gespeichert.';

CREATE TABLE IF NOT EXISTS amazon_ingest_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  collector_version   TEXT,
  items_received      INTEGER NOT NULL DEFAULT 0,
  items_accepted      INTEGER NOT NULL DEFAULT 0,
  items_duplicate     INTEGER NOT NULL DEFAULT 0,
  items_failed        INTEGER NOT NULL DEFAULT 0,
  -- Fehler mit Positionsbezug: [{ order_item_id, message }]
  errors              JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_amazon_ingest_runs_received
  ON amazon_ingest_runs (received_at DESC);

COMMENT ON TABLE amazon_ingest_runs IS
  'PROJ-31: Ein Eintrag je Aufruf von /api/amazon/ingest durch den Abholer.';

ALTER TABLE amazon_ingest_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "amazon_ingest_runs_admin_select" ON amazon_ingest_runs;
CREATE POLICY "amazon_ingest_runs_admin_select" ON amazon_ingest_runs
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =====================================================================
-- PROJ-55 Phase 4: Druckfertige Dateien pro bestelltem Bogen
-- =====================================================================
-- Nach Zahlungseingang wird pro DTF-Position eine PDF erzeugt:
-- Originalmaß, Transparenz erhalten, ungespiegelt (die Spiegelung
-- uebernimmt die RIP-Software am Drucker).
--
-- Eigene Tabelle statt eines Felds in orders.items: Die Erzeugung kann
-- fehlschlagen und wiederholt werden, braucht also Status und
-- Fehlermeldung. In ein JSONB-Feld geschrieben waere jede Statusaenderung
-- ein Read-Modify-Write auf der ganzen Bestellung — bei parallelen
-- Versuchen eine verlorene Aktualisierung.
--
-- Der Bezug auf die Position laeuft ueber den Index in orders.items. Die
-- Reihenfolge dort ist stabil: Positionen werden beim Anlegen der
-- Bestellung einmal geschrieben und danach nie umsortiert.
-- =====================================================================

CREATE TABLE IF NOT EXISTS dtf_print_files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Index der Position in orders.items.
  item_index   INTEGER NOT NULL,

  -- Pfad im Bucket 'dtf-uploads' unterhalb von orders/.
  storage_path TEXT,

  -- 'pending'   — angelegt, Erzeugung laeuft oder steht aus
  -- 'ready'     — PDF liegt in Storage
  -- 'failed'    — Erzeugung fehlgeschlagen, siehe error_message
  status       TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,

  -- Fuer die Admin-Ansicht: Wie viele Boegen sind zu drucken, welches
  -- Format. Redundant zu orders.items, aber die Bestellansicht soll die
  -- Zeile ohne JSONB-Auswertung darstellen koennen.
  sheet_format TEXT,
  quantity     INTEGER,

  byte_size    BIGINT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT dtf_print_files_status_valid CHECK (status IN ('pending', 'ready', 'failed')),
  CONSTRAINT dtf_print_files_item_index_nonneg CHECK (item_index >= 0),
  -- Pro Bestellung und Position genau eine Datei. Verhindert Duplikate,
  -- wenn der Webhook doppelt zugestellt wird.
  CONSTRAINT dtf_print_files_unique_item UNIQUE (order_id, item_index)
);

CREATE INDEX IF NOT EXISTS idx_dtf_print_files_order
  ON dtf_print_files (order_id);

CREATE INDEX IF NOT EXISTS idx_dtf_print_files_failed
  ON dtf_print_files (created_at DESC)
  WHERE status = 'failed';

CREATE OR REPLACE FUNCTION dtf_print_files_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS dtf_print_files_set_updated_at_trigger ON dtf_print_files;
CREATE TRIGGER dtf_print_files_set_updated_at_trigger
  BEFORE UPDATE ON dtf_print_files
  FOR EACH ROW
  EXECUTE FUNCTION dtf_print_files_set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
-- Druckdateien sind reine Betreiberdaten. Kunden brauchen sie nicht — sie
-- haben ihre Vorschau im Warenkorb gesehen und die Freigabe erteilt.
-- Lesen daher nur fuer Admins; Schreiben ausschliesslich ueber
-- Service-Role.

ALTER TABLE dtf_print_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dtf_print_files_admin_read" ON dtf_print_files;
CREATE POLICY "dtf_print_files_admin_read" ON dtf_print_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

COMMENT ON TABLE dtf_print_files IS
  'PROJ-55: Druckfertige PDF je bestelltem DTF-Bogen. Eigene Tabelle wegen '
  'Status und Wiederholbarkeit; item_index verweist auf die Position in '
  'orders.items.';

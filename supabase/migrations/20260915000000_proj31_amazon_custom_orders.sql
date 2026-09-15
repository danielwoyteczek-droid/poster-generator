-- =====================================================================
-- PROJ-31: Amazon-Custom-Anpassungsdaten — Eingangstabelle
-- =====================================================================
-- Ein Abholer auf dem JTL-Server (UMOI-SERVER) schickt personalisierte
-- Amazon-Bestellpositionen an /api/amazon/ingest. Eine Zeile je Position.
--
-- Der Abholer schickt dieselbe Position bewusst mehrfach: er prueft bei
-- jedem Lauf zusaetzlich ein Rueckschaufenster von 30 Tagen, weil die
-- JTL-Tabellen keine Aenderungsspalte haben und ein nachtraeglicher Storno
-- sonst nie auffiele. Deshalb der Unique-Index auf
-- (amazon_order_id, order_item_id) — er ist die Dublettenbremse.
--
-- Eigentumsverhaeltnisse der Spalten, das ist der wichtige Teil:
--
--   Amazon-Felder   — gehoeren dem Abholer. Ein erneuter Ingest darf sie
--                     aktualisieren (Storno kommt so herein).
--   Queue-Felder    — gehoeren petite-moment. Ein erneuter Ingest fasst sie
--                     NICHT an, sonst springt ein schon gedruckter Auftrag
--                     beim naechsten Rueckschaufenster zurueck auf 'neu'.
--
-- Die eine Ausnahme: wird eine noch nicht gedruckte Position storniert,
-- setzt der Ingest queue_status auf 'storniert'. Genau dafuer ist das
-- Rueckschaufenster da. Eine bereits gedruckte Position bleibt unangetastet.
--
-- RLS: admin-only (analog PROJ-47 fonts / PROJ-49 etsy). Der Ingest selbst
-- schreibt mit der Service-Role und umgeht RLS by design.
--
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- =====================================================================

CREATE TABLE IF NOT EXISTS amazon_custom_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Amazon-Felder (Eigentum des Abholers) ──────────────────────────
  amazon_order_id       TEXT NOT NULL,
  order_item_id         TEXT NOT NULL,
  position              INTEGER NOT NULL DEFAULT 1,

  sku                   TEXT NOT NULL,
  asin                  TEXT,
  marketplace_id        TEXT,
  purchase_date         TIMESTAMPTZ,
  quantity              INTEGER NOT NULL DEFAULT 1,
  order_state           TEXT NOT NULL DEFAULT 'open',
  jtl_position_id       INTEGER,

  -- Amazon-JSON unveraendert, inklusive Antwort-Huelle wenn aus der
  -- JTL-Spalte. Nur zum Nachsehen — es wird nicht darauf programmiert.
  customization         JSONB NOT NULL,
  -- Derselbe Inhalt ausgepackt und immer gleich geformt. HIERAUF arbeiten.
  -- Nullable, weil der Ingest ihn notfalls aus customization ableitet und
  -- eine kaputte Lieferung lieber gespeichert als verworfen wird.
  customization_item    JSONB,
  customization_source  TEXT,

  -- Supabase-Storage-Pfade im Bucket 'amazon-custom'. NULL ist normal:
  -- Amazons ZIP ist nicht immer erreichbar, die Anpassungsdaten kommen
  -- dann trotzdem — nur ohne Bild.
  preview_path          TEXT,
  svg_path              TEXT,
  xml_path              TEXT,

  archive_url           TEXT,
  page_url              TEXT,
  latest_ship_at        TIMESTAMPTZ,

  -- Auffaelligkeiten beim Ingest, damit nichts stillschweigend verschwindet:
  -- fehlende Assets, abgeleitetes customization_item, unerwartete Formen.
  ingest_warnings       TEXT[] NOT NULL DEFAULT '{}',

  -- ── Queue-Felder (Eigentum von petite-moment) ──────────────────────
  -- Bewusst ohne CHECK-Constraint: der Queue-Lebenszyklus wird in PROJ-31
  -- gerade erst entworfen. Bekannte Werte stehen im COMMENT unten.
  queue_status          TEXT NOT NULL DEFAULT 'neu',
  design_preset         TEXT,
  rendered_at           TIMESTAMPTZ,
  printed_at            TIMESTAMPTZ,

  first_seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT amazon_custom_orders_state_check
    CHECK (order_state IN ('open', 'cancelled', 'shipped')),
  CONSTRAINT amazon_custom_orders_source_check
    CHECK (customization_source IS NULL
           OR customization_source IN ('jtl_column', 'downloaded_zip')),
  CONSTRAINT amazon_custom_orders_quantity_positive
    CHECK (quantity > 0),
  -- Die Dublettenbremse. Der Abholer schickt dieselbe Position regelmaessig
  -- erneut; ohne diesen Index waechst die Tabelle bei jedem Lauf.
  CONSTRAINT amazon_custom_orders_unique_item
    UNIQUE (amazon_order_id, order_item_id)
);

-- Arbeitsliste: offene Auftraege, aelteste zuerst.
CREATE INDEX IF NOT EXISTS idx_amazon_custom_orders_queue
  ON amazon_custom_orders (queue_status, purchase_date);

-- Zuordnung SKU -> Design: zeigt neue, noch nicht gemappte Artikelnummern.
CREATE INDEX IF NOT EXISTS idx_amazon_custom_orders_sku
  ON amazon_custom_orders (sku);

-- Alle Positionen einer Bestellung zusammen finden.
CREATE INDEX IF NOT EXISTS idx_amazon_custom_orders_order
  ON amazon_custom_orders (amazon_order_id);

COMMENT ON TABLE amazon_custom_orders IS
  'PROJ-31: Eingang des JTL-Abholers. Eine Zeile je Amazon-Bestellposition. '
  'Amazon-Spalten gehoeren dem Abholer und werden bei erneutem Ingest '
  'aktualisiert; Queue-Spalten gehoeren petite-moment und bleiben unangetastet.';

COMMENT ON COLUMN amazon_custom_orders.customization IS
  'PROJ-31: Amazon-JSON unveraendert. Aus der JTL-Spalte mit Antwort-Huelle '
  '(status/successful/data/request_id), aus dem ZIP ohne. Nur Archiv.';
COMMENT ON COLUMN amazon_custom_orders.customization_item IS
  'PROJ-31: Ausgepackter innerer Knoten, immer gleich geformt. Die getippten '
  'Werte stehen unter customizationInfo->''version3.0''->surfaces->areas.';
COMMENT ON COLUMN amazon_custom_orders.queue_status IS
  'PROJ-31: Gehoert petite-moment, nicht dem Abholer. Bekannte Werte: '
  '''neu'' (frisch eingegangen), ''preset_fehlt'' (SKU nicht zugeordnet), '
  '''entwurf'' (gerendert, wartet auf Sichtpruefung), ''gedruckt'', '
  '''storniert'' (vom Ingest gesetzt, wenn ein ungedruckter Auftrag '
  'storniert wurde). Bewusst ohne CHECK, der Lebenszyklus waechst noch.';
COMMENT ON COLUMN amazon_custom_orders.ingest_warnings IS
  'PROJ-31: Auffaelligkeiten des letzten Ingest-Laufs fuer diese Zeile. '
  'Leer = alles sauber angekommen.';
COMMENT ON COLUMN amazon_custom_orders.preview_path IS
  'PROJ-31: Amazons gerendertes Vorschaubild im Bucket amazon-custom. '
  'Vergleichsbild fuer die Sichtpruefung des eigenen Renders.';

-- ---------------------------------------------------------------------
-- updated_at-Trigger
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION amazon_custom_orders_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS amazon_custom_orders_set_updated_at ON amazon_custom_orders;
CREATE TRIGGER amazon_custom_orders_set_updated_at
  BEFORE UPDATE ON amazon_custom_orders
  FOR EACH ROW
  EXECUTE FUNCTION amazon_custom_orders_set_updated_at();

-- ---------------------------------------------------------------------
-- RLS: admin-only
-- ---------------------------------------------------------------------
-- Der Ingest schreibt mit der Service-Role und umgeht RLS. Die Policy ist
-- fuer das Admin-UI da — und als zweite Verteidigungslinie, falls jemand
-- mit anon-Key an die Tabelle will. Die Zeilen enthalten Kaeufereingaben
-- (Namen, eine gewuenschte Kartenadresse), also nichts fuer public-read.

ALTER TABLE amazon_custom_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "amazon_custom_orders_admin_all" ON amazon_custom_orders;
CREATE POLICY "amazon_custom_orders_admin_all" ON amazon_custom_orders
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

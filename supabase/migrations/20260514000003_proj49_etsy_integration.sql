-- =====================================================================
-- PROJ-49: Etsy-Integration — Phase 1 + 2 Foundation
-- =====================================================================
-- Schafft DB-Schicht fuer Etsy-OAuth, Order-Polling und Listing-Groups.
-- Listing-Push (Phase 3) und Shipping-Push (Phase 4) nutzen dieselben
-- Tabellen, brauchen aber keine zusaetzliche DDL.
--
-- Architektur:
--   etsy_oauth_tokens         — single-row OAuth-Refresh-Token-Store
--   etsy_listing_groups       — eine Etsy-Page buendelt mehrere Presets
--   etsy_listing_group_members — Many-to-Many Presets <-> Groups
--   etsy_orders               — Roh-Receipts vom Polling (Audit + Status)
--   etsy_sync_runs            — Cron-Run-Log fuer Sync-Health-Dashboard
--   orders (erweitert)        — source + external_order_id + line_item_position
--   presets (erweitert)       — etsy_personalization_schema JSONB
--
-- RLS: Alle neuen Tabellen sind admin-only (analog PROJ-47 fonts-Pattern).
-- Service-Role-Calls (createAdminClient) umgehen RLS by design.
--
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Erweiterung: orders
-- ---------------------------------------------------------------------
-- Drei nullable Spalten — kein Migration-Risiko auf Bestand-Orders.
-- source defaultet auf 'shop' damit bestehende Stripe-Bestellungen
-- automatisch korrekt klassifiziert sind.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'shop',
  ADD COLUMN IF NOT EXISTS external_order_id TEXT,
  ADD COLUMN IF NOT EXISTS external_line_item_position INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'orders_source_check'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT orders_source_check
      CHECK (source IN ('shop', 'etsy', 'amazon', 'manual'));
  END IF;
END$$;

-- Idempotenz beim Polling: Receipt+Item-Position darf nur einmal als
-- Order existieren. Partial-Unique-Index, weil shop-Bestellungen NULL haben.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_external_unique
  ON orders (source, external_order_id, external_line_item_position)
  WHERE external_order_id IS NOT NULL;

-- Visuelle Gruppierung in PROJ-10: alle Items derselben Etsy-Receipt finden.
CREATE INDEX IF NOT EXISTS idx_orders_external_order_id
  ON orders (external_order_id)
  WHERE external_order_id IS NOT NULL;

COMMENT ON COLUMN orders.source IS
  'PROJ-49: Bestell-Quelle. Default ''shop'' fuer Stripe-Checkout. '
  '''etsy'' = via Etsy-API importiert. ''amazon'' reserviert fuer PROJ-31.';
COMMENT ON COLUMN orders.external_order_id IS
  'PROJ-49: ID im Quell-System (Etsy-Receipt-ID als String, Amazon-Order-ID). '
  'Mehrere orders-Rows koennen dieselbe ID teilen (Multi-Item-Receipt).';
COMMENT ON COLUMN orders.external_line_item_position IS
  'PROJ-49: Position innerhalb des Quell-Receipts (1,2,...). Zusammen mit '
  'external_order_id Unique-Constraint fuer Polling-Idempotenz.';

-- ---------------------------------------------------------------------
-- Erweiterung: presets
-- ---------------------------------------------------------------------
-- Optionales Schema, das auf Listing-Group-Ebene ueberschrieben werden kann.
-- Falls Group kein eigenes Schema setzt, faellt der Parser auf preset.schema zurueck.

ALTER TABLE presets
  ADD COLUMN IF NOT EXISTS etsy_personalization_schema JSONB;

COMMENT ON COLUMN presets.etsy_personalization_schema IS
  'PROJ-49: Optionales JSON-Schema fuer Etsy-Personalisierungs-Parser. '
  'Array von {key, label, required, regex?, fallbacks?}. '
  'Listing-Group-Schema hat Vorrang.';

-- ---------------------------------------------------------------------
-- Tabelle: etsy_oauth_tokens
-- ---------------------------------------------------------------------
-- Single-Row-Tabelle: speichert den OAuth-Refresh-Token, den der Operator
-- einmalig via /api/etsy/oauth/start + /callback einrichtet. Access-Token
-- wird zur Laufzeit aus Refresh-Token erneuert und im Memory gecached.
-- shop_id wird beim Initial-Authorize aus Etsy-User-API gezogen.

CREATE TABLE IF NOT EXISTS etsy_oauth_tokens (
  -- Hardcoded Singleton-PK; nur eine Zeile existiert.
  id                  TEXT PRIMARY KEY DEFAULT 'singleton',
  refresh_token       TEXT NOT NULL,
  shop_id             BIGINT,
  shop_name           TEXT,
  scopes              TEXT[] NOT NULL,
  authorized_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  refreshed_at        TIMESTAMPTZ,
  -- Letzte erfolgreiche Token-Renewal — falls > 80 Tage zurueck, warnen
  -- weil Etsy Refresh-Token nach 90 Tagen Inaktivitaet zurueckzieht.
  expires_at          TIMESTAMPTZ,

  CONSTRAINT etsy_oauth_tokens_singleton_check CHECK (id = 'singleton'),
  CONSTRAINT etsy_oauth_tokens_refresh_token_length CHECK (char_length(refresh_token) BETWEEN 1 AND 4096)
);

COMMENT ON TABLE etsy_oauth_tokens IS
  'PROJ-49: Singleton OAuth-Refresh-Token. id=''singleton'' enforced.';

-- ---------------------------------------------------------------------
-- Tabelle: etsy_listing_groups
-- ---------------------------------------------------------------------
-- Eine Group ist genau eine Etsy-Page. Buendelt N Presets (Many-to-Many
-- via etsy_listing_group_members) und bietet sie als Variation-Property
-- "Design" an, kombiniert mit Format-Variation "Groesse" (A4/A3/A2).

CREATE TABLE IF NOT EXISTS etsy_listing_groups (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Interner Name (Admin-Liste), z.B. "Stadtkarten Deutschland"
  name                        TEXT NOT NULL,
  -- Etsy-Titel mit {{...}}-Variablen, z.B. "Stadtkarte Poster — {{stadt}}"
  etsy_title_template         TEXT NOT NULL,
  etsy_description            TEXT NOT NULL,
  -- Bis zu 13 Tags, plain string array
  etsy_tags                   TEXT[] NOT NULL DEFAULT '{}',
  -- Etsy-Shop-Section-ID (manuell in Etsy angelegt, hier referenziert)
  etsy_shop_section_id        BIGINT,
  -- Etsy-Versandprofil-ID (manuell in Etsy angelegt)
  etsy_shipping_profile_id    BIGINT,
  -- Welche Groessen werden angeboten? Array von 'a4'/'a3'/'a2'.
  sizes                       TEXT[] NOT NULL DEFAULT '{a4,a3,a2}',
  -- Personalisierungs-Schema (siehe presets.etsy_personalization_schema)
  personalization_schema      JSONB,
  -- Preis-Tier (cents) pro Groesse. {"a4":1490,"a3":2490,"a2":3990}
  prices_cents                JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Etsy-Listing-State nach Sync
  etsy_listing_id             BIGINT,
  etsy_state                  TEXT NOT NULL DEFAULT 'draft',
  etsy_url                    TEXT,
  last_synced_at              TIMESTAMPTZ,
  last_remote_updated_at      TIMESTAMPTZ,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT etsy_listing_groups_name_length CHECK (char_length(name) BETWEEN 1 AND 200),
  CONSTRAINT etsy_listing_groups_title_length CHECK (char_length(etsy_title_template) BETWEEN 1 AND 500),
  CONSTRAINT etsy_listing_groups_description_length CHECK (char_length(etsy_description) BETWEEN 1 AND 13000),
  CONSTRAINT etsy_listing_groups_tags_count CHECK (cardinality(etsy_tags) <= 13),
  CONSTRAINT etsy_listing_groups_sizes_valid CHECK (sizes <@ ARRAY['a4','a3','a2']::text[]),
  CONSTRAINT etsy_listing_groups_sizes_nonempty CHECK (cardinality(sizes) BETWEEN 1 AND 3),
  CONSTRAINT etsy_listing_groups_state_check CHECK (etsy_state IN ('draft','active','inactive','expired','sold_out'))
);

CREATE INDEX IF NOT EXISTS idx_etsy_listing_groups_etsy_listing_id
  ON etsy_listing_groups (etsy_listing_id);
CREATE INDEX IF NOT EXISTS idx_etsy_listing_groups_state
  ON etsy_listing_groups (etsy_state);

COMMENT ON TABLE etsy_listing_groups IS
  'PROJ-49: Eine Group = eine Etsy-Page mit Variations (Design x Groesse). '
  'Maximal 140 Inventory-Kombis pro Listing (Etsy-Limit) -> bei 3 Groessen '
  'max ~46 Presets per Group.';
COMMENT ON COLUMN etsy_listing_groups.prices_cents IS
  'PROJ-49: Preis-Map {"a4":1490,"a3":2490,"a2":3990}. Wird als '
  'Variation-Price an Etsy gepusht.';

-- ---------------------------------------------------------------------
-- Tabelle: etsy_listing_group_members
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS etsy_listing_group_members (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id                UUID NOT NULL REFERENCES etsy_listing_groups(id) ON DELETE CASCADE,
  preset_id               UUID NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  -- Reihenfolge im Etsy-Variations-Dropdown
  display_order           INTEGER NOT NULL DEFAULT 0,
  -- Etsy-Variation-Value-ID (nach Listing-Push gesetzt)
  etsy_variation_value_id BIGINT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ein Preset darf pro Group nur einmal vorkommen.
CREATE UNIQUE INDEX IF NOT EXISTS idx_etsy_group_members_group_preset
  ON etsy_listing_group_members (group_id, preset_id);

CREATE INDEX IF NOT EXISTS idx_etsy_group_members_preset
  ON etsy_listing_group_members (preset_id);

COMMENT ON TABLE etsy_listing_group_members IS
  'PROJ-49: Many-to-Many Presets <-> Listing-Groups. Ein Preset kann '
  'theoretisch in mehreren Groups vorkommen (z.B. saisonal vs. evergreen).';

-- ---------------------------------------------------------------------
-- Tabelle: etsy_orders
-- ---------------------------------------------------------------------
-- Roh-Eingang vom Polling. Eine Zeile pro Etsy-Receipt (NICHT pro
-- Line-Item). Multi-Item-Receipts erzeugen N interne orders-Rows, alle
-- linken auf dasselbe etsy_orders-id via raw_transactions_payload.
--
-- Status-Maschine:
--   pending_parse   -> Personalisierung parsen
--   pending_mapping -> Listing-Group nicht gefunden
--   pending_render  -> Render-Job angestossen, wartet
--   imported        -> Internal orders-Rows angelegt
--   manual_review   -> Parser-Fehler / fehlende Pflichtfelder
--   failed          -> Unrecoverable Error, Operator-Eingriff noetig

CREATE TABLE IF NOT EXISTS etsy_orders (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etsy_receipt_id             BIGINT NOT NULL UNIQUE,
  etsy_shop_id                BIGINT NOT NULL,
  purchase_date               TIMESTAMPTZ NOT NULL,
  was_paid                    BOOLEAN NOT NULL DEFAULT FALSE,
  was_shipped                 BOOLEAN NOT NULL DEFAULT FALSE,
  was_canceled                BOOLEAN NOT NULL DEFAULT FALSE,

  status                      TEXT NOT NULL DEFAULT 'pending_parse',
  raw_receipt_payload         JSONB NOT NULL,
  raw_transactions_payload    JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Geparste Personalisierungs-Felder pro Line-Item:
  -- [{ "position": 1, "preset_id": "uuid", "parsed": {...}, "raw": "..." }]
  parsed_items                JSONB,
  -- Lieferadresse (Klartext, geschuetzt nur ueber RLS+Supabase-at-rest)
  shipping_address            JSONB,
  -- Verlinkte interne orders-Rows nach erfolgreichem Import
  internal_order_ids          UUID[] NOT NULL DEFAULT '{}',
  error_message               TEXT,
  imported_at                 TIMESTAMPTZ,
  last_synced_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT etsy_orders_status_check CHECK (
    status IN ('pending_parse','pending_mapping','pending_render','imported','manual_review','failed','cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_etsy_orders_status
  ON etsy_orders (status);
CREATE INDEX IF NOT EXISTS idx_etsy_orders_purchase_date
  ON etsy_orders (purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_etsy_orders_last_synced
  ON etsy_orders (last_synced_at DESC);

COMMENT ON TABLE etsy_orders IS
  'PROJ-49: Raw-Eingang vom Etsy-Polling. Eine Zeile pro Receipt. '
  'Multi-Item-Receipts werden in parsed_items aufgeschluesselt und in N '
  'orders-Rows materialisiert (alle teilen external_order_id).';

-- ---------------------------------------------------------------------
-- Tabelle: etsy_sync_runs
-- ---------------------------------------------------------------------
-- Audit-Log jeder Cron-Ausfuehrung. Fuer Sync-Health-Dashboard.

CREATE TABLE IF NOT EXISTS etsy_sync_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind                TEXT NOT NULL,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  items_processed     INTEGER NOT NULL DEFAULT 0,
  items_succeeded     INTEGER NOT NULL DEFAULT 0,
  items_failed        INTEGER NOT NULL DEFAULT 0,
  error_log           TEXT,
  -- Optional: Etsy-Rate-Limit-Headers vom letzten Call, fuer Capacity-Monitoring
  rate_limit_remaining INTEGER,
  rate_limit_reset_at TIMESTAMPTZ,

  CONSTRAINT etsy_sync_runs_kind_check CHECK (
    kind IN ('listing_push','order_pull','shipping_push','oauth_refresh')
  )
);

CREATE INDEX IF NOT EXISTS idx_etsy_sync_runs_kind_started
  ON etsy_sync_runs (kind, started_at DESC);

COMMENT ON TABLE etsy_sync_runs IS
  'PROJ-49: Audit-Log fuer Etsy-Sync-Cronjobs. Befuellt Sync-Health-Dashboard.';

-- ---------------------------------------------------------------------
-- updated_at-Trigger
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION etsy_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS etsy_listing_groups_set_updated_at ON etsy_listing_groups;
CREATE TRIGGER etsy_listing_groups_set_updated_at
  BEFORE UPDATE ON etsy_listing_groups
  FOR EACH ROW
  EXECUTE FUNCTION etsy_set_updated_at();

DROP TRIGGER IF EXISTS etsy_orders_set_updated_at ON etsy_orders;
CREATE TRIGGER etsy_orders_set_updated_at
  BEFORE UPDATE ON etsy_orders
  FOR EACH ROW
  EXECUTE FUNCTION etsy_set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
-- Alle Etsy-Tabellen sind admin-only. Service-Role-Calls
-- (createAdminClient) umgehen RLS by design.

ALTER TABLE etsy_oauth_tokens         ENABLE ROW LEVEL SECURITY;
ALTER TABLE etsy_listing_groups       ENABLE ROW LEVEL SECURITY;
ALTER TABLE etsy_listing_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE etsy_orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE etsy_sync_runs            ENABLE ROW LEVEL SECURITY;

-- Helper: Admin-Check als reusable expression. Wir muessen
-- als anonymous block keine Funktion definieren, sondern wiederholen
-- die EXISTS-Klausel pro Policy (analog PROJ-47 fonts).

-- etsy_oauth_tokens: Admin Read+Write
DROP POLICY IF EXISTS "etsy_oauth_admin_all" ON etsy_oauth_tokens;
CREATE POLICY "etsy_oauth_admin_all" ON etsy_oauth_tokens
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- etsy_listing_groups
DROP POLICY IF EXISTS "etsy_groups_admin_all" ON etsy_listing_groups;
CREATE POLICY "etsy_groups_admin_all" ON etsy_listing_groups
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- etsy_listing_group_members
DROP POLICY IF EXISTS "etsy_group_members_admin_all" ON etsy_listing_group_members;
CREATE POLICY "etsy_group_members_admin_all" ON etsy_listing_group_members
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- etsy_orders
DROP POLICY IF EXISTS "etsy_orders_admin_all" ON etsy_orders
;
CREATE POLICY "etsy_orders_admin_all" ON etsy_orders
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- etsy_sync_runs (read-only fuer Admin, schreibt via Service-Role)
DROP POLICY IF EXISTS "etsy_sync_runs_admin_select" ON etsy_sync_runs;
CREATE POLICY "etsy_sync_runs_admin_select" ON etsy_sync_runs
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

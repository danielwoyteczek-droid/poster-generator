-- =====================================================================
-- PROJ-31: Zuordnung Amazon-SKU -> Design-Preset + Feld-Schema
-- =====================================================================
-- Der Abholer schickt nur die SKU. Welches Design dahintersteht und welches
-- Anpassungsfeld auf welches Poster-Element geht, entscheidet petite-moment.
-- Beides steht hier, eine Zeile je SKU.
--
-- Auf die SKU wird zugeordnet, nicht auf die ASIN: die SKU ist die eigene
-- Artikelnummer und stabil, die ASIN vergibt Amazon und kann bei einem neuen
-- Listing wechseln. Die ASIN steht nur zur Kontrolle daneben.
--
-- personalization_schema ist optional. Ist nichts gepflegt, greift das
-- Standard-Schema aus src/lib/amazon/sku-schema.ts. Die Form ist dieselbe
-- wie beim Etsy-Schema, damit beide Kanaele durch dieselbe Pruefstufe laufen.
--
-- Unbekannte SKUs legt der Ingest selbst als offene Zeile an, statt die
-- Bestellung zu verwerfen -- sonst verschwaende eine neu angelegte
-- Artikelnummer stillschweigend.
--
-- RLS: admin-only (analog PROJ-47 / PROJ-49).
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- =====================================================================

CREATE TABLE IF NOT EXISTS amazon_sku_mappings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  sku                     TEXT NOT NULL UNIQUE,
  asin                    TEXT,
  marketplace_id          TEXT NOT NULL DEFAULT 'A1PA6795UKMFR9',

  -- Variante aus dem Amazon-Artikelnamen, z. B. 'Herz', 'Vollflaechig'.
  -- Reine Lesehilfe beim Zuordnen.
  variant_label           TEXT,

  -- NULL = noch nicht zugeordnet. Bestellungen dieser SKU landen dann auf
  -- queue_status 'preset_fehlt' statt gerendert zu werden.
  preset_id               UUID REFERENCES presets(id) ON DELETE SET NULL,

  -- Optionale Ueberschreibung des Standard-Feld-Schemas.
  personalization_schema  JSONB,

  notes                   TEXT,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT amazon_sku_mappings_sku_length CHECK (char_length(sku) BETWEEN 1 AND 128)
);

-- Offene Zuordnungen zuerst finden.
CREATE INDEX IF NOT EXISTS idx_amazon_sku_mappings_unmapped
  ON amazon_sku_mappings (sku)
  WHERE preset_id IS NULL;

COMMENT ON TABLE amazon_sku_mappings IS
  'PROJ-31: Eine Zeile je Amazon-SKU. Bestimmt, welches Preset gerendert '
  'wird und wie die Anpassungsfelder auf Poster-Elemente abgebildet werden.';
COMMENT ON COLUMN amazon_sku_mappings.preset_id IS
  'PROJ-31: NULL = noch nicht zugeordnet. Bestellungen dieser SKU bekommen '
  'queue_status ''preset_fehlt'' und warten auf die Zuordnung.';
COMMENT ON COLUMN amazon_sku_mappings.personalization_schema IS
  'PROJ-31: Optionale Ueberschreibung. Leer = Standard-Schema aus dem Code. '
  'Gleiche Form wie etsy_listing_groups.personalization_schema.';

-- ---------------------------------------------------------------------
-- updated_at-Trigger
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION amazon_sku_mappings_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS amazon_sku_mappings_set_updated_at ON amazon_sku_mappings;
CREATE TRIGGER amazon_sku_mappings_set_updated_at
  BEFORE UPDATE ON amazon_sku_mappings
  FOR EACH ROW
  EXECUTE FUNCTION amazon_sku_mappings_set_updated_at();

-- ---------------------------------------------------------------------
-- RLS: admin-only
-- ---------------------------------------------------------------------

ALTER TABLE amazon_sku_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "amazon_sku_mappings_admin_all" ON amazon_sku_mappings;
CREATE POLICY "amazon_sku_mappings_admin_all" ON amazon_sku_mappings
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------
-- Vorbefuellung: die bisher bestellten LQ-Artikel
-- ---------------------------------------------------------------------
-- Stand 15.09.2026 aus der Uebergabe. preset_id bleibt leer -- welches
-- Design zu welchem Listing gehoert, ist ein Blick auf beide Bilder und
-- damit eine Entscheidung des Betreibers, nicht der Migration.
--
-- ON CONFLICT DO NOTHING: eine bereits gepflegte Zuordnung wird durch ein
-- erneutes Ausfuehren nicht zurueckgesetzt.

INSERT INTO amazon_sku_mappings (sku, asin, variant_label, notes) VALUES
  ('LQ-30001-01',    'B0DVRM8Y83', 'Herz',                 '57 Bestellungen bis 15.09.2026'),
  ('LQ-30001-02',    'B0DVRLVB2F', 'Vollflaechig',         '238 Bestellungen bis 15.09.2026 -- Volumentreiber'),
  ('LQ-30001-03',    'B0DY5BK6LC', 'Karte + Bild im Herz', '2 Bestellungen; braucht Foto-Integration'),
  ('LQ-30001-06',    'B0DYZT78R6', 'Love Herz',            '3 Bestellungen bis 15.09.2026'),
  ('LQ-30001-07',    'B0DYZVCB6F', 'Herz + Karte',         '1 Bestellung bis 15.09.2026'),
  ('LQ-30001-08',    'B0DYZW2QX8', 'Puzzle',               '5 Bestellungen; gleiche Variante wie -09?'),
  ('LQ-30001-09',    'B0DZ161YB3', 'Puzzle',               '4 Bestellungen; einzige SKU mit belegtem Feld-Schema'),
  ('LQ-1000-08-HRZ', 'B0DYZ1SRKB', '2 Herzen HRZ',         '6 Bestellungen bis 15.09.2026'),
  ('LQ-20001-01',    'B0DVRGQGXH', NULL,                   'gelistet, nie bestellt'),
  ('LQ-20001-02',    'B0DVRGPXS9', NULL,                   'gelistet, nie bestellt')
ON CONFLICT (sku) DO NOTHING;

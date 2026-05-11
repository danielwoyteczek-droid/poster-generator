-- =====================================================================
-- PROJ-42: Programmatic City Landing Pages — cities-Tabelle
-- =====================================================================
-- Stadt-Inventar fuer SEO-Stadtkarten-Hubs. Strukturelle Metadaten
-- (Geocode, Land, Region, Bevoelkerung) leben in der DB; redaktioneller
-- Body-Content lebt in Sanity (cityPage-Doc, FK ueber cities.slug_base).
--
-- Zweck der Trennung: Stadt-Liste skaliert auf 500+ Eintraege (Sanity-
-- Studio-UX wuerde dort leiden), waehrend Marketing-Content im CMS bleibt.
--
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabelle: cities
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug_base       TEXT NOT NULL,
  name            TEXT NOT NULL,
  country_code    TEXT NOT NULL,
  region          TEXT,
  latitude        NUMERIC(9, 6) NOT NULL,
  longitude       NUMERIC(9, 6) NOT NULL,
  population      INTEGER,
  aliases         TEXT[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT cities_slug_base_format CHECK (slug_base ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT cities_country_code_format CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT cities_latitude_range CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT cities_longitude_range CHECK (longitude BETWEEN -180 AND 180),
  CONSTRAINT cities_population_positive CHECK (population IS NULL OR population >= 0)
);

-- slug_base ist eindeutig PRO Land. Hamburg-DE und Hamburg-US duerfen
-- koexistieren; zwei "hamburg"-Eintraege fuer DE waeren invalid.
CREATE UNIQUE INDEX IF NOT EXISTS idx_cities_slug_base_country
  ON cities (country_code, slug_base);

-- Hot-Pfade: Country/Region-Filter fuer "Verwandte Staedte"-Logik,
-- Sortierung nach Bevoelkerung fuer Top-N-Auswahl.
CREATE INDEX IF NOT EXISTS idx_cities_country_code
  ON cities (country_code);

CREATE INDEX IF NOT EXISTS idx_cities_country_region
  ON cities (country_code, region)
  WHERE region IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cities_population
  ON cities (population DESC NULLS LAST);

-- Auto-update updated_at on UPDATE.
CREATE OR REPLACE FUNCTION cities_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cities_set_updated_at_trigger ON cities;
CREATE TRIGGER cities_set_updated_at_trigger
  BEFORE UPDATE ON cities
  FOR EACH ROW
  EXECUTE FUNCTION cities_set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- Public-Read: Stadt-Liste ist oeffentlich (Sanity-Validator + Frontend
-- konsumieren das anonym).
DROP POLICY IF EXISTS "cities_public_read" ON cities;
CREATE POLICY "cities_public_read" ON cities
  FOR SELECT
  USING (TRUE);

-- Admin-Write: nur authentifizierte Nutzer mit profiles.role = 'admin'
-- duerfen INSERT/UPDATE/DELETE. Service-Role-Calls (createAdminClient)
-- umgehen RLS by design.
DROP POLICY IF EXISTS "cities_admin_insert" ON cities;
CREATE POLICY "cities_admin_insert" ON cities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "cities_admin_update" ON cities;
CREATE POLICY "cities_admin_update" ON cities
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "cities_admin_delete" ON cities;
CREATE POLICY "cities_admin_delete" ON cities
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------

COMMENT ON TABLE cities IS
  'PROJ-42 Stadt-Inventar fuer Programmatic City Landing Pages. '
  'Strukturelle Metadaten; Body-Content lebt in Sanity (cityPage).';
COMMENT ON COLUMN cities.slug_base IS
  'URL-safe Slug-Base, eindeutig pro Land (z.B. "hamburg", "frankfurt-am-main"). '
  'Sanity-cityPage referenziert das als String-FK.';
COMMENT ON COLUMN cities.aliases IS
  'Alternative Schreibweisen (z.B. ["Frankfurt am Main", "Frankfurt/Main"]) '
  'fuer Disambiguierung und Suche.';

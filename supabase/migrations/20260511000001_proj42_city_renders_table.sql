-- =====================================================================
-- PROJ-42: Programmatic City Landing Pages — city_renders-Tabelle
-- =====================================================================
-- Pro Stadt x Featured-Style ein Render-Eintrag (Storage-URL + Status).
-- Bewusst getrennt von preset_renders, weil Cities keine Customer-Presets
-- sind, sondern Marketing-Visuals.
--
-- Style-IDs (z.B. "original", "navy", "dark") sind als Code-Konstante in
-- src/lib/featured-styles.ts definiert; die Tabelle haelt nur den String,
-- ohne FK auf eine Style-Tabelle.
--
-- Wiederverwendet: render_status_enum aus PROJ-30 (pending|rendering|
-- done|failed|stale).
--
-- Idempotent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabelle: city_renders
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS city_renders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id               UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  style_id              TEXT NOT NULL,
  image_url             TEXT,
  image_width           INTEGER,
  image_height          INTEGER,
  render_status         render_status_enum NOT NULL DEFAULT 'pending',
  render_error          TEXT,
  render_started_at     TIMESTAMPTZ,
  render_completed_at   TIMESTAMPTZ,
  render_worker_id      TEXT,
  rendered_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT city_renders_style_id_format CHECK (style_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT city_renders_dimensions_positive CHECK (
    (image_width IS NULL OR image_width > 0)
    AND (image_height IS NULL OR image_height > 0)
  )
);

-- Eindeutigkeit: pro (city_id, style_id) genau ein Render-Eintrag.
-- Re-Render = UPDATE des bestehenden Rows mit neuem image_url + Status.
CREATE UNIQUE INDEX IF NOT EXISTS idx_city_renders_city_style
  ON city_renders (city_id, style_id);

-- Worker-Polling-Index: trifft nur pending/rendering.
CREATE INDEX IF NOT EXISTS idx_city_renders_status_active
  ON city_renders (render_status, created_at)
  WHERE render_status IN ('pending', 'rendering');

-- Frontend-Query: pro Stadt alle done-Renders laden, sortiert nach style_id.
CREATE INDEX IF NOT EXISTS idx_city_renders_city_done
  ON city_renders (city_id, style_id)
  WHERE render_status = 'done';

-- Auto-update updated_at.
CREATE OR REPLACE FUNCTION city_renders_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS city_renders_set_updated_at_trigger ON city_renders;
CREATE TRIGGER city_renders_set_updated_at_trigger
  BEFORE UPDATE ON city_renders
  FOR EACH ROW
  EXECUTE FUNCTION city_renders_set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

ALTER TABLE city_renders ENABLE ROW LEVEL SECURITY;

-- Public-Read: das Frontend konsumiert die done-Renders anonym.
DROP POLICY IF EXISTS "city_renders_public_read" ON city_renders;
CREATE POLICY "city_renders_public_read" ON city_renders
  FOR SELECT
  USING (TRUE);

-- Admin-Write: INSERT/UPDATE/DELETE nur fuer Admins. Worker laeuft mit
-- Service-Role-Key und umgeht RLS.
DROP POLICY IF EXISTS "city_renders_admin_insert" ON city_renders;
CREATE POLICY "city_renders_admin_insert" ON city_renders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "city_renders_admin_update" ON city_renders;
CREATE POLICY "city_renders_admin_update" ON city_renders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "city_renders_admin_delete" ON city_renders;
CREATE POLICY "city_renders_admin_delete" ON city_renders
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------

COMMENT ON TABLE city_renders IS
  'PROJ-42 Hero-Visuals pro Stadt x Featured-Style. Eintraege werden vom '
  'Render-Worker (scripts/render-worker.ts) befuellt; Storage-URLs zeigen '
  'auf den city-renders Bucket.';
COMMENT ON COLUMN city_renders.style_id IS
  'Featured-Style-Code aus src/lib/featured-styles.ts (z.B. "original", '
  '"navy", "dark"). Kein FK, weil die Style-Liste im Code lebt.';
COMMENT ON COLUMN city_renders.image_url IS
  'Public Storage-URL inkl. ?v=<timestamp>-Cache-Bust nach Re-Render. '
  'NULL solange render_status nicht "done" ist.';

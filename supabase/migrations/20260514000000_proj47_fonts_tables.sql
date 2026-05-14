-- =====================================================================
-- PROJ-47: Admin-Font-Verwaltung — fonts + font_styles Tabellen
-- =====================================================================
-- Loest die hartkodierte @font-face-Liste in globals.css ab. Der Admin
-- kann Schriften ueber das /private/admin/fonts UI hochladen statt
-- jedes neue Font ueber einen Code-Deploy einzuspielen.
--
-- Architektur:
--   fonts        — Family-Eintrag (Slug-PK, family_name, category, status)
--   font_styles  — 1:n Schnitte pro Family (weight, style, storage_path)
--
-- RLS: Public liest nur 'published' Familien; Schreibzugriff laeuft
-- ausschliesslich ueber Service-Role-API (createAdminClient bypasst RLS).
--
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabelle: fonts
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fonts (
  id              TEXT PRIMARY KEY,
  family_name     TEXT NOT NULL,
  category        TEXT NOT NULL,
  description     TEXT,
  display_order   INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at    TIMESTAMPTZ,

  CONSTRAINT fonts_id_format CHECK (id ~ '^[a-z][a-z0-9-]*$'),
  CONSTRAINT fonts_category_check CHECK (category IN ('serif', 'script', 'sans', 'display')),
  CONSTRAINT fonts_status_check CHECK (status IN ('draft', 'published')),
  CONSTRAINT fonts_family_name_length CHECK (char_length(family_name) BETWEEN 1 AND 100),
  CONSTRAINT fonts_description_length CHECK (description IS NULL OR char_length(description) <= 500)
);

-- family_name muss unique sein, sonst kollidieren CSS-`font-family`-
-- Referenzen in presets/projects mit zwei verschiedenen Slug-IDs.
CREATE UNIQUE INDEX IF NOT EXISTS idx_fonts_family_name_unique
  ON fonts (family_name);

-- Picker-Lookup: public list sortiert nach display_order.
CREATE INDEX IF NOT EXISTS idx_fonts_status_order
  ON fonts (status, display_order);

-- ---------------------------------------------------------------------
-- Tabelle: font_styles
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS font_styles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  font_id           TEXT NOT NULL REFERENCES fonts(id) ON DELETE CASCADE,
  weight            INTEGER NOT NULL,
  style             TEXT NOT NULL,
  storage_path      TEXT NOT NULL,
  file_size_bytes   INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT font_styles_weight_check CHECK (weight BETWEEN 100 AND 900),
  CONSTRAINT font_styles_style_check CHECK (style IN ('normal', 'italic')),
  CONSTRAINT font_styles_file_size_positive CHECK (file_size_bytes IS NULL OR file_size_bytes > 0)
);

-- Pro Family darf jede (weight, style)-Kombi nur einmal existieren.
CREATE UNIQUE INDEX IF NOT EXISTS idx_font_styles_font_weight_style
  ON font_styles (font_id, weight, style);

-- ---------------------------------------------------------------------
-- updated_at-Trigger
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION fonts_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fonts_set_updated_at_trigger ON fonts;
CREATE TRIGGER fonts_set_updated_at_trigger
  BEFORE UPDATE ON fonts
  FOR EACH ROW
  EXECUTE FUNCTION fonts_set_updated_at();

DROP TRIGGER IF EXISTS font_styles_set_updated_at_trigger ON font_styles;
CREATE TRIGGER font_styles_set_updated_at_trigger
  BEFORE UPDATE ON font_styles
  FOR EACH ROW
  EXECUTE FUNCTION fonts_set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

ALTER TABLE fonts ENABLE ROW LEVEL SECURITY;
ALTER TABLE font_styles ENABLE ROW LEVEL SECURITY;

-- Public-Read: nur 'published' Familien
DROP POLICY IF EXISTS "fonts_public_read_published" ON fonts;
CREATE POLICY "fonts_public_read_published" ON fonts
  FOR SELECT
  USING (status = 'published');

-- Public-Read auf font_styles fuer Styles published Familien
DROP POLICY IF EXISTS "font_styles_public_read_published" ON font_styles;
CREATE POLICY "font_styles_public_read_published" ON font_styles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM fonts
      WHERE fonts.id = font_styles.font_id
        AND fonts.status = 'published'
    )
  );

-- Admin-Write: explizite Policies fuer authentifizierte Admins.
-- Service-Role-Calls (createAdminClient) umgehen RLS by design — die
-- Policies hier sind die zweite Verteidigungslinie fuer den Fall, dass
-- jemand mit anon-Key versucht zu schreiben.
DROP POLICY IF EXISTS "fonts_admin_insert" ON fonts;
CREATE POLICY "fonts_admin_insert" ON fonts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "fonts_admin_update" ON fonts;
CREATE POLICY "fonts_admin_update" ON fonts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "fonts_admin_delete" ON fonts;
CREATE POLICY "fonts_admin_delete" ON fonts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "font_styles_admin_insert" ON font_styles;
CREATE POLICY "font_styles_admin_insert" ON font_styles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "font_styles_admin_update" ON font_styles;
CREATE POLICY "font_styles_admin_update" ON font_styles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "font_styles_admin_delete" ON font_styles;
CREATE POLICY "font_styles_admin_delete" ON font_styles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ---------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------

COMMENT ON TABLE fonts IS
  'PROJ-47 Font-Family-Eintrag. Slug-PK wird in Storage-Pfaden und in '
  'presets/projects.config_json indirekt referenziert (ueber family_name).';
COMMENT ON COLUMN fonts.id IS
  'URL-safe Slug, dauerhaft. Wird in Storage-Pfaden verwendet '
  '(fonts/{slug}/{weight}-{style}.ext).';
COMMENT ON COLUMN fonts.family_name IS
  'Anzeigename UND CSS-font-family-Wert, der in presets/projects '
  'gespeichert wird. Unique-Constraint verhindert Doppelnamen.';
COMMENT ON TABLE font_styles IS
  '1:n Schnitte pro Font-Family. UNIQUE(font_id, weight, style) '
  'verhindert doppelte Eintraege fuer dieselbe Variante.';

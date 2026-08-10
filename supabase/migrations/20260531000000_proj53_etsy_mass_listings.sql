-- PROJ-53: Etsy Mass-Listing-Generator
-- Operator-Schicht über der Render-Pipeline (PROJ-30/52): pro Master-Design
-- je Palette ein Preset-Klon + Render-Job, danach Vela-CSV-Export.
--
-- Zwei neue Tabellen:
--   etsy_listing_defs      — eine Listing-Definition (Master-Design + Looks/Mockups)
--   etsy_listing_variants  — generierte (Design × Palette)-Klone, Idempotenz + Status
--
-- Beide admin-only: RLS an, KEINE anon/authenticated-Policies — Zugriff
-- ausschließlich über createAdminClient() (Service-Role, RLS-Bypass).

-- ─── updated_at-Trigger-Funktion (lokal, search_path gehärtet) ──────────────
CREATE OR REPLACE FUNCTION etsy_listing_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- ─── etsy_listing_defs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS etsy_listing_defs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  -- wählt konstante Texte/Preise/Tags aus src/lib/etsy/listing-templates.ts
  template_key    TEXT NOT NULL,
  -- das Master-Design (Preset), aus dem je Palette ein Klon entsteht
  base_preset_id  UUID NOT NULL REFERENCES presets(id) ON DELETE RESTRICT,
  -- Farb-Looks: referenzieren map_palettes.id (text-slug)
  palette_ids     TEXT[] NOT NULL DEFAULT '{}',
  -- gerahmte / lifestyle Mockup-Sets
  mockup_set_ids  UUID[] NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'draft',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT etsy_listing_defs_template_key_check
    CHECK (template_key IN ('stadtkarte', 'herz', 'sternenkarte')),
  CONSTRAINT etsy_listing_defs_status_check
    CHECK (status IN ('draft', 'published'))
);

CREATE INDEX IF NOT EXISTS idx_etsy_listing_defs_status
  ON etsy_listing_defs (status);
CREATE INDEX IF NOT EXISTS idx_etsy_listing_defs_base_preset
  ON etsy_listing_defs (base_preset_id);

DROP TRIGGER IF EXISTS etsy_listing_defs_set_updated_at ON etsy_listing_defs;
CREATE TRIGGER etsy_listing_defs_set_updated_at
  BEFORE UPDATE ON etsy_listing_defs
  FOR EACH ROW EXECUTE FUNCTION etsy_listing_set_updated_at();

ALTER TABLE etsy_listing_defs ENABLE ROW LEVEL SECURITY;
-- admin-only: keine Policies → nur Service-Role (createAdminClient) hat Zugriff.

-- ─── etsy_listing_variants ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS etsy_listing_variants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_def_id   UUID NOT NULL REFERENCES etsy_listing_defs(id) ON DELETE CASCADE,
  palette_id       TEXT NOT NULL,
  -- der für (Design × Palette) erzeugte Preset-Klon
  cloned_preset_id UUID REFERENCES presets(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Idempotenz: Re-Run klont denselben (Def × Palette) nicht erneut
  CONSTRAINT etsy_listing_variants_uniq UNIQUE (listing_def_id, palette_id)
);

CREATE INDEX IF NOT EXISTS idx_etsy_listing_variants_def
  ON etsy_listing_variants (listing_def_id);
CREATE INDEX IF NOT EXISTS idx_etsy_listing_variants_clone
  ON etsy_listing_variants (cloned_preset_id);

ALTER TABLE etsy_listing_variants ENABLE ROW LEVEL SECURITY;
-- admin-only: keine Policies → nur Service-Role hat Zugriff.

-- PROJ-54 Phase A: palette_mode pro Item + main_palette_id pro Def
-- Ermöglicht zwei Item-Typen:
--   'main' → einmal pro Listing gerendert, mit der Haupt-Palette (Hero/Annotations)
--   'all'  → einmal pro Palette gerendert (Variant-spezifische Bilder)

ALTER TABLE listing_image_set_items
  ADD COLUMN IF NOT EXISTS palette_mode TEXT NOT NULL DEFAULT 'all'
    CHECK (palette_mode IN ('main', 'all'));

COMMENT ON COLUMN listing_image_set_items.palette_mode IS
  'PROJ-54 Phase A: ''main'' = nur 1× pro Listing mit der Haupt-Palette der Def; ''all'' = einmal pro Palette';

ALTER TABLE etsy_listing_defs
  ADD COLUMN IF NOT EXISTS main_palette_id TEXT;

COMMENT ON COLUMN etsy_listing_defs.main_palette_id IS
  'PROJ-54 Phase A: Welche Palette aus palette_ids ist die "Haupt"-Palette für Items mit palette_mode=''main''. Muss in palette_ids enthalten sein. NULL → fallback auf palette_ids[0].';

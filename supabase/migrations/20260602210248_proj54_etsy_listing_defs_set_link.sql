-- PROJ-54 Phase 3: Verknüpft etsy_listing_defs (PROJ-53) mit einem
-- Listing-Image-Set. Optional — bestehende Defs ohne Verknüpfung rendern
-- weiterhin nur die raw Mockup-Composites via mockup_set_ids.

ALTER TABLE etsy_listing_defs
  ADD COLUMN IF NOT EXISTS listing_image_set_id UUID
    REFERENCES listing_image_sets(id) ON DELETE SET NULL;

COMMENT ON COLUMN etsy_listing_defs.listing_image_set_id IS
  'PROJ-54: Optionales Listing-Image-Set zur Erzeugung benannter Etsy-Listing-Bilder pro Variante. Wenn NULL: nur die raw mockup-Composites werden produziert (PROJ-53-V1-Verhalten).';

CREATE INDEX IF NOT EXISTS idx_etsy_listing_defs_listing_image_set
  ON etsy_listing_defs(listing_image_set_id);

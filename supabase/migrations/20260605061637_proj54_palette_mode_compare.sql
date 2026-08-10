-- PROJ-54: dritter palette_mode 'compare' für Tiled-Grid-Bilder.
-- Output: 1 Bild pro Item, in dem alle Paletten als Tiles nebeneinander/
-- untereinander angeordnet sind. Auto-Layout (2x2 bei 4, 2x3 bei 5-6, etc.).

ALTER TABLE listing_image_set_items
  DROP CONSTRAINT listing_image_set_items_palette_mode_check;

ALTER TABLE listing_image_set_items
  ADD CONSTRAINT listing_image_set_items_palette_mode_check
    CHECK (palette_mode IN ('main', 'all', 'compare'));

COMMENT ON COLUMN listing_image_set_items.palette_mode IS
  '''main'' = 1× pro Listing mit der Haupt-Palette der Def; ''all'' = einmal pro Palette; ''compare'' = 1× pro Listing, alle Paletten als Tiles in einem Quadrat angeordnet.';

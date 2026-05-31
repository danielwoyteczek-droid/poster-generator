-- PROJ-53: Ort pro Listing-Definition (überschreibt die Preset-Koordinaten).
-- Design (Preset) bleibt, Karte zentriert auf diesen Ort. Text/locationName
-- werden bewusst NICHT angefasst (nur Kartenausschnitt).

ALTER TABLE etsy_listing_defs
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS location_lat  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_lng  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_zoom DOUBLE PRECISION;

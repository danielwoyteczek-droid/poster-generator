-- Revert: Anchor-Feld wieder entfernen. Wurde durch eine elegantere
-- Lösung ersetzt: Mockup-Größe + Position werden direkt im Mockup-PSD
-- gestaltet, kein separates Skalier-/Positionier-Feld nötig.
ALTER TABLE listing_image_set_items DROP COLUMN IF EXISTS mockup_anchor;

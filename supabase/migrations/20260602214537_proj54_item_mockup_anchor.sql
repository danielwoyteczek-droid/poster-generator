-- PROJ-54: Anchor-Position des Mockup-Composites innerhalb des Annotation-
-- Canvas. Greift nur wenn das Annotation-PNG größer ist als der Mockup-Canvas
-- (sonst bleibt der bestehende Same-Size-Pfad in Kraft).
--
-- HINWEIS (siehe follow-up migration proj54_drop_item_mockup_anchor):
-- Diese Spalte wurde am 2026-06-03 wieder gedroppt. Statt Compositor-Anchor
-- gestaltet der Operator die Skalierung + Positionierung direkt im Mockup-PSD.
-- Migration wird für konsistente Historie belassen.

ALTER TABLE listing_image_set_items
  ADD COLUMN IF NOT EXISTS mockup_anchor TEXT NOT NULL DEFAULT 'center'
    CHECK (mockup_anchor IN (
      'center',
      'top', 'bottom', 'left', 'right',
      'top-left', 'top-right', 'bottom-left', 'bottom-right'
    ));

COMMENT ON COLUMN listing_image_set_items.mockup_anchor IS
  'PROJ-54: Wo wird das Mockup-Composite innerhalb eines größeren Annotation-Canvas verankert? Default center. Greift nicht bei gleich-großen Annotation+Mockup.';

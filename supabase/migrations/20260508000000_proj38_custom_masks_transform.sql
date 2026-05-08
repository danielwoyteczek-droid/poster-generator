-- PROJ-38: Visual transform editor for custom masks. Stores per-mask
-- translate + scale offsets that the composer applies at render time, so
-- admins can position/resize uploaded SVGs without re-exporting them.
--
-- transform_x / transform_y are in viewBox units (same coordinate space as
-- shape_viewbox), default 0 = no offset. transform_scale defaults 1 = no
-- scaling. Composer wraps shape_markup in
--   <g transform="translate(${x} ${y}) scale(${s})">${markup}</g>
-- when any of the three differs from default.

ALTER TABLE public.custom_masks
  ADD COLUMN IF NOT EXISTS transform_x numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transform_y numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transform_scale numeric NOT NULL DEFAULT 1;
